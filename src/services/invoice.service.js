/**
 * @file invoice.service.js
 * @description Lógica del módulo de facturación SIMULADA (proyecto académico).
 * Valida la compra (Paso 1) y registra la solicitud de facturación (Paso 2).
 * No genera UUID del SAT ni realiza timbrado fiscal real.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */
const db = require('../config/db');
const InvoiceModel = require('../models/invoice.model.js');
const {
    REGIMENES_FISCALES,
    USOS_CFDI,
    folioVentaDe,
    validarEntradaPaso1,
    evaluarVenta,
    validarDatosFiscales
} = require('../utils/invoiceValidator.js');

/**
 * Devuelve los catálogos de las listas desplegables del Paso 2.
 *
 * @returns {{regimenesFiscales: Array, usosCfdi: Array}}
 */
const obtenerCatalogos = () => ({ regimenesFiscales: REGIMENES_FISCALES, usosCfdi: USOS_CFDI });

/**
 * PASO 1: valida que el folio de facturación, el folio de venta y la fecha correspondan a una
 * venta que se pueda facturar. Es de solo lectura: no modifica la venta.
 *
 * @async
 * @param {Object} cuerpo - Cuerpo con folioFacturacion, folioVenta y fechaCompra.
 * @returns {Promise<{ok: boolean, mensaje: string, venta?: Object}>}
 */
const validarVenta = async (cuerpo) => {
    const entrada = validarEntradaPaso1(cuerpo);
    if (!entrada.ok) return entrada;

    const venta = await InvoiceModel.buscarVentaPorFolioFacturacion(entrada.datos.folioFacturacion);
    const evaluacion = evaluarVenta(venta, entrada.datos);
    if (!evaluacion.ok) return evaluacion;

    return {
        ok: true,
        mensaje: 'Venta validada correctamente.',
        venta: {
            folioVenta: folioVentaDe(venta),
            fechaCompra: venta.fecha_dia,
            total: Number(venta.total)
        }
    };
};

/**
 * PASO 2: vuelve a validar la compra (el servidor no confía en el navegador), valida los datos
 * fiscales y registra la solicitud en una transacción. Marca la venta como 'solicitada'.
 *
 * @async
 * @param {Object} cuerpo - Datos del Paso 1 + datos fiscales + correo + aceptación del aviso.
 * @returns {Promise<{ok: boolean, mensaje: string, detalle?: string, folioFacturacion?: string, folioFactura?: string}>}
 */
const solicitarFactura = async (cuerpo = {}) => {
    const entrada = validarEntradaPaso1(cuerpo);
    if (!entrada.ok) return entrada;

    const fiscal = validarDatosFiscales(cuerpo);
    if (!fiscal.ok) return fiscal;

    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();

        // Se bloquea la fila de la venta para que dos solicitudes simultáneas no la facturen dos veces
        const venta = await InvoiceModel.buscarVentaPorFolioFacturacion(entrada.datos.folioFacturacion, conexion, true);
        const evaluacion = evaluarVenta(venta, entrada.datos);
        if (!evaluacion.ok) {
            await conexion.rollback();
            return evaluacion;
        }

        const facturaId = await InvoiceModel.crearFactura(conexion, venta.id, fiscal.datos);
        const folioFactura = `FAC-SIM-${new Date().getFullYear()}-${String(facturaId).padStart(6, '0')}`;
        await InvoiceModel.asignarFolioFactura(conexion, facturaId, folioFactura);

        if (!(await InvoiceModel.marcarVentaSolicitada(conexion, venta.id))) {
            await conexion.rollback();
            return { ok: false, mensaje: 'Esta venta ya fue facturada anteriormente.' };
        }

        await conexion.commit();
        return {
            ok: true,
            mensaje: 'Solicitud de facturación realizada correctamente.',
            detalle: 'Tu factura se verá reflejada en un periodo máximo de 24 horas.',
            folioFacturacion: entrada.datos.folioFacturacion,
            folioFactura
        };
    } catch (error) {
        await conexion.rollback();
        // venta_id es UNIQUE en facturas: si otra solicitud ganó la carrera, se informa igual que en el Paso 1
        if (error.code === 'ER_DUP_ENTRY') {
            return { ok: false, mensaje: 'Esta venta ya fue facturada anteriormente.' };
        }
        throw error;
    } finally {
        conexion.release();
    }
};

module.exports = {
    obtenerCatalogos,
    validarVenta,
    solicitarFactura
};