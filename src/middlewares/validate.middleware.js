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

/**
 * Valida el cuerpo de la petición para confirmar una recepción de mercancía.
 *
 * @function validateRecepcion
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Object|void}
 */
const validateRecepcion = (req, res, next) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      mensaje: 'Debes capturar la cantidad recibida de al menos un producto.'
    });
  }

  const itemInvalido = items.find(
    (item) => item.productoId === undefined || item.cantidadRecibida === undefined || Number(item.cantidadRecibida) < 0
  );

  if (itemInvalido) {
    return res.status(400).json({
      mensaje: 'Cada producto debe incluir productoId y una cantidadRecibida válida (no negativa).'
    });
  }

  next();
};

/**
 * Valida el carrito enviado para recalcular subtotal, descuentos y total.
 *
 * @function validateCarrito
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Object|void}
 */
const validateCarrito = (req, res, next) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      mensaje: 'La venta debe tener al menos un producto para calcular los totales.'
    });
  }

  const tiposValidos = ['porcentaje', 'monto'];

  const itemInvalido = items.find((item) => {
    const cantidadInvalida = item.productoId === undefined || !item.cantidad || Number(item.cantidad) <= 0;
    const descuentoInvalido = item.descuentoTipo !== undefined && !tiposValidos.includes(item.descuentoTipo);
    return cantidadInvalida || descuentoInvalido;
  });

  if (itemInvalido) {
    return res.status(400).json({
      mensaje: 'Cada producto debe incluir productoId y una cantidad mayor a 0. El descuentoTipo, si se envía, debe ser "porcentaje" o "monto".'
    });
  }
}

/**
 * Roles válidos para un empleado, según RF02.
 * @constant {string[]}
 */
const ROLES_VALIDOS = ['administrador', 'cajero', 'almacenista'];
 
/**
 * Valida que la petición para registrar un empleado traiga todos los
 * campos obligatorios y que el rol sea uno de los tres permitidos (HU10).
 *
 * @function validateEmployee
 * @param {import('express').Request} req - Objeto de petición de Express.
 * @param {import('express').Response} res - Objeto de respuesta de Express.
 * @param {import('express').NextFunction} next - Función para transferir el control al siguiente middleware.
 * @returns {Object|void} Retorna respuesta con estado HTTP 400 en caso de validación fallida, o invoca next().
 */
const validateEmployee = (req, res, next) => {
  const { nombreCompleto, puesto, username, password, confirmarPassword, role } = req.body;
 
  if (!nombreCompleto || !puesto || !username || !password) {
    return res.status(400).json({
      mensaje: 'Falta información. Debes completar nombre completo, puesto, usuario y contraseña.'
    });
  }
 
  if (!ROLES_VALIDOS.includes(role)) {
    return res.status(400).json({
      mensaje: 'El rol debe ser administrador, cajero o almacenista.'
    });
  }
 
  if (password.length < 8) {
    return res.status(400).json({
      mensaje: 'La contraseña debe tener al menos 8 caracteres.'
    });
  }
 
  if (password !== confirmarPassword) {
    return res.status(400).json({
      mensaje: 'Las contraseñas no coinciden.'
    });
  }
 
  next();
};

module.exports = {
  validateProduct,
  validateRecepcion,
  validateCarrito,
  validateEmployee
};