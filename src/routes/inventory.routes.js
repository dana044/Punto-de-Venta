/**
 * @file inventory.routes.js
 * @description Definición de rutas y endpoints para el módulo de catálogo de inventario y distribuidores.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller.js');
const { validateProduct } = require('../middlewares/validate.middleware.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

/**
 * Ruta para buscar y filtrar productos.
 * @name get/productos/buscar
 * @route {GET} /api/inventory/productos/buscar
 */
router.get('/productos/buscar', inventoryController.buscarProductos);

/**
 * Ruta para obtener los distribuidores disponibles para selección.
 * @name get/proveedores
 * @route {GET} /api/inventory/proveedores
 */
router.get('/proveedores', inventoryController.listarProveedores);

/**
 * Ruta para registrar un producto y asociar distribuidores.
 * Restringido a los roles 'administrador' y 'almacenista'.
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
 * Ruta para consultar la totalidad de productos (general o filtrada).
 * @name get/productos
 * @route {GET} /api/inventory/productos
 */
router.get('/productos', inventoryController.getProducto);

/**
 * Ruta para gestionar la baja de un producto mediante eliminación o desactivación.
 * Operación restringida exclusivamente para personal de inventario ('administrador', 'almacenista').
 * @name patch/productos/:id/baja
 * @route {PATCH} /api/inventory/productos/:id/baja
 */
router.patch(
  '/productos/:id/baja', 
  permitirRoles('administrador', 'almacenista'), 
  inventoryController.bajaProducto
);

/**
 * Ruta para editar un producto existente: datos generales, distribuidores
 * asociados y fecha de caducidad.
 * Restringida a los roles 'administrador' y 'almacenista'.
 * @name put/productos/:id
 * @route {PUT} /api/inventory/productos/:id
 */
router.put(
  '/productos/:id',
  permitirRoles('administrador', 'almacenista'),
  validateProduct,
  inventoryController.actualizarProducto
);

module.exports = router;