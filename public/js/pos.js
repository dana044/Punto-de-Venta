/**
 * @file pos.js
 * @description Controlador para el Punto de Venta (HU26, HU27, HU30, HU49).
 */

const API_BUSCAR_PRODUCTO = '/api/inventory/productos/buscar-pos';
const API_CALCULAR = '/api/pos/calcular';
const API_COBRAR = '/api/pos/cobrar'; // Nuevo endpoint HU30

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    window.location.href = '/login';
    return;
  }

  configurarMenuPorRol(userRole);

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
  const btnAgregar = document.getElementById('btnAgregar');
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

  function configurarMenuPorRol(rol) {
    const menuPersonal = document.getElementById('menuPersonal');
    const menuInventario = document.getElementById('menuInventario');
    const menuRecepcion = document.getElementById('menuRecepcion');
    const menuProveedores = document.getElementById('menuProveedores');
    const menuPos = document.getElementById('menuPos');

    if (rol === 'administrador') {
      menuPersonal?.removeAttribute('hidden');
      menuInventario?.removeAttribute('hidden');
      menuRecepcion?.removeAttribute('hidden');
      menuProveedores?.removeAttribute('hidden');
      menuPos?.removeAttribute('hidden');
    } else if (rol === 'cajero') {
      menuPos?.removeAttribute('hidden');
    }
  }

  inputBuscarProducto.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await buscarYAgregarProducto(inputBuscarProducto.value.trim());
    }
  });

  btnAgregar.addEventListener('click', async () => {
    await buscarYAgregarProducto(inputBuscarProducto.value.trim());
  });

  let ventaActivaId = null;

/**
 * HU-25: Inicializa una nueva venta en el POS solicitando el folio consecutivo.
 * Solo se dispara cuando el carrito está vacío y se intenta agregar el primer producto.
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
        console.error('[Error Log - Error de red al iniciar venta]:', error);
        return false;
    }
}

// Ejecutar al cargar la interfaz
  document.addEventListener('DOMContentLoaded', () => {
    inicializarVenta();
  });

  /**
   * HU26 / HU49: Realiza la búsqueda del producto en el backend por código o nombre
   * y lo añade a la lista de cobro.
   * @param {string} query Término de búsqueda (código de barras o nombre)
   */
  async function buscarYAgregarProducto(query) {
    if (!query) {
      mostrarMensaje('Ingresa un código de barras o nombre de producto.', 'error');
      return;
    }

    // --- INYECCIÓN HU-25: Generar folio si es el primer producto del carrito ---
  if (!ventaActivaId) {
    const ventaAbierta = await inicializarVenta();
    if (!ventaAbierta) {
        mostrarError('No se pudo generar el folio de venta. Operación cancelada.');
        return;
    }
  }
  // ---------------------------------------------------------------------------

    try {
      const res = await fetch(`${API_BUSCAR_PRODUCTO}?q=${encodeURIComponent(query)}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();

      if (!res.ok || !data.producto) {
        mostrarMensaje(data.mensaje || 'Producto no encontrado o inactivo.', 'error');
        return;
      }

      carrito.push({
        productoId: data.producto.id,
        productoNombre: data.producto.nombre,
        cantidad: Number(inputCantidad.value) || 1,
        descuentoTipo: selectDescuentoTipo.value,
        descuentoValor: Number(inputDescuentoValor.value) || 0
      });

      inputBuscarProducto.value = '';
      inputCantidad.value = 1;
      inputDescuentoValor.value = 0;
      inputBuscarProducto.focus();

      recalcular();
    } catch (err) {
      mostrarMensaje('Error al comunicarse con el servidor.', 'error');
    }
  }

  window.quitarLinea = function(index) {
    carrito.splice(index, 1);
    recalcular();
    inputBuscarProducto.focus();
  };

  async function recalcular() {
    if (carrito.length === 0) {
      carritoBody.innerHTML = '<tr><td colspan="6" class="text-muted">El carrito está vacío.</td></tr>';
      pintarTotales({ subtotal: 0, descuentos: 0, iva: 0, total: 0 });
      return;
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
      pintarCarrito(data.items);
      pintarTotales(data);
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
            <button class="btn-icon-delete" onclick="quitarLinea(${index})" title="Quitar">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
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
    modalTotalCobrar.textContent = `$${totalActual.toFixed(2)}`;
    inputMontoRecibido.value = totalActual.toFixed(2); // Sugerir pago exacto
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

  btnConfirmarPago.addEventListener('click', async () => {
    btnConfirmarPago.disabled = true;
    btnConfirmarPago.textContent = 'Procesando...';

    try {
      const res = await fetch(API_COBRAR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
        body: JSON.stringify({
          items: carrito,
          metodoPago: selectMetodoPago.value,
          montoRecibido: Number(inputMontoRecibido.value)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        mostrarMensaje(data.mensaje || 'Error al procesar el pago.', 'error');
        return;
      }

      // Venta exitosa: limpiar carrito y cerrar modal
      carrito = [];
      recalcular();
      cerrarModal();
      mostrarMensaje(`¡Cobro exitoso! Folio: ${data.folio} | Cambio a devolver: $${data.cambio}`, 'success');
      
    } catch (err) {
      mostrarMensaje('Error de red al intentar cobrar.', 'error');
    } finally {
      btnConfirmarPago.disabled = false;
      btnConfirmarPago.textContent = 'Confirmar Transacción';
    }
  });

});