/**
 * @file pos.controller.js
 * @description Controlador del punto de venta
 * @author Jetzaly Josmery Tello Campos 
 * @author Diego Rafael Jiménez Trujano (Integración asíncrona con MySQL)
 * @author Alfonso Mendoza Vásquez (Apertura de caja y Folios HU-25)
 */

const salesService = require('../services/sales.service.js');
const SaleModel = require('../models/sale.model.js');

/**
 * HU-25: Inicializa una transacción de venta devolviendo el folio oficial.
 */
const abrirVenta = async (req, res) => {
    try {
        // Simulamos la extración del JWT o recibimos del body
        const cajeroId = req.body.cajero_id || 1; 

        if (!cajeroId) {
            return res.status(400).json({ success: false, message: 'Se requiere el ID del cajero para abrir la venta.' });
        }

        const nuevaVenta = await SaleModel.createSale(cajeroId);

        return res.status(201).json({
            success: true,
            message: 'Venta abierta exitosamente.',
            data: nuevaVenta
        });
    } catch (error) {
        console.error('[Error Log - ERROR EN APERTURA DE VENTA]:', error);
        return res.status(500).json({ success: false, message: 'Error interno al generar el folio de venta.' });
    }
};

/**
 * Recalcula subtotal, descuentos, IVA y total a partir del carrito recibido.
 */
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

module.exports = {
  abrirVenta,
  calcularTotales
};