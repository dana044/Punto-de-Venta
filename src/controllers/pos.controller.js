/**
 * @file pos.controller.js
 * @description Controlador del punto de venta y reportes analíticos de ventas (HU-40).
 * @author Jetzaly Josmery Tello Campos 
 * @author Diego Rafael Jiménez Trujano (Integración asíncrona con MySQL)
 * @author Alfonso Mendoza Vásquez (Apertura de caja y Folios HU-25)
 * @author Stephanie Elizdeth Hernández Prieto (HU-40: Reporte Mensual de Ventas)
 */

const salesService = require('../services/sales.service.js');
const SaleModel = require('../models/sale.model.js');

/**
 * HU-25: Inicializa una transacción de venta devolviendo el folio oficial.
 */
const abrirVenta = async (req, res) => {
    try {
        // Simulamos la extración del JWT o recibimos del body
        const cajeroId = req.body.cajero_id || 1; 

        if (!cajeroId) {
            return res.status(400).json({ success: false, message: 'Se requiere el ID del cajero para abrir la venta.' });
        }

        const nuevaVenta = await SaleModel.createSale(cajeroId);

        return res.status(201).json({
            success: true,
            message: 'Venta abierta exitosamente.',
            data: nuevaVenta
        });
    } catch (error) {
        console.error('[Error Log - ERROR EN APERTURA DE VENTA]:', error);
        return res.status(500).json({ success: false, message: 'Error interno al generar el folio de venta.' });
    }
};

const calcularTotales = async (req, res) => {
  try {
    const { items } = req.body;
    const resultado = await salesService.calcularVenta(items);

    if (!resultado.ok) {
      return res.status(400).json({ mensaje: resultado.mensaje });
    }

    return res.status(200).json(resultado.resultado);
  } catch (error) {
    console.error("Error al calcular totales:", error);
    return res.status(500).json({ mensaje: "Error interno al calcular la venta." });
  }
};

/**
 * Recibe el carrito, el método de pago y procesa la transacción final (HU-30).
 */
const procesarCobro = async (req, res) => {
  try {
    const { items, metodoPago, montoRecibido, numAutorizacion } = req.body;
    
    // Si tu middleware de Auth ya pasa el usuario en req.user.id, úsalo.
    // De lo contrario, usaremos el ID 2 (Cajero 01) como fallback seguro para pruebas.
    const usuarioId = req.user?.id || 2; 

    const resultado = await salesService.registrarVenta(items, usuarioId, metodoPago, montoRecibido, numAutorizacion);

    if (!resultado.ok) {
      return res.status(400).json({ mensaje: resultado.mensaje });
    }

    return res.status(201).json(resultado.resultado);
  } catch (error) {
    console.error("Error al procesar cobro:", error);
    return res.status(500).json({ mensaje: "Error interno al procesar el pago." });
  }
};

/**
 * HU-40: Consulta el ranking mensual de artículos más vendidos agrupados por mes y año.
 * @async
 * @function obtenerReporteVentaMensual
 * @param {import('express').Request} req - Petición con query params ?anio=YYYY&mes=MM.
 * @param {import('express').Response} res
 */
const obtenerReporteVentaMensual = async (req, res) => {
  try {
    const { anio, mes } = req.query;

    if (!anio || !mes) {
      return res.status(400).json({
        mensaje: 'Debes proporcionar los parámetros "anio" y "mes" para generar el reporte.'
      });
    }

    const ranking = await SaleModel.getRankingMensual(anio, mes);

    return res.status(200).json({
      total: ranking.length,
      ranking
    });
  } catch (error) {
    console.error('[Error Log - ERROR REPORTE MENSUAL HU-40]:', error);
    return res.status(500).json({ mensaje: 'Error interno al consultar las ventas mensuales.' });
  }
};

/**
 * Catálogo del POS: devuelve las categorías con productos activos para la cuadrícula inicial.
 * @async
 * @function listarCategoriasCatalogo
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const listarCategoriasCatalogo = async (req, res) => {
  try {
    const categorias = await SaleModel.getCategoriasCatalogo();
    return res.status(200).json({ categorias });
  } catch (error) {
    console.error('[Error Log - ERROR CATALOGO POS CATEGORIAS]:', error);
    return res.status(500).json({ mensaje: 'Error interno al consultar las categorías.' });
  }
};

/**
 * Catálogo del POS: devuelve productos filtrados por categoría (?categoria=) o por texto (?q=).
 * @async
 * @function listarProductosCatalogo
 * @param {import('express').Request} req - Petición con query params opcionales categoria y q.
 * @param {import('express').Response} res
 */
const listarProductosCatalogo = async (req, res) => {
  try {
    const categoria = (req.query.categoria || '').trim();
    const termino = (req.query.q || '').trim();

    const productos = await SaleModel.getProductosCatalogo(categoria, termino);
    return res.status(200).json({ productos });
  } catch (error) {
    console.error('[Error Log - ERROR CATALOGO POS PRODUCTOS]:', error);
    return res.status(500).json({ mensaje: 'Error interno al consultar los productos.' });
  }
};

module.exports = {
  abrirVenta,
  calcularTotales,
  procesarCobro,
  obtenerReporteVentaMensual,
  listarCategoriasCatalogo,
  listarProductosCatalogo
};