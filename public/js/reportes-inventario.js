/**
 * @file reportes-inventario.js
 * @description Controlador del lado del cliente para los reportes de inventario.
 * Administra el control de acceso, el despliegue del menú por rol y el reporte de
 * productos con existencia baja en mostrador o en almacén, según la ubicación elegida.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

const API_STOCK_BAJO = '/api/inventory/reportes/stock-bajo';
const PALETA_GRAFICAS = ['#1f2a44', '#3b5b92', '#5f8dd3', '#8fb3e8', '#c9a227', '#8a5a44', '#4f7f6b', '#9aa3b2'];

const etiquetasValor = {
    id: 'etiquetasValor',
    afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#111827';
        ctx.textBaseline = 'middle';
        chart.getDatasetMeta(0).data.forEach((barra, i) => {
            ctx.fillText(String(chart.data.datasets[0].data[i]), barra.x + 6, barra.y);
        });
        ctx.restore();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    const token = localStorage.getItem('token');

    if (!token || !userRole) {
        window.location.href = '/login';
        return;
    }

    if (userRole === 'cajero') {
        alert('Acceso no autorizado para tu rol.');
        window.location.href = '/pos';
        return;
    }

    configurarMenuPorRol(userRole);

    document.getElementById('btnLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/login';
    });

    const formStockBajo = document.getElementById('formStockBajo');
    const limiteInput = document.getElementById('limiteStock');
    const ubicacionSelect = document.getElementById('ubicacionStock');
    const thExistencia = document.getElementById('thExistencia');
    const btnGenerar = document.getElementById('btnGenerarReporte');
    const tablaBody = document.getElementById('tablaStockBajoBody');
    const reporteCount = document.getElementById('reporteCount');
    const reporteAlert = document.getElementById('reporteAlert');
    const btnImprimir = document.getElementById('btnImprimir');
    const seccionGraficas = document.getElementById('seccionGraficas');

    let reporteActual = null;
    let graficaProductos = null;
    let graficaCategorias = null;

    formStockBajo?.addEventListener('submit', generarReporte);
    btnImprimir?.addEventListener('click', imprimirReporte);

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
            menuInventario?.removeAttribute('hidden');
            menuRecepcion?.removeAttribute('hidden');
            menuReportes?.removeAttribute('hidden');
            if (menuReporteVentas) menuReporteVentas.hidden = true;
            if (menuPersonal) menuPersonal.hidden = true;
            if (menuPos) menuPos.hidden = true;
        }
    }

    async function generarReporte(e) {
        e.preventDefault();
        ocultarAlerta();

        const limite = Number(limiteInput.value);
        const ubicacion = ubicacionSelect.value;
        if (!Number.isInteger(limite) || limite < 1) {
            mostrarAlerta('Ingresa un límite válido (número entero mayor o igual a 1).', 'error');
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
            mostrarAlerta('Error de comunicación con el servidor.', 'error');
        } finally {
            btnGenerar.disabled = false;
            btnGenerar.textContent = 'Generar reporte';
        }
    }

    function renderizarReporte(productos, limite, ubicacion) {
        const nombreUbicacion = ubicacion === 'almacen' ? 'almacén' : 'mostrador';

        thExistencia.textContent = `Existencia en ${nombreUbicacion}`;
        tablaBody.innerHTML = '';

        reporteActual = { productos, limite, ubicacion: nombreUbicacion };
        btnImprimir.hidden = false;
        actualizarGraficas(productos, nombreUbicacion);

        if (!productos.length) {
            reporteCount.textContent = '0 producto(s) por debajo del límite';
            tablaBody.innerHTML = `<tr><td colspan="5" class="text-muted">Ningún producto tiene menos de ${limite} unidad(es) en ${nombreUbicacion}.</td></tr>`;
            return;
        }

        reporteCount.textContent = `${productos.length} producto(s) con menos de ${limite} en ${nombreUbicacion}`;

        productos.forEach((p) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${escaparHtml(p.codigo_barras)}</td>
                <td>${escaparHtml(p.nombre)}</td>
                <td>${escaparHtml(p.categoria || 'Sin categoría')}</td>
                <td>${escaparHtml(p.presentacion || 'N/A')}</td>
                <td><strong>${Number(p.existencia)}</strong></td>
            `;
            tablaBody.appendChild(fila);
        });
    }

    function acortar(texto, max) {
        const t = String(texto ?? '');
        return t.length > max ? `${t.slice(0, max - 1)}…` : t;
    }

    function actualizarGraficas(productos, nombreUbicacion) {
        graficaProductos?.destroy();
        graficaCategorias?.destroy();
        graficaProductos = null;
        graficaCategorias = null;

        if (!productos.length || typeof Chart === 'undefined') {
            seccionGraficas.hidden = true;
            return;
        }

        seccionGraficas.hidden = false;

        const menores = productos.slice(0, 10);
        graficaProductos = new Chart(document.getElementById('graficaProductos'), {
            type: 'bar',
            data: {
                labels: menores.map((p) => acortar(p.nombre, 28)),
                datasets: [{
                    label: `Existencia en ${nombreUbicacion}`,
                    data: menores.map((p) => Number(p.existencia)),
                    backgroundColor: PALETA_GRAFICAS[0],
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                layout: { padding: { right: 32 } },
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
            },
            plugins: [etiquetasValor]
        });
        actualizarImagenImpresion(graficaProductos);

        const porCategoria = {};
        productos.forEach((p) => {
            const categoria = p.categoria || 'Sin categoría';
            porCategoria[categoria] = (porCategoria[categoria] || 0) + 1;
        });
        const categorias = Object.keys(porCategoria);

        graficaCategorias = new Chart(document.getElementById('graficaCategorias'), {
            type: 'doughnut',
            data: {
                labels: categorias.map((c) => `${acortar(c, 24)} (${porCategoria[c]})`),
                datasets: [{
                    data: categorias.map((c) => porCategoria[c]),
                    backgroundColor: categorias.map((_, i) => PALETA_GRAFICAS[i % PALETA_GRAFICAS.length])
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { position: 'right' } }
            }
        });
        actualizarImagenImpresion(graficaCategorias);
    }

    function actualizarImagenImpresion(grafica) {
        const contenedor = grafica.canvas.parentElement;
        let imagen = contenedor.querySelector('.chart-print-img');

        if (!imagen) {
            imagen = document.createElement('img');
            imagen.className = 'chart-print-img print-only';
            imagen.alt = 'Gráfica del reporte';
            contenedor.appendChild(imagen);
        }

        imagen.src = grafica.toBase64Image('image/png', 1);
    }

    function imprimirReporte() {
        if (!reporteActual) return;

        const { limite, ubicacion } = reporteActual;
        const nombre = localStorage.getItem('userName') || 'Usuario';

        document.getElementById('printTitulo').textContent = `Reporte de stock bajo en ${ubicacion}`;
        document.getElementById('printCriterio').textContent = `Productos con menos de ${limite} unidad(es) en ${ubicacion}`;
        document.getElementById('printGeneradoPor').textContent = `Generado por: ${nombre} (${userRole})`;
        document.getElementById('printFecha').textContent = `Fecha y hora: ${new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}`;

        window.print();
    }

    function escaparHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function mostrarAlerta(mensaje, tipo) {
        reporteAlert.textContent = mensaje;
        reporteAlert.className = `alert alert--${tipo}`;
        reporteAlert.hidden = false;
    }

    function ocultarAlerta() {
        reporteAlert.hidden = true;
        reporteAlert.textContent = '';
    }
});