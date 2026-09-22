/**
 * @file empleado.js
 * @description Controlador del lado del cliente para el registro de empleados (HU10).
 */

/**
 * Ruta base de la API para el alta de empleados.
 * @constant {string}
 */
const API_EMPLEADOS = '/api/employees';

document.addEventListener('DOMContentLoaded', () => {
  /** @type {string|null} Rol de usuario almacenado durante la autenticación */
  const userRole = localStorage.getItem('userRole');

  /** @type {string|null} Token de sesión almacenado */
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  /** HU10: solo el administrador puede registrar empleados. */
  if (userRole !== 'administrador') {
    alert('Acceso no autorizado para tu rol. Solo el administrador puede registrar empleados.');
    window.location.href = '/inventario';
    return;
  }

  /**
   * Listener para el cierre de sesión del usuario.
   */
  document.getElementById('btnLogout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login';
  });

  const formulario = document.getElementById('employeeForm');
  const alerta = document.getElementById('alertMessage');
  const btnSubmit = document.getElementById('submitBtn');
  const btnCancelar = document.getElementById('cancelarBtn');

  btnCancelar.addEventListener('click', () => {
    formulario.reset();
    alerta.hidden = true;
  });

  /**
   * Manejador de evento para el envío del formulario de registro (HU10).
   */
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const confirmarPassword = document.getElementById('confirmarPassword').value;

    if (password !== confirmarPassword) {
      mostrarAlerta('Las contraseñas no coinciden.', 'error');
      return;
    }

    const empleadoData = {
      nombreCompleto: document.getElementById('nombreCompleto').value.trim(),
      puesto: document.getElementById('puesto').value.trim(),
      role: document.getElementById('role').value,
      username: document.getElementById('username').value.trim(),
      password,
      confirmarPassword
    };

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';
    alerta.hidden = true;

    try {
      const respuesta = await fetch(API_EMPLEADOS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole /** El middleware permitirRoles lee esta cabecera */
        },
        body: JSON.stringify(empleadoData)
      });

      const datos = await respuesta.json();

      if (respuesta.ok) {
        mostrarAlerta(datos.mensaje, 'success');
        formulario.reset();
      } else {
        mostrarAlerta(datos.mensaje || 'Error al registrar el empleado.', 'error');
      }
    } catch (error) {
      mostrarAlerta('Error de comunicación con el servidor.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Guardar Empleado';
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