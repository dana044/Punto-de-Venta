/**
 * @file empleado.js
 * @description Controlador del lado del cliente para la gestion y registro de empleados.
 */

const API_EMPLEADOS = '/api/employees';

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  if (userRole !== 'administrador') {
    alert('Acceso no autorizado para tu rol. Solo el administrador puede gestionar empleados.');
    window.location.href = '/inventario';
    return;
  }

  // Despliegue de accesos en el menu lateral
  configurarMenuPorRol(userRole);

  document.getElementById('btnLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login';
  });

  const formulario = document.getElementById('employeeForm');
  const alerta = document.getElementById('alertMessage');
  const modalAlerta = document.getElementById('modalAlertMessage');
  const btnSubmit = document.getElementById('submitBtn');
  const btnCancelar = document.getElementById('cancelarBtn');
  const btnNuevo = document.getElementById('btnNuevoEmpleado');
  const btnCerrarModal = document.getElementById('btnCerrarModal');
  const modalOverlay = document.getElementById('modalOverlay');
  const tablaBody = document.getElementById('tablaEmpleadosBody');
  const formTitle = document.getElementById('formTitle');
  const pwdHelpText = document.getElementById('pwdHelpText');

  const inputBuscar = document.getElementById('buscarEmpleado');
  const contadorEmpleados = document.getElementById('empleadosCount');
  const groupOldPassword = document.getElementById('groupOldPassword');
  const oldPasswordInput = document.getElementById('oldPassword');

  let listaEmpleadosGlobal = [];
  let modoEdicion = false;

  cargarEmpleados();

  if (inputBuscar) {
    inputBuscar.addEventListener('input', (e) => {
      const termino = e.target.value.toLowerCase().trim();
      filtrarYRenderizar(termino);
    });
  }

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
    } else if (rol === 'cajero') {
      if (menuPersonal) menuPersonal.hidden = true;
      if (menuInventario) menuInventario.hidden = true;
      if (menuRecepcion) menuRecepcion.hidden = true;
      menuPos?.removeAttribute('hidden');
    }
  }

  function mostrarModalNuevo() {
    modoEdicion = false;
    formulario.reset();
    document.getElementById('empleadoId').value = '';
    formTitle.textContent = 'Ficha de Empleado - Registro';
    pwdHelpText.textContent = 'Esta contrasena la define el administrador.';

    groupOldPassword.style.display = 'none';
    oldPasswordInput.required = false;

    document.getElementById('password').required = true;
    document.getElementById('confirmarPassword').required = true;
    modalOverlay.style.display = 'flex';
  }

  btnNuevo?.addEventListener('click', () => {
    mostrarModalNuevo();
  });

  const ocultarModal = () => {
    modalOverlay.style.display = 'none';
    formulario.reset();
    if (alerta) alerta.hidden = true;
    if (modalAlerta) modalAlerta.hidden = true;
  };

  btnCerrarModal?.addEventListener('click', ocultarModal);
  btnCancelar?.addEventListener('click', ocultarModal);

  async function cargarEmpleados() {
    try {
      const res = await fetch(API_EMPLEADOS, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (res.ok) {
        listaEmpleadosGlobal = data.empleados || [];
        if (contadorEmpleados) {
          contadorEmpleados.textContent = `(${listaEmpleadosGlobal.length})`;
        }
        const terminoActual = inputBuscar ? inputBuscar.value.toLowerCase().trim() : '';
        filtrarYRenderizar(terminoActual);
      } else {
        mostrarAlerta(data.mensaje || 'Error al obtener la lista de empleados.', 'error');
      }
    } catch (error) {
      mostrarAlerta('Error de comunicacion con el servidor.', 'error');
    }
  }

  function filtrarYRenderizar(termino) {
    if (!termino) {
      renderizarTabla(listaEmpleadosGlobal);
      return;
    }

    const empleadosFiltrados = listaEmpleadosGlobal.filter((emp) => {
      const nombre = (emp.nombreCompleto || '').toLowerCase();
      const usuario = (emp.username || '').toLowerCase();
      const puesto = (emp.puesto || '').toLowerCase();
      const rol = (emp.role || '').toLowerCase();

      return nombre.includes(termino) || usuario.includes(termino) || puesto.includes(termino) || rol.includes(termino);
    });

    renderizarTabla(empleadosFiltrados);
  }

  function renderizarTabla(empleados) {
    tablaBody.innerHTML = '';

    if (!empleados || empleados.length === 0) {
      tablaBody.innerHTML = `<tr><td colspan="5" class="empty-state">No se encontraron empleados.</td></tr>`;
      return;
    }

    empleados.forEach((emp) => {
      const tr = document.createElement('tr');
      const opacityStyle = emp.activo ? '' : 'opacity: 0.6;';
      
      tr.innerHTML = `
        <td style="${opacityStyle}">
          <strong>${emp.nombreCompleto}</strong>
          <div style="font-size: 0.8rem; color: #666;">${emp.puesto || 'Sin puesto'}</div>
        </td>
        <td style="${opacityStyle}">${emp.username}</td>
        <td style="${opacityStyle}"><strong>${emp.role}</strong></td>
        <td>
          <span class="badge ${emp.activo ? 'badge--success' : 'badge--danger'}">
            ${emp.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="actions-cell">
          <button type="button" class="btn-icon-edit btn-editar" data-id="${emp.id}" title="Editar">Editar</button>
          <button type="button" class="btn-icon-delete btn-estado" data-id="${emp.id}" data-activo="${emp.activo}" title="${emp.activo ? 'Desactivar' : 'Reactivar'}" style="${emp.activo ? 'background-color: #FEF3C7; color: #B45309;' : 'background-color: #E6F0EF; color: var(--color-primary);'}">
            ${emp.activo ? 'Desactivar' : 'Reactivar'}
          </button>
          <button type="button" class="btn-icon-delete btn-eliminar" data-id="${emp.id}" title="Eliminar">Eliminar</button>
        </td>
      `;
      tablaBody.appendChild(tr);
    });
  }

  function prepararFormularioEdicion(emp) {
    modoEdicion = true;
    document.getElementById('empleadoId').value = emp.id;
    document.getElementById('nombreCompleto').value = emp.nombreCompleto;
    document.getElementById('puesto').value = emp.puesto || '';
    document.getElementById('role').value = emp.role;
    document.getElementById('username').value = emp.username;

    groupOldPassword.style.display = 'block';
    oldPasswordInput.value = '';

    document.getElementById('password').value = '';
    document.getElementById('confirmarPassword').value = '';
    document.getElementById('password').required = false;
    document.getElementById('confirmarPassword').required = false;

    formTitle.textContent = 'Ficha de Empleado - Editar';
    pwdHelpText.textContent = 'Si deseas cambiar la contrasena, debes ingresar la contrasena actual.';
    modalOverlay.style.display = 'flex';
  }

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('empleadoId').value;
    const oldPassword = oldPasswordInput.value;
    const password = document.getElementById('password').value;
    const confirmarPassword = document.getElementById('confirmarPassword').value;

    if (modoEdicion && password) {
      if (!oldPassword) {
        mostrarAlerta('Debes ingresar la contrasena actual para establecer una nueva contrasena.', 'error');
        return;
      }

      if (password === oldPassword) {
        mostrarAlerta('La nueva contrasena no puede ser igual a la contrasena actual.', 'error');
        return;
      }

      if (password !== confirmarPassword) {
        mostrarAlerta('Las contrasenas nuevas no coinciden.', 'error');
        return;
      }
    } else if (!modoEdicion && password !== confirmarPassword) {
      mostrarAlerta('Las contrasenas no coinciden.', 'error');
      return;
    }

    const empleadoData = {
      nombreCompleto: document.getElementById('nombreCompleto').value.trim(),
      puesto: document.getElementById('puesto').value.trim(),
      role: document.getElementById('role').value,
      username: document.getElementById('username').value.trim()
    };

    if (modoEdicion && oldPassword) {
      empleadoData.oldPassword = oldPassword;
    }

    if (password) {
      empleadoData.password = password;
      empleadoData.confirmarPassword = confirmarPassword;
    }

    const url = modoEdicion ? `${API_EMPLEADOS}/${id}` : API_EMPLEADOS;
    const method = modoEdicion ? 'PUT' : 'POST';

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    if (alerta) alerta.hidden = true;
    if (modalAlerta) modalAlerta.hidden = true;

    try {
      const respuesta = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(empleadoData)
      });

      const datos = await respuesta.json();

      if (respuesta.ok) {
        mostrarAlerta(datos.mensaje, 'success');
        ocultarModal();
        cargarEmpleados();
      } else {
        mostrarAlerta(datos.mensaje || 'Error al guardar el empleado.', 'error');
      }
    } catch (error) {
      mostrarAlerta('Error de comunicacion con el servidor.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Guardar Empleado';
    }
  });

  async function cambiarEstadoEmpleado(id, activo) {
    try {
      const res = await fetch(`${API_EMPLEADOS}/${id}/activo`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({ activo })
      });

      const data = await res.json();
      if (res.ok) {
        mostrarAlerta(data.mensaje, 'success');
        cargarEmpleados();
      } else {
        mostrarAlerta(data.mensaje || 'Error al cambiar estado.', 'error');
      }
    } catch (err) {
      mostrarAlerta('Error de comunicacion con el servidor.', 'error');
    }
  }

  async function eliminarEmpleado(id) {
    try {
      const res = await fetch(`${API_EMPLEADOS}/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': userRole }
      });

      const data = await res.json();
      if (res.ok) {
        mostrarAlerta(data.mensaje, 'success');
        cargarEmpleados();
      } else {
        mostrarAlerta(data.mensaje || 'Error al eliminar empleado.', 'error');
      }
    } catch (err) {
      mostrarAlerta('Error de comunicacion con el servidor.', 'error');
    }
  }

  function mostrarAlerta(mensaje, tipo) {
    const esModalAbierto = modalOverlay && modalOverlay.style.display === 'flex';
    const objetivoAlerta = esModalAbierto ? modalAlerta : alerta;

    if (esModalAbierto && alerta) alerta.hidden = true;
    if (!esModalAbierto && modalAlerta) modalAlerta.hidden = true;

    if (!objetivoAlerta) return;

    objetivoAlerta.textContent = mensaje;
    objetivoAlerta.className = `alert alert--${tipo}`;
    objetivoAlerta.hidden = false;
  }

  if (tablaBody) {
    tablaBody.addEventListener('click', async (e) => {
      const btnEditar = e.target.closest('.btn-editar');
      const btnEstado = e.target.closest('.btn-estado');
      const btnEliminar = e.target.closest('.btn-eliminar');

      if (btnEditar) {
        e.preventDefault();
        const id = btnEditar.getAttribute('data-id');
        console.log('Clic en Editar detectado. ID:', id); // Rastreador
        const emp = listaEmpleadosGlobal.find((u) => u.id == id);
        if (emp) prepararFormularioEdicion(emp);
      } 
      
      else if (btnEstado) {
        e.preventDefault();
        const id = btnEstado.getAttribute('data-id');
        const activoActual = btnEstado.getAttribute('data-activo') === 'true';
        console.log('Clic en Estado detectado. ID:', id, 'Activo:', activoActual); // Rastreador
        await cambiarEstadoEmpleado(id, !activoActual);
      } 
      
      else if (btnEliminar) {
        e.preventDefault();
        const id = btnEliminar.getAttribute('data-id');
        console.log('Clic en Eliminar detectado. ID:', id); // Rastreador
        if (confirm('¿Estás seguro de que deseas eliminar definitivamente a este empleado?')) {
          await eliminarEmpleado(id);
        }
      }
    });
  }
});