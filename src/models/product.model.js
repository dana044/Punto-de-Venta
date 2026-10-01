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
    stock_almacen,
    stock_mostrador,
    fecha_caducidad,
    proveedoresIds
  } = productData;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO productos (nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen, stock_mostrador, fecha_caducidad) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        codigo_barras,
        categoria || 'Sin categoría',
        presentacion || 'N/A',
        unidad_medida || 'Pieza',
        precio,
        stock_almacen || 0,
        stock_mostrador || 0,
        fecha_caducidad || null
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
      stock_almacen: stock_almacen || 0,
      stock_mostrador: stock_mostrador || 0,
      fecha_caducidad: fecha_caducidad || null,
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
 * Actualiza la información general de un producto existente y resincroniza
 * sus distribuidores asociados en una sola transacción. También
 * permite registrar o modificar la fecha de caducidad del producto.
 *
 * @async
 * @function updateProduct
 * @param {number|string} id - Identificador del producto a actualizar.
 * @param {Object} productData - Datos capturados en el formulario de edición.
 * @param {string} [productData.fecha_caducidad] - Nueva fecha de caducidad (YYYY-MM-DD) o null si no aplica.
 * @returns {Promise<Producto>} Datos del producto ya actualizado.
 * @throws {Error} Lanza error si falla la transacción o si el código de barras ya está en uso.
 */
