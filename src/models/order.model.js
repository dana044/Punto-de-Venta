/**
 * @file order.model.js
 * @description Modelo en memoria de pedidos a proveedor y su detalle (Datos Mockeados sin dependencias).
 * @author Jetzaly Josmery Tello Campos
 */
const db = require('../config/db.js');

/**
 * Obtiene los pedidos pendientes y reconstruye la estructura con sus items.
 */
const getPedidosPendientes = async () => {
  // 1. Obtenemos los pedidos junto con el nombre de su proveedor
  const queryPedidos = `
    SELECT 
      p.id, 
      p.folio, 
      p.fecha, 
      p.destino, 
      p.estado, 
      prov.nombre AS proveedorNombre
    FROM pedidos p
    JOIN proveedores prov ON p.proveedor_id = prov.id
    WHERE p.estado IN ('pendiente', 'incompleto')
  `;
  const [pedidos] = await db.execute(queryPedidos);

  // 2. Por cada pedido, buscamos sus productos (detalle) y los anidamos
  for (let pedido of pedidos) {
    const queryItems = `
      SELECT 
        pd.producto_id AS productoId,
        prod.nombre AS productoNombre,
        pd.cantidad_solicitada AS cantidadSolicitada,
        pd.cantidad_recibida AS cantidadRecibida,
        pd.costo_unitario AS costoUnitario,
        pd.estado_linea AS estadoLinea
      FROM pedido_detalle pd
      JOIN productos prod ON pd.producto_id = prod.id
      WHERE pd.pedido_id = ?
    `;
    const [items] = await db.execute(queryItems, [pedido.id]);
    
    // Agregamos el arreglo de items al objeto del pedido para que el frontend pueda leerlo
    pedido.items = items;
  }

  return pedidos;
};

/**
 * Busca un pedido específico por su folio, incluyendo sus items.
 */
const getPedidoByFolio = async (folio) => {
  const queryPedido = `
    SELECT 
      p.id, 
      p.folio, 
      p.fecha, 
      p.destino, 
      p.estado, 
      prov.nombre AS proveedorNombre
    FROM pedidos p
    JOIN proveedores prov ON p.proveedor_id = prov.id
    WHERE p.folio = ? 
    LIMIT 1
  `;
  const [rows] = await db.execute(queryPedido, [folio]);

  if (rows.length === 0) return null;

  const pedido = rows[0];

  // Buscamos los items de este pedido específico
  const queryItems = `
    SELECT 
      pd.producto_id AS productoId,
      prod.nombre AS productoNombre,
      pd.cantidad_solicitada AS cantidadSolicitada,
      pd.cantidad_recibida AS cantidadRecibida,
      pd.costo_unitario AS costoUnitario,
      pd.estado_linea AS estadoLinea
    FROM pedido_detalle pd
    JOIN productos prod ON pd.producto_id = prod.id
    WHERE pd.pedido_id = ?
  `;
  const [items] = await db.execute(queryItems, [pedido.id]);
  
  pedido.items = items;

  return pedido;
};

module.exports = {
  getPedidosPendientes,
  getPedidoByFolio
};