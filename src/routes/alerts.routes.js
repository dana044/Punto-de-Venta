/**
 * @file alerts.routes.js
 * @description Rutas de las alertas automáticas de stock bajo (umbral fijo).
 * @author Jetzaly Josmery Tello Campos
 */

const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts.controller.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

/**
 * Lista las alertas activas (productos por debajo del umbral mínimo fijo).
 * @route {GET} /api/alerts
 */
router.get(
  '/',
  permitirRoles('administrador', 'almacenista'),
  alertsController.listarAlertas
);

/**
 * Lista las alertas de caducidad activas (lotes vencidos o próximos a
 * vencer dentro del umbral mínimo fijo).
 * @route {GET} /api/alerts/caducidad
 */
router.get(
  '/caducidad',
  permitirRoles('administrador', 'almacenista'),
  alertsController.listarAlertasCaducidad
);

module.exports = router;
