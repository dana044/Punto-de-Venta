/**
 * @file receiving.routes.js
 * @description Rutas para la generación y recepción de pedidos a proveedores (HU-31 y HU-32).
 */

const express = require('express');
const router = express.Router();
const receivingController = require('../controllers/receiving.controller.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

// HU-31: Generar orden de reabastecimiento a distribuidores
router.post(
  '/pedidos',
  permitirRoles('administrador', 'almacenista'),
  receivingController.crearPedido
);

// HU-32: Seguimiento de pedidos pendientes
router.get(
  '/pedidos',
  permitirRoles('administrador', 'almacenista'),
  receivingController.getPedidosPendientes
);

// Consulta de una orden por folio
router.get(
  '/pedidos/:folio',
  permitirRoles('administrador', 'almacenista'),
  receivingController.getDetallePedido
);

// HU-32: Recepción física de mercancía y actualización de existencias
router.post(
  '/pedidos/:folio/confirmar',
  permitirRoles('administrador', 'almacenista'),
  receivingController.confirmarRecepcion
);

module.exports = router;