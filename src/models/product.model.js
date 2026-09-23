/**
 * @file product.model.js
 * @description Modelo de datos y catálogo conectado a base de datos MySQL para productos y distribuidores.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

const db = require('../config/db.js');

/**
 * @typedef {Object} Distribuidor
 * @property {number} id - Identificador único del distribuidor.
 * @property {string} nombre - Nombre comercial o razón social.
 */

/**
 * @typedef {Object} Producto
 * @property {number} id - Identificador único autoincremental del producto.
 * @property {string} nombre - Denominación comercial del producto.
 * @property {string} codigo_barras - Identificador numérico o SKU del producto.
 * @property {string} categoria - Clasificación del producto.
 * @property {string} presentacion - Descripción de la presentación física.
 * @property {string} unidad_medida - Unidad física de cuantificación.
 * @property {number} precio - Precio unitario de venta.
 * @property {number} stock_almacen - Cantidad disponible en inventario.
 * @property {boolean} activo - Estado lógico del producto.
 */

/**
 * Registra un nuevo producto en la base de datos y vincula sus distribuidores asociados.
 *
 * @async
 * @function createProduct
 * @param {Object} productData - Datos del producto capturados desde el cliente.
 * @param {string} productData.nombre - Nombre del artículo.
 * @param {string} productData.codigo_barras - Código de barras.
 * @param {string} productData.categoria - Categoría del producto.
 * @param {string} productData.presentacion - Presentación comercial.
 * @param {string} productData.unidad_medida - Unidad de medida.
 * @param {number} productData.precio - Precio unitario.
 * @param {number} productData.stock_almacen - Inventario inicial.
 * @param {Array<number|string>} productData.proveedoresIds - Arreglo de IDs de distribuidores vinculados.
 * @returns {Promise<Producto>} El registro del producto creado con su identificador asignado.
 */
const createProduct = async (productData) => {
  const { nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen, proveedoresIds } = productData;
  const connection = await db.getConnection(); 
  
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO productos (nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, codigo_barras, categoria || 'Sin categoría', presentacion || 'N/A', unidad_medida || 'Pieza', precio, stock_almacen || 0]
    );
    
    const nuevoId = result.insertId;

    if (proveedoresIds && proveedoresIds.length > 0) {
      const distribuidoresUnicos = [...new Set(proveedoresIds.map(Number))];
      for (const provId of distribuidoresUnicos) {
        await connection.execute(
          `INSERT INTO producto_proveedor (producto_id, proveedor_id) VALUES (?, ?)`,
          [nuevoId, provId]
        );
      }
    }

    await connection.commit();
    return { id: nuevoId, nombre, codigo_barras, categoria, precio, stock_almacen };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Retorna la totalidad de proveedores disponibles en la base de datos.
 *
 * @async
 * @function getProveedores
 * @returns {Promise<Array<Distribuidor>>} Lista de distribuidores registrados.
 */
const getProveedores = async () => {
  const [rows] = await db.execute('SELECT id, nombre FROM proveedores');
  return rows;
};

/**
 * Consulta la lista general de productos activos registrados en la base de datos.
 *
 * @async
 * @function getProducts
 * @returns {Promise<Array<Producto>>} Lista de productos disponibles.
 */
const getProducts = async (mostrarInactivos = false) => {
  // Si mostrarInactivos es true, buscamos activo = FALSE (0), de lo contrario activo = TRUE (1)
  const estadoRequerido = mostrarInactivos ? 0 : 1;
  const [rows] = await db.execute('SELECT * FROM productos WHERE activo = ?', [estadoRequerido]);
  return rows;
};

/**
 * Busca productos activos en la base de datos comparando nombre, código o categoría
 *
 * @async
 * @function buscarProductos
 * @param {string} termino - El texto ingresado por el usuario en el buscador.
 * @returns {Promise<Array<Producto>>} Lista de productos filtrados que no han sido dados de baja.
 */
const buscarProductos = async (termino, mostrarInactivos = false) => {
  const estadoRequerido = mostrarInactivos ? 0 : 1;
  const query = `
    SELECT * FROM productos 
    WHERE (nombre LIKE ? OR codigo_barras LIKE ? OR categoria LIKE ?) AND activo = ?
  `;
  const valor = `%${termino}%`;
  const [rows] = await db.execute(query, [valor, valor, valor, estadoRequerido]);
  return rows;
};

/**
 * Da de baja un producto en el sistema, ya sea mediante desactivación lógica o eliminación física
 *
 * @async
 * @function darDeBajaProducto
 * @param {number|string} id - Identificador único del producto en la base de datos.
 * @param {'desactivar'|'eliminar'} accion - Tipo de operación a realizar por el almacenista.
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

module.exports = {
  createProduct,
  getProveedores,
  getProducts,
  buscarProductos,
  darDeBajaProducto
};