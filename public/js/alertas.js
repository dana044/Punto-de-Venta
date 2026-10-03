/**
 * @file alertas.js
 * @description Panel de alertas automáticas de stock bajo (lado del cliente).
 * El umbral es fijo (igual para todos los productos), así que esta pantalla
 * solo muestra el banner; ya no hay configuración por producto.
 * El banner muestra únicamente el total de productos con stock bajo; el detalle
 * se consulta en inventario con el botón "Ver stock bajo".
 * @author Jetzaly Josmery Tello Campos (Coach / Programador XP)
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

document.addEventListener('DOMContentLoaded', () => {
  const panelAlertas = document.getElementById('panelAlertasStock');

  if (!panelAlertas) return; // Esta pantalla no tiene el panel, no hacemos nada.

  const userRole = localStorage.getItem('userRole');

  // Se expone para que inventario.js pueda refrescar el banner tras cambiar el stock
  window.cargarAlertas = cargarAlertas;

  cargarAlertas();

  /**
   * Consulta las alertas activas y las pinta en el banner.
   * Cuenta productos distintos: un producto bajo en almacén y en mostrador cuenta una sola vez.
   *
   * @async
   * @function cargarAlertas
   * @returns {Promise<void>}
   */
  async function cargarAlertas() {
    try {
      const res = await fetch('/api/alerts', { headers: { 'x-user-role': userRole } });
      const data = await res.json();

      if (!res.ok || !data.alertas || data.alertas.length === 0) {
        panelAlertas.innerHTML = '';
        return;
      }

      const totalProductos = new Set(data.alertas.map((alerta) => alerta.productoId)).size;

      panelAlertas.innerHTML = `
        <div class="alertas-banner">
          <div class="alertas-banner__header">
            <span class="alertas-banner__titulo">⚠️ ${totalProductos} producto(s) con stock bajo</span>
          </div>
        </div>
      `;
    } catch (err) {
      panelAlertas.innerHTML = '';
    }
  }
});