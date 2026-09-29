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
        `INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad_solicitada, cantidad_recibida, costo_unitario, estado_linea)
         VALUES (?, ?, ?, 0, ?, 'pendiente')`,
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
    WHERE p.estado IN ('pendiente', 'incompleto')
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
 */
const registrarRecepcionMercancia = async (folio, itemsRecibidos) => {
  // Aquí se pide una conexión para iniciar la transacción
  const connection = await db.getConnection();
  
  try {
    // Inicia la transacción. Si algo falla más adelante, nada se guarda en la base de datos
    await connection.beginTransaction();
    
    // Busqueda del pedido usando su folio. El "FOR UPDATE" bloquea esta fila temporalmente 
    // para que nadie más la modifique mientras se hacen los cálculos
    const [pedidos] = await connection.execute(
      'SELECT id, estado FROM pedidos WHERE folio = ? FOR UPDATE',
      [folio]
    );
    
    // Si el arreglo está vacío, el folio no existe en la base de datos
    if (pedidos.length === 0) {
      throw new Error(`No se encontró el pedido con folio ${folio}.`);
    }
    const pedido = pedidos[0];
    
    // Esto es para proteger al sistema, para evitar que sumen mercancía a un pedido que ya se cerró
    if (pedido.estado === 'recibido') {
      throw new Error(`El pedido ${folio} ya fue recibido completamente.`);
    }

    // Bandera para saber si al final el pedido cambia a 'recibido' o se queda en 'incompleto'
    let todoCompleto = true;
    
    // Recorrer cada producto que el almacenista capturó en la pantalla
    for (const item of itemsRecibidos) {
      // Asegurarse de que la cantidad sea un número válido
      const cantRecibida = Number(item.cantidadRecibida) || 0;
      
      // Consulta de cuánto se pidió originalmente y cuánto ya se había recibido en días anteriores, por si el pedido llega en partes.
      // También bloqueamos esta fila con "FOR UPDATE" por seguridad.
      const [lineas] = await connection.execute(
        'SELECT cantidad_solicitada, cantidad_recibida FROM pedido_detalle WHERE pedido_id = ? AND producto_id = ? FOR UPDATE',
        [pedido.id, Number(item.productoId)]
      );
      
      // Si el producto no pertenece a este pedido, lo ignora y pasa al siguiente
      if (lineas.length === 0) continue; 

      const cantSolicitada = lineas[0].cantidad_solicitada || 0;
      const cantAnterior = lineas[0].cantidad_recibida || 0;
      
      // A la cantidad total reportada, se le resta lo que ya estaba registrado antes.
      // Así se obtienen solo las piezas nuevas que se registran en ese momento.
      const piezasNuevas = cantRecibida - cantAnterior;
      
      // Evalua si ya entregaron todas las piezas que se pidieron de ese producto en específico
      const estadoLinea = cantRecibida >= cantSolicitada ? 'completo' : 'incompleto';
      
      // Si falta aunque sea una pieza de un solo producto, todo el pedido general se marca como incompleto
      if (estadoLinea === 'incompleto') {
        todoCompleto = false;
      }
      
      // Sobrescribe el acumulado total y el estado de la línea en el detalle del pedido
      await connection.execute(
        `UPDATE pedido_detalle
          SET cantidad_recibida = ?, estado_linea = ?
         WHERE pedido_id = ? AND producto_id = ?`,
        [cantRecibida, estadoLinea, pedido.id, Number(item.productoId)]
      );
      
      // Por último, localiza la tabla del inventario principal y le suma solo la diferencia.
      // Esto evita que se dupliquen las sumas en entregas incompletas.
      if (piezasNuevas > 0) {
        await connection.execute(
          'UPDATE productos SET stock_almacen = stock_almacen + ? WHERE id = ?',
          [piezasNuevas, Number(item.productoId)]
        );
      }
    }
    
    // Evalua el estado general del pedido basado en la bandera que se usa en el ciclo
    const estadoFinal = todoCompleto ? 'recibido' : 'incompleto';
    
    // Actualiza el pedido con su estado final y la fecha del movimiento
    await connection.execute(
      'UPDATE pedidos SET estado = ?, fecha_recepcion = NOW() WHERE id = ?',
      [estadoFinal, pedido.id]
    );
    
    // Si llega hasta aquí sin errores, confirma todos los cambios en la base de datos
    await connection.commit();
    
    return {
      ok: true,
      folio,
      estado: estadoFinal
    };
  } catch (error) {
    // Si cualquier consulta falló, revertir todo para no dejar datos a medias
    await connection.rollback();
    throw error;
  } finally {    
    connection.release();
  }
};

module.exports = {
  crearPedido,
  getPedidosPendientes,
  getPedidoByFolio,
  registrarRecepcionMercancia
};