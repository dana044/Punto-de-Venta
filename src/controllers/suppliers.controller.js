/**
 * @file suppliers.controller.js
 * @description Controlador para la gestión de proveedores (Adaptado a 3FN).
 *              Validación y normalización de múltiples teléfonos, correos y desglose de dirección.
 * @author Alfonso Mendoza Vásquez (Doomsayer / Programador XP)
 * @author Citlaly Morales Viveros (Cliente / Programador XP)
 */

const SupplierModel = require('../models/supplier.model');

const TIPOS_TELEFONO = ['oficina', 'celular', 'whatsapp', 'otro'];
const MAX_CONTACTOS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_REGEX = /^\d{7,15}$/;

/**
 * Valida y normaliza los medios de contacto recibidos.
 *
 * @function normalizarContactos
 */
const normalizarContactos = ({ telefono, email, telefonos, correos }) => {
    let listaTelefonos;
    if (Array.isArray(telefonos)) listaTelefonos = telefonos;
    else if (telefono) listaTelefonos = [telefono];

    let listaCorreos;
    if (Array.isArray(correos)) listaCorreos = correos;
    else if (email) listaCorreos = [email];

    const resultado = {};

    if (listaTelefonos) {
        const vistos = new Set();
        resultado.telefonos = [];

        for (const item of listaTelefonos) {
            const esObjeto = item !== null && typeof item === 'object';
            const numero = String((esObjeto ? item.telefono : item) ?? '').trim();
            if (!numero) continue;

            if (!TELEFONO_REGEX.test(numero)) {
                return { error: `El teléfono "${numero}" no es válido. Usa solo dígitos (de 7 a 15).` };
            }
            if (vistos.has(numero)) {
                return { error: `El teléfono ${numero} está repetido.` };
            }
            vistos.add(numero);

            const tipo = esObjeto && TIPOS_TELEFONO.includes(item.tipo) ? item.tipo : 'oficina';
            resultado.telefonos.push({ telefono: numero, tipo });
        }

        if (resultado.telefonos.length > MAX_CONTACTOS) {
            return { error: `Solo se permiten hasta ${MAX_CONTACTOS} teléfonos por distribuidor.` };
        }
    }

    if (listaCorreos) {
        const vistos = new Set();
        resultado.correos = [];

        for (const item of listaCorreos) {
            const correo = String((typeof item === 'string' ? item : item?.correo) ?? '').trim().toLowerCase();
            if (!correo) continue;

            if (correo.length > 100 || !EMAIL_REGEX.test(correo)) {
                return { error: `El correo "${correo}" no es válido.` };
            }
            if (vistos.has(correo)) {
                return { error: `El correo ${correo} está repetido.` };
            }
            vistos.add(correo);
            resultado.correos.push(correo);
        }

        if (resultado.correos.length > MAX_CONTACTOS) {
            return { error: `Solo se permiten hasta ${MAX_CONTACTOS} correos por distribuidor.` };
        }
    }

    return resultado;
};

/**
 * Procesa la solicitud para registrar un nuevo proveedor, aceptando direcciones segmentadas (3FN).
 *
 * @async
 * @function createSupplier
 */
