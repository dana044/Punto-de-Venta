/**
 * Punto de Venta UV - Modelo de Usuario.
 * Esto es un estructura temporal de usuarios para pruebas de autenticación y roles.
 */

/**
 * Arreglo temporal simulando la base de datos de usuarios.
 * @type {Array<Object>}
 */
const users = [
  { id: 1, username: 'admin@uv.mx', password: 'password123', role: 'administrador' },
  { id: 2, username: 'caja01@uv.mx', password: 'password123', role: 'cajero' },
  { id: 3, username: 'almacen@uv.mx', password: 'password123', role: 'almacenista' }
];

/**
 * Contador para asignar un id incremental a cada usuario nuevo,
 * continuando después de los tres usuarios de prueba de arriba.
 * @type {number}
 */
let nextId = users.length + 1;

/**
 * Busca un usuario en la base de datos temporal usando su nombre de usuario o correo.
 * @param {string} username - Correo o nombre de usuario capturado en el login.
 * @returns {Object|undefined} El objeto del usuario si existe, o undefined si no se encuentra.
 */
const findUserByUsername = (username) => {
  return users.find(user => user.username === username);
};

/**
 * Crea un nuevo usuario/empleado y lo agrega al almacenamiento en memoria (HU10).
 * NOTA: la contraseña se guarda tal cual llega, igual que los usuarios de
 * prueba de arriba (sin cifrar). Cuando se conecte la base de datos real,
 * este es el lugar donde hay que aplicar bcrypt antes del "push".
 * @param {Object} datosUsuario
 * @param {string} datosUsuario.nombreCompleto - Nombre completo del empleado.
 * @param {string} datosUsuario.puesto - Puesto que ocupa en la tienda.
 * @param {string} datosUsuario.username - Usuario con el que iniciará sesión.
 * @param {string} datosUsuario.password - Contraseña asignada por el administrador.
 * @param {string} datosUsuario.role - Rol asignado: administrador, cajero o almacenista.
 * @returns {Object} El usuario creado, incluyendo su id.
 */
const createUser = ({ nombreCompleto, puesto, username, password, role }) => {
  const nuevoUsuario = {
    id: nextId++,
    nombreCompleto,
    puesto,
    username,
    password,
    role,
    activo: true
  };

  users.push(nuevoUsuario);
  return nuevoUsuario;
};

/**
 * Devuelve la lista completa de usuarios/empleados registrados.
 * @returns {Array<Object>}
 */
const getAllUsers = () => {
  return users;
};

module.exports = {
  findUserByUsername,
  createUser,
  getAllUsers
};