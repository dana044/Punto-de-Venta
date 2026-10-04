const Product = require('../models/product.model');

const crearProducto = async (data) => {
    // La capa de servicio recibe los datos (incluyendo area, pasillo, seccion) 
    // y los pasa al modelo para guardarlos en la base de datos.
    try {
        const nuevoProducto = await Product.create(data);
        return nuevoProducto;
    } catch (error) {
        throw new Error('Error al crear el producto: ' + error.message);
    }
};

const obtenerProductoPorId = async (id) => {
    try {
        const producto = await Product.findById(id);
        return producto;
    } catch (error) {
        throw new Error('Error al obtener el producto: ' + error.message);
    }
};

module.exports = {
    crearProducto,
    obtenerProductoPorId
};