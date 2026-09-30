/**
 * @file pos.controller.js
 * @description Controlador del punto de venta
 */

const salesService = require('../services/sales.service.js');

const calcularTotales = async (req, res) => {
  try {
    const { items } = req.body;
    const resultado = await salesService.calcularVenta(items);

    if (!resultado.ok) {
      return res.status(400).json({ mensaje: resultado.mensaje });
    }

    return res.status(200).json(resultado.resultado);
  } catch (error) {
    console.error("Error al calcular totales:", error);
    return res.status(500).json({ mensaje: "Error interno al calcular la venta." });
  }
};

/**
 * Recibe el carrito, el método de pago y procesa la transacción final (HU-30).
 */
const procesarCobro = async (req, res) => {
  try {
    const { items, metodoPago, montoRecibido } = req.body;
    
    // Si tu middleware de Auth ya pasa el usuario en req.user.id, úsalo.
    // De lo contrario, usaremos el ID 2 (Cajero 01) como fallback seguro para pruebas.
    const usuarioId = req.user?.id || 2; 

    const resultado = await salesService.registrarVenta(items, usuarioId, metodoPago, montoRecibido);

    if (!resultado.ok) {
      return res.status(400).json({ mensaje: resultado.mensaje });
    }

    return res.status(201).json(resultado.resultado);
  } catch (error) {
    console.error("Error al procesar cobro:", error);
    return res.status(500).json({ mensaje: "Error interno al procesar el pago." });
  }
};

module.exports = {
  calcularTotales,
  procesarCobro
};