/**
 * @file inventory.controller.js
 * @description Controlador para la gestión de productos y distribuidores en inventario.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

const { createProduct, getProducts, getProveedores, buscarProductos: buscarEnModelo, darDeBajaProducto } = require('../models/product.model.js');

/**
 * Procesa la solicitud para registrar un nuevo producto con distribuidores vinculados.
 *
 * @async
 * @function registrarProducto
 * @param {import('express').Request} req - Petición HTTP con los datos validados del producto.
 * @param {import('express').Response} res - Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta JSON con código 201 y la entidad creada.
 */
const registrarProducto = async (req, res) => {
  try {
    const newProduct = await createProduct(req.body);
    return res.status(201).json({
      mensaje: 'Producto registrado y distribuidores asociados exitosamente.',
      producto: newProduct
    });
  } catch (error) {
    console.error('Error al registrar producto:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ mensaje: 'El código de barras ya está registrado en otro producto.' });
    }
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ mensaje: 'Un texto ingresado excede el límite de caracteres.' });
    }
    return res.status(500).json({ mensaje: 'Error al registrar el producto en la base de datos.' });
  }
};

/**
 * Consulta la lista general de productos registrados y activos en el sistema.
 *
 * @async
 * @function getProducto
 * @param {import('express').Request} req - Petición HTTP de Express.
 * @param {import('express').Response} res - Respuesta HTTP con la colección de productos.
 * @returns {Promise<Object>} Respuesta JSON con estado 200 y la lista de productos.
 */
const getProducto = async (req, res) => {
  const mostrarInactivos = req.query.inactivos === 'true';
  try {
    const lista = await getProducts(mostrarInactivos);
    return res.status(200).json({ total: lista.length, productos: lista });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return res.status(500).json({ mensaje: 'Error al obtener la lista de productos.' });
  }
};

/**
 * Consulta el catálogo de proveedores disponibles para su asociación.
 *
 * @async
 * @function listarProveedores
 * @param {import('express').Request} req - Petición HTTP de Express.
 * @param {import('express').Response} res - Respuesta HTTP con la lista de proveedores.
 * @returns {Promise<Object>} Respuesta JSON con estado 200 y el arreglo de distribuidores.
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
 * Procesa la solicitud para buscar productos activos por coincidencias.
 *
 * @async
 * @function buscarProductos
 * @param {import('express').Request} req - Petición HTTP con el parámetro de búsqueda `q`.
 * @param {import('express').Response} res - Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta JSON con estado 200 y la lista de coincidencias.
 */
const buscarProductos = async (req, res) => {
  const termino = req.query.q;
  const mostrarInactivos = req.query.inactivos === 'true';
  
  if (!termino) {
    return res.status(400).json({ mensaje: 'Término de búsqueda requerido' });
  }

  try {
    const resultados = await buscarEnModelo(termino, mostrarInactivos);
    return res.status(200).json({ productos: resultados });
  } catch (error) {
    console.error('Error al buscar productos:', error);
    return res.status(500).json({ mensaje: 'Error interno al buscar productos' });
  }
};

/**
 * Procesa la solicitud para dar de baja un producto, permitiendo su eliminación o desactivación.
 * Una vez confirmada la operación, el producto quedará marcado como inactivo o será borrado definitivamente.
 *
 * @async
 * @function bajaProducto
 * @param {import('express').Request} req - Petición HTTP. Debe contener `req.params.id` y `req.body.accion`.
 * @param {import('express').Response} res - Respuesta HTTP indicando el éxito o el detalle del error.
 * @returns {Promise<Object>} Respuesta JSON con estado 200 si la baja fue exitosa.
 */
const bajaProducto = async (req, res) => {
  const { id } = req.params;
  const { accion } = req.body; 

  if (!id || !accion) {
    return res.status(400).json({ mensaje: 'Faltan parámetros para procesar la baja del producto.' });
  }

  try {
    await darDeBajaProducto(id, accion);
    return res.status(200).json({ mensaje: `Producto ${accion}do exitosamente de la base de datos.` });
  } catch (error) {
    console.error('Error procesando la baja del producto:', error);
    return res.status(500).json({ mensaje: 'Error interno al intentar dar de baja el producto.' });
  }
};

module.exports = {
  registrarProducto,
  getProducto,
  listarProveedores,
  buscarProductos,
  bajaProducto
};