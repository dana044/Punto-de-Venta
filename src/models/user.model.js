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

module.exports = {
  createUser,
  getAllUsers,
  findUserByUsername
};