const updateProduct = async (id, productData) => {
  const {
    nombre, codigo_barras, categoria, presentacion, unidad_medida,
    precio, stock_almacen, stock_mostrador, fecha_caducidad, proveedoresIds
  } = productData;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE productos SET nombre=?, codigo_barras=?, categoria=?, presentacion=?, 
       unidad_medida=?, precio=?, stock_almacen=?, stock_mostrador=?, fecha_caducidad=? WHERE id=?`,
      [nombre, codigo_barras, categoria || 'Sin categoría', presentacion || 'N/A',
       unidad_medida || 'Pieza', precio, stock_almacen || 0, stock_mostrador || 0, fecha_caducidad || null, id]
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
  const estadoRequerido = mostrarInactivos ? 0 : 1;
  const query = `
    SELECT 
      p.id,
      p.nombre,
      p.codigo_barras,
      p.categoria,
      p.presentacion,
      p.unidad_medida,
      p.precio,
      p.stock_almacen,
      p.stock_mostrador,
      p.fecha_caducidad,
      p.activo,
      GROUP_CONCAT(prov.id SEPARATOR ',') AS proveedores_ids,
      GROUP_CONCAT(prov.nombre SEPARATOR ', ') AS proveedores_nombres
    FROM productos p
    LEFT JOIN producto_proveedor pp ON p.id = pp.producto_id
    LEFT JOIN proveedores prov ON pp.proveedor_id = prov.id
    WHERE p.activo = ?
    GROUP BY p.id
    ORDER BY p.creado_en DESC
  `;
  const [rows] = await db.execute(query, [estadoRequerido]);
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
  const estadoRequerido = mostrarInactivos ? 0 : 1;
  const query = `
    SELECT 
      p.id,
      p.nombre,
      p.codigo_barras,
      p.categoria,
      p.presentacion,
      p.unidad_medida,
      p.precio,
      p.stock_almacen,
      p.stock_mostrador,
      p.fecha_caducidad,
      p.activo,
      GROUP_CONCAT(prov.id SEPARATOR ',') AS proveedores_ids,
      GROUP_CONCAT(prov.nombre SEPARATOR ', ') AS proveedores_nombres
    FROM productos p
    LEFT JOIN producto_proveedor pp ON p.id = pp.producto_id
    LEFT JOIN proveedores prov ON pp.proveedor_id = prov.id
    WHERE (p.nombre LIKE ? OR p.codigo_barras LIKE ? OR p.categoria LIKE ?) AND p.activo = ?
    GROUP BY p.id
    ORDER BY p.nombre ASC
  `;
  const valor = `%${termino}%`;
  const [rows] = await db.execute(query, [valor, valor, valor, estadoRequerido]);
  return rows;
};

/**
 * Da de baja, activa o elimina permanentemente un producto en el sistema.
 *
 * @async
 * @function darDeBajaProducto
 * @param {number|string} id - Identificador único del producto en la base de datos.
 * @param {'desactivar'|'activar'|'eliminar'} accion - Tipo de operación a realizar por el almacenista.
 * @returns {Promise<void>} Promesa que se resuelve al completar la sentencia SQL.
 */
const darDeBajaProducto = async (id, accion) => {
  if (accion === 'desactivar') {
    // 0 = Inactivo (Aparece en la pestaña de desactivados)
    await db.execute('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
  } else if (accion === 'activar') {
    // 1 = Activo (Aparece en el inventario principal)
    await db.execute('UPDATE productos SET activo = 1 WHERE id = ?', [id]);
  } else if (accion === 'eliminar') {
    // 2 = Archivado/Eliminado (No aparece en activos ni inactivos, pero conserva el historial)
    await db.execute('UPDATE productos SET activo = 2 WHERE id = ?', [id]);
  }
};

/**
 * Registra un ajuste manual en el inventario afectando la base de datos (HU-17).
 */
const ajustarStock = async (id, cantidad, tipoAjuste, tipoStock = 'almacen') => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT stock_almacen, stock_mostrador FROM productos WHERE id = ? FOR UPDATE',
      [Number(id)]
    );
    
    if (rows.length === 0) throw new Error('Producto no encontrado');
    
    let nuevoStockAlmacen = rows[0].stock_almacen;
    let nuevoStockMostrador = rows[0].stock_mostrador;

    if (tipoAjuste === 'transferencia_mostrador') {
      if (nuevoStockAlmacen < Number(cantidad)) throw new Error('Stock en almacén insuficiente');
      nuevoStockAlmacen -= Number(cantidad);
      nuevoStockMostrador += Number(cantidad);
    } else if (tipoAjuste === 'transferencia_almacen') {
      if (nuevoStockMostrador < Number(cantidad)) throw new Error('Stock en mostrador insuficiente');
      nuevoStockMostrador -= Number(cantidad);
      nuevoStockAlmacen += Number(cantidad);
    } else {
      if (tipoStock === 'mostrador') {
        if (tipoAjuste === 'ingreso_manual') nuevoStockMostrador += Number(cantidad);
        else if (tipoAjuste === 'merma' || tipoAjuste === 'daño') nuevoStockMostrador -= Number(cantidad);
        else if (tipoAjuste === 'conteo') nuevoStockMostrador = Number(cantidad);
        if (nuevoStockMostrador < 0) nuevoStockMostrador = 0;
      } else {
        if (tipoAjuste === 'ingreso_manual') nuevoStockAlmacen += Number(cantidad);
        else if (tipoAjuste === 'merma' || tipoAjuste === 'daño') nuevoStockAlmacen -= Number(cantidad);
        else if (tipoAjuste === 'conteo') nuevoStockAlmacen = Number(cantidad);
        if (nuevoStockAlmacen < 0) nuevoStockAlmacen = 0;
      }
    }

    await connection.execute(
      'UPDATE productos SET stock_almacen = ?, stock_mostrador = ? WHERE id = ?',
      [nuevoStockAlmacen, nuevoStockMostrador, Number(id)]
    );

    await connection.commit();
    return await findById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

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
  const columna = COLUMNAS_STOCK[ubicacion];
  if (!columna) throw new Error('Ubicación de stock no válida');

  // La columna proviene de la lista blanca COLUMNAS_STOCK, nunca directamente del usuario.
  const query = `
    SELECT
      p.id,
      p.nombre,
      p.codigo_barras,
      p.categoria,
      p.presentacion,
      p.unidad_medida,
      p.${columna} AS existencia
    FROM productos p
    WHERE p.activo = 1
      AND p.${columna} < ?
    ORDER BY p.${columna} ASC, p.nombre ASC
  `;
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
  getLowStock
};