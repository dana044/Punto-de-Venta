const express = require('express');
const router = express.Router();
const posController = require('../controllers/pos.controller.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

router.post('/abrir', permitirRoles('cajero', 'administrador'), posController.abrirVenta);
router.get('/siguiente-folio', permitirRoles('cajero', 'administrador'), posController.obtenerSiguienteFolio);
router.post('/calcular', permitirRoles('cajero', 'administrador'), posController.calcularTotales);
router.post('/cobrar', permitirRoles('cajero', 'administrador'), posController.procesarCobro);
router.get('/reporte-mensual', permitirRoles('administrador'), posController.obtenerReporteVentaMensual);
router.get('/reporte-diario', permitirRoles('administrador'), posController.obtenerReporteDiario);
router.get('/reporte-presentacion', permitirRoles('administrador'), posController.obtenerReportePresentacion);

// Rutas añadidas: Compras por distribuidor e Historial de ventas
router.get('/reporte-compras', permitirRoles('administrador'), posController.obtenerReporteCompras);
router.get('/historial', permitirRoles('administrador', 'cajero'), posController.consultarHistorialVentas);
router.post('/ventas/:id/solicitar-cancelacion', permitirRoles('cajero', 'administrador'), posController.pedirCancelacionVenta);
router.post('/ventas/:id/autorizar-cancelacion', permitirRoles('administrador'), posController.aprobarCancelacionVenta);

router.post('/autorizar-eliminacion', permitirRoles('cajero', 'administrador'), posController.autorizarEliminacion);
router.get('/catalogo/categorias', permitirRoles('cajero', 'administrador'), posController.listarCategoriasCatalogo);
router.get('/catalogo/productos', permitirRoles('cajero', 'administrador'), posController.listarProductosCatalogo);

module.exports = router;