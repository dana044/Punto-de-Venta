/**
 * @file product.model.js
 * @description Modelo de persistencia y catálogo conectado a base de datos MySQL para productos y distribuidores.
 * Implementa transacciones atómicas sobre el pool de conexiones.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
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
    fecha_caducidad,
    proveedoresIds
  } = productData;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO productos (nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen, fecha_caducidad) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        codigo_barras,
        categoria || 'Sin categoría',
        presentacion || 'N/A',
        unidad_medida || 'Pieza',
        precio,
        stock_almacen || 0,
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
      fecha_caducidad: fecha_caducidad || nul,
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
    precio, stock_almacen, fecha_caducidad, proveedoresIds
  } = productData;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE productos SET nombre=?, codigo_barras=?, categoria=?, presentacion=?, 
       unidad_medida=?, precio=?, stock_almacen=?, fecha_caducidad=? WHERE id=?`,
      [nombre, codigo_barras, categoria || 'Sin categoría', presentacion || 'N/A',
       unidad_medida || 'Pieza', precio, stock_almacen || 0, fecha_caducidad || null, id]
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
      p.fecha_caducidad,
      p.activo,
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
      p.fecha_caducidad,
      p.activo,
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
    await db.execute('UPDATE productos SET activo = FALSE WHERE id = ?', [id]);
  } else if (accion === 'activar') {
    await db.execute('UPDATE productos SET activo = TRUE WHERE id = ?', [id]);
  } else if (accion === 'eliminar') {
    await db.execute('DELETE FROM productos WHERE id = ?', [id]);
  }
};

/**
 * Registra un ajuste manual en el inventario afectando la base de datos (HU-17).
 */
const ajustarStock = async (id, cantidad, tipoAjuste) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT stock_almacen FROM productos WHERE id = ? FOR UPDATE',
      [Number(id)]
    );
    
    if (rows.length === 0) throw new Error('Producto no encontrado');
    
    let nuevoStock = rows[0].stock_almacen;

    if (tipoAjuste === 'ingreso_manual') {
      nuevoStock += Number(cantidad);
    } else if (tipoAjuste === 'merma' || tipoAjuste === 'daño') {
      nuevoStock -= Number(cantidad);
    } else if (tipoAjuste === 'conteo') {
      nuevoStock = Number(cantidad); 
    }

    if (nuevoStock < 0) nuevoStock = 0;

    await connection.execute(
      'UPDATE productos SET stock_almacen = ? WHERE id = ?',
      [nuevoStock, Number(id)]
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

module.exports = {
  createProduct,
  getProveedores,
  getProducts,
  findById,
  buscarProductos,
  darDeBajaProducto,
  updateProduct,
  ajustarStock
};