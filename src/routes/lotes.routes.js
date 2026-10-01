/**
 * @file lotes.routes.js
 * @description Rutas del API para la gestión de lotes.
 */
const express = require('express');
const router = express.Router();
const lotesController = require('../controllers/lotes.controller.js');

router.post('/productos/:id/lotes', lotesController.registrarLote);
router.get('/productos/:id/lotes', lotesController.listarLotesDeProducto);
router.put('/lotes/:id', lotesController.actualizarLote);
router.delete('/lotes/:id', lotesController.eliminarLote);

module.exports = router;