/**
 * @file inventory.controller.js
 * @description Controlador para la gestión de productos y distribuidores en inventario.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

const { createProduct, products, getProveedores } = require('../models/product.model.js');

/**
 * Procesa la solicitud para registrar un nuevo producto con distribuidores vinculados (HU-06 y HU-11).
 *
 * @function registrarProducto
 * @param {import('express').Request} req - Petición HTTP con los datos validados del producto.
 * @param {import('express').Response} res - Respuesta HTTP de Express.
 * @returns {Object} Respuesta JSON con código 201 y la entidad creada.
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
 *
 * @function getProducto
 * @param {import('express').Request} req - Petición HTTP de Express.
 * @param {import('express').Response} res - Respuesta HTTP con la colección de productos.
 * @returns {Object} Respuesta JSON con estado 200 y la lista de productos.
 */
const getProducto = (req, res) => {
  return res.status(200).json({
    total: products.length,
    productos: products
  });
};

/**
 * Consulta el catálogo de proveedores disponibles para su asociación (HU-11).
 *
 * @function listarProveedores
 * @param {import('express').Request} req - Petición HTTP de Express.
 * @param {import('express').Response} res - Respuesta HTTP con la lista de proveedores.
 * @returns {Object} Respuesta JSON con estado 200 y el arreglo de distribuidores.
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
  listarProveedores
};