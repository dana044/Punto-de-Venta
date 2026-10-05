/**
 * @file supplier.model.js
 * @description Modelo de acceso a datos para la gestión y validación de distribuidores/proveedores (3FN).
 *              Se agrega la gestión de múltiples teléfonos y correos por distribuidor (tablas proveedor_telefonos y proveedor_correos).
 * @author Alfonso Mendoza Vásquez (Doomsayer / Programador XP)
 * @author Citlaly Morales Viveros (Cliente / Programador XP)
 */

const db = require('../config/db');

class SupplierModel {
    /**
     * Registra un nuevo distribuidor validando estrictamente que no existan duplicados.
     * El alta se ejecuta dentro de una transacción para garantizar integridad en 3FN.
     *
     * @async
     * @function create
     * @param {Object} data - Objeto con los datos validados del proveedor.
     * @param {string} data.nombre - Razón social del distribuidor.
     * @param {string|null} data.calle - Calle y número (opcional).
     * @param {string|null} data.colonia - Colonia (opcional).
     * @param {string|null} data.ciudad - Ciudad (opcional).
     * @param {string|null} data.estado - Estado (opcional).
     * @param {string|null} data.codigo_postal - Código postal de 5 dígitos (opcional).
     * @param {Array<{telefono: string, tipo: string}>} data.telefonos - teléfonos ya validados (puede ir vacío).
     * @param {string[]} data.correos - correos ya validados y en minúsculas (mínimo uno).
     * @returns {Promise<number>} Retorna el ID (insertId) del distribuidor recién creado.
     * @throws {Error} Lanza un error HTTP 409 si se detecta un proveedor duplicado.
     */
    static async create({ nombre, calle, colonia, ciudad, estado, codigo_postal, telefonos = [], correos = [] }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Evitar duplicados por nombre
            const [existente] = await connection.execute(
                'SELECT id FROM proveedores WHERE nombre = ? LIMIT 1',
                [nombre]
            );

            if (existente.length > 0) {
                const error = new Error('Ya existe un proveedor registrado con ese nombre.');
                error.statusCode = 409;
                throw error;
            }

            // HU-21: ninguno de los correos adicionales puede pertenecer ya a otro distribuidor
            if (correos.length > 0) {
                await SupplierModel._validarCorreosUnicos(connection, correos);
            }

            // Inserción parametrizada contra inyección SQL adaptada a 3FN
            const [result] = await connection.execute(
                'INSERT INTO proveedores (nombre, calle, colonia, ciudad, estado, codigo_postal, activo) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
                [nombre, calle || null, colonia || null, ciudad || null, estado || null, codigo_postal || null]
            );

            // HU-21: se guardan todos los medios de contacto en las tablas foráneas
            await SupplierModel._reemplazarContactos(connection, result.insertId, telefonos, correos);

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene la lista general de proveedores registrados activos e inactivos.
     *
     * @async
     * @static
     * @function getAllActive
     * @returns {Promise<Array<Object>>} Arreglo con los registros de proveedores y su estado lógico.
     */
    static async getAllActive() {
        // Se consultan las columnas atómicas de dirección adaptadas a 3FN
        const [rows] = await db.execute(
            'SELECT id, nombre, calle, colonia, ciudad, estado, codigo_postal, activo FROM proveedores ORDER BY id DESC'
        );

        const [telefonos] = await db.execute(
            'SELECT proveedor_id, telefono, tipo FROM proveedor_telefonos ORDER BY proveedor_id, es_principal DESC, id'
        );
        const [correos] = await db.execute(
            'SELECT proveedor_id, correo FROM proveedor_correos ORDER BY proveedor_id, es_principal DESC, id'
        );

        const telefonosPorProveedor = new Map();
        telefonos.forEach(({ proveedor_id, telefono, tipo }) => {
            if (!telefonosPorProveedor.has(proveedor_id)) telefonosPorProveedor.set(proveedor_id, []);
            telefonosPorProveedor.get(proveedor_id).push({ telefono, tipo });
        });

        const correosPorProveedor = new Map();
        correos.forEach(({ proveedor_id, correo }) => {
            if (!correosPorProveedor.has(proveedor_id)) correosPorProveedor.set(proveedor_id, []);
            correosPorProveedor.get(proveedor_id).push(correo);
        });

        return rows.map((proveedor) => ({
            ...proveedor,
            telefonos: telefonosPorProveedor.get(proveedor.id) || [],
            correos: correosPorProveedor.get(proveedor.id) || []
        }));
    }

    /**
     * Reactiva a un proveedor previamente dado de baja lógica en el sistema.
     *
     * @async
     * @static
     * @function reactivateSupplier
     * @param {number|string} id - Identificador único del proveedor a reactivar.
     * @returns {Promise<boolean>} Retorna true si el registro fue actualizado exitosamente.
     */
    static async reactivateSupplier(id) {
        const connection = await db.getConnection();
        try {
            const [result] = await connection.execute('UPDATE proveedores SET activo = TRUE WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } finally {
            connection.release();
        }
    }

    /**
     * Actualiza la información de un distribuidor existente usando COALESCE.
     * En 3FN se actualizan las columnas geográficas y se ignora teléfono/correo en la cabecera.
     *
     * @async
     * @function update
     * @param {number} id - Identificador del distribuidor.
     * @param {Object} data - Objeto con los datos a actualizar.
     * @returns {Promise<boolean>} Retorna true si se afectó alguna fila.
     */
    static async update(id, { nombre, calle, colonia, ciudad, estado, codigo_postal, telefonos, correos }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            if (Array.isArray(correos) && correos.length > 0) {
                await SupplierModel._validarCorreosUnicos(connection, correos, id);
            }

            const [result] = await connection.execute(
                `UPDATE proveedores 
                 SET nombre = COALESCE(?, nombre), 
                     calle = COALESCE(?, calle), 
                     colonia = COALESCE(?, colonia), 
                     ciudad = COALESCE(?, ciudad), 
                     estado = COALESCE(?, estado), 
                     codigo_postal = COALESCE(?, codigo_postal) 
                 WHERE id = ?`,
                [nombre || null, calle || null, colonia || null, ciudad || null, estado || null, codigo_postal || null, id]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return false;
            }

            await SupplierModel._reemplazarContactos(connection, id, telefonos, correos);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
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

    /**
     * Reemplaza los teléfonos y/o correos de un distribuidor.
     *
     * @async
     * @private
     * @function _reemplazarContactos
     * @param {import('mysql2/promise').PoolConnection} connection - Conexión con transacción activa.
     * @param {number} proveedorId - Identificador del distribuidor dueño de los contactos.
     * @param {Array<{telefono: string, tipo: string}>} [telefonos] - Lista de teléfonos; `undefined` = no modificar.
     * @param {string[]} [correos] - Lista de correos; `undefined` = no modificar.
     * @returns {Promise<void>}
     */
    static async _reemplazarContactos(connection, proveedorId, telefonos, correos) {
        if (Array.isArray(telefonos)) {
            await connection.execute('DELETE FROM proveedor_telefonos WHERE proveedor_id = ?', [proveedorId]);
            for (let i = 0; i < telefonos.length; i++) {
                await connection.execute(
                    'INSERT INTO proveedor_telefonos (proveedor_id, telefono, tipo, es_principal) VALUES (?, ?, ?, ?)',
                    [proveedorId, telefonos[i].telefono, telefonos[i].tipo, i === 0]
                );
            }
        }

        if (Array.isArray(correos)) {
            await connection.execute('DELETE FROM proveedor_correos WHERE proveedor_id = ?', [proveedorId]);
            for (let i = 0; i < correos.length; i++) {
                await connection.execute(
                    'INSERT INTO proveedor_correos (proveedor_id, correo, es_principal) VALUES (?, ?, ?)',
                    [proveedorId, correos[i], i === 0]
                );
            }
        }
    }

    /**
     * Verifica que ninguno de los correos indicados esté registrado en otro distribuidor.
     *
     * @async
     * @private
     * @function _validarCorreosUnicos
     */
    static async _validarCorreosUnicos(connection, correos, excluirProveedorId = null) {
        const marcadores = correos.map(() => '?').join(', ');
        let sql = `SELECT correo FROM proveedor_correos WHERE correo IN (${marcadores})`;
        const params = [...correos];

        if (excluirProveedorId !== null) {
            sql += ' AND proveedor_id <> ?';
            params.push(excluirProveedorId);
        }
        sql += ' LIMIT 1';

        const [repetidos] = await connection.execute(sql, params);

        if (repetidos.length > 0) {
            const error = new Error(`El correo ${repetidos[0].correo} ya está registrado en otro distribuidor.`);
            error.statusCode = 409;
            throw error;
        }
    }
}

module.exports = SupplierModel;