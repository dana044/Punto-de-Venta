/**
 * Punto de Venta UV — Vista de Inicio de Sesion.
 *
 * Se encarga de:
 *   1) Mostrar/ocultar la contraseña.
 *   2) Marcar visualmente el rol seleccionado (Administrador,
 *      Cajero, Almacenista).
 *   3) Validar el formulario del lado del cliente.
 *   4) Enviar las credenciales al backend y mostrar el mensaje de
 *      error de "credenciales invalidas".
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
  const tarjetasRol = document.querySelectorAll(".role-card");

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
   * visual de seleccion y mueve la etiqueta "Seleccionado" a la
   * tarjeta activa, quitandola de las demas.
   * @returns {void}
   */
  function inicializarSeleccionRol() {
    tarjetasRol.forEach((tarjeta) => {
      const entradaRadio = tarjeta.querySelector("input[type=radio]");

      entradaRadio.addEventListener("change", () => {
        /** Limpia el estado visual de todas las tarjetas antes de marcar la nueva seleccion. */
        tarjetasRol.forEach((otraTarjeta) => {
          otraTarjeta.classList.remove("role-card--selected");
          const etiquetaExistente = otraTarjeta.querySelector(".role-card__tag");
          if (etiquetaExistente) etiquetaExistente.remove();
        });

        tarjeta.classList.add("role-card--selected");
        const etiquetaSeleccionado = document.createElement("span");
        etiquetaSeleccionado.className = "role-card__tag";
        etiquetaSeleccionado.textContent = "Seleccionado";
        tarjeta.appendChild(etiquetaSeleccionado);
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
   * Procesa una respuesta exitosa de inicio de sesion.
   *
   * TODO EQUIPO: una vez que el backend entregue el token (JWT,
   * RNF03), guardarlo y redirigir segun el rol autenticado, por
   * ejemplo:
   *   localStorage.setItem("token", datos.token);
   *   window.location.href = "/dashboard";
   *
   * @param {Object} datos - Respuesta del backend con los datos de sesion.
   * @returns {void}
   */
  function manejarRespuestaInicioSesion(datos) {
    console.log("Inicio de sesion correcto:", datos);
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