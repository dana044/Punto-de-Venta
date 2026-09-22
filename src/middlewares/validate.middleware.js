/**
 * @file validate.middleware.js
 * @description Interceptores para la validación de integridad de datos de entrada.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

/**
 * Valida que la petición contenga los atributos del producto y al menos un distribuidor (HU-06 y HU-11).
 *
 * @function validateProduct
 * @param {import('express').Request} req - Objeto de petición de Express.
 * @param {import('express').Response} res - Objeto de respuesta de Express.
 * @param {import('express').NextFunction} next - Función para transferir el control al siguiente middleware.
 * @returns {Object|void} Retorna respuesta con estado HTTP 400 en caso de validación fallida, o invoca next().
 */
const validateProduct = (req, res, next) => {
  const { nombre, codigo_barras, presentacion, unidad_medida, precio, proveedoresIds } = req.body;

  if (!nombre || !codigo_barras || !presentacion || !unidad_medida || !precio) {
    return res.status(400).json({
      mensaje: 'Falta información. Debes completar nombre, código de barras, presentación, unidad de medida y precio.'
    });
  }

  if (!proveedoresIds || !Array.isArray(proveedoresIds) || proveedoresIds.length === 0) {
    return res.status(400).json({
      mensaje: 'Debes asociar al menos un distribuidor/proveedor al producto (HU-11).'
    });
  }

  next();
};

module.exports = {
  validateProduct
};