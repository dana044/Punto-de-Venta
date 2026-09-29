/**
 * @file receiving.service.js
 * @description Registrar recepción de mercancía.
 * @author Jetzaly Josmery Tello Campos
 */

const { getPedidoByFolio, getPedidosPendientes } = require('../models/order.model.js');
const db = require('../config/db.js');

const listarPedidosPendientes = async () => {
  return await getPedidosPendientes();
};

const obtenerDetallePedido = async (folio) => {
  return await getPedidoByFolio(folio);
};

const registrarRecepcion = async (folio, itemsRecibidos) => {
  const pedido = await getPedidoByFolio(folio);

  if (!pedido) {
    return { ok: false, mensaje: `No se encontró el pedido con folio ${folio}.` };
  }

  if (pedido.estado === 'recibido') {
    return { ok: false, mensaje: `El pedido ${folio} ya fue recibido anteriormente.` };
  }

  if (!Array.isArray(itemsRecibidos) || itemsRecibidos.length === 0) {
    return { ok: false, mensaje: 'Debes capturar la cantidad recibida de al menos un producto.' };
  }

  const connection = await db.getConnection();
  
  try {
    // Iniciamos transacción para que stock y estado de pedido se guarden al mismo tiempo
    await connection.beginTransaction();

    for (const item of itemsRecibidos) {
      const { productoId, cantidadRecibida } = item;
      const cantidad = Number(cantidadRecibida) || 0;

      if (cantidad > 0) {
        // Incrementa el stock directamente en la tabla 'productos'
        await connection.execute(
          'UPDATE productos SET stock_almacen = stock_almacen + ? WHERE id = ?',
          [cantidad, productoId]
        );
      }
    }

    // Marca el pedido completo como recibido en la base de datos
    await connection.execute(
      'UPDATE pedidos SET estado = ?, fecha_recepcion = NOW() WHERE folio = ?',
      ['recibido', folio]
    );

    await connection.commit();
    pedido.estado = 'recibido'; 
    
    return { ok: true, pedido };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  listarPedidosPendientes,
  obtenerDetallePedido,
  registrarRecepcion
};