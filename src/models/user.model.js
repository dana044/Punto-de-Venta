/**
 * @file user.model.js
 * @description Modelo de usuarios/empleados, ahora respaldado por MySQL
 * en vez del arreglo en memoria original.
 */

const pool = require('../config/db.js');

/**
 * Convierte una fila de la tabla `usuarios` (snake_case) al formato
 * que ya usa el resto de la app (camelCase), para no tener que tocar
 * los controladores que consumen estos campos.
 */
function mapRowToUser(row) {
  return {
    id: row.id,
    nombreCompleto: row.nombre_completo,
    puesto: row.puesto,
    username: row.username,
    password: row.password,
    role: row.role,
    activo: !!row.activo
  };
}

/**
 * Crea un nuevo empleado en la base de datos.
 * @param {{nombreCompleto:string, puesto:string, username:string, password:string, role:string}} datos
 * @returns {Promise<Object>} El empleado recién creado (incluye password, el controlador la oculta).
 */
async function createUser({ nombreCompleto, puesto, username, password, role }) {
  const [result] = await pool.query(
    `INSERT INTO usuarios (nombre_completo, puesto, username, password, role)
     VALUES (?, ?, ?, ?, ?)`,
    [nombreCompleto, puesto, username, password, role]
  );

  return {
    id: result.insertId,
    nombreCompleto,
    puesto,
    username,
    password,
    role,
    activo: true
  };
}

/**
 * Devuelve todos los empleados registrados.
 * @returns {Promise<Object[]>}
 */
async function getAllUsers() {
  const [rows] = await pool.query(`SELECT * FROM usuarios ORDER BY id`);
  return rows.map(mapRowToUser);
}

/**
 * Busca un empleado por su username (usado para evitar duplicados y para login).
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
async function findUserByUsername(username) {
  const [rows] = await pool.query(
    `SELECT * FROM usuarios WHERE username = ? LIMIT 1`,
    [username]
  );
  return rows.length ? mapRowToUser(rows[0]) : null;
}

/**
 * Busca un empleado por su id.
 * @param {number|string} id
 * @returns {Promise<Object|null>}
 */
async function getUserById(id) {
  const [rows] = await pool.query(`SELECT * FROM usuarios WHERE id = ? LIMIT 1`, [id]);
  return rows.length ? mapRowToUser(rows[0]) : null;
}

/**
 * Actualiza los datos generales de un empleado (HU04: editar cuenta).
 * La contraseña solo se modifica si se envía una nueva; de lo contrario
 * conserva la que ya tenía.
 * @param {number|string} id
 * @param {{nombreCompleto:string, puesto:string, username:string, role:string, password?:string}} datos
 * @returns {Promise<Object|null>} El empleado actualizado, o null si no existe.
 */
async function updateUser(id, { nombreCompleto, puesto, username, role, password }) {
  if (password) {
    await pool.query(
      `UPDATE usuarios SET nombre_completo = ?, puesto = ?, username = ?, role = ?, password = ? WHERE id = ?`,
      [nombreCompleto, puesto, username, role, password, id]
    );
  } else {
    await pool.query(
      `UPDATE usuarios SET nombre_completo = ?, puesto = ?, username = ?, role = ? WHERE id = ?`,
      [nombreCompleto, puesto, username, role, id]
    );
  }
  return getUserById(id);
}

/**
 * Activa o desactiva la cuenta de un empleado (HU04). Una cuenta desactivada
 * no debe permitir el inicio de sesión (ver auth.controller.js).
 * @param {number|string} id
 * @param {boolean} activo
 * @returns {Promise<Object|null>} El empleado actualizado, o null si no existe.
 */
async function setUserActivo(id, activo) {
  await pool.query(`UPDATE usuarios SET activo = ? WHERE id = ?`, [activo, id]);
  return getUserById(id);
}

/**
 * Elimina definitivamente la cuenta de un empleado (HU04).
 * @param {number|string} id
 * @returns {Promise<boolean>} true si existía una fila y fue eliminada.
 */
async function deleteUser(id) {
  const [result] = await pool.query(`DELETE FROM usuarios WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createUser,
  getAllUsers,
  findUserByUsername,
  getUserById,
  updateUser,
  setUserActivo,
  deleteUser
};