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
  const proveedoresContainer = document.getElementById('proveedoresContainer');
  const tablaBody = document.getElementById('tablaProductosBody');
  const productosCount = document.getElementById('productosCount');
  const buscarInput = document.getElementById('buscarProducto');
  const chkMostrarInactivos = document.getElementById('chkMostrarInactivos');

  // Funciones del Modal
  const toggleModal = (mostrar) => {
    modalOverlay.style.display = mostrar ? 'flex' : 'none';
    if (!mostrar) {
      productForm.reset();
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
        renderizarTabla(data.productos);
      } else {
        tablaBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color: red; text-align:center;">Error: ${data.mensaje || 'Datos no válidos'}</td></tr>`;
      }
    } catch (error) {
      console.error('Error al renderizar catálogo:', error);
      tablaBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color: red; text-align:center;">Error de conexión.</td></tr>`;
    }
  }

  /**
   * Dibuja los elementos en el cuerpo de la tabla.
   */
  function renderizarTabla(lista) {
    tablaBody.innerHTML = '';
    const textoEstado = chkMostrarInactivos?.checked ? 'incluyendo inactivos' : 'activos';
    productosCount.textContent = `${lista.length} producto(s) ${textoEstado}`;

    if (lista.length === 0) {
      tablaBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No se encontraron productos.</td></tr>`;
      return;
    }

    lista.forEach((p) => {
      const fila = document.createElement('tr');
      const opacidad = p.activo === false ? 'opacity: 0.6;' : ''; // Manejar posible estado undefined
      const inactivo = p.activo === false;

      const badgeHTML = !inactivo 
        ? `<span class="badge badge--success">${p.categoria || 'General'}</span>`
        : `<span class="badge badge--danger">Inactivo</span>`;
        
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
        <td style="${opacidad}">
          <small class="text-muted">${p.proveedores_nombres || 'Sin proveedor'}</small>
        </td>
        <td class="actions-cell">
          <button class="btn-icon-edit" title="Editar">Editar</button>
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

  // Guardado de formulario
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const checks = document.querySelectorAll('input[name="proveedor"]:checked');
    const proveedoresSeleccionados = Array.from(checks).map((cb) => Number(cb.value));

    if (proveedoresSeleccionados.length === 0) {
      mostrarAlerta('Debes asociar al menos un distribuidor al producto.', 'error');
      return;
    }

    const payload = {
      nombre: document.getElementById('nombreProducto').value.trim(),
      codigo_barras: document.getElementById('codigoBarras').value.trim(),
      categoria: document.getElementById('categoria').value.trim(),
      presentacion: document.getElementById('presentacion').value.trim(),
      unidad_medida: document.getElementById('unidadMedida').value,
      precio: parseFloat(document.getElementById('precio').value),
      stock_almacen: parseInt(document.getElementById('stock').value, 10) || 0,
      proveedoresIds: proveedoresSeleccionados
    };

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';
    ocultarAlerta();

    try {
      const res = await fetch(API_PRODUCTOS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        mostrarAlerta(data.mensaje || 'Producto registrado exitosamente.', 'success');
        cargarProductos(buscarInput?.value.trim());
        setTimeout(() => toggleModal(false), 1200);
      } else {
        mostrarAlerta(data.mensaje || 'Error al registrar el producto.', 'error');
      }
    } catch (err) {
      mostrarAlerta('Error de comunicación con el servidor.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Registrar Producto';
    }
  });

  // Listener para acciones en la tabla (delegación de eventos)
  tablaBody.addEventListener('click', async (e) => {
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
});