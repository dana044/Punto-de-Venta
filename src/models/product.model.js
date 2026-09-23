/**
 * @file product.model.js
 * @description Modelo de persistencia para productos y su relacion con distribuidores en MySQL.
 * Implementa transacciones atomicas sobre el pool de conexiones.
 */

const db = require('../config/db.js');

/**
 * @typedef {Object} Distribuidor
 * @property {number} id - Identificador unico del distribuidor.
 * @property {string} nombre - Razon social o denominacion comercial.
 */

/**
 * @typedef {Object} Producto
 * @property {number} id - Clave primaria del producto.
 * @property {string} nombre - Nombre comercial del producto.
 * @property {string} codigo_barras - Codigo unico de barras o SKU.
 * @property {string} categoria - Categoria o departamento.
 * @property {string} presentacion - Descripcion de la presentacion fisica.
 * @property {string} unidad_medida - Unidad fisica de cuantificacion.
 * @property {number} precio - Precio unitario de venta.
 * @property {number} stock_almacen - Existencias actuales en inventario.
 * @property {Array<number>} [proveedoresIds] - Identificadores de distribuidores vinculados.
 * @property {string} [proveedores_nombres] - Cadena agrupada con nombres de proveedores.
 */

/**
 * Registra un producto en la base de datos y asocia sus distribuidores en una sola transaccion.
 *
 * @async
 * @function createProduct
 * @param {Object} productData - Datos capturados en el formulario.
 * @param {string} productData.nombre - Nombre del producto.
 * @param {string} productData.codigo_barras - Codigo unico de barras.
 * @param {string} [productData.categoria] - Categoria del producto.
 * @param {string} [productData.presentacion] - Presentacion fisica.
 * @param {string} [productData.unidad_medida] - Unidad de medida.
 * @param {number} productData.precio - Precio unitario de venta.
 * @param {number} [productData.stock_almacen=0] - Existencias fisicas iniciales.
 * @param {Array<number|string>} productData.proveedoresIds - Lista de identificadores de distribuidores.
 * @returns {Promise<Producto>} Datos del producto insertado con su identificador generado.
 * @throws {Error} Lanza error si falla la transaccion o si ocurre una colision de duplicidad.
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
    proveedoresIds
  } = productData;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO productos (nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        codigo_barras,
        categoria || 'General',
        presentacion || 'Pieza',
        unidad_medida || 'Pieza',
        precio,
        stock_almacen || 0
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
      categoria: categoria || 'General',
      presentacion: presentacion || 'Pieza',
      unidad_medida: unidad_medida || 'Pieza',
      precio,
      stock_almacen: stock_almacen || 0,
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
 * Consulta la lista completa de distribuidores registrados.
 *
 * @async
 * @function getProveedores
 * @returns {Promise<Array<Distribuidor>>} Catalogo de proveedores ordenado alfabeticamente.
 */
const getProveedores = async () => {
  const [rows] = await db.execute('SELECT id, nombre FROM proveedores ORDER BY nombre ASC');
  return rows;
};

/**
 * Obtiene todos los productos registrados concatenando los nombres de sus proveedores asociados.
 *
 * @async
 * @function getProducts
 * @returns {Promise<Array<Producto>>} Lista de productos con distribuidores asociados.
 */
const getProducts = async () => {
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
      GROUP_CONCAT(prov.nombre SEPARATOR ', ') AS proveedores_nombres
    FROM productos p
    LEFT JOIN producto_proveedor pp ON p.id = pp.producto_id
    LEFT JOIN proveedores prov ON pp.proveedor_id = prov.id
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
 * Filtra productos por coincidencia de texto en nombre, codigo o categoria.
 *
 * @async
 * @function buscarProductos
 * @param {string} termino - Cadena de busqueda ingresada.
 * @returns {Promise<Array<Producto>>} Lista de productos que coinciden con el criterio.
 */
const buscarProductos = async (termino) => {
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
      GROUP_CONCAT(prov.nombre SEPARATOR ', ') AS proveedores_nombres
    FROM productos p
    LEFT JOIN producto_proveedor pp ON p.id = pp.producto_id
    LEFT JOIN proveedores prov ON pp.proveedor_id = prov.id
    WHERE p.nombre LIKE ? OR p.codigo_barras LIKE ? OR p.categoria LIKE ?
    GROUP BY p.id
    ORDER BY p.nombre ASC
  `;
  const valor = `%${termino}%`;
  const [rows] = await db.execute(query, [valor, valor, valor]);
  return rows;
};

module.exports = {
  createProduct,
  getProveedores,
  getProducts,
  findById,
  buscarProductos
};