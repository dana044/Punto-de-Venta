/**
 * @file inventory.controller.js
 * @description Controlador para la gestión de productos y distribuidores en inventario.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

const { createProduct, getProducts, getProveedores, buscarProductos: buscarEnModelo } = require('../models/product.model.js');

/**
 * Procesa la solicitud para registrar un nuevo producto con distribuidores vinculados (HU-06 y HU-11).
 */
const registrarProducto = async (req, res) => {
  try {
    const newProduct = await createProduct(req.body);
    return res.status(201).json({
      mensaje: 'Producto registrado exitosamente.',
      producto: newProduct
    });
  } catch (error) {
    console.error('Error al registrar producto:', error);

    // Traducción de errores de MySQL a mensajes amigables para el usuario
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        mensaje: 'El código de barras ingresado ya está registrado en otro producto.' 
      });
    }
    
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ 
        mensaje: 'Uno de los textos ingresados excede el límite de caracteres permitidos por la base de datos.' 
      });
    }

    if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || error.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
      return res.status(400).json({ 
        mensaje: 'Se ingresó un tipo de dato incorrecto (ej. letras en un campo numérico o un precio negativo).' 
      });
    }

    // Mensaje de respaldo por si es un error de conexión u otro fallo no contemplado
    return res.status(500).json({ 
      mensaje: 'Error interno del servidor al procesar la solicitud.' 
    });
  }
};

/**
 * Consulta la lista general de productos registrados en el sistema.
 */
const getProducto = async (req, res) => {
  try {
    const lista = await getProducts();
    return res.status(200).json({
      total: lista.length,
      productos: lista
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return res.status(500).json({ mensaje: 'Error al obtener la lista de productos.' });
  }
};

/**
 * Consulta el catálogo de proveedores disponibles para su asociación (HU-11).
 */
const listarProveedores = async (req, res) => {
  try {
    const lista = await getProveedores();
    return res.status(200).json({
      total: lista.length,
      proveedores: lista
    });
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    return res.status(500).json({ mensaje: 'Error al obtener la lista de proveedores.' });
  }
};

/**
 * Procesa la solicitud de búsqueda de productos por término (HU-09).
 */
const buscarProductos = async (req, res) => {
  const termino = req.query.q;
  if (!termino) {
    return res.status(400).json({ mensaje: 'Término de búsqueda requerido' });
  }

  try {
    const resultados = await buscarEnModelo(termino);
    return res.status(200).json({ productos: resultados });
  } catch (error) {
    console.error('Error al buscar productos:', error);
    return res.status(500).json({ mensaje: 'Error interno al buscar productos' });
  }
};

module.exports = {
  registrarProducto,
  getProducto,
  listarProveedores,
  buscarProductos
};