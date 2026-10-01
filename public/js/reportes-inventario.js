/**
 * @file reportes-inventario.js
 * @description Controlador del lado del cliente para los reportes de inventario.
 * Administra el control de acceso, el despliegue del menu por rol y el reporte de
 * productos con existencia baja en mostrador o en almacen, segun la ubicacion elegida.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

/**
 * Endpoint del reporte de stock bajo (mostrador o almacen).
 * @type {string}
 */
const API_STOCK_BAJO = '/api/inventory/reportes/stock-bajo';

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    const token = localStorage.getItem('token');

    // Validacion de sesion activa
    if (!token || !userRole) {
        window.location.href = '/login';
        return;
    }

    // Restriccion de acceso
    if (userRole == 'cajero') {
        alert('Acceso no autorizado para tu rol.');
        window.location.href = userRole === 'cajero' ? '/pos' : '/inventario';
        return;
    }

    // CONFIGURACION DE INTERFAZ Y NAVEGACION
    configurarMenuPorRol(userRole);

    document.getElementById('btnLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/login';
    });

    // Referencias al DOM
    const formStockBajo = document.getElementById('formStockBajo');
    const limiteInput = document.getElementById('limiteStock');
    const ubicacionSelect = document.getElementById('ubicacionStock');
    const thExistencia = document.getElementById('thExistencia');
    const btnGenerar = document.getElementById('btnGenerarReporte');
    const tablaBody = document.getElementById('tablaStockBajoBody');
    const reporteCount = document.getElementById('reporteCount');
    const reporteAlert = document.getElementById('reporteAlert');

    formStockBajo?.addEventListener('submit', generarReporte);

    /**
     * Configura la visibilidad del menu lateral segun el rol del usuario.
     * Esta vista solo es accesible para el administrador, por lo que se muestran
     * todos los modulos, incluido Reportes de Inventario.
     *
     * @param {string} rol Rol autenticado del usuario.
     */
    function configurarMenuPorRol(rol) {
        const menuPersonal = document.getElementById('menuPersonal');
        const menuInventario = document.getElementById('menuInventario');
        const menuRecepcion = document.getElementById('menuRecepcion');
        const menuProveedores = document.getElementById('menuProveedores');
        const menuPos = document.getElementById('menuPos');
        const menuReportes = document.getElementById('menuReportes');

        if (rol === 'administrador') {
            menuPersonal?.removeAttribute('hidden');
            menuInventario?.removeAttribute('hidden');
            menuRecepcion?.removeAttribute('hidden');
            menuProveedores?.removeAttribute('hidden');
            menuPos?.removeAttribute('hidden');
            menuReportes?.removeAttribute('hidden');
        } else if (rol === 'almacenista') {
            menuInventario?.removeAttribute('hidden');
            menuRecepcion?.removeAttribute('hidden');
            menuReportes?.removeAttribute('hidden');
            if (menuPersonal) menuPersonal.hidden = true;
            if (menuPos) menuPos.hidden = true;
        }
    }

    /**
     * Valida el limite capturado, consulta el reporte de stock bajo en la ubicacion
     * elegida (mostrador o almacen) y muestra los resultados en la tabla.
     *
     * @param {Event} e Evento submit del formulario del reporte.
     * @returns {Promise<void>}
     */
    async function generarReporte(e) {
        e.preventDefault();
        ocultarAlerta();

        const limite = Number(limiteInput.value);
        const ubicacion = ubicacionSelect.value;
        if (!Number.isInteger(limite) || limite < 1) {
            mostrarAlerta('Ingresa un limite valido (numero entero mayor o igual a 1).', 'error');
            return;
        }

        btnGenerar.disabled = true;
        btnGenerar.textContent = 'Generando...';

        try {
            const res = await fetch(`${API_STOCK_BAJO}?limite=${encodeURIComponent(limite)}&ubicacion=${encodeURIComponent(ubicacion)}`, {
                headers: { 'x-user-role': userRole }
            });
            const data = await res.json();

            if (!res.ok) {
                mostrarAlerta(data.mensaje || 'No se pudo generar el reporte.', 'error');
                return;
            }

            renderizarReporte(data.productos, data.limite, data.ubicacion);
        } catch (error) {
            console.error('Error al generar el reporte:', error);
            mostrarAlerta('Error de comunicacion con el servidor.', 'error');
        } finally {
            btnGenerar.disabled = false;
            btnGenerar.textContent = 'Generar reporte';
        }
    }

    /**
     * Pinta en la tabla la lista de productos que estan por debajo del limite en la
     * ubicacion elegida, mostrando unicamente la existencia de esa ubicacion.
     * Si no hay coincidencias, muestra un mensaje indicando que no hace falta reabastecer.
     *
     * @param {Array<Object>} productos Productos devueltos por el backend.
     * @param {number} limite Umbral utilizado para generar el reporte.
     * @param {'mostrador'|'almacen'} ubicacion Ubicacion de stock evaluada.
     * @returns {void}
     */
    function renderizarReporte(productos, limite, ubicacion) {
        const nombreUbicacion = ubicacion === 'almacen' ? 'almacen' : 'mostrador';

        thExistencia.textContent = `Existencia en ${nombreUbicacion}`;
        tablaBody.innerHTML = '';

        if (!productos.length) {
            reporteCount.textContent = '0 producto(s) por debajo del limite';
            tablaBody.innerHTML = `<tr><td colspan="5" class="text-muted">Ningun producto tiene menos de ${limite} unidad(es) en ${nombreUbicacion}.</td></tr>`;
            return;
        }

        reporteCount.textContent = `${productos.length} producto(s) con menos de ${limite} en ${nombreUbicacion}`;

        productos.forEach((p) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
        <td>${escaparHtml(p.codigo_barras)}</td>
        <td>${escaparHtml(p.nombre)}</td>
        <td>${escaparHtml(p.categoria || 'Sin categoria')}</td>
        <td>${escaparHtml(p.presentacion || 'N/A')}</td>
        <td><strong>${Number(p.existencia)}</strong></td>
      `;
            tablaBody.appendChild(fila);
        });
    }

    /**
     * Escapa caracteres especiales de HTML para insertar texto de forma segura en la tabla.
     *
     * @param {*} valor Texto a escapar.
     * @returns {string} Texto escapado.
     */
    function escaparHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Muestra un mensaje en la franja de alerta del reporte.
     *
     * @param {string} mensaje Texto a mostrar.
     * @param {string} tipo Variante visual de la alerta (por ejemplo 'error').
     * @returns {void}
     */
    function mostrarAlerta(mensaje, tipo) {
        reporteAlert.textContent = mensaje;
        reporteAlert.className = `alert alert--${tipo}`;
        reporteAlert.hidden = false;
    }

    /**
     * Oculta y limpia la franja de alerta del reporte.
     *
     * @returns {void}
     */
    function ocultarAlerta() {
        reporteAlert.hidden = true;
        reporteAlert.textContent = '';
    }
});