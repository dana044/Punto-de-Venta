// Punto de entrada principal que arranca el servidor HTTP
const app = require('./src/app');
const db = require('./src/config/db');

/**
 * Importación del servicio de copias de seguridad automáticas.
 * Se requiere al inicio del archivo principal para garantizar su disponibilidad.
 */
const { iniciarRespaldosAutomaticos, generarRespaldo } = require('./src/services/backup.service');

const PORT = process.env.PORT || 3000;

// Probamos la conexión a MySQL antes de levantar el servidor.
// Si la base de datos no responde, es mejor enterarnos aquí y no
// hasta que alguien intente hacer una venta.
db.query('SELECT 1')
    .then(() => {
        console.log('Conectado a MySQL');

        /**
         * Inicializa el servidor HTTP y levanta los servicios programados en segundo plano.
         * @listens {PORT} Escucha las peticiones entrantes en el puerto configurado.
         */
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);

            /**
             * Activa el cron job de respaldos en cuanto el servidor inicie.
             * Esto asegura que la tarea de volcado de la base de datos quede programada
             * permanentemente mientras la aplicación esté en funcionamiento.
             */
            iniciarRespaldosAutomaticos();            
        });
    })
    .catch((err) => {
        console.error('No se pudo conectar a MySQL:', err.message);
        process.exit(1);
    });