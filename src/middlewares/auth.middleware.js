/**
 * @file auth.middleware.js
 * @description Middleware de autorización y control de acceso basado en roles (HU-03).
 * Protege las rutas verificando el rol del usuario antes de permitir el paso al controlador.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

/**
 * Genera un middleware de Express para restringir el acceso a roles específicos.
 *
 * @function permitirRoles
 * @param {...string} rolesPermitidos - Lista de roles autorizados para el recurso (ej. 'administrador', 'almacenista').
 * @returns {function(import('express').Request, import('express').Response, import('express').NextFunction): (Object|void)} 
 * Función middleware de Express que autoriza la petición o retorna una respuesta con estado HTTP 401 o 403.
 * @throws {Error} Retorna un JSON 401 si no se envía la cabecera de rol o 403 si el rol no tiene privilegios.
 */
const permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    /** @type {string|undefined} Rol enviado en las cabeceras HTTP de la petición */
    const rolUsuario = req.headers['x-user-role'] || req.body.userRole;

    if (!rolUsuario) {
      return res.status(401).json({
        mensaje: 'Acceso no autenticado. Inicia sesión para continuar.'
      });
    }

    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        mensaje: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}.`
      });
    }

    next();
  };
};

module.exports = {
  permitirRoles
};