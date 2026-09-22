/**
 * Punto de Venta UV - Controlador para el inventario.
 * Se encarcga de a gestión de la lógica de negocio para los productos.
 */
const { createProduct, products} = require('../models/product.model.js');

/**
 * Crea un nuevo producto en el sistema (HU-06).
 * @param {Object} req - Petición de Express con los datos validados del producto.
 * @param {Object} res - Respuesta de Express.
 * @returns {Object} Respuesta JSON con estado 201 y los datos del producto registrado.
 */
const registrarProducto = (req, res) => {
  const productData = req.body;
  
  const newProduct = createProduct(productData);

  return res.status(201).json({
    mensaje: 'Producto registrado exitosamente.',
    producto: newProduct
  });
};

/**
 * Consulta todos los productos registrados en memoria.
 * @param {Object} req - Petición de Express.
 * @param {Object} res - Respuesta de Express.
 * @returns {Object} Respuesta JSON con la lista de productos.
 */
const getProducto = (req, res) => {
  return res.status(200).json({
    total: products.length,
    productos: products
  });
};

module.exports = {
  registrarProducto,
  getProducto
};