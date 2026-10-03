/**
 * @file inventory.controller.js
 * @description Controlador para la gestión de productos y distribuidores en inventario.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
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
  findProductForPOS,
  getLowStock,
  getLotesByProducto,
  agregarLote,
  eliminarLote
} = require('../models/product.model.js');

/**
 * Busca un producto por código de barras o nombre para agregarlo a la venta (HU-26 y HU-49).
 *
 * @async
 * @function buscarProductoPOS
 * @param {Object} req - Petición HTTP con el término en req.query.q.
 * @param {Object} res - Respuesta HTTP con el producto o un mensaje de error (400, 404 o 500).
 * @returns {Promise<Object>} Respuesta JSON con el producto encontrado.
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
 * Registra un producto de catálogo y asocia sus distribuidores (HU de registro de productos).
 * El producto nace con stock en 0: las existencias se ingresan después como lotes desde el modal de Stock.
 *
 * @async
 * @function registrarProducto
 * @param {Object} req - Petición HTTP con los datos del producto en req.body.
 * @param {Object} res - Respuesta HTTP: 201 con el producto, 400 (texto muy largo), 409 (código duplicado) o 500.
 * @returns {Promise<Object>} Respuesta JSON con el producto registrado.
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
 * Actualiza los datos de catálogo de un producto (el stock se gestiona con lotes y ajustes).
 *
 * @async
 * @function actualizarProducto
 * @param {Object} req - Petición HTTP con el id en req.params y los datos en req.body.
 * @param {Object} res - Respuesta HTTP: 200 con el producto, 404, 409 (código duplicado) o 500.
 * @returns {Promise<Object>} Respuesta JSON con el producto actualizado.
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
 * Consulta el catálogo de productos, general o filtrado por el término q.
 *
 * @async
 * @function getProducto
 * @param {Object} req - Petición HTTP con q e inactivos opcionales en req.query.
 * @param {Object} res - Respuesta HTTP con total y lista de productos.
 * @returns {Promise<Object>} Respuesta JSON con los productos.
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
 * Lista los distribuidores disponibles para asociarlos a un producto.
 *
 * @async
 * @function listarProveedores
 * @param {Object} req - Petición HTTP.
 * @param {Object} res - Respuesta HTTP con total y lista de proveedores.
 * @returns {Promise<Object>} Respuesta JSON con los proveedores.
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
 * Busca productos por nombre, código de barras o categoría (búsqueda general).
 *
 * @async
 * @function buscarProductos
 * @param {Object} req - Petición HTTP con q e inactivos en req.query.
 * @param {Object} res - Respuesta HTTP con los productos (400 si falta q, 500 si hay error).
 * @returns {Promise<Object>} Respuesta JSON con los resultados.
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
 * Texto en participio de cada acción permitida en la baja/alta de productos.
 * @constant {Object<string, string>}
 */
const PARTICIPIOS_BAJA = { desactivar: 'desactivado', activar: 'reactivado', archivar: 'archivado' };

/**
 * Desactiva, reactiva o archiva un producto según la acción recibida en el cuerpo.
 *
 * @async
 * @function bajaProducto
 * @param {Object} req - Petición HTTP con el id en req.params y la acción en req.body.accion.
 * @param {Object} res - Respuesta HTTP: 200 con el mensaje, 400 (parámetros o acción inválidos) o 500.
 * @returns {Promise<Object>} Respuesta JSON con el resultado.
 */
const bajaProducto = async (req, res) => {
  const { id } = req.params;
  const { accion } = req.body; 

  if (!id || !accion) {
    return res.status(400).json({ mensaje: 'Faltan parámetros para procesar la baja del producto.' });
  }

  if (!PARTICIPIOS_BAJA[accion]) {
    return res.status(400).json({ mensaje: 'Acción no válida. Usa desactivar, activar o archivar.' });
  }

  try {
    await darDeBajaProducto(id, accion);
    return res.status(200).json({ mensaje: `Producto ${PARTICIPIOS_BAJA[accion]} exitosamente de la base de datos.` });
  } catch (error) {
    console.error('Error procesando la baja del producto:', error);
    return res.status(500).json({ mensaje: 'Error interno al intentar dar de baja el producto.' });
  }
};

