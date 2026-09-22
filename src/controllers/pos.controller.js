/**
 * @file pos.controller.js
 * @description Controlador del punto de venta
 * @author Jetzaly Josmery Tello Campos 
 */

const salesService = require('../services/sales.service.js');

/**
 * Recalcula subtotal, descuentos, IVA y total a partir del carrito recibido.
 * Se invoca cada vez que el cajero agrega o quita un producto de la venta.
 *
 * @function calcularTotales
 * @param {import('express').Request} req - req.body.items: carrito de la venta.
 * @param {import('express').Response} res
 */
const calcularTotales = (req, res) => {
  const { items } = req.body;
  const resultado = salesService.calcularVenta(items);

  if (!resultado.ok) {
    return res.status(400).json({ mensaje: resultado.mensaje });
  }

  return res.status(200).json(resultado.resultado);
};

module.exports = {
  calcularTotales
};
