/**
 * @file receiving.controller.js
 * @description Controlador para la recepción de mercancía en almacén.
 * @author Jetzaly Josmery Tello Campos
 */
const receivingService = require('../services/receiving.service.js');

const getPedidosPendientes = async (req, res) => {
  try {
    const pedidos = await receivingService.listarPedidosPendientes();
    return res.status(200).json({ total: pedidos.length, pedidos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al obtener pedidos de la base de datos." });
  }
};

const getDetallePedido = async (req, res) => {
  try {
    const { folio } = req.params;
    const pedido = await receivingService.obtenerDetallePedido(folio);

    if (!pedido) {
      return res.status(404).json({ mensaje: `No se encontró el pedido con folio ${folio}.` });
    }

    return res.status(200).json({ pedido });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al consultar el detalle del pedido." });
  }
};

const confirmarRecepcion = async (req, res) => {
  try {
    const { folio } = req.params;
    const { items } = req.body;

    const resultado = await receivingService.registrarRecepcion(folio, items);

    if (!resultado.ok) {
      return res.status(400).json({ mensaje: resultado.mensaje });
    }

    return res.status(200).json({
      mensaje: `Recepción del pedido ${folio} registrada correctamente.`,
      pedido: resultado.pedido
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error al confirmar la recepción." });
  }
};

module.exports = {
  getPedidosPendientes,
  getDetallePedido,
  confirmarRecepcion
};