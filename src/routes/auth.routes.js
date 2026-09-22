/**
 * Punto de Venta UV - Rutas de Autenticación.
 * Define los endpoints para el control de acceso de los usuarios.
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller.js');

/**
 * Endpoint para iniciar sesión.
 * Recibe credenciales y devuelve el token y rol validados.
 * Ruta base: /api/auth/login
 */
router.post('/login', authController.login);

module.exports = router;