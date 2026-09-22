/**
 * @file employees.routes.js
 * @description Definición de rutas y endpoints para el alta de empleados (HU10).
 */

const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employees.controller.js');
const { validateEmployee } = require('../middlewares/validate.middleware.js');
const { permitirRoles } = require('../middlewares/auth.middleware.js');

/**
 * Ruta para registrar un nuevo empleado (HU10).
 * Restringida al rol 'administrador'.
 * @name post/
 * @route {POST} /api/employees
 */
router.post(
  '/',
  permitirRoles('administrador'),
  validateEmployee,
  employeesController.registrarEmpleado
);

/**
 * Ruta para consultar la totalidad de empleados registrados.
 * Restringida al rol 'administrador'.
 * @name get/
 * @route {GET} /api/employees
 */
router.get('/', permitirRoles('administrador'), employeesController.listarEmpleados);

module.exports = router;