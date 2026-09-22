/**
 * Conexión a la base de datos MySQL.
 * Usamos un "pool" en vez de una sola conexión: mysql2 abre y reutiliza
 * varias conexiones automáticamente, así no se cae el servidor si dos
 * peticiones llegan al mismo tiempo (ej. dos cajeros cobrando a la vez).
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'punto_de_venta',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;
