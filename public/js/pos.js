/**
 * @file pos.js
 * @description Controlador para el Punto de Venta (HU26, HU27, HU30, HU49).
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

const API_BUSCAR_PRODUCTO = '/api/inventory/productos/buscar-pos';
const API_CALCULAR = '/api/pos/calcular';
const API_AUTORIZAR_ELIMINACION = '/api/pos/autorizar-eliminacion';
const API_COBRAR = '/api/pos/cobrar';
const API_SIGUIENTE_FOLIO = '/api/pos/siguiente-folio';
const API_CATALOGO_CATEGORIAS = '/api/pos/catalogo/categorias';
const API_CATALOGO_PRODUCTOS = '/api/pos/catalogo/productos';

// Datos ficticios de la cuenta receptora para pagos por transferencia (SPEI)
const DATOS_TRANSFERENCIA = {
  banco: 'Banco del Golfo (simulación)',
  titular: 'Punto de Venta UV S.A. de C.V.',
  clabe: '999180001234567899'
};

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  function configurarMenuPorRol(rol) {
    // La visibilidad de accesos ahora es gobernada centralizadamente por perfil.js
  }

  document.getElementById('btnLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/login';
  });

  const alerta = document.getElementById('alertMessage');
  const inputBuscarProducto = document.getElementById('inputBuscarProducto');
  const inputCantidad = document.getElementById('inputCantidad');
  const selectDescuentoTipo = document.getElementById('selectDescuentoTipo');
  const inputDescuentoValor = document.getElementById('inputDescuentoValor');
  // Caja con scroll de la lista de venta (panel derecho); se usa para dejar visible el último producto agregado
  const carritoScroll = document.getElementById('carritoScroll');
  const carritoBody = document.getElementById('carritoBody');
  const btnAbrirCobro = document.getElementById('btnAbrirCobro');

  // Elementos del Modal HU30
  const modalCobro = document.getElementById('modalCobro');
  const btnCerrarCobro = document.getElementById('btnCerrarCobro');
  const btnCancelarCobro = document.getElementById('btnCancelarCobro');
  const modalTotalCobrar = document.getElementById('modalTotalCobrar');
  const selectMetodoPago = document.getElementById('selectMetodoPago');
  const divMontoRecibido = document.getElementById('divMontoRecibido');
  const inputMontoRecibido = document.getElementById('inputMontoRecibido');
  const modalCambio = document.getElementById('modalCambio');
  const btnConfirmarPago = document.getElementById('btnConfirmarPago');

  let carrito = [];
  let totalActual = 0; // Guardamos el total para validar el cobro
  let ventaActivaId = null;

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
    } else if (rol === 'cajero') {
      menuPos?.removeAttribute('hidden');
    } else if (rol === 'almacenista') {
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      menuReportes?.removeAttribute('hidden');
      menuReporteVentas?.removeAttribute('hidden');
    }
  }

/**
 * HU-25: Inicializa una nueva venta en el POS solicitando el folio consecutivo.
 * Solo se dispara cuando el carrito está vacío y se intenta agregar el primer producto.
 * @deprecated Ya no se invoca: abrir la venta creaba un registro vacío en la base de datos.
 *             El folio se muestra con mostrarFolioSiguiente() y la venta se registra al cobrar.
 */
