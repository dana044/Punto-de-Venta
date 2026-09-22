/**
 * @file receiving.service.js
 * @description Registrar recepción de mercancía.
 * @author Jetzaly Josmery Tello Campos
 */

const { getPedidoByFolio, getPedidosPendientes } = require('../models/order.model.js');
const { products } = require('../models/product.model.js');

const buscarProducto = (productoId) => products.find((p) => p.id === Number(productoId));

const sumarStockAlmacen = (producto, cantidad) => {
  if (typeof producto.stockAlmacen !== 'number') {
    producto.stockAlmacen = 0;
  }
  producto.stockAlmacen += cantidad;
};

const listarPedidosPendientes = () => getPedidosPendientes();

const obtenerDetallePedido = (folio) => {
  const pedido = getPedidoByFolio(folio);
  return pedido || null;
};

const registrarRecepcion = (folio, itemsRecibidos) => {
  const pedido = getPedidoByFolio(folio);

  if (!pedido) {
    return { ok: false, mensaje: `No se encontró el pedido con folio ${folio}.` };
  }

  if (pedido.estado === 'recibido') {
    return { ok: false, mensaje: `El pedido ${folio} ya fue recibido anteriormente.` };
  }

  if (!Array.isArray(itemsRecibidos) || itemsRecibidos.length === 0) {
    return { ok: false, mensaje: 'Debes capturar la cantidad recibida de al menos un producto.' };
  }

  let todasLasLineasCompletas = true;

  itemsRecibidos.forEach(({ productoId, cantidadRecibida }) => {
    const linea = pedido.items.find((it) => it.productoId === Number(productoId));
    if (!linea) return;

    const cantidad = Number(cantidadRecibida) || 0;

    linea.cantidadRecibida = cantidad;
    linea.estadoLinea = cantidad >= linea.cantidadSolicitada ? 'completo' : 'incompleto';

    if (linea.estadoLinea === 'incompleto') {
      todasLasLineasCompletas = false;
    }

    const producto = buscarProducto(linea.productoId);
    if (producto && cantidad > 0) {
      sumarStockAlmacen(producto, cantidad);
    }
  });

  pedido.estado = todasLasLineasCompletas ? 'recibido' : 'incompleto';
  pedido.fechaRecepcion = new Date().toISOString();

  return { ok: true, pedido };
};

module.exports = {
  listarPedidosPendientes,
  obtenerDetallePedido,
  registrarRecepcion
};