/**
 * Acciones permitidas en el modal de Stock (pestaña Mover / Ajustar).
 * @constant {string[]}
 */
const TIPOS_AJUSTE = ['mover_mostrador', 'regresar_almacen', 'merma', 'daño', 'conteo_mostrador'];

/**
 * Obtiene los lotes de almacén de un producto (orden FEFO).
 *
 * @async
 * @function obtenerLotes
 * @param {Object} req - Petición HTTP con el id del producto en req.params.id.
 * @param {Object} res - Respuesta HTTP con la lista de lotes o un error 500.
 * @returns {Promise<Object>} Respuesta JSON con los lotes.
 */
const obtenerLotes = async (req, res) => {
  try {
    const lotes = await getLotesByProducto(req.params.id);
    return res.status(200).json({ lotes });
  } catch (error) {
    console.error('Error al obtener lotes:', error);
    return res.status(500).json({ mensaje: 'Error interno al obtener los lotes.' });
  }
};

/**
 * Agrega un lote al almacén; el stock de almacén se actualiza automáticamente.
 *
 * @async
 * @function crearLote
 * @param {Object} req - Petición HTTP con el id en req.params y cantidad y fecha_caducidad en req.body.
 * @param {Object} res - Respuesta HTTP: 201 con el nuevo stock de almacén, 400, 404 o 500.
 * @returns {Promise<Object>} Respuesta JSON con el resultado.
 */
const crearLote = async (req, res) => {
  const { cantidad, fecha_caducidad } = req.body;

  if (!Number.isInteger(Number(cantidad)) || Number(cantidad) < 1) {
    return res.status(400).json({ mensaje: 'Ingresa una cantidad válida (entero mayor o igual a 1).' });
  }

  try {
    const nuevoTotal = await agregarLote(req.params.id, Number(cantidad), fecha_caducidad || null, 1); // asumiendo usuarioId = 1
    return res.status(201).json({ mensaje: 'Lote agregado.', stock_almacen: nuevoTotal });
  } catch (error) {
    console.error('Error al agregar lote:', error);
    if (error.message === 'Producto no encontrado') {
      return res.status(404).json({ mensaje: `No se encontró el producto con ID ${req.params.id}.` });
    }
    return res.status(500).json({ mensaje: 'Error interno al agregar el lote.' });
  }
};

/**
 * Confirma un lote que estaba en estado pendiente, asignándole su caducidad definitiva 
 * y sumando sus existencias al almacén.
 *
 * @async
 * @function confirmarLotePendiente
 * @param {Object} req - Petición HTTP con id (producto) e idLote en req.params y caducidad en req.body.
 * @param {Object} res - Respuesta HTTP: 200 con el nuevo stock, 400, 404 o 500.
 * @returns {Promise<Object>} Respuesta JSON con el resultado.
 */
const confirmarLotePendiente = async (req, res) => {
  const { id, idLote } = req.params;
  const { fecha_caducidad } = req.body;

  try {
    const { confirmarLoteBD } = require('../models/product.model.js');
    const nuevoTotal = await confirmarLoteBD(idLote, id, fecha_caducidad, 1); // asumiendo usuarioId = 1
    
    return res.status(200).json({ mensaje: 'Lote registrado y movido al almacén.', stock_almacen: nuevoTotal });
  } catch (error) {
    console.error('Error al confirmar lote:', error);
    return res.status(500).json({ mensaje: 'Error interno al registrar el lote.' });
  }
};

/**
 * Elimina un lote del almacén; el stock de almacén se reduce automáticamente.
 *
 * @async
 * @function borrarLote
 * @param {Object} req - Petición HTTP con id (producto) e idLote en req.params.
 * @param {Object} res - Respuesta HTTP: 200 con el nuevo stock de almacén, 404 o 500.
 * @returns {Promise<Object>} Respuesta JSON con el resultado.
 */
const borrarLote = async (req, res) => {
  try {
    const nuevoTotal = await eliminarLote(req.params.idLote, req.params.id, 1); // asumiendo usuarioId = 1
    return res.status(200).json({ mensaje: 'Lote eliminado.', stock_almacen: nuevoTotal });
  } catch (error) {
    console.error('Error al eliminar lote:', error);
    if (error.message === 'Lote no encontrado') {
      return res.status(404).json({ mensaje: 'El lote no existe para este producto.' });
    }
    return res.status(500).json({ mensaje: 'Error interno al eliminar el lote.' });
  }
};

