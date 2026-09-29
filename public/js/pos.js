/**
 * @file pos.js
 * @description Controlador para calcular subtotal, descuentos y total (HU-27),
 * e ingresar productos mediante código de barras o búsqueda manual (HU-26, HU-49).
 */

const API_BUSCAR_PRODUCTO = '/api/inventory/productos/buscar';
const API_CALCULAR = '/api/pos/calcular';

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  if (userRole === 'administrador') {
    const menuAdmin = document.getElementById('menuAdmin');
    if (menuAdmin) menuAdmin.hidden = false;
  }

  document.getElementById('btnLogout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login';
  });

  const alerta = document.getElementById('alertMessage');
  const inputBuscarProducto = document.getElementById('inputBuscarProducto');
  const inputCantidad = document.getElementById('inputCantidad');
  const selectDescuentoTipo = document.getElementById('selectDescuentoTipo');
  const inputDescuentoValor = document.getElementById('inputDescuentoValor');
  const btnAgregar = document.getElementById('btnAgregar');
  const carritoBody = document.getElementById('carritoBody');

  /**
   * Carrito en memoria del navegador.
   * @type {Array<{productoId:number, productoNombre:string, cantidad:number, descuentoTipo:string, descuentoValor:number}>}
   */
  let carrito = [];

  /**
   * HU26 / HU49: Escucha el escáner de código de barras (tecla Enter).
   * Al escanear, busca directamente y agrega el producto.
   */
  inputBuscarProducto.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evitar que el enter haga submit de un formulario accidentalmente
      await buscarYAgregarProducto(inputBuscarProducto.value.trim());
    }
  });

  /**
   * HU26: También permite agregar el producto haciendo clic en el botón.
   */
  btnAgregar.addEventListener('click', async () => {
    await buscarYAgregarProducto(inputBuscarProducto.value.trim());
  });

  /**
   * HU26 / HU49: Realiza la búsqueda del producto en el backend por código o nombre
   * y lo añade a la lista de cobro.
   * @param {string} query Término de búsqueda (código de barras o nombre)
   */
  async function buscarYAgregarProducto(query) {
    if (!query) {
      mostrarError('Ingresa un código de barras o nombre de producto.');
      return;
    }

    try {
      // Llamada al nuevo endpoint de búsqueda que crearemos en el backend
      const res = await fetch(`${API_BUSCAR_PRODUCTO}?q=${encodeURIComponent(query)}`, {
        headers: { 'x-user-role': userRole }
      });
      
      const data = await res.json();

      if (!res.ok || !data.producto) {
        mostrarError(data.mensaje || 'Producto no encontrado o inactivo.');
        return;
      }

      const producto = data.producto;
      const cantidad = Number(inputCantidad.value) || 1;

      // Agrega el producto al carrito
      carrito.push({
        productoId: producto.id,
        productoNombre: producto.nombre,
        cantidad,
        descuentoTipo: selectDescuentoTipo.value,
        descuentoValor: Number(inputDescuentoValor.value) || 0
      });

      // Limpia los inputs para permitir un nuevo escaneo inmediatamente (HU-49)
      inputBuscarProducto.value = '';
      inputCantidad.value = 1;
      inputDescuentoValor.value = 0;
      inputBuscarProducto.focus();

      recalcular();
    } catch (err) {
      mostrarError('Error al comunicarse con el servidor para buscar el producto.');
    }
  }

  /**
   * Quita una línea del carrito por su posición y vuelve a recalcular.
   * @param {number} index
   */
  function quitarLinea(index) {
    carrito.splice(index, 1);
    recalcular();
    inputBuscarProducto.focus(); // Retorna el foco al escáner tras eliminar (HU49)
  }

  /**
   * Envía el carrito actual a /api/pos/calcular (HU-27) y pinta la tabla y
   * los totales con la respuesta del backend.
   */
  async function recalcular() {
    if (carrito.length === 0) {
      carritoBody.innerHTML = '<tr><td colspan="6" class="text-muted">El carrito está vacío.</td></tr>';
      pintarTotales({ subtotal: 0, descuentos: 0, iva: 0, total: 0 });
      return;
    }

    try {
      const res = await fetch(API_CALCULAR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ items: carrito })
      });

      const data = await res.json();

      if (!res.ok) {
        mostrarError(data.mensaje || 'No se pudo calcular la venta.');
        return;
      }

      alerta.hidden = true; // Ocultar alerta si todo sale bien
      pintarCarrito(data.items);
      pintarTotales(data);
    } catch (err) {
      mostrarError('Error de comunicación con el servidor.');
    }
  }

  /**
   * Dibuja la tabla del carrito con los importes ya calculados por el backend.
   * @param {Array<Object>} items
   */
  function pintarCarrito(items) {
    carritoBody.innerHTML = items
      .map((item, index) => {
        const etiquetaDescuento = item.descuentoTipo === 'porcentaje'
          ? `${item.descuentoValor}%`
          : `$${item.descuentoValor.toFixed(2)}`;

        return `
          <tr>
            <td>${item.productoNombre}</td>
            <td>${item.cantidad}</td>
            <td>$${item.precioUnitario.toFixed(2)}</td>
            <td>${etiquetaDescuento} (-$${item.descuentoLinea.toFixed(2)})</td>
            <td>$${item.totalLinea.toFixed(2)}</td>
            <td class="btn-icon-delete-cell">
              <button class="btn-icon-delete btn-quitar-linea" data-index="${index}" title="Quitar">🗑</button>
            </td>
          </tr>
        `;
      })
      .join('');

    document.querySelectorAll('.btn-quitar-linea').forEach((btn) => {
      btn.addEventListener('click', () => quitarLinea(Number(btn.dataset.index)));
    });
  }

  /**
   * Actualiza el resumen de subtotal, descuentos, IVA y total.
   * @param {{subtotal:number, descuentos:number, iva:number, total:number}} totales
   */
  function pintarTotales(totales) {
    document.getElementById('totSubtotal').textContent = `$${totales.subtotal.toFixed(2)}`;
    document.getElementById('totDescuentos').textContent = `-$${totales.descuentos.toFixed(2)}`;
    document.getElementById('totIva').textContent = `$${totales.iva.toFixed(2)}`;
    document.getElementById('totTotal').textContent = `$${totales.total.toFixed(2)}`;
  }

  function mostrarError(mensaje) {
    alerta.textContent = mensaje;
    alerta.hidden = false;
  }
});