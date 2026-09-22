/**
 * @file recepcion.js
 * @description Controlador del lado del cliente para la vista de recepción de mercancía.
 */

const API_PEDIDOS = '/api/receiving/pedidos';

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  if (userRole === 'cajero') {
    alert('Acceso no autorizado para tu rol (HU-03).');
    window.location.href = '/pos';
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

  const pedidosContainer = document.getElementById('pedidosContainer');
  const alerta = document.getElementById('alertMessage');
  const modal = document.getElementById('modalRecepcion');
  const modalFolio = document.getElementById('modalFolio');
  const modalProveedor = document.getElementById('modalProveedor');
  const modalItemsBody = document.getElementById('modalItemsBody');
  const modalTotal = document.getElementById('modalTotal');
  const btnConfirmar = document.getElementById('btnConfirmar');
  const btnRechazar = document.getElementById('btnRechazar');
  const btnCerrarModal = document.getElementById('btnCerrarModal');

  let pedidoActual = null;

  cargarPedidosPendientes();

  async function cargarPedidosPendientes() {
    try {
      const res = await fetch(API_PEDIDOS);
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
        btn.addEventListener('click', () => abrirModal(btn.dataset.folio));
      });
    } catch (err) {
      pedidosContainer.innerHTML = '<span class="text-muted">Error de conexión al obtener los pedidos.</span>';
    }
  }

  async function abrirModal(folio) {
    try {
      const res = await fetch(`${API_PEDIDOS}/${folio}`);
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
          <td>$${item.costoUnitario.toFixed(2)}</td>
          <td class="subtotal-linea">$${(item.cantidadSolicitada * item.costoUnitario).toFixed(2)}</td>
        `;
        modalItemsBody.appendChild(fila);
      });

      document.querySelectorAll('.input-cantidad-recibida').forEach((input) => {
        input.addEventListener('input', recalcularTotal);
      });

      recalcularTotal();
      modal.classList.remove('modal--hidden');
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

  function cerrarModal() {
    modal.classList.add('modal--hidden');
    pedidoActual = null;
  }

  btnCerrarModal.addEventListener('click', cerrarModal);
  btnRechazar.addEventListener('click', cerrarModal);

  btnConfirmar.addEventListener('click', async () => {
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
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ items })
      });

      const data = await res.json();

      if (res.ok) {
        mostrarAlerta(data.mensaje, 'success');
        cerrarModal();
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

  function mostrarAlerta(mensaje, tipo) {
    alerta.textContent = mensaje;
    alerta.className = `alert alert--${tipo}`;
    alerta.hidden = false;
  }
});
