/**
 * @file order.model.js
 * @description Modelo de persistencia para pedidos a proveedores y recepción de mercancía en MySQL.
 * @author Jetzaly Josmery Tello Campos & Stephanie Elizdeth Hernández Prieto
 */

const db = require('../config/db.js');

/**
 * Registra una orden de reabastecimiento en la base de datos en estado inicial 'pendiente' (HU-31).
 *
 * @async
 * @function crearPedido
 * @param {Object} ordenData - Datos de la orden generada.
 * @param {number|string} ordenData.proveedorId - Identificador del distribuidor.
 * @param {string} [ordenData.destino='almacen'] - Destino físico de la mercancía.
 * @param {Array<{productoId: number, cantidadSolicitada: number, costoUnitario: number}>} ordenData.items - Lista de artículos solicitados.
 * @returns {Promise<Object>} La orden creada con su folio correlativo generado.
 */
const crearPedido = async ({ proveedorId, destino = 'almacen', items }) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const anio = new Date().getFullYear();
    const folio = `OC-${anio}-${Date.now().toString().slice(-4)}`;
    const fecha = new Date();

    // 1. Insertar orden de compra (HU-31: estado 'pendiente')
    const [resPedido] = await connection.execute(
      `INSERT INTO pedidos (folio, proveedor_id, fecha, destino, estado)
       VALUES (?, ?, ?, ?, 'pendiente')`,
      [folio, Number(proveedorId), fecha, destino]
    );

    const pedidoId = resPedido.insertId;

    // 2. Insertar cada producto en el detalle del pedido
    for (const item of items) {
      await connection.execute(
        `INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad_solicitada, cantidad_recibida, costo_unitario)
         VALUES (?, ?, ?, 0, ?)`,
        [
          pedidoId,
          Number(item.productoId),
          Number(item.cantidadSolicitada),
          Number(item.costoUnitario)
        ]
      );
    }

    await connection.commit();

    return {
      id: pedidoId,
      folio,
      proveedorId,
      fecha,
      destino,
      estado: 'pendiente'
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Obtiene los pedidos pendientes o incompletos junto con sus líneas de productos (HU-32).
 *
 * @async
 * @function getPedidosPendientes
 * @returns {Promise<Array<Object>>} Lista de pedidos con detalle.
 */
const getPedidosPendientes = async () => {
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
    WHERE p.estado IN ('pendiente', 'incompleto', 'en_transito', 'cancelado')
    ORDER BY p.fecha DESC
  `;
  const [pedidos] = await db.execute(queryPedidos);

  for (const pedido of pedidos) {
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
  }

  return pedidos;
};

/**
 * Busca un pedido por folio con su información de proveedor y líneas de compra.
 *
 * @async
 * @function getPedidoByFolio
 * @param {string} folio - Folio único de la orden.
 * @returns {Promise<Object|null>}
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

/**
 * Registra la recepción física de mercancía, actualiza stock en productos y el estado del pedido.
 * @async
 * @function registrarRecepcionMercancia
 * @param {string} folio - Folio del pedido a recibir.
 * @param {Array<{productoId: number, cantidadRecibida: number}>} itemsRecibidos - Artículos recibidos en almacén.
 * @returns {Promise<Object>} Resultado de la transacción.
 */
const registrarRecepcionMercancia = async (folio, itemsRecibidos) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const [pedidos] = await connection.execute(
      'SELECT id, estado FROM pedidos WHERE folio = ? FOR UPDATE',
      [folio]
    );
    
    if (pedidos.length === 0) {
      throw new Error(`No se encontró el pedido con folio ${folio}.`);
    }
    const pedido = pedidos[0];
    
    if (pedido.estado === 'recibido') {
      throw new Error(`El pedido ${folio} ya fue recibido completamente.`);
    }

    let todoCompleto = true;
    
    for (const item of itemsRecibidos) {
      const cantRecibida = Number(item.cantidadRecibida) || 0;
      
      const [lineas] = await connection.execute(
        'SELECT cantidad_solicitada, cantidad_recibida FROM pedido_detalle WHERE pedido_id = ? AND producto_id = ? FOR UPDATE',
        [pedido.id, Number(item.productoId)]
      );
      
      if (lineas.length === 0) continue; 

      const cantSolicitada = lineas[0].cantidad_solicitada || 0;
      const cantAnterior = lineas[0].cantidad_recibida || 0;
      const piezasNuevas = cantRecibida - cantAnterior;
      
      const estadoLinea = cantRecibida >= cantSolicitada ? 'completo' : 'incompleto';
      
      if (estadoLinea === 'incompleto') {
        todoCompleto = false;
      }
      
      // Se actualiza únicamente la cantidad recibida (MySQL calcula 'estado_linea' automáticamente)
      await connection.execute(
        `UPDATE pedido_detalle
           SET cantidad_recibida = ?
         WHERE pedido_id = ? AND producto_id = ?`,
        [cantRecibida, pedido.id, Number(item.productoId)]
      );
      
      if (piezasNuevas > 0) {
        await connection.execute(
          "INSERT INTO lotes_producto (producto_id, cantidad, fecha_caducidad, estado, recibido_en) VALUES (?, ?, NULL, 'pendiente', NOW())",
          [Number(item.productoId), piezasNuevas]
        );
      }
    }
    
    const estadoFinal = todoCompleto ? 'recibido' : 'incompleto';
    
    await connection.execute(
      'UPDATE pedidos SET estado = ?, fecha_recepcion = NOW() WHERE id = ?',
      [estadoFinal, pedido.id]
    );
    
    await connection.commit();
    
    return {
      ok: true,
      folio,
      estado: estadoFinal
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {    
    connection.release();
  }
};

/**
 * @async
 * @function updateEstadoPedido
 * @param {string} folio - Folio único del pedido a actualizar.
 * @param {string} nuevoEstado - El nuevo estado que se le asignará al pedido.
 * @returns {Promise<boolean>} True si el pedido se actualizó correctamente, false si no se encontró.
 */
const updateEstadoPedido = async (folio, nuevoEstado) => {
  const [result] = await db.execute(
    'UPDATE pedidos SET estado = ? WHERE folio = ?',
    [nuevoEstado, folio]
  );
  
  return result.affectedRows > 0;
};

module.exports = {
  crearPedido,
  getPedidosPendientes,
  getPedidoByFolio,
  registrarRecepcionMercancia,
  updateEstadoPedido
};