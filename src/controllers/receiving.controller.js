/**
 * @file receiving.controller.js
 * @description Controlador para la emisión de órdenes de reabastecimiento (HU-31)
 * y recepción de mercancía en almacén (HU-32).
 */

const orderModel = require('../models/order.model.js');

/**
 * Emite una orden de compra en estado pendiente (HU-31).
 */
const crearPedido = async (req, res) => {
  try {
    const { proveedorId, items, destino } = req.body;

    if (!proveedorId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        mensaje: 'Debes seleccionar un proveedor y agregar al menos un producto a la orden.'
      });
    }

    const nuevoPedido = await orderModel.crearPedido({
      proveedorId,
      destino: destino || 'almacen',
      items
    });

    return res.status(201).json({
      mensaje: 'Pedido de reabastecimiento generado exitosamente.',
      pedido: nuevoPedido
    });
  } catch (error) {
    console.error('Error al emitir orden de pedido:', error);
    return res.status(500).json({ mensaje: 'Error al registrar el pedido en la base de datos.' });
  }
};

/**
 * Consulta la lista de órdenes activas (HU-32).
 */
const getPedidosPendientes = async (req, res) => {
  try {
    const pedidos = await orderModel.getPedidosPendientes();
    return res.status(200).json({ total: pedidos.length, pedidos });
  } catch (error) {
    console.error('Error al consultar pedidos pendientes:', error);
    return res.status(500).json({ mensaje: 'Error al obtener pedidos de la base de datos.' });
  }
};

/**
 * Consulta los datos y artículos de un pedido por su folio.
 */
const getDetallePedido = async (req, res) => {
  try {
    const { folio } = req.params;
    const pedido = await orderModel.getPedidoByFolio(folio);

    if (!pedido) {
      return res.status(404).json({ mensaje: `No se encontró el pedido con folio ${folio}.` });
    }

    return res.status(200).json({ pedido });
  } catch (error) {
    console.error('Error al consultar detalle del pedido:', error);
    return res.status(500).json({ mensaje: 'Error al consultar el detalle del pedido.' });
  }
};

/**
 * Confirma la recepción física y actualiza el inventario (HU-32).
 */
const confirmarRecepcion = async (req, res) => {
  try {
    const { folio } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: 'Debes enviar la lista de mercancía recibida.' });
    }

    const resultado = await orderModel.registrarRecepcionMercancia(folio, items);

    return res.status(200).json({
      mensaje: `Recepción del pedido ${folio} registrada correctamente.`,
      resultado
    });
  } catch (error) {
    console.error('Error al confirmar recepción:', error);
    return res.status(400).json({ mensaje: error.message || 'Error al confirmar la recepción.' });
  }
};

module.exports = {
  crearPedido,
  getPedidosPendientes,
  getDetallePedido,
  confirmarRecepcion
};