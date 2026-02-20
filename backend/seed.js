const mongoose = require('mongoose');
const Delivery = require('./models/Delivery');

// Usar 127.0.0.1 evita problemas de resolución con 'localhost' en Node moderno
const mongoURI = 'mongodb://127.0.0.1:27017/sistema_entregas';

console.log(`Intentando conectar a: ${mongoURI}`);

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('¡Conectado a MongoDB local exitosamente!');

        try {
            // Limpiar colección existente
            await Delivery.deleteMany({});
            console.log('Base de datos limpiada.');

            const entregas = [
                {
                    matricula: "A001",
                    materia: "Matematica Discreta",
                    tarea: "Ejercicios de Grafos",
                    fecha_entrega: new Date(),
                    archivo_url: "#",
                    estado: "ENVIADO"
                },
                {
                    matricula: "A002",
                    materia: "Programación Web",
                    tarea: "Proyecto Final Dashboard",
                    fecha_entrega: new Date(Date.now() - 86400000),
                    archivo_url: "#",
                    estado: "REVISADO"
                },
                {
                    matricula: "A001",
                    materia: "Base de Datos",
                    tarea: "Modelo ER",
                    fecha_entrega: new Date(Date.now() - 172800000),
                    archivo_url: "#",
                    estado: "APROBADO"
                },
                {
                    matricula: "A003",
                    materia: "Ingeniería de Software",
                    tarea: "Diagrama de Casos de Uso",
                    fecha_entrega: new Date(Date.now() + 86400000),
                    archivo_url: "#",
                    estado: "ENVIADO"
                }
            ];

            await Delivery.insertMany(entregas);
            console.log(`Se insertaron ${entregas.length} entregas de prueba.`);
            console.log('Proceso finalizado correctamente.');
            process.exit(0);

        } catch (error) {
            console.error('Error durante la inserción de datos:', error);
            process.exit(1);
        }
    })
    .catch((err) => {
        console.error('------- ERROR DE CONEXIÓN -------');
        console.error('No se pudo conectar a MongoDB. Asegúrate de que:');
        console.error('1. MongoDB está ejecutándose (abre Compass y conecta para verificar).');
        console.error('2. El puerto es 27017.');
        console.error('Detalles del error:', err);
        process.exit(1);
    });
