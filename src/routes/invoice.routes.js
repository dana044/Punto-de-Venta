/**
 * @file invoice.routes.js
 * @description Rutas del módulo de facturación SIMULADA.
 * Son PÚBLICAS a propósito (sin permitirRoles): las usa el cliente, que no tiene cuenta en el sistema.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */
const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller.js');

/**
 * Catálogos de régimen fiscal y uso de CFDI.
 * @name get/catalogos
 * @route {GET} /api/facturacion/catalogos
 */
router.get('/catalogos', invoiceController.obtenerCatalogos);

/**
 * Paso 1: valida la compra (solo lectura, no modifica la venta).
 * @name post/validar
 * @route {POST} /api/facturacion/validar
 */
router.post('/validar', invoiceController.validarFolio);

/**
 * Paso 2: registra la solicitud de facturación y marca la venta.
 * @name post/solicitar
 * @route {POST} /api/facturacion/solicitar
 */
router.post('/solicitar', invoiceController.solicitarFactura);

module.exports = router;