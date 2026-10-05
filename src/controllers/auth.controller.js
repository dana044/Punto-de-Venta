/**
 * @file auth.controller.js
 * @description Controlador de Autenticación adaptado a 3FN (validación con rolId).
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

const { findUserByCorreo } = require('../models/user.model.js');

/**
 * Valida las credenciales del usuario y devuelve el acceso según su rolId numérico.
 */
const login = async (req, res) => {
  const { correo, contrasena, rolId } = req.body;

  try {
    const user = await findUserByCorreo(correo);

    if (!user || user.password !== contrasena) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    if (!user.activo) {
      return res.status(403).json({ mensaje: 'Esta cuenta ha sido desactivada. Contacta al administrador.' });
    }

    // Validación estricta por rolId numérico
    if (rolId && Number(user.rolId) !== Number(rolId)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para este rol.' });
    }

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token: 'token_falso_12345',
      usuario: {
        id: user.id,
        nombre: user.nombreCompleto,
        correo: user.correo,
        rolId: user.rolId,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al iniciar sesión.' });
  }
};

module.exports = {
  login
};