/**
 * @file pos.controller.js
 * @description Controlador del punto de venta, reportes analíticos de ventas (HU-40) e historial de ventas.
 */

const salesService = require('../services/sales.service.js');
const SaleModel = require('../models/sale.model.js');
const { getAllUsers } = require('../models/user.model.js');

const abrirVenta = async (req, res) => {
    try {
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

const listarCategoriasCatalogo = async (req, res) => {
  try {
    const categorias = await SaleModel.getCategoriasCatalogo();
    return res.status(200).json({ categorias });
  } catch (error) {
    console.error('[Error Log - ERROR CATALOGO POS CATEGORIAS]:', error);
    return res.status(500).json({ mensaje: 'Error interno al consultar las categorías.' });
  }
};

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

const leerPeriodoReporte = (req) => {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);

  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return null;
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return null;
  return { anio, mes };
};

const esFechaValida = (fecha) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return false;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaJs = new Date(Date.UTC(anio, mes - 1, dia));
  return fechaJs.getUTCFullYear() === anio
    && fechaJs.getUTCMonth() === mes - 1
    && fechaJs.getUTCDate() === dia;
};

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
 * Reporte de compras por distribuidor y rango de fechas.
 */
const obtenerReporteCompras = async (req, res) => {
  try {
    const { inicio, fin } = req.query;
    if (!esFechaValida(inicio) || !esFechaValida(fin)) {
      return res.status(400).json({ mensaje: 'Rango de fechas inválido (AAAA-MM-DD).' });
    }

    const compras = await SaleModel.getReporteCompras(inicio, fin);
    return res.status(200).json({ compras });
  } catch (error) {
    console.error('[Error Log - ERROR REPORTE COMPRAS DISTRIBUIDOR]:', error);
    return res.status(500).json({ mensaje: 'Error al consultar las compras por distribuidor.' });
  }
};

/**
 * Consulta el historial de ventas con filtros de empleado y día.
 */
const consultarHistorialVentas = async (req, res) => {
  try {
    const rol = (req.headers['x-user-role'] || '').toLowerCase();
    const usuarioSesionId = req.headers['x-user-id'];

    const filtros = {};

    // Si es cajero, solo se le permite consultar su propio historial
    if (rol === 'cajero') {
      filtros.usuarioId = usuarioSesionId;
    } else if (req.query.usuarioId) {
      filtros.usuarioId = req.query.usuarioId;
    }

    if (req.query.fecha) filtros.fecha = req.query.fecha;
    if (req.query.estado) filtros.estado = req.query.estado;

    const historial = await SaleModel.getHistorialVentas(filtros);
    return res.status(200).json({ historial });
  } catch (error) {
    console.error('[Error Log - ERROR HISTORIAL VENTAS]:', error);
    return res.status(500).json({ mensaje: 'Error al consultar el historial de ventas.' });
  }
};

/**
 * Solicitar cancelación de venta (por cajero o empleado).
 */
const pedirCancelacionVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ mensaje: 'Debes indicar el motivo de la cancelación.' });
    }

    const ok = await SaleModel.solicitarCancelacion(id, motivo);
    if (!ok) {
      return res.status(400).json({ mensaje: 'No se pudo solicitar la cancelación. Verifica que la venta no esté ya cancelada.' });
    }

    return res.status(200).json({ mensaje: 'Solicitud enviada para aprobación del administrador.' });
  } catch (error) {
    console.error('[Error Log - ERROR SOLICITAR CANCELACION]:', error);
    return res.status(500).json({ mensaje: 'Error al solicitar la cancelación de la venta.' });
  }
};

/**
 * Autorizar cancelación de venta (solo administrador).
 */
/**
 * Autorizar cancelación de venta verificando la contraseña del administrador.
 */
const aprobarCancelacionVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { contrasena, motivo } = req.body;

    if (!contrasena) {
      return res.status(400).json({ mensaje: 'Se requiere la contraseña del administrador para autorizar la cancelación.' });
    }

    // 1. Validar la contraseña contra los administradores registrados
    const usuarios = await getAllUsers();
    const administrador = usuarios.find(
      (u) => (u.role === 'administrador' || u.rol === 'administrador') && u.activo && u.password === contrasena
    );

    if (!administrador) {
      return res.status(401).json({ mensaje: 'Contraseña de administrador incorrecta. Cancelación rechazada.' });
    }

    // 2. Ejecutar la cancelación y reincorporación de existencias en MySQL
    const ok = await SaleModel.autorizarCancelacion(id, administrador.id);
    if (!ok) {
      return res.status(400).json({ mensaje: 'No se pudo cancelar la venta. Verifica que no haya sido cancelada previamente.' });
    }

    return res.status(200).json({ 
      mensaje: `Venta cancelada exitosamente por ${administrador.nombreCompleto}. La mercancía regresó al stock.` 
    });
  } catch (error) {
    console.error('[Error Log - ERROR APROBAR CANCELACION]:', error);
    return res.status(500).json({ mensaje: 'Error interno al autorizar la cancelación de la venta.' });
  }
};

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
  obtenerReporteCompras,
  consultarHistorialVentas,
  pedirCancelacionVenta,
  aprobarCancelacionVenta,
  autorizarEliminacion,
  listarCategoriasCatalogo,
  listarProductosCatalogo
};