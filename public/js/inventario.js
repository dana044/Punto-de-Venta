/**
 * @file inventario.js
 * @description Controlador del lado del cliente para la vista de inventario.
 */

/**
 * Ruta base de la API para el recurso de productos.
 * @constant {string}
 */
const API_INVENTARIO = '/api/inventory/productos';

/**
 * Ruta base de la API para el catálogo de distribuidores.
 * @constant {string}
 */
const API_PROVEEDORES = '/api/inventory/proveedores';

document.addEventListener('DOMContentLoaded', () => {
  /** @type {string|null} Rol de usuario almacenado durante la autenticación */
  const userRole = localStorage.getItem('userRole');

  /** @type {string|null} Token de sesión almacenado */
  const token = localStorage.getItem('token');

  // Validación de sesión
  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  // Restricción de acceso para rol cajero
  if (userRole === 'cajero') {
    alert('Acceso no autorizado para tu rol.');
    window.location.href = '/pos';
    return;
  }

  //Despliegue condicional de módulos en la barra lateral
  if (userRole === 'administrador') {
    const menuAdmin = document.getElementById('menuAdmin');
    const menuPos = document.getElementById('menuPos');
    if (menuAdmin) menuAdmin.hidden = false;
    if (menuPos) menuPos.hidden = false;
  }

  /**
   * Listener para el cierre de sesión del usuario.
   */
  document.getElementById('btnLogout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login';
  });

  const formulario = document.getElementById('productForm');
  const alerta = document.getElementById('modalAlertMessage'); 
  const btnSubmit = document.getElementById('submitBtn');
  const proveedoresContainer = document.getElementById('proveedoresContainer');
  const tablaProductosBody = document.getElementById('tablaProductosBody');
  const inputBuscar = document.getElementById('buscarProducto');
  const contadorProductos = document.getElementById('productosCount');
  
  const modalOverlay = document.getElementById('modalOverlay');
  const btnNuevoProducto = document.getElementById('btnNuevoProducto');
  const btnCerrarModal = document.getElementById('btnCerrarModal');
  const cancelarBtn = document.getElementById('cancelarBtn');

  const chkMostrarInactivos = document.getElementById('chkMostrarInactivos');

  const toggleModal = (mostrar) => {
    modalOverlay.style.display = mostrar ? 'flex' : 'none';
    if (!mostrar) {
      formulario.reset();
      alerta.hidden = true;
    }
  };

  btnNuevoProducto.addEventListener('click', () => toggleModal(true));
  btnCerrarModal.addEventListener('click', () => toggleModal(false));
  cancelarBtn.addEventListener('click', () => toggleModal(false));

  cargarProveedores();
  cargarListaProductos();

  /**
   * Consulta la API y renderiza los checkboxes de los distribuidores disponibles.
   *
   * @async
   * @function cargarProveedores
   * @returns {Promise<void>}
   */
  async function cargarProveedores() {
    try {
      const res = await fetch(API_PROVEEDORES, { headers: { 'x-user-role': userRole } });
      const data = await res.json();

      if (res.ok && data.proveedores) {
        if (!proveedoresContainer) return; 
        proveedoresContainer.innerHTML = '';
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
   * Consulta la API para obtener los productos activos y los renderiza en la tabla.
   *
   * @async
   * @function cargarListaProductos
   * @returns {Promise<void>}
   */
  async function cargarListaProductos() {
    // Agrega el parámetro inactivos a la URL si el checkbox está marcado
    const queryInactivos = chkMostrarInactivos.checked ? '?inactivos=true' : '';
    try {
      const res = await fetch(`${API_INVENTARIO}${queryInactivos}`, { headers: { 'x-user-role': userRole } });
      const data = await res.json();
      
      if (res.ok) renderizarTabla(data.productos || []);
      else tablaProductosBody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color: red;">Error: ${data.mensaje}</td></tr>`;
    } catch (err) {
      tablaProductosBody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color: red;">Error de conexión.</td></tr>`;
    }
  }

  /**
   * Inyecta las filas HTML en el cuerpo de la tabla en base a la lista de productos.
   *
   * @function renderizarTabla
   * @param {Array<Object>} lista - Arreglo de productos a renderizar.
   */
  function renderizarTabla(lista) {
    tablaProductosBody.innerHTML = '';
    contadorProductos.textContent = `${lista.length} producto(s) ${chkMostrarInactivos.checked ? 'inactivos' : 'activos'}`;

    if (lista.length === 0) {
      tablaProductosBody.innerHTML = `<tr><td colspan="6" class="empty-state">No se encontraron productos.</td></tr>`;
      return;
    }

    lista.forEach(prod => {
      const tr = document.createElement('tr');
      
      // Lógica visual: Si está inactivo, mostrar badge gris/rojo y botón de reactivar
      const badgeHTML = prod.activo 
        ? `<span class="badge badge--success">${prod.categoria || 'Sin categoría'}</span>`
        : `<span class="badge badge--danger">Inactivo</span>`;
        
      const botonEstadoHTML = prod.activo
        ? `<button class="btn-icon-delete btn-desactivar" data-id="${prod.id}" title="Desactivar" style="background-color: #FEF3C7; color: #B45309;">Desactivar</button>`
        : `<button class="btn-icon-delete btn-activar" data-id="${prod.id}" title="Reactivar" style="background-color: #E6F0EF; color: var(--color-primary);">Reactivar</button>`;

      tr.innerHTML = `
        <td style="${!prod.activo ? 'opacity: 0.6;' : ''}">${prod.codigo_barras || 'N/A'}</td>
        <td style="${!prod.activo ? 'opacity: 0.6;' : ''}">${prod.nombre}</td>
        <td>${badgeHTML}</td>
        <td style="${!prod.activo ? 'opacity: 0.6;' : ''}">$${Number(prod.precio).toFixed(2)}</td>
        <td style="${!prod.activo ? 'opacity: 0.6;' : ''}">${prod.stock_almacen !== undefined ? prod.stock_almacen : 0}</td>
        <td class="actions-cell">
          <button class="btn-icon-edit" title="Editar">Editar</button>
          ${botonEstadoHTML}
          <button class="btn-icon-delete btn-eliminar" data-id="${prod.id}" title="Eliminar">Eliminar</button>
        </td>
      `;
      tablaProductosBody.appendChild(tr);
    });
  }

  /**
   * Manejador de evento para filtrar productos en tiempo real.
   */
  inputBuscar.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query === '') {
      cargarListaProductos();
      return;
    }
    const queryInactivos = chkMostrarInactivos.checked ? '&inactivos=true' : '';
    try {
      const res = await fetch(`/api/inventory/productos/buscar?q=${encodeURIComponent(query)}${queryInactivos}`, { headers: { 'x-user-role': userRole } });
      const data = await res.json();
      if (res.ok) renderizarTabla(data.productos || []);
    } catch (error) {
      console.error('Error en búsqueda:', error);
    }
  });

  // Escuchar el cambio en el checkbox para recargar la tabla
  chkMostrarInactivos.addEventListener('change', () => {
    cargarListaProductos();
    // Si hay algo escrito en el buscador, lo limpiamos para evitar confusiones
    inputBuscar.value = ''; 
  });

  /**
   * Manejador de evento para el envío del formulario de registro de producto.
   */
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    const checkboxes = document.querySelectorAll('input[name="proveedor"]:checked');
    const proveedoresSeleccionados = Array.from(checkboxes).map((cb) => cb.value);

    if (proveedoresSeleccionados.length === 0) {
      mostrarAlerta('Debes asociar al menos un distribuidor al producto.', 'error');
      return; 
    }

    const productoData = {
      nombre: document.getElementById('nombreProducto').value.trim(),
      codigo_barras: document.getElementById('codigoBarras').value.trim(),
      categoria: document.getElementById('categoria').value.trim(),
      presentacion: document.getElementById('presentacion').value.trim(),
      unidad_medida: document.getElementById('unidadMedida').value,
      precio: parseFloat(document.getElementById('precio').value),
      stock_almacen: parseInt(document.getElementById('stock').value),
      proveedoresIds: proveedoresSeleccionados
    };

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';
    alerta.hidden = true;

    try {
      const respuesta = await fetch(API_INVENTARIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify(productoData)
      });
      const datos = await respuesta.json();

      if (respuesta.ok) {
        mostrarAlerta('Producto registrado exitosamente.', 'success');
        cargarListaProductos(); 
        setTimeout(() => toggleModal(false), 1500); 
      } else {
        mostrarAlerta(datos.mensaje || 'Error al registrar el producto.', 'error');
      }
    } catch (error) {
      mostrarAlerta('Error de comunicación con el servidor.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Registrar Producto';
    }
  });

  /**
   * Muestra mensajes informativos, de éxito o de error en el modal.
   *
   * @function mostrarAlerta
   * @param {string} mensaje - Contenido textual de la notificación.
   * @param {'success'|'error'} tipo - Variante visual de la alerta.
   */
  function mostrarAlerta(mensaje, tipo) {
    alerta.textContent = mensaje;
    alerta.className = `alert alert--${tipo}`;
    alerta.hidden = false;
  }

  /**
   * Manejador de eventos delegado para procesar la baja de productos.
   * Captura los clics en los botones de acción para procesar desactivaciones o eliminaciones.
   */
  tablaProductosBody.addEventListener('click', async (e) => {
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
          cargarListaProductos(); 
        } else {
          alert(datos.mensaje || `Error al procesar la acción.`);
        }
      } catch (error) {
        alert('Error de comunicación con el servidor.');
      }
    }
  });
});