/**
 * @file inventario.js
 * @description Controlador del lado del cliente para la gestion de inventario y proveedores.
 * Administra el control de acceso, sesion por inactividad, despliegue de menu por rol,
 * catalogo de productos y asociacion con distribuidores.
 * @author Citlaly Morales Viveros (Cliente / Programador XP)
 */

const API_PRODUCTOS = '/api/inventory/productos';
const API_PROVEEDORES = '/api/inventory/proveedores';

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  // Validacion de sesion activa
  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  // Restriccion de acceso para cajero
  if (userRole === 'cajero') {
    alert('Acceso no autorizado para tu rol.');
    window.location.href = '/pos';
    return;
  }

  // ==========================================================================
  // CIERRE AUTOMATICO DE SESION POR INACTIVIDAD
  // ==========================================================================
  const TIEMPO_LIMITE_INACTIVIDAD = 5 * 60 * 1000;
  let temporizadorInactividad;

  function cerrarSesionPorInactividad() {
    localStorage.clear();
    alert('Tu sesion ha expirado automaticamente por inactividad.');
    window.location.replace('/login');
  }

  function reiniciarTemporizador() {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(cerrarSesionPorInactividad, TIEMPO_LIMITE_INACTIVIDAD);
  }

  const eventosMonitoreo = ['mousemove', 'mousedown', 'keydown', 'scroll', 'click', 'touchstart'];
  eventosMonitoreo.forEach((evento) => {
    window.addEventListener(evento, reiniciarTemporizador, { passive: true });
  });

  reiniciarTemporizador();

  // ==========================================================================
  // CONFIGURACION DE INTERFAZ Y NAVEGACION
  // ==========================================================================
  configurarMenuPorRol(userRole);

  document.getElementById('btnLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login';
  });

  // Referencias al DOM
  const modalOverlay = document.getElementById('modalOverlay');
  const btnNuevoProducto = document.getElementById('btnNuevoProducto');
  const btnCerrarModal = document.getElementById('btnCerrarModal');
  const cancelarBtn = document.getElementById('cancelarBtn');
  const productForm = document.getElementById('productForm');
  const modalAlert = document.getElementById('modalAlertMessage');
  const btnSubmit = document.getElementById('submitBtn');
  const formTitle = document.getElementById('formTitle');
  const proveedoresContainer = document.getElementById('proveedoresContainer');
  const tablaBody = document.getElementById('tablaProductosBody');
  const productosCount = document.getElementById('productosCount');
  const buscarInput = document.getElementById('buscarProducto');
  const chkMostrarInactivos = document.getElementById('chkMostrarInactivos');

  let productosCache = [];

  const toggleModal = (mostrar) => {
    modalOverlay.style.display = mostrar ? 'flex' : 'none';
    if (!mostrar) {
      productForm.reset();
      document.getElementById('productoId').value = '';
      formTitle.textContent = 'Registro de Nuevos Productos';
      btnSubmit.textContent = 'Registrar Producto';
      ocultarAlerta();
    }
  };

  btnNuevoProducto?.addEventListener('click', () => toggleModal(true));
  btnCerrarModal?.addEventListener('click', () => toggleModal(false));
  cancelarBtn?.addEventListener('click', () => toggleModal(false));

  cargarProveedores();
  cargarProductos();

  /**
   * Configura la visibilidad del menu lateral segun el rol del usuario.
   * - Administrador: Acceso a todos los modulos.
   * - Almacenista: Acceso a Inventario, Reportes de inventario y Recepcion.
   * - Cajero: Acceso exclusivo a Punto de Venta.
   *
   * @param {string} rol Rol autenticado del usuario.
   */
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
    } else if (rol === 'cajero') {
      if (menuPersonal) menuPersonal.hidden = true;
      if (menuInventario) menuInventario.hidden = true;
      if (menuRecepcion) menuRecepcion.hidden = true;
      menuPos?.removeAttribute('hidden');
    }
  }

  async function cargarProveedores() {
    try {
      const res = await fetch(API_PROVEEDORES, { headers: { 'x-user-role': userRole } });
      const data = await res.json();

      if (res.ok && Array.isArray(data.proveedores)) {
        if (!proveedoresContainer) return;
        proveedoresContainer.innerHTML = '';

        if (data.proveedores.length === 0) {
          proveedoresContainer.innerHTML = '<span class="text-muted">No hay distribuidores registrados.</span>';
          return;
        }

        data.proveedores.forEach((prov) => {
          const label = document.createElement('label');
          label.style.display = 'flex';
          label.style.alignItems = 'center';
          label.style.gap = '0.5rem';
          label.style.cursor = 'pointer';
          label.innerHTML = `
            <input type="checkbox" name="proveedor" value="${prov.id}">
            <span style="font-size: 0.85rem;">${prov.nombre}</span>
          `;
          proveedoresContainer.appendChild(label);
        });
      }
    } catch (err) {
      proveedoresContainer.innerHTML = '<span class="text-muted">Error al cargar proveedores.</span>';
    }
  }

  async function cargarProductos(termino = '') {
    try {
      let url = termino
        ? `/api/inventory/productos/buscar?q=${encodeURIComponent(termino)}`
        : API_PRODUCTOS;

      const queryInactivos = chkMostrarInactivos?.checked ? 'inactivos=true' : '';
      if (queryInactivos) {
        url += url.includes('?') ? `&${queryInactivos}` : `?${queryInactivos}`;
      }

      const res = await fetch(url, { headers: { 'x-user-role': userRole } });
      const data = await res.json();

      if (res.ok && Array.isArray(data.productos)) {
        productosCache = data.productos;
        renderizarTabla(data.productos);
      } else {
        tablaBody.innerHTML = `<tr><td colspan="9" class="empty-state" style="color: red; text-align:center;">Error: ${data.mensaje || 'Datos no validos'}</td></tr>`;
      }
    } catch (error) {
      tablaBody.innerHTML = `<tr><td colspan="9" class="empty-state" style="color: red; text-align:center;">Error de conexion.</td></tr>`;
    }
  }

  function calcularBadgeCaducidad(fecha) {
    if (!fecha) return '<span class="text-muted">Sin fecha</span>';

    const hoy = new Date();
    const cad = new Date(fecha);
    const dias = Math.ceil((cad - hoy) / (1000 * 60 * 60 * 24));

    if (dias < 0) return `<span class="badge badge--danger">Caducado</span>`;
    if (dias <= 30) return `<span class="badge" style="background:#FEF3C7;color:#B45309;">Caduca en ${dias}d</span>`;
    return `<span class="badge badge--success">Vigente</span>`;
  }

  function renderizarTabla(lista) {
    tablaBody.innerHTML = '';
    const textoEstado = chkMostrarInactivos?.checked ? 'incluyendo inactivos' : 'activos';
    productosCount.textContent = `${lista.length} producto(s) ${textoEstado}`;

    if (lista.length === 0) {
      tablaBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No se encontraron productos.</td></tr>`;
      return;
    }

    lista.forEach((p) => {
      const fila = document.createElement('tr');
      const inactivo = Number(p.activo) === 0 || p.activo === false;
      const opacidad = inactivo ? 'opacity: 0.6;' : '';

      const badgeHTML = !inactivo
        ? `<span class="badge badge--success">${p.categoria || 'General'}</span>`
        : `<span class="badge badge--danger">Inactivo</span>`;

      const badgeCaducidad = calcularBadgeCaducidad(p.proxima_caducidad);

      const botonEstadoHTML = !inactivo
        ? `<button class="btn-icon-delete btn-desactivar" data-id="${p.id}" title="Desactivar" style="background-color: #FEF3C7; color: #B45309;">Desactivar</button>`
        : `<button class="btn-icon-delete btn-activar" data-id="${p.id}" title="Reactivar" style="background-color: #E6F0EF; color: var(--color-primary);">Reactivar</button>`;

      fila.innerHTML = `
        <td style="${opacidad}"><code>${p.codigo_barras || 'N/A'}</code></td>
      <td style="${opacidad}">
        <strong>${p.nombre}</strong><br/>
        <small class="text-muted">${p.presentacion || ''} ${p.unidad_medida ? `(${p.unidad_medida})` : ''}</small>
      </td>
      <td style="${opacidad}">${badgeHTML}</td>
      <td style="${opacidad}">$${Number(p.precio).toFixed(2)}</td>
      <!-- stock_total representa la sumatoria del almacén (lotes) -->
      <td style="${opacidad}"><strong>${p.stock_almacen !== undefined ? p.stock_almacen : 0}</strong></td>
      <td style="${opacidad}">${p.stock_mostrador !== undefined ? p.stock_mostrador : 0}</td>
      <td style="${opacidad}">${badgeCaducidad}</td>
      <td style="${opacidad}">
        <small class="text-muted">${p.proveedores_nombres || 'Sin proveedor'}</small>
      </td>
      <td class="actions-cell" style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-start; min-width: 280px;">
        <button class="btn-icon-edit btn-lotes" data-id="${p.id}" title="Ver Lotes" style="background-color: #DBEAFE; color: #1E3A8A;">Lotes</button>
        <button class="btn-icon-edit btn-ajustar" data-id="${p.id}" title="Ajustar Stock" style="background-color: #F3E8FF; color: #7E22CE;">Ajustar</button>
        <button class="btn-icon-edit btn-editar" data-id="${p.id}" title="Editar">Editar</button>
        ${botonEstadoHTML}
        <button class="btn-icon-delete btn-eliminar" data-id="${p.id}" title="Eliminar">Eliminar</button>
      </td>
      `;
      tablaBody.appendChild(fila);
    });
  }

  buscarInput?.addEventListener('input', (e) => {
    cargarProductos(e.target.value.trim());
  });

  chkMostrarInactivos?.addEventListener('change', () => {
    cargarProductos(buscarInput.value.trim());
  });

  function abrirModalEdicion(producto) {
    document.getElementById('productoId').value = producto.id;
    document.getElementById('nombreProducto').value = producto.nombre;
    document.getElementById('codigoBarras').value = producto.codigo_barras;
    document.getElementById('categoria').value = producto.categoria || '';
    document.getElementById('presentacion').value = producto.presentacion || '';
    document.getElementById('unidadMedida').value = producto.unidad_medida || '';
    document.getElementById('precio').value = producto.precio;
    const inputStock = document.getElementById('stock');
    inputStock.value = producto.stock_almacen || 0;;
    const inputMostrador = document.getElementById('stockMostrador');
    inputMostrador.value = producto.stock_mostrador || 0;
    inputMostrador.disabled = true;
    inputMostrador.title = "Para enviar mercancía al mostrador, utiliza el botón 'Ajustar'."

    document.getElementById('fechaCaducidad').value = producto.fecha_caducidad
      ? String(producto.fecha_caducidad).substring(0, 10)
      : '';

    const idsSeleccionados = (producto.proveedores_ids || '')
      .toString()
      .split(',')
      .filter(Boolean)
      .map(Number);

    document.querySelectorAll('input[name="proveedor"]').forEach((cb) => {
      cb.checked = idsSeleccionados.includes(Number(cb.value));
    });

    formTitle.textContent = 'Editar Producto';
    btnSubmit.textContent = 'Guardar Cambios';
    toggleModal(true);
  }

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const checks = document.querySelectorAll('input[name="proveedor"]:checked');
    const proveedoresSeleccionados = Array.from(checks).map((cb) => Number(cb.value));

    if (proveedoresSeleccionados.length === 0) {
      mostrarAlerta('Debes asociar al menos un distribuidor al producto.', 'error');
      return;
    }

    const idProducto = document.getElementById('productoId').value;

    const payload = {
      nombre: document.getElementById('nombreProducto').value.trim(),
      codigo_barras: document.getElementById('codigoBarras').value.trim(),
      categoria: document.getElementById('categoria').value.trim(),
      presentacion: document.getElementById('presentacion').value.trim(),
      unidad_medida: document.getElementById('unidadMedida').value,
      precio: parseFloat(document.getElementById('precio').value),
      stock_almacen: parseInt(document.getElementById('stock').value, 10) || 0,
      stock_mostrador: parseInt(document.getElementById('stockMostrador').value, 10) || 0,
      fecha_caducidad: document.getElementById('fechaCaducidad').value || null,
      proveedoresIds: proveedoresSeleccionados
    };

    const url = idProducto ? `${API_PRODUCTOS}/${idProducto}` : API_PRODUCTOS;
    const metodo = idProducto ? 'PUT' : 'POST';
    const textoDefault = idProducto ? 'Guardar Cambios' : 'Registrar Producto';

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';
    ocultarAlerta();

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        mostrarAlerta(data.mensaje || 'Producto guardado exitosamente.', 'success');
        cargarProductos(buscarInput?.value.trim());
        setTimeout(() => toggleModal(false), 1200);
      } else {
        mostrarAlerta(data.mensaje || 'Error al guardar el producto.', 'error');
      }
    } catch (err) {
      mostrarAlerta('Error de comunicacion con el servidor.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = textoDefault;
    }
  });

  tablaBody.addEventListener('click', async (e) => {
    const btnEditar = e.target.closest('.btn-editar');
    if (btnEditar) {
      const producto = productosCache.find((p) => p.id == btnEditar.dataset.id);
      if (producto) abrirModalEdicion(producto);
      return;
    }

    const btnDesactivar = e.target.closest('.btn-desactivar');
    const btnActivar = e.target.closest('.btn-activar');
    const btnEliminar = e.target.closest('.btn-eliminar');

    let id = null, accion = null, mensajeConfirmacion = '';

    if (btnDesactivar) {
      id = btnDesactivar.dataset.id; accion = 'desactivar';
      mensajeConfirmacion = '¿Estas seguro de que deseas desactivar este producto?';
    } else if (btnActivar) {
      id = btnActivar.dataset.id; accion = 'activar';
      mensajeConfirmacion = '¿Deseas reactivar este producto para que vuelva a estar disponible?';
    } else if (btnEliminar) {
      id = btnEliminar.dataset.id; accion = 'eliminar';
      mensajeConfirmacion = '¿Estas seguro de que deseas eliminar definitivamente este producto?';
    }

    if (id && accion && confirm(mensajeConfirmacion)) {
      try {
        const respuesta = await fetch(`/api/inventory/productos/${id}/baja`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
          body: JSON.stringify({ accion })
        });
        const datos = await respuesta.json();

        if (respuesta.ok) {
          alert(datos.mensaje);
          cargarProductos(buscarInput?.value.trim());
        } else {
          alert(datos.mensaje || 'Error al procesar la accion.');
        }
      } catch (error) {
        alert('Error de comunicacion con el servidor.');
      }
    }
  });

  function mostrarAlerta(mensaje, tipo) {
    modalAlert.textContent = mensaje;
    modalAlert.className = `alert alert--${tipo}`;
    modalAlert.hidden = false;
  }

  function ocultarAlerta() {
    if (modalAlert) {
      modalAlert.hidden = true;
      modalAlert.textContent = '';
    }
  }

  const modalAjuste = document.getElementById('modalAjusteOverlay');
  const formAjuste = document.getElementById('formAjuste');
  const alertAjuste = document.getElementById('modalAlertAjuste');
  const btnGuardarAjuste = document.getElementById('btnGuardarAjuste');

  const toggleModalAjuste = (mostrar) => {
    modalAjuste.style.display = mostrar ? 'flex' : 'none';
    if (!mostrar) {
      formAjuste.reset();
      alertAjuste.hidden = true;
      document.getElementById('grupoTipoStock').style.display = 'block';
    }
  };

  document.getElementById('btnCerrarModalAjuste')?.addEventListener('click', () => toggleModalAjuste(false));
  document.getElementById('btnCancelarAjuste')?.addEventListener('click', () => toggleModalAjuste(false));

  function abrirModalAjuste(producto) {
    document.getElementById('ajusteProductoId').value = producto.id;
    document.getElementById('nombreProductoAjuste').textContent = `${producto.nombre} (Almacén: ${producto.stock_almacen || 0} | Mostrador: ${producto.stock_mostrador || 0})`;
    toggleModalAjuste(true);
  }

  tablaBody.addEventListener('click', (e) => {
    const btnAjustar = e.target.closest('.btn-ajustar');
    if (btnAjustar) {
      e.preventDefault();
      const producto = productosCache.find((p) => p.id == btnAjustar.dataset.id);
      if (producto) abrirModalAjuste(producto);
    }
  });
  
  document.getElementById('tipoAjuste').addEventListener('change', (e) => {
    const val = e.target.value;
    const grupo = document.getElementById('grupoTipoStock');
    if (val.includes('transferencia')) grupo.style.display = 'none';
    else grupo.style.display = 'block';
  });

  formAjuste.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('ajusteProductoId').value;
    const payload = {
      tipoAjuste: document.getElementById('tipoAjuste').value,
      tipoStock: document.getElementById('tipoStock') ? document.getElementById('tipoStock').value : 'almacen',
      cantidad: Number(document.getElementById('cantidadAjuste').value),
      motivo: document.getElementById('motivoAjuste').value.trim()
    };

    btnGuardarAjuste.disabled = true;
    btnGuardarAjuste.textContent = 'Procesando...';
    alertAjuste.hidden = true;

    try {
      const res = await fetch(`/api/inventory/productos/${id}/ajuste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        alertAjuste.textContent = data.mensaje;
        alertAjuste.className = 'alert alert--success';
        alertAjuste.hidden = false;
        cargarProductos(document.getElementById('buscarProducto')?.value.trim());
        setTimeout(() => toggleModalAjuste(false), 1500);
      } else {
        alertAjuste.textContent = data.mensaje || 'Error al realizar el ajuste.';
        alertAjuste.className = 'alert alert--error';
        alertAjuste.hidden = false;
      }
    } catch (err) {
      alertAjuste.textContent = 'Error de comunicación con el servidor.';
      alertAjuste.className = 'alert alert--error';
      alertAjuste.hidden = false;
    } finally {
      btnGuardarAjuste.disabled = false;
      btnGuardarAjuste.textContent = 'Registrar Ajuste';
    }
  });

  // ==========================================================================
  // LÓGICA DEL MODAL DE LOTES (FEFO)
  // ==========================================================================
  const modalLotesOverlay = document.getElementById('modalLotesOverlay');
  const formNuevoLote = document.getElementById('formNuevoLote');
  const tablaLotesBody = document.getElementById('tablaLotesBody');
  const alertLotes = document.getElementById('modalAlertLotes');
  const btnGuardarLote = document.getElementById('btnGuardarLote');
  let loteEnEdicionId = null;

  const toggleModalLotes = (mostrar) => {
    if (!modalLotesOverlay) return; 

    modalLotesOverlay.style.display = mostrar ? 'flex' : 'none';
    if (!mostrar) {
      formNuevoLote.reset();
      alertLotes.hidden = true;
      
      loteEnEdicionId = null;
      btnGuardarLote.textContent = 'Agregar Lote';
      document.querySelector('#formNuevoLote p strong').textContent = '+ Ingresar nueva mercancía';
    } else {
      const inputCaducidad = document.getElementById('loteCaducidad');
      
      const tzOffset = (new Date()).getTimezoneOffset() * 60000;
      const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
      
      inputCaducidad.setAttribute('min', localISOTime);
    }
  };

  document.getElementById('btnCerrarModalLotes')?.addEventListener('click', () => toggleModalLotes(false));
  document.getElementById('btnCerrarLotesFooter')?.addEventListener('click', () => toggleModalLotes(false));

  async function cargarLotesDeProducto(productoId) {
    tablaLotesBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando lotes...</td></tr>';
    try {
      const res = await fetch(`/api/inventory/productos/${productoId}/lotes`, { 
        headers: { 'x-user-role': userRole } 
      });
      const data = await res.json();

      if (res.ok) {
        tablaLotesBody.innerHTML = '';
        if (data.lotes.length === 0) {
          tablaLotesBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #6B7280;">No hay lotes en almacén para este producto.</td></tr>';
          return;
        }

        data.lotes.forEach(lote => {
          const caducidadFormateada = lote.fecha_caducidad ? String(lote.fecha_caducidad).substring(0, 10) : '';
          const textoCaducidad = caducidadFormateada || 'Sin caducidad';
          const fechaRegistro = new Date(lote.recibido_en).toLocaleDateString();
          
          tablaLotesBody.innerHTML += `
            <tr>
              <td><span class="badge" style="background:#E5E7EB; color:#374151;">L-${lote.id}</span></td>
              <td><strong>${lote.cantidad}</strong></td>
              <td>${calcularBadgeCaducidad(lote.fecha_caducidad)} <br><small class="text-muted">${textoCaducidad}</small></td>
              <td>${fechaRegistro}</td>
              <td style="display: flex; gap: 0.25rem;">
                <button class="btn-editar-lote" data-id="${lote.id}" data-fecha="${caducidadFormateada}" data-cantidad="${lote.cantidad}" style="background-color: #FEF3C7; color: #B45309; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Editar</button>
                <button class="btn-eliminar-lote" data-id="${lote.id}" style="background-color: #FEE2E2; color: #991B1B; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Eliminar</button>
              </td>
            </tr>
          `;
        });
      } else {
        tablaLotesBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Error al cargar lotes.</td></tr>`;
      }
    } catch (error) {
      tablaLotesBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Error de conexión.</td></tr>`;
    }
  }

  // Interceptar el clic en el botón "Lotes" de la tabla principal
  tablaBody.addEventListener('click', async (e) => {
    const btnLotes = e.target.closest('.btn-lotes');
    if (btnLotes) {
      e.preventDefault();
      const producto = productosCache.find((p) => p.id == btnLotes.dataset.id);
      if (producto) {
        document.getElementById('loteProductoId').value = producto.id;
        document.getElementById('lotesSubtitle').textContent = `${producto.codigo_barras} - ${producto.nombre}`;
        toggleModalLotes(true);
        cargarLotesDeProducto(producto.id);
      }
      return;
    }
  });

  // Interceptar el envío del formulario para crear un nuevo lote
  formNuevoLote?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productoId = document.getElementById('loteProductoId').value;
    
    const payload = {
      cantidad: Number(document.getElementById('loteCantidad').value),
      fechaCaducidad: document.getElementById('loteCaducidad').value || null
    };

    btnGuardarLote.disabled = true;
    btnGuardarLote.textContent = 'Guardando...';
    alertLotes.hidden = true;

    // Decidimos si es POST (Crear) o PUT (Editar)
    const url = loteEnEdicionId !== null 
      ? `/api/inventory/lotes/${loteEnEdicionId}` 
      : `/api/inventory/productos/${productoId}/lotes`;
      
    const metodo = loteEnEdicionId !== null ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        alertLotes.textContent = loteEnEdicionId ? 'Lote actualizado correctamente.' : 'Lote agregado exitosamente al almacén.';
        alertLotes.className = 'alert alert--success';
        alertLotes.hidden = false;
        
        formNuevoLote.reset();
        
        // Regresamos la interfaz al modo "Crear"
        loteEnEdicionId = null;
        btnGuardarLote.textContent = 'Agregar Lote';
        document.querySelector('#formNuevoLote p strong').textContent = '+ Ingresar nueva mercancía';
        
        cargarLotesDeProducto(productoId);
        cargarProductos(buscarInput?.value.trim());
      } else {
        alertLotes.textContent = data.mensaje || 'Error al procesar el lote.';
        alertLotes.className = 'alert alert--error';
        alertLotes.hidden = false;
      }
    } catch (error) {
      alertLotes.textContent = 'Error de comunicación con el servidor.';
      alertLotes.className = 'alert alert--error';
      alertLotes.hidden = false;
    } finally {
      btnGuardarLote.disabled = false;
      if (alertLotes.className.includes('error')) {
         btnGuardarLote.textContent = loteEnEdicionId ? 'Actualizar Lote' : 'Agregar Lote';
      }
    }
  });

  // Interceptar el clic para eliminar un lote específico
  tablaLotesBody?.addEventListener('click', async (e) => {
    const productoId = document.getElementById('loteProductoId').value;

    // 1. Botón Editar Lote
    const btnEditar = e.target.closest('.btn-editar-lote');
    if (btnEditar) {
      // Llenamos el formulario con los datos del lote
      document.getElementById('loteCantidad').value = btnEditar.dataset.cantidad;
      document.getElementById('loteCaducidad').value = btnEditar.dataset.fecha || '';
      
      // Guardamos el ID que estamos editando y cambiamos la interfaz
      loteEnEdicionId = btnEditar.dataset.id;
      btnGuardarLote.textContent = 'Actualizar Lote';
      document.querySelector('#formNuevoLote p strong').textContent = '✎ Editar Lote Existente';
      
      // Hacemos scroll hacia arriba suavemente para que el usuario vea el formulario
      document.querySelector('#modalLotesOverlay .modal-card').scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Botón Eliminar Lote
    const btnEliminar = e.target.closest('.btn-eliminar-lote');
    if (btnEliminar) {
      if (confirm('¿Estás seguro de que deseas eliminar este lote? Esta acción descontará las unidades del almacén general.')) {
        try {
          const res = await fetch(`/api/inventory/lotes/${btnEliminar.dataset.id}`, {
            method: 'DELETE',
            headers: { 'x-user-role': userRole }
          });
          
          if (res.ok) {
            // Si eliminamos un lote que estábamos editando, limpiamos el formulario
            if (loteEnEdicionId === btnEliminar.dataset.id) {
                formNuevoLote.reset();
                loteEnEdicionId = null;
                btnGuardarLote.textContent = 'Agregar Lote';
                document.querySelector('#formNuevoLote p strong').textContent = '+ Ingresar nueva mercancía';
            }

            cargarLotesDeProducto(productoId);
            cargarProductos(buscarInput?.value.trim()); 
          } else {
            alert('Error al eliminar el lote.');
          }
        } catch (error) {
          alert('Error de conexión.');
        }
      }
    }
  });
});