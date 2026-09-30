/**
 * @file inventory.controller.js
 * @description Controlador para la gestión de productos y distribuidores en inventario.
 */

const { 
  createProduct, 
  getProducts, 
  getProveedores, 
  buscarProductos: buscarEnModelo, 
  darDeBajaProducto,
  updateProduct,
  findById, 
  ajustarStock,
  findProductForPOS
} = require('../models/product.model.js');

/**
 * Busca un producto por código de barras o nombre para agregarlo a la venta (HU-26 y HU-49).
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
 * Texto en participio de cada acción permitida en la baja/alta de productos.
 * @constant {Object<string, string>}
 */
const PARTICIPIOS_BAJA = { desactivar: 'desactivado', activar: 'reactivado', eliminar: 'eliminado' };

const bajaProducto = async (req, res) => {
  const { id } = req.params;
  const { accion } = req.body; 

  if (!id || !accion) {
    return res.status(400).json({ mensaje: 'Faltan parámetros para procesar la baja del producto.' });
  }

  if (!PARTICIPIOS_BAJA[accion]) {
    return res.status(400).json({ mensaje: 'Acción no válida. Usa desactivar, activar o eliminar.' });
  }

  try {
    await darDeBajaProducto(id, accion);
    return res.status(200).json({ mensaje: `Producto ${PARTICIPIOS_BAJA[accion]} exitosamente de la base de datos.` });
  } catch (error) {
    console.error('Error procesando la baja del producto:', error);
    return res.status(500).json({ mensaje: 'Error interno al intentar dar de baja el producto.' });
  }
};

const registrarAjuste = async (req, res) => {
  const { id } = req.params;
  const { cantidad, tipoAjuste, motivo } = req.body;

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
  buscarProductoPOS,
  buscarProductos,
  bajaProducto,
  actualizarProducto,
  registrarAjuste
};