/**
 * @file pos.routes.js
 * @description Rutas del punto de venta.
 * @author Jetzaly Josmery Tello Campos 
 * @author Alfonso Mendoza Vásquez (Apertura de caja HU-25)
 * @author Diego Rafael Jiménez Trujano (Cobro HU-30)
 */

const express = require('express');
const router = express.Router();
const posController = require('../controllers/pos.controller.js');
const { validateCarrito } = require('../middlewares/validate.middleware.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

/**
 * HU-25: Ruta para abrir una nueva venta y generar folio único consecutivo.
 * Restringida a cajero y administrador.
 * @name post/abrir
 * @route {POST} /api/pos/abrir
 */
router.post(
  '/abrir',
  permitirRoles('cajero', 'administrador'),
  posController.abrirVenta
);

/**
 * Ruta para recalcular subtotal, descuentos, IVA y total de una venta en curso.
 * Restringida a cajero y administrador (roles que operan el POS).
 * @name post/calcular
 * @route {POST} /api/pos/calcular
 */
router.post(
  '/calcular',
  permitirRoles('cajero', 'administrador'),
  //validateCarrito,
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