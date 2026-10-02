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

module.exports = {
  getAlertas
};