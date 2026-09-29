/**
 * @file product.model.js
 * @description Modelo de datos para productos y distribuidores.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 * @author Diego Rafael Jiménez Trujano (Programador XP)
 */

// Importamos tu conexión a MySQL configurada en server.js
const db = require('../config/db');

// --- CÓDIGO EN MEMORIA EXISTENTE ---
const proveedores = [
  { id: 1, nombre: 'Distribuidora Central Papelera S.A.' },
  { id: 2, nombre: 'Abarrotes y Suministros del Golfo' },
  { id: 3, nombre: 'Comercializadora Universitaria UV' }
];

const products = [];
let nextId = 1;

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

const getProveedores = () => {
  return proveedores;
};

// --- NUEVO CÓDIGO CON MYSQL (HU-26 / HU-49) ---

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

module.exports = {
  createProduct,
  getProveedores,
  products,
  findProductForPOS
};