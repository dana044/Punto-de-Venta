/**
 * @file receiving.routes.js
 * @description Rutas para la recepción de mercancía en almacén.
 * @author Jetzaly Josmery Tello Campos
 */

const express = require('express');
const router = express.Router();
const receivingController = require('../controllers/receiving.controller.js');
const { validateRecepcion } = require('../middlewares/validate.middleware.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

router.get('/pedidos', receivingController.getPedidosPendientes);
router.get('/pedidos/:folio', receivingController.getDetallePedido);
router.post(
  '/pedidos/:folio/confirmar',
  permitirRoles('administrador', 'almacenista'),
  validateRecepcion,
  receivingController.confirmarRecepcion
);

module.exports = router;
