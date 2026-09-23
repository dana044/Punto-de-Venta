/**
 * @file sales.service.js
 * @description Calcular subtotal, descuentos y total.
 * Recibe el carrito de una venta y recalcula los importes finales a pagar cada vez que 
 * la lista cambia.
 * @author Jetzaly Josmery Tello Campos
 */

const { findById } = require('../models/product.model.js');

/** Tasa de IVA usada por el punto de venta */
const IVA_RATE = 0.16;

/**
 * Busca un producto por id dentro del catálogo compartido.
 * @param {number} productoId
 * @returns {Object|undefined}
 */
const buscarProducto = async (productoId) => {
  return await findById(productoId);
};

/**
 * Calcula el descuento en pesos de una línea, según su tipo.
 *
 * @param {number} subtotalLinea - precio unitario * cantidad, antes de descuento.
 * @param {'porcentaje'|'monto'} descuentoTipo
 * @param {number} descuentoValor - si es 'porcentaje', un número de 0 a 100; si es 'monto', pesos directos.
 * @returns {number} Descuento en pesos, nunca mayor al propio subtotal de la línea.
 */
const calcularDescuentoLinea = (subtotalLinea, descuentoTipo, descuentoValor) => {
  const valor = Number(descuentoValor) || 0;

  const descuento = descuentoTipo === 'porcentaje'
    ? subtotalLinea * (valor / 100)
    : valor;

  // Un descuento nunca puede dejar la línea en negativo.
  return Math.min(descuento, subtotalLinea);
};

/**
 * Calcula subtotal, descuentos, IVA y total de una venta a partir de su carrito.
 *
 * @function calcularVenta
 * @param {Array<{productoId: number, cantidad: number, descuentoTipo?: 'porcentaje'|'monto', descuentoValor?: number}>} items
 * @returns {{ok: true, resultado: Object} | {ok: false, mensaje: string}}
 */
const calcularVenta = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, mensaje: 'El carrito no tiene productos.' };
  }

  let subtotal = 0;
  let descuentos = 0;
  const itemsCalculados = [];

  for (const item of items) {
    // Agrega 'await' aquí
    const producto = await buscarProducto(item.productoId);

    if (!producto) {
      return { ok: false, mensaje: `No existe el producto con id ${item.productoId}.` };
    }

    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { ok: false, mensaje: `La cantidad de "${producto.nombre}" debe ser mayor a 0.` };
    }

    const subtotalLinea = producto.precio * cantidad;
    const descuentoLinea = calcularDescuentoLinea(
      subtotalLinea,
      item.descuentoTipo,
      item.descuentoValor
    );

    subtotal += subtotalLinea;
    descuentos += descuentoLinea;

    itemsCalculados.push({
      productoId: producto.id,
      productoNombre: producto.nombre,
      precioUnitario: producto.precio,
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
