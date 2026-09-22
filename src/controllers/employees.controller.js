/**
 * @file employees.controller.js
 * @description Controlador para el alta de empleados y sus credenciales de acceso (HU10).
 */

const { createUser, getAllUsers, findUserByUsername } = require('../models/user.model.js');

/**
 * Registra un nuevo empleado vinculando su nombre, puesto y credenciales
 * de acceso (HU10). Solo debe llegar aquí una petición que ya pasó por
 * permitirRoles('administrador') y validateEmployee.
 *
 * @function registrarEmpleado
 * @param {import('express').Request} req - Petición HTTP con los datos del empleado ya validados.
 * @param {import('express').Response} res - Respuesta HTTP de Express.
 * @returns {Object} Respuesta JSON con el empleado creado (sin la contraseña) o el error correspondiente.
 */
const registrarEmpleado = (req, res) => {
  const { nombreCompleto, puesto, username, password, role } = req.body;

  /** Evita usuarios duplicados, igual que hará el login al buscarlos. */
  const usuarioExistente = findUserByUsername(username);
  if (usuarioExistente) {
    return res.status(409).json({ mensaje: 'Ese usuario ya está en uso por otro empleado.' });
  }

  const nuevoEmpleado = createUser({ nombreCompleto, puesto, username, password, role });

  /** Nunca se devuelve la contraseña en la respuesta. */
  const { password: _passwordOculta, ...empleadoParaCliente } = nuevoEmpleado;

  return res.status(201).json({
    mensaje: 'Empleado registrado correctamente.',
    empleado: empleadoParaCliente
  });
};

/**
 * Consulta la lista general de empleados registrados en el sistema.
 *
 * @function listarEmpleados
 * @param {import('express').Request} req - Petición HTTP de Express.
 * @param {import('express').Response} res - Respuesta HTTP con la colección de empleados.
 * @returns {Object} Respuesta JSON con estado 200 y la lista de empleados (sin contraseñas).
 */
const listarEmpleados = (req, res) => {
  const empleados = getAllUsers().map(({ password, ...resto }) => resto);

  return res.status(200).json({
    total: empleados.length,
    empleados
  });
};

module.exports = {
  registrarEmpleado,
  listarEmpleados
};