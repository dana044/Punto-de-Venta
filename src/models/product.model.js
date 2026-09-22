/**
 * @file product.model.js
 * @description Modelo de datos y catálogo en memoria para productos y distribuidores (HU-06 y HU-11).
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

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
 * @property {string} presentacion - Descripción de la presentación física.
 * @property {string} unidad_medida - Unidad física de cuantificación.
 * @property {number} precio - Precio unitario de venta.
 * @property {Array<number>} proveedoresIds - Lista de IDs de distribuidores asociados.
 */

/**
 * Catálogo en memoria de distribuidores registrados (HU-11).
 * @type {Array<Distribuidor>}
 */
const proveedores = [
  { id: 1, nombre: 'Distribuidora Central Papelera S.A.' },
  { id: 2, nombre: 'Abarrotes y Suministros del Golfo' },
  { id: 3, nombre: 'Comercializadora Universitaria UV' }
];

/**
 * Lista en memoria que almacena los productos registrados.
 * @type {Array<Producto>}
 */
const products = [];

/**
 * Contador para simular la asignación autoincremental del identificador primario.
 * @type {number}
 */
let nextId = 1;

/**
 * Registra un nuevo producto y vincula sus distribuidores asociados (HU-11).
 *
 * @function createProduct
 * @param {Object} productData - Datos del producto capturados desde el cliente.
 * @param {string} productData.nombre - Nombre del artículo.
 * @param {string} productData.codigo_barras - Código de barras.
 * @param {string} productData.presentacion - Presentación comercial.
 * @param {string} productData.unidad_medida - Unidad de medida.
 * @param {number} productData.precio - Precio unitario.
 * @param {Array<number|string>} productData.proveedoresIds - Arreglo de IDs de distribuidores vinculados.
 * @returns {Producto} El registro del producto creado con su identificador asignado.
 */
const createProduct = (productData) => {
  const distribuidoresUnicos = Array.isArray(productData.proveedoresIds)
    ? [...new Set(productData.proveedoresIds.map(Number))]
    : [];

  const newProduct = {
    id: nextId++,
    nombre: productData.nombre,
    codigo_barras: productData.codigo_barras,
    presentacion: productData.presentacion,
    unidad_medida: productData.unidad_medida,
    precio: productData.precio,
    proveedoresIds: distribuidoresUnicos
  };

  products.push(newProduct);
  return newProduct;
};

/**
 * Retorna la totalidad de proveedores disponibles en el catálogo.
 *
 * @function getProveedores
 * @returns {Array<Distribuidor>} Lista de distribuidores registrados.
 */
const getProveedores = () => {
  return proveedores;
};

module.exports = {
  createProduct,
  getProveedores,
  products
};