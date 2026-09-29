/**
 * @file inventory.controller.js
 * @description Controlador para la gestión de productos y distribuidores en inventario.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

const { createProduct, products, getProveedores, findProductForPOS } = require('../models/product.model.js');

/**
 * Busca un producto por código de barras o nombre para agregarlo a la venta (HU-26 y HU-49).
 *
 * @function buscarProductoPOS
 * @param {import('express').Request} req - Petición HTTP que incluye el query 'q'.
 * @param {import('express').Response} res - Respuesta HTTP.
 */
const buscarProductoPOS = async (req, res) => {
  try {
    const termino = req.query.q;
    
    if (!termino) {
      return res.status(400).json({ mensaje: 'Ingresa un término de búsqueda válido.' });
    }

    const producto = await findProductForPOS(termino);

    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado o inactivo.' });
    }

    return res.status(200).json({ producto });
  } catch (error) {
    console.error('Error en buscarProductoPOS:', error);
    return res.status(500).json({ mensaje: 'Error interno al buscar el producto.' });
  }
};

/**
 * Procesa la solicitud para registrar un nuevo producto con distribuidores vinculados (HU-06 y HU-11).
 */
const registrarProducto = (req, res) => {
  const productData = req.body;
  const newProduct = createProduct(productData);

  return res.status(201).json({
    mensaje: 'Producto registrado y distribuidores asociados exitosamente.',
    producto: newProduct
  });
};

/**
 * Consulta la lista general de productos registrados en el sistema.
 */
const getProducto = (req, res) => {
  return res.status(200).json({
    total: products.length,
    productos: products
  });
};

/**
 * Consulta el catálogo de proveedores disponibles para su asociación (HU-11).
 */
const listarProveedores = (req, res) => {
  const lista = getProveedores();
  return res.status(200).json({
    total: lista.length,
    proveedores: lista
  });
};

module.exports = {
  registrarProducto,
  getProducto,
  listarProveedores,
  buscarProductoPOS
};