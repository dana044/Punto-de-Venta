/**
 * @file receiving.controller.js
 * @description Controlador para la recepción de mercancía en almacén.
 * @author Jetzaly Josmery Tello Campos
 */

const receivingService = require('../services/receiving.service.js');

const getPedidosPendientes = (req, res) => {
  const pedidos = receivingService.listarPedidosPendientes();
  return res.status(200).json({ total: pedidos.length, pedidos });
};

const getDetallePedido = (req, res) => {
  const { folio } = req.params;
  const pedido = receivingService.obtenerDetallePedido(folio);

  if (!pedido) {
    return res.status(404).json({ mensaje: `No se encontró el pedido con folio ${folio}.` });
  }

  return res.status(200).json({ pedido });
};

const confirmarRecepcion = (req, res) => {
  const { folio } = req.params;
  const { items } = req.body;

  const resultado = receivingService.registrarRecepcion(folio, items);

  if (!resultado.ok) {
    return res.status(400).json({ mensaje: resultado.mensaje });
  }

  return res.status(200).json({
    mensaje: `Recepción del pedido ${folio} registrada correctamente.`,
    pedido: resultado.pedido
  });
};

module.exports = {
  getPedidosPendientes,
  getDetallePedido,
  confirmarRecepcion
};
