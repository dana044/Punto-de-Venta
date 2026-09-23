/**
 * @file validate.middleware.js
 * @description Interceptores para la validacion de integridad de datos de entrada.
 */

/**
 * Valida que la peticion contenga los atributos del producto y al menos un distribuidor vinculado.
 *
 * @function validateProduct
 * @param {import('express').Request} req - Objeto de peticion de Express.
 * @param {import('express').Response} res - Objeto de respuesta de Express.
 * @param {import('express').NextFunction} next - Funcion para transferir el control al siguiente middleware.
 * @returns {Object|void} Retorna respuesta con estado HTTP 400 en caso de fallo, o continua con next().
 */
const validateProduct = (req, res, next) => {
  const { nombre, codigo_barras, presentacion, unidad_medida, precio, proveedoresIds } = req.body;

  if (!nombre || !codigo_barras || !presentacion || !unidad_medida || precio === undefined || precio === null) {
    return res.status(400).json({
      mensaje: 'Falta informacion basica. Debes completar nombre, codigo de barras, presentacion, unidad de medida y precio.'
    });
  }

  if (!proveedoresIds || !Array.isArray(proveedoresIds) || proveedoresIds.length === 0) {
    return res.status(400).json({
      mensaje: 'Debes asociar al menos un distribuidor o proveedor al producto.'
    });
  }

  next();
};

/**
 * Valida el cuerpo de la peticion para confirmar una recepcion de mercancia.
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
      mensaje: 'Cada producto debe incluir productoId y una cantidadRecibida valida (no negativa).'
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
      mensaje: 'Cada producto debe incluir productoId y una cantidad mayor a 0. El descuentoTipo, si se envia, debe ser "porcentaje" o "monto".'
    });
  }

  next();
};

/**
 * Roles autorizados para el registro de empleados.
 * @constant {string[]}
 */
const ROLES_VALIDOS = ['administrador', 'cajero', 'almacenista'];

/**
 * Valida la captura de datos y contrasenas al registrar empleados.
 *
 * @function validateEmployee
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Object|void}
 */
const validateEmployee = (req, res, next) => {
  const { nombreCompleto, puesto, username, password, confirmarPassword, role } = req.body;

  if (!nombreCompleto || !puesto || !username || !password) {
    return res.status(400).json({
      mensaje: 'Falta informacion. Debes completar nombre completo, puesto, usuario y contrasena.'
    });
  }

  if (!ROLES_VALIDOS.includes(role)) {
    return res.status(400).json({
      mensaje: 'El rol debe ser administrador, cajero o almacenista.'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      mensaje: 'La contrasena debe tener al menos 8 caracteres.'
    });
  }

  if (password !== confirmarPassword) {
    return res.status(400).json({
      mensaje: 'Las contrasenas no coinciden.'
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