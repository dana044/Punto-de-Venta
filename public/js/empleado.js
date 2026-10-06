/**
 * @file empleado.js
 * @description Controlador del lado del cliente para la gestion y registro de empleados.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
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
    window.location.href = userRole === 'cajero' ? '/pos' : '/inventario';
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

  const correoInput = document.getElementById('correo');
  const roleSelect = document.getElementById('role');
  const passwordInput = document.getElementById('password');
  const confirmarPasswordInput = document.getElementById('confirmarPassword');
  const preAlerta = document.getElementById('preAlertMessage');

  // Referencia al checkbox de inactivos (misma mecanica que en inventario y proveedores)
  const chkMostrarInactivos = document.getElementById('chkMostrarInactivos');

  let listaEmpleadosGlobal = [];
  let modoEdicion = false;

  cargarEmpleados();

  if (inputBuscar) {
    inputBuscar.addEventListener('input', (e) => {
      const termino = e.target.value.toLowerCase().trim();
      filtrarYRenderizar(termino);
    });
  }

  // Evento para alternar entre ver solo empleados activos o solo empleados inactivos
  chkMostrarInactivos?.addEventListener('change', () => {
    cargarEmpleados();
  });

  function configurarMenuPorRol(rol) {
    const menuPersonal = document.getElementById('menuPersonal');
    const menuInventario = document.getElementById('menuInventario');
    const menuRecepcion = document.getElementById('menuRecepcion');
    const menuProveedores = document.getElementById('menuProveedores')
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
      menuReporteVentas?.removeAttribute('hidden');
      if (menuPos) menuPos.hidden = true;
    } else if (rol === 'cajero') {
      if (menuPersonal) menuPersonal.hidden = true;
      if (menuInventario) menuInventario.hidden = true;
      if (menuRecepcion) menuRecepcion.hidden = true;
      menuPos?.removeAttribute('hidden');
      menuReporteVentas?.removeAttribute('hidden');
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
    if (modalAlerta) modalAlerta.hidden = true;
    ocultarPreAlerta();
  };

  btnCerrarModal?.addEventListener('click', ocultarModal);
  btnCancelar?.addEventListener('click', ocultarModal);

  /**
   * Determina si un empleado esta activo. Acepta los formatos que puede devolver la API
   * (booleano, 1/0 numerico o '1'/'0' y 'true'/'false' en texto).
   *
   * @param {Object} emp Empleado devuelto por la API.
   * @returns {boolean} true si el empleado esta activo.
   */
  function esEmpleadoActivo(emp) {
    return emp.activo === true || emp.activo === 1 || emp.activo === '1' || emp.activo === 'true';
  }

  /**
   * Devuelve los empleados que corresponde mostrar segun el estado del checkbox
   * "Ver inactivos": con el check desmarcado solo los activos y con el check marcado
   * unicamente los inactivos (nunca se mezclan, igual que en inventario).
   *
   * @returns {Array<Object>} Lista de empleados segun el filtro de estado.
   */
  function obtenerEmpleadosSegunEstado() {
    const verInactivos = chkMostrarInactivos?.checked ?? false;
    return listaEmpleadosGlobal.filter((emp) => esEmpleadoActivo(emp) !== verInactivos);
  }

  async function cargarEmpleados() {
    try {
      // Si el checkbox esta marcado se solicitan los empleados inactivos
      const mostrarInactivos = chkMostrarInactivos?.checked ?? false;
      const url = mostrarInactivos ? `${API_EMPLEADOS}?inactivos=true` : API_EMPLEADOS;

      const res = await fetch(url, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (res.ok) {
        listaEmpleadosGlobal = data.empleados || [];
        if (contadorEmpleados) {
          const textoEstado = mostrarInactivos ? 'inactivos' : 'activos';
          contadorEmpleados.textContent = `(${obtenerEmpleadosSegunEstado().length} ${textoEstado})`;
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
    // Primero se aplica el filtro de estado (solo activos / solo inactivos) y despues la busqueda
    const empleadosPorEstado = obtenerEmpleadosSegunEstado();

    if (!termino) {
      renderizarTabla(empleadosPorEstado);
      return;
    }

    const empleadosFiltrados = empleadosPorEstado.filter((emp) => {
      const nombre = (emp.nombreCompleto || '').toLowerCase();
      const correo = (emp.correo || '').toLowerCase();
      const rol = (emp.role || '').toLowerCase();

      return nombre.includes(termino) || correo.includes(termino) || rol.includes(termino);
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
      // Estado normalizado (evita errores si la API devuelve 1/0 en lugar de true/false)
      const activo = esEmpleadoActivo(emp);
      const opacityStyle = activo ? '' : 'opacity: 0.6;';
 
      tr.innerHTML = `
        <td style="${opacityStyle}">
          <strong>${emp.nombreCompleto}</strong>
        </td>
        <td style="${opacityStyle}">${emp.correo}</td>
        <td style="${opacityStyle}"><strong>${emp.role}</strong></td>
        <td>
          <span class="badge ${activo ? 'badge--success' : 'badge--danger'}">
            ${activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="actions-cell">
          <button type="button" class="btn-icon-edit btn-editar" data-id="${emp.id}" title="Editar">Editar</button>
          <button type="button" class="btn-icon-delete btn-estado" data-id="${emp.id}" data-activo="${activo}" title="${activo ? 'Desactivar' : 'Reactivar'}" style="${activo ? 'background-color: #FEF3C7; color: #B45309;' : 'background-color: #E6F0EF; color: var(--color-primary);'}">
            ${activo ? 'Desactivar' : 'Reactivar'}
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
    document.getElementById('role').value = emp.role;
    correoInput.value = emp.correo;

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

  /**
   * Muestra la advertencia previa al guardado, dentro del modal.
   * @param {string} mensaje
   */
  function mostrarPreAlerta(mensaje) {
    if (!preAlerta) return;
    preAlerta.textContent = mensaje;
    preAlerta.hidden = false;
  }
 
  /** Oculta y limpia la advertencia previa al guardado. */
  function ocultarPreAlerta() {
    if (!preAlerta) return;
    preAlerta.hidden = true;
    preAlerta.textContent = '';
  }
 
  /**
   * Valida en vivo, contra la lista de empleados ya cargada (sin llamar al
   * servidor), que el correo no esté en uso con el mismo rol, y que las
   * contrasenas coincidan. Muestra una advertencia visible antes de que el
   * usuario intente dar clic en "Guardar Empleado".
   */
  function validarEnVivo() {
    const idActual = document.getElementById('empleadoId').value;
    const correo = correoInput.value.trim();
    const role = roleSelect.value;
 
    const correoDuplicado = listaEmpleadosGlobal.some(
      (e) => e.correo === correo && e.role === role && String(e.id) !== String(idActual)
    );
    if (correo && role && correoDuplicado) {
      mostrarPreAlerta('Ese correo ya está en uso con ese rol. Usa un correo diferente.');
      return;
    }
 
    if (passwordInput.value && confirmarPasswordInput.value && passwordInput.value !== confirmarPasswordInput.value) {
      mostrarPreAlerta('Las contraseñas deben ser iguales.');
      return;
    }
 
    ocultarPreAlerta();
  }
 
  [correoInput, roleSelect, passwordInput, confirmarPasswordInput].forEach((el) => {
    el?.addEventListener('input', validarEnVivo);
    el?.addEventListener('blur', validarEnVivo);
  });

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
    if (!modoEdicion && !password) {
      mostrarAlerta('Falta la contraseña. El administrador debe asignarle una al nuevo empleado.', 'error');
      return;
    }

    const empleadoData = {
      nombreCompleto: document.getElementById('nombreCompleto').value.trim(),
      role: document.getElementById('role').value,
      rol: document.getElementById('role').value,
      correo: correoInput.value.trim()
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
        ocultarModal();
        mostrarAlerta(datos.mensaje, 'success');
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