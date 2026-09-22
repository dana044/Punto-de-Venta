/**
 * @file order.model.js
 * @description Modelo en memoria de pedidos a proveedor y su detalle.
 * @author Jetzaly Josmery Tello Campos
 */

const { createProduct, products, getProveedores } = require('./product.model.js');

const productoPrueba1 = createProduct({
  nombre: 'Agua Mineral 600ml (prueba HU-14)',
  codigo_barras: '7501234500016',
  presentacion: 'Botella',
  unidad_medida: 'Pieza',
  precio: 15,
  proveedoresIds: [1]
});

const productoPrueba2 = createProduct({
  nombre: 'Jugo de Naranja 1L (prueba HU-14)',
  codigo_barras: '7501234500023',
  presentacion: 'Caja',
  unidad_medida: 'Litro',
  precio: 28,
  proveedoresIds: [2]
});

/** @type {Array<Object>} */
const pedidos = [
  {
    folio: 'OC-2026-001',
    proveedorId: 1,
    proveedorNombre: getProveedores().find((p) => p.id === 1)?.nombre ?? 'Proveedor 1',
    fecha: new Date().toISOString(),
    destino: 'almacen',
    estado: 'pendiente',
    items: [
      {
        productoId: productoPrueba1.id,
        productoNombre: productoPrueba1.nombre,
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
    proveedorNombre: getProveedores().find((p) => p.id === 2)?.nombre ?? 'Proveedor 2',
    fecha: new Date().toISOString(),
    destino: 'almacen',
    estado: 'pendiente',
    items: [
      {
        productoId: productoPrueba1.id,
        productoNombre: productoPrueba1.nombre,
        cantidadSolicitada: 30,
        cantidadRecibida: 0,
        costoUnitario: 10,
        estadoLinea: 'pendiente'
      },
      {
        productoId: productoPrueba2.id,
        productoNombre: productoPrueba2.nombre,
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
