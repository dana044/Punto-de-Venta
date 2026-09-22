/**
 * Punto de Venta UV - Configuración Central de Express.
 * Archivo principal donde se registran los middlewares, se configuran las 
 * vistas estáticas y se montan las rutas de la API del sistema.
 */
const express = require('express');
const path = require('path');

const app = express();

/** 
 * Middleware para procesar cuerpos de peticiones en formato JSON.
 * Requerido para leer los datos enviados desde los formularios del frontend (ej. Login, Productos).
 */
app.use(express.json());

/** 
 * Servidor de archivos estáticos.
 * Expone la carpeta 'public' para insertar CSS, JS e imágenes a las vistas.
 */
app.use(express.static(path.join(__dirname, '..', 'public')));

/** Importación de rutas de la API. */
const authRoutes = require('./routes/auth.routes.js');
const inventoryRoutes = require('./routes/inventory.routes.js');

/** Montaje de la ruta base para autenticación. */
app.use('/api/auth', authRoutes);
/** Montaje de la ruta base para inventario. */
app.use('/api/inventory', inventoryRoutes);

/**
 * Ruta raíz que redirige automáticamente a la pantalla de inicio de sesión.
 * @name get/
 * @function
 * @param {Object} req - Objeto de petición HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
app.get('/', (req, res) => {
  res.redirect('/login');
});

/**
 * Ruta para servir la interfaz de usuario del Login.
 * @name get/login
 * @function
 * @param {Object} req - Objeto de petición HTTP.
 * @param {Object} res - Objeto de respuesta HTTP, envía el archivo HTML.
 */
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'view', 'login.html'));
});

/**
 * Ruta para la interfaz del inventario.
 */
app.get('/inventario', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'view', 'inventario.html'));
});

module.exports = app;