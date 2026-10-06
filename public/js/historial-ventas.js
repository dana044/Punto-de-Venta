/**
 * @file historial-ventas.js
 * @description Gestión de auditoría de ventas por empleado, día y cancelaciones.
 */

document.addEventListener('DOMContentLoaded', () => {
  const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  if (userRole === 'almacenista') {
    alert('Acceso no autorizado.');
    window.location.replace('/inventario');
    return;
  }

  const formFiltro = document.getElementById('formFiltroHistorial');
  const selColaborador = document.getElementById('selColaborador');
  const inputFecha = document.getElementById('inputFechaHistorial');
  const tablaBody = document.getElementById('tablaHistorialBody');
  const alerta = document.getElementById('alertaHistorial');

  const modalCancel = document.getElementById('modalCancelarVenta');
  const formCancel = document.getElementById('formCancelarVenta');
  const cancelarVentaId = document.getElementById('cancelarVentaId');
  const cancelarFolio = document.getElementById('cancelarFolio');
  const cancelarMotivo = document.getElementById('cancelarMotivo');
  const adminPassword = document.getElementById('adminPassword');
  const modalCancelError = document.getElementById('modalCancelError');
  const btnCerrarModalCancel = document.getElementById('btnCerrarModalCancel');
  const btnDescartarCancel = document.getElementById('btnDescartarCancel');

  // Inicializar fecha de hoy (local AAAA-MM-DD)
  const hoy = new Date();
  inputFecha.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  if (userRole === 'cajero') {
    const grupoColaborador = document.getElementById('grupoColaborador');
    if (grupoColaborador) grupoColaborador.style.display = 'none';
  } else {
    cargarListaColaboradores();
  }

  async function cargarListaColaboradores() {
    try {
      const res = await fetch('/api/employees', {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();
      const empleados = Array.isArray(data) ? data : (data.empleados || []);

      if (res.ok && empleados.length > 0) {
        selColaborador.innerHTML = '<option value="">Todos los colaboradores</option>';
        empleados.forEach(emp => {
          const opt = document.createElement('option');
          opt.value = emp.id;
          opt.textContent = `${emp.nombreCompleto} (${emp.role})`;
          selColaborador.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Error cargando colaboradores:', e);
    }
  }

  formFiltro?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (alerta) alerta.hidden = true;

    let url = `/api/pos/historial?fecha=${encodeURIComponent(inputFecha.value)}`;
    if (userRole !== 'cajero' && selColaborador.value) {
      url += `&usuarioId=${encodeURIComponent(selColaborador.value)}`;
    }

    tablaBody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">Cargando ventas...</td></tr>`;

    try {
      const res = await fetch(url, {
        headers: {
          'x-user-role': userRole,
          'x-user-id': userId || ''
        }
      });
      const data = await res.json();

      if (!res.ok) {
        alerta.textContent = data.mensaje || 'Error al obtener el historial.';
        alerta.className = 'alert alert--error';
        alerta.hidden = false;
        tablaBody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">Error al cargar ventas.</td></tr>`;
        return;
      }

      renderizarTabla(data.historial || []);
    } catch (err) {
      console.error('Error:', err);
      tablaBody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">Error de conexión con el servidor.</td></tr>`;
    }
  });

  function renderizarTabla(ventas) {
    tablaBody.innerHTML = '';

    if (!ventas.length) {
      tablaBody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2.5rem;">No hay ventas registradas para este criterio de búsqueda.</td></tr>`;
      return;
    }

    ventas.forEach(v => {
      const tr = document.createElement('tr');
      const hora = new Date(v.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      let badgeEstado = '<span class="badge badge--success">Completada</span>';
      if (v.estado === 'solicitada_cancelacion') badgeEstado = '<span class="badge badge--warning">Solicitada</span>';
      if (v.estado === 'cancelada') badgeEstado = '<span class="badge badge--danger">Cancelada</span>';

      let accionBtn = '';
      if (v.estado !== 'cancelada') {
        accionBtn = `
          <button type="button" class="btn btn--danger" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;" 
                  onclick="abrirModalCancelar('${v.id}', '${v.folio}')">
            Cancelar Venta
          </button>
        `;
      } else {
        accionBtn = `<span class="text-muted" style="font-size: 0.85rem;">Cancelada</span>`;
      }

      tr.innerHTML = `
        <td><code>${v.folio}</code></td>
        <td>${hora}</td>
        <td><strong>${v.colaborador || 'Cajero'}</strong></td>
        <td style="text-transform: capitalize;">${v.metodo_pago}</td>
        <td><strong>$${Number(v.total).toFixed(2)}</strong></td>
        <td>${badgeEstado}</td>
        <td>${accionBtn}</td>
      `;
      tablaBody.appendChild(tr);
    });
  }

  window.abrirModalCancelar = (id, folio) => {
    cancelarVentaId.value = id;
    cancelarFolio.value = folio;
    cancelarMotivo.value = '';
    adminPassword.value = '';
    modalCancelError.hidden = true;
    modalCancel.classList.remove('modal--hidden');
    cancelarMotivo.focus();
  };

  const cerrarModal = () => {
    modalCancel.classList.add('modal--hidden');
  };

  btnCerrarModalCancel?.addEventListener('click', cerrarModal);
  btnDescartarCancel?.addEventListener('click', cerrarModal);

  formCancel?.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalCancelError.hidden = true;

    const id = cancelarVentaId.value;
    const motivo = cancelarMotivo.value.trim();
    const contrasena = adminPassword.value;

    if (!motivo || !contrasena) {
      modalCancelError.textContent = 'Debes ingresar el motivo y la contraseña del administrador.';
      modalCancelError.hidden = false;
      return;
    }

    try {
      const res = await fetch(`/api/pos/ventas/${id}/autorizar-cancelacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-id': userId
        },
        body: JSON.stringify({ motivo, contrasena })
      });

      const data = await res.json();

      if (!res.ok) {
        modalCancelError.textContent = data.mensaje || 'Error al autorizar la cancelación.';
        modalCancelError.hidden = false;
        return;
      }

      alert(data.mensaje);
      cerrarModal();
      formFiltro.dispatchEvent(new Event('submit'));
    } catch (err) {
      console.error(err);
      modalCancelError.textContent = 'Error de conexión con el servidor.';
      modalCancelError.hidden = false;
    }
  });
});