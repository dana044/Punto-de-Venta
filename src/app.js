/**
 * Punto de Venta - Configuración Central de Express.
 * Archivo principal donde se registran los middlewares, se configuran las 
 * vistas estáticas y se montan las rutas de la API del sistema.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
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
const receivingRoutes = require('./routes/receiving.routes.js');
const posRoutes = require('./routes/pos.routes.js');
const employeesRoutes = require('./routes/employees.routes.js');
const suppliersRoutes = require('./routes/suppliers.routes.js');
const lotesRoutes = require('./routes/lotes.routes.js');

/** Montaje de la ruta base para autenticación. */
app.use('/api/auth', authRoutes);
/** Montaje de la ruta base para inventario. */
app.use('/api/inventory', inventoryRoutes);
/** Montaje de la ruta base para recepción de mercancía (HU-14). */
app.use('/api/receiving', receivingRoutes);
/** Montaje de la ruta base para el punto de venta (HU-27: cálculo de totales). */
app.use('/api/pos', posRoutes);
/** Montaje de la ruta base para empleados. */
app.use('/api/employees', employeesRoutes);
/** Montaje de la ruta base para proveedores. (HU-18, HU-19) */
app.use('/api/suppliers', suppliersRoutes);
/** Montaje de la ruta para lotes dentro de inventario */
app.use('/api/inventory', lotesRoutes);

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

/**
 * Ruta para la interfaz de recepción de mercancía en almacén.
 */
app.get('/recepcion', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'view', 'recepcion.html'));
});

/**
 * Ruta para la interfaz de calculadora de venta.
 */
app.get('/pos', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'view', 'pos.html'));
});

/**
 * Ruta para la interfaz de empleados.
 */
app.get('/empleados', (req, res) => { 
  res.sendFile(path.join(__dirname, '..', 'public', 'view', 'empleados.html')); 
});

/** 
 * Ruta de la interfaz para Proveedores.
*/
app.get('/proveedores', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'view', 'proveedores.html'));
});

/**
 * Ruta para la interfaz de reportes de inventario
 */
app.get('/reportes-inventario', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'view', 'reportes-inventario.html'));
});

module.exports = app;