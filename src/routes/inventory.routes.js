/**
 * @file inventory.routes.js
 * @description Definición de rutas y endpoints para inventario y distribuidores.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller.js');
const { validateProduct } = require('../middlewares/validate.middleware.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

/**
 * Ruta para obtener los distribuidores disponibles (HU-11).
 * @name get/produtos/buscar
 * @route {GET} /api/inventory/proveedores
 */
router.get('/productos/buscar', inventoryController.buscarProductos);

/**
 * Ruta para obtener los distribuidores disponibles (HU-11).
 * @name get/proveedores
 * @route {GET} /api/inventory/proveedores
 */
router.get('/proveedores', inventoryController.listarProveedores);

/**
 * Ruta para registrar un producto y asociar distribuidores (HU-03, HU-06 y HU-11).
 * Restringido a los roles 'administrador' y 'almacenista'[cite: 1, 2].
 * @name post/productos
 * @route {POST} /api/inventory/productos
 */
router.post(
  '/productos',
  permitirRoles('administrador', 'almacenista'),
  validateProduct,
  inventoryController.registrarProducto
);

/**
 * Ruta para consultar la totalidad de productos.
 * @name get/productos
 * @route {GET} /api/inventory/productos
 */
router.get('/productos', inventoryController.getProducto);

module.exports = router;