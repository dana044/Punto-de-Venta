/**
 * @file product.model.js
 * @description Modelo de persistencia y catálogo conectado a base de datos MySQL para productos y distribuidores.
 * Implementa transacciones atómicas sobre el pool de conexiones.
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
 * @property {string} categoria - Categoría o departamento.
 * @property {string} presentacion - Descripción de la presentación física.
 * @property {string} unidad_medida - Unidad física de cuantificación.
 * @property {number} precio - Precio unitario de venta.
 * @property {number} stock_almacen - Existencias actuales en inventario.
 * @property {number} stock_mostrador - Existencias actuales en exhibición.
 * @property {string} fecha_caducidad - Fecha de expiración del productos.
 * @property {boolean} activo - Estado lógico del producto (Activo/Inactivo).
 * @property {Array<number>} [proveedoresIds] - Identificadores de distribuidores vinculados.
 * @property {string} [proveedores_nombres] - Cadena agrupada con nombres de proveedores.
 * @property {string} [proxima_caducidad] - Caducidad más cercana entre los lotes de almacén con existencia.
 */

/**
 * @typedef {Object} Lote
 * @property {number} id - Identificador único del lote.
 * @property {number} producto_id - Producto al que pertenece el lote.
 * @property {number} cantidad - Piezas disponibles en el lote.
 * @property {string|null} fecha_caducidad - Fecha de caducidad (YYYY-MM-DD) o null si no caduca.
 * @property {string} recibido_en - Fecha y hora de registro del lote.
 */

/**
 * Registra un producto en la base de datos y asocia sus distribuidores en una sola transacción.
 *
 * @async
 * @function createProduct
 * @param {Object} productData - Datos capturados en el formulario.
 * @returns {Promise<Producto>} Datos del producto insertado con su identificador generado.
 * @throws {Error} Lanza error si falla la transacción o si ocurre una colisión de duplicidad.
 */
