const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'frontend')));

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Frontend corriendo en el puerto ${PORT}`);
    console.log(`Accede en este equipo: http://localhost:${PORT}/Login_Nuevo.html`);
    console.log(`Accede desde otro equipo usando tu IP local o de internet en el puerto ${PORT}`);
});

server.on('error', (e) => {
    console.error('Server error:', e);
});
