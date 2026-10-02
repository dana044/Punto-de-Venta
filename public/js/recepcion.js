/**
 * @file recepcion.js
 * @description Controlador del cliente para emisión (HU-31) y seguimiento/recepción de pedidos (HU-32).
 */

const API_PEDIDOS = '/api/receiving/pedidos';
const API_PROVEEDORES = '/api/inventory/proveedores';
const API_PRODUCTOS_PROVEEDOR = '/api/receiving/proveedores'; // Endpoint filtrado por proveedor

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
  const btnAgregarProductoLista = document.getElementById('btnAgregarProductoLista');
  const tablaItemsPedidoBody = document.getElementById('tablaItemsPedidoBody');
  const totalNuevaOrdenTexto = document.getElementById('totalNuevaOrdenTexto');

  let pedidoActual = null;
  /** @type {Array<{productoId: number, productoNombre: string, cantidadSolicitada: number, costoUnitario: number}>} */
  let productosOrdenActual = [];

  cargarPedidosPendientes();

  function configurarMenuPorRol(rol) {
    const menuPersonal = document.getElementById('menuPersonal');
    const menuInventario = document.getElementById('menuInventario');
    const menuRecepcion = document.getElementById('menuRecepcion');
    const menuProveedores = document.getElementById('menuProveedores');
    const menuPos = document.getElementById('menuPos');
    const menuReportes = document.getElementById('menuReportes');

    if (rol === 'administrador') {
      menuPersonal?.removeAttribute('hidden');
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      menuProveedores?.removeAttribute('hidden');
      menuPos?.removeAttribute('hidden');
      menuReportes?.removeAttribute('hidden');
    } else if (rol === 'almacenista') {
      if (menuPersonal) menuPersonal.hidden = true;
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      menuReportes?.removeAttribute('hidden');
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
  // HU-31: GENERAR NUEVO PEDIDO DE REABASTECIMIENTO (FILTRADO Y MÚLTIPLE)
  // ==========================================================================
  async function cargarProveedoresNuevoPedido() {
    try {
      const resProv = await fetch(API_PROVEEDORES, { headers: { 'x-user-role': userRole } });
      const dataProv = await resProv.json();

      if (dataProv.proveedores) {
        selectProveedorPedido.innerHTML = '<option value="">Selecciona un proveedor...</option>';
        dataProv.proveedores.forEach((p) => {
          selectProveedorPedido.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
      }
    } catch (e) {
      console.error('Error al cargar proveedores:', e);
    }
  }

  /**
   * Carga exclusivamente los productos que distribuye el proveedor seleccionado (HU-11 / HU-31).
   * @param {number|string} proveedorId 
   */
  async function cargarProductosPorProveedor(proveedorId) {
    selectProductoPedido.disabled = true;
    selectProductoPedido.innerHTML = '<option value="">Cargando productos...</option>';

    try {
      const res = await fetch(`${API_PRODUCTOS_PROVEEDOR}/${proveedorId}/productos`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (res.ok && Array.isArray(data.productos) && data.productos.length > 0) {
        selectProductoPedido.innerHTML = '<option value="">Selecciona un producto...</option>';
        data.productos.forEach((prod) => {
          selectProductoPedido.innerHTML += `<option value="${prod.id}" data-nombre="${prod.nombre}">${prod.nombre} (Stock mostrador: ${prod.stock_mostrador})</option>`;
        });
        selectProductoPedido.disabled = false;
      } else {
        selectProductoPedido.innerHTML = '<option value="">Este proveedor no tiene productos asignados</option>';
      }
    } catch (error) {
      selectProductoPedido.innerHTML = '<option value="">Error al cargar productos</option>';
    }
  }

  selectProveedorPedido?.addEventListener('change', (e) => {
    const provId = e.target.value;
    // Si cambia de proveedor y ya había productos en la lista, advertir o resetear
    if (productosOrdenActual.length > 0) {
      if (confirm('Cambiar de proveedor vaciará los productos agregados a esta orden. ¿Continuar?')) {
        productosOrdenActual = [];
        renderizarTablaOrden();
      } else {
        return;
      }
    }

    if (provId) {
      cargarProductosPorProveedor(provId);
    } else {
      selectProductoPedido.innerHTML = '<option value="">Primero selecciona un proveedor...</option>';
      selectProductoPedido.disabled = true;
    }
  });

  // Agregar producto a la lista de la orden (Múltiples productos)
  btnAgregarProductoLista?.addEventListener('click', () => {
    const prodId = Number(selectProductoPedido.value);
    const prodOption = selectProductoPedido.options[selectProductoPedido.selectedIndex];
    const prodNombre = prodOption?.dataset?.nombre;
    const cantidad = Number(inputCantidadSolicitada.value);
    const costo = Number(inputCostoUnitario.value);

    if (!selectProveedorPedido.value) {
      mostrarAlertaModal('Selecciona un distribuidor primero.', 'error');
      return;
    }

    if (!prodId || cantidad <= 0 || costo <= 0) {
      mostrarAlertaModal('Verifica que el producto, cantidad y costo sean válidos.', 'error');
      return;
    }

    // Si ya existe el producto en la lista, actualizar cantidad
    const existente = productosOrdenActual.find(p => p.productoId === prodId);
    if (existente) {
      existente.cantidadSolicitada += cantidad;
      existente.costoUnitario = costo;
    } else {
      productosOrdenActual.push({
        productoId: prodId,
        productoNombre: prodNombre,
        cantidadSolicitada: cantidad,
        costoUnitario: costo
      });
    }

    alertaModalPedido.hidden = true;
    renderizarTablaOrden();
  });

  function renderizarTablaOrden() {
    if (productosOrdenActual.length === 0) {
      tablaItemsPedidoBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-muted" style="text-align: center; padding: 1rem;">
            Aún no has agregado productos a esta orden.
          </td>
        </tr>`;
      totalNuevaOrdenTexto.textContent = '$0.00';
      return;
    }

    let totalAcumulado = 0;
    tablaItemsPedidoBody.innerHTML = '';

    productosOrdenActual.forEach((item, index) => {
      const subtotal = item.cantidadSolicitada * item.costoUnitario;
      totalAcumulado += subtotal;

      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${item.productoNombre}</td>
        <td>${item.cantidadSolicitada}</td>
        <td>$${item.costoUnitario.toFixed(2)}</td>
        <td>$${subtotal.toFixed(2)}</td>
        <td>
          <button type="button" class="btn-remove-item" data-index="${index}" title="Quitar">×</button>
        </td>
      `;
      tablaItemsPedidoBody.appendChild(fila);
    });

    totalNuevaOrdenTexto.textContent = `$${totalAcumulado.toFixed(2)}`;

    document.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.target.dataset.index);
        productosOrdenActual.splice(idx, 1);
        renderizarTablaOrden();
      });
    });
  }

  btnNuevoPedido?.addEventListener('click', () => {
    cargarProveedoresNuevoPedido();
    productosOrdenActual = [];
    renderizarTablaOrden();
    selectProductoPedido.innerHTML = '<option value="">Primero selecciona un proveedor...</option>';
    selectProductoPedido.disabled = true;
    alertaModalPedido.hidden = true;
    modalNuevoPedido.classList.remove('modal--hidden');
  });

  function cerrarModalNuevo() {
    modalNuevoPedido.classList.add('modal--hidden');
    document.getElementById('formNuevoPedido').reset();
    productosOrdenActual = [];
    renderizarTablaOrden();
  }

  btnCerrarModalNuevo?.addEventListener('click', cerrarModalNuevo);
  btnCancelarNuevo?.addEventListener('click', cerrarModalNuevo);

  btnGuardarPedido?.addEventListener('click', async () => {
    const proveedorId = selectProveedorPedido.value;

    if (!proveedorId) {
      mostrarAlertaModal('Debes elegir un distribuidor/proveedor.', 'error');
      return;
    }

    if (productosOrdenActual.length === 0) {
      mostrarAlertaModal('Debes agregar al menos un producto a la orden de pedido.', 'error');
      return;
    }

    const payload = {
      proveedorId: Number(proveedorId),
      items: productosOrdenActual.map(p => ({
        productoId: p.productoId,
        cantidadSolicitada: p.cantidadSolicitada,
        costoUnitario: p.costoUnitario
      }))
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
        mostrarAlertaModal(data.mensaje || 'Error al emitir el pedido.', 'error');
      }
    } catch (e) {
      mostrarAlertaModal('Error de comunicación al emitir la orden.', 'error');
    } finally {
      btnGuardarPedido.disabled = false;
      btnGuardarPedido.textContent = 'Emitir Orden';
    }
  });

  function mostrarAlertaModal(mensaje, tipo) {
    alertaModalPedido.textContent = mensaje;
    alertaModalPedido.className = `alert alert--${tipo}`;
    alertaModalPedido.hidden = false;
  }

  function mostrarAlerta(mensaje, tipo) {
    alerta.textContent = mensaje;
    alerta.className = `alert alert--${tipo}`;
    alerta.hidden = false;
  }
});