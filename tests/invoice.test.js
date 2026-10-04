/**
 * @file invoice.test.js
 * @description Pruebas de las reglas de la facturación simulada (no requieren base de datos).
 * Ejecutar con: node --test tests/invoice.test.js
 * @author Citlaly Morales Viveros (Cliente / Programadora XP)
 */
const test = require('node:test');
const assert = require('node:assert');
const {
    folioVentaDe,
    validarEntradaPaso1,
    evaluarVenta,
    validarDatosFiscales
} = require('../src/utils/invoiceValidator.js');

/** Venta de ejemplo que cumple todas las reglas. */
const ventaBase = () => ({
    id: 7, folio: 'VTA-2026-00007', anio: 2026, total: 116,
    fecha_dia: '2026-10-01', dias_antiguedad: 2, estado_facturacion: 'sin_facturar'
});
const entradaBase = { folioVenta: 'VTA-2026-00007', fechaCompra: '2026-10-01' };

/** Datos fiscales de ejemplo válidos. */
const fiscalBase = () => ({
    rfc: 'xaxx010101000', codigoPostal: '91000', nombreRazonSocial: 'Cliente de Prueba',
    regimenFiscal: '612', usoCfdi: 'G03', recibirPorCorreo: false, aceptaAviso: true
});

test('evaluarVenta: acepta una venta válida', () => {
    assert.deepStrictEqual(evaluarVenta(ventaBase(), entradaBase), { ok: true });
});

test('evaluarVenta: cada regla devuelve su mensaje específico', () => {
    assert.match(evaluarVenta(null, entradaBase).mensaje, /no existe/);
    assert.match(evaluarVenta(ventaBase(), { ...entradaBase, folioVenta: 'VTA-2026-00099' }).mensaje, /folio de venta no corresponde/);
    assert.match(evaluarVenta(ventaBase(), { ...entradaBase, fechaCompra: '2026-09-30' }).mensaje, /fecha de compra no corresponde/);
    assert.match(evaluarVenta({ ...ventaBase(), dias_antiguedad: 31 }, entradaBase).mensaje, /más de 30 días/);
    assert.match(evaluarVenta({ ...ventaBase(), estado_facturacion: 'solicitada' }, entradaBase).mensaje, /ya fue facturada/);
});

test('evaluarVenta: 30 días exactos todavía se puede facturar', () => {
    assert.strictEqual(evaluarVenta({ ...ventaBase(), dias_antiguedad: 30 }, entradaBase).ok, true);
});

test('folioVentaDe: reconstruye el folio de ventas antiguas sin folio', () => {
    assert.strictEqual(folioVentaDe({ id: 12, folio: null, anio: 2026 }), 'VTA-2026-00012');
});

test('validarEntradaPaso1: normaliza y exige los tres campos', () => {
    const r = validarEntradaPaso1({ folioFacturacion: ' 0b3a-598d-2026 ', folioVenta: 'vta-2026-00007', fechaCompra: '2026-10-01' });
    assert.deepStrictEqual(r.datos, { folioFacturacion: '0B3A-598D-2026', folioVenta: 'VTA-2026-00007', fechaCompra: '2026-10-01' });
    assert.strictEqual(validarEntradaPaso1({}).ok, false);
});

test('validarDatosFiscales: acepta datos válidos y normaliza el RFC', () => {
    const r = validarDatosFiscales(fiscalBase());
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.datos.rfc, 'XAXX010101000');
    assert.strictEqual(r.datos.correo, null);
});

test('validarDatosFiscales: rechaza datos incompletos o inválidos', () => {
    assert.strictEqual(validarDatosFiscales({ ...fiscalBase(), rfc: 'ABC123' }).ok, false);
    assert.strictEqual(validarDatosFiscales({ ...fiscalBase(), codigoPostal: '9100' }).ok, false);
    assert.strictEqual(validarDatosFiscales({ ...fiscalBase(), nombreRazonSocial: '  ' }).ok, false);
    assert.strictEqual(validarDatosFiscales({ ...fiscalBase(), regimenFiscal: '999' }).ok, false);
    assert.strictEqual(validarDatosFiscales({ ...fiscalBase(), usoCfdi: '' }).ok, false);
    assert.strictEqual(validarDatosFiscales({ ...fiscalBase(), aceptaAviso: false }).ok, false);
});

test('validarDatosFiscales: el correo solo se valida si se pidió el envío', () => {
    assert.strictEqual(validarDatosFiscales({ ...fiscalBase(), correo: 'mal' }).ok, true);
    const pedido = { ...fiscalBase(), recibirPorCorreo: true };
    assert.strictEqual(validarDatosFiscales({ ...pedido, correo: 'mal', confirmarCorreo: 'mal' }).ok, false);
    assert.match(validarDatosFiscales({ ...pedido, correo: 'a@b.com', confirmarCorreo: 'a@b.mx' }).mensaje, /no coinciden/);
    assert.strictEqual(validarDatosFiscales({ ...pedido, correo: 'a@b.com', confirmarCorreo: 'a@b.com' }).datos.correo, 'a@b.com');
});