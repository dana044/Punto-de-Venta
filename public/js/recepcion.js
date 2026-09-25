/**
 * @file recepcion.js
 * @description Controlador del cliente para emisión (HU-31) y seguimiento/recepción de pedidos (HU-32).
 */

const API_PEDIDOS = '/api/receiving/pedidos';
const API_PROVEEDORES = '/api/inventory/proveedores';
const API_PRODUCTOS = '/api/inventory/productos';

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  if (userRole === 'cajero') {
    alert('Acceso no autorizado para tu rol.');
    window.location.href = '/pos';
    return;
  }

  configurarMenuPorRol(userRole);

  document.getElementById('btnLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login';
  });

  const pedidosContainer = document.getElementById('pedidosContainer');
  const alerta = document.getElementById('alertMessage');

  // Modal Recepción (HU-32)
  const modalRecepcion = document.getElementById('modalRecepcion');
  const modalFolio = document.getElementById('modalFolio');
  const modalProveedor = document.getElementById('modalProveedor');
  const modalItemsBody = document.getElementById('modalItemsBody');
  const modalTotal = document.getElementById('modalTotal');
  const btnConfirmar = document.getElementById('btnConfirmar');
  const btnRechazar = document.getElementById('btnRechazar');
  const btnCerrarModal = document.getElementById('btnCerrarModal');

  // Modal Nuevo Pedido (HU-31)
  const modalNuevoPedido = document.getElementById('modalNuevoPedido');
  const btnNuevoPedido = document.getElementById('btnNuevoPedido');
  const btnCerrarModalNuevo = document.getElementById('btnCerrarModalNuevo');
  const btnCancelarNuevo = document.getElementById('btnCancelarNuevo');
  const btnGuardarPedido = document.getElementById('btnGuardarPedido');
  const selectProveedorPedido = document.getElementById('selectProveedorPedido');
  const selectProductoPedido = document.getElementById('selectProductoPedido');
  const inputCantidadSolicitada = document.getElementById('inputCantidadSolicitada');
  const inputCostoUnitario = document.getElementById('inputCostoUnitario');
  const alertaModalPedido = document.getElementById('alertaModalPedido');

  let pedidoActual = null;

  cargarPedidosPendientes();

  function configurarMenuPorRol(rol) {
    const menuPersonal = document.getElementById('menuPersonal');
    const menuInventario = document.getElementById('menuInventario');
    const menuRecepcion = document.getElementById('menuRecepcion');
    const menuPos = document.getElementById('menuPos');

    if (rol === 'administrador') {
      menuPersonal?.removeAttribute('hidden');
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      menuPos?.removeAttribute('hidden');
    } else if (rol === 'almacenista') {
      if (menuPersonal) menuPersonal.hidden = true;
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      if (menuPos) menuPos.hidden = true;
    }
  }

  // ==========================================================================
  // HU-32: LISTADO Y CONFIRMACIÓN DE RECEPCIÓN
  // ==========================================================================
  async function cargarPedidosPendientes() {
    try {
      const res = await fetch(API_PEDIDOS, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok || !data.pedidos || data.pedidos.length === 0) {
        pedidosContainer.innerHTML = '<span class="text-muted">No hay pedidos pendientes de recibir.</span>';
        return;
      }

      pedidosContainer.innerHTML = '';
      data.pedidos.forEach((pedido) => {
        const card = document.createElement('div');
        card.className = 'pedido-card';
        card.innerHTML = `
          <div class="pedido-card__header">
            <div>
              <div class="pedido-card__folio">${pedido.folio}</div>
              <div class="text-muted" style="font-size: 0.85rem;">${pedido.proveedorNombre} · ${pedido.items.length} producto(s)</div>
            </div>
            <span class="badge ${pedido.estado === 'incompleto' ? 'badge--warning' : 'badge--success'}">
              ${pedido.estado === 'incompleto' ? 'Incompleto' : 'Pendiente'}
            </span>
          </div>
          <button class="btn btn--primary btn-abrir-recepcion" data-folio="${pedido.folio}">
            Registrar Recepción
          </button>
        `;
        pedidosContainer.appendChild(card);
      });

      document.querySelectorAll('.btn-abrir-recepcion').forEach((btn) => {
        btn.addEventListener('click', () => abrirModalRecepcion(btn.dataset.folio));
      });
    } catch (err) {
      pedidosContainer.innerHTML = '<span class="text-muted">Error de conexión al obtener los pedidos.</span>';
    }
  }

  async function abrirModalRecepcion(folio) {
    try {
      const res = await fetch(`${API_PEDIDOS}/${folio}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok || !data.pedido) {
        mostrarAlerta('No se pudo cargar el detalle del pedido.', 'error');
        return;
      }

      pedidoActual = data.pedido;
      modalFolio.textContent = `Recepción de Orden de Compra — ${pedidoActual.folio}`;
      modalProveedor.textContent = pedidoActual.proveedorNombre;

      modalItemsBody.innerHTML = '';
      pedidoActual.items.forEach((item) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
          <td>${item.productoNombre}</td>
          <td>${item.cantidadSolicitada}</td>
          <td>
            <input
              type="number"
              min="0"
              class="input-cantidad-recibida"
              data-producto-id="${item.productoId}"
              data-costo="${item.costoUnitario}"
              value="${item.cantidadSolicitada}"
            />
          </td>
          <td>$${Number(item.costoUnitario).toFixed(2)}</td>
          <td class="subtotal-linea">$${(item.cantidadSolicitada * item.costoUnitario).toFixed(2)}</td>
        `;
        modalItemsBody.appendChild(fila);
      });

      document.querySelectorAll('.input-cantidad-recibida').forEach((input) => {
        input.addEventListener('input', recalcularTotal);
      });

      recalcularTotal();
      modalRecepcion.classList.remove('modal--hidden');
    } catch (err) {
      mostrarAlerta('Error de conexión al obtener el detalle del pedido.', 'error');
    }
  }

  function recalcularTotal() {
    let total = 0;
    document.querySelectorAll('.input-cantidad-recibida').forEach((input) => {
      const fila = input.closest('tr');
      const costo = Number(input.dataset.costo);
      const cantidad = Number(input.value) || 0;
      const subtotal = cantidad * costo;
      fila.querySelector('.subtotal-linea').textContent = `$${subtotal.toFixed(2)}`;
      total += subtotal;
    });
    modalTotal.textContent = `$${total.toFixed(2)}`;
  }

  function cerrarModalRecepcion() {
    modalRecepcion.classList.add('modal--hidden');
    pedidoActual = null;
  }

  btnCerrarModal?.addEventListener('click', cerrarModalRecepcion);
  btnRechazar?.addEventListener('click', cerrarModalRecepcion);

  btnConfirmar?.addEventListener('click', async () => {
    if (!pedidoActual) return;

    const items = Array.from(document.querySelectorAll('.input-cantidad-recibida')).map((input) => ({
      productoId: Number(input.dataset.productoId),
      cantidadRecibida: Number(input.value) || 0
    }));

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Guardando...';

    try {
      const res = await fetch(`${API_PEDIDOS}/${pedidoActual.folio}/confirmar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({ items })
      });

      const data = await res.json();

      if (res.ok) {
        mostrarAlerta(data.mensaje, 'success');
        cerrarModalRecepcion();
        cargarPedidosPendientes();
      } else {
        mostrarAlerta(data.mensaje || 'Error al registrar la recepción.', 'error');
      }
    } catch (err) {
      mostrarAlerta('Error de comunicación con el servidor.', 'error');
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar Recepción y Actualizar Stock';
    }
  });

  // ==========================================================================
  // HU-31: GENERAR NUEVO PEDIDO DE REABASTECIMIENTO
  // ==========================================================================
  async function cargarCatalogosNuevoPedido() {
    try {
      const [resProv, resProd] = await Promise.all([
        fetch(API_PROVEEDORES),
        fetch(API_PRODUCTOS)
      ]);

      const dataProv = await resProv.json();
      const dataProd = await resProd.json();

      if (dataProv.proveedores) {
        selectProveedorPedido.innerHTML = '<option value="">Selecciona un proveedor...</option>';
        dataProv.proveedores.forEach((p) => {
          selectProveedorPedido.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
      }

      if (dataProd.productos) {
        selectProductoPedido.innerHTML = '<option value="">Selecciona un producto...</option>';
        dataProd.productos.forEach((prod) => {
          selectProductoPedido.innerHTML += `<option value="${prod.id}">${prod.nombre} (Stock actual: ${prod.stock_almacen})</option>`;
        });
      }
    } catch (e) {
      console.error('Error al cargar selectores de pedido:', e);
    }
  }

  btnNuevoPedido?.addEventListener('click', () => {
    cargarCatalogosNuevoPedido();
    alertaModalPedido.hidden = true;
    modalNuevoPedido.classList.remove('modal--hidden');
  });

  function cerrarModalNuevo() {
    modalNuevoPedido.classList.add('modal--hidden');
    document.getElementById('formNuevoPedido').reset();
  }

  btnCerrarModalNuevo?.addEventListener('click', cerrarModalNuevo);
  btnCancelarNuevo?.addEventListener('click', cerrarModalNuevo);

  btnGuardarPedido?.addEventListener('click', async () => {
    const proveedorId = selectProveedorPedido.value;
    const productoId = selectProductoPedido.value;
    const cantidadSolicitada = Number(inputCantidadSolicitada.value);
    const costoUnitario = Number(inputCostoUnitario.value);

    if (!proveedorId || !productoId || cantidadSolicitada <= 0 || costoUnitario <= 0) {
      alertaModalPedido.textContent = 'Completa todos los campos con valores mayores a cero.';
      alertaModalPedido.className = 'alert alert--error';
      alertaModalPedido.hidden = false;
      return;
    }

    const payload = {
      proveedorId: Number(proveedorId),
      items: [
        {
          productoId: Number(productoId),
          cantidadSolicitada,
          costoUnitario
        }
      ]
    };

    btnGuardarPedido.disabled = true;
    btnGuardarPedido.textContent = 'Emitiendo...';

    try {
      const res = await fetch(API_PEDIDOS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        mostrarAlerta(data.mensaje, 'success');
        cerrarModalNuevo();
        cargarPedidosPendientes();
      } else {
        alertaModalPedido.textContent = data.mensaje || 'Error al emitir el pedido.';
        alertaModalPedido.className = 'alert alert--error';
        alertaModalPedido.hidden = false;
      }
    } catch (e) {
      alertaModalPedido.textContent = 'Error de comunicación al emitir la orden.';
      alertaModalPedido.className = 'alert alert--error';
      alertaModalPedido.hidden = false;
    } finally {
      btnGuardarPedido.disabled = false;
      btnGuardarPedido.textContent = 'Emitir Orden';
    }
  });

  function mostrarAlerta(mensaje, tipo) {
    alerta.textContent = mensaje;
    alerta.className = `alert alert--${tipo}`;
    alerta.hidden = false;
  }
});