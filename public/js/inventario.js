/**
 * @file inventario.js
 * @description Controlador del lado del cliente para la gestion de inventario.
 * Gestiona el control de acceso, adaptacion de la barra lateral segun rol,
 * consulta de catalogo y persistencia de distribuidores asociados en MySQL.
 * @author Stephanie Elizdeth Hernandez Prieto (Tracker / Programadora XP)
 */

const API_PRODUCTOS = '/api/inventory/productos';
const API_PROVEEDORES = '/api/inventory/proveedores';

document.addEventListener('DOMContentLoaded', () => {
  /** @type {string|null} Rol de usuario obtenido del almacenamiento de sesion */
  const userRole = localStorage.getItem('userRole');

  /** @type {string|null} Token de sesion */
  const token = localStorage.getItem('token');

  // Control de sesion
  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  // Restriccion de acceso para cajeros
  if (userRole === 'cajero') {
    alert('Acceso no autorizado para tu rol de usuario.');
    window.location.href = '/pos';
    return;
  }

  // Adaptar opciones visibles en la barra lateral segun el perfil
  configurarMenuPorRol(userRole);

  // Cierre de sesion
  document.getElementById('btnLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login';
  });

  // Referencias a elementos del DOM
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

  // Control de apertura y cierre del modal
  const abrirModal = () => {
    productForm.reset();
    ocultarAlerta();
    modalOverlay.style.display = 'flex';
  };

  const cerrarModal = () => {
    modalOverlay.style.display = 'none';
  };

  btnNuevoProducto.addEventListener('click', abrirModal);
  btnCerrarModal.addEventListener('click', cerrarModal);
  cancelarBtn.addEventListener('click', cerrarModal);

  // Inicializacion de datos
  cargarProveedores();
  cargarProductos();

  // Busqueda en tiempo real
  buscarInput?.addEventListener('input', (e) => {
    const termino = e.target.value.trim();
    cargarProductos(termino);
  });

/**
   * Configura la visibilidad del menú lateral según el rol del usuario autenticado.
   * @param {string} rol - Rol actual obtenido de la sesión.
   */
  function configurarMenuPorRol(rol) {
    const menuPersonal = document.getElementById('menuPersonal');
    const menuInventario = document.getElementById('menuInventario');
    const menuRecepcion = document.getElementById('menuRecepcion');
    const menuPos = document.getElementById('menuPos');

    if (rol === 'administrador') {
      // El administrador tiene acceso a todos los módulos
      menuPersonal?.removeAttribute('hidden');
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      menuPos?.removeAttribute('hidden');
    } else if (rol === 'almacenista') {
      // El almacenista solo accede a Inventario y Recepción
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      if (menuPersonal) menuPersonal.hidden = true;
      if (menuPos) menuPos.hidden = true;
    }
  }

  /**
   * Carga los distribuidores desde MySQL y genera las casillas de verificacion.
   *
   * @async
   * @function cargarProveedores
   * @returns {Promise<void>}
   */
  async function cargarProveedores() {
    try {
      const res = await fetch(API_PROVEEDORES);
      const data = await res.json();

      if (res.ok && Array.isArray(data.proveedores)) {
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
            <span>${prov.nombre}</span>
          `;
          proveedoresContainer.appendChild(label);
        });
      }
    } catch (err) {
      proveedoresContainer.innerHTML = '<span class="text-muted">Error al cargar proveedores.</span>';
    }
  }

  /**
   * Obtiene y renderiza el catalogo de productos en la tabla.
   *
   * @async
   * @function cargarProductos
   * @param {string} [termino=''] - Criterio opcional de filtrado.
   * @returns {Promise<void>}
   */
  async function cargarProductos(termino = '') {
    try {
      const url = termino ? `${API_PRODUCTOS}?q=${encodeURIComponent(termino)}` : API_PRODUCTOS;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && Array.isArray(data.productos)) {
        tablaBody.innerHTML = '';
        productosCount.textContent = `${data.productos.length} productos`;

        if (data.productos.length === 0) {
          tablaBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No hay productos registrados.</td></tr>`;
          return;
        }

        data.productos.forEach((p) => {
          const fila = document.createElement('tr');
          fila.innerHTML = `
            <td><code>${p.codigo_barras}</code></td>
            <td>
              <strong>${p.nombre}</strong><br/>
              <small class="text-muted">${p.presentacion || ''} (${p.unidad_medida || ''})</small>
            </td>
            <td><span class="badge badge--success">${p.categoria || 'General'}</span></td>
            <td>$${Number(p.precio).toFixed(2)}</td>
            <td>${p.stock_almacen}</td>
            <td>
              <small class="text-muted">${p.proveedores_nombres || 'Sin proveedor'}</small>
            </td>
          `;
          tablaBody.appendChild(fila);
        });
      }
    } catch (error) {
      console.error('Error al renderizar catalogo:', error);
    }
  }

  /**
   * Gestiona el registro del formulario, recolectando la seleccion de proveedores.
   */
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const checks = document.querySelectorAll('input[name="proveedor"]:checked');
    const proveedoresSeleccionados = Array.from(checks).map((cb) => Number(cb.value));

    if (proveedoresSeleccionados.length === 0) {
      mostrarAlerta('Debes seleccionar al menos un distribuidor.', 'error');
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
        mostrarAlerta(data.mensaje, 'success');
        productForm.reset();
        await cargarProductos();
        setTimeout(() => cerrarModal(), 1200);
      } else {
        mostrarAlerta(data.mensaje || 'Error al registrar el producto.', 'error');
      }
    } catch (err) {
      mostrarAlerta('Error de comunicacion con el servidor.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Registrar Producto';
    }
  });

  function mostrarAlerta(mensaje, tipo) {
    modalAlert.textContent = mensaje;
    modalAlert.className = `alert alert--${tipo}`;
    modalAlert.hidden = false;
  }

  function ocultarAlerta() {
    modalAlert.hidden = true;
    modalAlert.textContent = '';
  }
});