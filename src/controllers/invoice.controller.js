/**
 * @file invoice.controller.js
 * @description Controlador del módulo de facturación SIMULADA. Sus endpoints son públicos porque
 * los usa el cliente con el folio de su ticket; devuelven únicamente los datos mínimos de la venta.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */
const invoiceService = require('../services/invoice.service.js');

/**
 * Devuelve los catálogos de régimen fiscal y uso de CFDI para las listas desplegables.
 *
 * @function obtenerCatalogos
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const obtenerCatalogos = (req, res) => {
    return res.status(200).json(invoiceService.obtenerCatalogos());
};

/**
 * PASO 1: valida el folio de facturación, el folio de venta y la fecha de compra.
 *
 * @async
 * @function validarFolio
 * @param {import('express').Request} req - Cuerpo: folioFacturacion, folioVenta, fechaCompra.
 * @param {import('express').Response} res
 */
const validarFolio = async (req, res) => {
    try {
        const resultado = await invoiceService.validarVenta(req.body || {});
        return res.status(resultado.ok ? 200 : 400).json(resultado);
    } catch (error) {
        console.error('[Error Log - ERROR AL VALIDAR FOLIO DE FACTURACION]:', error.message);
        return res.status(500).json({ ok: false, mensaje: 'Error interno al validar la compra.' });
    }
};

/**
 * PASO 2: registra la solicitud de facturación con los datos fiscales capturados.
 *
 * @async
 * @function solicitarFactura
 * @param {import('express').Request} req - Cuerpo: datos del Paso 1 + datos fiscales + aceptaAviso.
 * @param {import('express').Response} res
 */
const solicitarFactura = async (req, res) => {
    try {
        const resultado = await invoiceService.solicitarFactura(req.body || {});
        return res.status(resultado.ok ? 201 : 400).json(resultado);
    } catch (error) {
        // No se registran los datos fiscales en consola: solo el mensaje del error
        console.error('[Error Log - ERROR AL SOLICITAR FACTURA]:', error.message);
        return res.status(500).json({ ok: false, mensaje: 'Error interno al registrar la solicitud de facturación.' });
    }
};

module.exports = {
    obtenerCatalogos,
    validarFolio,
    solicitarFactura
};