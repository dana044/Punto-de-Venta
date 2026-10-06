/**
 * @file sales.service.js
 * @description Calcular y liquidar ventas conectando a MySQL.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

const crypto = require('crypto');
const { findById } = require('../models/product.model.js');
const db = require('../config/db');
const SaleModel = require('../models/sale.model.js');

const IVA_RATE = 0.16;

/**
 * Genera un No. de Autorización de 6 dígitos (100000-999999) para los pagos con tarjeta.
 * Usa crypto.randomInt (aleatorio criptográfico). La unicidad la garantiza el índice UNIQUE
 * de ventas.num_autorizacion.
 * @returns {string} Número de 6 dígitos, ej. "483920".
 */
const generarNumAutorizacion = () => String(crypto.randomInt(100000, 1000000));

const MAX_INTENTOS_UNICOS = 10;

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
 * Registra formalmente la venta.
 * La inserción ignora columnas calculadas (subtotal, total_linea, etc.)
 * y las delega completamente al motor MySQL.
 */
const registrarVenta = async (items, usuarioId, metodoPago, montoRecibido, numAutorizacion) => {
  const calculo = await calcularVenta(items);
  if (!calculo.ok) return calculo;

  const ventaData = calculo.resultado;

  if (metodoPago === 'efectivo' && montoRecibido < ventaData.total) {
    return { ok: false, mensaje: 'El monto recibido es menor al total a cobrar.' };
  }

  let autorizacion = metodoPago === 'tarjeta' ? generarNumAutorizacion() : null;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let ventaResult;
    for (let intento = 1; ; intento++) {
      try {
        //La cabecera no guarda subtotales ni folios de facturación externos
        [ventaResult] = await connection.execute(
          'INSERT INTO ventas (usuario_id, metodo_pago, num_autorizacion) VALUES (?, ?, ?)',
          [usuarioId, metodoPago, autorizacion]
        );
        break;
      } catch (errorInsercion) {
        if (errorInsercion.code !== 'ER_DUP_ENTRY' || intento >= MAX_INTENTOS_UNICOS) throw errorInsercion;
        if (autorizacion) autorizacion = generarNumAutorizacion();
      }
    }
    const ventaId = ventaResult.insertId;

    const folio = SaleModel.formatearFolio(ventaId);
    await connection.execute('UPDATE ventas SET folio = ? WHERE id = ?', [folio, ventaId]);

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

      //MySQL calcula subtotal_linea, descuento_linea y total_linea automáticamente a través de columnas VIRTUAL GENERATED
      await connection.execute(
        `INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, descuento_tipo, descuento_valor) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ventaId, item.productoId, item.cantidad, item.precioUnitario, item.descuentoTipo, item.descuentoValor]
      );
    }

    await connection.commit();

    return {
      ok: true,
      resultado: {
        mensaje: 'Venta procesada con éxito.',
        folio,
        numAutorizacion: autorizacion,
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