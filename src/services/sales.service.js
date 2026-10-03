/**
 * @file sales.service.js
 * @description Calcular y liquidar ventas conectando a MySQL.
 */

const crypto = require('crypto');
const { findById } = require('../models/product.model.js');
const db = require('../config/db'); // Se agregó importación DB

const IVA_RATE = 0.16;

/**
 * Genera el folio único de auto-facturación que se imprime al pie del ticket.
 * Formato: XXXX-XXXX-AAAA (8 caracteres hexadecimales aleatorios + año en curso).
 * @returns {string} Folio de facturación, ej. "7A9B-3C1E-2026".
 */
const generarFolioFacturacion = () => {
  const aleatorio = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${aleatorio.slice(0, 4)}-${aleatorio.slice(4)}-${new Date().getFullYear()}`;
};

const buscarProducto = async (productoId) => {
  return await findById(productoId);
};

const calcularDescuentoLinea = (subtotalLinea, descuentoTipo, descuentoValor) => {
  const valor = Number(descuentoValor) || 0;
  const descuento = descuentoTipo === 'porcentaje'
    ? subtotalLinea * (valor / 100)
    : valor;
  return Math.min(descuento, subtotalLinea);
};

const calcularVenta = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, mensaje: 'El carrito no tiene productos.' };
  }

  let subtotal = 0;
  let descuentos = 0;
  const itemsCalculados = [];

  for (const item of items) {
    const producto = await buscarProducto(item.productoId);

    if (!producto) {
      return { ok: false, mensaje: `No existe el producto con id ${item.productoId}.` };
    }

    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { ok: false, mensaje: `La cantidad de "${producto.nombre}" debe ser mayor a 0.` };
    }

    // Validación de stock desde mostrador
    if (producto.stock_mostrador < cantidad) {
       return { ok: false, mensaje: `Stock insuficiente en mostrador para "${producto.nombre}". Disp: ${producto.stock_mostrador}` };
    }

    const subtotalLinea = Number(producto.precio) * cantidad;
    const descuentoLinea = calcularDescuentoLinea(subtotalLinea, item.descuentoTipo, item.descuentoValor);

    subtotal += subtotalLinea;
    descuentos += descuentoLinea;

    itemsCalculados.push({
      productoId: producto.id,
      productoNombre: producto.nombre,
      precioUnitario: Number(producto.precio),
      cantidad,
      descuentoTipo: item.descuentoTipo === 'porcentaje' ? 'porcentaje' : 'monto',
      descuentoValor: Number(item.descuentoValor) || 0,
      subtotalLinea: Number(subtotalLinea.toFixed(2)),
      descuentoLinea: Number(descuentoLinea.toFixed(2)),
      totalLinea: Number((subtotalLinea - descuentoLinea).toFixed(2))
    });
  }

  const baseGravable = subtotal - descuentos;
  const iva = baseGravable * IVA_RATE;
  const total = baseGravable + iva;

  return {
    ok: true,
    resultado: {
      items: itemsCalculados,
      subtotal: Number(subtotal.toFixed(2)),
      descuentos: Number(descuentos.toFixed(2)),
      iva: Number(iva.toFixed(2)),
      ivaTasa: IVA_RATE,
      total: Number(total.toFixed(2))
    }
  };
};

/**
 * Registra formalmente la venta (HU-30).
 * Genera el cargo, el detalle transaccional y descuenta el stock en una sola operación atómica.
 */
const registrarVenta = async (items, usuarioId, metodoPago, montoRecibido, numAutorizacion) => {
  // 1. Recalcular y validar todo el carrito y el stock
  const calculo = await calcularVenta(items);
  if (!calculo.ok) return calculo;
  
  const ventaData = calculo.resultado;
  
  // 2. Validar que el pago cubra el total
  if (metodoPago === 'efectivo' && montoRecibido < ventaData.total) {
    return { ok: false, mensaje: 'El monto recibido es menor al total a cobrar.' };
  }

  // 2.1 Validar el No. de Autorización opcional del voucher (solo aplica a pagos con tarjeta)
  const autorizacion = metodoPago === 'tarjeta' && numAutorizacion ? String(numAutorizacion).trim() : null;
  if (autorizacion && !/^\d{6}$/.test(autorizacion)) {
    return { ok: false, mensaje: 'El No. de Autorización debe contener exactamente 6 dígitos.' };
  }

  // 2.2 Folio de auto-facturación: la venta se procesa como "Público en General" y el cliente factura después
  const folioFacturacion = generarFolioFacturacion();

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 3. Insertar la cabecera de la venta
    const [ventaResult] = await connection.execute(
      'INSERT INTO ventas (usuario_id, subtotal, descuentos, iva, total, metodo_pago, num_autorizacion, folio_facturacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [usuarioId, ventaData.subtotal, ventaData.descuentos, ventaData.iva, ventaData.total, metodoPago, autorizacion, folioFacturacion]
    );
    const ventaId = ventaResult.insertId;

    // 4. Insertar el detalle por partida y descontar inventario de MOSTRADOR
    //    Se vuelve a leer el stock con FOR UPDATE dentro de la misma transacción
    //    para evitar que dos ventas simultáneas dejen el stock en negativo
    
    for (const item of ventaData.items) {
      const [filas] = await connection.execute(
        'SELECT stock_mostrador FROM productos WHERE id = ? FOR UPDATE',
        [item.productoId]
      );

      if (filas.length === 0 || filas[0].stock_mostrador < item.cantidad) {
        const error = new Error(`Stock insuficiente en mostrador para "${item.productoNombre}".`);
        error.esErrorDeStock = true;
        throw error;
      }

      await connection.execute(
        'UPDATE productos SET stock_mostrador = stock_mostrador - ? WHERE id = ?',
        [item.cantidad, item.productoId]
      );

      await connection.execute(
        `INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, descuento_tipo, descuento_valor, subtotal_linea, descuento_linea, total_linea) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ventaId, item.productoId, item.cantidad, item.precioUnitario, item.descuentoTipo, item.descuentoValor, item.subtotalLinea, item.descuentoLinea, item.totalLinea]
      );
    }

    await connection.commit();
    
    // 5. Retornar el folio y el cálculo del vuelto
    return { 
      ok: true, 
      resultado: {
         mensaje: 'Venta procesada con éxito.',
         folio: `VTA-2026-${ventaId.toString().padStart(5, '0')}`,
         folioFacturacion,
         total: ventaData.total,
         cambio: metodoPago === 'efectivo' ? Number((montoRecibido - ventaData.total).toFixed(2)) : 0
      }
    };
  } catch (error) {
    await connection.rollback();

    if (error.esErrorDeStock) {
      return { ok: false, mensaje: error.message };
    }

    console.error("Error transaccional en venta:", error);
    return { ok: false, mensaje: 'Error interno de base de datos al registrar la venta.' };
  } finally {
    connection.release();
  }
};

module.exports = {
  IVA_RATE,
  calcularVenta,
  registrarVenta
};