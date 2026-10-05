/**
 * @file receiving.service.js
 * @description Registrar recepción de mercancía adaptado a la 3FN (creación de lotes).
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

/**
 * Registra la recepción de mercancía actualizando el pedido y generando lotes en almacén (3FN).
 * Ya no actualiza columnas de stock directamente en la tabla productos.
 */
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
    await connection.beginTransaction();

    for (const item of itemsRecibidos) {
      const { productoId, cantidadRecibida } = item;
      const cantidad = Number(cantidadRecibida) || 0;

      if (cantidad > 0) {
        // En 3FN, la entrada de mercancía al almacén se registra creando un lote con estado 'registrado'
        await connection.execute(
          `INSERT INTO lotes_producto (producto_id, cantidad, fecha_caducidad, estado, recibido_en) 
           VALUES (?, ?, NULL, 'registrado', NOW())`,
          [Number(productoId), cantidad]
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