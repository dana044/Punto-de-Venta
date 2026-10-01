/**
 * @file lotes.controller.js
 * @description Controlador para gestionar operaciones sobre los lotes de almacén.
 * @author Dana Carmona
 */

const loteModel = require('../models/lote.model.js');

/**
 * Registra un nuevo lote desde el cliente (Recepción o captura manual).
 * @async
 * @function registrarLote
 */
const registrarLote = async (req, res) => {
  try {
    const { id } = req.params; // ID del producto
    const { cantidad, fechaCaducidad } = req.body;

    if (cantidad < 0) {
      return res.status(400).json({ mensaje: 'La cantidad debe ser positiva.' });
    }
    
    await loteModel.crearLote({ productoId: id, cantidad, fechaCaducidad });
    return res.status(201).json({ mensaje: 'Lote registrado exitosamente en el almacén.' });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al registrar el lote.', error });
  }
};

/**
 * Devuelve todos los lotes asociados a un producto específico.
 * @async
 * @function listarLotesDeProducto
 */
const listarLotesDeProducto = async (req, res) => {
  try {
    const lotes = await loteModel.getLotesPorProducto(req.params.id);
    return res.status(200).json({ lotes });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al obtener lotes del producto.' });
  }
};

const actualizarLote = async (req, res) => {
  try {
    const { id } = req.params;
    await loteModel.actualizarLote(id, req.body);
    res.status(200).json({ mensaje: 'Lote actualizado correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar lote.' });
  }
};

const eliminarLote = async (req, res) => {
  try {
    const { id } = req.params;
    await loteModel.eliminarLote(id);
    res.status(200).json({ mensaje: 'Lote eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar lote.' });
  }
};

module.exports = { registrarLote, listarLotesDeProducto, actualizarLote, eliminarLote };