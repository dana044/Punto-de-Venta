/**
 * @file product.model.js
 * @description Modelo de persistencia y catálogo conectado a base de datos MySQL para productos y distribuidores.
 * Implementa transacciones atómicas sobre el pool de conexiones y cumple con la 3FN.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 * @author Diego Rafael Jiménez Trujano (Programador XP)
 */

const db = require('../config/db.js');

/**
 * @typedef {Object} Distribuidor
 * @property {number} id - Identificador único del distribuidor.
 * @property {string} nombre - Razón social o denominación comercial.
 */

/**
 * @typedef {Object} Producto
 * @property {number} id - Clave primaria del producto.
 * @property {string} nombre - Nombre comercial del producto.
 * @property {string} codigo_barras - Código único de barras o SKU.
 * @property {string} categoria - Nombre de la categoría o departamento (obtenido de vista).
 * @property {string} presentacion - Descripción de la presentación física.
 * @property {string} unidad_medida - Unidad física de cuantificación (obtenido de vista).
 * @property {number} precio - Precio unitario de venta.
 * @property {number} stock_almacen - Existencias actuales en inventario (calculado por vista).
 * @property {number} stock_mostrador - Existencias actuales en exhibición.
 * @property {string} estado - Estado lógico del producto (activo/inactivo/archivado).
 * @property {Array<number>} [proveedoresIds] - Identificadores de distribuidores vinculados.
 * @property {string} [proveedores_nombres] - Cadena agrupada con nombres de proveedores.
 * @property {string} [proxima_caducidad] - Caducidad más cercana entre los lotes de almacén con existencia.
 */

/**
 * Registra un producto en la base de datos y asocia sus distribuidores en una sola transacción.
 * En 3FN, se utilizan IDs para catálogos en lugar de cadenas de texto.
 *
 * @async
 * @function createProduct
 * @param {Object} productData - Datos capturados en el formulario.
 * @returns {Promise<Object>} Datos básicos del producto insertado con su identificador generado.
 * @throws {Error} Lanza error si falla la transacción o si ocurre una colisión de duplicidad.
 */
