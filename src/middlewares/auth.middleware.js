/**
 * @file auth.middleware.js
 * @description Middleware de autorizacion y control de acceso basado en roles.
 * Protege las rutas verificando el rol del usuario antes de permitir el paso al controlador.
 */

/**
 * Genera un middleware de Express para restringir el acceso a roles especificos.
 *
 * @function permitirRoles
 * @param {...string} rolesPermitidos - Lista de roles autorizados para el recurso.
 * @returns {function(import('express').Request, import('express').Response, import('express').NextFunction): (Object|void)} 
 * Funcion middleware de Express que autoriza la peticion o retorna estado HTTP 401 o 403.
 * @throws {Error} Retorna JSON 401 si no se envia la cabecera de rol o 403 si el rol carece de privilegios.
 */
const permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    /** @type {string|undefined} Rol enviado en las cabeceras HTTP o en el cuerpo */
    const rolUsuario = req.headers['x-user-role'] || req.body.userRole;

    if (!rolUsuario) {
      return res.status(401).json({
        mensaje: 'Acceso no autenticado. Inicia sesion para continuar.'
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