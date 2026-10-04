/**
 * @file facturacion.js
 * @description Lógica de la pantalla pública de facturación SIMULADA (proyecto académico).
 * Paso 1: valida la compra contra el servidor. Paso 2: captura los datos fiscales y registra la solicitud.
 * No hay conexión con el SAT ni timbrado real.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

/** Rutas del backend (públicas). */
const API_CATALOGOS = '/api/facturacion/catalogos';
const API_VALIDAR = '/api/facturacion/validar';
const API_SOLICITAR = '/api/facturacion/solicitar';

/** Duración simulada de la validación: entre 3 y 5 segundos. */
const ESPERA_MIN_MS = 3000;
const ESPERA_MAX_MS = 5000;

document.addEventListener('DOMContentLoaded', () => {
    const formPaso1 = document.getElementById('formPaso1');
    const inputFolioFacturacion = document.getElementById('inputFolioFacturacion');
    const inputFechaCompra = document.getElementById('inputFechaCompra');
    const inputFolioVenta = document.getElementById('inputFolioVenta');
    const btnValidar = document.getElementById('btnValidar');
    const cargando = document.getElementById('cargandoValidacion');
    const mensajePaso1 = document.getElementById('mensajePaso1');
    const resumenVenta = document.getElementById('resumenVenta');

    const formPaso2 = document.getElementById('formPaso2');
    const paso2 = document.getElementById('paso2');
    const mensajePaso2 = document.getElementById('mensajePaso2');
    const inputRfc = document.getElementById('inputRfc');
    const inputCodigoPostal = document.getElementById('inputCodigoPostal');
    const inputNombre = document.getElementById('inputNombre');
    const selectRegimen = document.getElementById('selectRegimen');
    const selectUsoCfdi = document.getElementById('selectUsoCfdi');
    const chkCorreo = document.getElementById('chkCorreo');
    const inputCorreo = document.getElementById('inputCorreo');
    const inputCorreoConfirmar = document.getElementById('inputCorreoConfirmar');
    const chkAviso = document.getElementById('chkAviso');
    const btnObtener = document.getElementById('btnObtenerFactura');
    const btnOtro = document.getElementById('btnOtroTicket');
    const resultado = document.getElementById('resultadoFactura');

    /** Indica si el Paso 1 fue validado por el servidor (sin esto el Paso 2 no se habilita). */
    let pasoUnoValidado = false;
    /** Indica si la solicitud ya fue registrada o se está enviando. */
    let solicitudFinalizada = false;

    /** La fecha de compra no puede ser futura. */
    inputFechaCompra.max = fechaLocalISO(new Date());

    cargarCatalogos();
    formPaso1.addEventListener('submit', validarPaso1);
    formPaso2.addEventListener('submit', obtenerFactura);
    btnOtro.addEventListener('click', facturarOtroTicket);
    chkCorreo.addEventListener('change', alternarCamposCorreo);
    chkAviso.addEventListener('change', actualizarBotonObtener);
    inputFolioFacturacion.addEventListener('input', () => {
        inputFolioFacturacion.value = inputFolioFacturacion.value.toUpperCase();
    });
    inputFolioVenta.addEventListener('input', () => {
        inputFolioVenta.value = inputFolioVenta.value.toUpperCase();
    });
    inputRfc.addEventListener('input', () => {
        inputRfc.value = inputRfc.value.toUpperCase();
    });
    inputCodigoPostal.addEventListener('input', () => {
        inputCodigoPostal.value = inputCodigoPostal.value.replace(/\D/g, '');
    });

    /**
     * Convierte una fecha a texto AAAA-MM-DD usando la zona horaria local.
     *
     * @param {Date} fecha
     * @returns {string}
     */
    function fechaLocalISO(fecha) {
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${fecha.getFullYear()}-${mes}-${dia}`;
    }

    /**
     * Muestra un mensaje de éxito o error en el contenedor indicado.
     *
     * @param {HTMLElement} contenedor - Elemento .alert donde se escribe el mensaje.
     * @param {string} texto - Mensaje para el usuario.
     * @param {boolean} [esExito=false] - true para el estilo verde de éxito.
     */
    function mostrarMensaje(contenedor, texto, esExito = false) {
        contenedor.textContent = texto;
        contenedor.className = esExito ? 'alert alert--success' : 'alert alert--error';
        contenedor.hidden = false;
    }

    /**
     * Oculta y limpia un contenedor de mensaje.
     *
     * @param {HTMLElement} contenedor
     */
    function ocultarMensaje(contenedor) {
        contenedor.hidden = true;
        contenedor.textContent = '';
    }

    /**
     * Envía un POST con JSON y devuelve el cuerpo de la respuesta (aunque sea un error 4xx).
     *
     * @async
     * @param {string} url - Ruta del backend.
     * @param {Object} cuerpo - Datos a enviar.
     * @returns {Promise<Object>} Respuesta del servidor ({ok, mensaje, ...}).
     */
    async function enviarJson(url, cuerpo) {
        const respuesta = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cuerpo)
        });
        try {
            return await respuesta.json();
        } catch (error) {
            return { ok: false, mensaje: 'Respuesta inesperada del servidor.' };
        }
    }

    /**
     * Llena las listas de Régimen fiscal y Uso de CFDI con los catálogos del servidor.
     *
     * @async
     */
    async function cargarCatalogos() {
        try {
            const respuesta = await fetch(API_CATALOGOS);
            const catalogos = await respuesta.json();
            llenarSelect(selectRegimen, catalogos.regimenesFiscales);
            llenarSelect(selectUsoCfdi, catalogos.usosCfdi);
        } catch (error) {
            mostrarMensaje(mensajePaso1, 'No se pudieron cargar las listas de datos fiscales. Recarga la página.');
        }
    }

    /**
     * Agrega al <select> una opción por cada elemento del catálogo ("clave - descripción").
     *
     * @param {HTMLSelectElement} select
     * @param {Array<{clave: string, descripcion: string}>} elementos
     */
    function llenarSelect(select, elementos) {
        elementos.forEach((elemento) => {
            const opcion = document.createElement('option');
            opcion.value = elemento.clave;
            opcion.textContent = `${elemento.clave} - ${elemento.descripcion}`;
            select.appendChild(opcion);
        });
    }

    /**
     * PASO 1: valida la compra. Muestra un indicador de carga de 3 a 5 segundos y, si el servidor
     * confirma la venta, habilita el Paso 2. Si falla, el Paso 2 permanece deshabilitado.
     *
     * @async
     * @param {Event} evento
     */
    async function validarPaso1(evento) {
        evento.preventDefault();
        if (pasoUnoValidado) return;
        ocultarMensaje(mensajePaso1);
        resumenVenta.hidden = true;

        const cuerpo = {
            folioFacturacion: inputFolioFacturacion.value.trim(),
            fechaCompra: inputFechaCompra.value,
            folioVenta: inputFolioVenta.value.trim()
        };

        if (!cuerpo.folioFacturacion || !cuerpo.fechaCompra || !cuerpo.folioVenta) {
            mostrarMensaje(mensajePaso1, 'Captura el folio de facturación, la fecha de compra y el folio de venta.');
            return;
        }

        btnValidar.disabled = true;
        cargando.hidden = false;

        const espera = new Promise((resolver) => {
            setTimeout(resolver, ESPERA_MIN_MS + Math.random() * (ESPERA_MAX_MS - ESPERA_MIN_MS));
        });

        try {
            const [respuesta] = await Promise.all([enviarJson(API_VALIDAR, cuerpo), espera]);

            if (respuesta.ok) {
                pasoUnoValidado = true;
                mostrarMensaje(mensajePaso1, respuesta.mensaje, true);
                mostrarResumen(respuesta.venta);
                bloquearPaso1(true);
                paso2.disabled = false;
                actualizarBotonObtener();
            } else {
                mostrarMensaje(mensajePaso1, respuesta.mensaje || 'No fue posible validar la compra.');
                btnValidar.disabled = false;
            }
        } catch (error) {
            mostrarMensaje(mensajePaso1, 'No se pudo conectar con el servidor. Intenta de nuevo.');
            btnValidar.disabled = false;
        } finally {
            cargando.hidden = true;
        }
    }

    /**
     * Muestra los datos básicos de la venta validada.
     *
     * @param {{folioVenta: string, fechaCompra: string, total: number}} venta
     */
    function mostrarResumen(venta) {
        const [anio, mes, dia] = venta.fechaCompra.split('-');
        document.getElementById('resFolioVenta').textContent = venta.folioVenta;
        document.getElementById('resFecha').textContent = `${dia}/${mes}/${anio}`;
        document.getElementById('resTotal').textContent = venta.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
        resumenVenta.hidden = false;
    }

    /**
     * Bloquea (o libera) los campos del Paso 1 para que, tras validar, no puedan cambiarse.
     *
     * @param {boolean} bloquear
     */
    function bloquearPaso1(bloquear) {
        [inputFolioFacturacion, inputFechaCompra, inputFolioVenta].forEach((campo) => {
            campo.readOnly = bloquear;
        });
        btnValidar.disabled = bloquear;
    }

    /**
     * Habilita los campos de correo solo si la casilla está marcada; si no, los vacía y deshabilita.
     */
    function alternarCamposCorreo() {
        const activo = chkCorreo.checked;
        inputCorreo.disabled = !activo;
        inputCorreoConfirmar.disabled = !activo;
        if (!activo) {
            inputCorreo.value = '';
            inputCorreoConfirmar.value = '';
        }
    }

    /**
     * "Obtener factura" solo se habilita con el Paso 1 validado, el aviso aceptado y sin solicitud previa.
     */
    function actualizarBotonObtener() {
        btnObtener.disabled = !(pasoUnoValidado && chkAviso.checked && !solicitudFinalizada);
    }

    /**
     * Revisa los datos del Paso 2 en el navegador (el servidor los vuelve a validar).
     *
     * @returns {string|null} Mensaje del primer error encontrado, o null si todo es válido.
     */
    function validarPaso2() {
        const rfc = inputRfc.value.trim().toUpperCase();
        if (!/^[A-ZÑ&]{3,4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/.test(rfc)) return 'El RFC no tiene un formato válido.';
        if (!/^\d{5}$/.test(inputCodigoPostal.value.trim())) return 'El código postal debe tener 5 dígitos.';
        if (!inputNombre.value.trim()) return 'Captura el nombre o razón social.';
        if (!selectRegimen.value) return 'Selecciona un régimen fiscal.';
        if (!selectUsoCfdi.value) return 'Selecciona el uso de CFDI.';
        if (chkCorreo.checked) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputCorreo.value.trim())) return 'El correo electrónico no tiene un formato válido.';
            if (inputCorreo.value.trim() !== inputCorreoConfirmar.value.trim()) return 'El correo y su confirmación no coinciden.';
        }
        if (!chkAviso.checked) return 'Debes aceptar el Aviso de Privacidad para continuar.';
        return null;
    }

    /**
     * PASO 2: valida los datos y registra la solicitud de facturación en el servidor.
     *
     * @async
     * @param {Event} evento
     */
    async function obtenerFactura(evento) {
        evento.preventDefault();
        if (!pasoUnoValidado || solicitudFinalizada) return;
        ocultarMensaje(mensajePaso2);

        const error = validarPaso2();
        if (error) {
            mostrarMensaje(mensajePaso2, error);
            return;
        }

        solicitudFinalizada = true;
        actualizarBotonObtener();
        btnObtener.textContent = 'Procesando...';

        try {
            const respuesta = await enviarJson(API_SOLICITAR, {
                folioFacturacion: inputFolioFacturacion.value.trim(),
                folioVenta: inputFolioVenta.value.trim(),
                fechaCompra: inputFechaCompra.value,
                rfc: inputRfc.value.trim(),
                codigoPostal: inputCodigoPostal.value.trim(),
                nombreRazonSocial: inputNombre.value.trim(),
                regimenFiscal: selectRegimen.value,
                usoCfdi: selectUsoCfdi.value,
                recibirPorCorreo: chkCorreo.checked,
                correo: inputCorreo.value.trim(),
                confirmarCorreo: inputCorreoConfirmar.value.trim(),
                aceptaAviso: chkAviso.checked
            });

            if (respuesta.ok) {
                paso2.disabled = true;
                document.getElementById('resultadoMensaje').textContent = respuesta.mensaje;
                document.getElementById('resultadoDetalle').textContent = respuesta.detalle;
                document.getElementById('resFolioFacturacion').textContent = respuesta.folioFacturacion;
                document.getElementById('resFolioFactura').textContent = respuesta.folioFactura;
                resultado.hidden = false;
            } else {
                solicitudFinalizada = false;
                mostrarMensaje(mensajePaso2, respuesta.mensaje || 'No fue posible registrar la solicitud.');
            }
        } catch (errorRed) {
            solicitudFinalizada = false;
            mostrarMensaje(mensajePaso2, 'No se pudo conectar con el servidor. Intenta de nuevo.');
        } finally {
            btnObtener.textContent = 'Obtener factura';
            actualizarBotonObtener();
        }
    }

    /**
     * "Facturar otro ticket": limpia ambos pasos, deshabilita el Paso 2 y vuelve a empezar.
     */
    function facturarOtroTicket() {
        formPaso1.reset();
        formPaso2.reset();
        pasoUnoValidado = false;
        solicitudFinalizada = false;
        bloquearPaso1(false);
        paso2.disabled = true;
        alternarCamposCorreo();
        ocultarMensaje(mensajePaso1);
        ocultarMensaje(mensajePaso2);
        resumenVenta.hidden = true;
        resultado.hidden = true;
        cargando.hidden = true;
        actualizarBotonObtener();
        inputFolioFacturacion.focus();
    }
});