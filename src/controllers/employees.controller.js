/**
 * @file employees.controller.js
 * @description Controlador para el alta de empleados y sus credenciales de acceso (HU10) y administración de cuentas (HU04).
 */

const { 
  createUser, 
  getAllUsers, 
  findUserByUsername, 
  getUserById, 
  updateUser, 
  setUserActivo, 
  deleteUser 
} = require('../models/user.model.js');

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

/**
 * Actualiza los datos generales de un empleado (HU04).
 *
 * @function actualizarEmpleado
 * @param {import('express').Request} req - Petición HTTP con los datos a actualizar en el body y el ID en params.
 * @param {import('express').Response} res - Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta JSON con el empleado actualizado (sin contraseña) o mensaje de error.
 */
const actualizarEmpleado = async (req, res) => {
  const { id } = req.params;
  const { nombreCompleto, puesto, username, role, password, oldPassword } = req.body;

  try {
    const empleadoExiste = await getUserById(id);
    if (!empleadoExiste) {
      return res.status(404).json({ mensaje: 'El empleado no existe.' });
    }

    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ mensaje: 'Debes proporcionar la contraseña anterior para hacer el cambio.' });
      }

      // Verificación de la contraseña anterior (ajusta si usas bcrypt.compare)
      const esValida = oldPassword === empleadoExiste.password;

      if (!esValida) {
        return res.status(401).json({ mensaje: 'La contraseña anterior ingresada es incorrecta.' });
      }

      // NUEVA VALIDACIÓN EN EL SERVIDO: Evitar contraseña idéntica
      if (password === oldPassword) {
        return res.status(400).json({ mensaje: 'La nueva contraseña no puede ser igual a la contraseña actual.' });
      }
    }

    const empleadoActualizado = await updateUser(id, { nombreCompleto, puesto, username, role, password });
    const { password: _passwordOculta, ...empleadoParaCliente } = empleadoActualizado;

    return res.status(200).json({
      mensaje: 'Empleado actualizado correctamente.',
      empleado: empleadoParaCliente
    });
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al actualizar el empleado.' });
  }
};

/**
 * Activa o desactiva la cuenta de un empleado (HU04).
 *
 * @function cambiarEstadoEmpleado
 * @param {import('express').Request} req - Petición HTTP con el parámetro `activo` en el body.
 * @param {import('express').Response} res - Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta JSON con la confirmación de cambio de estado.
 */
const cambiarEstadoEmpleado = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  try {
    const empleadoActualizado = await setUserActivo(id, activo);
    if (!empleadoActualizado) {
      return res.status(404).json({ mensaje: 'El empleado no existe.' });
    }

    const estadoTexto = activo ? 'activada' : 'desactivada';
    return res.status(200).json({
      mensaje: `La cuenta ha sido ${estadoTexto} correctamente.`,
      empleado: empleadoActualizado
    });
  } catch (error) {
    console.error('Error al cambiar estado del empleado:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al cambiar el estado del empleado.' });
  }
};

/**
 * Elimina definitivamente la cuenta de un empleado (HU04).
 *
 * @function eliminarEmpleado
 * @param {import('express').Request} req - Petición HTTP con el ID del empleado en los parámetros.
 * @param {import('express').Response} res - Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta JSON indicando si la eliminación fue exitosa.
 */
const eliminarEmpleado = async (req, res) => {
  const { id } = req.params;

  try {
    const eliminado = await deleteUser(id);
    if (!eliminado) {
      return res.status(404).json({ mensaje: 'El empleado no existe.' });
    }

    return res.status(200).json({ mensaje: 'Empleado eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al eliminar el empleado.' });
  }
};

module.exports = {
  registrarEmpleado,
  listarEmpleados,
  actualizarEmpleado,
  cambiarEstadoEmpleado,
  eliminarEmpleado
};