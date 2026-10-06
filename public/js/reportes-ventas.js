/**
 * @file reportes-ventas.js
 * @description Controlador del lado del cliente para el Reporte Mensual de Ventas (HU-40).
 * Integra consulta global de productos vendidos, ranking descendente, métricas monetarias,
 * exportación a CSV/Excel y reporte impreso en PDF (window.print).
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

const API_REPORTE_VENTAS = '/api/pos/reporte-mensual';
const API_REPORTE_DIARIO = '/api/pos/reporte-diario';
const API_REPORTE_PRESENTACION = '/api/pos/reporte-presentacion';

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
  const btnDescargarCSV = document.getElementById('btnDescargarCSV');
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

  // HU-40: Descarga en formato CSV / Excel
  btnDescargarCSV?.addEventListener('click', () => {
    if (!ultimoReporte || !ultimoReporte.ranking.length) return;

    const encabezados = ['Ranking', 'Codigo de Barras', 'Producto', 'Categoria', 'Unidades Vendidas', 'Total Facturado ($)'];
    const filas = ultimoReporte.ranking.map((p, i) => [
      i + 1,
      `"${p.codigo_barras}"`,
      `"${p.nombre}"`,
      `"${p.categoria || 'Sin categoria'}"`,
      p.total_unidades_vendidas,
      Number(p.total_recaudado).toFixed(2)
    ]);

    const contenidoCSV = [encabezados.join(','), ...filas.map(f => f.join(','))].join('\r\n');
    const blob = new Blob(['\ufeff' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Ventas_${ultimoReporte.mesNombre}_${ultimoReporte.anio}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      if (btnImprimir) btnImprimir.hidden = true;
      if (btnDescargarCSV) btnDescargarCSV.hidden = true;
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
    if (btnImprimir) btnImprimir.hidden = false;
    if (btnDescargarCSV) btnDescargarCSV.hidden = false;

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

  // --- REPORTE DE VENTAS POR DÍA Y REPORTE POR PRESENTACIÓN ---

  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const PALETA_GRAFICAS = ['#0F766E', '#2563EB', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#EC4899', '#64748B'];

  const formDiario = document.getElementById('formReporteDiario');
  const inputFechaDiario = document.getElementById('inputFechaDiario');
  const btnGenerarDiario = document.getElementById('btnGenerarDiario');
  const btnImprimirDiario = document.getElementById('btnImprimirDiario');
  const btnCsvDiario = document.getElementById('btnCsvDiario');
  const alertaDiario = document.getElementById('alertaDiario');
  const diarioCount = document.getElementById('diarioCount');
  const metricasDiario = document.getElementById('metricasDiario');
  const graficasDiario = document.getElementById('graficasDiario');
  const tablaDiarioBody = document.getElementById('tablaDiarioBody');
  const tablaDiarioFoot = document.getElementById('tablaDiarioFoot');

  const formPresentacion = document.getElementById('formReportePresentacion');
  const selectMesPresentacion = document.getElementById('selectMesPresentacion');
  const inputAnioPresentacion = document.getElementById('inputAnioPresentacion');
  const btnGenerarPresentacion = document.getElementById('btnGenerarPresentacion');
  const btnImprimirPresentacion = document.getElementById('btnImprimirPresentacion');
  const btnCsvPresentacion = document.getElementById('btnCsvPresentacion');
  const alertaPresentacion = document.getElementById('alertaPresentacion');
  const presentacionCount = document.getElementById('presentacionCount');
  const metricasPresentacion = document.getElementById('metricasPresentacion');
  const graficasPresentacion = document.getElementById('graficasPresentacion');
  const tablaPresentacionBody = document.getElementById('tablaPresentacionBody');

  let chartDiarioHora = null;
  let chartDiarioMetodo = null;
  let chartPresentacionUnidades = null;
  let chartPresentacionImporte = null;
  let ultimoReporteDiario = null;
  let ultimoReportePresentacion = null;

  /**
   * Llena el selector de mes y deja por defecto el mes y año actuales.
   */
  function inicializarFiltroPeriodo(selectMes, inputAnio) {
    if (!selectMes || !inputAnio) return;
    const hoy = new Date();
    selectMes.innerHTML = MESES.map((nombre, i) => `<option value="${i + 1}">${nombre}</option>`).join('');
    selectMes.value = String(hoy.getMonth() + 1);
    inputAnio.value = hoy.getFullYear();
  }

  inicializarFiltroPeriodo(selectMesPresentacion, inputAnioPresentacion);

  // El reporte diario arranca en el día de hoy (fecha local, no UTC) y no permite días futuros
  if (inputFechaDiario) {
    const hoy = new Date();
    const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    inputFechaDiario.value = hoyISO;
    inputFechaDiario.max = hoyISO;
  }

  function formatearMoneda(valor) {
    return `$${Number(valor).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Convierte "2026-10-05" en una fecha legible (ej. "lun, 05/10/2026") sin desfases de zona horaria.
   */
  function formatearDia(diaISO) {
    const [anio, mes, dia] = diaISO.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  const ETIQUETA_METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

  function celdaCSV(valor) {
    return `"${String(valor ?? '').replace(/"/g, '""')}"`;
  }

  function descargarCSV(nombreArchivo, encabezados, filas) {
    const contenidoCSV = [encabezados.join(','), ...filas.map(f => f.join(','))].join('\r\n');
    const blob = new Blob(['\ufeff' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function mostrarAlertaEn(elemento, mensaje, tipo) {
    elemento.textContent = mensaje;
    elemento.className = `alert alert--${tipo}`;
    elemento.hidden = false;
  }

  /**
   * Guarda una imagen de la gráfica para que se imprima (el canvas se oculta al imprimir).
   */
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

  /**
   * Imprime solo el apartado indicado ("diario" o "presentacion"), ocultando los demás.
   */
  function imprimirApartado(apartado, titulo) {
    const nombreAdmin = localStorage.getItem('userName') || 'Administrador';

    document.getElementById('printPeriodo').textContent = titulo;
    document.getElementById('printMeta').textContent = `Generado por: ${nombreAdmin} | Fecha de emisión: ${new Date().toLocaleString('es-MX')}`;

    document.body.setAttribute('data-imprimiendo', apartado);
    window.print();
  }

  // Al terminar de imprimir se restablece la vista normal de la página
  window.addEventListener('afterprint', () => document.body.removeAttribute('data-imprimiendo'));

  formDiario?.addEventListener('submit', generarReporteDiario);
  formPresentacion?.addEventListener('submit', generarReportePresentacion);

  btnImprimirDiario?.addEventListener('click', () => {
    if (!ultimoReporteDiario) return;
    imprimirApartado('diario', `Reporte de Ventas del Día: ${formatearDia(ultimoReporteDiario.fecha)}`);
  });

  btnImprimirPresentacion?.addEventListener('click', () => {
    if (!ultimoReportePresentacion) return;
    imprimirApartado('presentacion', `Reporte de Productos por Presentación: ${ultimoReportePresentacion.mesNombre} ${ultimoReportePresentacion.anio}`);
  });

  btnCsvDiario?.addEventListener('click', () => {
    if (!ultimoReporteDiario || !ultimoReporteDiario.ventas.length) return;

    const encabezados = ['Folio', 'Hora', 'Metodo de Pago', 'Piezas', 'Subtotal ($)', 'IVA ($)', 'Importe Total ($)'];
    const filas = ultimoReporteDiario.ventas.map(v => [
      celdaCSV(v.folio),
      celdaCSV(v.hora),
      celdaCSV(ETIQUETA_METODO[v.metodo_pago] || v.metodo_pago),
      Number(v.piezas),
      Number(v.subtotal_neto).toFixed(2),
      Number(v.iva).toFixed(2),
      (Number(v.subtotal_neto) + Number(v.iva)).toFixed(2)
    ]);

    descargarCSV(`Reporte_Ventas_Del_Dia_${ultimoReporteDiario.fecha}.csv`, encabezados, filas);
  });

  btnCsvPresentacion?.addEventListener('click', () => {
    if (!ultimoReportePresentacion || !ultimoReportePresentacion.presentaciones.length) return;

    const totalImporte = ultimoReportePresentacion.presentaciones.reduce((acc, p) => acc + Number(p.total_recaudado), 0);
    const encabezados = ['Ranking', 'Presentacion', 'Productos Distintos', 'Piezas Vendidas', 'Importe Vendido ($)', '% Aporte Ingreso'];
    const filas = ultimoReportePresentacion.presentaciones.map((p, i) => [
      i + 1,
      celdaCSV(p.presentacion),
      Number(p.productos_distintos),
      Number(p.total_unidades_vendidas),
      Number(p.total_recaudado).toFixed(2),
      totalImporte > 0 ? ((Number(p.total_recaudado) / totalImporte) * 100).toFixed(1) : '0.0'
    ]);

    descargarCSV(`Reporte_Por_Presentacion_${ultimoReportePresentacion.mesNombre}_${ultimoReportePresentacion.anio}.csv`, encabezados, filas);
  });

  async function generarReporteDiario(e) {
    e.preventDefault();
    alertaDiario.hidden = true;

    const fecha = inputFechaDiario.value;

    if (!fecha) {
      mostrarAlertaEn(alertaDiario, 'Elige el día del que quieres el reporte.', 'error');
      return;
    }

    btnGenerarDiario.disabled = true;
    btnGenerarDiario.textContent = 'Procesando...';

    try {
      const res = await fetch(`${API_REPORTE_DIARIO}?fecha=${encodeURIComponent(fecha)}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok) {
        mostrarAlertaEn(alertaDiario, data.mensaje || 'Error al obtener el reporte de ventas del día.', 'error');
        return;
      }

      ultimoReporteDiario = {
        fecha,
        ventas: data.ventas || []
      };

      renderizarReporteDiario(ultimoReporteDiario);
    } catch (err) {
      console.error('Error al generar el reporte de ventas del día:', err);
      mostrarAlertaEn(alertaDiario, 'Error de conexión al consultar el servidor.', 'error');
    } finally {
      btnGenerarDiario.disabled = false;
      btnGenerarDiario.textContent = 'Generar Reporte';
    }
  }

  /**
   * Pinta las métricas, las gráficas y la tabla con una fila por cada venta del día elegido.
   */
  function renderizarReporteDiario({ fecha, ventas }) {
    tablaDiarioBody.innerHTML = '';
    tablaDiarioFoot.innerHTML = '';

    if (chartDiarioHora) { chartDiarioHora.destroy(); chartDiarioHora = null; }
    if (chartDiarioMetodo) { chartDiarioMetodo.destroy(); chartDiarioMetodo = null; }

    if (!ventas || ventas.length === 0) {
      diarioCount.textContent = `Sin ventas registradas el ${formatearDia(fecha)}`;
      metricasDiario.style.display = 'none';
      graficasDiario.style.display = 'none';
      if (btnImprimirDiario) btnImprimirDiario.hidden = true;
      if (btnCsvDiario) btnCsvDiario.hidden = true;

      tablaDiarioBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">
            No se encontraron ventas registradas en el día seleccionado.
          </td>
        </tr>
      `;
      return;
    }

    let totalPiezas = 0;
    let totalSubtotal = 0;
    let totalIva = 0;
    let totalImporte = 0;
    const porHora = {};

    ventas.forEach(v => {
      const importe = Number(v.subtotal_neto) + Number(v.iva);
      totalPiezas += Number(v.piezas);
      totalSubtotal += Number(v.subtotal_neto);
      totalIva += Number(v.iva);
      totalImporte += importe;

      const h = Number(v.hora_dia);
      porHora[h] = porHora[h] || { ventas: 0, importe: 0 };
      porHora[h].ventas += 1;
      porHora[h].importe += importe;
    });

    // Hora pico: la hora con más ventas (si empatan, la de mayor importe)
    const horaPico = Object.keys(porHora).map(Number).sort((a, b) =>
      porHora[b].ventas - porHora[a].ventas || porHora[b].importe - porHora[a].importe
    )[0];

    document.getElementById('diarioMetricaImporte').textContent = formatearMoneda(totalImporte);
    document.getElementById('diarioMetricaVentas').textContent = ventas.length.toLocaleString('es-MX');
    document.getElementById('diarioMetricaTicket').textContent = formatearMoneda(totalImporte / ventas.length);
    document.getElementById('diarioMetricaHoraPico').textContent =
      `${String(horaPico).padStart(2, '0')}:00 h · ${porHora[horaPico].ventas} venta(s)`;
    metricasDiario.style.display = 'grid';

    diarioCount.textContent = `${ventas.length} venta(s) el ${formatearDia(fecha)}`;
    if (btnImprimirDiario) btnImprimirDiario.hidden = false;
    if (btnCsvDiario) btnCsvDiario.hidden = false;

    ventas.forEach(v => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td><code>${escaparHtml(v.folio)}</code></td>
        <td>${escaparHtml(v.hora)}</td>
        <td>${escaparHtml(ETIQUETA_METODO[v.metodo_pago] || v.metodo_pago)}</td>
        <td>${Number(v.piezas)}</td>
        <td>${formatearMoneda(v.subtotal_neto)}</td>
        <td>${formatearMoneda(v.iva)}</td>
        <td><strong>${formatearMoneda(Number(v.subtotal_neto) + Number(v.iva))}</strong></td>
      `;
      tablaDiarioBody.appendChild(fila);
    });

    tablaDiarioFoot.innerHTML = `
      <tr style="font-weight: 700;">
        <td colspan="3">Total del día</td>
        <td>${totalPiezas}</td>
        <td>${formatearMoneda(totalSubtotal)}</td>
        <td>${formatearMoneda(totalIva)}</td>
        <td>${formatearMoneda(totalImporte)}</td>
      </tr>
    `;

    actualizarGraficasDiario(ventas, porHora);
  }

  function actualizarGraficasDiario(ventas, porHora) {
    graficasDiario.style.display = 'grid';
    if (typeof Chart === 'undefined') return;

    // Eje de horas: desde la primera hasta la última hora con ventas, rellenando con 0 las horas sin ventas
    const horas = Object.keys(porHora).map(Number);
    const horaInicial = Math.min(...horas);
    const horaFinal = Math.max(...horas);
    const etiquetasHora = [];
    const importesHora = [];
    for (let h = horaInicial; h <= horaFinal; h++) {
      etiquetasHora.push(`${String(h).padStart(2, '0')}:00`);
      importesHora.push(porHora[h] ? Number(porHora[h].importe.toFixed(2)) : 0);
    }

    const porMetodo = {};
    ventas.forEach(v => {
      const etiqueta = ETIQUETA_METODO[v.metodo_pago] || v.metodo_pago;
      porMetodo[etiqueta] = (porMetodo[etiqueta] || 0) + Number(v.subtotal_neto) + Number(v.iva);
    });
    const etiquetasMetodo = Object.keys(porMetodo);

    const ctxHora = document.getElementById('graficaDiarioHora')?.getContext('2d');
    const ctxMetodo = document.getElementById('graficaDiarioMetodo')?.getContext('2d');

    if (ctxHora) {
      chartDiarioHora = new Chart(ctxHora, {
        type: 'bar',
        data: {
          labels: etiquetasHora,
          datasets: [{
            label: 'Importe vendido ($)',
            data: importesHora,
            backgroundColor: '#0F766E',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          scales: {
            x: { title: { display: true, text: 'Hora del día' } },
            y: { beginAtZero: true }
          }
        }
      });
      actualizarImagenImpresion(chartDiarioHora);
    }

    if (ctxMetodo) {
      chartDiarioMetodo = new Chart(ctxMetodo, {
        type: 'doughnut',
        data: {
          labels: etiquetasMetodo,
          datasets: [{
            data: etiquetasMetodo.map(m => Number(porMetodo[m].toFixed(2))),
            backgroundColor: etiquetasMetodo.map((_, i) => PALETA_GRAFICAS[i % PALETA_GRAFICAS.length])
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { position: 'right' } }
        }
      });
      actualizarImagenImpresion(chartDiarioMetodo);
    }
  }

  async function generarReportePresentacion(e) {
    e.preventDefault();
    alertaPresentacion.hidden = true;

    const mes = selectMesPresentacion.value;
    const anio = inputAnioPresentacion.value;

    if (!mes || !anio) {
      mostrarAlertaEn(alertaPresentacion, 'Ingresa un mes y año válidos.', 'error');
      return;
    }

    btnGenerarPresentacion.disabled = true;
    btnGenerarPresentacion.textContent = 'Procesando...';

    try {
      const res = await fetch(`${API_REPORTE_PRESENTACION}?anio=${encodeURIComponent(anio)}&mes=${encodeURIComponent(mes)}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok) {
        mostrarAlertaEn(alertaPresentacion, data.mensaje || 'Error al obtener el reporte por presentación.', 'error');
        return;
      }

      ultimoReportePresentacion = {
        mesNombre: selectMesPresentacion.options[selectMesPresentacion.selectedIndex].text,
        anio,
        presentaciones: data.presentaciones || []
      };

      renderizarReportePresentacion(ultimoReportePresentacion.presentaciones);
    } catch (err) {
      console.error('Error al generar el reporte por presentación:', err);
      mostrarAlertaEn(alertaPresentacion, 'Error de conexión al consultar el servidor.', 'error');
    } finally {
      btnGenerarPresentacion.disabled = false;
      btnGenerarPresentacion.textContent = 'Generar Reporte';
    }
  }

  /**
   * Pinta las métricas, las gráficas y la tabla con una fila por presentación.
   */
  function renderizarReportePresentacion(presentaciones) {
    tablaPresentacionBody.innerHTML = '';

    if (chartPresentacionUnidades) { chartPresentacionUnidades.destroy(); chartPresentacionUnidades = null; }
    if (chartPresentacionImporte) { chartPresentacionImporte.destroy(); chartPresentacionImporte = null; }

    if (!presentaciones || presentaciones.length === 0) {
      presentacionCount.textContent = '0 presentaciones con venta';
      metricasPresentacion.style.display = 'none';
      graficasPresentacion.style.display = 'none';
      if (btnImprimirPresentacion) btnImprimirPresentacion.hidden = true;
      if (btnCsvPresentacion) btnCsvPresentacion.hidden = true;

      tablaPresentacionBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-muted" style="text-align: center; padding: 2rem;">
            No se encontraron ventas registradas en el periodo seleccionado.
          </td>
        </tr>
      `;
      return;
    }

    let totalImporte = 0;
    let totalPiezas = 0;

    presentaciones.forEach(p => {
      totalImporte += Number(p.total_recaudado);
      totalPiezas += Number(p.total_unidades_vendidas);
    });

    document.getElementById('presMetricaFormatos').textContent = `${presentaciones.length} formato(s)`;
    document.getElementById('presMetricaUnidades').textContent = `${totalPiezas.toLocaleString('es-MX')} pzas`;
    document.getElementById('presMetricaImporte').textContent = formatearMoneda(totalImporte);
    document.getElementById('presMetricaLider').textContent = presentaciones[0].presentacion;
    metricasPresentacion.style.display = 'grid';

    presentacionCount.textContent = `${presentaciones.length} presentación(es) con venta en el mes`;
    if (btnImprimirPresentacion) btnImprimirPresentacion.hidden = false;
    if (btnCsvPresentacion) btnCsvPresentacion.hidden = false;

    presentaciones.forEach((p, index) => {
      const fila = document.createElement('tr');
      const aporte = totalImporte > 0 ? ((Number(p.total_recaudado) / totalImporte) * 100).toFixed(1) : 0;
      const rankBadgeClass = index === 0 ? 'badge-rank badge-rank--gold' : 'badge-rank';

      fila.innerHTML = `
        <td><span class="${rankBadgeClass}">#${index + 1}</span></td>
        <td><strong>${escaparHtml(p.presentacion)}</strong></td>
        <td>${Number(p.productos_distintos)}</td>
        <td><strong>${Number(p.total_unidades_vendidas)}</strong> pza(s)</td>
        <td>${formatearMoneda(p.total_recaudado)}</td>
        <td><span class="badge badge--success">${aporte}%</span></td>
      `;
      tablaPresentacionBody.appendChild(fila);
    });

    actualizarGraficasPresentacion(presentaciones);
  }

  function actualizarGraficasPresentacion(presentaciones) {
    graficasPresentacion.style.display = 'grid';
    if (typeof Chart === 'undefined') return;

    // Se grafican las 8 presentaciones principales para que las etiquetas sigan legibles
    const top = presentaciones.slice(0, 8);
    const etiquetas = top.map(p => p.presentacion.length > 22 ? p.presentacion.substring(0, 20) + '…' : p.presentacion);
    const ctxUnidades = document.getElementById('graficaPresentacionUnidades')?.getContext('2d');
    const ctxImporte = document.getElementById('graficaPresentacionImporte')?.getContext('2d');

    if (ctxUnidades) {
      chartPresentacionUnidades = new Chart(ctxUnidades, {
        type: 'bar',
        data: {
          labels: etiquetas,
          datasets: [{
            label: 'Unidades vendidas',
            data: top.map(p => Number(p.total_unidades_vendidas)),
            backgroundColor: '#0F766E',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
      actualizarImagenImpresion(chartPresentacionUnidades);
    }

    if (ctxImporte) {
      chartPresentacionImporte = new Chart(ctxImporte, {
        type: 'doughnut',
        data: {
          labels: etiquetas,
          datasets: [{
            data: top.map(p => Number(p.total_recaudado)),
            backgroundColor: top.map((_, i) => PALETA_GRAFICAS[i % PALETA_GRAFICAS.length])
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { position: 'right' } }
        }
      });
      actualizarImagenImpresion(chartPresentacionImporte);
    }
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

  /**
 * Asigna el avatar, nombre y rol del usuario activo en el sidebar.
 */
function cargarPerfilUsuario() {
  const rol = localStorage.getItem('userRole') || 'cajero';
  const nombre = localStorage.getItem('userName') || 'Usuario';

  const avatarImg = document.getElementById('userAvatarImg');
  const displayName = document.getElementById('userDisplayName');
  const displayRole = document.getElementById('userDisplayRole');

  // Mapeo directo de imagen según el rol autenticado
  const mapaAvatares = {
    administrador: '/img/avatars/admin.png',
    almacenista: '/img/avatars/almacen.png',
    cajero: '/img/avatars/cajero.png'
  };

  if (avatarImg) {
    avatarImg.src = mapaAvatares[rol] || '/img/avatars/cajero.png';
  }
  if (displayName) {
    displayName.textContent = nombre;
  }
  if (displayRole) {
    displayRole.textContent = rol;
  }
}

// Invocación dentro del DOMContentLoaded:
cargarPerfilUsuario();
});