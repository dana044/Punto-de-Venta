/**
 * @file reportes-ventas.js
 * @description Controlador del lado del cliente para el Reporte Mensual de Ventas (HU-40).
 * Integra consulta global de productos vendidos, ranking descendente, métricas monetarias
 * y exportación/impresión física (window.print).
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

const API_REPORTE_VENTAS = '/api/pos/reporte-mensual';

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  // Control de rol estricto (HU-03): Solo Administrador puede ver reportes de ventas
  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  if (userRole !== 'administrador') {
    alert('Acceso denegado: El módulo de reporte de ventas es exclusivo para Administradores.');
    window.location.href = userRole === 'almacenista' ? '/inventario' : '/pos';
    return;
  }

  configurarMenuPorRol(userRole);

  document.getElementById('btnLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login';
  });

  const formFiltro = document.getElementById('formFiltroVentas');
  const selectMes = document.getElementById('selectMes');
  const inputAnio = document.getElementById('inputAnio');
  const btnGenerar = document.getElementById('btnGenerar');
  const btnImprimir = document.getElementById('btnImprimirReporte');
  const tablaBody = document.getElementById('tablaVentasBody');
  const ventasCount = document.getElementById('ventasCount');
  const alerta = document.getElementById('alertaVentas');

  const metricasVenta = document.getElementById('metricasVenta');
  const metricaTotalIngresos = document.getElementById('metricaTotalIngresos');
  const metricaTotalPiezas = document.getElementById('metricaTotalPiezas');
  const metricaProductosVendidos = document.getElementById('metricaProductosVendidos');

  const contenedorGrafica = document.getElementById('contenedorGrafica');
  let chartVentas = null;
  let ultimoReporte = null;

  formFiltro?.addEventListener('submit', generarReporteVentas);
  btnImprimir?.addEventListener('click', () => {
    prepararImpresion();
    window.print();
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
    }
  }

  async function generarReporteVentas(e) {
    e.preventDefault();
    alerta.hidden = true;

    const mes = selectMes.value;
    const anio = inputAnio.value;

    if (!mes || !anio) {
      mostrarAlerta('Ingresa un mes y año válidos.', 'error');
      return;
    }

    btnGenerar.disabled = true;
    btnGenerar.textContent = 'Procesando...';

    try {
      const res = await fetch(`${API_REPORTE_VENTAS}?anio=${encodeURIComponent(anio)}&mes=${encodeURIComponent(mes)}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok) {
        mostrarAlerta(data.mensaje || 'Error al obtener el reporte de ventas.', 'error');
        return;
      }

      ultimoReporte = {
        mesNombre: selectMes.options[selectMes.selectedIndex].text,
        anio,
        ranking: data.ranking || []
      };

      renderizarTablaCompleta(ultimoReporte.ranking);
    } catch (err) {
      console.error('Error al generar el reporte de ventas:', err);
      mostrarAlerta('Error de conexión al consultar el servidor.', 'error');
    } finally {
      btnGenerar.disabled = false;
      btnGenerar.textContent = 'Generar Informe';
    }
  }

  /**
   * Renderiza todos los productos con venta en el mes, sin truncar.
   */
  function renderizarTablaCompleta(productos) {
    tablaBody.innerHTML = '';

    if (!productos || productos.length === 0) {
      ventasCount.textContent = '0 ventas registradas';
      metricasVenta.style.display = 'none';
      contenedorGrafica.style.display = 'none';
      btnImprimir.hidden = true;
      if (chartVentas) chartVentas.destroy();

      tablaBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">
            No se encontraron transacciones registradas en el periodo seleccionado.
          </td>
        </tr>
      `;
      return;
    }

    // Cálculos de métricas consolidadas
    let totalIngresos = 0;
    let totalPiezas = 0;

    productos.forEach(p => {
      totalIngresos += Number(p.total_recaudado);
      totalPiezas += Number(p.total_unidades_vendidas);
    });

    metricaTotalIngresos.textContent = `$${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    metricaTotalPiezas.textContent = `${totalPiezas.toLocaleString('es-MX')} pzas`;
    metricaProductosVendidos.textContent = `${productos.length} artículos`;
    metricasVenta.style.display = 'grid';

    ventasCount.textContent = `${productos.length} producto(s) vendidos en el mes`;
    btnImprimir.hidden = false;

    // Pintar todas las filas
    productos.forEach((prod, index) => {
      const fila = document.createElement('tr');
      const aporte = totalIngresos > 0 ? ((Number(prod.total_recaudado) / totalIngresos) * 100).toFixed(1) : 0;
      const rankBadgeClass = index === 0 ? 'badge-rank badge-rank--gold' : 'badge-rank';

      fila.innerHTML = `
        <td><span class="${rankBadgeClass}">#${index + 1}</span></td>
        <td><code>${escaparHtml(prod.codigo_barras)}</code></td>
        <td><strong>${escaparHtml(prod.nombre)}</strong></td>
        <td>${escaparHtml(prod.categoria || 'Sin categoría')}</td>
        <td><strong>${Number(prod.total_unidades_vendidas)}</strong> pza(s)</td>
        <td>$${Number(prod.total_recaudado).toFixed(2)}</td>
        <td><span class="badge badge--success">${aporte}%</span></td>
      `;
      tablaBody.appendChild(fila);
    });

    actualizarGraficaVentas(productos);
  }

  function actualizarGraficaVentas(productos) {
    contenedorGrafica.style.display = 'block';
    if (chartVentas) chartVentas.destroy();

    // Graficar el top 8 para mantener legibilidad visual
    const topGraficar = productos.slice(0, 8);
    const ctx = document.getElementById('graficaVentas')?.getContext('2d');

    if (ctx && typeof Chart !== 'undefined') {
      chartVentas = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: topGraficar.map(p => p.nombre.length > 22 ? p.nombre.substring(0, 20) + '…' : p.nombre),
          datasets: [{
            label: 'Unidades vendidas',
            data: topGraficar.map(p => Number(p.total_unidades_vendidas)),
            backgroundColor: '#0F766E',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }
  }

  function prepararImpresion() {
    if (!ultimoReporte) return;
    const nombreAdmin = localStorage.getItem('userName') || 'Administrador';

    document.getElementById('printPeriodo').textContent = `Reporte Mensual de Ventas: ${ultimoReporte.mesNombre} ${ultimoReporte.anio}`;
    document.getElementById('printMeta').textContent = `Generado por: ${nombreAdmin} | Fecha de emisión: ${new Date().toLocaleString('es-MX')}`;
  }

  function mostrarAlerta(mensaje, tipo) {
    alerta.textContent = mensaje;
    alerta.className = `alert alert--${tipo}`;
    alerta.hidden = false;
  }

  function escaparHtml(valor) {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});