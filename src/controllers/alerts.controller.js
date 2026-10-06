/**
 * @file alerts.controller.js
 * @description Controlador de las alertas automáticas de stock bajo (umbral fijo).
 * @author Jetzaly Josmery Tello Campos
 */

const alertsModel = require('../models/alerts.model.js');

/**
 * Devuelve la lista de alertas activas (productos por debajo del umbral
 * mínimo fijo, en almacén y/o mostrador).
 */
const listarAlertas = async (req, res) => {
  try {
    const alertas = await alertsModel.getAlertas();
    return res.status(200).json({ total: alertas.length, alertas });
  } catch (error) {
    console.error('Error al listar alertas de stock bajo:', error);
    return res.status(500).json({ mensaje: 'Error interno al obtener las alertas.' });
  }
};

/**
 * Devuelve la lista de alertas de caducidad activas (productos con lotes
 * vencidos o próximos a vencer dentro del umbral fijo).
 */
const listarAlertasCaducidad = async (req, res) => {
  try {
    const alertas = await alertsModel.getAlertasCaducidad();
    return res.status(200).json({ total: alertas.length, alertas });
  } catch (error) {
    console.error('Error al listar alertas de caducidad:', error);
    return res.status(500).json({ mensaje: 'Error interno al obtener las alertas de caducidad.' });
  }
};
 
module.exports = {
  listarAlertas,
  listarAlertasCaducidad
};