/**
 * Registra un ajuste manual de stock (mover, regresar, merma, daño o conteo de mostrador) (HU-17).
 *
 * @async
 * @function registrarAjuste
 * @param {Object} req - Petición HTTP con el id en req.params y cantidad, tipoAjuste, motivo y caducidad en req.body.
 * @param {Object} res - Respuesta HTTP: 200 con las existencias resultantes, 400, 404 o 500.
 * @returns {Promise<Object>} Respuesta JSON con el producto actualizado.
 */
const registrarAjuste = async (req, res) => {
  const { id } = req.params;
  const { cantidad, tipoAjuste, motivo, caducidad } = req.body;

  const cantNum = Number(cantidad);
  const minimo = tipoAjuste === 'conteo_mostrador' ? 0 : 1;

  if (!TIPOS_AJUSTE.includes(tipoAjuste)) {
    return res.status(400).json({ mensaje: 'Tipo de ajuste no válido.' });
  }
  if (!Number.isInteger(cantNum) || cantNum < minimo) {
    return res.status(400).json({ mensaje: `Ingresa una cantidad válida (entero mayor o igual a ${minimo}).` });
  }
  if (!motivo || !String(motivo).trim()) {
    return res.status(400).json({ mensaje: 'El motivo es obligatorio para el reporte de movimientos.' });
  }

  try {
    const productoActualizado = await ajustarStock(id, cantNum, tipoAjuste, String(motivo).trim(), 1, caducidad || null); // asumiendo usuarioId = 1
    return res.status(200).json({
      mensaje: `Ajuste por '${motivo}' registrado. Almacén: ${productoActualizado.stock_almacen} | Mostrador: ${productoActualizado.stock_mostrador}`,
      producto: productoActualizado
    });
  } catch (error) {
    console.error('Error al ajustar stock:', error);
    if (error.message.includes('insuficiente')) {
      return res.status(400).json({ mensaje: error.message });
    }
    if (error.message === 'Producto no encontrado') {
      return res.status(404).json({ mensaje: `No se encontró el producto con ID ${id}.` });
    }
    return res.status(500).json({ mensaje: 'Error interno al registrar el ajuste de inventario.' });
  }
};

/**
 * Genera el reporte de productos con existencia por debajo de un límite en la ubicación elegida
 * Recibe en el query string el límite (?limite=N, entero mayor o igual a 1) y la ubicación
 * (?ubicacion=mostrador|almacen). Si no se envía ubicación, se usa 'mostrador'.
 *
 * @async
 * @function reporteStockBajo
 * @param {Object} req - Petición HTTP con limite y ubicacion en req.query
 * @param {Object} res - Respuesta HTTP con limite, ubicacion, total, producto o un mensaje de error.
 * @returns {Promise<Object>} Respuesta JSON con la lista de productos bajo el umbral.
 */
const reporteStockBajo = async (req, res) => {
  const limite = Number(req.query.limite);
  const ubicacion = req.query.ubicacion || 'mostrador';

  if (req.query.limite === undefined || req.query.limite === '' || !Number.isInteger(limite) || limite < 1) {
    return res.status(400).json({ mensaje: 'Ingresa un límite válido (número entero mayor o igual a 1).' });
  }

  if (!['mostrador', 'almacen'].includes(ubicacion)) {
    return res.status(400).json({ mensaje: 'Ubicación no válida. Usa mostrador o almacen.' });
  }

  try {
    const productos = await getLowStock(limite, ubicacion);

    return res.status(200).json({
      limite,
      ubicacion,
      total: productos.length,
      productos
    });
  } catch (error) {
    console.error('Error al generar el reporte de stock bajo:', error);
    return res.status(500).json({ mensaje: 'Error interno al generar el reporte de stock bajo.' });
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
  obtenerLotes,
  crearLote,
  confirmarLotePendiente,
  borrarLote,
  registrarAjuste,
  reporteStockBajo
};