const createProduct = async (productData) => {
  const {
    nombre,
    codigo_barras,
    categoria,
    presentacion,
    unidad_medida,
    precio,
    proveedoresIds
  } = productData;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // El stock inicia en 0: las existencias se gestionan desde el modal de Stock (lotes y ajustes)
    const [result] = await connection.execute(
      `INSERT INTO productos (nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen, stock_mostrador) 
       VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        nombre,
        codigo_barras,
        categoria || 'Sin categoría',
        presentacion || 'N/A',
        unidad_medida || 'Pieza',
        precio
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
      categoria: categoria || 'Sin categoría',
      presentacion: presentacion || 'N/A',
      unidad_medida: unidad_medida || 'Pieza',
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
 * sus distribuidores asociados en una sola transacción. El stock y la caducidad
 * ya no se editan aquí: se gestionan mediante lotes y ajustes (ver agregarLote y ajustarStock).
 *
 * @async
 * @function updateProduct
 * @param {number|string} id - Identificador del producto a actualizar.
 * @param {Object} productData - Datos capturados en el formulario de edición.
 * @returns {Promise<Producto>} Datos del producto ya actualizado.
 * @throws {Error} Lanza error si falla la transacción o si el código de barras ya está en uso.
 */
const updateProduct = async (id, productData) => {
  const {
    nombre, codigo_barras, categoria, presentacion, unidad_medida,
    precio, proveedoresIds
  } = productData;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE productos SET nombre=?, codigo_barras=?, categoria=?, presentacion=?, 
       unidad_medida=?, precio=? WHERE id=?`,
      [
        nombre || '', 
        codigo_barras || '', 
        categoria || 'Sin categoría', 
        presentacion || 'N/A',
        unidad_medida || 'Pieza', 
        Number(precio) || 0, 
        Number(id)
      ]
    );

    // Resincroniza proveedores: borra los vínculos viejos e inserta los nuevos
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
 * Obtiene todos los productos registrados concatenando los nombres de sus proveedores asociados y filtrando por estado lógico.
 *
 * @async
 * @function getProducts
 * @param {boolean} [mostrarInactivos=false] - Define si se muestran productos dados de baja.
 * @returns {Promise<Array<Producto>>} Lista de productos con distribuidores asociados.
 */
const getProducts = async (mostrarInactivos = false) => {
  // Con inactivos: activos (1) e inactivos (0). Los archivados (2) nunca se listan.
  const condicionEstado = mostrarInactivos ? 'p.activo != 2' : 'p.activo = 1';
  const query = `
    SELECT 
      p.id, 
      p.nombre, 
      p.codigo_barras, 
      p.categoria, p.presentacion, 
      p.unidad_medida, p.precio, 
      p.stock_almacen, p.stock_mostrador, p.activo,
      l.proxima_caducidad,
      GROUP_CONCAT(DISTINCT prov.id SEPARATOR ',') AS proveedores_ids,
      GROUP_CONCAT(DISTINCT prov.nombre SEPARATOR ', ') AS proveedores_nombres
    FROM productos p
    LEFT JOIN (
        SELECT producto_id, 
               MIN(CASE WHEN cantidad > 0 THEN fecha_caducidad END) AS proxima_caducidad
        FROM lotes_producto
        GROUP BY producto_id
    ) l ON l.producto_id = p.id
    LEFT JOIN producto_proveedor pp ON p.id = pp.producto_id
    LEFT JOIN proveedores prov ON pp.proveedor_id = prov.id
    WHERE ${condicionEstado}
    GROUP BY p.id
    ORDER BY p.creado_en DESC
  `;
  const [rows] = await db.execute(query);
  return rows;
};

/**
 * Busca un producto individual por su identificador primario.
 *
 * @async
 * @function findById
 * @param {number|string} id - Identificador del producto a consultar.
 * @returns {Promise<Producto|null>} Registro del producto encontrado o null.
 */
const findById = async (id) => {
  const [rows] = await db.execute('SELECT * FROM productos WHERE id = ? LIMIT 1', [Number(id)]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Filtra productos por coincidencia de texto en nombre, código o categoría y por su estado lógico.
 *
 * @async
 * @function buscarProductos
 * @param {string} termino - Cadena de búsqueda ingresada.
 * @param {boolean} [mostrarInactivos=false] - Define si se incluyen productos dados de baja.
 * @returns {Promise<Array<Producto>>} Lista de productos que coinciden con el criterio.
 */
const buscarProductos = async (termino, mostrarInactivos = false) => {
  const condicionEstado = mostrarInactivos ? 'p.activo != 2' : 'p.activo = 1';
  const query = `
    SELECT 
      p.id, p.nombre, 
      p.codigo_barras, 
      p.categoria, 
      p.presentacion, 
      p.unidad_medida, 
      p.precio, 
      p.stock_almacen, 
      p.stock_mostrador, 
      p.activo,
      l.proxima_caducidad,
      GROUP_CONCAT(DISTINCT prov.id SEPARATOR ',') AS proveedores_ids,
      GROUP_CONCAT(DISTINCT prov.nombre SEPARATOR ', ') AS proveedores_nombres
    FROM productos p
    LEFT JOIN (
        SELECT producto_id, 
               MIN(CASE WHEN cantidad > 0 THEN fecha_caducidad END) AS proxima_caducidad
        FROM lotes_producto
        GROUP BY producto_id
    ) l ON l.producto_id = p.id
    LEFT JOIN producto_proveedor pp ON p.id = pp.producto_id
    LEFT JOIN proveedores prov ON pp.proveedor_id = prov.id
    WHERE (p.nombre LIKE ? OR p.codigo_barras LIKE ? OR p.categoria LIKE ?) AND ${condicionEstado}
    GROUP BY p.id
    ORDER BY p.nombre ASC
  `;
  const valor = `%${termino}%`;
  const [rows] = await db.execute(query, [valor, valor, valor]);
  return rows;
};

/**
 * Da de baja, activa o archiva un producto en el sistema.
 *
 * @async
 * @function darDeBajaProducto
 * @param {number|string} id - Identificador único del producto en la base de datos.
 * @param {'desactivar'|'activar'|'archivar'} accion - Tipo de operación a realizar por el almacenista.
 * @returns {Promise<void>} Promesa que se resuelve al completar la sentencia SQL.
 */
const darDeBajaProducto = async (id, accion) => {
  if (accion === 'desactivar') {
    // 0 = Inactivo (Aparece en la pestaña de desactivados)
    await db.execute('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
  } else if (accion === 'activar') {
    // 1 = Activo (Aparece en el inventario principal)
    await db.execute('UPDATE productos SET activo = 1 WHERE id = ?', [id]);
  } else if (accion === 'archivar') {
    // 2 = Archivado/Eliminado (No aparece en activos ni inactivos, pero conserva el historial)
    await db.execute('UPDATE productos SET activo = 2 WHERE id = ?', [id]);
  }
};

/**
 * Consulta los lotes de almacén de un producto ordenados por FEFO
 * (primero los que caducan antes; los lotes sin caducidad al final).
 *
 * @async
 * @function getLotesByProducto
 * @param {number|string} productoId - Identificador del producto.
 * @returns {Promise<Array<Lote>>} Lotes registrados del producto.
 */
const getLotesByProducto = async (productoId) => {
  const [rows] = await db.execute(
    `SELECT id, producto_id, cantidad, fecha_caducidad, recibido_en
     FROM lotes_producto
     WHERE producto_id = ?
     ORDER BY fecha_caducidad IS NULL, fecha_caducidad ASC, id ASC`,
    [Number(productoId)]
  );
  return rows;
};

/**
 * Recalcula productos.stock_almacen como la suma de los lotes del producto.
 * El conteo de lotes sustituye al conteo manual de almacén. Se ejecuta dentro de la
 * transacción recibida (los triggers de la BD ya lo mantienen; esto es respaldo).
 *
 * @async
 * @function actualizarStockAlmacenPorLotes
 * @param {Object} connection - Conexión activa con transacción abierta.
 * @param {number|string} productoId - Identificador del producto.
 * @returns {Promise<number>} Nuevo total de almacén.
 */
const actualizarStockAlmacenPorLotes = async (connection, productoId) => {
  const [rows] = await connection.execute(
    'SELECT COALESCE(SUM(cantidad), 0) AS total FROM lotes_producto WHERE producto_id = ?',
    [Number(productoId)]
  );
  const total = Number(rows[0].total);
  await connection.execute('UPDATE productos SET stock_almacen = ? WHERE id = ?', [total, Number(productoId)]);
  return total;
};

/**
 * Registra el movimiento en el historial (kardex) dentro de la transacción recibida.
 *
 * @async
 * @function registrarMovimiento
 * @param {Object} connection - Conexión activa con transacción abierta.
 * @param {number|string} productoId - Producto afectado.
 * @param {string} tipo - Tipo de movimiento (ej. 'merma', 'lote_agregado').
 * @param {number} cantidad - Piezas involucradas.
 * @param {'almacen'|'mostrador'} ubicacion - Ubicación afectada (u origen en un traslado).
 * @param {string} motivo - Motivo capturado para auditoría.
 * @param {number} [usuarioId] - Usuario que realiza la acción (por defecto 1).
 * @returns {Promise<void>}
 */
const registrarMovimiento = async (connection, productoId, tipo, cantidad, ubicacion, motivo, usuarioId) => {
  await connection.execute(
    `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, ubicacion, motivo, usuario_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [Number(productoId), tipo, Number(cantidad), ubicacion, motivo, usuarioId || 1]
  );
};

/**
 * Agrega un lote al almacén, actualiza el stock de almacén y lo registra en movimientos.
 *
 * @async
 * @function agregarLote
 * @param {number|string} productoId - Producto al que pertenece el lote.
 * @param {number|string} cantidad - Piezas del lote.
 * @param {string|null} fecha_caducidad - Caducidad (YYYY-MM-DD) o null si no aplica.
 * @param {number} [usuarioId] - Usuario que registra el lote.
 * @returns {Promise<number>} Nuevo total de almacén.
 * @throws {Error} 'Producto no encontrado' o error de transacción.
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
    const nuevoTotal = await actualizarStockAlmacenPorLotes(connection, productoId);
    await registrarMovimiento(connection, productoId, 'lote_agregado', cantidad, 'almacen', 'Ingreso de nuevo lote', usuarioId);

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
 * Elimina un lote del almacén, descuenta sus piezas del stock y lo registra en movimientos.
 *
 * @async
 * @function eliminarLote
 * @param {number|string} loteId - Identificador del lote.
 * @param {number|string} productoId - Producto dueño del lote.
 * @param {number} [usuarioId] - Usuario que elimina el lote.
 * @returns {Promise<number>} Nuevo total de almacén.
 * @throws {Error} 'Lote no encontrado' o error de transacción.
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
    const nuevoTotal = await actualizarStockAlmacenPorLotes(connection, productoId);
    await registrarMovimiento(connection, productoId, 'lote_eliminado', lote[0].cantidad, 'almacen', 'Lote eliminado manualmente', usuarioId);

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
 * Acciones: mover_mostrador (almacén -> mostrador, descuenta lotes por FEFO),
 * regresar_almacen (mostrador -> almacén, crea un lote), merma / daño (restan del mostrador)
 * y conteo_mostrador (reemplaza el total del mostrador). Cada acción queda en movimientos_inventario.
 *
 * @async
 * @function ajustarStock
 * @param {number|string} id - Identificador del producto.
 * @param {number|string} cantidad - Piezas del ajuste (en conteo_mostrador, el nuevo total).
 * @param {'mover_mostrador'|'regresar_almacen'|'merma'|'daño'|'conteo_mostrador'} tipoAjuste - Acción a realizar.
 * @param {string} motivo - Motivo capturado para auditoría.
 * @param {number} [usuario_id] - Usuario que realiza el ajuste (por defecto 1).
 * @param {string|null} [caducidad=null] - Caducidad del lote creado al regresar a almacén.
 * @returns {Promise<{stock_almacen: number, stock_mostrador: number}>} Existencias resultantes.
 * @throws {Error} 'Producto no encontrado', mensajes de stock insuficiente o 'Tipo de ajuste no válido'.
 */
const ajustarStock = async (id, cantidad, tipoAjuste, motivo, usuario_id, caducidad = null) => {
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

    if (tipoAjuste === 'mover_mostrador') {
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
      ubicacionHistorial = 'almacen'; // Origen
    } else if (tipoAjuste === 'regresar_almacen') {
      if (nuevoStockMostrador < cantNum) throw new Error('Stock en mostrador insuficiente para regresar a almacén');
      nuevoStockMostrador -= cantNum;
      // Para sumar al almacén se registra un lote nuevo (con o sin caducidad)
      await connection.execute(
        'INSERT INTO lotes_producto (producto_id, cantidad, fecha_caducidad) VALUES (?, ?, ?)',
        [Number(id), cantNum, caducidad || null]
      );
    } else if (tipoAjuste === 'merma' || tipoAjuste === 'daño') {
      // La merma rápida se hace del mostrador; si es de almacén, se elimina el lote correspondiente
      if (nuevoStockMostrador < cantNum) throw new Error('Stock en mostrador insuficiente para merma/daño');
      nuevoStockMostrador -= cantNum;
    } else if (tipoAjuste === 'conteo_mostrador') {
      nuevoStockMostrador = cantNum;
    } else {
      throw new Error('Tipo de ajuste no válido');
    }

    await connection.execute(
      'UPDATE productos SET stock_mostrador = ? WHERE id = ?',
      [nuevoStockMostrador, Number(id)]
    );
    const stockAlmacen = await actualizarStockAlmacenPorLotes(connection, id);
    await registrarMovimiento(connection, id, tipoAjuste, cantNum, ubicacionHistorial, motivo, usuario_id);

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
        // Si nos acabamos el lote completo, lo eliminamos de la base de datos para no dejar basura (0 piezas)
        await connection.execute('DELETE FROM lotes_producto WHERE id = ?', [lote.id]);
    } else {
        // Si aún le quedan piezas, solo actualizamos su cantidad
        await connection.execute(
          'UPDATE lotes_producto SET cantidad = cantidad - ? WHERE id = ?',
          [descontar, lote.id]
        );
    }
    
    restante -= descontar;
  }
}

/**
 * Busca un producto activo en la base de datos MySQL por código de barras exacto o coincidencia de nombre.
 * @param {string} termino - Código de barras o fragmento del nombre del producto.
 * @returns {Promise<Object|null>} El objeto del producto o null si no se encuentra.
 */
const findProductForPOS = async (termino) => {
  const query = `
    SELECT id, nombre, codigo_barras, precio 
    FROM productos 
    WHERE (codigo_barras = ? OR nombre LIKE ?) 
      AND activo = 1 
    LIMIT 1
  `;
  
  // Usamos el término exacto para el código de barras, y con comodines (%) para el nombre
  const [rows] = await db.query(query, [termino, `%${termino}%`]);
  
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Columnas de stock permitidas para el reporte de existencia baja
 * Funciona como lista blanca: solo estos nombres pueden interpolarse en la consulta SQL.
 * @constant {Object<string, string>}
 */
const COLUMNAS_STOCK = { mostrador: 'stock_mostrador', almacen: 'stock_almacen' };

/**
 * Obtiene los productos activos cuya existencia en la ubicación elegida (mostrador o almacén)
 * es menor al umbral indicado. Devuelve únicamente la existencia de la ubicación
 * seleccionada, bajo el alias existencia. Los resultados se ordenan del stock más bajo al
 * más alto y, en caso de empate, alfabéticamente por nombre.
 *
 * @async
 * @function getLowStock
 * @param {number|string} limite - Umbral de existencia (se listan los productos con stock estrictamente menor).
 * @param {'mostrador'|'almacen'} [ubicacion='mostrador'] - Ubicación de stock a evaluar.
 * @returns {Promise<Array<Producto>>} Lista de productos por debajo del límite en la ubicación elegida.
 * @throws {Error} Lanza error si la ubicación no es válida.
 */
const getLowStock = async (limite, ubicacion = 'mostrador') => {
  let query = '';
  
  if (ubicacion === 'mostrador') {
    query = `
      SELECT p.id, 
      p.nombre, 
      p.codigo_barras, 
      p.categoria, 
      p.presentacion, 
      p.unidad_medida, 
      p.stock_mostrador AS existencia
      FROM productos p
      WHERE p.activo = 1 AND p.stock_mostrador < ?
      ORDER BY p.stock_mostrador ASC, p.nombre ASC
    `;
  } else if (ubicacion === 'almacen') {
    // Para almacén, sumamos los lotes
    query = `
      SELECT p.id, 
      p.nombre, 
      p.codigo_barras, 
      p.categoria, 
      p.presentacion, 
      p.unidad_medida, 
      COALESCE(SUM(lp.cantidad), 0) AS existencia
      FROM productos p
      LEFT JOIN lotes_producto lp ON p.id = lp.producto_id
      WHERE p.activo = 1
      GROUP BY p.id
      HAVING existencia < ?
      ORDER BY existencia ASC, p.nombre ASC
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
  eliminarLote
};