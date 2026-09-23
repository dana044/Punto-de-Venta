/**
 * ontrolador de Autenticación.
 * Se encarga de procesar las peticiones de inicio de sesión y validar credenciales.
 */
const { findUserByUsername } = require('../models/user.model.js');

/**
 * Valida las credenciales del usuario y devuelve el acceso según su rol (HU-02 y HU04).
 * @param {Object} req - Objeto de petición de Express, contiene el body con usuario, contrasena y rol.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<Object>} Respuesta JSON con estado HTTP, mensaje y datos de sesión (o error).
 */
const login = async (req, res) => {
  const { usuario, contrasena, rol } = req.body;

  try {
    /** Busca al usuario por username */
    const user = await findUserByUsername(usuario);

    /** Verifica si existe y si la contraseña coincide */
    if (!user || user.password !== contrasena) {
      return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos.' });
    }

    /** Criterio HU04: Si la cuenta está desactivada, no permitir el inicio de sesión */
    if (!user.activo) {
      return res.status(403).json({ mensaje: 'Esta cuenta ha sido desactivada. Contacta al administrador.' });
    }

    /** Verifica si el rol seleccionado coincide con su rol real */
    if (rol && user.role !== rol) {
      return res.status(403).json({ mensaje: 'No tienes permisos para este rol.' });
    }

    /** Respuesta de éxito */
    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token: 'token_falso_12345',
      usuario: {
        id: user.id,
        username: user.username,
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