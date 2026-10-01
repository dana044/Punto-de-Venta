/**
 * @file lote.model.js
 * @description Modelo de persistencia para los lotes de productos (Control de almacén y FEFO).
 * @author Dana Carmona
 */

const db = require('../config/db.js');

/**
 * Registra un nuevo lote para un producto específico.
 * @async
 * @function crearLote
 * @param {Object} data - Datos del lote.
 * @param {number} data.productoId - ID del producto al que pertenece el lote.
 * @param {number} data.cantidad - Unidades físicas que ingresan en este lote.
 * @param {string} [data.fechaCaducidad] - Fecha de expiración (YYYY-MM-DD).
 * @returns {Promise<number>} ID del lote recién insertado.
 */
const crearLote = async ({ productoId, cantidad, fechaCaducidad }) => {
  const [result] = await db.execute(
    `INSERT INTO lotes_producto (producto_id, cantidad, fecha_caducidad) VALUES (?, ?, ?)`,
    [productoId, cantidad, fechaCaducidad || null]
  );
  return result.insertId;
};

/**
 * Consulta todos los lotes de un producto ordenados por fecha de caducidad (FEFO).
 * @async
 * @function getLotesPorProducto
 * @param {number|string} productoId - Identificador del producto.
 * @returns {Promise<Array<Object>>} Lista de lotes disponibles.
 */
const getLotesPorProducto = async (productoId) => {
  const [rows] = await db.execute(
    `SELECT * FROM lotes_producto WHERE producto_id = ? ORDER BY fecha_caducidad ASC`,
    [productoId]
  );
  return rows;
};

/**
 * Actualiza la cantidad o la caducidad de un lote existente.
 * @async
 * @function actualizarLote
 * @param {number|string} id - Identificador del lote.
 * @param {Object} data - Datos a actualizar.
 * @returns {Promise<boolean>} Retorna true si fue exitoso.
 */
const actualizarLote = async (id, { cantidad, fechaCaducidad }) => {
  await db.execute(
    `UPDATE lotes_producto SET cantidad = ?, fecha_caducidad = ? WHERE id = ?`,
    [cantidad, fechaCaducidad || null, id]
  );
  return true;
};

/**
 * Elimina un lote del sistema (por ejemplo, en caso de error de captura).
 * @async
 * @function eliminarLote
 * @param {number|string} id - Identificador del lote.
 * @returns {Promise<boolean>} Retorna true si fue exitoso.
 */
const eliminarLote = async (id) => {
  await db.execute(`DELETE FROM lotes_producto WHERE id = ?`, [id]);
  return true;
};

module.exports = { crearLote, getLotesPorProducto, actualizarLote, eliminarLote };