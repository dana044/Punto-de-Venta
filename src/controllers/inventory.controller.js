/**
 * @file inventory.controller.js
 * @description Controlador HTTP para inventario y distribuidores vinculados (HU-06 y HU-11).
 */

const {
  createProduct,
  getProducts,
  getProveedores,
  buscarProductos
} = require('../models/product.model.js');

/**
 * Registra un producto y asocia distribuidores en la base de datos (HU-11).
 *
 * @async
 * @function registrarProducto
 * @param {import('express').Request} req - Petición con los datos del producto.
 * @param {import('express').Response} res - Respuesta HTTP.
 */
const registrarProducto = async (req, res) => {
  try {
    const productData = req.body;
    const nuevoProducto = await createProduct(productData);

    return res.status(201).json({
      mensaje: 'Producto registrado y distribuidores asociados exitosamente.',
      producto: nuevoProducto
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Ya existe un producto registrado con ese código de barras.'
      });
    }
    console.error('Error al registrar producto:', error);
    return res.status(500).json({
      mensaje: 'Error interno del servidor al registrar el producto.'
    });
  }
};

/**
 * Obtiene los productos con soporte para búsqueda opcional por querystring (?q=...) (HU-09).
 *
 * @async
 * @function getProducto
 * @param {import('express').Request} req - Petición con parámetro opcional req.query.q.
 * @param {import('express').Response} res - Respuesta con listado de productos.
 */
const getProducto = async (req, res) => {
  try {
    const { q } = req.query;
    const productos = q ? await buscarProductos(q) : await getProducts();

    return res.status(200).json({
      total: productos.length,
      productos
    });
  } catch (error) {
    console.error('Error al consultar productos:', error);
    return res.status(500).json({
      mensaje: 'Error al consultar el catálogo de productos.'
    });
  }
};

/**
 * Retorna todos los proveedores disponibles para el selector múltiple (HU-11).
 *
 * @async
 * @function listarProveedores
 * @param {import('express').Request} req - Petición HTTP.
 * @param {import('express').Response} res - Respuesta HTTP con array de distribuidores.
 */
const listarProveedores = async (req, res) => {
  try {
    const proveedores = await getProveedores();
    return res.status(200).json({
      total: proveedores.length,
      proveedores
    });
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    return res.status(500).json({
      mensaje: 'Error al obtener la lista de proveedores.'
    });
  }
};

module.exports = {
  registrarProducto,
  getProducto,
  listarProveedores
};