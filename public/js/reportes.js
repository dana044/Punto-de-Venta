/**
 * @file reportes.js
 * @description Controlador unificado de reportes con captura inmediata para PDF/impresión.
 */

const API_STOCK_BAJO = '/api/inventory/reportes/stock-bajo';
const API_REPORTE_VENTAS = '/api/pos/reporte-mensual';
const API_REPORTE_DIARIO = '/api/pos/reporte-diario';
const API_REPORTE_PRESENTACION = '/api/pos/reporte-presentacion';

const PALETA_GRAFICAS = ['#0F766E', '#2563EB', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#EC4899', '#64748B'];
const ETIQUETA_METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

const etiquetasValor = {
  id: 'etiquetasValor',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#111827';
    ctx.textBaseline = 'middle';
    chart.getDatasetMeta(0).data.forEach((barra, i) => {
      ctx.fillText(String(chart.data.datasets[0].data[i]), barra.x + 6, barra.y);
    });
    ctx.restore();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
  const userName = localStorage.getItem('userName') || 'Usuario';
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  if (userRole === 'cajero') {
    alert('Acceso no autorizado.');
    window.location.replace('/pos');
    return;
  }

  // ==========================================
  // NAVEGACIÓN ENTRE SUBPESTAÑAS
  // ==========================================
  const tabBtnVentasMensual = document.getElementById('tabBtnVentasMensual');
  const tabBtnDiario = document.getElementById('tabBtnDiario');
  const tabBtnPresentacion = document.getElementById('tabBtnPresentacion');

  if (userRole === 'almacenista') {
    if (tabBtnVentasMensual) tabBtnVentasMensual.style.display = 'none';
    if (tabBtnDiario) tabBtnDiario.style.display = 'none';
    if (tabBtnPresentacion) tabBtnPresentacion.style.display = 'none';
  }

  const tabButtons = document.querySelectorAll('.reporte-tab-btn');
  const tabPanels = document.querySelectorAll('.reporte-seccion-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(btn.dataset.panel);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // ==========================================
  // 1. REPORTE DE STOCK BAJO
  // ==========================================
  const formStockBajo = document.getElementById('formStockBajo');
  const limiteInput = document.getElementById('limiteStock');
  const ubicacionSelect = document.getElementById('ubicacionStock');
  const thExistencia = document.getElementById('thExistencia');
  const btnGenerarStock = document.getElementById('btnGenerarReporte');
  const btnImprimirStock = document.getElementById('btnImprimirStock');
  const tablaStockBajoBody = document.getElementById('tablaStockBajoBody');
  const reporteCount = document.getElementById('reporteCount');
  const reporteAlert = document.getElementById('reporteAlert');
  const docStockBajo = document.getElementById('docStockBajo');
  const seccionGraficasStock = document.getElementById('seccionGraficasStock');

  let graficaProductos = null, graficaCategorias = null;

  formStockBajo?.addEventListener('submit', async (e) => {
    e.preventDefault();
    reporteAlert.hidden = true;

    const limite = Number(limiteInput.value);
    const ubicacion = ubicacionSelect.value;
    if (!Number.isInteger(limite) || limite < 1) {
      reporteAlert.textContent = 'Ingresa un límite válido (mayor o igual a 1).';
      reporteAlert.className = 'alert alert--error';
      reporteAlert.hidden = false;
      return;
    }

    btnGenerarStock.disabled = true;
    btnGenerarStock.textContent = 'Generando...';

    try {
      const res = await fetch(`${API_STOCK_BAJO}?limite=${encodeURIComponent(limite)}&ubicacion=${encodeURIComponent(ubicacion)}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok) {
        reporteAlert.textContent = data.mensaje || 'Error al generar el reporte.';
        reporteAlert.className = 'alert alert--error';
        reporteAlert.hidden = false;
        return;
      }

      const nombreUbicacion = ubicacion === 'almacen' ? 'almacén' : 'mostrador';
      thExistencia.textContent = `Existencia en ${nombreUbicacion.toUpperCase()}`;
      tablaStockBajoBody.innerHTML = '';

      document.getElementById('docStockTitulo').textContent = `Reporte de stock bajo en ${nombreUbicacion}`;
      document.getElementById('docStockCriterio').textContent = `Productos con menos de ${limite} unidad(es) en ${nombreUbicacion}`;
      document.getElementById('docStockMeta').textContent = `Generado por: ${userName} (${userRole}) | Fecha y hora: ${new Date().toLocaleString('es-MX')}`;

      docStockBajo.style.display = 'block';
      btnImprimirStock.hidden = false;

      if (!data.productos.length) {
        reporteCount.textContent = '0 producto(s) por debajo del límite';
        seccionGraficasStock.style.display = 'none';
        tablaStockBajoBody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align: center; padding: 2rem;">Ningún producto tiene menos de ${limite} unidad(es) en ${nombreUbicacion}.</td></tr>`;
        return;
      }

      reporteCount.textContent = `${data.productos.length} producto(s) con menos de ${limite} en ${nombreUbicacion}`;
      
      // Renderizar gráficas con animation: false para captura inmediata
      actualizarGraficasStock(data.productos, nombreUbicacion);

      data.productos.forEach((p) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
          <td><code>${escaparHtml(p.codigo_barras)}</code></td>
          <td><strong>${escaparHtml(p.nombre)}</strong></td>
          <td>${escaparHtml(p.categoria || 'Sin categoría')}</td>
          <td>${escaparHtml(p.presentacion || 'N/A')}</td>
          <td><strong>${Number(p.existencia)}</strong></td>
        `;
        tablaStockBajoBody.appendChild(fila);
      });
    } catch (err) {
      console.error(err);
    } finally {
      btnGenerarStock.disabled = false;
      btnGenerarStock.textContent = 'Generar reporte';
    }
  });

  function actualizarGraficasStock(productos, nombreUbicacion) {
    graficaProductos?.destroy();
    graficaCategorias?.destroy();
    graficaProductos = null;
    graficaCategorias = null;

    if (!productos.length || typeof Chart === 'undefined') {
      seccionGraficasStock.style.display = 'none';
      return;
    }

    seccionGraficasStock.style.display = 'block';
    const menores = productos.slice(0, 8);

    graficaProductos = new Chart(document.getElementById('graficaProductos'), {
      type: 'bar',
      data: {
        labels: menores.map((p) => acortar(p.nombre, 24)),
        datasets: [{
          label: `Existencia en ${nombreUbicacion}`,
          data: menores.map((p) => Number(p.existencia)),
          backgroundColor: '#1f2a44',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // OBLIGATORIO para renderizar sin delay
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
      },
      plugins: [etiquetasValor]
    });
    actualizarImagenImpresion(graficaProductos);

    const porCategoria = {};
    productos.forEach(p => { 
      const c = p.categoria || 'Sin categoría';
      porCategoria[c] = (porCategoria[c] || 0) + 1; 
    });
    const cats = Object.keys(porCategoria);

    graficaCategorias = new Chart(document.getElementById('graficaCategorias'), {
      type: 'doughnut',
      data: {
        labels: cats.map(c => `${acortar(c, 18)} (${porCategoria[c]})`),
        datasets: [{
          data: cats.map(c => porCategoria[c]),
          backgroundColor: PALETA_GRAFICAS
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // OBLIGATORIO
        plugins: { legend: { position: 'right' } }
      }
    });
    actualizarImagenImpresion(graficaCategorias);
  }

  btnImprimirStock?.addEventListener('click', () => window.print());

  // ==============================================
  // 2. REPORTE MENSUAL DE VENTAS
  // ==============================================
  const formFiltroVentas = document.getElementById('formFiltroVentas');
  const selectMes = document.getElementById('selectMes');
  const inputAnio = document.getElementById('inputAnio');
  const btnGenerarVentas = document.getElementById('btnGenerar');
  const btnImprimirReporte = document.getElementById('btnImprimirReporte');
  const tablaVentasBody = document.getElementById('tablaVentasBody');
  const ventasCount = document.getElementById('ventasCount');
  const alertaVentas = document.getElementById('alertaVentas');
  const docVentasMensual = document.getElementById('docVentasMensual');
  const metricasVenta = document.getElementById('metricasVenta');
  const contenedorGraficaVentas = document.getElementById('contenedorGraficaVentas');

  let chartVentas = null;

  formFiltroVentas?.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertaVentas.hidden = true;

    btnGenerarVentas.disabled = true;
    btnGenerarVentas.textContent = 'Procesando...';

    try {
      const res = await fetch(`${API_REPORTE_VENTAS}?anio=${encodeURIComponent(inputAnio.value)}&mes=${encodeURIComponent(selectMes.value)}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok) {
        alertaVentas.textContent = data.mensaje || 'Error al generar el reporte.';
        alertaVentas.className = 'alert alert--error';
        alertaVentas.hidden = false;
        return;
      }

      const mesNombre = selectMes.options[selectMes.selectedIndex].text;
      document.getElementById('docVentasPeriodo').textContent = `Reporte Mensual de Ventas: ${mesNombre} ${inputAnio.value}`;
      document.getElementById('docVentasMeta').textContent = `Generado por: ${userName} (${userRole}) | Fecha y hora: ${new Date().toLocaleString('es-MX')}`;

      docVentasMensual.style.display = 'block';
      tablaVentasBody.innerHTML = '';

      if (!data.ranking.length) {
        ventasCount.textContent = '0 ventas registradas';
        metricasVenta.style.display = 'none';
        contenedorGraficaVentas.style.display = 'none';
        btnImprimirReporte.hidden = true;
        tablaVentasBody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">No se encontraron transacciones registradas en este periodo.</td></tr>`;
        return;
      }

      let totalIngresos = 0, totalPiezas = 0;
      data.ranking.forEach(p => {
        totalIngresos += Number(p.total_recaudado);
        totalPiezas += Number(p.total_unidades_vendidas);
      });

      document.getElementById('metricaTotalIngresos').textContent = `$${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
      document.getElementById('metricaTotalPiezas').textContent = `${totalPiezas.toLocaleString('es-MX')} pzas`;
      document.getElementById('metricaProductosVendidos').textContent = `${data.ranking.length} artículos`;
      metricasVenta.style.display = 'grid';

      ventasCount.textContent = `${data.ranking.length} producto(s) vendidos en el mes`;
      btnImprimirReporte.hidden = false;

      data.ranking.forEach((prod, index) => {
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
        tablaVentasBody.appendChild(fila);
      });

      contenedorGraficaVentas.style.display = 'block';
      if (chartVentas) chartVentas.destroy();
      const topGraficar = data.ranking.slice(0, 8);
      const ctx = document.getElementById('graficaVentas')?.getContext('2d');
      if (ctx && typeof Chart !== 'undefined') {
        chartVentas = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: topGraficar.map(p => acortar(p.nombre, 20)),
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
            animation: false
          }
        });
        actualizarImagenImpresion(chartVentas);
      }
    } catch (err) {
      console.error(err);
    } finally {
      btnGenerarVentas.disabled = false;
      btnGenerarVentas.textContent = 'Generar Informe';
    }
  });

  btnImprimirReporte?.addEventListener('click', () => window.print());

  // ==============================================
  // 3. REPORTE DE VENTAS DEL DÍA
  // ==============================================
  const formDiario = document.getElementById('formReporteDiario');
  const inputFechaDiario = document.getElementById('inputFechaDiario');
  const btnGenerarDiario = document.getElementById('btnGenerarDiario');
  const btnImprimirDiario = document.getElementById('btnImprimirDiario');
  const alertaDiario = document.getElementById('alertaDiario');
  const diarioCount = document.getElementById('diarioCount');
  const docDiario = document.getElementById('docDiario');
  const metricasDiario = document.getElementById('metricasDiario');
  const graficasDiario = document.getElementById('graficasDiario');
  const tablaDiarioBody = document.getElementById('tablaDiarioBody');
  const tablaDiarioFoot = document.getElementById('tablaDiarioFoot');

  let chartDiarioHora = null, chartDiarioMetodo = null;

  if (inputFechaDiario) {
    const hoy = new Date();
    inputFechaDiario.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  }

  formDiario?.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertaDiario.hidden = true;

    btnGenerarDiario.disabled = true;
    btnGenerarDiario.textContent = 'Procesando...';

    try {
      const res = await fetch(`${API_REPORTE_DIARIO}?fecha=${encodeURIComponent(inputFechaDiario.value)}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok) {
        alertaDiario.textContent = data.mensaje || 'Error al obtener reporte del día.';
        alertaDiario.className = 'alert alert--error';
        alertaDiario.hidden = false;
        return;
      }

      document.getElementById('docDiarioTitulo').textContent = `Reporte de Ventas del Día: ${inputFechaDiario.value}`;
      document.getElementById('docDiarioMeta').textContent = `Generado por: ${userName} (${userRole}) | Fecha y hora: ${new Date().toLocaleString('es-MX')}`;

      docDiario.style.display = 'block';
      tablaDiarioBody.innerHTML = '';
      tablaDiarioFoot.innerHTML = '';
      if (chartDiarioHora) chartDiarioHora.destroy();
      if (chartDiarioMetodo) chartDiarioMetodo.destroy();

      if (!data.ventas.length) {
        diarioCount.textContent = `Sin ventas el ${inputFechaDiario.value}`;
        metricasDiario.style.display = 'none';
        graficasDiario.style.display = 'none';
        btnImprimirDiario.hidden = true;
        tablaDiarioBody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">No se encontraron ventas registradas en esta fecha.</td></tr>`;
        return;
      }

      let totalPiezas = 0, totalSubtotal = 0, totalIva = 0, totalImporte = 0;
      const porHora = {};

      data.ventas.forEach(v => {
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

      const horaPico = Object.keys(porHora).map(Number).sort((a, b) => porHora[b].ventas - porHora[a].ventas || porHora[b].importe - porHora[a].importe)[0];

      document.getElementById('diarioMetricaImporte').textContent = `$${totalImporte.toFixed(2)}`;
      document.getElementById('diarioMetricaVentas').textContent = data.ventas.length;
      document.getElementById('diarioMetricaTicket').textContent = `$${(totalImporte / data.ventas.length).toFixed(2)}`;
      document.getElementById('diarioMetricaHoraPico').textContent = `${String(horaPico).padStart(2, '0')}:00 h (${porHora[horaPico].ventas} vtas)`;
      metricasDiario.style.display = 'grid';

      diarioCount.textContent = `${data.ventas.length} venta(s) realizadas`;
      btnImprimirDiario.hidden = false;

      data.ventas.forEach(v => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
          <td><code>${escaparHtml(v.folio)}</code></td>
          <td>${escaparHtml(v.hora)}</td>
          <td>${escaparHtml(ETIQUETA_METODO[v.metodo_pago] || v.metodo_pago)}</td>
          <td>${Number(v.piezas)}</td>
          <td>$${Number(v.subtotal_neto).toFixed(2)}</td>
          <td>$${Number(v.iva).toFixed(2)}</td>
          <td><strong>$${(Number(v.subtotal_neto) + Number(v.iva)).toFixed(2)}</strong></td>
        `;
        tablaDiarioBody.appendChild(fila);
      });

      tablaDiarioFoot.innerHTML = `
        <tr style="font-weight: 700;">
          <td colspan="3">Total del día</td>
          <td>${totalPiezas}</td>
          <td>$${totalSubtotal.toFixed(2)}</td>
          <td>$${totalIva.toFixed(2)}</td>
          <td>$${totalImporte.toFixed(2)}</td>
        </tr>
      `;

      graficasDiario.style.display = 'grid';
      const horas = Object.keys(porHora).map(Number);
      const hIni = Math.min(...horas), hFin = Math.max(...horas);
      const etiquetasH = [], importesH = [];
      for (let h = hIni; h <= hFin; h++) {
        etiquetasH.push(`${String(h).padStart(2, '0')}:00`);
        importesH.push(porHora[h] ? Number(porHora[h].importe.toFixed(2)) : 0);
      }

      chartDiarioHora = new Chart(document.getElementById('graficaDiarioHora'), {
        type: 'bar',
        data: {
          labels: etiquetasH,
          datasets: [{ label: 'Importe ($)', data: importesH, backgroundColor: '#0F766E', borderRadius: 4 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false
        }
      });
      actualizarImagenImpresion(chartDiarioHora);

      const porMetodo = {};
      data.ventas.forEach(v => {
        const met = ETIQUETA_METODO[v.metodo_pago] || v.metodo_pago;
        porMetodo[met] = (porMetodo[met] || 0) + Number(v.subtotal_neto) + Number(v.iva);
      });

      chartDiarioMetodo = new Chart(document.getElementById('graficaDiarioMetodo'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(porMetodo),
          datasets: [{ data: Object.values(porMetodo), backgroundColor: PALETA_GRAFICAS }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false
        }
      });
      actualizarImagenImpresion(chartDiarioMetodo);
    } catch (err) {
      console.error(err);
    } finally {
      btnGenerarDiario.disabled = false;
      btnGenerarDiario.textContent = 'Generar Reporte';
    }
  });

  btnImprimirDiario?.addEventListener('click', () => window.print());

  // ==============================================
  // 4. REPORTE POR PRESENTACIÓN
  // ==============================================
  const formPresentacion = document.getElementById('formReportePresentacion');
  const selectMesPresentacion = document.getElementById('selectMesPresentacion');
  const inputAnioPresentacion = document.getElementById('inputAnioPresentacion');
  const btnGenerarPresentacion = document.getElementById('btnGenerarPresentacion');
  const btnImprimirPresentacion = document.getElementById('btnImprimirPresentacion');
  const alertaPresentacion = document.getElementById('alertaPresentacion');
  const presentacionCount = document.getElementById('presentacionCount');
  const docPresentacion = document.getElementById('docPresentacion');
  const metricasPresentacion = document.getElementById('metricasPresentacion');
  const graficasPresentacion = document.getElementById('graficasPresentacion');
  const tablaPresentacionBody = document.getElementById('tablaPresentacionBody');

  let chartPresUnidades = null, chartPresImporte = null;

  formPresentacion?.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertaPresentacion.hidden = true;

    btnGenerarPresentacion.disabled = true;
    btnGenerarPresentacion.textContent = 'Procesando...';

    try {
      const res = await fetch(`${API_REPORTE_PRESENTACION}?anio=${encodeURIComponent(inputAnioPresentacion.value)}&mes=${encodeURIComponent(selectMesPresentacion.value)}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok) {
        alertaPresentacion.textContent = data.mensaje || 'Error al obtener reporte por presentación.';
        alertaPresentacion.className = 'alert alert--error';
        alertaPresentacion.hidden = false;
        return;
      }

      const mesNombre = selectMesPresentacion.options[selectMesPresentacion.selectedIndex].text;
      document.getElementById('docPresentacionTitulo').textContent = `Reporte por Presentación: ${mesNombre} ${inputAnioPresentacion.value}`;
      document.getElementById('docPresentacionMeta').textContent = `Generado por: ${userName} (${userRole}) | Fecha y hora: ${new Date().toLocaleString('es-MX')}`;

      docPresentacion.style.display = 'block';
      tablaPresentacionBody.innerHTML = '';
      if (chartPresUnidades) chartPresUnidades.destroy();
      if (chartPresImporte) chartPresImporte.destroy();

      if (!data.presentaciones.length) {
        presentacionCount.textContent = '0 presentaciones con venta';
        metricasPresentacion.style.display = 'none';
        graficasPresentacion.style.display = 'none';
        btnImprimirPresentacion.hidden = true;
        tablaPresentacionBody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 2rem;">No se encontraron ventas para este periodo.</td></tr>`;
        return;
      }

      let totalImporte = 0, totalPiezas = 0;
      data.presentaciones.forEach(p => {
        totalImporte += Number(p.total_recaudado);
        totalPiezas += Number(p.total_unidades_vendidas);
      });

      document.getElementById('presMetricaFormatos').textContent = `${data.presentaciones.length} formato(s)`;
      document.getElementById('presMetricaUnidades').textContent = `${totalPiezas.toLocaleString('es-MX')} pzas`;
      document.getElementById('presMetricaImporte').textContent = `$${totalImporte.toFixed(2)}`;
      document.getElementById('presMetricaLider').textContent = data.presentaciones[0].presentacion;
      metricasPresentacion.style.display = 'grid';

      presentacionCount.textContent = `${data.presentaciones.length} presentación(es) con venta`;
      btnImprimirPresentacion.hidden = false;

      data.presentaciones.forEach((p, index) => {
        const fila = document.createElement('tr');
        const aporte = totalImporte > 0 ? ((Number(p.total_recaudado) / totalImporte) * 100).toFixed(1) : 0;
        const rankBadgeClass = index === 0 ? 'badge-rank badge-rank--gold' : 'badge-rank';

        fila.innerHTML = `
          <td><span class="${rankBadgeClass}">#${index + 1}</span></td>
          <td><strong>${escaparHtml(p.presentacion)}</strong></td>
          <td>${Number(p.productos_distintos)}</td>
          <td><strong>${Number(p.total_unidades_vendidas)}</strong> pza(s)</td>
          <td>$${Number(p.total_recaudado).toFixed(2)}</td>
          <td><span class="badge badge--success">${aporte}%</span></td>
        `;
        tablaPresentacionBody.appendChild(fila);
      });

      graficasPresentacion.style.display = 'grid';
      const topPres = data.presentaciones.slice(0, 8);
      chartPresUnidades = new Chart(document.getElementById('graficaPresentacionUnidades'), {
        type: 'bar',
        data: {
          labels: topPres.map(p => acortar(p.presentacion, 20)),
          datasets: [{ label: 'Unidades vendidas', data: topPres.map(p => Number(p.total_unidades_vendidas)), backgroundColor: '#0F766E', borderRadius: 4 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false
        }
      });
      actualizarImagenImpresion(chartPresUnidades);

      chartPresImporte = new Chart(document.getElementById('graficaPresentacionImporte'), {
        type: 'doughnut',
        data: {
          labels: topPres.map(p => acortar(p.presentacion, 20)),
          datasets: [{ data: topPres.map(p => Number(p.total_recaudado)), backgroundColor: PALETA_GRAFICAS }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false
        }
      });
      actualizarImagenImpresion(chartPresImporte);
    } catch (err) {
      console.error(err);
    } finally {
      btnGenerarPresentacion.disabled = false;
      btnGenerarPresentacion.textContent = 'Generar Reporte';
    }
  });

  btnImprimirPresentacion?.addEventListener('click', () => window.print());

  // ==============================================
  // FUNCIONES AUXILIARES
  // ==============================================
  function acortar(texto, max) {
    const t = String(texto ?? '');
    return t.length > max ? `${t.slice(0, max - 1)}…` : t;
  }

  function escaparHtml(valor) {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function actualizarImagenImpresion(grafica) {
    const contenedor = grafica.canvas.parentElement;
    let imagen = contenedor.querySelector('.chart-print-img');
    if (!imagen) {
      imagen = document.createElement('img');
      imagen.className = 'chart-print-img';
      imagen.alt = 'Gráfica del reporte';
      contenedor.appendChild(imagen);
    }
    // Asigna el DataURL base64 directamente a la imagen de impresión
    imagen.src = grafica.toBase64Image('image/png', 1);
  }
});