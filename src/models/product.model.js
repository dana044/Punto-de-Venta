/**
 * Punto de Venta UV - Modelo de Producto (Temporal en memoria hasta agregar la BD).
 * Estructura temporal para el catálogo de productos (HU-06).
 */

/** @type {Array<Object>} */
const products = [];
let nextId = 1;

/**
 * Registra un nuevo producto en el inventario temporal.
 * @param {Object} productData - Datos del producto capturados en la vista.
 * @returns {Object} El producto recién creado con su ID asignado.
 */
const createProduct = (productData) => {
  const newProduct = {
    id: nextId++,
    ...productData
  };
  products.push(newProduct);
  return newProduct;
};

module.exports = {
  createProduct,
  products
};