async function inicializarVenta() {
    try {
        // 1. Buscamos el token en ambas memorias por si cambiaron la arquitectura
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        const headers = { 
            'Content-Type': 'application/json' 
        };
        
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        // 2. INYECCIÓN CRÍTICA: La llave secreta del equipo para pasar el middleware
        if (typeof userRole !== 'undefined') {
            headers['x-user-role'] = userRole;
        } else {
            headers['x-user-role'] = localStorage.getItem('role') || 'administrador';
        }

        const response = await fetch('/api/pos/abrir', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ empleado_id: 1 }) 
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Extraemos el ID dependiendo de cómo se llame en tu controlador actual
            ventaActivaId = data.data.venta_id || data.data.id;
            
            const elFolio = document.getElementById('lblFolio');
            const elFecha = document.getElementById('lblFecha');
            const elCajero = document.getElementById('lblCajero');

            if (elFolio) elFolio.textContent = data.data.folio;
            if (elFecha) {
                const fecha = new Date(data.data.fecha);
                elFecha.textContent = fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            if (elCajero) elCajero.textContent = 'Cajero ID #1 (Activo)';

            console.log(`[VENTA INICIADA]: Folio ${data.data.folio} asignado.`);
            return true;
        } else {
            console.error('[Error Log - Fallo al iniciar venta]:', data.message || data.error || 'Acceso denegado por middleware.');
            return false;
        }
    } catch (error) {
        return false;
    }
}

  // Se inicia la venta al cargar la interfaz
  //inicializarVenta();

  /**
   * Consulta y muestra el folio que tendrá la próxima venta, junto con la fecha actual.
   * Es de solo lectura: NO crea ninguna venta; el registro se crea hasta que se cobra.
   *
   * @async
   * @function mostrarFolioSiguiente
   * @returns {Promise<void>}
   */
  async function mostrarFolioSiguiente() {
    const elFolio = document.getElementById('lblFolio');
    const elFecha = document.getElementById('lblFecha');

    try {
      const res = await fetch(API_SIGUIENTE_FOLIO, { headers: { 'x-user-role': userRole } });
      const data = await res.json();

      if (res.ok && data.success) {
        if (elFolio) elFolio.textContent = data.data.folio;
        if (elFecha) {
          const fecha = new Date(data.data.fecha);
          elFecha.textContent = fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      } else if (elFolio) {
        elFolio.textContent = 'No disponible';
      }
    } catch (error) {
      console.error('[Error Log - Fallo al consultar el siguiente folio]:', error);
      if (elFolio) elFolio.textContent = 'No disponible';
    }
  }

  // Muestra el folio de la próxima venta al entrar a la pestaña (sin crear la venta)
  mostrarFolioSiguiente();

  /**
   * Muestra en la cabecera quién está usando el POS (ej. "Cajero Ana: Turno en curso").
   * Toma el nombre del perfil de la barra lateral (#userDisplayName), que llena perfil.js,
   * y se actualiza solo cuando ese nombre cambia. Si aún no hay nombre, deja el texto base.
   *
   * @function mostrarCajeroActivo
   * @returns {void}
   */
  function mostrarCajeroActivo() {
    const elCajero = document.getElementById('lblCajero');
    const elNombre = document.getElementById('userDisplayName');
    if (!elCajero || !elNombre) return;

    const actualizar = () => {
      const nombre = elNombre.textContent.trim();
      const etiquetaRol = userRole === 'administrador' ? 'Administrador' : 'Cajero';
      elCajero.textContent = nombre && nombre !== 'Usuario'
        ? `${etiquetaRol} ${nombre}`
        : `${etiquetaRol}: Turno en curso`;
    };

    actualizar();
    // perfil.js se carga después de este archivo, así que se observa el nombre hasta que se llene
    new MutationObserver(actualizar).observe(elNombre, { childList: true, characterData: true, subtree: true });
  }

  mostrarCajeroActivo();

  inputBuscarProducto.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await buscarYAgregarProducto(inputBuscarProducto.value.trim());
    }
  });

  // El botón "Agregar a la venta" (btnAgregar) se eliminó del diseño: los productos se agregan
  // con un clic en su tarjeta del catálogo (ver pintarProductosCatalogo) o con Enter en el buscador (arriba).

  async function buscarYAgregarProducto(query) {
    if (!query) {
      mostrarMensaje('Ingresa un código de barras o nombre de producto.', 'error');
      return;
    }

    // Leemos valores previniendo números negativos y vacíos
    const cantidadIngresada = Math.max(1, Number(inputCantidad.value) || 1);
    const descuentoValorIngresado = Math.max(0, Number(inputDescuentoValor.value) || 0);
    const descuentoTipoIngresado = selectDescuentoTipo.value;

    // La venta ya no se abre aquí: el folio mostrado es informativo y la venta se registra al cobrar

    try {
      const res = await fetch(`${API_BUSCAR_PRODUCTO}?q=${encodeURIComponent(query)}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok || !data.producto) {
        mostrarMensaje(data.mensaje || 'Producto no encontrado.', 'error');
        return;
      }

      // Creamos un respaldo del carrito si se rechaza la compra
      const backupCarrito = JSON.parse(JSON.stringify(carrito));
      const indiceExistente = carrito.findIndex(item => item.productoId === data.producto.id);

      if (indiceExistente !== -1) {
        carrito[indiceExistente].cantidad += cantidadIngresada;
        carrito[indiceExistente].descuentoTipo = descuentoTipoIngresado;
        carrito[indiceExistente].descuentoValor = descuentoValorIngresado;
      } else {
        carrito.push({
          productoId: data.producto.id,
          productoNombre: data.producto.nombre,
          cantidad: cantidadIngresada,
          descuentoTipo: descuentoTipoIngresado,
          descuentoValor: descuentoValorIngresado
        });
      }

      // Limpiamos los inputs
      inputBuscarProducto.value = '';
      sincronizarCatalogoTrasAgregar(); // Si había una búsqueda activa, el catálogo regresa a categorías
      inputCantidad.value = 1;
      inputDescuentoValor.value = 0;
      inputBuscarProducto.focus();

      // Le pedimos al backend que valide el stock y haga las sumas
      const calculoExitoso = await recalcular();
      
      // Si el backend dice que no hay stock, borramos el "carrito fantasma"
      if (!calculoExitoso) {
        carrito = backupCarrito; 
      }

    } catch (err) {
      mostrarMensaje('Error al comunicarse con el servidor.', 'error');
    }
  }

  // Quitar productos exige elegir la cantidad y la autorización del administrador (ver modal "Quitar producto")
  window.quitarLinea = function(index) {
    abrirModalQuitar(index);
  };

  // --- ELIMINAR POR CANTIDAD CON AUTORIZACIÓN DEL ADMINISTRADOR ---

  const modalQuitar = document.getElementById('modalQuitar');
  const quitarNombre = document.getElementById('quitarNombre');
  const quitarEnCarrito = document.getElementById('quitarEnCarrito');
  const inputQuitarCantidad = document.getElementById('inputQuitarCantidad');
  const inputQuitarContrasena = document.getElementById('inputQuitarContrasena');
  const errQuitar = document.getElementById('errQuitar');
  const btnQuitarTodo = document.getElementById('btnQuitarTodo');
  const btnConfirmarQuitar = document.getElementById('btnConfirmarQuitar');
  const btnCancelarQuitar = document.getElementById('btnCancelarQuitar');

  let indiceAQuitar = null; // Línea del carrito sobre la que se pidió quitar piezas

  /**
   * Abre el modal para elegir cuántas piezas quitar de la línea indicada.
   * @param {number} index - Posición de la línea en el carrito.
   */
  function abrirModalQuitar(index) {
    const item = carrito[index];
    if (!item) return;

    indiceAQuitar = index;
    quitarNombre.textContent = item.productoNombre;
    quitarEnCarrito.textContent = item.cantidad;
    inputQuitarCantidad.max = item.cantidad;
    inputQuitarCantidad.value = 1;
    inputQuitarContrasena.value = '';
    errQuitar.hidden = true;
    btnConfirmarQuitar.disabled = false;
    modalQuitar.classList.remove('modal--hidden');
    inputQuitarCantidad.focus();
    inputQuitarCantidad.select();
  }

  function cerrarModalQuitar() {
    modalQuitar.classList.add('modal--hidden');
    inputQuitarContrasena.value = ''; // La contraseña nunca se conserva en pantalla
    indiceAQuitar = null;
    inputBuscarProducto.focus();
  }

  function mostrarErrorQuitar(mensaje) {
    errQuitar.textContent = mensaje;
    errQuitar.hidden = false;
  }

  btnQuitarTodo.addEventListener('click', () => {
    const item = carrito[indiceAQuitar];
    if (item) inputQuitarCantidad.value = item.cantidad;
    inputQuitarContrasena.focus();
  });

  btnCancelarQuitar.addEventListener('click', cerrarModalQuitar);

  [inputQuitarCantidad, inputQuitarContrasena].forEach(campo => {
    campo.addEventListener('input', () => { errQuitar.hidden = true; });
    campo.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnConfirmarQuitar.click();
      }
    });
  });

  btnConfirmarQuitar.addEventListener('click', async () => {
    const item = carrito[indiceAQuitar];
    if (!item) {
      cerrarModalQuitar();
      return;
    }

    const cantidadAQuitar = Number(inputQuitarCantidad.value);
    const contrasena = inputQuitarContrasena.value;

    if (!Number.isInteger(cantidadAQuitar) || cantidadAQuitar < 1 || cantidadAQuitar > item.cantidad) {
      mostrarErrorQuitar(`La cantidad a quitar debe ser un número entero entre 1 y ${item.cantidad}.`);
      inputQuitarCantidad.focus();
      return;
    }

    if (!contrasena) {
      mostrarErrorQuitar('Ingresa la contraseña del administrador para autorizar.');
      inputQuitarContrasena.focus();
      return;
    }

    btnConfirmarQuitar.disabled = true;

    try {
      const res = await fetch(API_AUTORIZAR_ELIMINACION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ contrasena })
      });
      const data = await res.json();

      if (!res.ok) {
        mostrarErrorQuitar(data.mensaje || 'No se pudo validar la autorización.');
        inputQuitarContrasena.value = '';
        inputQuitarContrasena.focus();
        return;
      }

      if (cantidadAQuitar >= item.cantidad) {
        carrito.splice(indiceAQuitar, 1);
      } else {
        item.cantidad -= cantidadAQuitar;
        // Un descuento en monto no puede superar el nuevo subtotal de la línea
        if (item.descuentoTipo === 'monto') {
          item.descuentoValor = Math.min(item.descuentoValor, item.precioUnitario * item.cantidad);
        }
      }

      const nombreProducto = item.productoNombre;
      cerrarModalQuitar();
      await recalcular();
      mostrarMensaje(`Se quitaron ${cantidadAQuitar} pza(s) de "${nombreProducto}". Autorizó: ${data.administrador}.`, 'success');
    } catch (err) {
      console.error('Fallo al autorizar la eliminación:', err);
      mostrarErrorQuitar('Error de comunicación con el servidor.');
    } finally {
      btnConfirmarQuitar.disabled = false;
    }
  });

  async function recalcular() {
    if (carrito.length === 0) {
      carritoBody.innerHTML = '<tr><td colspan="6" class="text-muted">El carrito está vacío.</td></tr>';
      pintarTotales({ subtotal: 0, descuentos: 0, iva: 0, total: 0 });
      return true;
    }

    try {
      const res = await fetch(API_CALCULAR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({ items: carrito })
      });
      const data = await res.json();

      if (!res.ok) {
        mostrarMensaje(data.mensaje || 'No se pudo calcular la venta.', 'error');
        return;
      }

      alerta.hidden = true;
      
      // --- 1. CORRECCIÓN DOOMSAYER: Sincronizar el carrito con los precios del backend ---
      carrito = data.items; 
      
      pintarCarrito(carrito);
      pintarTotales(data);
      return true;
    } catch (err) {
      mostrarMensaje('Error de comunicación con el servidor.', 'error');
    }
  }

  function pintarCarrito(items) {
    carritoBody.innerHTML = items.map((item, index) => {
      const etiquetaDesc = item.descuentoTipo === 'porcentaje' ? `${item.descuentoValor}%` : `$${item.descuentoValor.toFixed(2)}`;
      return `
        <tr>
          <td>${item.productoNombre}</td>
          <td>${item.cantidad}</td>
          <td>$${item.precioUnitario.toFixed(2)}</td>
          <td>${etiquetaDesc} (-$${item.descuentoLinea.toFixed(2)})</td>
          <td>$${item.totalLinea.toFixed(2)}</td>
          <td class="btn-icon-delete-cell">
            <button class="btn-icon-delete" onclick="quitarLinea(${index})" title="Quitar">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');

    // Desplaza la lista de venta hasta el final para que el último producto agregado siempre quede a la vista
    carritoScroll.scrollTop = carritoScroll.scrollHeight;
  }

  function pintarTotales(totales) {
    totalActual = totales.total;
    document.getElementById('totSubtotal').textContent = `$${totales.subtotal.toFixed(2)}`;
    document.getElementById('totDescuentos').textContent = `-$${totales.descuentos.toFixed(2)}`;
    document.getElementById('totIva').textContent = `$${totales.iva.toFixed(2)}`;
    document.getElementById('totTotal').textContent = `$${totales.total.toFixed(2)}`;
    
    // HU30: Habilitar o deshabilitar botón de cobro
    btnAbrirCobro.disabled = totalActual <= 0;
  }

  function mostrarMensaje(mensaje, tipo = 'error') {
    alerta.textContent = mensaje;
    alerta.className = `alert alert--${tipo}`;
    alerta.hidden = false;
    setTimeout(() => { alerta.hidden = true; }, 5000);
  }

  // --- LÓGICA DEL MODAL DE COBRO (HU30) ---

  btnAbrirCobro.addEventListener('click', () => {
    mostrarFolioSiguiente(); // Refresca el folio por si otro cajero cobró mientras tanto
    modalTotalCobrar.textContent = `$${totalActual.toFixed(2)}`;
    inputMontoRecibido.value = "";
    calcularCambio();
    modalCobro.classList.remove('modal--hidden');
    inputMontoRecibido.focus();
  });

  const cerrarModal = () => modalCobro.classList.add('modal--hidden');
  btnCerrarCobro.addEventListener('click', cerrarModal);
  btnCancelarCobro.addEventListener('click', cerrarModal);

  selectMetodoPago.addEventListener('change', () => {
    // Solo mostrar campo de "Monto Recibido" si es efectivo
    if (selectMetodoPago.value === 'efectivo') {
      divMontoRecibido.style.display = 'block';
      inputMontoRecibido.value = totalActual.toFixed(2);
    } else {
      divMontoRecibido.style.display = 'none';
      inputMontoRecibido.value = totalActual.toFixed(2); // Auto-completar para tarjetas
    }
    calcularCambio();
  });

  inputMontoRecibido.addEventListener('input', calcularCambio);

  function calcularCambio() {
    const recibido = Number(inputMontoRecibido.value) || 0;
    const cambio = recibido - totalActual;
    modalCambio.textContent = cambio >= 0 ? `$${cambio.toFixed(2)}` : 'Monto insuficiente';
    modalCambio.style.color = cambio >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    btnConfirmarPago.disabled = cambio < 0;
  }

  btnConfirmarPago.addEventListener('click', () => {
    // Tarjeta y transferencia se confirman primero en su propio modal; el efectivo se cobra directo
    if (selectMetodoPago.value === 'tarjeta') {
      abrirModalTarjeta();
      return;
    }
    if (selectMetodoPago.value === 'transferencia') {
      abrirModalTransferencia();
      return;
    }
    ejecutarCobro();
  });

  /**
   * Registra la venta en el servidor y muestra el ticket.
   * @param {string} [numAutorizacion] - No. de Autorización del voucher (solo tarjeta, opcional).
   */
  async function ejecutarCobro(numAutorizacion = '') {
    btnConfirmarPago.disabled = true;
    btnConfirmarPago.textContent = 'Procesando...';

    try {
        // --- 2. CORRECCIÓN DOOMSAYER: Incluir JWT Token y Folio (venta_id) ---
        const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token');

        const res = await fetch('/api/pos/cobrar', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json', 
              'x-user-role': userRole,
              'Authorization': `Bearer ${currentToken}` 
          },
          body: JSON.stringify({
            items: carrito,
            metodoPago: selectMetodoPago.value,
            montoRecibido: Number(inputMontoRecibido.value),
            venta_id: ventaActivaId,
            numAutorizacion: numAutorizacion || null,
            // Id del usuario en sesión, para que la venta quederegistrada a nombre de quien está cobrando.
            usuarioId: localStorage.getItem('userId')
          })
        });

        const data = await res.json();

        if (!res.ok) {
            mostrarMensaje(data.mensaje || 'Error al procesar el pago.', 'error');
            return;
        }
        // Inyección HU-29: Mostrar Ticket
        generarTicket(
            data.folio || document.getElementById('lblFolio').textContent, 
            carrito, 
            selectMetodoPago.value, 
            Number(inputMontoRecibido.value), 
            data.cambio || (Number(inputMontoRecibido.value) - totalActual),
            data.folioFacturacion,
            data.numAutorizacion // Generado automáticamente por el servidor (solo tarjeta)
        );

        // Venta exitosa: limpiar carrito y resetear variables
        carrito = [];
        ventaActivaId = null; // Liberamos el ID para el cliente que sigue (HU-25)
        document.getElementById('lblFolio').textContent = "Generando..."; // Reset visual
        mostrarFolioSiguiente(); // Muestra el folio de la siguiente venta
        recalcular();
        cerrarModal();
        mostrarMensaje(`¡Cobro exitoso! Cambio a devolver: $${data.cambio || 0}`, 'success');
        
    } catch (err) {
        // --- 3. CORRECCIÓN DOOMSAYER: Console log para no enmascarar errores futuros ---
        console.error("Fallo detectado en el frontend al cobrar:", err);
        mostrarMensaje('Error de red al intentar cobrar.', 'error');
    } finally {
        btnConfirmarPago.disabled = false;
        btnConfirmarPago.textContent = 'Confirmar Transacción';
    }
}
    
