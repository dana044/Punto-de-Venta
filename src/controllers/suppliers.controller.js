/**
 * @file suppliers.controller.js
 * @description Controlador para la gestión de proveedores: altas, listados, edición y baja lógica (HU-18, HU-19).
 * @author Alfonso Mendoza Vásquez (Doomsayer / Programador XP)
 */

const SupplierModel = require('../models/supplier.model');

/**
 * Procesa la solicitud para registrar un nuevo proveedor.
 *
 * @async
 * @function createSupplier
 * @param {import('express').Request} req - Petición HTTP con los datos del proveedor.
 * @param {import('express').Response} res - Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta JSON con código 201 y la entidad creada.
 */
const createSupplier = async (req, res) => {
    try {
        const { nombre, direccion, telefono, email } = req.body;

        // Filtro: Validación de entrada
        if (!nombre || !email) {
            return res.status(400).json({ success: false, message: 'El nombre y el correo electrónico son obligatorios.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Ingrese un correo electrónico válido.' });
        }

        if (nombre.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'El nombre debe tener al menos 3 caracteres.' });
        }

        const nuevoId = await SupplierModel.create({
            nombre: nombre.trim(),
            direccion: direccion ? direccion.trim() : null,
            telefono: telefono ? telefono.trim() : null,
            email: email.trim().toLowerCase()
        });

        return res.status(201).json({
            success: true,
            message: `Distribuidor registrado con éxito con el ID #${nuevoId}.`,
            data: { id: nuevoId, nombre, email }
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
        const { nombre, direccion, telefono, email } = req.body;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID de proveedor inválido.' });
        }

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ success: false, message: 'Correo electrónico inválido.' });
            }
        }

        const success = await SupplierModel.update(id, { nombre, direccion, telefono, email });
        
        if (!success) {
            return res.status(404).json({ success: false, message: 'Proveedor no encontrado.' });
        }

        return res.status(200).json({ success: true, message: 'Datos del proveedor actualizados.' });
    } catch (error) {
        console.error('[Error Log - ERROR EN EDICIÓN]:', error);
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
 * @param {import('express').Request} req - Objeto de petición Express conteniendo el parámetro `id`.
 * @param {import('express').Response} res - Objeto de respuesta HTTP de Express.
 * @returns {Promise<import('express').Response>} Respuesta JSON indicando el estado de la operación (200 o 500).
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