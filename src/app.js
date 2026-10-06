/**
 * Punto de Venta - Configuración Central de Express.
 * Archivo principal donde se registran los middlewares, se configuran las 
 * vistas estáticas y se montan las rutas de la API del sistema.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 * @author Stephanie Elizdeth Hernández Prieto (HU-40: Reporte Mensual de Ventas)
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
 * Middleware para procesar datos codificados en URL.
 */
app.use(express.urlencoded({ extended: true }));

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
const alertsRoutes = require('./routes/alerts.routes.js');
const invoiceRoutes = require('./routes/invoice.routes.js');

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
/** Montaje de la ruta para alertas de poco inventario para almacén y para mostrador */
app.use('/api/alerts', alertsRoutes);
/** Montaje de la ruta base del módulo de facturación simulada (rutas públicas para el cliente). */
app.use('/api/facturacion', invoiceRoutes);

/**
 * Ruta raíz que redirige automáticamente a la pantalla de inicio de sesión.
 * @name get/
 * @function
 * @param {Object} req Objeto de petición HTTP.
 * @param {Object} res Objeto de respuesta HTTP.
 */
app.get('/', (req, res) => {
  res.redirect('/login');
});

/**
 * Ruta para servir la interfaz de usuario del Login.
 * @name get/login
 * @function
 * @param {Object} req Objeto de petición HTTP.
 * @param {Object} res Objeto de respuesta HTTP, envía el archivo HTML.
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
 * Ruta unificada para la interfaz general de Reportes (con subpestañas).
 */
app.get('/reportes', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'view', 'reportes.html'));
});

/**
 * Redirecciones de compatibilidad hacia la vista unificada de Reportes.
 */
app.get(['/reportes-inventario', '/reportes-ventas'], (req, res) => {
  res.redirect('/reportes');
});

/**
 * Ruta para la interfaz de Historial de Ventas (individualizado por cajero y cancelaciones).
 */
app.get('/historial-ventas', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'view', 'historial-ventas.html'));
});

/**
 * Redirige la dirección con acento (/facturación.lanumberone) a la ruta oficial sin acento,
 * porque los navegadores la envían codificada (%C3%B3) y Express no la reconoce como literal.
 */
app.use((req, res, next) => {
  try {
    if (decodeURIComponent(req.path).normalize('NFC') === '/facturación.lanumberone') {
      return res.redirect(301, '/facturacion.lanumberone');
    }
  } catch (error) {
    /** URL mal formada: se ignora y se continúa con el resto de las rutas. */
  }
  next();
});

/**
 * Ruta pública del módulo de facturación simulada (la usa el cliente con el folio de su ticket).
 */
app.get('/facturacion.lanumberone', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'view', 'facturacion.html'));
});

/**
 * Ruta pública del Aviso de Privacidad.
 */
app.get('/politica-privacidad', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'view', 'politica-privacidad.html'));
});

module.exports = app;