const createProduct = async (productData) => {
  const {
    nombre,
    codigo_barras,
    categoria_id,
    presentacion,
    unidad_medida_id,
    precio,
    ubicacion_id,
    proveedoresIds
  } = productData;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO productos (nombre, codigo_barras, categoria_id, presentacion, unidad_medida_id, precio, stock_mostrador, estado_id, ubicacion_id) 
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?)`,
      [
        nombre || '',
        codigo_barras || '',
        categoria_id || 1,
        presentacion || 'N/A',
        unidad_medida_id || 1,
        precio !== undefined ? Number(precio) : 0,
        ubicacion_id !== undefined ? ubicacion_id : null
      ]
    );

    const nuevoProductoId = result.insertId;

    if (Array.isArray(proveedoresIds) && proveedoresIds.length > 0) {
      const distribuidoresUnicos = [...new Set(proveedoresIds.map(Number))];

      for (const provId of distribuidoresUnicos) {
        await connection.execute(
          `INSERT INTO producto_proveedor (producto_id, proveedor_id) VALUES (?, ?)`,
          [nuevoProductoId, provId]
        );
      }
    }

    await connection.commit();

    return {
      id: nuevoProductoId,
      nombre,
      codigo_barras,
      precio,
      stock_almacen: 0,
      stock_mostrador: 0,
      proveedoresIds: proveedoresIds ? proveedoresIds.map(Number) : []
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Actualiza la información general (solo catálogo) de un producto existente y resincroniza
 * sus distribuidores asociados en una sola transacción, gestionando la ubicación normalizada.
 *
 * @async
 * @function updateProduct
 * @param {number|string} id - Identificador del producto a actualizar.
 * @param {Object} productData - Datos capturados en el formulario de edición con IDs de catálogo.
 * @returns {Promise<Object>} Datos del producto ya actualizado.
 * @throws {Error} Lanza error si falla la transacción o si el código de barras ya está en uso.
 */
const updateProduct = async (id, productData) => {
  const {
    nombre, codigo_barras, codigoBarras, categoria_id, presentacion, unidad_medida_id,
    precio, area, pasillo, seccion, proveedoresIds
  } = productData;

  const barcode = codigo_barras || codigoBarras || '';
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Resolver o registrar la ubicación en la tabla normalizada 'ubicaciones' (3FN)
    let ubicacionIdFinal = null;
    const areaTrim = area ? String(area).trim() : '';
    const pasilloTrim = pasillo ? String(pasillo).trim() : '';
    const seccionTrim = seccion ? String(seccion).trim() : '';

    if (areaTrim !== '' || pasilloTrim !== '' || seccionTrim !== '') {
      // Buscar si ya existe la ubicación exacta
      const [ubicacionesExistentes] = await connection.execute(
        `SELECT id FROM ubicaciones WHERE area = ? AND pasillo = ? AND selec = ? LIMIT 1`,
        [areaTrim || 'General', pasilloTrim || 'N/A', seccionTrim || 'N/A']
      ).catch(() => [[]]); // Fallback por si la columna se llama 'seccion'

      // Nota: según schema.sql las columnas son area, pasillo, seccion
      const [rowsUb] = await connection.execute(
        `SELECT id FROM ubicaciones WHERE area = ? AND pasillo = ? AND seccion = ? LIMIT 1`,
        [areaTrim || 'General', pasilloTrim || 'N/A', seccionTrim || 'N/A']
      );

      if (rowsUb.length > 0) {
        ubicacionIdFinal = rowsUb[0].id;
      } else {
        // Si no existe, la insertamos automáticamente
        const [nuevaUb] = await connection.execute(
          `INSERT INTO ubicaciones (area, pasillo, seccion) VALUES (?, ?, ?)`,
          [areaTrim || 'General', pasilloTrim || 'N/A', seccionTrim || 'N/A']
        );
        ubicacionIdFinal = nuevaUb.insertId;
      }
    }

    // 2. Actualizar el producto usando estrictamente las columnas del esquema 3FN
    await connection.execute(
      `UPDATE productos SET nombre=?, codigo_barras=?, categoria_id=?, presentacion=?, 
       unidad_medida_id=?, precio=?, ubicacion_id=? WHERE id=?`,
      [
        nombre || '',
        barcode,
        categoria_id || 1,
        presentacion || 'N/A',
        unidad_medida_id || 1,
        precio !== undefined ? Number(precio) : 0,
        ubicacionIdFinal,
        Number(id)
      ]
    );

    // 3. Resincroniza proveedores
    await connection.execute('DELETE FROM producto_proveedor WHERE producto_id = ?', [id]);

    if (Array.isArray(proveedoresIds) && proveedoresIds.length > 0) {
      const unicos = [...new Set(proveedoresIds.map(Number))];
      for (const provId of unicos) {
        await connection.execute(
          `INSERT INTO producto_proveedor (producto_id, proveedor_id) VALUES (?, ?)`,
          [id, provId]
        );
      }
    }

    await connection.commit();
    return { id: Number(id), ...productData };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Consulta la lista completa de distribuidores registrados.
 *
 * @async
 * @function getProveedores
 * @returns {Promise<Array<Distribuidor>>} Catálogo de proveedores ordenado alfabéticamente.
 */
const getProveedores = async () => {
  const [rows] = await db.execute('SELECT id, nombre FROM proveedores ORDER BY nombre ASC');
  return rows;
};

/**
 * Obtiene todos los productos consultando la vista v_productos para resolver IDs a texto automáticamente,
 * concatenando los nombres de sus proveedores asociados y filtrando por estado lógico.
 *
 * @async
 * @function getProducts
 * @param {boolean} [mostrarInactivos=false] - Define si se muestran productos inactivos.
 * @returns {Promise<Array<Producto>>} Lista de productos con distribuidores asociados.
 */
const getProducts = async (mostrarInactivos = false) => {
  const condicionEstado = mostrarInactivos ? "v.estado != 'archivado'" : "v.estado = 'activo'";

  const query = `
    SELECT 
      v.*,
      l.proxima_caducidad,
      GROUP_CONCAT(DISTINCT prov.id SEPARATOR ',') AS proveedores_ids,
      GROUP_CONCAT(DISTINCT prov.nombre SEPARATOR ', ') AS proveedores_nombres
    FROM v_productos v
    LEFT JOIN (
        SELECT producto_id, 
               MIN(CASE WHEN cantidad > 0 THEN fecha_caducidad END) AS proxima_caducidad
        FROM lotes_producto
        GROUP BY producto_id
    ) l ON l.producto_id = v.id
    LEFT JOIN producto_proveedor pp ON v.id = pp.producto_id
    LEFT JOIN proveedores prov ON pp.proveedor_id = prov.id
    WHERE ${condicionEstado}
    GROUP BY v.id
    ORDER BY v.creado_en DESC
  `;
  const [rows] = await db.execute(query);
  return rows;
};

/**
 * Busca un producto individual por su identificador primario usando la vista.
 *
 * @async
 * @function findById
 * @param {number|string} id - Identificador del producto a consultar.
 * @returns {Promise<Producto|null>} Registro del producto encontrado o null.
 */
const findById = async (id) => {
  const [rows] = await db.execute('SELECT * FROM v_productos WHERE id = ? LIMIT 1', [Number(id)]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Filtra productos por coincidencia de texto en nombre, código o categoría y por su estado lógico.
 * Utiliza la vista v_productos para incluir automáticamente los campos resueltos.
 *
 * @async
 * @function buscarProductos
 * @param {string} termino - Cadena de búsqueda ingresada.
 * @param {boolean} [mostrarInactivos=false] - Define si se incluyen productos inactivos.
 * @returns {Promise<Array<Producto>>} Lista de productos que coinciden con el criterio.
 */
const buscarProductos = async (termino, mostrarInactivos = false) => {
  const condicionEstado = mostrarInactivos ? "v.estado != 'archivado'" : "v.estado = 'activo'";
  const query = `
    SELECT 
      v.*,
      l.proxima_caducidad,
      GROUP_CONCAT(DISTINCT prov.id SEPARATOR ',') AS proveedores_ids,
      GROUP_CONCAT(DISTINCT prov.nombre SEPARATOR ', ') AS proveedores_nombres
    FROM v_productos v
    LEFT JOIN (
        SELECT producto_id, 
               MIN(CASE WHEN cantidad > 0 THEN fecha_caducidad END) AS proxima_caducidad
        FROM lotes_producto
        GROUP BY producto_id
    ) l ON l.producto_id = v.id
    LEFT JOIN producto_proveedor pp ON v.id = pp.producto_id
    LEFT JOIN proveedores prov ON pp.proveedor_id = prov.id
    WHERE (v.nombre LIKE ? OR v.codigo_barras LIKE ? OR v.categoria LIKE ?) AND ${condicionEstado}
    GROUP BY v.id
    ORDER BY v.nombre ASC
  `;
  const valor = `%${termino}%`;
  const [rows] = await db.execute(query, [valor, valor, valor]);
  return rows;
};

/**
 * Da de baja, activa o archiva un producto en el sistema modificando su estado_id.
 *
 * @async
 * @function darDeBajaProducto
 * @param {number|string} id - Identificador único del producto en la base de datos.
 * @param {'desactivar'|'activar'|'archivar'} accion - Tipo de operación a realizar por el almacenista.
 * @returns {Promise<void>} Promesa que se resuelve al completar la sentencia SQL.
 */
const darDeBajaProducto = async (id, accion) => {
  if (accion === 'desactivar') {
    await db.execute('UPDATE productos SET estado_id = 0 WHERE id = ?', [id]);
  } else if (accion === 'activar') {
    await db.execute('UPDATE productos SET estado_id = 1 WHERE id = ?', [id]);
  } else if (accion === 'archivar') {
    await db.execute('UPDATE productos SET estado_id = 2 WHERE id = ?', [id]);
  }
};

/**
 * Consulta los lotes de almacén de un producto ordenados por FEFO.
 *
 * @async
 * @function getLotesByProducto
 * @param {number|string} productoId - Identificador del producto.
 * @returns {Promise<Array<Lote>>} Lotes registrados del producto.
 */
const getLotesByProducto = async (productoId) => {
  const [rows] = await db.execute(
    `SELECT id, producto_id, cantidad, fecha_caducidad, estado, recibido_en
     FROM lotes_producto
     WHERE producto_id = ?
     ORDER BY fecha_caducidad IS NULL, fecha_caducidad ASC, id ASC`,
    [Number(productoId)]
  );
  return rows;
};

/**
 * Confirma un lote en cuarentena, asignándole caducidad y estado 'registrado'.
 *
 * @async
 * @function confirmarLoteBD
 * @param {number|string} loteId - Identificador del lote.
 * @param {number|string} productoId - Producto dueño del lote.
 * @param {string} fechaCaducidad - Fecha de expiración (YYYY-MM-DD).
 * @param {number} [usuarioId=1] - Usuario que confirma el lote.
 * @returns {Promise<number>} Nuevo total de almacén obtenido de la vista.
 * @throws {Error} 'Lote no encontrado' o errores de base de datos.
 */
const confirmarLoteBD = async (loteId, productoId, fechaCaducidad, usuarioId = 1) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [lote] = await connection.execute(
      'SELECT cantidad, estado FROM lotes_producto WHERE id = ? AND producto_id = ? FOR UPDATE',
      [Number(loteId), Number(productoId)]
    );
    if (lote.length === 0) throw new Error('Lote no encontrado');

    await connection.execute(
      `UPDATE lotes_producto SET fecha_caducidad = ?, estado = 'registrado' WHERE id = ?`,
      [fechaCaducidad || null, Number(loteId)]
    );

    const nuevoTotal = await obtenerStockAlmacenDesdeVista(connection, productoId);
    await registrarMovimiento(connection, productoId, 6, lote[0].cantidad, 'almacen', 'Confirmación de lote en cuarentena', usuarioId);

    await connection.commit();
    return nuevoTotal;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Obtiene el total del stock en almacén leyendo directamente desde la vista.
 * Ya no guarda el dato en la tabla `productos` para respetar la 3FN.
 *
 * @async
 * @function obtenerStockAlmacenDesdeVista
 * @param {Object} connection - Conexión activa.
 * @param {number|string} productoId - Identificador del producto.
 * @returns {Promise<number>} Total actual de almacén.
 */
const obtenerStockAlmacenDesdeVista = async (connection, productoId) => {
  const [rows] = await connection.execute(
    "SELECT stock_almacen FROM v_stock_almacen WHERE producto_id = ?",
    [Number(productoId)]
  );
  return rows.length > 0 ? Number(rows[0].stock_almacen) : 0;
};

/**
 * Registra el movimiento en el historial (kardex) dentro de la transacción recibida.
 *
 * @async
 * @function registrarMovimiento
 * @param {Object} connection - Conexión activa con transacción abierta.
 * @param {number|string} productoId - Producto afectado.
 * @param {number|string} tipoMovimientoId - ID del tipo de movimiento del catálogo.
 * @param {number} cantidad - Piezas involucradas.
 * @param {'almacen'|'mostrador'} ubicacion - Ubicación afectada.
 * @param {string} motivo - Motivo capturado para auditoría.
 * @param {number} [usuarioId] - Usuario que realiza la acción.
 * @returns {Promise<void>}
 */
const registrarMovimiento = async (connection, productoId, tipoMovimientoId, cantidad, ubicacion, motivo, usuarioId) => {
  await connection.execute(
    `INSERT INTO movimientos_inventario (producto_id, tipo_movimiento_id, cantidad, ubicacion, motivo, usuario_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [Number(productoId), tipoMovimientoId, Number(cantidad), ubicacion, motivo, usuarioId || 1]
  );
};

