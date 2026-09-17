// punto de entrada principal que arranca el servidor HTTP
const app = require('./src/app'); 
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));