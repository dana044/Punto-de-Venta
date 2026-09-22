/**
 * Punto de Venta UV — Vista de Inicio de Sesion (HU01).
 */

/**
 * Ruta del backend a la que se envian las credenciales.
 * @type {string}
 */
const RUTA_INICIO_SESION = "/api/auth/login";

document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("loginForm");
  const entradaUsuario = document.getElementById("username");
  const entradaContrasena = document.getElementById("password");
  const botonMostrarContrasena = document.getElementById("togglePassword");
  const botonEnviar = document.getElementById("submitBtn");
  const cajaError = document.getElementById("loginError");
  const tarjetasRol = document.querySelectorAll(".payment-card");

  inicializarAlternarContrasena();
  inicializarSeleccionRol();
  inicializarEnvioFormulario();

  /**
   * Alterna la visibilidad de la contrasena entre texto plano y
   * puntos ocultos, y actualiza el texto/aria-label del boton
   * "Mostrar/Ocultar" para mantener accesibilidad.
   * @returns {void}
   */
  function inicializarAlternarContrasena() {
    botonMostrarContrasena.addEventListener("click", () => {
      const estabaOculta = entradaContrasena.type === "password";
      entradaContrasena.type = estabaOculta ? "text" : "password";
      botonMostrarContrasena.textContent = estabaOculta ? "Ocultar" : "Mostrar";
      botonMostrarContrasena.setAttribute(
        "aria-label",
        estabaOculta ? "Ocultar contrasena" : "Mostrar contrasena"
      );
    });
  }

  /**
   * Sincroniza la tarjeta de rol (Administrador / Cajero /
   * Almacenista) que el usuario selecciona: aplica la clase
   * visual .payment-card--active a la tarjeta activa, quitandola
   * de las demas.
   * @returns {void}
   */
  function inicializarSeleccionRol() {
    tarjetasRol.forEach((tarjeta) => {
      const entradaRadio = tarjeta.querySelector("input[type=radio]");

      entradaRadio.addEventListener("change", () => {
        /** Limpia el estado visual de todas las tarjetas antes de marcar la nueva seleccion. */
        tarjetasRol.forEach((otraTarjeta) => {
          otraTarjeta.classList.remove("payment-card--active");
        });

        tarjeta.classList.add("payment-card--active");
      });
    });
  }

  /**
   * Controla el envio del formulario: valida los campos, bloquea
   * el boton mientras se espera respuesta del servidor, y traduce
   * el resultado (exito o error de credenciales) en
   * retroalimentacion visible para el usuario.
   * @returns {void}
   */
  function inicializarEnvioFormulario() {
    formulario.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      ocultarError();

      const usuario = entradaUsuario.value.trim();
      const contrasena = entradaContrasena.value;
      const rol = formulario.querySelector("input[name=role]:checked")?.value;

      const mensajeValidacion = validar(usuario, contrasena);
      if (mensajeValidacion) {
        mostrarError(mensajeValidacion);
        return;
      }

      establecerCargando(true);

      try {
        const resultado = await intentarInicioSesion({ usuario, contrasena, rol });
        manejarRespuestaInicioSesion(resultado);
      } catch (error) {
        /** Cubre tanto credenciales incorrectas (respuesta del servidor) como errores de red, por ejemplo si el endpoint aun no existe. */
        mostrarError(
          error.message ||
          "No se pudo iniciar sesion. Verifica tu usuario y contrasena."
        );
      } finally {
        establecerCargando(false);
      }
    });
  }

  /**
   * Valida en el cliente que el usuario y la contrasena tengan un
   * formato minimo aceptable antes de contactar al servidor
   * (requisito no funcional RNF04: validacion en frontend y backend).
   * @param {string} usuario - Usuario o correo capturado.
   * @param {string} contrasena - Contrasena capturada.
   * @returns {string|null} Mensaje de error, o null si es valido.
   */
  function validar(usuario, contrasena) {
    if (!usuario) return "Ingresa tu usuario o correo.";
    if (!contrasena) return "Ingresa tu contrasena.";
    if (contrasena.length < 8)
      return "La contrasena debe tener al menos 8 caracteres.";
    return null;
  }

  /**
   * Envia las credenciales al backend mediante POST y devuelve los
   * datos de la respuesta. Si el servidor responde con un codigo
   * de error (por ejemplo 401 por credenciales invalidas), lanza
   * un error con el mensaje que debe mostrarse al usuario, tal
   * como lo pide el criterio de aceptacion de HU01.
   * @param {{usuario: string, contrasena: string, rol: string|undefined}} credenciales
   * @returns {Promise<Object>} Datos devueltos por el backend (por ejemplo el token JWT).
   */
  async function intentarInicioSesion({ usuario, contrasena, rol }) {
    const respuesta = await fetch(RUTA_INICIO_SESION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, contrasena, rol }),
    });

    let datos = {};
    try {
      datos = await respuesta.json();
    } catch (_) {
      /** El backend puede no devolver JSON todavia si la ruta de autenticacion sigue pendiente de implementar. */
    }

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || "Usuario o contrasena incorrectos.");
    }

    return datos;
  }

  /**
    * Procesa una respuesta exitosa de inicio de sesión, guarda las credenciales
    * y redirige a la pantalla correspondiente según el rol.
    * @param {Object} datos - Respuesta del backend con los datos de sesión.
    * @param {string} datos.token - JWT o token temporal de sesión.
    * @param {Object} datos.usuario - Información del usuario (id, username, role).
    * @returns {void}
    */
  function manejarRespuestaInicioSesion(datos) {
    localStorage.setItem("token", datos.token);
    localStorage.setItem("userRole", datos.usuario.role);

    switch (datos.usuario.role) {
      case 'administrador':
        window.location.href = "/empleados/nuevo";
        break;
      case 'cajero':
        window.location.href = "/pos";
        break;
      case 'almacenista':
        window.location.href = "/inventario";
        break;
      default:
        mostrarError("Rol no reconocido en el sistema.");
    }
  }

  /**
   * Muestra el mensaje de error de autenticacion en la franja de
   * alerta visible sobre el formulario.
   * @param {string} mensaje - Texto a mostrar al usuario.
   * @returns {void}
   */
  function mostrarError(mensaje) {
    cajaError.textContent = mensaje;
    cajaError.hidden = false;
  }

  /**
   * Oculta y limpia la franja de alerta de error.
   * @returns {void}
   */
  function ocultarError() {
    cajaError.hidden = true;
    cajaError.textContent = "";
  }

  /**
   * Refleja visualmente el estado de "validando" en el boton de
   * envio: lo deshabilita para evitar doble envio y cambia su
   * texto mientras se espera la respuesta del servidor.
   * @param {boolean} estaCargando
   * @returns {void}
   */
  function establecerCargando(estaCargando) {
    botonEnviar.disabled = estaCargando;
    botonEnviar.textContent = estaCargando
      ? "Validando..."
      : "Iniciar Turno / Sesion";
  }
});