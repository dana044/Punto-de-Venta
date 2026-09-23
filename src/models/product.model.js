/**
 * @file product.model.js
 * @description Modelo de datos y catálogo conectado a base de datos MySQL para productos y distribuidores (HU-06, HU-09 y HU-11).
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

// Importamos la conexión a la base de datos (asegúrate de que db.js exporte un pool de promesas)
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
 * @property {string} categoria - Categoría del producto.
 * @property {string} presentacion - Descripción de la presentación física.
 * @property {string} unidad_medida - Unidad física de cuantificación.
 * @property {number} precio - Precio unitario de venta.
 * @property {number} stock_almacen - Cantidad en inventario.
 */

/**
 * Registra un nuevo producto en la base de datos y vincula sus distribuidores asociados (HU-11).
 *
 * @async
 * @function createProduct
 * @param {Object} productData - Datos del producto capturados desde el cliente.
 * @returns {Promise<Producto>} El registro del producto creado con su identificador asignado.
 */
const createProduct = async (productData) => {
  const { nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen, proveedoresIds } = productData;
  
  // Obtenemos una conexión para manejar una transacción
  const connection = await db.getConnection(); 
  
  try {
    await connection.beginTransaction();

    // 1. Insertar el producto en la tabla "productos"
    const [result] = await connection.execute(
      `INSERT INTO productos (nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre, 
        codigo_barras, 
        categoria || 'Sin categoría', 
        presentacion || 'N/A', 
        unidad_medida || 'Pieza', 
        precio, 
        stock_almacen || 0
      ]
    );
    
    const nuevoId = result.insertId;

    // 2. Asociar distribuidores si existen en el arreglo
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
    
    return {
      id: nuevoId,
      nombre,
      codigo_barras,
      categoria,
      precio,
      stock_almacen
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Retorna la totalidad de proveedores disponibles desde la base de datos.
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
 * Consulta la lista general de productos registrados en la base de datos.
 *
 * @async
 * @function getProducts
 * @returns {Promise<Array<Producto>>} Lista de productos.
 */
const getProducts = async () => {
  const [rows] = await db.execute('SELECT * FROM productos');
  return rows;
};

/**
 * Busca productos en la base de datos comparando nombre, código o categoría (HU-09).
 *
 * @async
 * @function buscarProductos
 * @param {string} termino - El texto ingresado por el usuario en el buscador.
 * @returns {Promise<Array<Producto>>} Lista de productos filtrados.
 */
const buscarProductos = async (termino) => {
  const query = `
    SELECT * FROM productos 
    WHERE nombre LIKE ? OR codigo_barras LIKE ? OR categoria LIKE ?
  `;
  const valor = `%${termino}%`;
  const [rows] = await db.execute(query, [valor, valor, valor]);
  return rows;
};

module.exports = {
  createProduct,
  getProveedores,
  getProducts,
  buscarProductos
};