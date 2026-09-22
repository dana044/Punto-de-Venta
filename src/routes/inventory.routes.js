/**
 * Punto de Venta UV - Rutas de Inventario.
 * Define los endpoints para la gestión del catálogo de productos.
 */
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller.js');
const { validateProduct } = require('../middlewares/validate.middleware.js');

/**
 * Endpoint para registrar un nuevo producto (HU-06).
 * Valida los datos antes de registrar.
 * Ruta base: /api/inventory/productos
 */
router.post('/productos', validateProduct, inventoryController.registrarProducto);

router.get('/productos', inventoryController.getProducto);

module.exports = router;