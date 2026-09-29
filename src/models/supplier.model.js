/**
 * @file supplier.model.js
 * @description Modelo de acceso a datos para la gestión y validación de distribuidores/proveedores (HU-18, HU-19).
 * @author Alfonso Mendoza Vásquez (Doomsayer / Programador XP)
 */

const db = require('../config/db');

class SupplierModel {
    /**
     * Registra un nuevo distribuidor validando estrictamente que no existan duplicados.
     *
     * @async
     * @function create
     * @param {Object} data - Objeto con los datos validados del proveedor.
     * @returns {Promise<number>} Retorna el ID (insertId) del distribuidor recién creado.
     * @throws {Error} Lanza un error HTTP 409 si se detecta un proveedor duplicado.
     */
    static async create({ nombre, direccion, telefono, email }) {
        // Evitar duplicados
        const [existente] = await db.execute(
            'SELECT id FROM proveedores WHERE nombre = ? OR email = ? LIMIT 1',
            [nombre, email]
        );

        if (existente.length > 0) {
            const error = new Error('Ya existe un proveedor registrado con ese nombre o correo electrónico.');
            error.statusCode = 409; 
            throw error;
        }

        // Inserción parametrizada contra inyección SQL
        const [result] = await db.execute(
            'INSERT INTO proveedores (nombre, direccion, telefono, email, activo) VALUES (?, ?, ?, ?, TRUE)',
            [nombre, direccion || null, telefono || null, email]
        );

        return result.insertId;
    }

    /**
     * Consulta y retorna la lista de todos los distribuidores activos.
     *
     * @async
     * @function getAllActive
     * @returns {Promise<Array<Object>>} Arreglo con los datos de los proveedores.
     */
    static async getAllActive() {
        const [rows] = await db.execute(
            'SELECT id, nombre, direccion, telefono, email, activo FROM proveedores WHERE activo = TRUE ORDER BY id DESC'
        );
        return rows;
    }

    /**
     * Actualiza la información de un distribuidor existente usando COALESCE
     * para no sobreescribir con nulos los datos que no se enviaron.
     *
     * @async
     * @function update
     * @param {number} id - Identificador del distribuidor.
     * @param {Object} data - Objeto con los datos a actualizar.
     * @returns {Promise<boolean>} Retorna true si se afectó alguna fila.
     */
    static async update(id, { nombre, direccion, telefono, email }) {
        const [result] = await db.execute(
            'UPDATE proveedores SET nombre = COALESCE(?, nombre), direccion = COALESCE(?, direccion), telefono = COALESCE(?, telefono), email = COALESCE(?, email) WHERE id = ?',
            [nombre || null, direccion || null, telefono || null, email || null, id]
        );
        return result.affectedRows > 0;
    }

    /**
     * Aplica baja lógica cambiando el estado activo a FALSE.
     *
     * @async
     * @function deactivate
     * @param {number} id - Identificador del distribuidor.
     * @returns {Promise<boolean>} Retorna true si fue desactivado.
     */
    static async deactivate(id) {
        const [result] = await db.execute(
            'UPDATE proveedores SET activo = FALSE WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = SupplierModel;