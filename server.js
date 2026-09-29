// punto de entrada principal que arranca el servidor HTTP
const app = require('./src/app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 3000;

// Probamos la conexión a MySQL antes de levantar el servidor.
// Si la base de datos no responde, es mejor enterarnos aquí y no
// hasta que alguien intente hacer una venta.
db.query('SELECT 1')
    .then(() => {
    console.log('Conectado a MySQL ');
    app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
    })
    .catch((err) => {
    console.error('No se pudo conectar a MySQL :', err.message);
    process.exit(1);
    });