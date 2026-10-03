/**
 * @file inventario.js
 * @description Controlador del lado del cliente para la gestion de inventario y proveedores.
 * Administra el control de acceso, sesion por inactividad, despliegue de menu por rol,
 * catalogo de productos y asociacion con distribuidores.
 * @author Citlaly Morales Viveros (Cliente / Programador XP)
 */

const API_PRODUCTOS = '/api/inventory/productos';
const API_PROVEEDORES = '/api/inventory/proveedores';

const API_ALERTAS = '/api/alerts';

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

  /**
   * Cierra la sesión automáticamente cuando se agota el tiempo de inactividad.
   * Limpia el almacenamiento local, avisa al usuario y redirige al login.
   */
  function cerrarSesionPorInactividad() {
    localStorage.clear();
    alert('Tu sesion ha expirado automaticamente por inactividad.');
    window.location.replace('/login');
  }

  /**
   * Reinicia el temporizador de inactividad cada vez que el usuario interactúa con la página.
   */
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
  const chkStockBajo = document.getElementById('chkStockBajo');
  const ordenStockBajo = document.getElementById('ordenStockBajo');
  let idsStockBajo = new Set();
  let idsAlertaAlmacen = new Set();
  let idsAlertaMostrador = new Set();

  let productosCache = [];

  /**
   * Muestra u oculta el modal de producto. Al ocultarlo restablece el formulario,
   * el título, el texto del botón y la alerta.
   *
   * @param {boolean} mostrar - true para mostrar el modal, false para ocultarlo.
   */
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
    const menuReporteVentas = document.getElementById('menuReporteVentas');

    if (rol === 'administrador') {
      menuPersonal?.removeAttribute('hidden');
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      menuProveedores?.removeAttribute('hidden');
      menuPos?.removeAttribute('hidden');
      menuReportes?.removeAttribute('hidden');
      menuReporteVentas?.removeAttribute('hidden');
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

  /**
   * Consulta los distribuidores y los dibuja como checkboxes en el formulario de producto.
   *
   * @async
   * @function cargarProveedores
   * @returns {Promise<void>}
   */
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

  /**
   * Consulta el catálogo (general o filtrado por búsqueda), lo guarda en caché y lo renderiza.
   * Respeta los filtros "Ver inactivos" (solo inactivos) y "Ver stock bajo" (solo stock bajo);
   * ambos son mutuamente excluyentes.
   *
   * @async
   * @function cargarProductos
   * @param {string} [termino=''] - Texto de búsqueda (nombre, código o categoría).
   * @returns {Promise<void>}
   */
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
        // "Ver inactivos" muestra SOLO los inactivos (el backend devuelve activos + inactivos)
        productosCache = chkMostrarInactivos?.checked
          ? data.productos.filter(esProductoInactivo)
          : data.productos;
        if (chkStockBajo?.checked) await cargarIdsStockBajo();
        renderizarTabla(chkStockBajo?.checked ? filtrarYOrdenarStockBajo(productosCache) : productosCache);
        // Refresca el banner de alertas.js (mismos umbrales que usa el backend)
        if (typeof window.cargarAlertas === 'function') window.cargarAlertas();
      } else {
        tablaBody.innerHTML = `<tr><td colspan="9" class="empty-state" style="color: red; text-align:center;">Error: ${data.mensaje || 'Datos no validos'}</td></tr>`;
      }
    } catch (error) {
      tablaBody.innerHTML = `<tr><td colspan="9" class="empty-state" style="color: red; text-align:center;">Error de conexion.</td></tr>`;
    }
  }

  /**
   * Consulta las alertas de stock bajo del backend (/api/alerts) y guarda los ids de los
   * productos afectados (en total y por ubicación). Así el filtro usa exactamente los mismos
   * umbrales que el banner.
   *
   * @async
   * @function cargarIdsStockBajo
   * @returns {Promise<void>}
   */
  async function cargarIdsStockBajo() {
    try {
      const res = await fetch(API_ALERTAS, { headers: { 'x-user-role': userRole } });
      const data = await res.json();
      const alertas = res.ok && Array.isArray(data.alertas) ? data.alertas : [];
      idsStockBajo = new Set(alertas.map((a) => a.productoId));
      idsAlertaAlmacen = new Set(alertas.filter((a) => a.ubicacion === 'almacen').map((a) => a.productoId));
      idsAlertaMostrador = new Set(alertas.filter((a) => a.ubicacion === 'mostrador').map((a) => a.productoId));
    } catch (error) {
      idsStockBajo = new Set();
      idsAlertaAlmacen = new Set();
      idsAlertaMostrador = new Set();
    }
  }

  /**
   * Indica si un producto está inactivo (activo = 0 o false).
   *
   * @param {Object} p - Producto del catálogo.
   * @returns {boolean} true si el producto está inactivo.
   */
  function esProductoInactivo(p) {
    return Number(p.activo) === 0 || p.activo === false;
  }

  /**
   * Deja solo los productos que están en alerta y los ordena de menor a mayor existencia.
   * Según la opción elegida muestra todos los que están en alerta (ordenados por almacén y,
   * en empate, por mostrador), solo los que están en alerta en almacén o solo en mostrador.
   *
   * @param {Array<Object>} lista - Productos a filtrar.
   * @returns {Array<Object>} Productos en alerta ya ordenados.
   */
  function filtrarYOrdenarStockBajo(lista) {
    const opcion = ordenStockBajo.value;
    const ids = opcion === 'almacen' ? idsAlertaAlmacen
      : opcion === 'mostrador' ? idsAlertaMostrador
      : idsStockBajo;
    const principal = opcion === 'mostrador' ? 'stock_mostrador' : 'stock_almacen';
    const secundaria = principal === 'stock_almacen' ? 'stock_mostrador' : 'stock_almacen';

    return lista
      .filter((p) => ids.has(p.id))
      .sort((a, b) => (Number(a[principal] || 0) - Number(b[principal] || 0))
        || (Number(a[secundaria] || 0) - Number(b[secundaria] || 0)));
  }

  /**
   * Genera el badge HTML según la cercanía de una fecha de caducidad.
   *
   * @param {string|null} fecha - Fecha de caducidad o null si no aplica.
   * @returns {string} HTML del badge (Sin fecha, Caducado, Caduca en Nd o Vigente).
   */
  function calcularBadgeCaducidad(fecha) {
    if (!fecha) return '<span class="text-muted">Sin fecha</span>';

    const hoy = new Date();
    const cad = new Date(fecha);
    const dias = Math.ceil((cad - hoy) / (1000 * 60 * 60 * 24));

    if (dias < 0) return `<span class="badge badge--danger">Caducado</span>`;
    if (dias <= 30) return `<span class="badge" style="background:#FEF3C7;color:#B45309;">Caduca en ${dias}d</span>`;
    return `<span class="badge badge--success">Vigente</span>`;
  }

  /**
   * Dibuja las filas de la tabla de productos con sus existencias y acciones
   * (Stock, Editar y el menú ⋮ con Desactivar/Reactivar y Archivar).
   *
   * @param {Array<Object>} lista - Productos a mostrar.
   */
  function renderizarTabla(lista) {
    tablaBody.innerHTML = '';
    const textoEstado = chkMostrarInactivos?.checked
      ? 'inactivos'
      : 'activos' + (chkStockBajo?.checked ? ' con stock bajo' : '');
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

      // Menú ⋮: agrupa las acciones de baja (Desactivar/Reactivar y Archivar)
      const menuOpcionesHTML = `
        <div class="menu-acciones" style="position: relative; display: inline-block;">
          <button class="btn-icon-edit btn-menu" data-id="${p.id}" title="Más opciones" style="background-color: #F3F4F6; color: #374151;">⋮</button>
          <div class="menu-acciones__lista" style="display: none; position: absolute; right: 0; z-index: 10; min-width: 120px; flex-direction: column; gap: 0.4rem; padding: 0.4rem; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
            ${botonEstadoHTML}
            <button class="btn-icon-delete btn-archivar" data-id="${p.id}" title="Archivar">Archivar</button>
          </div>
        </div>`;

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
        <button class="btn-icon-edit btn-stock" data-id="${p.id}" title="Gestionar Stock (lotes, mover y ajustar)" style="background-color: #DBEAFE; color: #1E3A8A;">Stock</button>
        <button class="btn-icon-edit btn-editar" data-id="${p.id}" title="Editar">Editar</button>
        ${menuOpcionesHTML}
      </td>
      `;
      tablaBody.appendChild(fila);
    });
  }

  buscarInput?.addEventListener('input', (e) => {
    cargarProductos(e.target.value.trim());
  });

  // "Ver inactivos": muestra solo los inactivos; desactiva "Ver stock bajo" (mutuamente excluyentes)
  chkMostrarInactivos?.addEventListener('change', () => {
    if (chkMostrarInactivos.checked && chkStockBajo) {
      chkStockBajo.checked = false;
      ordenStockBajo.style.display = 'none';
    }
    cargarProductos(buscarInput.value.trim());
  });

  // "Ver stock bajo": muestra el selector de orden, recarga la tabla filtrada
  // y desactiva "Ver inactivos" (mutuamente excluyentes)
  chkStockBajo?.addEventListener('change', () => {
    if (chkStockBajo.checked && chkMostrarInactivos) chkMostrarInactivos.checked = false;
    ordenStockBajo.style.display = chkStockBajo.checked ? 'block' : 'none';
    cargarProductos(buscarInput.value.trim());
  });

  ordenStockBajo?.addEventListener('change', () => {
    cargarProductos(buscarInput.value.trim());
  });

  /**
   * Abre el modal de producto cargado con los datos de catálogo (sin stock ni caducidad).
   *
   * @param {Object} producto - Producto a editar.
   */
  function abrirModalEdicion(producto) {
    document.getElementById('productoId').value = producto.id;
    document.getElementById('nombreProducto').value = producto.nombre;
    document.getElementById('codigoBarras').value = producto.codigo_barras;
    document.getElementById('categoria').value = producto.categoria || '';
    document.getElementById('presentacion').value = producto.presentacion || '';
    document.getElementById('unidadMedida').value = producto.unidad_medida || '';
    document.getElementById('precio').value = producto.precio;
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
    const btnArchivar = e.target.closest('.btn-archivar');

    let id = null, accion = null, mensajeConfirmacion = '';

    if (btnDesactivar) {
      id = btnDesactivar.dataset.id; accion = 'desactivar';
      mensajeConfirmacion = '¿Estas seguro de que deseas desactivar este producto?';
    } else if (btnActivar) {
      id = btnActivar.dataset.id; accion = 'activar';
      mensajeConfirmacion = '¿Deseas reactivar este producto para que vuelva a estar disponible?';
    } else if (btnArchivar) {
      id = btnArchivar.dataset.id; accion = 'archivar';
      mensajeConfirmacion = '⚠️ ATENCIÓN: El producto será archivado y desaparecerá del sistema. Si deseas recuperarlo en el futuro, deberás contactar a tu programador. ¿Continuar?';
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

  /**
   * Muestra una alerta dentro del modal de producto.
   *
   * @param {string} mensaje - Texto a mostrar.
   * @param {'success'|'error'} tipo - Tipo de alerta.
   */
  function mostrarAlerta(mensaje, tipo) {
    modalAlert.textContent = mensaje;
    modalAlert.className = `alert alert--${tipo}`;
    modalAlert.hidden = false;
  }

  /**
   * Oculta y limpia la alerta del modal de producto.
   */
  function ocultarAlerta() {
    if (modalAlert) {
      modalAlert.hidden = true;
      modalAlert.textContent = '';
    }
  }

  // ==========================================================================
  // MENÚ DE OPCIONES (⋮) DE CADA FILA
  // ==========================================================================

  /**
   * Cierra todos los menús ⋮ abiertos en la tabla.
   */
  function cerrarMenusAcciones() {
    document.querySelectorAll('.menu-acciones__lista').forEach((lista) => {
      lista.style.display = 'none';
    });
  }

  tablaBody.addEventListener('click', (e) => {
    const btnMenu = e.target.closest('.btn-menu');
    if (btnMenu) {
      const lista = btnMenu.nextElementSibling;
      const estabaAbierto = lista.style.display === 'flex';
      cerrarMenusAcciones();
      lista.style.display = estabaAbierto ? 'none' : 'flex';
      return;
    }
    cerrarMenusAcciones();
  });

  // Un clic fuera del menú también lo cierra
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-acciones')) cerrarMenusAcciones();
  });

  // ==========================================================================
  // LÓGICA DEL MODAL DE STOCK (LOTES + MOVER / AJUSTAR)
  // ==========================================================================
  const modalStock = document.getElementById('modalStockOverlay');
  const alertStock = document.getElementById('modalAlertStock');
  const stockProductoId = document.getElementById('stockProductoId');
  const formNuevoLote = document.getElementById('formNuevoLote');
  const tablaLotesBody = document.getElementById('tablaLotesBody');
  const btnGuardarLote = document.getElementById('btnGuardarLote');
  const formAjuste = document.getElementById('formAjuste');
  const btnGuardarAjuste = document.getElementById('btnGuardarAjuste');
  const inputCantidadAjuste = document.getElementById('cantidadAjuste');

  /**
   * Obtiene la fecha local de hoy en formato YYYY-MM-DD (para el atributo min de las caducidades).
   *
   * @returns {string} Fecha actual local.
   */
  function fechaLocalHoy() {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
  }

  /**
   * Muestra una alerta dentro del modal de stock.
   *
   * @param {string} mensaje - Texto a mostrar.
   * @param {'success'|'error'} tipo - Tipo de alerta.
   */
  function mostrarAlertaStock(mensaje, tipo) {
    alertStock.textContent = mensaje;
    alertStock.className = `alert alert--${tipo}`;
    alertStock.hidden = false;
  }

  /**
   * Cambia la pestaña activa del modal de stock.
   *
   * @param {string} idPestana - Id del contenido a mostrar ('tab-lotes' o 'tab-ajuste').
   */
  function cambiarPestana(idPestana) {
    modalStock.querySelectorAll('.tab-btn').forEach((btn) => {
      const activa = btn.dataset.target === idPestana;
      btn.classList.toggle('active', activa);
      btn.style.fontWeight = activa ? 'bold' : 'normal';
      btn.style.borderBottom = activa ? '2px solid var(--color-primary)' : 'none';
    });
    modalStock.querySelectorAll('.tab-content').forEach((contenido) => {
      contenido.style.display = contenido.id === idPestana ? 'block' : 'none';
    });
    alertStock.hidden = true;
  }

  /**
   * Muestra u oculta el modal de stock. Al ocultarlo restablece formularios y alertas.
   *
   * @param {boolean} mostrar - true para mostrar el modal, false para ocultarlo.
   */
  const toggleModalStock = (mostrar) => {
    modalStock.style.display = mostrar ? 'flex' : 'none';
    if (!mostrar) {
      formNuevoLote.reset();
      formAjuste.reset();
      alertStock.hidden = true;
      document.getElementById('grupoCaducidadAjuste').style.display = 'none';
      inputCantidadAjuste.min = 1;
    } else {
      const hoy = fechaLocalHoy();
      document.getElementById('loteCaducidad').setAttribute('min', hoy);
      document.getElementById('caducidadAjuste').setAttribute('min', hoy);
    }
  };

  document.getElementById('btnCerrarModalStock')?.addEventListener('click', () => toggleModalStock(false));
  document.getElementById('btnCerrarLotesFooter')?.addEventListener('click', () => toggleModalStock(false));
  document.getElementById('btnCancelarAjuste')?.addEventListener('click', () => toggleModalStock(false));

  modalStock.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => cambiarPestana(btn.dataset.target));
  });

  /**
   * Actualiza el subtítulo del modal con las existencias actuales del producto.
   *
   * @param {Object} producto - Producto con stock_almacen y stock_mostrador.
   */
  function actualizarSubtituloStock(producto) {
    document.getElementById('stockSubtitle').textContent =
      `${producto.codigo_barras} - ${producto.nombre} (Almacén: ${producto.stock_almacen || 0} | Mostrador: ${producto.stock_mostrador || 0})`;
  }

  /**
   * Recarga la tabla principal, los lotes y el subtítulo del modal tras un cambio de stock.
   *
   * @async
   * @function refrescarStock
   * @param {number|string} productoId - Producto que se está gestionando.
   * @returns {Promise<void>}
   */
  async function refrescarStock(productoId) {
    await cargarProductos(buscarInput?.value.trim());
    const producto = productosCache.find((p) => p.id == productoId);
    if (producto) actualizarSubtituloStock(producto);
    await cargarLotesDeProducto(productoId);
  }

  /**
   * Consulta los lotes de almacén de un producto y los dibuja en la tabla del modal.
   *
   * @async
   * @function cargarLotesDeProducto
   * @param {number|string} productoId - Producto cuyos lotes se consultan.
   * @returns {Promise<void>}
   */
  async function cargarLotesDeProducto(productoId) {
    tablaLotesBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando lotes...</td></tr>';
    try {
      const res = await fetch(`${API_PRODUCTOS}/${productoId}/lotes`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (res.ok) {
        tablaLotesBody.innerHTML = '';
        if (data.lotes.length === 0) {
          tablaLotesBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #6B7280;">No hay lotes en almacén para este producto.</td></tr>';
          return;
        }

        data.lotes.forEach((lote) => {
          const caducidadFormateada = lote.fecha_caducidad ? String(lote.fecha_caducidad).substring(0, 10) : '';
          const textoCaducidad = caducidadFormateada || 'Sin caducidad';
          const fechaRegistro = new Date(lote.recibido_en).toLocaleDateString();

          tablaLotesBody.innerHTML += `
            <tr>
              <td><span class="badge" style="background:#E5E7EB; color:#374151;">L-${lote.id}</span></td>
              <td><strong>${lote.cantidad}</strong></td>
              <td>${calcularBadgeCaducidad(lote.fecha_caducidad)} <br><small class="text-muted">${textoCaducidad}</small></td>
              <td>${fechaRegistro}</td>
              <td>
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

  // Interceptar el clic en el botón "Stock" de la tabla principal
  tablaBody.addEventListener('click', (e) => {
    const btnStock = e.target.closest('.btn-stock');
    if (btnStock) {
      e.preventDefault();
      const producto = productosCache.find((p) => p.id == btnStock.dataset.id);
      if (producto) {
        stockProductoId.value = producto.id;
        document.getElementById('stockTitle').textContent = 'Gestión de Stock';
        actualizarSubtituloStock(producto);
        cambiarPestana('tab-lotes');
        toggleModalStock(true);
        cargarLotesDeProducto(producto.id);
      }
    }
  });

  // Interceptar el envío del formulario para crear un nuevo lote
  formNuevoLote?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productoId = stockProductoId.value;

    const payload = {
      cantidad: Number(document.getElementById('loteCantidad').value),
      fecha_caducidad: document.getElementById('loteCaducidad').value || null
    };

    btnGuardarLote.disabled = true;
    btnGuardarLote.textContent = 'Guardando...';
    alertStock.hidden = true;

    try {
      const res = await fetch(`${API_PRODUCTOS}/${productoId}/lotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        mostrarAlertaStock('Lote agregado exitosamente al almacén.', 'success');
        formNuevoLote.reset();
        await refrescarStock(productoId);
      } else {
        mostrarAlertaStock(data.mensaje || 'Error al procesar el lote.', 'error');
      }
    } catch (error) {
      mostrarAlertaStock('Error de comunicación con el servidor.', 'error');
    } finally {
      btnGuardarLote.disabled = false;
      btnGuardarLote.textContent = 'Agregar Lote';
    }
  });

  // Interceptar el clic para eliminar un lote específico
  tablaLotesBody?.addEventListener('click', async (e) => {
    const btnEliminar = e.target.closest('.btn-eliminar-lote');
    if (!btnEliminar) return;

    const productoId = stockProductoId.value;
    if (confirm('¿Estás seguro de que deseas eliminar este lote? Esta acción descontará las unidades del almacén general.')) {
      try {
        const res = await fetch(`${API_PRODUCTOS}/${productoId}/lotes/${btnEliminar.dataset.id}`, {
          method: 'DELETE',
          headers: { 'x-user-role': userRole }
        });

        if (res.ok) {
          mostrarAlertaStock('Lote eliminado. El stock de almacén se actualizó.', 'success');
          await refrescarStock(productoId);
        } else {
          const data = await res.json();
          mostrarAlertaStock(data.mensaje || 'Error al eliminar el lote.', 'error');
        }
      } catch (error) {
        mostrarAlertaStock('Error de conexión.', 'error');
      }
    }
  });

  // Mostrar la caducidad solo al regresar a almacén; el conteo físico permite cantidad 0
  document.getElementById('tipoAjuste').addEventListener('change', (e) => {
    const val = e.target.value;
    document.getElementById('grupoCaducidadAjuste').style.display = val === 'regresar_almacen' ? 'block' : 'none';
    inputCantidadAjuste.min = val === 'conteo_mostrador' ? 0 : 1;
  });

  // Aplicar ajuste / mover stock
  formAjuste.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productoId = stockProductoId.value;
    const payload = {
      tipoAjuste: document.getElementById('tipoAjuste').value,
      cantidad: Number(inputCantidadAjuste.value),
      motivo: document.getElementById('motivoAjuste').value.trim(),
      caducidad: document.getElementById('caducidadAjuste').value || null
    };

    btnGuardarAjuste.disabled = true;
    btnGuardarAjuste.textContent = 'Procesando...';
    alertStock.hidden = true;

    try {
      const res = await fetch(`${API_PRODUCTOS}/${productoId}/ajuste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        mostrarAlertaStock(data.mensaje, 'success');
        formAjuste.reset();
        document.getElementById('grupoCaducidadAjuste').style.display = 'none';
        inputCantidadAjuste.min = 1;
        await refrescarStock(productoId);
      } else {
        mostrarAlertaStock(data.mensaje || 'Error al realizar el ajuste.', 'error');
      }
    } catch (err) {
      mostrarAlertaStock('Error de comunicación con el servidor.', 'error');
    } finally {
      btnGuardarAjuste.disabled = false;
      btnGuardarAjuste.textContent = 'Registrar Acción';
    }
  });
});