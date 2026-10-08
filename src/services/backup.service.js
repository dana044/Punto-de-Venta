/**
 * @file backup.service.js
 * @description Servicio para la generación automática de copias de seguridad de la base de datos MySQL.
 * Garantiza la disponibilidad y recuperación de la información mediante volcados periódicos.
 */

const { exec } = require('child_process');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

// Verifica y crea el directorio de almacenamiento si no existe
const backupDir = path.join(__dirname, '../../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Ejecuta un volcado completo de la base de datos mediante el comando nativo mysqldump.
 * Estructura un archivo .sql nombrado con una marca de tiempo ISO para evitar sobrescrituras.
 *
 * @function generarRespaldo
 * @returns {void} Proceso asíncrono delegado al sistema operativo; el resultado se notifica en consola.
 */
const generarRespaldo = () => {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');
  const archivoDestino = path.join(backupDir, `backup-${fecha}.sql`);

  //Si la ruta de su bin es diferente, modifíquela según corresponda. Asegúrese de que el usuario tenga permisos de lectura/escritura en la carpeta de destino.
  const comando = `"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump" -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > "${archivoDestino}"`;

  exec(comando, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al generar el respaldo de la base de datos: ${error.message}`);
      return;
    }
    if (stderr) {
      console.warn(`Advertencia durante el respaldo: ${stderr}`);
    }
    console.log(`Respaldo automático generado exitosamente en: ${archivoDestino}`);
  });
};

/**
 * Configura y activa una tarea programada (cron job) para ejecutar copias de seguridad 
 * de forma desatendida mientras la instancia del servidor permanezca en ejecución.
 *
 * @function iniciarRespaldosAutomaticos
 * @returns {void}
 */
const iniciarRespaldosAutomaticos = () => {
  // Formato cron: minuto hora día-del-mes mes día-de-la-semana
  cron.schedule('0 2 * * *', () => {
    console.log('Iniciando tarea programada: Respaldo de base de datos...');
    generarRespaldo();
  });
  
  console.log('Servicio de respaldos automáticos configurado (Ejecución diaria a las 02:00 AM).');
};

module.exports = {
  iniciarRespaldosAutomaticos,
  generarRespaldo
};