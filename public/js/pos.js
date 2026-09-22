/**
 * @file pos.js
 * @description Controlador para calcular subtotal,
 * descuentos y total
 */

const API_PRODUCTOS = '/api/inventory/productos';
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
  const selectProducto = document.getElementById('selectProducto');
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

  /** @type {Array<Object>} Catálogo de productos cargado desde el backend. */
  let catalogo = [];

  cargarProductos();

  /**
   * Carga el catálogo real de productos para poblar el selector.
   */
  async function cargarProductos() {
    try {
      const res = await fetch(API_PRODUCTOS);
      const data = await res.json();
      catalogo = data.productos || [];

      if (catalogo.length === 0) {
        selectProducto.innerHTML = '<option value="">No hay productos registrados</option>';
        btnAgregar.disabled = true;
        return;
      }

      selectProducto.innerHTML = catalogo
        .map((p) => `<option value="${p.id}">${p.nombre} — $${p.precio}</option>`)
        .join('');
    } catch (err) {
      mostrarError('No se pudo cargar el catálogo de productos.');
    }
  }

  btnAgregar.addEventListener('click', () => {
    const productoId = Number(selectProducto.value);
    const producto = catalogo.find((p) => p.id === productoId);
    const cantidad = Number(inputCantidad.value);

    if (!producto || !cantidad || cantidad <= 0) {
      mostrarError('Selecciona un producto y una cantidad válida.');
      return;
    }

    carrito.push({
      productoId,
      productoNombre: producto.nombre,
      cantidad,
      descuentoTipo: selectDescuentoTipo.value,
      descuentoValor: Number(inputDescuentoValor.value) || 0
    });

    inputCantidad.value = 1;
    inputDescuentoValor.value = 0;

    recalcular();
  });

  /**
   * Quita una línea del carrito por su posición y vuelve a recalcular.
   * @param {number} index
   */
  function quitarLinea(index) {
    carrito.splice(index, 1);
    recalcular();
  }

  /**
   * Envía el carrito actual a /api/pos/calcular (HU-27) y pinta la tabla y
   * los totales con la respuesta del backend. Se llama cada vez que el
   * carrito cambia (agregar o quitar un producto), tal como pide el
   * criterio de aceptación de la historia.
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

      alerta.hidden = true;
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
