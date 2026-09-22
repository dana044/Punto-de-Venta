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
 * @returns {Promise<Object>} Respuesta JSON con el empleado creado (sin la contraseña) o el error correspondiente.
 */
const registrarEmpleado = async (req, res) => {
  const { nombreCompleto, puesto, username, password, role } = req.body;

  try {
    /** Evita usuarios duplicados, igual que hará el login al buscarlos. */
    const usuarioExistente = await findUserByUsername(username);
    if (usuarioExistente) {
      return res.status(409).json({ mensaje: 'Ese usuario ya está en uso por otro empleado.' });
    }

    const nuevoEmpleado = await createUser({ nombreCompleto, puesto, username, password, role });

    /** Nunca se devuelve la contraseña en la respuesta. */
    const { password: _passwordOculta, ...empleadoParaCliente } = nuevoEmpleado;

    return res.status(201).json({
      mensaje: 'Empleado registrado correctamente.',
      empleado: empleadoParaCliente
    });
  } catch (error) {
    console.error('Error al registrar empleado:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al registrar el empleado.' });
  }
};

/**
 * Consulta la lista general de empleados registrados en el sistema.
 *
 * @function listarEmpleados
 * @param {import('express').Request} req - Petición HTTP de Express.
 * @param {import('express').Response} res - Respuesta HTTP con la colección de empleados.
 * @returns {Promise<Object>} Respuesta JSON con estado 200 y la lista de empleados (sin contraseñas).
 */
const listarEmpleados = async (req, res) => {
  try {
    const usuarios = await getAllUsers();
    const empleados = usuarios.map(({ password, ...resto }) => resto);

    return res.status(200).json({
      total: empleados.length,
      empleados
    });
  } catch (error) {
    console.error('Error al listar empleados:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al consultar los empleados.' });
  }
};

module.exports = {
  registrarEmpleado,
  listarEmpleados
};