// --- INYECCIÓN HU-29: LÓGICA DEL TICKET DE VENTA ---

  /**
   * Construye y despliega el ticket de venta con los datos de la transacción.
   */
  window.generarTicket = function(folio, items, metodo, recibido, cambio, folioFacturacion, numAutorizacion) {
      // 1. Cabecera
      document.getElementById('tkFolio').textContent = folio;
      document.getElementById('tkCajero').textContent = document.getElementById('lblCajero').textContent.replace('Cajero: ', '');
      document.getElementById('tkFecha').textContent = new Date().toLocaleString();
      
      // 2. Artículos
      const tbody = document.getElementById('tkArticulos');
      tbody.innerHTML = items.map(item => `
          <tr>
              <td>${item.cantidad}</td>
              <td>${item.productoNombre}</td>
              <!-- 4. CORRECCIÓN DOOMSAYER: Fallback de seguridad para evitar TypeError -->
              <td style="text-align: right;">$${(item.totalLinea || 0).toFixed(2)}</td>
          </tr>
      `).join('');

      // 3. Totales
      document.getElementById('tkSubtotal').textContent = document.getElementById('totSubtotal').textContent;
      document.getElementById('tkIva').textContent = document.getElementById('totIva').textContent;
      document.getElementById('tkTotal').textContent = document.getElementById('totTotal').textContent;

      // 4. Pagos
      document.getElementById('tkMetodo').textContent = metodo.toUpperCase();
      document.getElementById('tkRecibido').textContent = `$${recibido.toFixed(2)}`;
      document.getElementById('tkCambio').textContent = `$${cambio.toFixed(2)}`;

      // 4.1 No. de Autorización (solo si el cajero lo capturó en un pago con tarjeta)
      const filaAutorizacion = document.getElementById('tkAutorizacionFila');
      filaAutorizacion.style.display = numAutorizacion ? 'flex' : 'none';
      document.getElementById('tkAutorizacion').textContent = numAutorizacion || '---';

      // 4.2 Folio de auto-facturación impreso al pie del ticket
      document.getElementById('tkFolioFacturacion').textContent = folioFacturacion || '---';

      // 5. Encender el Modal
      document.getElementById('modalTicket').style.display = 'flex';
  };

  // HU-29: Botón Imprimir Ticket
  document.getElementById('btnImprimirTicket')?.addEventListener('click', () => {
      window.print();
  });

  // HU-29: Botón Cerrar Venta
  document.getElementById('btnCerrarTicket')?.addEventListener('click', () => {
      document.getElementById('modalTicket').style.display = 'none';
      document.getElementById('inputBuscarProducto').focus(); // Listo para el cliente que sigue
  });

  // --- COBRO CON TARJETA (TERMINAL BANCARIA) ---

  const modalTarjeta = document.getElementById('modalTarjeta');
  const tarjetaMonto = document.getElementById('tarjetaMonto');
  const inputNumAutorizacion = document.getElementById('inputNumAutorizacion');
  const errNumAutorizacion = document.getElementById('errNumAutorizacion');
  const btnAprobarTarjeta = document.getElementById('btnAprobarTarjeta');
  const btnRechazarTarjeta = document.getElementById('btnRechazarTarjeta');

  /**
   * Abre el modal "puente": el cobro real ocurre en la terminal física y aquí solo se confirma el resultado.
   */
  function abrirModalTarjeta() {
    tarjetaMonto.textContent = `$${totalActual.toFixed(2)}`;
    inputNumAutorizacion.value = '';
    errNumAutorizacion.hidden = true;
    btnAprobarTarjeta.disabled = false;
    modalTarjeta.classList.remove('modal--hidden');
    inputNumAutorizacion.focus();
  }

  // El No. de Autorización solo admite dígitos (máximo 6)
  inputNumAutorizacion.addEventListener('input', () => {
    inputNumAutorizacion.value = inputNumAutorizacion.value.replace(/\D/g, '');
    errNumAutorizacion.hidden = true;
  });

  inputNumAutorizacion.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      btnAprobarTarjeta.click();
    }
  });

  btnAprobarTarjeta.addEventListener('click', () => {
    const numAutorizacion = inputNumAutorizacion.value.trim();

    // El campo es opcional, pero si se captura debe ser el código de 6 dígitos del voucher
    if (numAutorizacion && !/^\d{6}$/.test(numAutorizacion)) {
      errNumAutorizacion.hidden = false;
      inputNumAutorizacion.focus();
      return;
    }

    btnAprobarTarjeta.disabled = true; // Evita registrar la venta dos veces con doble clic
    modalTarjeta.classList.add('modal--hidden');
    ejecutarCobro(numAutorizacion);
  });

  btnRechazarTarjeta.addEventListener('click', () => {
    modalTarjeta.classList.add('modal--hidden');
    cerrarModal(); // La venta sigue en el carrito para elegir otro método de pago
    mostrarMensaje('Pago con tarjeta rechazado o cancelado en la terminal. La venta no fue registrada.', 'error');
  });

  // --- COBRO POR TRANSFERENCIA (SPEI) ---

  const modalTransferencia = document.getElementById('modalTransferencia');
  const btnConfirmarFondos = document.getElementById('btnConfirmarFondos');
  const btnCancelarTransferencia = document.getElementById('btnCancelarTransferencia');

  /**
   * Muestra los datos de la cuenta receptora para que el cliente haga la transferencia.
   */
  function abrirModalTransferencia() {
    document.getElementById('speiBanco').textContent = DATOS_TRANSFERENCIA.banco;
    document.getElementById('speiTitular').textContent = DATOS_TRANSFERENCIA.titular;
    document.getElementById('speiClabe').textContent = DATOS_TRANSFERENCIA.clabe.replace(/^(\d{3})(\d{3})(\d{11})(\d)$/, '$1 $2 $3 $4');
    document.getElementById('speiReferencia').textContent = document.getElementById('lblFolio').textContent;
    document.getElementById('speiMonto').textContent = `$${totalActual.toFixed(2)}`;
    btnConfirmarFondos.disabled = false;
    modalTransferencia.classList.remove('modal--hidden');
  }

  // El sistema no puede validar el SPEI al instante: el cajero revisa su banca y confirma manualmente
  btnConfirmarFondos.addEventListener('click', () => {
    btnConfirmarFondos.disabled = true; // Evita registrar la venta dos veces con doble clic
    modalTransferencia.classList.add('modal--hidden');
    ejecutarCobro();
  });

  btnCancelarTransferencia.addEventListener('click', () => {
    modalTransferencia.classList.add('modal--hidden');
  });

  // --- CATÁLOGO DE PRODUCTOS Y BÚSQUEDA EN VIVO ---

  const catalogoGrid = document.getElementById('catalogoGrid');
  const catalogoTitulo = document.getElementById('catalogoTitulo');
  const btnVolverCategorias = document.getElementById('btnVolverCategorias');

  const ICONOS_CATEGORIA = {
    'Papelería': '✏️',
    'Bebidas': '🥤',
    'Comida': '🍪',
    'Tecnología': '💻',
    'Limpieza': '🧴',
    'Herramientas': '🔧',
    'Hogar': '🏠',
    'Cuidado personal': '🧼',
    'Mascotas': '🐾',
    'Otros': '📦'
  };

  let vistaCatalogo = 'categorias'; // 'categorias' | 'productos' | 'busqueda'
  let temporizadorBusqueda = null;
  let consultaVigente = 0; // Descarta respuestas viejas si el cajero sigue escribiendo

  /**
   * Consulta un endpoint del catálogo y devuelve el JSON, o null si falla.
   */
  async function consultarCatalogo(url) {
    try {
      const res = await fetch(url, { headers: { 'x-user-role': userRole } });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('Fallo al consultar el catálogo:', err);
      return null;
    }
  }

  function crearTarjeta(icono, nombre, detalle, alClic, deshabilitada = false) {
    const tarjeta = document.createElement('button');
    tarjeta.type = 'button';
    tarjeta.className = 'catalogo-card';
    tarjeta.disabled = deshabilitada;

    const elIcono = document.createElement('span');
    elIcono.className = 'catalogo-card__icono';
    elIcono.textContent = icono;

    const elNombre = document.createElement('span');
    elNombre.className = 'catalogo-card__nombre';
    elNombre.textContent = nombre;

    const elDetalle = document.createElement('span');
    elDetalle.className = 'catalogo-card__detalle';
    elDetalle.textContent = detalle;

    tarjeta.append(elIcono, elNombre, elDetalle);
    tarjeta.addEventListener('click', alClic);
    return tarjeta;
  }

  function pintarMensajeCatalogo(texto) {
    catalogoGrid.innerHTML = '';
    const vacio = document.createElement('div');
    vacio.className = 'catalogo-vacio';
    vacio.textContent = texto;
    catalogoGrid.appendChild(vacio);
  }

  function pintarProductosCatalogo(productos) {
    catalogoGrid.innerHTML = '';
    if (productos.length === 0) {
      pintarMensajeCatalogo('No se encontraron productos.');
      return;
    }
    productos.forEach(producto => {
      const agotado = producto.stock_mostrador <= 0;
      const detalle = `$${Number(producto.precio).toFixed(2)} · ${agotado ? 'Agotado' : `Disp: ${producto.stock_mostrador}`}`;
      // Reutiliza el flujo de agregar por código de barras (toma cantidad y descuento de la barra superior)
      catalogoGrid.appendChild(
        crearTarjeta('🛒', producto.nombre, detalle, () => buscarYAgregarProducto(producto.codigo_barras), agotado)
      );
    });
  }

  /**
   * Estado por defecto: tarjetas con las categorías principales.
   */
  async function volverACategorias() {
    const consulta = ++consultaVigente;
    vistaCatalogo = 'categorias';
    catalogoTitulo.textContent = 'Categorías';
    btnVolverCategorias.hidden = true;

    const data = await consultarCatalogo(API_CATALOGO_CATEGORIAS);
    if (consulta !== consultaVigente) return;

    if (!data) {
      pintarMensajeCatalogo('No se pudo cargar el catálogo.');
      return;
    }
    if (data.categorias.length === 0) {
      pintarMensajeCatalogo('No hay productos registrados.');
      return;
    }

    catalogoGrid.innerHTML = '';
    data.categorias.forEach(cat => {
      catalogoGrid.appendChild(
        crearTarjeta(
          ICONOS_CATEGORIA[cat.categoria] || '📦',
          cat.categoria,
          `${cat.total_productos} producto(s)`,
          () => cargarProductosDeCategoria(cat.categoria)
        )
      );
    });
  }

  /**
   * Al hacer clic en una categoría el panel se limpia y carga sus productos.
   */
  async function cargarProductosDeCategoria(categoria) {
    const consulta = ++consultaVigente;
    vistaCatalogo = 'productos';
    catalogoTitulo.textContent = categoria;
    btnVolverCategorias.hidden = false;
    pintarMensajeCatalogo('Cargando...');

    const data = await consultarCatalogo(`${API_CATALOGO_PRODUCTOS}?categoria=${encodeURIComponent(categoria)}`);
    if (consulta !== consultaVigente) return;

    if (!data) {
      pintarMensajeCatalogo('No se pudieron cargar los productos.');
      return;
    }
    pintarProductosCatalogo(data.productos);
  }

  /**
   * Búsqueda reactiva: muestra solo las tarjetas que coinciden con lo que se va escribiendo.
   */
  async function buscarEnVivo(termino) {
    const consulta = ++consultaVigente;
    vistaCatalogo = 'busqueda';
    catalogoTitulo.textContent = `Resultados para "${termino}"`;
    btnVolverCategorias.hidden = false;

    const data = await consultarCatalogo(`${API_CATALOGO_PRODUCTOS}?q=${encodeURIComponent(termino)}`);
    if (consulta !== consultaVigente) return;

    if (!data) {
      pintarMensajeCatalogo('No se pudo realizar la búsqueda.');
      return;
    }
    pintarProductosCatalogo(data.productos);
  }

  /**
   * Se llama al agregar un producto: cancela búsquedas pendientes y, si había una activa, regresa a categorías.
   */
  function sincronizarCatalogoTrasAgregar() {
    clearTimeout(temporizadorBusqueda);
    consultaVigente++;
    if (vistaCatalogo === 'busqueda') volverACategorias();
  }

  // Listener de la barra de búsqueda: se activa cada vez que el texto cambia (con una pausa corta para no saturar al servidor)
  inputBuscarProducto.addEventListener('input', () => {
    clearTimeout(temporizadorBusqueda);
    const termino = inputBuscarProducto.value.trim();

    if (!termino) {
      volverACategorias();
      return;
    }
    temporizadorBusqueda = setTimeout(() => buscarEnVivo(termino), 250);
  });

  btnVolverCategorias.addEventListener('click', () => {
    inputBuscarProducto.value = '';
    volverACategorias();
    inputBuscarProducto.focus();
  });

  // Estado inicial del catálogo
  volverACategorias();

});