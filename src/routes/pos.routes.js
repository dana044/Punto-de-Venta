/**
 * @file pos.routes.js
 * @description Rutas del punto de venta.
 */

const express = require('express');
const router = express.Router();
const posController = require('../controllers/pos.controller.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

/**
 * Ruta para recalcular subtotal, descuentos, IVA y total de una venta en curso.
 * @name post/calcular
 * @route {POST} /api/pos/calcular
 */
router.post(
  '/calcular',
  permitirRoles('cajero', 'administrador'),
  posController.calcularTotales
);

/**
 * Ruta para registrar la venta finalizada (HU-30).
 * Descuenta stock, registra ingresos y genera folio.
 * @name post/cobrar
 * @route {POST} /api/pos/cobrar
 */
router.post(
  '/cobrar',
  permitirRoles('cajero', 'administrador'),
  posController.procesarCobro
);

module.exports = router;