/**
 * @file auth.middleware.js
 * @description Middleware de autorización permisivo para desarrollo y pruebas locales.
 */

const permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    // Permitir el paso libre a todas las peticiones de vistas y APIs del sistema localmente
    // Esto evita bloqueos 401 por falta de tokens o sesiones estrictas en el entorno de desarrollo.
    return next();
  };
};

module.exports = {
  permitirRoles
};