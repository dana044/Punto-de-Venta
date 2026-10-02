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

/**
 * Paleta de colores de la grafica por categoria (se repite si hay mas categorias que colores).
 * @type {string[]}
 */
const PALETA_GRAFICAS = ['#1f2a44', '#3b5b92', '#5f8dd3', '#8fb3e8', '#c9a227', '#8a5a44', '#4f7f6b', '#9aa3b2'];

/**
 * Plugin de Chart.js que dibuja el valor numerico al final de cada barra, para que
 * la cantidad sea legible tambien en el reporte impreso.
 * @type {Object}
 */
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
    const btnImprimir = document.getElementById('btnImprimir');
    const seccionGraficas = document.getElementById('seccionGraficas');

    /**
     * Ultimo reporte generado (se usa para las graficas y el encabezado de impresion).
     * @type {{productos: Array<Object>, limite: number, ubicacion: string}|null}
     */
    let reporteActual = null;
    let graficaProductos = null;
    let graficaCategorias = null;

    formStockBajo?.addEventListener('submit', generarReporte);
    btnImprimir?.addEventListener('click', imprimirReporte);

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

        // Guarda el reporte para imprimirlo y actualiza las graficas
        reporteActual = { productos, limite, ubicacion: nombreUbicacion };
        btnImprimir.hidden = false;
        actualizarGraficas(productos, nombreUbicacion);

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
     * Acorta un texto largo para usarlo como etiqueta de una grafica.
     *
     * @param {string} texto Texto original.
     * @param {number} max Longitud maxima permitida.
     * @returns {string} Texto acortado con puntos suspensivos si excede el maximo.
     */
    function acortar(texto, max) {
        const t = String(texto ?? '');
        return t.length > max ? `${t.slice(0, max - 1)}…` : t;
    }

    /**
     * Dibuja las dos graficas del reporte con los datos de la tabla:
     * los 10 productos con menor existencia y la cantidad de productos por categoria.
     * Si no hay productos (o la libreria Chart.js no cargo) oculta la seccion de graficas.
     *
     * @param {Array<Object>} productos Productos del reporte, ordenados de menor a mayor existencia.
     * @param {string} nombreUbicacion Ubicacion evaluada ('mostrador' o 'almacen').
     * @returns {void}
     */
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

        // Grafica 1: los 10 productos con menos existencia
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

        // Grafica 2: cantidad de productos bajo el limite por categoria
        const porCategoria = {};
        productos.forEach((p) => {
            const categoria = p.categoria || 'Sin categoria';
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

    /**
     * Guarda una copia en imagen de la grafica dentro de su contenedor. Esa imagen es la que
     * se muestra al imprimir (el canvas se oculta), para que la grafica no se corte ni se
     * deforme cuando cambia el ancho de la pagina impresa.
     *
     * @param {Object} grafica Instancia de Chart.js ya dibujada.
     * @returns {void}
     */
    function actualizarImagenImpresion(grafica) {
        const contenedor = grafica.canvas.parentElement;
        let imagen = contenedor.querySelector('.chart-print-img');

        if (!imagen) {
            imagen = document.createElement('img');
            imagen.className = 'chart-print-img print-only';
            imagen.alt = 'Grafica del reporte';
            contenedor.appendChild(imagen);
        }

        imagen.src = grafica.toBase64Image('image/png', 1);
    }

    /**
     * Llena el encabezado de impresion (empresa, criterio del reporte, quien lo genera
     * y fecha) y abre el dialogo de impresion del navegador, desde el cual tambien se
     * puede guardar el reporte como PDF.
     *
     * @returns {void}
     */
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