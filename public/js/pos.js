/**
 * @file pos.js
 * @description Controlador para calcular subtotal, descuentos y total en la venta.
 */

const API_BUSCAR_PRODUCTO = '/api/inventory/productos/buscar-pos';
const API_CALCULAR = '/api/pos/calcular';

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  if (userRole === 'almacenista') {
    alert('Acceso no autorizado para tu rol.');
    window.location.href = '/inventario';
    return;
  }

  configurarMenuPorRol(userRole);

  document.getElementById('btnLogout')?.addEventListener('click', (e) => {
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

  let carrito = [];

  // Función agregada por tus compañeros para controlar el menú lateral
  function configurarMenuPorRol(rol) {
    const menuPersonal = document.getElementById('menuPersonal');
    const menuInventario = document.getElementById('menuInventario');
    const menuRecepcion = document.getElementById('menuRecepcion');
    const menuProveedores = document.getElementById('menuProveedores')
    const menuPos = document.getElementById('menuPos');

    if (rol === 'administrador') {
      menuPersonal?.removeAttribute('hidden');
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      menuProveedores?.removeAttribute('hidden');
      menuPos?.removeAttribute('hidden');
    } else if (rol === 'almacenista') {
      if (menuPersonal) menuPersonal.hidden = true;
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      if (menuPos) menuPos.hidden = true;
    } else if (rol === 'cajero') {
      if (menuPersonal) menuPersonal.hidden = true;
      if (menuInventario) menuInventario.hidden = true;
      if (menuRecepcion) menuRecepcion.hidden = true;
      menuPos?.removeAttribute('hidden');
    }
  }

  /**
   * HU26 / HU49: Escucha el escáner de código de barras (tecla Enter).
   * Al escanear, busca directamente y agrega el producto.
   */
  inputBuscarProducto.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
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
      carritoBody.innerHTML = '<tr><td colspan="6" class="text-muted">El carrito esta vacio.</td></tr>';
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
      mostrarError('Error de comunicacion con el servidor.');
    }
  }

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
              <button class="btn-icon-delete btn-quitar-linea" data-index="${index}" title="Quitar">Quitar</button>
            </td>
          </tr>
        `;
      })
      .join('');

    document.querySelectorAll('.btn-quitar-linea').forEach((btn) => {
      btn.addEventListener('click', () => quitarLinea(Number(btn.dataset.index)));
    });
  }

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