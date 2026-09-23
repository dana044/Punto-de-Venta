/**
 * @file order.model.js
 * @description Modelo en memoria de pedidos a proveedor y su detalle (Datos Mockeados sin dependencias).
 * @author Jetzaly Josmery Tello Campos
 */

// Se quitaron las importaciones de product.model.js para evitar choques de asincronía.

/** @type {Array<Object>} */
const pedidos = [
  {
    folio: 'OC-2026-001',
    proveedorId: 1,
    proveedorNombre: 'Distribuidora Central Papelera S.A.',
    fecha: new Date().toISOString(),
    destino: 'almacen',
    estado: 'pendiente',
    items: [
      {
        productoId: 1, // Usamos IDs fijos
        productoNombre: 'Agua Mineral 600ml (prueba HU-14)',
        cantidadSolicitada: 50,
        cantidadRecibida: 0,
        costoUnitario: 10,
        estadoLinea: 'pendiente'
      }
    ]
  },
  {
    folio: 'OC-2026-002',
    proveedorId: 2,
    proveedorNombre: 'Abarrotes y Suministros del Golfo', // Texto directo (Error corregido aquí)
    fecha: new Date().toISOString(),
    destino: 'almacen',
    estado: 'pendiente',
    items: [
      {
        productoId: 1,
        productoNombre: 'Agua Mineral 600ml (prueba HU-14)',
        cantidadSolicitada: 30,
        cantidadRecibida: 0,
        costoUnitario: 10,
        estadoLinea: 'pendiente'
      },
      {
        productoId: 2, // Usamos IDs fijos
        productoNombre: 'Jugo de Naranja 1L (prueba HU-14)',
        cantidadSolicitada: 20,
        cantidadRecibida: 0,
        costoUnitario: 18,
        estadoLinea: 'pendiente'
      }
    ]
  }
];

const getPedidosPendientes = () => pedidos.filter((p) => p.estado === 'pendiente' || p.estado === 'incompleto');
const getPedidoByFolio = (folio) => pedidos.find((p) => p.folio === folio);

module.exports = {
  pedidos,
  getPedidosPendientes,
  getPedidoByFolio
};