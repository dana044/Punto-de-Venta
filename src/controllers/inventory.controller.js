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
    const {
      nombre,
      codigo_barras,
      codigoBarras,
      categoria,
      presentacion,
      unidad_medida,
      unidadMedida,
      precio,
      proveedoresIds
    } = req.body;

    const barcode = codigo_barras || codigoBarras;
    const unitMeasure = unidad_medida || unidadMedida;

    if (!nombre || !barcode || !categoria || !presentacion || !unitMeasure || precio === undefined || precio === '' || precio === null) {
      return res.status(400).json({
        mensaje: 'Falta información básica. Debes completar nombre, código de barras, presentación, categoría, unidad de medida y precio.'
      });
    }

    const categoriasMap = {
      'Papelería': 1,
      'Bebidas': 2,
      'Comida': 3,
      'Tecnología': 4,
      'Limpieza': 5,
      'Herramientas': 6,
      'Hogar': 7,
      'Cuidado personal': 8,
      'Mascotas': 9,
      'Otros': 10
    };

    const unidadesMap = {
      'Pieza': 1,
      'Caja': 2,
      'Litro': 3,
      'Kilogramo': 4,
      'Paquete': 5
    };

    const categoria_id = categoriasMap[categoria] || 1;
    const unidad_medida_id = unidadesMap[unitMeasure] || 1;

    const datosMapeados = {
      nombre: String(nombre).trim(),
      codigo_barras: String(barcode).trim(),
      categoria_id,
      presentacion: String(presentacion).trim(),
      unidad_medida_id,
      precio: Number(precio),
      ubicacion_id: null,
      proveedoresIds: Array.isArray(proveedoresIds) ? proveedoresIds.map(Number) : []
    };

    const nuevoProducto = await createProduct(datosMapeados);

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

    const {
      nombre,
      codigo_barras,
      codigoBarras,
      categoria,
      presentacion,
      unidad_medida,
      unidadMedida,
      precio,
      area,
      pasillo,
      seccion,
      proveedoresIds
    } = req.body;

    const barcode = codigo_barras || codigoBarras;
    const unitMeasure = unidad_medida || unidadMedida;

    const categoriasMap = {
      'Papelería': 1,
      'Bebidas': 2,
      'Comida': 3,
      'Tecnología': 4,
      'Limpieza': 5,
      'Herramientas': 6,
      'Hogar': 7,
      'Cuidado personal': 8,
      'Mascotas': 9,
      'Otros': 10
    };

    const unidadesMap = {
      'Pieza': 1,
      'Caja': 2,
      'Litro': 3,
      'Kilogramo': 4,
      'Paquete': 5
    };

    const categoria_id = categoriasMap[categoria] || productoExiste.categoria_id || 1;
    const unidad_medida_id = unidadesMap[unitMeasure] || productoExiste.unidad_medida_id || 1;

    const datosMapeados = {
      nombre: nombre ? String(nombre).trim() : productoExiste.nombre,
      codigo_barras: barcode ? String(barcode).trim() : productoExiste.codigo_barras,
      categoria_id,
      presentacion: presentacion !== undefined ? String(presentacion).trim() : productoExiste.presentacion,
      unidad_medida_id,
      precio: precio !== undefined && precio !== '' ? Number(precio) : productoExiste.precio,
      area: area !== undefined ? String(area).trim() : '',
      pasillo: pasillo !== undefined ? String(pasillo).trim() : '',
      seccion: seccion !== undefined ? String(seccion).trim() : '',
      proveedoresIds: Array.isArray(proveedoresIds) ? proveedoresIds.map(Number) : []
    };

    const productoActualizado = await updateProduct(id, datosMapeados);
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
    const productos = q ? await buscarEnModelo(q, mostrarInactivos) : await getProducts(mostrarInactivos);
    return res.status(200).json({ total: productos.length, productos });
  } catch (error) {
    console.error('Error al consultar productos:', error);
    return res.status(500).json({ mensaje: 'Error al consultar el catálogo de productos.' });
  }
};

const listarProveedores = async (req, res) => {
  try {
    const proveedores = getProveedores ? await getProveedores() : [];
    return res.status(200).json({ total: proveedores.length, proveedores });
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    return res.status(500).json({ mensaje: 'Error al obtener la lista de proveedores.' });
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

const PARTICIPIOS_BAJA = { desactivar: 'desactivado', activar: 'reactivado', archivar: 'archivado' };

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

const TIPOS_AJUSTE = ['mover_mostrador', 'regresar_almacen', 'merma', 'daño', 'conteo_mostrador'];

const obtenerLotes = async (req, res) => {
  try {
    const lotes = await getLotesByProducto(req.params.id);
    return res.status(200).json({ lotes });
  } catch (error) {
    console.error('Error al obtener lotes:', error);
    return res.status(500).json({ mensaje: 'Error interno al obtener los lotes.' });
  }
};

const crearLote = async (req, res) => {
  const { cantidad, fecha_caducidad } = req.body;
  if (!Number.isInteger(Number(cantidad)) || Number(cantidad) < 1) {
    return res.status(400).json({ mensaje: 'Ingresa una cantidad válida (entero mayor o igual a 1).' });
  }
  try {
    const nuevoTotal = await agregarLote(req.params.id, Number(cantidad), fecha_caducidad || null, 1);
    return res.status(201).json({ mensaje: 'Lote agregado.', stock_almacen: nuevoTotal });
  } catch (error) {
    console.error('Error al agregar lote:', error);
    if (error.message === 'Producto no encontrado') {
      return res.status(404).json({ mensaje: `No se encontró el producto con ID ${req.params.id}.` });
    }
    return res.status(500).json({ mensaje: 'Error interno al agregar el lote.' });
  }
};

const confirmarLotePendiente = async (req, res) => {
  const { id, idLote } = req.params;
  const { fecha_caducidad } = req.body;
  try {
    const { confirmarLoteBD } = require('../models/product.model.js');
    const nuevoTotal = await confirmarLoteBD(idLote, id, fecha_caducidad, 1);
    return res.status(200).json({ mensaje: 'Lote registrado y movido al almacén.', stock_almacen: nuevoTotal });
  } catch (error) {
    console.error('Error al confirmar lote:', error);
    return res.status(500).json({ mensaje: 'Error interno al registrar el lote.' });
  }
};

const borrarLote = async (req, res) => {
  try {
    const nuevoTotal = await eliminarLote(req.params.idLote, req.params.id, 1);
    return res.status(200).json({ mensaje: 'Lote eliminado.', stock_almacen: nuevoTotal });
  } catch (error) {
    console.error('Error al eliminar lote:', error);
    if (error.message === 'Lote no encontrado') {
      return res.status(404).json({ mensaje: 'El lote no existe para este producto.' });
    }
    return res.status(500).json({ mensaje: 'Error interno al eliminar el lote.' });
  }
};

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
    const productoActualizado = await ajustarStock(id, cantNum, tipoAjuste, String(motivo).trim(), 1, caducidad || null);
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