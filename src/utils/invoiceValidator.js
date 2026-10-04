/**
 * @file invoiceValidator.js
 * @description Reglas de validación del módulo de facturación SIMULADA (proyecto académico).
 * Son funciones puras (no usan base de datos) para poder probarlas de forma aislada.
 * IMPORTANTE: no hay conexión con el SAT ni timbrado CFDI real.
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */

/** Antigüedad máxima (en días) que puede tener una compra para poder facturarse. */
const DIAS_MAXIMOS_FACTURACION = 30;

/**
 * Catálogo de regímenes fiscales (clave y descripción) que se muestra en la lista desplegable.
 * @type {Array<{clave: string, descripcion: string}>}
 */
const REGIMENES_FISCALES = [
    { clave: '601', descripcion: 'General de Ley Personas Morales' },
    { clave: '603', descripcion: 'Personas Morales con Fines no Lucrativos' },
    { clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
    { clave: '606', descripcion: 'Arrendamiento' },
    { clave: '607', descripcion: 'Régimen de Enajenación o Adquisición de Bienes' },
    { clave: '608', descripcion: 'Demás ingresos' },
    { clave: '610', descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
    { clave: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)' },
    { clave: '612', descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales' },
    { clave: '614', descripcion: 'Ingresos por intereses' },
    { clave: '615', descripcion: 'Régimen de los ingresos por obtención de premios' },
    { clave: '616', descripcion: 'Sin obligaciones fiscales' },
    { clave: '620', descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
    { clave: '621', descripcion: 'Incorporación Fiscal' },
    { clave: '622', descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
    { clave: '623', descripcion: 'Opcional para Grupos de Sociedades' },
    { clave: '624', descripcion: 'Coordinados' },
    { clave: '625', descripcion: 'Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
    { clave: '626', descripcion: 'Régimen Simplificado de Confianza' }
];

/**
 * Catálogo de usos de CFDI (clave y descripción) que se muestra en la lista desplegable.
 * @type {Array<{clave: string, descripcion: string}>}
 */
const USOS_CFDI = [
    { clave: 'G01', descripcion: 'Adquisición de mercancías' },
    { clave: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones' },
    { clave: 'G03', descripcion: 'Gastos en general' },
    { clave: 'I01', descripcion: 'Construcciones' },
    { clave: 'I02', descripcion: 'Mobiliario y equipo de oficina por inversiones' },
    { clave: 'I03', descripcion: 'Equipo de transporte' },
    { clave: 'I04', descripcion: 'Equipo de cómputo y accesorios' },
    { clave: 'I05', descripcion: 'Dados, troqueles, moldes, matrices y herramental' },
    { clave: 'I06', descripcion: 'Comunicaciones telefónicas' },
    { clave: 'I07', descripcion: 'Comunicaciones satelitales' },
    { clave: 'I08', descripcion: 'Otra maquinaria y equipo' },
    { clave: 'D01', descripcion: 'Honorarios médicos, dentales y gastos hospitalarios' },
    { clave: 'D02', descripcion: 'Gastos médicos por incapacidad o discapacidad' },
    { clave: 'D03', descripcion: 'Gastos funerales' },
    { clave: 'D04', descripcion: 'Donativos' },
    { clave: 'D05', descripcion: 'Intereses reales por créditos hipotecarios (casa habitación)' },
    { clave: 'D06', descripcion: 'Aportaciones voluntarias al SAR' },
    { clave: 'D07', descripcion: 'Primas por seguros de gastos médicos' },
    { clave: 'D08', descripcion: 'Gastos de transportación escolar obligatoria' },
    { clave: 'D09', descripcion: 'Depósitos en cuentas para el ahorro y planes de pensiones' },
    { clave: 'D10', descripcion: 'Pagos por servicios educativos (colegiaturas)' },
    { clave: 'S01', descripcion: 'Sin efectos fiscales' }
];

/** RFC de persona moral (12 caracteres) o física (13): letras, fecha AAMMDD válida y homoclave. */
const REGEX_RFC = /^[A-ZÑ&]{3,4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;
/** Código postal de exactamente 5 dígitos. */
const REGEX_CODIGO_POSTAL = /^\d{5}$/;
/** Formato básico de correo electrónico. */
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Fecha en formato AAAA-MM-DD (el que entrega el campo de fecha del navegador). */
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convierte cualquier valor en texto sin espacios al inicio ni al final.
 *
 * @param {*} valor - Valor recibido del cliente.
 * @returns {string} Texto limpio ('' si el valor es nulo o indefinido).
 */
const limpiar = (valor) => String(valor ?? '').trim();

/**
 * Arma el folio de venta de una venta. Las ventas anteriores al módulo pueden tener la columna
 * `folio` en NULL, por lo que se reconstruye con el año de la compra y el id (VTA-AAAA-00001).
 *
 * @param {{id: number, folio: ?string, anio: number}} venta - Fila de la venta.
 * @returns {string} Folio de venta en mayúsculas.
 */
const folioVentaDe = (venta) => {
    if (venta.folio) return String(venta.folio).toUpperCase();
    return `VTA-${venta.anio}-${String(venta.id).padStart(5, '0')}`;
};

/**
 * Valida y normaliza los datos del Paso 1 (validación de la compra).
 *
 * @param {Object} cuerpo - Cuerpo de la petición.
 * @returns {{ok: boolean, mensaje?: string, datos?: {folioFacturacion: string, folioVenta: string, fechaCompra: string}}}
 */
const validarEntradaPaso1 = (cuerpo = {}) => {
    const folioFacturacion = limpiar(cuerpo.folioFacturacion).toUpperCase();
    const folioVenta = limpiar(cuerpo.folioVenta).toUpperCase();
    const fechaCompra = limpiar(cuerpo.fechaCompra);

    if (!folioFacturacion) return { ok: false, mensaje: 'Captura el folio de facturación.' };
    if (!fechaCompra) return { ok: false, mensaje: 'Captura la fecha de compra.' };
    if (!REGEX_FECHA.test(fechaCompra)) return { ok: false, mensaje: 'La fecha de compra no tiene un formato válido.' };
    if (!folioVenta) return { ok: false, mensaje: 'Captura el folio de venta (ticket).' };

    return { ok: true, datos: { folioFacturacion, folioVenta, fechaCompra } };
};

/**
 * Aplica, en orden, las reglas de negocio sobre la venta encontrada. No modifica nada.
 *
 * @param {?Object} venta - Fila de la venta (o null si el folio de facturación no existe).
 * @param {{folioVenta: string, fechaCompra: string}} entrada - Datos capturados por el cliente.
 * @returns {{ok: boolean, mensaje?: string}} Resultado con el motivo específico si falla.
 */
const evaluarVenta = (venta, entrada) => {
    if (!venta) {
        return { ok: false, mensaje: 'El folio de facturación no existe.' };
    }
    if (entrada.folioVenta !== folioVentaDe(venta)) {
        return { ok: false, mensaje: 'El folio de venta no corresponde con el folio de facturación.' };
    }
    if (entrada.fechaCompra !== venta.fecha_dia) {
        return { ok: false, mensaje: 'La fecha de compra no corresponde con la venta.' };
    }
    if (Number(venta.dias_antiguedad) > DIAS_MAXIMOS_FACTURACION) {
        return { ok: false, mensaje: `Esta compra tiene más de ${DIAS_MAXIMOS_FACTURACION} días y ya no puede ser facturada.` };
    }
    if (venta.estado_facturacion !== 'sin_facturar') {
        return { ok: false, mensaje: 'Esta venta ya fue facturada anteriormente.' };
    }
    return { ok: true };
};

/**
 * Valida y normaliza los datos fiscales del Paso 2, el correo opcional y el aviso de privacidad.
 *
 * @param {Object} cuerpo - Cuerpo de la petición.
 * @returns {{ok: boolean, mensaje?: string, datos?: Object}} Datos limpios si todo es válido.
 */
const validarDatosFiscales = (cuerpo = {}) => {
    const rfc = limpiar(cuerpo.rfc).replace(/\s+/g, '').toUpperCase();
    const codigoPostal = limpiar(cuerpo.codigoPostal);
    const nombreRazonSocial = limpiar(cuerpo.nombreRazonSocial);
    const regimenFiscal = limpiar(cuerpo.regimenFiscal);
    const usoCfdi = limpiar(cuerpo.usoCfdi);
    const recibirPorCorreo = cuerpo.recibirPorCorreo === true;
    const correo = limpiar(cuerpo.correo);
    const confirmarCorreo = limpiar(cuerpo.confirmarCorreo);

    if (!rfc) return { ok: false, mensaje: 'Captura el RFC.' };
    if (!REGEX_RFC.test(rfc)) return { ok: false, mensaje: 'El RFC no tiene un formato válido.' };
    if (!REGEX_CODIGO_POSTAL.test(codigoPostal)) return { ok: false, mensaje: 'El código postal debe tener 5 dígitos.' };
    if (!nombreRazonSocial) return { ok: false, mensaje: 'Captura el nombre o razón social.' };
    if (nombreRazonSocial.length > 150) return { ok: false, mensaje: 'El nombre o razón social es demasiado largo (máximo 150 caracteres).' };
    if (!REGIMENES_FISCALES.some((r) => r.clave === regimenFiscal)) return { ok: false, mensaje: 'Selecciona un régimen fiscal.' };
    if (!USOS_CFDI.some((u) => u.clave === usoCfdi)) return { ok: false, mensaje: 'Selecciona el uso de CFDI.' };

    if (recibirPorCorreo) {
        if (!REGEX_CORREO.test(correo) || correo.length > 120) return { ok: false, mensaje: 'El correo electrónico no tiene un formato válido.' };
        if (correo !== confirmarCorreo) return { ok: false, mensaje: 'El correo y su confirmación no coinciden.' };
    }

    if (cuerpo.aceptaAviso !== true) {
        return { ok: false, mensaje: 'Debes aceptar el Aviso de Privacidad para continuar.' };
    }

    return {
        ok: true,
        datos: {
            rfc,
            codigoPostal,
            nombreRazonSocial,
            regimenFiscal,
            usoCfdi,
            recibirPorCorreo,
            correo: recibirPorCorreo ? correo : null
        }
    };
};

module.exports = {
    DIAS_MAXIMOS_FACTURACION,
    REGIMENES_FISCALES,
    USOS_CFDI,
    folioVentaDe,
    validarEntradaPaso1,
    evaluarVenta,
    validarDatosFiscales
};