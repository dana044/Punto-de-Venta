/**
 * @file alertas.js
 * @description Panel de alertas automáticas de stock bajo (lado del cliente).
 * El umbral es fijo (igual para todos los productos), así que esta pantalla
 * solo muestra el banner; ya no hay configuración por producto.
 */

document.addEventListener('DOMContentLoaded', () => {
  const panelAlertas = document.getElementById('panelAlertasStock');

  if (!panelAlertas) return; // Esta pantalla no tiene el panel, no hacemos nada.

  const userRole = localStorage.getItem('userRole');

  cargarAlertas();

  /**
   * Consulta las alertas activas y las pinta en el banner.
   */
  async function cargarAlertas() {
    try {
      const res = await fetch('/api/alerts', { headers: { 'x-user-role': userRole } });
      const data = await res.json();

      if (!res.ok || !data.alertas || data.alertas.length === 0) {
        panelAlertas.innerHTML = '';
        return;
      }

      const items = data.alertas
        .map((a) => `
          <div class="alertas-banner__item">
            <span>${a.productoNombre} — ${a.ubicacion === 'almacen' ? 'Almacén' : 'Mostrador'}</span>
            <span>${a.existencia} unidades disponibles</span>              

          </div>
        `)
        .join('');

      panelAlertas.innerHTML = `
        <div class="alertas-banner">
          <div class="alertas-banner__header">
            <span class="alertas-banner__titulo">⚠ ${data.total} producto(s) con stock bajo</span>
          </div>
          <div class="alertas-banner__lista">${items}</div>
        </div>
      `;
    } catch (err) {
      panelAlertas.innerHTML = '';
    }
  }
});
