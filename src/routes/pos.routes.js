/**
 * @file pos.routes.js
 * @description Rutas del punto de venta y reportes analíticos.
 * @author Jetzaly Josmery Tello Campos 
 * @author Alfonso Mendoza Vásquez (Apertura de caja HU-25)
 * @author Diego Rafael Jiménez Trujano (Cobro HU-30)
 * @author Stephanie Elizdeth Hernández Prieto (Reporte Mensual HU-40 y Control de Rol HU-03)
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

const express = require('express');
const router = express.Router();
const posController = require('../controllers/pos.controller.js');
const { validateCarrito } = require('../middlewares/validate.middleware.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

/**
 * HU-25: Ruta para abrir una nueva venta y generar folio único consecutivo.
 * Restringida a cajero y administrador.
 * @name post/abrir
 * @route {POST} /api/pos/abrir
 */
router.post(
  '/abrir',
  permitirRoles('cajero', 'administrador'),
  posController.abrirVenta
);

/**
 * Ruta de solo lectura que devuelve el folio de la próxima venta (no crea la venta).
 * Restringida a cajero y administrador.
 * @name get/siguiente-folio
 * @route {GET} /api/pos/siguiente-folio
 */
router.get(
  '/siguiente-folio',
  permitirRoles('cajero', 'administrador'),
  posController.obtenerSiguienteFolio
);

/**
 * Ruta para recalcular subtotal, descuentos, IVA y total de una venta en curso.
 * Restringida a cajero y administrador (roles que operan el POS).
 * @name post/calcular
 * @route {POST} /api/pos/calcular
 */
router.post(
  '/calcular',
  permitirRoles('cajero', 'administrador'),
  //validateCarrito,
  posController.calcularTotales
);

/**
 * Ruta para registrar la venta finalizada (HU-30).
 * Descuenta stock, registra ingresos y genera folio.
 * @name post/cobrar
 * @route {POST} /api/pos/cobrar
 */
router.post(
  '/cobrar',
  permitirRoles('cajero', 'administrador'),
  posController.procesarCobro
);

/**
 * HU-40: Ruta para obtener el reporte y ranking mensual de ventas.
 * Acceso restringido exclusivamente al Administrador (HU-03).
 * @name get/reporte-mensual
 * @route {GET} /api/pos/reporte-mensual
 */
router.get(
  '/reporte-mensual',
  permitirRoles('administrador'),
  posController.obtenerReporteVentaMensual
);

/**
 * Catálogo del POS: categorías disponibles para la cuadrícula inicial.
 * Restringida a cajero y administrador.
 * @name get/catalogo/categorias
 * @route {GET} /api/pos/catalogo/categorias
 */
router.get(
  '/catalogo/categorias',
  permitirRoles('cajero', 'administrador'),
  posController.listarCategoriasCatalogo
);

/**
 * Catálogo del POS: productos por categoría o por texto de búsqueda en vivo.
 * Restringida a cajero y administrador.
 * @name get/catalogo/productos
 * @route {GET} /api/pos/catalogo/productos
 */
router.get(
  '/catalogo/productos',
  permitirRoles('cajero', 'administrador'),
  posController.listarProductosCatalogo
);

module.exports = router;