/**
 * @file alerts.model.js
 * @description Modelo para las alertas automáticas de stock bajo.
 * @author Jetzaly Josmery Tello Campos
 */

const db = require('../config/db.js');

const UMBRAL_MINIMO_ALMACEN = 10;
const UMBRAL_MINIMO_MOSTRADOR = 5;

const getAlertas = async () => {
  // Unimos productos con lotes_producto para sumar el stock real del almacén
  const query = `
    SELECT 
      p.id, 
      p.nombre, 
      p.stock_mostrador,
      COALESCE(SUM(l.cantidad), 0) AS stock_almacen
    FROM productos p
    LEFT JOIN lotes_producto l ON p.id = l.producto_id
    WHERE p.activo = 1
    GROUP BY p.id, p.nombre, p.stock_mostrador
    HAVING stock_almacen <= ? OR p.stock_mostrador <= ?
    ORDER BY p.nombre ASC
  `;

  const [rows] = await db.execute(query, [UMBRAL_MINIMO_ALMACEN, UMBRAL_MINIMO_MOSTRADOR]);

  const alertas = [];

  rows.forEach((producto) => {
    // Verificamos el stock calculado del almacén
    if (producto.stock_almacen <= UMBRAL_MINIMO_ALMACEN) {
      alertas.push({
        productoId: producto.id,
        productoNombre: producto.nombre,
        ubicacion: 'almacen',
        existencia: producto.stock_almacen,
        minimo: UMBRAL_MINIMO_ALMACEN
      });
    }

    // Verificamos el stock_mostrador directo de la tabla productos
    if (producto.stock_mostrador <= UMBRAL_MINIMO_MOSTRADOR) {
      alertas.push({
        productoId: producto.id,
        productoNombre: producto.nombre,
        ubicacion: 'mostrador',
        existencia: producto.stock_mostrador,
        minimo: UMBRAL_MINIMO_MOSTRADOR
      });
    }
  });

  return alertas;
};

const UMBRAL_CADUCIDAD_DIAS = 7;
/**
 * Lista los productos con al menos un lote vigente (cantidad > 0) cuya
 * fecha de caducidad ya pasó o está dentro del umbral fijo de días. Si un
 * producto tiene varios lotes próximos a vencer, se reporta solo el más
 * próximo (el que primero hay que vender o dar de baja).
 *
 * @async
 * @function getAlertasCaducidad
 * @returns {Promise<Array<{productoId: number, productoNombre: string, fechaCaducidad: string, diasRestantes: number}>>}
 */
const getAlertasCaducidad = async () => {
  const query = `
    SELECT 
      p.id,
      p.nombre,
      MIN(l.fecha_caducidad) AS fecha_caducidad
    FROM productos p
    JOIN lotes_producto l ON l.producto_id = p.id
    WHERE p.activo = 1
      AND l.cantidad > 0
      AND l.fecha_caducidad IS NOT NULL
      AND l.fecha_caducidad <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
    GROUP BY p.id, p.nombre
    ORDER BY fecha_caducidad ASC
  `;
 
  const [rows] = await db.execute(query, [UMBRAL_CADUCIDAD_DIAS]);
 
  const hoy = new Date();
  return rows.map((producto) => {
    const fechaCad = new Date(producto.fecha_caducidad);
    const diasRestantes = Math.ceil((fechaCad - hoy) / (1000 * 60 * 60 * 24));
 
    return {
      productoId: producto.id,
      productoNombre: producto.nombre,
      fechaCaducidad: producto.fecha_caducidad,
      diasRestantes
    };
  });
};
 
module.exports = {
  getAlertas,
  getAlertasCaducidad
};