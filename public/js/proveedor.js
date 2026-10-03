/**
 * @file proveedor.js
 * @description Lógica del cliente para el consumo de la API de Proveedores.
 *              Alta/edición dinámica de múltiples teléfonos y correos por distribuidor.
 * @author Alfonso Mendoza Vasquez (Programador XP)
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Integración de Roles HU-03)
 */

document.addEventListener('DOMContentLoaded', () => {
    const tablaBody = document.getElementById('tablaProveedoresBody');
    const form = document.getElementById('proveedorForm');
    const modal = document.getElementById('modalOverlay');
    const btnNuevo = document.getElementById('btnNuevoProveedor');
    const btnCerrar = document.getElementById('btnCerrarModal');
    const btnCancelar = document.getElementById('cancelarBtn');

    // Referencias a los checkbox de inactivos (uno por cada vista) y a las secciones de cada tabla
    const chkMostrarInactivos = document.getElementById('chkMostrarInactivos');
    const chkMostrarInactivosAlt = document.getElementById('chkMostrarInactivosAlt');
    const seccionActivos = document.getElementById('seccionActivos');
    const seccionInactivos = document.getElementById('seccionInactivos');

    // Contenedores y botones de los medios de contacto dinámicos
    const telefonosContainer = document.getElementById('telefonosContainer');
    const correosContainer = document.getElementById('correosContainer');
    const btnAgregarTelefono = document.getElementById('btnAgregarTelefono');
    const btnAgregarCorreo = document.getElementById('btnAgregarCorreo');

    const userRole = localStorage.getItem('userRole');
    const token = localStorage.getItem('token');

    // Control de sesión
    if (!token || !userRole) {
        window.location.href = '/login';
        return;
    }

    if (userRole === 'cajero') {
        alert('Acceso no autorizado para tu rol.');
        window.location.href = '/pos';
        return;
    }

    // ==========================================================================
    // CONFIGURACIÓN HOMOLOGADA DEL MENÚ POR ROL (HU-03)
    // ==========================================================================
    configurarMenuPorRol(userRole);

    document.getElementById('btnLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/login';
    });

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
            menuProveedores?.removeAttribute('hidden');
            menuReportes?.removeAttribute('hidden');
            if (menuReporteVentas) menuReporteVentas.hidden = true;
            if (menuPos) menuPos.hidden = true;
        }
    }

    /**
     * Máximo de teléfonos y de correos por distribuidor (coincide con el límite del backend).
     * @constant {number}
     */
    const MAX_CONTACTOS = 10;

    /**
     * Etiquetas visibles de cada tipo de teléfono, indexadas por el valor que guarda la base de datos.
     * @constant {Object<string, string>}
     */
    const ETIQUETAS_TELEFONO = {
        oficina: 'Oficina',
        celular: 'Celular',
        whatsapp: 'WhatsApp',
        otro: 'Otro'
    };

    /**
     * Proveedores de la última consulta, indexados por id.
     * @type {Object<number, Object>}
     */
    let proveedoresCache = {};

    // Inicializa el formulario con una fila vacía de teléfono y otra de correo
    reiniciarContactos();
    
    // Cargar la lista al iniciar
    cargarProveedores();

    /**
     * Alterna la vista entre activos e inactivos.
     * @param {boolean} verInactivos
     */
    function alternarTablaInactivos(verInactivos) {
        if (chkMostrarInactivos) chkMostrarInactivos.checked = verInactivos;
        if (chkMostrarInactivosAlt) chkMostrarInactivosAlt.checked = verInactivos;
        if (seccionActivos) seccionActivos.style.display = verInactivos ? 'none' : '';
        if (seccionInactivos) seccionInactivos.style.display = verInactivos ? '' : 'none';
    }

    alternarTablaInactivos(chkMostrarInactivos?.checked ?? false);

    chkMostrarInactivos?.addEventListener('change', (e) => alternarTablaInactivos(e.target.checked));
    chkMostrarInactivosAlt?.addEventListener('change', (e) => alternarTablaInactivos(e.target.checked));

    // Eventos del Modal
    btnNuevo.addEventListener('click', () => abrirModal());
    btnCerrar.addEventListener('click', cerrarModal);
    btnCancelar.addEventListener('click', cerrarModal);

    btnAgregarTelefono.addEventListener('click', () => agregarFilaTelefono());
    btnAgregarCorreo.addEventListener('click', () => agregarFilaCorreo());

    // Buscador en vivo
    const inputBuscarInactivos = document.getElementById('buscarProveedorInactivo');
    document.getElementById('buscarProveedor').addEventListener('input', function(e) {
        if (inputBuscarInactivos) inputBuscarInactivos.value = e.target.value;
        filtrarFilasProveedores(e.target.value);
    });

    inputBuscarInactivos?.addEventListener('input', function(e) {
        document.getElementById('buscarProveedor').value = e.target.value;
        filtrarFilasProveedores(e.target.value);
    });

    function filtrarFilasProveedores(texto) {
        const termino = texto.toLowerCase();
        const filas = [
            ...tablaBody.getElementsByTagName('tr'),
            ...document.getElementById('tablaInactivosBody').getElementsByTagName('tr')
        ];
        
        Array.from(filas).forEach(fila => {
            const textoFila = fila.textContent.toLowerCase();
            fila.style.display = textoFila.includes(termino) ? '' : 'none';
        });
    }

    // Guardar o Editar Proveedor
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('proveedorId').value;
        const proveedorData = {
            nombre: document.getElementById('nombre').value.trim(),
            direccion: document.getElementById('direccion').value.trim(),
            telefonos: recolectarTelefonos(),
            correos: recolectarCorreos()
        };

        try {
            const url = id ? `/api/suppliers/${id}` : '/api/suppliers';
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-role': userRole
                },
                body: JSON.stringify(proveedorData)
            });

            const result = await response.json();

            if (result.success) {
                cerrarModal();
                cargarProveedores();
                mostrarAlerta('success', result.message);
            } else {
                mostrarAlerta('error', result.message, true);
            }
        } catch (error) {
            mostrarAlerta('error', 'Fallo de conexión con el servidor.', true);
        }
    });

    async function cargarProveedores() {
        try {
            const response = await fetch('/api/suppliers', {
                headers: { 'x-user-role': userRole }
            });
            const result = await response.json();

            if (result.success) {
                tablaBody.innerHTML = '';
                const tablaInactivos = document.getElementById('tablaInactivosBody');
                tablaInactivos.innerHTML = '';
                let activos = 0, inactivos = 0;
                proveedoresCache = {};

                result.data.forEach(prov => {
                    proveedoresCache[prov.id] = prov;
                    const esActivo = prov.activo === 1 || prov.activo === true || prov.activo === '1';
                    const tr = document.createElement('tr');
                    
                    if (esActivo) {
                        activos++;
                        tr.innerHTML = `
                            <td><strong>${prov.nombre}</strong></td>
                            <td>${prov.direccion || '<span class="text-muted">N/A</span>'}</td>
                            <td>${renderContactos(prov)}</td>
                            <td><span class="badge badge--success">Activo</span></td>
                            <td class="actions-cell">
                                <button type="button" onclick="editarProveedor(${prov.id})" class="btn-icon-edit btn-editar" title="Editar">Editar</button>
                                <button type="button" onclick="bajaLogicaProveedor(${prov.id})" class="btn-icon-delete btn-estado" title="Desactivar" style="background-color: #FEF3C7; color: #B45309;">Desactivar</button>
                            </td>
                        `;
                        tablaBody.appendChild(tr);
                    } else {
                        inactivos++;
                        tr.innerHTML = `
                            <td style="opacity: 0.6;"><strong>${prov.nombre}</strong></td>
                            <td style="opacity: 0.6;">${prov.direccion || '<span class="text-muted">N/A</span>'}</td>
                            <td style="opacity: 0.6;">${renderContactos(prov)}</td>
                            <td><span class="badge badge--danger">Inactivo</span></td>
                            <td class="actions-cell">
                                <button type="button" onclick="reactivarProveedor(${prov.id})" class="btn-icon-delete btn-estado" title="Reactivar" style="background-color: #E6F0EF; color: var(--color-primary);">Reactivar</button>
                            </td>
                        `;
                        tablaInactivos.appendChild(tr);
                    }
                });

                document.getElementById('proveedoresCount').textContent = `(${activos})`;
                document.getElementById('inactivosCount').textContent = `(${inactivos})`;
            }
        } catch (error) {
            mostrarAlerta('error', 'Error al cargar el directorio.');
        }
    }

    window.reactivarProveedor = async (id) => {
        if (!confirm('¿Deseas reactivar a este distribuidor?')) return;
        try {
            const response = await fetch(`/api/suppliers/${id}/reactivate`, { 
                method: 'PUT',
                headers: { 'x-user-role': userRole }
            });
            const result = await response.json();
            if (result.success) {
                cargarProveedores();
                mostrarAlerta('success', result.message);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error al reactivar el proveedor.');
        }
    };

    window.editarProveedor = (id) => {
        const prov = proveedoresCache[id];
        if (!prov) return;

        document.getElementById('proveedorId').value = id;
        document.getElementById('nombre').value = prov.nombre;
        document.getElementById('direccion').value = prov.direccion || '';
        poblarContactos(obtenerTelefonos(prov), obtenerCorreos(prov));
        abrirModal('Editar Distribuidor');
    };

    window.bajaLogicaProveedor = async (id) => {
        if (!confirm('¿Estás seguro de dar de baja a este distribuidor? Pasará a estado inactivo.')) return;
        
        try {
            const response = await fetch(`/api/suppliers/${id}`, { 
                method: 'DELETE',
                headers: { 'x-user-role': userRole }
            });
            const result = await response.json();
            
            if (result.success) {
                cargarProveedores();
                mostrarAlerta('success', result.message);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error al dar de baja el proveedor.');
        }
    };

    function abrirModal(titulo = 'Registro de Distribuidor') {
        document.getElementById('formTitle').textContent = titulo;
        modal.style.display = 'flex';
    }

    function cerrarModal() {
        form.reset();
        document.getElementById('proveedorId').value = '';
        reiniciarContactos();
        modal.style.display = 'none';
        document.getElementById('modalAlertMessage').hidden = true;
    }

    function mostrarAlerta(tipo, mensaje, enModal = false) {
        const alertBox = document.getElementById(enModal ? 'modalAlertMessage' : 'alertMessage');
        alertBox.textContent = mensaje;
        alertBox.style.backgroundColor = tipo === 'error' ? '#f8d7da' : '#d1e7dd';
        alertBox.style.color = tipo === 'error' ? '#842029' : '#0f5132';
        alertBox.style.padding = '10px';
        alertBox.style.borderRadius = '5px';
        alertBox.hidden = false;
        
        if (!enModal) setTimeout(() => alertBox.hidden = true, 4000);
    }

    function escaparHtml(texto) {
        return String(texto ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function obtenerTelefonos(prov) {
        if (Array.isArray(prov.telefonos) && prov.telefonos.length > 0) return prov.telefonos;
        return prov.telefono ? [{ telefono: prov.telefono, tipo: 'oficina' }] : [];
    }

    function obtenerCorreos(prov) {
        if (Array.isArray(prov.correos) && prov.correos.length > 0) return prov.correos;
        return prov.email ? [prov.email] : [];
    }

    function renderContactos(prov) {
        const telefonos = obtenerTelefonos(prov);
        const correos = obtenerCorreos(prov);

        const htmlTelefonos = telefonos.length > 0
            ? telefonos.map(t => `<div>📞 ${escaparHtml(t.telefono)} <small class="text-muted">(${escaparHtml(ETIQUETAS_TELEFONO[t.tipo] || 'Otro')})</small></div>`).join('')
            : '<div>📞 S/N</div>';

        const htmlCorreos = correos.map(c => `<div>✉️ ${escaparHtml(c)}</div>`).join('');

        return htmlTelefonos + htmlCorreos;
    }

    function agregarFilaTelefono(numero = '', tipo = 'oficina') {
        if (telefonosContainer.children.length >= MAX_CONTACTOS) return;

        const opciones = Object.entries(ETIQUETAS_TELEFONO)
            .map(([valor, etiqueta]) => `<option value="${valor}">${etiqueta}</option>`)
            .join('');

        const fila = document.createElement('div');
        fila.className = 'form-dynamic-row';
        fila.innerHTML = `
            <input type="text" class="form-input input-telefono" placeholder="Ej. 2281234567" maxlength="15" inputmode="numeric" />
            <select class="form-select select-tipo-telefono">${opciones}</select>
            <button type="button" class="btn-icon-delete" title="Eliminar teléfono" aria-label="Eliminar teléfono">🗑</button>
        `;

        const input = fila.querySelector('.input-telefono');
        input.value = numero;
        input.addEventListener('input', () => { input.value = input.value.replace(/[^0-9]/g, ''); });
        fila.querySelector('.select-tipo-telefono').value = tipo;
        fila.querySelector('button').addEventListener('click', () => quitarFila(fila, telefonosContainer));

        telefonosContainer.appendChild(fila);
        actualizarControlesContacto();
    }

    function agregarFilaCorreo(correo = '') {
        if (correosContainer.children.length >= MAX_CONTACTOS) return;

        const fila = document.createElement('div');
        fila.className = 'form-dynamic-row form-dynamic-row--email';
        fila.innerHTML = `
            <input type="email" class="form-input input-correo" placeholder="contacto@distribuidora.com" maxlength="100" />
            <button type="button" class="btn-icon-delete" title="Eliminar correo" aria-label="Eliminar correo">🗑</button>
        `;

        fila.querySelector('.input-correo').value = correo;
        fila.querySelector('button').addEventListener('click', () => quitarFila(fila, correosContainer));

        correosContainer.appendChild(fila);
        actualizarControlesContacto();
    }

    function quitarFila(fila, contenedor) {
        if (contenedor.children.length <= 1) {
            fila.querySelectorAll('input').forEach(input => { input.value = ''; });
        } else {
            fila.remove();
        }
        actualizarControlesContacto();
    }

    function actualizarControlesContacto() {
        correosContainer.querySelectorAll('.input-correo').forEach((input, indice) => {
            input.required = indice === 0;
        });
        btnAgregarTelefono.disabled = telefonosContainer.children.length >= MAX_CONTACTOS;
        btnAgregarCorreo.disabled = correosContainer.children.length >= MAX_CONTACTOS;
    }

    function poblarContactos(telefonos = [], correos = []) {
        telefonosContainer.innerHTML = '';
        correosContainer.innerHTML = '';

        if (telefonos.length === 0) agregarFilaTelefono();
        telefonos.forEach(t => agregarFilaTelefono(t.telefono, t.tipo));

        if (correos.length === 0) agregarFilaCorreo();
        correos.forEach(c => agregarFilaCorreo(c));

        actualizarControlesContacto();
    }

    function reiniciarContactos() {
        poblarContactos();
    }

    function recolectarTelefonos() {
        return Array.from(telefonosContainer.querySelectorAll('.form-dynamic-row'))
            .map(fila => ({
                telefono: fila.querySelector('.input-telefono').value.trim(),
                tipo: fila.querySelector('.select-tipo-telefono').value
            }))
            .filter(t => t.telefono !== '');
    }

    function recolectarCorreos() {
        return Array.from(correosContainer.querySelectorAll('.input-correo'))
            .map(input => input.value.trim())
            .filter(correo => correo !== '');
    }
});