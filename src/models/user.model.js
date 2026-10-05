/**
 * @file user.model.js
 * @description Modelo de usuarios/empleados adaptado a la 3FN (uso de rol_id).
 */

const pool = require('../config/db.js');

/**
 * Convierte una fila de la tabla `usuarios` (con join a roles) al formato
 * que usa la aplicación (camelCase).
 */
function mapRowToUser(row) {
  return {
    id: row.id,
    nombreCompleto: row.nombre_completo,
    correo: row.correo,
    password: row.password,
    rolId: row.rol_id,
    role: row.role_nombre, // Traído desde la tabla roles mediante JOIN
    activo: !!row.activo
  };
}

/**
 * Crea un nuevo empleado en la base de datos usando rol_id.
 */
async function createUser({ nombreCompleto, correo, password, rolId }) {
  const [result] = await pool.query(
    `INSERT INTO usuarios (nombre_completo, correo, password, rol_id)
     VALUES (?, ?, ?, ?)`,
    [nombreCompleto, correo, password, rolId || 2]
  );

  return getUserById(result.insertId);
}

/**
 * Devuelve todos los empleados registrados incluyendo el nombre de su rol.
 */
async function getAllUsers() {
  const [rows] = await pool.query(`
    SELECT u.*, r.nombre AS role_nombre 
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    ORDER BY u.id
  `);
  return rows.map(mapRowToUser);
}

/**
 * Busca un empleado por su correo para login o validaciones.
 */
async function findUserByCorreo(correo) {
  const [rows] = await pool.query(
    `SELECT u.*, r.nombre AS role_nombre 
     FROM usuarios u
     JOIN roles r ON u.rol_id = r.id
     WHERE u.correo = ? LIMIT 1`, [correo]);
  return rows.length ? mapRowToUser(rows[0]) : null;
}

/**
 * Busca un empleado por su correo y rolId.
 */
async function findByCorreoYRol(correo, rolId, excludeId = null) {
  const params = [correo, rolId];
  let sql = `SELECT u.*, r.nombre AS role_nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.correo = ? AND u.rol_id = ?`;
  if (excludeId) { sql += ` AND u.id != ?`; params.push(excludeId); }
  const [rows] = await pool.query(sql + ' LIMIT 1', params);
  return rows.length ? mapRowToUser(rows[0]) : null;
}

/**
 * Busca un empleado por su id.
 */
async function getUserById(id) {
  const [rows] = await pool.query(`
    SELECT u.*, r.nombre AS role_nombre 
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = ? LIMIT 1
  `, [id]);
  return rows.length ? mapRowToUser(rows[0]) : null;
}

/**
 * Actualiza los datos generales de un empleado (incluyendo rol_id).
 */
async function updateUser(id, { nombreCompleto, correo, rolId, password }) {
  if (password) {
    await pool.query(
      `UPDATE usuarios SET nombre_completo = ?, correo = ?, rol_id = ?, password = ? WHERE id = ?`,
      [nombreCompleto, correo, rolId, password, id]
    );
  } else {
    await pool.query(
      `UPDATE usuarios SET nombre_completo = ?, correo = ?, rol_id = ? WHERE id = ?`,
      [nombreCompleto, correo, rolId, id]
    );
  }
  return getUserById(id);
}

async function setUserActivo(id, activo) {
  await pool.query(`UPDATE usuarios SET activo = ? WHERE id = ?`, [activo, id]);
  return getUserById(id);
}

async function deleteUser(id) {
  const [result] = await pool.query(`DELETE FROM usuarios WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createUser,
  getAllUsers,
  findUserByCorreo,
  findByCorreoYRol,
  getUserById,
  updateUser,
  setUserActivo,
  deleteUser
};