/**
 * @file sales.service.js
 * @description Calcular subtotal, descuentos y total conectando a MySQL.
 * @author Jetzaly Josmery Tello Campos
 * @author Diego Rafael Jiménez Trujano
 */

const db = require('../config/db');

/** Tasa de IVA usada por el punto de venta */
const IVA_RATE = 0.16;

/**
 * Calcula el descuento en pesos de una línea, según su tipo.
 */
const calcularDescuentoLinea = (subtotalLinea, descuentoTipo, descuentoValor) => {
  const valor = Number(descuentoValor) || 0;
  const descuento = descuentoTipo === 'porcentaje'
    ? subtotalLinea * (valor / 100)
    : valor;

  return Math.min(descuento, subtotalLinea);
};

/**
 * Calcula subtotal, descuentos, IVA y total de una venta a partir de su carrito consultando MySQL.
 */
const calcularVenta = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, mensaje: 'El carrito no tiene productos.' };
  }

  let subtotal = 0;
  let descuentos = 0;
  const itemsCalculados = [];

  for (const item of items) {
    // Consultamos el precio directamente de MySQL para evitar fraudes en el frontend
    const [rows] = await db.query('SELECT id, nombre, precio FROM productos WHERE id = ?', [item.productoId]);
    const producto = rows[0];

    if (!producto) {
      return { ok: false, mensaje: `No existe el producto con id ${item.productoId}.` };
    }

    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { ok: false, mensaje: `La cantidad de "${producto.nombre}" debe ser mayor a 0.` };
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

module.exports = {
  IVA_RATE,
  calcularVenta
};