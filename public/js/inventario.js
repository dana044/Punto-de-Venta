/**
 * @file inventario.js
 * @description Controlador del lado del cliente para la vista de inventario.
 */

const API_INVENTARIO = '/api/inventory/productos';
const API_PROVEEDORES = '/api/inventory/proveedores';

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  // Validación de sesión
  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  // HU-03: Restricción de acceso
  if (userRole === 'cajero') {
    alert('Acceso no autorizado para tu rol (HU-03).');
    window.location.href = '/pos';
    return;
  }

  // HU-03: Despliegue condicional de módulos
  if (userRole === 'administrador') {
    const menuAdmin = document.getElementById('menuAdmin');
    const menuPos = document.getElementById('menuPos');
    if (menuAdmin) menuAdmin.hidden = false;
    if (menuPos) menuPos.hidden = false;
  }

  document.getElementById('btnLogout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login';
  });

  // Elementos del DOM
  const formulario = document.getElementById('productForm');
  const alerta = document.getElementById('modalAlertMessage'); 
  const btnSubmit = document.getElementById('submitBtn');
  const proveedoresContainer = document.getElementById('proveedoresContainer');
  const tablaProductosBody = document.getElementById('tablaProductosBody');
  const inputBuscar = document.getElementById('buscarProducto');
  const contadorProductos = document.getElementById('productosCount');
  
  // Elementos del Modal
  const modalOverlay = document.getElementById('modalOverlay');
  const btnNuevoProducto = document.getElementById('btnNuevoProducto');
  const btnCerrarModal = document.getElementById('btnCerrarModal');
  const cancelarBtn = document.getElementById('cancelarBtn');

  // Lógica del Modal
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

  // Cargar datos iniciales
  cargarProveedores();
  cargarListaProductos();

  // -----------------------------------------------------
  // Cargar Proveedores (Checkboxes)
  // -----------------------------------------------------
  async function cargarProveedores() {
    try {
      const res = await fetch(API_PROVEEDORES, {
        headers: { 'x-user-role': userRole }
      });
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
      console.error('Error al cargar proveedores:', err);
      proveedoresContainer.innerHTML = '<span class="text-muted">Error al cargar proveedores.</span>';
    }
  }

  // -----------------------------------------------------
  // Renderizar Tabla de Productos
  // -----------------------------------------------------
  async function cargarListaProductos() {
    try {
      const res = await fetch(API_INVENTARIO, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();
      
      if (res.ok) {
        renderizarTabla(data.productos || []);
      } else {
        tablaProductosBody.innerHTML = `
          <tr>
            <td colspan="6" class="empty-state" style="color: var(--color-danger);">
              <strong>Error del servidor:</strong> ${data.mensaje || 'Fallo desconocido'}
            </td>
          </tr>`;
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
      tablaProductosBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state" style="color: var(--color-danger);">
            <strong>Error de conexión.</strong> Revisa la consola del navegador.
          </td>
        </tr>`;
    }
  }

  function renderizarTabla(lista) {
    tablaProductosBody.innerHTML = '';
    contadorProductos.textContent = `${lista.length} producto(s)`;

    if (lista.length === 0) {
      tablaProductosBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">No se encontraron productos en el inventario.</td>
        </tr>`;
      return;
    }

    lista.forEach(prod => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prod.codigo_barras || 'N/A'}</td>
        <td>${prod.nombre}</td>
        <td><span class="badge badge--success">${prod.categoria || 'Sin categoría'}</span></td>
        <td>$${Number(prod.precio).toFixed(2)}</td>
        <td>${prod.stock_almacen !== undefined ? prod.stock_almacen : 0}</td>
        <td class="actions-cell">
          <button class="btn-icon-edit" title="Editar">Editar</button>
          <button class="btn-icon-delete" title="Eliminar">Eliminar</button>
        </td>
      `;
      tablaProductosBody.appendChild(tr);
    });
  }

  // -----------------------------------------------------
  // HU-09: Buscar productos
  // -----------------------------------------------------
  inputBuscar.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query === '') {
      cargarListaProductos();
      return;
    }
    
    try {
      const res = await fetch(`/api/inventory/productos/buscar?q=${encodeURIComponent(query)}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();
      if (res.ok) {
        renderizarTabla(data.productos || []);
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
    }
  });

  // -----------------------------------------------------
  // Guardar Nuevo Producto
  // -----------------------------------------------------
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validar que se seleccionó al menos un proveedor
    const checkboxes = document.querySelectorAll('input[name="proveedor"]:checked');
    const proveedoresSeleccionados = Array.from(checkboxes).map((cb) => cb.value);

    if (proveedoresSeleccionados.length === 0) {
      mostrarAlerta('Debes asociar al menos un distribuidor al producto.', 'error');
      return; // Detiene el envío
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
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
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

  function mostrarAlerta(mensaje, tipo) {
    alerta.textContent = mensaje;
    alerta.className = `alert alert--${tipo}`;
    alerta.hidden = false;
  }
});