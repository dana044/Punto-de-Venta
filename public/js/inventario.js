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
 * Ruta base de la API para el catálogo de distribuidores (HU-11).
 * @constant {string}
 */
const API_PROVEEDORES = '/api/inventory/proveedores';

document.addEventListener('DOMContentLoaded', () => {
  /** @type {string|null} Rol de usuario almacenado durante la autenticación */
  const userRole = localStorage.getItem('userRole');

  /** @type {string|null} Token de sesión almacenado */
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  // HU-03: Restricción de acceso para rol cajero
  if (userRole === 'cajero') {
    alert('Acceso no autorizado para tu rol (HU-03).');
    window.location.href = '/pos';
    return;
  }

  // HU-03: Despliegue condicional de módulos en la barra lateral
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
  const alerta = document.getElementById('alertMessage');
  const btnSubmit = document.getElementById('submitBtn');
  const proveedoresContainer = document.getElementById('proveedoresContainer');

  cargarProveedores();

  /**
   * Consulta la API y renderiza los checkboxes de los distribuidores disponibles (HU-11).
   *
   * @async
   * @function cargarProveedores
   * @returns {Promise<void>}
   */
  async function cargarProveedores() {
    try {
      const res = await fetch(API_PROVEEDORES);
      const data = await res.json();

      if (res.ok && data.proveedores) {
        proveedoresContainer.innerHTML = '';
        data.proveedores.forEach((prov) => {
          const label = document.createElement('label');
          label.className = 'checkbox-item';
          label.innerHTML = `
            <input type="checkbox" name="proveedor" value="${prov.id}">
            <span>${prov.nombre}</span>
          `;
          proveedoresContainer.appendChild(label);
        });
      } else {
        proveedoresContainer.innerHTML = '<span class="text-muted">No se pudieron cargar los distribuidores.</span>';
      }
    } catch (err) {
      proveedoresContainer.innerHTML = '<span class="text-muted">Error de conexión al obtener distribuidores.</span>';
    }
  }

  /**
   * Manejador de evento para el envío del formulario de registro.
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
      nombre: document.getElementById('nombre').value.trim(),
      codigo_barras: document.getElementById('codigo_barras').value.trim(),
      presentacion: document.getElementById('presentacion').value.trim(),
      unidad_medida: document.getElementById('unidad_medida').value,
      precio: parseFloat(document.getElementById('precio').value),
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
          'x-user-role': userRole // HU-03: Credencial enviada en cabecera
        },
        body: JSON.stringify(productoData)
      });

      const datos = await respuesta.json();

      if (respuesta.ok) {
        mostrarAlerta(datos.mensaje, 'success');
        formulario.reset();
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
   * Muestra mensajes informativos, de éxito o de error en la interfaz.
   *
   * @function mostrarAlerta
   * @param {string} mensaje - Contenido textual de la notificación.
   * @param {'success'|'error'} tipo - Variante visual de la alerta.
   * @returns {void}
   */
  function mostrarAlerta(mensaje, tipo) {
    alerta.textContent = mensaje;
    alerta.className = `alert alert--${tipo}`;
    alerta.hidden = false;
  }
});