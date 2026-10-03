/**
 * @file sale.model.js
 * @description Modelo de transacciones para el Punto de Venta (HU-25) y Reportes de Venta (HU-40).
 * @author Alfonso Mendoza Vásquez (Doomsayer)
 * @author Stephanie Elizdeth Hernández Prieto (HU-40: Reporte de Venta Mensual)
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */
const db = require('../config/db');

class SaleModel {
    /**
     * HU-25: Crea una nueva venta generando un folio único consecutivo.
     */
    static async createSale(cajeroId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.execute(
                'INSERT INTO ventas (usuario_id, subtotal, iva, total, fecha) VALUES (?, 0.00, 0.00, 0.00, NOW())',
                [cajeroId]
            );

            const ventaId = result.insertId;
            const year = new Date().getFullYear();
            const folio = `VTA-${year}-${String(ventaId).padStart(5, '0')}`;

            await connection.execute(
                'UPDATE ventas SET folio = ? WHERE id = ?',
                [folio, ventaId]
            );

            await connection.commit();
            return { id: ventaId, folio: folio, fecha: new Date() };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Da formato al folio de una venta a partir de su id (VTA-AAAA-00001).
     * Se usa tanto para el folio mostrado en pantalla como para el folio definitivo.
     *
     * @static
     * @param {number|string} ventaId - Id de la venta.
     * @returns {string} Folio con el formato VTA-AAAA-NNNNN.
     */
    static formatearFolio(ventaId) {
        return `VTA-${new Date().getFullYear()}-${String(ventaId).padStart(5, '0')}`;
    }

    /**
     * Calcula, en modo de solo lectura, el folio que tendrá la próxima venta.
     * NO inserta nada en la base de datos: la venta se crea hasta que se cobra.
     * Primero intenta leer el siguiente AUTO_INCREMENT de la tabla ventas; si el motor
     * no lo permite, usa MAX(id) + 1 como respaldo.
     *
     * @async
     * @static
     * @returns {Promise<{folio: string, fecha: Date}>} Folio estimado y fecha actual.
     */
    static async getSiguienteFolio() {
        const connection = await db.getConnection();
        try {
            let siguienteId = null;

            try {
                // Evita que MySQL 8 devuelva estadísticas en caché del AUTO_INCREMENT
                await connection.query('SET SESSION information_schema_stats_expiry = 0');
                const [filas] = await connection.query(
                    `SELECT AUTO_INCREMENT AS siguiente
                     FROM information_schema.TABLES
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ventas'`
                );
                siguienteId = filas[0] ? Number(filas[0].siguiente) : null;
            } catch (errorStats) {
                siguienteId = null;
            }

            if (!siguienteId) {
                const [filas] = await connection.query('SELECT COALESCE(MAX(id), 0) + 1 AS siguiente FROM ventas');
                siguienteId = Number(filas[0].siguiente);
            }

            return { folio: SaleModel.formatearFolio(siguienteId), fecha: new Date() };
        } finally {
            connection.release();
        }
    }

    /**
     * HU-40: Reporte general y ranking mensual de ventas.
     * Devuelve todos los productos comercializados en el mes, ordenados descendentemente.
     * @async
     * @static
     * @param {number|string} anio
     * @param {number|string} mes
     * @returns {Promise<Array<Object>>}
     */
    static async getRankingMensual(anio, mes) {
        const query = `
            SELECT 
                p.id,
                p.nombre,
                p.codigo_barras,
                p.categoria,
                SUM(vd.cantidad) AS total_unidades_vendidas,
                SUM(vd.total_linea) AS total_recaudado
            FROM venta_detalle vd
            INNER JOIN ventas v ON vd.venta_id = v.id
            INNER JOIN productos p ON vd.producto_id = p.id
            WHERE YEAR(v.fecha) = ? AND MONTH(v.fecha) = ?
            GROUP BY p.id, p.nombre, p.codigo_barras, p.categoria
            ORDER BY total_unidades_vendidas DESC;
        `;
        const [rows] = await db.execute(query, [Number(anio), Number(mes)]);
        return rows;
    }

    /**
     * Catálogo del POS: lista las categorías que tienen productos activos.
     * @async
     * @static
     * @returns {Promise<Array<Object>>} Categorías con el total de productos de cada una.
     */
    static async getCategoriasCatalogo() {
        const query = `
            SELECT categoria, COUNT(*) AS total_productos
            FROM productos
            WHERE activo = 1
            GROUP BY categoria
            ORDER BY categoria ASC;
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    /**
     * Catálogo del POS: lista productos activos filtrando por categoría y/o por texto (nombre o código de barras).
     * @async
     * @static
     * @param {string} [categoria] - Categoría exacta a mostrar (opcional).
     * @param {string} [termino] - Texto a buscar en el nombre o código de barras (opcional).
     * @returns {Promise<Array<Object>>} Máximo 60 productos ordenados por nombre.
     */
    static async getProductosCatalogo(categoria, termino) {
        let query = `
            SELECT id, nombre, codigo_barras, categoria, precio, stock_mostrador
            FROM productos
            WHERE activo = 1
        `;
        const params = [];

        if (categoria) {
            query += ' AND categoria = ?';
            params.push(categoria);
        }

        if (termino) {
            // Se escapan los comodines para que el texto del cajero se busque literal
            const textoSeguro = termino.replace(/[\\%_]/g, '\\$&');
            query += ' AND (nombre LIKE ? OR codigo_barras LIKE ?)';
            params.push(`%${textoSeguro}%`, `%${textoSeguro}%`);
        }

        query += ' ORDER BY nombre ASC LIMIT 60';

        const [rows] = await db.query(query, params);
        return rows;
    }
}

module.exports = SaleModel;