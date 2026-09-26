/**
 * @file inventario.js
 * @description Controlador del lado del cliente para la gestión de inventario y proveedores (Unificado).
 */

const API_PRODUCTOS = '/api/inventory/productos';
const API_PROVEEDORES = '/api/inventory/proveedores';

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  // Validación de sesión
  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  // Restricción de acceso
  if (userRole === 'cajero') {
    alert('Acceso no autorizado para tu rol.');
    window.location.href = '/pos';
    return;
  }

  // Configuración de interfaz según rol
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

  /**
   * Guarda en memoria la última lista de productos cargada del servidor,
   * para poder rellenar el formulario de edición sin hacer una petición
   * adicional al servidor al hacer clic en "Editar".
   * @type {Array<Object>}
   */
  let productosCache = [];

  // Funciones del Modal
  /**
   * Muestra u oculta el modal de producto. Al cerrarlo, además de limpiar
   * el formulario, regresa el modal a su estado por defecto de "Registrar"
   * (título, texto del botón e id oculto), para que un registro nuevo
   * nunca herede los datos de una edición anterior.
   * @param {boolean} mostrar
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

  // Carga inicial
  cargarProveedores();
  cargarProductos();

  /**
   * Configura la visibilidad del menú lateral dependiendo del rol del usuario.
   */
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

  /**
   * Carga la lista de proveedores para el formulario de registro.
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
   * Carga los productos uniendo la búsqueda y el filtro de inactivos.
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
        productosCache = data.productos;
        renderizarTabla(data.productos);
      } else {
        tablaBody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color: red; text-align:center;">Error: ${data.mensaje || 'Datos no válidos'}</td></tr>`;
      }
    } catch (error) {
      console.error('Error al renderizar catálogo:', error);
      tablaBody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color: red; text-align:center;">Error de conexión.</td></tr>`;
    }
  }

  /**
   * Calcula el estado de vigencia de un producto a partir de su fecha de
   * caducidad y devuelve el HTML de una etiqueta de color):
   * rojo si ya caducó, ámbar si caduca en 30 días o menos, verde si está
   * vigente, y gris si el producto no tiene fecha de caducidad registrada.
   * @param {string|null} fecha - Fecha de caducidad en formato ISO (YYYY-MM-DD).
   * @returns {string} HTML de la etiqueta a insertar en la tabla.
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
   * Dibuja los elementos en el cuerpo de la tabla).
   */
  function renderizarTabla(lista) {
    tablaBody.innerHTML = '';
    const textoEstado = chkMostrarInactivos?.checked ? 'incluyendo inactivos' : 'activos';
    productosCount.textContent = `${lista.length} producto(s) ${textoEstado}`;

    if (lista.length === 0) {
      tablaBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No se encontraron productos.</td></tr>`;
      return;
    }

    lista.forEach((p) => {
      const fila = document.createElement('tr');
      const opacidad = p.activo === false ? 'opacity: 0.6;' : ''; // Manejar posible estado undefined
      const inactivo = p.activo === false;

      const badgeHTML = !inactivo
        ? `<span class="badge badge--success">${p.categoria || 'General'}</span>`
        : `<span class="badge badge--danger">Inactivo</span>`;

      const badgeCaducidad = calcularBadgeCaducidad(p.fecha_caducidad);

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
        <td style="${opacidad}">${p.stock_almacen !== undefined ? p.stock_almacen : 0}</td>
        <td style="${opacidad}">${badgeCaducidad}</td>
        <td style="${opacidad}">
          <small class="text-muted">${p.proveedores_nombres || 'Sin proveedor'}</small>
        </td>
        <td class="actions-cell">
          <button class="btn-icon-edit btn-ajustar" data-id="${p.id}" title="Ajustar Stock" style="background-color: #F3E8FF; color: #7E22CE;">Ajustar</button>
          <button class="btn-icon-edit" data-id="${p.id}" title="Editar">Editar</button>
          ${botonEstadoHTML}
          <button class="btn-icon-delete btn-eliminar" data-id="${p.id}" title="Eliminar">Eliminar</button>
        </td>
      `;
      tablaBody.appendChild(fila);
    });
  }

  // Listeners de filtros
  buscarInput?.addEventListener('input', (e) => {
    cargarProductos(e.target.value.trim());
  });

  chkMostrarInactivos?.addEventListener('change', () => {
    cargarProductos(buscarInput.value.trim());
  });

  /**
   * Abre el modal en modo edición y rellena el formulario con los datos
   * del producto seleccionado.
   * @param {Object} producto - Producto tomado de `productosCache`.
   */
  function abrirModalEdicion(producto) {
    document.getElementById('productoId').value = producto.id;
    document.getElementById('nombreProducto').value = producto.nombre;
    document.getElementById('codigoBarras').value = producto.codigo_barras;
    document.getElementById('categoria').value = producto.categoria || '';
    document.getElementById('presentacion').value = producto.presentacion || '';
    document.getElementById('unidadMedida').value = producto.unidad_medida || '';
    document.getElementById('precio').value = producto.precio;
    document.getElementById('stock').value = producto.stock_almacen;

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

  /**
   * Guarda el formulario de producto.
   */
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
      mostrarAlerta('Error de comunicación con el servidor.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = textoDefault;
    }
  });

  /**
   * Listener para las acciones de la tabla: 
   * editar, desactivar, reactivar y eliminar un producto.
   */
  tablaBody.addEventListener('click', async (e) => {
    // Editar: abre el modal precargado con los datos del producto (HU07).
    const btnEditar = e.target.closest('.btn-icon-edit');
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
      mensajeConfirmacion = '¿Estás seguro de que deseas desactivar este producto?';
    } else if (btnActivar) {
      id = btnActivar.dataset.id; accion = 'activar';
      mensajeConfirmacion = '¿Deseas reactivar este producto para que vuelva a estar disponible?';
    } else if (btnEliminar) {
      id = btnEliminar.dataset.id; accion = 'eliminar';
      mensajeConfirmacion = '¿Estás seguro de que deseas eliminar DEFINITIVAMENTE este producto?';
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
          alert(datos.mensaje || `Error al procesar la acción.`);
        }
      } catch (error) {
        alert('Error de comunicación con el servidor.');
      }
    }
  });

  // Utilidades de mensajes
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
    }
  };

  document.getElementById('btnCerrarModalAjuste')?.addEventListener('click', () => toggleModalAjuste(false));
  document.getElementById('btnCancelarAjuste')?.addEventListener('click', () => toggleModalAjuste(false));

  function abrirModalAjuste(producto) {
    document.getElementById('ajusteProductoId').value = producto.id;
    document.getElementById('nombreProductoAjuste').textContent = `${producto.nombre} (Stock actual: ${producto.stock_almacen})`;
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

  formAjuste.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('ajusteProductoId').value;
    const payload = {
      tipoAjuste: document.getElementById('tipoAjuste').value,
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
});