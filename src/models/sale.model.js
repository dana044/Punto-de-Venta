/**
 * @file sale.model.js
 * @description Modelo de transacciones para el Punto de Venta (HU-25).
 * @author Alfonso Mendoza Vásquez (Doomsayer)
 */
const db = require('../config/db');

class SaleModel {
    /**
     * HU-25: Crea una nueva venta generando un folio único consecutivo.
     * @async
     * @static
     * @param {number} cajeroId - ID del cajero en turno.
     * @returns {Promise<Object>} Datos de la venta iniciada (ID, folio, fecha).
     */
    static async createSale(cajeroId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Inserción alineada a las columnas reales del schema.sql
            const [result] = await connection.execute(
                'INSERT INTO ventas (usuario_id, subtotal, iva, total, fecha) VALUES (?, 0.00, 0.00, 0.00, NOW())',
                [cajeroId]
            );

            const ventaId = result.insertId;

            // 2. Generar el folio oficial (como VTA-2026-00015)
            const year = new Date().getFullYear();
            const folio = `VTA-${year}-${String(ventaId).padStart(5, '0')}`;

            // 3. Actualizar la venta con su folio definitivo
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
}

module.exports = SaleModel;