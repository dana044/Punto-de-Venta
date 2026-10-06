/**
 * @file sale.model.js
 * @description Modelo de transacciones para el Punto de Venta (HU-25) y Reportes de Venta (HU-40).
 * @author Alfonso Mendoza Vásquez (Doomsayer)
 * @author Stephanie Elizdeth Hernández Prieto (HU-40: Reporte de Venta Mensual)
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */
const db = require('../config/db');

class SaleModel {    
    static async createSale(cajeroId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.execute(
                'INSERT INTO ventas (usuario_id, fecha) VALUES (?, NOW())',
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
                // Evita que MySQL devuelva estadísticas en caché del AUTO_INCREMENT
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
     * Obtiene el ranking de productos más vendidos en un mes específico.
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
            INNER JOIN v_productos p ON vd.producto_id = p.id
            WHERE YEAR(v.fecha) = ? AND MONTH(v.fecha) = ? AND v.estado <> 'cancelada'
            GROUP BY p.id, p.nombre, p.codigo_barras, p.categoria
            ORDER BY total_unidades_vendidas DESC;
        `;
        const [rows] = await db.execute(query, [Number(anio), Number(mes)]);
        return rows;
    }

    /**
     * Reporte de ventas de un día específico: cada venta del día con su hora, método de pago e importe.
     * @async
     * @static
     * @param {string} fecha - Día a consultar en formato AAAA-MM-DD.
     * @returns {Promise<Array<Object>>}
     */
    static async getReporteDiario(fecha) {
        const query = `
            SELECT
                v.id,
                COALESCE(v.folio, CONCAT('#', v.id)) AS folio,
                DATE_FORMAT(v.fecha, '%H:%i') AS hora,
                HOUR(v.fecha) AS hora_dia,
                v.metodo_pago,
                v.estado,
                SUM(vd.cantidad) AS piezas,
                SUM(vd.total_linea) AS subtotal_neto,
                ROUND(SUM(vd.total_linea) * 0.16, 2) AS iva
            FROM ventas v
            INNER JOIN venta_detalle vd ON vd.venta_id = v.id
            WHERE v.fecha >= ? AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY) AND v.estado <> 'cancelada'
            GROUP BY v.id, v.folio, v.fecha, v.metodo_pago, v.estado
            ORDER BY v.fecha ASC;
        `;
        const [rows] = await db.execute(query, [fecha, fecha]);
        return rows;
    }

    /**
     * Reporte de productos por presentación: rendimiento de cada formato de empaque en un mes.
     * @async
     * @static
     * @param {number|string} anio
     * @param {number|string} mes
     * @returns {Promise<Array<Object>>}
     */
    static async getReportePresentacion(anio, mes) {
        const query = `
            SELECT
                COALESCE(NULLIF(TRIM(p.presentacion), ''), 'Sin presentación') AS presentacion,
                COUNT(DISTINCT p.id) AS productos_distintos,
                SUM(vd.cantidad) AS total_unidades_vendidas,
                SUM(vd.total_linea) AS total_recaudado
            FROM venta_detalle vd
            INNER JOIN ventas v ON vd.venta_id = v.id
            INNER JOIN productos p ON vd.producto_id = p.id
            WHERE YEAR(v.fecha) = ? AND MONTH(v.fecha) = ? AND v.estado <> 'cancelada'
            GROUP BY COALESCE(NULLIF(TRIM(p.presentacion), ''), 'Sin presentación')
            ORDER BY total_unidades_vendidas DESC;
        `;
        const [rows] = await db.execute(query, [Number(anio), Number(mes)]);
        return rows;
    }

    /**
     * Reporte de compras agrupadas por distribuidor y rango de fechas.
     * @async
     * @static
     * @param {string} fechaInicio
     * @param {string} fechaFin
     * @returns {Promise<Array<Object>>}
     */
    static async getReporteCompras(fechaInicio, fechaFin) {
        const query = `
            SELECT 
                pr.id AS proveedor_id,
                pr.nombre AS proveedor,
                COUNT(DISTINCT p.id) AS total_pedidos,
                COALESCE(SUM(pd.cantidad_recibida * pd.costo_unitario), 0) AS total_comprado
            FROM pedidos p
            JOIN proveedores pr ON pr.id = p.proveedor_id
            JOIN pedido_detalle pd ON pd.pedido_id = p.id
            WHERE p.fecha >= ? AND p.fecha <= DATE_ADD(?, INTERVAL 1 DAY) AND p.estado = 'recibido'
            GROUP BY pr.id, pr.nombre
            ORDER BY total_comprado DESC;
        `;
        const [rows] = await db.execute(query, [fechaInicio, fechaFin]);
        return rows;
    }

    /**
     * Consulta el historial de ventas individualizado por colaborador y día específico.
     * @async
     * @static
     * @param {Object} filtros - Filtros opcionales: usuarioId, fecha, estado.
     * @returns {Promise<Array<Object>>}
     */
    static async getHistorialVentas(filtros = {}) {
        let query = `
            SELECT 
                id, folio, usuario_id, colaborador, fecha, metodo_pago,
                estado, motivo_cancelacion, cancelada_por, fecha_cancelacion,
                subtotal, descuentos, iva, total
            FROM v_ventas
            WHERE 1=1
        `;
        const params = [];

        if (filtros.usuarioId) {
            query += ' AND usuario_id = ?';
            params.push(filtros.usuarioId);
        }

        if (filtros.fecha) {
            query += ' AND DATE(fecha) = ?';
            params.push(filtros.fecha);
        }

        if (filtros.estado) {
            query += ' AND estado = ?';
            params.push(filtros.estado);
        }

        query += ' ORDER BY fecha DESC';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * Solicita la cancelación de una venta por parte de un cajero.
     * @async
     * @static
     * @param {number|string} ventaId
     * @param {string} motivo
     * @returns {Promise<boolean>}
     */
    static async solicitarCancelacion(ventaId, motivo) {
        const query = `
            UPDATE ventas 
            SET estado = 'solicitada_cancelacion', motivo_cancelacion = ?
            WHERE id = ? AND estado = 'completada'
        `;
        const [result] = await db.execute(query, [motivo, ventaId]);
        return result.affectedRows > 0;
    }

    /**
     * Aprueba la cancelación de una venta, revirtiendo el inventario.
     * @async
     * @static
     * @param {number|string} ventaId
     * @param {number} adminId
     * @returns {Promise<boolean>}
     */
    static async autorizarCancelacion(ventaId, adminId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [venta] = await connection.execute(
                'SELECT id, estado FROM ventas WHERE id = ? FOR UPDATE',
                [ventaId]
            );

            if (!venta.length || venta[0].estado === 'cancelada') {
                await connection.rollback();
                return false;
            }

            const [detalles] = await connection.execute(
                'SELECT producto_id, cantidad FROM venta_detalle WHERE venta_id = ?',
                [ventaId]
            );

            for (const item of detalles) {
                await connection.execute(
                    'UPDATE productos SET stock_mostrador = stock_mostrador + ? WHERE id = ?',
                    [item.cantidad, item.producto_id]
                );
            }

            await connection.execute(
                `UPDATE ventas 
                 SET estado = 'cancelada', cancelada_por = ?, fecha_cancelacion = NOW() 
                 WHERE id = ?`,
                [adminId, ventaId]
            );

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
     * Catálogo del POS: lista las categorías que tienen productos activos.
     * @async
     * @static
     * @returns {Promise<Array<Object>>}
     */
    static async getCategoriasCatalogo() {
        const query = `
            SELECT c.nombre AS categoria, COUNT(p.id) AS total_productos
            FROM productos p
            JOIN categorias c ON p.categoria_id = c.id
            WHERE p.estado_id = 1
            GROUP BY c.id, c.nombre
            ORDER BY c.nombre ASC;
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    /**
     * Catálogo del POS: lista productos activos filtrando por categoría y/o por texto.
     * @async
     * @static
     */
    static async getProductosCatalogo(categoria, termino) {
        let query = `
            SELECT id, nombre, codigo_barras, categoria, precio, stock_mostrador
            FROM v_productos
            WHERE estado = 'activo'
        `;
        const params = [];

        if (categoria) {
            query += ' AND categoria = ?';
            params.push(categoria);
        }

        if (termino) {
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