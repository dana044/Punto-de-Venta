/**
 * Punto de Venta UV - Middlewares para la validación.
 * Intercepta las peticiones para verificar que los datos estén completos.
 */

/**
 * Valida que el cuerpo de la petición contenga los datos básicos de un producto (HU-06).
 * @param {Object} req - Petición de Express.
 * @param {Object} res - Respuesta de Express.
 * @param {Function} next - Función para continuar con el controlador.
 * @returns {Object|void} Retorna error 400 si faltan datos, de lo contrario llama a next().
 */
const validateProduct = (req, res, next) => {
  const { nombre, codigo_barras, presentacion, unidad_medida, precio } = req.body;

  if (!nombre || !codigo_barras || !presentacion || !unidad_medida || !precio) {
    return res.status(400).json({
      mensaje: 'Falta información. Debes completar nombre, código de barras, presentación, unidad de medida y precio.'
    });
  }

  next();
};

module.exports = {
  validateProduct
};