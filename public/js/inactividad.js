/**
 * @file inactividad.js
 * @description Gestión de inactividad con modal de advertencia preventiva (HU-05).
 * Cierra automáticamente la sesión a los 5 minutos, mostrando una alerta visual
 * 60 segundos antes para permitir al usuario extender su turno.
 * @author Stephanie Elizdeth Hernández Prieto (Tracker / Programadora XP)
 */

(function () {
  const TIEMPO_LIMITE_INACTIVIDAD = 5 * 60 * 1000; // 5 minutos totales
  const TIEMPO_AVISO_PREVIO = 1 * 60 * 1000;      // Aviso a los 4 minutos (queda 1 min)

  let temporizadorAviso;
  let temporizadorCierre;
  let intervaloCuentaRegresiva;
  let segundosRestantes = 60;

  /**
   * Crea e inyecta dinámicamente en el DOM el modal preventivo de expiración.
   */
  function crearModalAdvertencia() {
    if (document.getElementById('modalInactividadOverlay')) return;

    const modalHTML = `
      <div id="modalInactividadOverlay" class="modal-overlay" style="display: none; z-index: 99999; background: rgba(15, 23, 42, 0.75);">
        <div class="modal-card" style="max-width: 440px; text-align: center; padding: 2rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-modal);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⏳</div>
          <strong style="font-size: 1.25rem; color: var(--text-main); display: block; margin-bottom: 0.5rem;">
            Tu sesión está a punto de expirar
          </strong>
          <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 1.25rem;">
            No se ha detectado actividad reciente. Por seguridad, el turno se cerrará en:
          </p>
          <div id="contadorInactividadVisual" style="font-size: 2rem; font-weight: 800; color: var(--color-danger); margin-bottom: 1.5rem;">
            60s
          </div>
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button type="button" class="btn btn--secondary" id="btnSalirInactividad">Cerrar Sesión Ahora</button>
            <button type="button" class="btn btn--primary" id="btnContinuarSesion">Seguir Trabajando</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('btnContinuarSesion')?.addEventListener('click', () => {
      ocultarModalAdvertencia();
      reiniciarTemporizador();
    });

    document.getElementById('btnSalirInactividad')?.addEventListener('click', () => {
      cerrarSesionPorInactividad();
    });
  }

  function mostrarModalAdvertencia() {
    const modal = document.getElementById('modalInactividadOverlay');
    const displayContador = document.getElementById('contadorInactividadVisual');
    if (!modal) return;

    segundosRestantes = 60;
    if (displayContador) displayContador.textContent = `${segundosRestantes}s`;
    modal.style.display = 'flex';

    clearInterval(intervaloCuentaRegresiva);
    intervaloCuentaRegresiva = setInterval(() => {
      segundosRestantes--;
      if (displayContador) displayContador.textContent = `${segundosRestantes}s`;

      if (segundosRestantes <= 0) {
        clearInterval(intervaloCuentaRegresiva);
      }
    }, 1000);
  }

  function ocultarModalAdvertencia() {
    const modal = document.getElementById('modalInactividadOverlay');
    if (modal) modal.style.display = 'none';
    clearInterval(intervaloCuentaRegresiva);
  }

  /**
   * Cierra automáticamente la sesión del usuario invalidando el almacenamiento local
   * y redirigiendo hacia la pantalla de autenticación (HU-05).
   */
  function cerrarSesionPorInactividad() {
    clearInterval(intervaloCuentaRegresiva);
    localStorage.clear();
    alert('Tu sesión ha expirado automáticamente por inactividad.');
    window.location.replace('/login');
  }

  /**
   * Reinicia la cuenta regresiva del temporizador cada vez que se detecta actividad.
   */
  function reiniciarTemporizador() {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    if (!token || !userRole) return;

    clearTimeout(temporizadorAviso);
    clearTimeout(temporizadorCierre);

    // Aviso al minuto 4 (240,000 ms)
    temporizadorAviso = setTimeout(mostrarModalAdvertencia, TIEMPO_LIMITE_INACTIVIDAD - TIEMPO_AVISO_PREVIO);
    // Cierre al minuto 5 (300,000 ms)
    temporizadorCierre = setTimeout(cerrarSesionPorInactividad, TIEMPO_LIMITE_INACTIVIDAD);
  }

  document.addEventListener('DOMContentLoaded', () => {
    crearModalAdvertencia();
    reiniciarTemporizador();

    const eventosActividad = ['mousemove', 'mousedown', 'keydown', 'scroll', 'click', 'touchstart'];
    eventosActividad.forEach((evento) => {
      window.addEventListener(evento, () => {
        const modal = document.getElementById('modalInactividadOverlay');
        // Si el modal de aviso ya está abierto, se exige interacción con los botones
        if (!modal || modal.style.display === 'none') {
          reiniciarTemporizador();
        }
      }, { passive: true });
    });
  });
})();