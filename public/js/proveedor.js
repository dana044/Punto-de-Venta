/**
 * @file proveedor.js
 * @description Lógica del cliente para el consumo de la API de Proveedores (HU-18, HU-19).
 */

document.addEventListener('DOMContentLoaded', () => {
    const tablaBody = document.getElementById('tablaProveedoresBody');
    const form = document.getElementById('proveedorForm');
    const modal = document.getElementById('modalOverlay');
    const btnNuevo = document.getElementById('btnNuevoProveedor');
    const btnCerrar = document.getElementById('btnCerrarModal');
    const btnCancelar = document.getElementById('cancelarBtn');
    
    // Cargar la lista al iniciar
    cargarProveedores();

    // Eventos del Modal
    btnNuevo.addEventListener('click', () => abrirModal());
    btnCerrar.addEventListener('click', cerrarModal);
    btnCancelar.addEventListener('click', cerrarModal);

    // Buscador en vivo
    document.getElementById('buscarProveedor').addEventListener('input', function(e) {
        const termino = e.target.value.toLowerCase();
        const filas = tablaBody.getElementsByTagName('tr');
        
        Array.from(filas).forEach(fila => {
            const textoFila = fila.textContent.toLowerCase();
            fila.style.display = textoFila.includes(termino) ? '' : 'none';
        });
    });

    // Guardar o Editar Proveedor
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('proveedorId').value;
        const proveedorData = {
            nombre: document.getElementById('nombre').value.trim(),
            direccion: document.getElementById('direccion').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            email: document.getElementById('email').value.trim()
        };

        try {
            const url = id ? `/api/suppliers/${id}` : '/api/suppliers';
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
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

    // Función para obtener y pintar la tabla (HU-18)
    async function cargarProveedores() {
        try {
            const response = await fetch('/api/suppliers');
            const result = await response.json();

            if (result.success) {
                tablaBody.innerHTML = '';
                const tablaInactivos = document.getElementById('tablaInactivosBody');
                tablaInactivos.innerHTML = '';
                let activos = 0, inactivos = 0;

                result.data.forEach(prov => {
                    const esActivo = prov.activo === 1 || prov.activo === true || prov.activo === '1';
                    const tr = document.createElement('tr');
                    
                    if (esActivo) {
                        activos++;
                        tr.innerHTML = `
                            <td><strong>${prov.nombre}</strong></td>
                            <td>${prov.direccion || '<span class="text-muted">N/A</span>'}</td>
                            <td>
                                <div>📞 ${prov.telefono || 'S/N'}</div>
                                <div>✉️ ${prov.email}</div>
                            </td>
                            <td><span class="badge" style="background-color: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">Activo</span></td>
                            <td>
                                <button onclick="editarProveedor(${prov.id}, '${prov.nombre}', '${prov.direccion || ''}', '${prov.telefono || ''}', '${prov.email}')" class="btn btn--secondary" style="padding: 4px 8px; font-size: 0.8rem;">Editar</button>
                                <button onclick="bajaLogicaProveedor(${prov.id})" class="btn btn--danger" style="background-color: #fee2e2; color: #991b1b; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">Desactivar</button>
                            </td>
                        `;
                        tablaBody.appendChild(tr);
                    } else {
                        inactivos++;
                        tr.innerHTML = `
                            <td><strong style="color: #9ca3af;">${prov.nombre}</strong></td>
                            <td style="color: #9ca3af;">${prov.direccion || '<span class="text-muted">N/A</span>'}</td>
                            <td style="color: #9ca3af;">
                                <div>📞 ${prov.telefono || 'S/N'}</div>
                                <div>✉️ ${prov.email}</div>
                            </td>
                            <td><span class="badge" style="background-color: #f3f4f6; color: #4b5563; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">Inactivo</span></td>
                            <td>
                                <button onclick="reactivarProveedor(${prov.id})" class="btn" style="background-color: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">Reactivar</button>
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
            const response = await fetch(`/api/suppliers/${id}/reactivate`, { method: 'PUT' });
            const result = await response.json();
            if (result.success) {
                cargarProveedores();
                mostrarAlerta('success', result.message);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error al reactivar el proveedor.');
        }
    };

    // Funciones globales expuestas para los botones de la tabla
    window.editarProveedor = (id, nombre, direccion, telefono, email) => {
        document.getElementById('proveedorId').value = id;
        document.getElementById('nombre').value = nombre;
        document.getElementById('direccion').value = direccion;
        document.getElementById('telefono').value = telefono;
        document.getElementById('email').value = email;
        abrirModal('Editar Distribuidor');
    };

    // Aplicar baja lógica (HU-19)
    window.bajaLogicaProveedor = async (id) => {
        if (!confirm('¿Estás seguro de dar de baja a este distribuidor? Pasará a estado inactivo.')) return;
        
        try {
            const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                cargarProveedores();
                mostrarAlerta('success', result.message);
            }
        } catch (error) {
            mostrarAlerta('error', 'Error al dar de baja el proveedor.');
        }
    };

    // Utilidades de UI
    function abrirModal(titulo = 'Registro de Distribuidor') {
        document.getElementById('formTitle').textContent = titulo;
        modal.style.display = 'flex';
    }

    function cerrarModal() {
        form.reset();
        document.getElementById('proveedorId').value = '';
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
});