/**
 * Agrega un lote al almacén y lo registra en movimientos.
 *
 * @async
 * @function agregarLote
 * @param {number|string} productoId - Producto al que pertenece el lote.
 * @param {number|string} cantidad - Piezas del lote.
 * @param {string|null} fecha_caducidad - Caducidad (YYYY-MM-DD) o null.
 * @param {number} [usuarioId] - Usuario que registra el lote.
 * @returns {Promise<number>} Nuevo total de almacén devuelto por la vista.
 */
const agregarLote = async (productoId, cantidad, fecha_caducidad, usuarioId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [prod] = await connection.execute('SELECT id FROM productos WHERE id = ? FOR UPDATE', [Number(productoId)]);
    if (prod.length === 0) throw new Error('Producto no encontrado');

    await connection.execute(
      'INSERT INTO lotes_producto (producto_id, cantidad, fecha_caducidad) VALUES (?, ?, ?)',
      [Number(productoId), Number(cantidad), fecha_caducidad || null]
    );

    const nuevoTotal = await obtenerStockAlmacenDesdeVista(connection, productoId);
    await registrarMovimiento(connection, productoId, 6, cantidad, 'almacen', 'Ingreso de nuevo lote', usuarioId);

    await connection.commit();
    return nuevoTotal;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Elimina un lote del almacén y lo registra en movimientos.
 *
 * @async
 * @function eliminarLote
 * @param {number|string} loteId - Identificador del lote.
 * @param {number|string} productoId - Producto dueño del lote.
 * @param {number} [usuarioId] - Usuario que elimina el lote.
 * @returns {Promise<number>} Nuevo total de almacén devuelto por la vista.
 */
const eliminarLote = async (loteId, productoId, usuarioId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [lote] = await connection.execute(
      'SELECT cantidad FROM lotes_producto WHERE id = ? AND producto_id = ? FOR UPDATE',
      [Number(loteId), Number(productoId)]
    );
    if (lote.length === 0) throw new Error('Lote no encontrado');

    await connection.execute('DELETE FROM lotes_producto WHERE id = ?', [Number(loteId)]);
    const nuevoTotal = await obtenerStockAlmacenDesdeVista(connection, productoId);

    await registrarMovimiento(connection, productoId, 8, lote[0].cantidad, 'almacen', 'Lote eliminado manualmente', usuarioId);

    await connection.commit();
    return nuevoTotal;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Registra un ajuste manual en el inventario afectando la base de datos (HU-17).
 * Actualiza la columna física de mostrador o los registros de lotes.
 *
 * @async
 * @function ajustarStock
 * @param {number|string} id - Identificador del producto.
 * @param {number|string} cantidad - Piezas del ajuste.
 * @param {number|string} tipoMovimientoId - Texto o ID numérico del movimiento.
 * @param {string} motivo - Motivo capturado para auditoría.
 * @param {number} [usuario_id] - Usuario que realiza el ajuste (por defecto 1).
 * @param {string|null} [caducidad=null] - Caducidad del lote creado al regresar a almacén.
 * @returns {Promise<{stock_almacen: number, stock_mostrador: number}>} Existencias resultantes.
 */
const ajustarStock = async (id, cantidad, tipoMovimientoId, motivo, usuario_id, caducidad = null) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT stock_mostrador FROM productos WHERE id = ? FOR UPDATE',
      [Number(id)]
    );
    if (rows.length === 0) throw new Error('Producto no encontrado');

    let nuevoStockMostrador = rows[0].stock_mostrador;
    let ubicacionHistorial = 'mostrador';
    const cantNum = Number(cantidad);

    // --- INICIO DE LA TRADUCCIÓN DE TEXTO A NÚMERO ---
    const mapaMovimientos = {
      'mover_mostrador': 1,
      'regresar_almacen': 2,
      'merma': 3,
      'daño': 4,
      'conteo_mostrador': 5
    };

    // Si llega como texto desde la ruta, lo traduce a su número correspondiente.
    if (typeof tipoMovimientoId === 'string' && mapaMovimientos[tipoMovimientoId]) {
      tipoMovimientoId = mapaMovimientos[tipoMovimientoId];
    } else {
      tipoMovimientoId = Number(tipoMovimientoId); // Respaldo por si ya llega como número
    }
    // --- FIN DE LA TRADUCCIÓN ---

    if (tipoMovimientoId === 1) {
      const [lotes] = await connection.execute(
        `SELECT id, cantidad, fecha_caducidad 
         FROM lotes_producto 
         WHERE producto_id = ? AND cantidad > 0 
         ORDER BY fecha_caducidad IS NULL, fecha_caducidad ASC 
         FOR UPDATE`,
        [Number(id)]
      );
      const stockAlmacenTotal = lotes.reduce((sum, lote) => sum + lote.cantidad, 0);
      if (stockAlmacenTotal < cantNum) throw new Error('Stock en almacén insuficiente para mover a mostrador');
      nuevoStockMostrador += cantNum;
      await restarDeLotes(connection, lotes, cantNum);
      ubicacionHistorial = 'almacen';
    } else if (tipoMovimientoId === 2) {
      if (nuevoStockMostrador < cantNum) throw new Error('Stock en mostrador insuficiente para regresar a almacén');
      nuevoStockMostrador -= cantNum;
      await connection.execute(
        'INSERT INTO lotes_producto (producto_id, cantidad, fecha_caducidad) VALUES (?, ?, ?)',
        [Number(id), cantNum, caducidad || null]
      );
    } else if (tipoMovimientoId === 3 || tipoMovimientoId === 4) {
      if (nuevoStockMostrador < cantNum) throw new Error('Stock en mostrador insuficiente para merma/daño');
      nuevoStockMostrador -= cantNum;
    } else if (tipoMovimientoId === 5) {
      nuevoStockMostrador = cantNum;
    } else {
      throw new Error('Tipo de ajuste no válido');
    }

    await connection.execute(
      'UPDATE productos SET stock_mostrador = ? WHERE id = ?',
      [nuevoStockMostrador, Number(id)]
    );

    const stockAlmacen = await obtenerStockAlmacenDesdeVista(connection, id);
    await registrarMovimiento(connection, id, tipoMovimientoId, cantNum, ubicacionHistorial, motivo, usuario_id);

    await connection.commit();
    return { stock_almacen: stockAlmacen, stock_mostrador: nuevoStockMostrador };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
/**
 * Función auxiliar para descontar piezas aplicando FEFO y eliminando lotes vacíos.
 */
async function restarDeLotes(connection, lotes, cantidadARestar) {
  let restante = Number(cantidadARestar);

  for (const lote of lotes) {
    if (restante <= 0) break;

    const loteCantidad = Number(lote.cantidad);
    const descontar = Math.min(loteCantidad, restante);

    if (descontar === loteCantidad) {
      await connection.execute('DELETE FROM lotes_producto WHERE id = ?', [lote.id]);
    } else {
      await connection.execute(
        'UPDATE lotes_producto SET cantidad = cantidad - ? WHERE id = ?',
        [descontar, lote.id]
      );
    }

    restante -= descontar;
  }
}

/**
 * Busca un producto activo en la vista v_productos por código de barras exacto o coincidencia de nombre.
 * @param {string} termino - Código de barras o fragmento del nombre del producto.
 * @returns {Promise<Object|null>} El objeto del producto o null si no se encuentra.
 */
const findProductForPOS = async (termino) => {
  const query = `
    SELECT id, nombre, codigo_barras, precio 
    FROM v_productos 
    WHERE (codigo_barras = ? OR nombre LIKE ?) 
      AND estado = 'activo' 
    LIMIT 1
  `;

  const [rows] = await db.query(query, [termino, `%${termino}%`]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Columnas de stock permitidas para el reporte de existencia baja.
 * @constant {Object<string, string>}
 */
const COLUMNAS_STOCK = { mostrador: 'stock_mostrador', almacen: 'stock_almacen' };

/**
 * Obtiene los productos activos cuya existencia en la ubicación elegida (mostrador o almacén)
 * es menor al umbral indicado. Consume directamente la vista v_productos.
 *
 * @async
 * @function getLowStock
 * @param {number|string} limite - Umbral de existencia.
 * @param {'mostrador'|'almacen'} [ubicacion='mostrador'] - Ubicación de stock a evaluar.
 * @returns {Promise<Array<Producto>>} Lista de productos por debajo del límite.
 * @throws {Error} Lanza error si la ubicación no es válida.
 */
const getLowStock = async (limite, ubicacion = 'mostrador') => {
  let query = '';

  if (ubicacion === 'mostrador') {
    query = `
      SELECT id, nombre, codigo_barras, categoria, presentacion, unidad_medida, stock_mostrador AS existencia
      FROM v_productos
      WHERE estado = 'activo' AND stock_mostrador < ?
      ORDER BY stock_mostrador ASC, nombre ASC
    `;
  } else if (ubicacion === 'almacen') {
    query = `
      SELECT id, nombre, codigo_barras, categoria, presentacion, unidad_medida, stock_almacen AS existencia
      FROM v_productos
      WHERE estado = 'activo' AND stock_almacen < ?
      ORDER BY stock_almacen ASC, nombre ASC
    `;
  } else {
    throw new Error('Ubicación de stock no válida');
  }

  const [rows] = await db.execute(query, [Number(limite)]);
  return rows;
};

module.exports = {
  createProduct,
  getProveedores,
  getProducts,
  findById,
  buscarProductos,
  darDeBajaProducto,
  updateProduct,
  ajustarStock,
  findProductForPOS,
  getLowStock,
  getLotesByProducto,
  agregarLote,
  eliminarLote,
  confirmarLoteBD
};