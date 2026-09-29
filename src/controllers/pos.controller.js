/**
 * @file pos.controller.js
 * @description Controlador del punto de venta
 * @author Jetzaly Josmery Tello Campos 
 * @author Diego Rafael Jiménez Trujano (Integración asíncrona con MySQL)
 */

const salesService = require('../services/sales.service.js');

/**
 * Recalcula subtotal, descuentos, IVA y total a partir del carrito recibido.
 */
const calcularTotales = async (req, res) => {
  try {
    const { items } = req.body;
    
    // Ahora esperamos a que el servicio consulte la BD
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

module.exports = {
  calcularTotales
};