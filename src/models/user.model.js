/**
 * Punto de Venta UV - Modelo de Usuario (En memoria).
 * Esto es un estructura temporal de usuarios para pruebas de autenticación y roles.
 */

/**
 * Arreglo temporal simulando la base de dat+  os de usuarios.
 * @type {Array<Object>}
 */
const users = [
  { id: 1, username: 'admin@uv.mx', password: 'password123', role: 'administrador' },
  { id: 2, username: 'caja01@uv.mx', password: 'password123', role: 'cajero' },
  { id: 3, username: 'almacen@uv.mx', password: 'password123', role: 'almacenista' }
];

/**
 * Busca un usuario en la base de datos temporal usando su nombre de usuario o correo.
 * @param {string} username - Correo o nombre de usuario capturado en el login.
 * @returns {Object|undefined} El objeto del usuario si existe, o undefined si no se encuentra.
 */
const findUserByUsername = (username) => {
  return users.find(user => user.username === username);
};

module.exports = {
  findUserByUsername
};