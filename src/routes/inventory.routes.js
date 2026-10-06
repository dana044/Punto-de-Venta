/**
 * @file inventory.routes.js
 * @description Definición de rutas y endpoints para el módulo de catálogo de inventario y distribuidores.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

/**
 * Ruta para buscar un producto por código de barras o nombre para el POS (HU-26 y HU-49).
 * Abierta a cajeros y administradores.
 * @name get/productos/buscar-pos
 * @route {GET} /api/inventory/productos/buscar-pos
 */
router.get('/productos/buscar-pos', inventoryController.buscarProductoPOS);

/**
 * Ruta para buscar y filtrar productos (General).
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
  inventoryController.registrarProducto
);

/**
 * Ruta para consultar la totalidad de productos (general o filtrada).
 * @name get/productos
 * @route {GET} /api/inventory/productos
 */
router.get('/productos', inventoryController.getProducto);

/**
 * Ruta para gestionar la baja de un producto mediante archivado o desactivación.
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
 * Ruta para editar un producto existente: datos generales y distribuidores
 * asociados (el stock y la caducidad se gestionan por lotes y ajustes).
 * Restringida a los roles 'administrador' y 'almacenista'.
 * @name put/productos/:id
 * @route {PUT} /api/inventory/productos/:id
 */
router.put(
  '/productos/:id',
  permitirRoles('administrador', 'almacenista'),
  inventoryController.actualizarProducto
);

/**
 * Ruta para confirmar un lote pendiente de registro, asignando su caducidad definitiva
 * y sumando sus existencias al almacén general.
 * Restringida a los roles 'administrador' y 'almacenista'.
 * @name put/productos/:id/lotes/:idLote/confirmar
 * @route {PUT} /api/inventory/productos/:id/lotes/:idLote/confirmar
 */
router.put(
  '/productos/:id/lotes/:idLote/confirmar',
  permitirRoles('administrador', 'almacenista'),
  inventoryController.confirmarLotePendiente
);

/**
 * Ruta para registrar ajustes manuales (HU-17): mover a mostrador, regresar a almacén,
 * merma, daño y conteo de mostrador. Los datos se validan en el controlador.
 * Restringida a los roles 'administrador' y 'almacenista'.
 * @name post/productos/:id/ajuste
 * @route {POST} /api/inventory/productos/:id/ajuste
 */
router.post(
  '/productos/:id/ajuste',
  permitirRoles('administrador', 'almacenista'),
  inventoryController.registrarAjuste
);

/**
 * Ruta para consultar los lotes de almacén de un producto (orden FEFO).
 * @name get/productos/:id/lotes
 * @route {GET} /api/inventory/productos/:id/lotes
 */
router.get('/productos/:id/lotes', inventoryController.obtenerLotes);

/**
 * Ruta para agregar un lote al almacén (actualiza el stock de almacén).
 * Restringida a los roles 'administrador' y 'almacenista'.
 * @name post/productos/:id/lotes
 * @route {POST} /api/inventory/productos/:id/lotes
 */
router.post(
  '/productos/:id/lotes',
  permitirRoles('administrador', 'almacenista'),
  inventoryController.crearLote
);

/**
 * Ruta para eliminar un lote del almacén (actualiza el stock de almacén).
 * Restringida a los roles 'administrador' y 'almacenista'.
 * @name delete/productos/:id/lotes/:idLote
 * @route {DELETE} /api/inventory/productos/:id/lotes/:idLote
 */
router.delete(
  '/productos/:id/lotes/:idLote',
  permitirRoles('administrador', 'almacenista'),
  inventoryController.borrarLote
);

/**
 * Ruta para generar el reporte de productos con existencia menor a un límite.
 * Recibe en el query string el umbral (?limite=N) y la ubicación a evaluar
 * (?ubicacion=mostrador|almacen).
 * Restringida al rol 'administrador'.
 * @name get/reportes/stock-bajo
 * @route {GET} /api/inventory/reportes/stock-bajo
 */
router.get(
  '/reportes/stock-bajo',
  permitirRoles('administrador', 'almacenista'),
  inventoryController.reporteStockBajo
);

module.exports = router;