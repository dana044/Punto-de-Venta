/**
 * @file validate.middleware.js
 * @description Interceptores para la validacion de integridad de datos de entrada (Adaptado a 3FN).
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

/**
 * Valida que la peticion contenga los atributos del producto y los IDs de catálogos requeridos (3FN).
 */
const validateProduct = (req, res, next) => {
  const { nombre, codigo_barras, categoria_id, presentacion, unidad_medida_id, precio, proveedoresIds } = req.body;

  if (!nombre || !codigo_barras || !presentacion || !categoria_id || !unidad_medida_id || precio === undefined || precio === null) {
    return res.status(400).json({
      mensaje: 'Falta información básica. Debes completar nombre, código de barras, presentación, categoría, unidad de medida y precio.'
    });
  }

  if (isNaN(Number(categoria_id)) || isNaN(Number(unidad_medida_id))) {
    return res.status(400).json({
      mensaje: 'La categoría y la unidad de medida deben ser identificadores válidos (IDs).'
    });
  }

  if (!proveedoresIds || !Array.isArray(proveedoresIds) || proveedoresIds.length === 0) {
    return res.status(400).json({
      mensaje: 'Debes asociar al menos un distribuidor o proveedor al producto.'
    });
  }

  next();
};

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
 * Roles válidos basados en IDs numéricos de la tabla roles (1: admin, 2: cajero, 3: almacenista).
 */
const ROLES_VALIDOS_IDS = [1, 2, 3];

const validateEmployee = (req, res, next) => {
  const { nombreCompleto, correo, rolId, password, confirmarPassword } = req.body;

  if (!nombreCompleto || !correo || !rolId || !password) {
    return res.status(400).json({
      mensaje: 'Falta información. Debes completar nombre completo, correo, rol y contraseña.'
    });
  }

  if (!ROLES_VALIDOS_IDS.includes(Number(rolId))) {
    return res.status(400).json({
      mensaje: 'El ID de rol seleccionado no es válido.'
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

const validateAjuste = (req, res, next) => {
  const { cantidad, tipoAjuste, motivo } = req.body;
  const tiposValidos = ['merma', 'daño', 'ingreso_manual', 'conteo', 'transferencia_mostrador', 'transferencia_almacen'];

  if (cantidad === undefined || isNaN(cantidad) || Number(cantidad) < 0) {
    return res.status(400).json({ mensaje: 'Debes enviar una cantidad válida mayor o igual a cero.' });
  }

  if (!tiposValidos.includes(tipoAjuste)) {
    return res.status(400).json({ mensaje: `El tipo de ajuste debe ser uno de: ${tiposValidos.join(', ')}.` });
  }

  if (!motivo || motivo.trim() === '') {
    return res.status(400).json({ mensaje: 'Debes incluir un motivo para auditar este ajuste.' });
  }

  next();
};

module.exports = {
  validateProduct,
  validateRecepcion,
  validateCarrito,
  validateEmployee,
  validateAjuste
};