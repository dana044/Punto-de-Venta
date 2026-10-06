/**
 * @file invoice.model.js
 * @description Modelo del módulo de facturación SIMULADA: consulta de ventas por folio de
 * facturación y registro de la solicitud. No hay timbrado ni conexión con el SAT.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */
const db = require('../config/db');

class InvoiceModel {
    /**
     * Busca una venta por su folio de facturación (solo lectura salvo que se pida bloquear la fila).
     *
     * @async
     * @static
     * @param {string} folioFacturacion - Folio impreso al pie del ticket (ej. "0B3A-598D-2026").
     * @param {Object} [conexion=db] - Conexión (dentro de una transacción) o el pool.
     * @param {boolean} [bloquear=false] - Si es true agrega FOR UPDATE (solo dentro de una transacción).
     * @returns {Promise<?Object>} Datos de la venta, o null si el folio no existe.
     */
    static async buscarVentaPorFolioFacturacion(folioFacturacion, conexion = db, bloquear = false) {
        const [filas] = await conexion.execute(
            `SELECT v.id, v.folio, v.total, v.estado_facturacion,
              DATE_FORMAT(v.fecha, '%Y-%m-%d') AS fecha_dia,
              YEAR(v.fecha) AS anio,
              DATEDIFF(CURDATE(), DATE(v.fecha)) AS dias_antiguedad
       FROM ventas v
       WHERE v.folio_facturacion = ?
       LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`,
            [folioFacturacion]
        );
        return filas[0] || null;
    }

    /**
     * Inserta la solicitud de facturación. La columna venta_id es UNIQUE, por lo que una
     * segunda solicitud para la misma venta lanza ER_DUP_ENTRY.
     *
     * @async
     * @static
     * @param {Object} conexion - Conexión dentro de la transacción.
     * @param {number} ventaId - Id de la venta que se factura.
     * @param {Object} datos - Datos fiscales ya validados.
     * @returns {Promise<number>} Id de la factura creada.
     */
    static async crearFactura(conexion, ventaId, datos) {
        const [resultado] = await conexion.execute(
            `INSERT INTO facturas
         (venta_id, rfc, codigo_postal, nombre_razon_social, regimen_fiscal, uso_cfdi,
          enviar_correo, correo, acepta_aviso_privacidad, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'solicitada')`,
            [ventaId, datos.rfc, datos.codigoPostal, datos.nombreRazonSocial, datos.regimenFiscal,
                datos.usoCfdi, datos.recibirPorCorreo ? 1 : 0, datos.correo]
        );
        return resultado.insertId;
    }

    /**
     * Guarda el identificador de la factura simulada (no es un UUID fiscal).
     *
     * @async
     * @static
     * @param {Object} conexion - Conexión dentro de la transacción.
     * @param {number} facturaId - Id de la factura.
     * @param {string} folioFactura - Identificador interno, ej. "FAC-SIM-2026-000001".
     * @returns {Promise<void>}
     */
    static async asignarFolioFactura(conexion, facturaId, folioFactura) {
        await conexion.execute('UPDATE facturas SET folio_factura = ? WHERE id = ?', [folioFactura, facturaId]);
    }

    /**
     * Marca la venta como 'solicitada'. El filtro por estado evita marcarla dos veces.
     *
     * @async
     * @static
     * @param {Object} conexion - Conexión dentro de la transacción.
     * @param {number} ventaId - Id de la venta.
     * @returns {Promise<boolean>} true si se actualizó la fila.
     */
    static async marcarVentaSolicitada(conexion, ventaId) {
        const [resultado] = await conexion.execute(
            "UPDATE ventas SET estado_facturacion = 'solicitada' WHERE id = ? AND estado_facturacion = 'sin_facturar'",
            [ventaId]
        );
        return resultado.affectedRows === 1;
    }
}

module.exports = InvoiceModel;