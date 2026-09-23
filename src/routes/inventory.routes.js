/**
 * @file inventory.routes.js
 * @description Rutas del modulo de catalogo de inventario y distribuidores.
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller.js');
const { validateProduct } = require('../middlewares/validate.middleware.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

// Consultar distribuidores disponibles para seleccion
router.get('/proveedores', inventoryController.listarProveedores);

// Registrar producto protegido: acceso autorizado para administrador y almacenista
router.post(
  '/productos',
  permitirRoles('administrador', 'almacenista'),
  validateProduct,
  inventoryController.registrarProducto
);

// Consulta general o filtrada de productos
router.get('/productos', inventoryController.getProducto);

module.exports = router;