const createSupplier = async (req, res) => {
    try {
        // Se soportan los campos de 3FN y el campo legado (direccion) para retrocompatibilidad
        const { nombre, direccion, calle, colonia, ciudad, estado, codigo_postal, telefono, email, telefonos, correos } = req.body;

        if (!nombre) {
            return res.status(400).json({ success: false, message: 'El nombre y el correo electrónico son obligatorios.' });
        }

        const contactos = normalizarContactos({ telefono, email, telefonos, correos });
        if (contactos.error) {
            return res.status(400).json({ success: false, message: contactos.error });
        }

        if (!contactos.correos || contactos.correos.length === 0) {
            return res.status(400).json({ success: false, message: 'El nombre y el correo electrónico son obligatorios.' });
        }

        if (nombre.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'El nombre debe tener al menos 3 caracteres.' });
        }

        // Retrocompatibilidad: Si viene 'direccion', se asigna a 'calle' para no perder datos de formularios antiguos
        const calleFinal = calle || direccion || null;

        const nuevoId = await SupplierModel.create({
            nombre: nombre.trim(),
            calle: calleFinal ? calleFinal.trim() : null,
            colonia: colonia ? colonia.trim() : null,
            ciudad: ciudad ? ciudad.trim() : null,
            estado: estado ? estado.trim() : null,
            codigo_postal: codigo_postal ? codigo_postal.trim() : null,
            telefonos: contactos.telefonos || [],
            correos: contactos.correos
        });

        return res.status(201).json({
            success: true,
            message: `Distribuidor registrado con éxito con el ID #${nuevoId}.`,
            data: {
                id: nuevoId,
                nombre,
                email: contactos.correos[0],
                telefonos: contactos.telefonos || [],
                correos: contactos.correos
            }
        });

    } catch (error) {
        console.error('[Error Log - ERROR EN ALTA]:', error);
        const status = error.statusCode || 500;
        return res.status(status).json({ success: false, message: error.message || 'Error interno al procesar el alta.' });
    }
};

/**
 * Consulta y devuelve todos los proveedores activos.
 *
 * @async
 * @function getSuppliers
 */
const getSuppliers = async (req, res) => {
    try {
        const proveedores = await SupplierModel.getAllActive();
        return res.status(200).json({ success: true, data: proveedores });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al consultar proveedores.' });
    }
};

/**
 * Procesa la solicitud para actualizar un proveedor.
 *
 * @async
 * @function updateSupplier
 */
const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, direccion, calle, colonia, ciudad, estado, codigo_postal, telefono, email, telefonos, correos } = req.body;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID de proveedor inválido.' });
        }

        const contactos = normalizarContactos({ telefono, email, telefonos, correos });
        if (contactos.error) {
            return res.status(400).json({ success: false, message: contactos.error });
        }

        if (contactos.correos && contactos.correos.length === 0) {
            return res.status(400).json({ success: false, message: 'El distribuidor debe conservar al menos un correo electrónico.' });
        }

        const calleFinal = calle || direccion || null;

        const success = await SupplierModel.update(id, {
            nombre,
            calle: calleFinal,
            colonia,
            ciudad,
            estado,
            codigo_postal,
            telefonos: contactos.telefonos,
            correos: contactos.correos
        });

        if (!success) {
            return res.status(404).json({ success: false, message: 'Proveedor no encontrado.' });
        }

        return res.status(200).json({ success: true, message: 'Datos del proveedor actualizados.' });
    } catch (error) {
        console.error('[Error Log - ERROR EN EDICIÓN]:', error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: 'Error interno al actualizar.' });
    }
};

/**
 * Procesa la solicitud para dar de baja lógica a un proveedor.
 *
 * @async
 * @function deactivateSupplier
 */
const deactivateSupplier = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID de proveedor inválido.' });
        }

        const success = await SupplierModel.deactivate(id);

        if (!success) {
            return res.status(404).json({ success: false, message: 'Proveedor no encontrado o ya inactivo.' });
        }

        return res.status(200).json({ success: true, message: 'Proveedor dado de baja exitosamente.' });
    } catch (error) {
        console.error('[Error Log - ERROR EN BAJA]:', error);
        return res.status(500).json({ success: false, message: 'Error interno al dar de baja.' });
    }
};

/**
 * Endpoint para reactivar un proveedor dado de baja lógica.
 * 
 * @async
 * @function reactivateSupplier
 */
const reactivateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        await SupplierModel.reactivateSupplier(id);
        return res.status(200).json({
            success: true,
            message: 'Proveedor reactivado con éxito.'
        });
    } catch (error) {
        console.error('[Error Log - ERROR EN REACTIVACIÓN DE PROVEEDOR]:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al intentar reactivar al proveedor.'
        });
    }
};

module.exports = {
    createSupplier,
    getSuppliers,
    updateSupplier,
    deactivateSupplier,
    reactivateSupplier
};