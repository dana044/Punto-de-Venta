/**
 * @file inventory.controller.js
 * @description Controlador para la gestión de productos y distribuidores en inventario.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

const { 
  createProduct, 
  getProducts, 
  getProveedores, 
  buscarProductos: buscarEnModelo, 
  darDeBajaProducto,
  updateProduct,
  findById, 
  ajustarStock
} = require('../models/product.model.js');

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
    const productData = req.body;
    const nuevoProducto = await createProduct(productData);

    return res.status(201).json({
      mensaje: 'Producto registrado y distribuidores asociados exitosamente.',
      producto: nuevoProducto
    });
  } catch (error) {
    console.error('Error al registrar producto:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Ya existe un producto registrado con ese código de barras.'
      });
    }
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ 
        mensaje: 'Un texto ingresado excede el límite de caracteres permitidos.' 
      });
    }
    
    return res.status(500).json({
      mensaje: 'Error interno del servidor al registrar el producto en la base de datos.'
    });
  }
};

/**
 * Procesa la solicitud para editar un producto existente, incluyendo sus
 * datos generales, distribuidores asociados y fecha de caducidad.
 *
 * @async
 * @function actualizarProducto
 * @param {import('express').Request} req - Petición HTTP con el id en params y los datos validados en el body.
 * @param {import('express').Response} res - Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta JSON con el producto actualizado, 404 si no existe
 *   o 409 si el nuevo código de barras ya pertenece a otro producto.
 */
const actualizarProducto = async (req, res) => {
  const { id } = req.params;

  try {
    const productoExiste = await findById(id);
    if (!productoExiste) {
      return res.status(404).json({ mensaje: 'El producto no existe.' });
    }

    const productoActualizado = await updateProduct(id, req.body);

    return res.status(200).json({
      mensaje: 'Producto actualizado correctamente.',
      producto: productoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ese código de barras ya lo usa otro producto.' });
    }
    return res.status(500).json({ mensaje: 'Error interno al actualizar el producto.' });
  }
};

/**
 * Consulta la lista general de productos registrados en el sistema, soportando el filtrado por estado y búsquedas.
 *
 * @async
 * @function getProducto
 * @param {import('express').Request} req - Petición HTTP de Express (soporta inactivos y q).
 * @param {import('express').Response} res - Respuesta HTTP con la colección de productos.
 * @returns {Promise<Object>} Respuesta JSON con estado 200 y la lista de productos.
 */
const getProducto = async (req, res) => {
  try {
    const mostrarInactivos = req.query.inactivos === 'true';
    const { q } = req.query;
    
    const productos = q 
      ? await buscarEnModelo(q, mostrarInactivos) 
      : await getProducts(mostrarInactivos);

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

/**
 * Procesa la solicitud en un endpoint dedicado para buscar productos por coincidencias.
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

const registrarAjuste = async (req, res) => {
  const { id } = req.params;
  const { cantidad, tipoAjuste, motivo } = req.body;

  // Para el HU-50: Conectar este 'motivo' y 'tipoAjuste' a la tabla de auditoría cuando esté lista.
  //console.log(`[Ajuste de Inventario] ID: ${id} | Tipo: ${tipoAjuste} | Cantidad: ${cantidad} | Motivo: ${motivo}`);

  try {
    const productoActualizado = await ajustarStock(id, cantidad, tipoAjuste);
    return res.status(200).json({
      mensaje: `Ajuste por '${motivo}' registrado. Nuevo stock: ${productoActualizado.stock_almacen}`,
      producto: productoActualizado
    });
  } catch (error) {
    console.error('Error al ajustar stock:', error);
    if (error.message === 'Producto no encontrado') {
      return res.status(404).json({ mensaje: `No se encontró el producto con ID ${id}.` });
    }
    return res.status(500).json({ mensaje: 'Error interno al registrar el ajuste de inventario.' });
  }
};

module.exports = {
  registrarProducto,
  getProducto,
  listarProveedores,
  buscarProductos,
  bajaProducto,
  actualizarProducto,
  registrarAjuste
};