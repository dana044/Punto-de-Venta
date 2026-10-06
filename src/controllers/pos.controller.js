/**
 * @file pos.controller.js
 * @description Controlador del punto de venta y reportes analíticos de ventas (HU-40).
 * @author Jetzaly Josmery Tello Campos 
 * @author Diego Rafael Jiménez Trujano (Integración asíncrona con MySQL)
 * @author Alfonso Mendoza Vásquez (Apertura de caja y Folios HU-25)
 * @author Stephanie Elizdeth Hernández Prieto (HU-40: Reporte Mensual de Ventas)
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

const salesService = require('../services/sales.service.js');
const SaleModel = require('../models/sale.model.js');
const { getAllUsers } = require('../models/user.model.js');

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

/**
 * Devuelve el folio que tendrá la próxima venta sin crear ninguna venta en la base de datos.
 * Es solo informativo: el folio definitivo se asigna al cobrar.
 *
 * @async
 * @function obtenerSiguienteFolio
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const obtenerSiguienteFolio = async (req, res) => {
  try {
    const data = await SaleModel.getSiguienteFolio();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Error Log - ERROR AL CONSULTAR SIGUIENTE FOLIO]:', error);
    return res.status(500).json({ success: false, message: 'Error interno al consultar el siguiente folio.' });
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

    const usuarioId = Number(req.body.usuarioId);

    if (!usuarioId) {
      return res.status(400).json({ mensaje: 'Se requiere el usuario en sesión para cobrar. Vuelve a iniciar sesión.' });
    }

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

/**
 * Valida y normaliza los parámetros ?anio= y ?mes= de los reportes de ventas.
 * @param {import('express').Request} req
 * @returns {{anio: number, mes: number}|null} Los valores numéricos o null si no son válidos.
 */
const leerPeriodoReporte = (req) => {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);

  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return null;
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return null;
  return { anio, mes };
};

/**
 * Valida el parámetro ?fecha= (AAAA-MM-DD) y confirma que sea un día real del calendario.
 * @param {string} fecha
 * @returns {boolean}
 */
const esFechaValida = (fecha) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return false;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaJs = new Date(Date.UTC(anio, mes - 1, dia));
  return fechaJs.getUTCFullYear() === anio
    && fechaJs.getUTCMonth() === mes - 1
    && fechaJs.getUTCDate() === dia;
};

/**
 * Reporte de ventas de un día específico: cantidad de ventas e importe total de ese día.
 * @async
 * @function obtenerReporteDiario
 * @param {import('express').Request} req - Petición con query param ?fecha=AAAA-MM-DD.
 * @param {import('express').Response} res
 */
const obtenerReporteDiario = async (req, res) => {
  try {
    const fecha = req.query.fecha;
    if (!esFechaValida(fecha)) {
      return res.status(400).json({
        mensaje: 'Debes proporcionar una "fecha" válida (AAAA-MM-DD) para generar el reporte.'
      });
    }

    const ventas = await SaleModel.getReporteDiario(fecha);

    return res.status(200).json({
      fecha,
      total: ventas.length,
      ventas
    });
  } catch (error) {
    console.error('[Error Log - ERROR REPORTE DIARIO DE VENTAS]:', error);
    return res.status(500).json({ mensaje: 'Error interno al consultar las ventas del día.' });
  }
};

/**
 * Reporte de productos por presentación: rendimiento de cada formato de empaque.
 * @async
 * @function obtenerReportePresentacion
 * @param {import('express').Request} req - Petición con query params ?anio=YYYY&mes=MM.
 * @param {import('express').Response} res
 */
const obtenerReportePresentacion = async (req, res) => {
  try {
    const periodo = leerPeriodoReporte(req);
    if (!periodo) {
      return res.status(400).json({
        mensaje: 'Debes proporcionar un "anio" y un "mes" válidos para generar el reporte.'
      });
    }

    const presentaciones = await SaleModel.getReportePresentacion(periodo.anio, periodo.mes);

    return res.status(200).json({
      total: presentaciones.length,
      presentaciones
    });
  } catch (error) {
    console.error('[Error Log - ERROR REPORTE POR PRESENTACION]:', error);
    return res.status(500).json({ mensaje: 'Error interno al consultar las ventas por presentación.' });
  }
};

/**
 * Autoriza la eliminación de productos del carrito: exige la contraseña de un administrador activo.
 * Solo valida la contraseña; el carrito vive en el navegador, por eso no modifica nada en la base de datos.
 * @async
 * @function autorizarEliminacion
 * @param {import('express').Request} req - Petición con { contrasena } en el cuerpo.
 * @param {import('express').Response} res - 200 con el nombre del administrador, 400 o 401.
 */
const autorizarEliminacion = async (req, res) => {
  try {
    const { contrasena } = req.body;

    if (!contrasena) {
      return res.status(400).json({ mensaje: 'Ingresa la contraseña del administrador.' });
    }

    const usuarios = await getAllUsers();
    const administrador = usuarios.find(
      (u) => u.role === 'administrador' && u.activo && u.password === contrasena
    );

    if (!administrador) {
      return res.status(401).json({ mensaje: 'Contraseña de administrador incorrecta.' });
    }

    return res.status(200).json({
      autorizado: true,
      administrador: administrador.nombreCompleto
    });
  } catch (error) {
    console.error('[Error Log - ERROR AUTORIZACION DE ELIMINACION]:', error);
    return res.status(500).json({ mensaje: 'Error interno al validar la autorización.' });
  }
};

module.exports = {
  abrirVenta,
  obtenerSiguienteFolio,
  calcularTotales,
  procesarCobro,
  obtenerReporteVentaMensual,
  obtenerReporteDiario,
  obtenerReportePresentacion,
  autorizarEliminacion,
  listarCategoriasCatalogo,
  listarProductosCatalogo
};