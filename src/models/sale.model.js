/**
 * @file sale.model.js
 * @description Modelo de transacciones para el Punto de Venta (HU-25) y Reportes de Venta (HU-40).
 * @author Alfonso Mendoza Vásquez (Doomsayer)
 * @author Stephanie Elizdeth Hernández Prieto (HU-40: Reporte de Venta Mensual)
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
}

module.exports = SaleModel;