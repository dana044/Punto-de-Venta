/**
 * @file employees.routes.js
 * @description Definición de rutas y endpoints para el alta de empleados (HU10) y administración de cuentas (HU04).
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

/**
 * Ruta para actualizar los datos de un empleado (HU04).
 * Restringida al rol 'administrador'.
 * @name put/:id
 * @route {PUT} /api/employees/:id
 */
router.put('/:id', permitirRoles('administrador'), employeesController.actualizarEmpleado);

/**
 * Ruta para activar o desactivar la cuenta de un empleado (HU04).
 * Restringida al rol 'administrador'.
 * @name patch/:id/activo
 * @route {PATCH} /api/employees/:id/activo
 */
router.patch('/:id/activo', permitirRoles('administrador'), employeesController.cambiarEstadoEmpleado);

/**
 * Ruta para eliminar definitivamente un empleado (HU04).
 * Restringida al rol 'administrador'.
 * @name delete/:id
 * @route {DELETE} /api/employees/:id
 */
router.delete('/:id', permitirRoles('administrador'), employeesController.eliminarEmpleado);

module.exports = router;