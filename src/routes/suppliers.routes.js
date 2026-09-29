/**
 * @file suppliers.routes.js
 * @description Rutas para la gestión de proveedores (HU-18, HU-19).
 * @author Alfonso Mendoza Vásquez (Doomsayer / Programador XP)
 */

const express = require('express');
const router = express.Router();
const suppliersController = require('../controllers/suppliers.controller');

// HU-18: Rutas para listar todos y registrar un nuevo proveedor
router.get('/', suppliersController.getSuppliers);
router.post('/', suppliersController.createSupplier);

// HU-19: Rutas para editar y dar de baja (lógica) a un proveedor
router.put('/:id', suppliersController.updateSupplier);
router.delete('/:id', suppliersController.deactivateSupplier);

module.exports = router;