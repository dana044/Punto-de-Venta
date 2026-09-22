/**
 * Punto de Venta UV - Funcionalidad de Inventario.
 * Gestiona el formulario de registro de nuevos productos (HU-06).
 */

const API_INVENTARIO = '/api/inventory/productos';

document.addEventListener('DOMContentLoaded', () => {
  const formulario = document.getElementById('productForm');
  const alerta = document.getElementById('alertMessage');
  const btnSubmit = document.getElementById('submitBtn');

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    //Recolección de los datos del formulario
    const productoData = {
      nombre: document.getElementById('nombre').value.trim(),
      codigo_barras: document.getElementById('codigo_barras').value.trim(),
      presentacion: document.getElementById('presentacion').value.trim(),
      unidad_medida: document.getElementById('unidad_medida').value,
      precio: parseFloat(document.getElementById('precio').value)
    };

    //Bloqueo del botón y ocultar alertas previas
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';
    alerta.hidden = true;

    try {
      //Enviar los datos a la API
      const respuesta = await fetch(API_INVENTARIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoData)
      });

      const datos = await respuesta.json();

      //Mostrar respuesta dependiendo del resultado
      if (respuesta.ok) {
        mostrarAlerta(datos.mensaje, 'Éxito');
        formulario.reset(); // Limpia el formulario para hacer un nuevo registro
      } else {
        mostrarAlerta(datos.mensaje || 'Error al registrar el producto.', 'Error');
      }
    } catch (error) {
      mostrarAlerta('Error de conexión con el servidor.', 'Error');
    } finally {
      //Restaura el botón
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Registrar Producto';
    }
  });

  /**
   * Muestra un mensaje de éxito o error en pantalla.
   * @param {string} mensaje - El texto a mostrar.
   * @param {string} tipo - Tipo de alerta ('success' o 'error').
   */
  function mostrarAlerta(mensaje, tipo) {
    alerta.textContent = mensaje;
    alerta.className = `alert alert--${tipo}`;
    alerta.hidden = false;
  }
});