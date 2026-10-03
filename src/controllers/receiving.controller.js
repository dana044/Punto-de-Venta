/**
 * @file receiving.controller.js
 * @description Controlador para la emisión de órdenes de reabastecimiento (HU-31)
 * y recepción de mercancía en almacén (HU-32).
 */

const orderModel = require('../models/order.model.js');
const db = require('../config/db.js');

/**
 * Emite una orden de compra en estado pendiente con múltiples productos (HU-31).
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

/**
 * Obtiene únicamente los productos suministrados por un proveedor (HU-11 / HU-31).
 * Consulta la tabla intermedia producto_proveedor.
 * 
 * @async
 * @function getProductosPorProveedor
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getProductosPorProveedor = async (req, res) => {
  try {
    const { proveedorId } = req.params;
    const query = `
      SELECT p.id, p.nombre, p.codigo_barras, p.precio, p.stock_mostrador
      FROM productos p
      INNER JOIN producto_proveedor pp ON p.id = pp.producto_id
      WHERE pp.proveedor_id = ? AND p.activo = 1
      ORDER BY p.nombre ASC;
    `;
    const [productos] = await db.execute(query, [proveedorId]);
    return res.status(200).json({ productos });
  } catch (error) {
    console.error('Error al consultar productos por distribuidor:', error);
    return res.status(500).json({ mensaje: 'Error al obtener productos del proveedor.' });
  }
};

/**
 * Actualiza manualmente el estado general de un pedido (HU-33).
 * Permite gestionar transiciones como 'en tránsito' o 'cancelado'.
 * 
 * @async
 * @function actualizarEstadoPedido
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const actualizarEstadoPedido = async (req, res) => {
  try {
    const { folio } = req.params;
    const { estado } = req.body;

    // Validación Doomsayer: Evitar estados vacíos
    if (!estado || typeof estado !== 'string') {
      return res.status(400).json({ mensaje: 'El nuevo estado es requerido y debe ser texto válido.' });
    }

    const actualizado = await orderModel.updateEstadoPedido(folio, estado);

    if (!actualizado) {
      return res.status(404).json({ mensaje: `No se encontró el pedido con folio ${folio}.` });
    }

    return res.status(200).json({ 
      mensaje: `El estado del pedido ${folio} se actualizó correctamente a '${estado}'.` 
    });
  } catch (error) {
    console.error(`Error al actualizar el estado del pedido ${req.params.folio}:`, error);
    return res.status(500).json({ mensaje: 'Error interno al actualizar el estado del pedido en la base de datos.' });
  }
};

module.exports = {
  crearPedido,
  getPedidosPendientes,
  getDetallePedido,
  confirmarRecepcion,
  getProductosPorProveedor,
  actualizarEstadoPedido
};