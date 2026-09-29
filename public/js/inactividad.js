// ==========================================================================
  // HU-05: CIERRE AUTOMÁTICO DE SESIÓN POR INACTIVIDAD
  // ==========================================================================

  /**
   * Tiempo límite máximo de inactividad permitido antes del cierre forzoso (en ms).
   * Equivale a 5 minutos (300,000 ms).
   * @constant {number}
   */
  const TIEMPO_LIMITE_INACTIVIDAD = 5 * 60 * 1000;

  /**
   * Identificador del temporizador activo de inactividad.
   * @type {NodeJS.Timeout|number|undefined}
   */
  let temporizadorInactividad;

  /**
   * Cierra automáticamente la sesión del usuario invalidando el almacenamiento local
   * y redirigiendo hacia la pantalla de autenticación (HU-05).
   *
   * @function cerrarSesionPorInactividad
   * @returns {void}
   */
  function cerrarSesionPorInactividad() {
    // 1. Limpiar credenciales de sesión en el navegador
    localStorage.clear();

    // 2. Notificación obligatoria según el criterio de aceptación
    alert('Tu sesión ha expirado automáticamente por inactividad.');

    // 3. Redirección forzada hacia el inicio de sesión
    window.location.replace('/login');
  }

  /**
   * Reinicia la cuenta regresiva del temporizador cada vez que se detecta actividad.
   *
   * @function reiniciarTemporizador
   * @returns {void}
   */
  function reiniciarTemporizador() {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(cerrarSesionPorInactividad, TIEMPO_LIMITE_INACTIVIDAD);
  }

  // Lista de eventos de entrada del usuario a monitorear
  const eventosActividad = ['mousemove', 'mousedown', 'keydown', 'scroll', 'click', 'touchstart'];

  eventosActividad.forEach((evento) => {
    window.addEventListener(evento, reiniciarTemporizador, { passive: true });
  });

  // Inicialización del temporizador al montar el controlador
  reiniciarTemporizador();