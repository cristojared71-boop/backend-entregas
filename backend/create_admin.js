const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const mongoURI = 'mongodb://127.0.0.1:27017/sistema_entregas';

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('Conectado a MongoDB...');

        const matricula = 'admin';
        const passwordPlain = '123456';
        const rol = 'admin';

        try {
            const existingUser = await User.findOne({ matricula });
            if (existingUser) {
                console.log(`El usuario "${matricula}" ya existe.`);
                process.exit(0);
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(passwordPlain, salt);

            const newUser = new User({
                matricula,
                passwordHash,
                rol
            });

            await newUser.save();
            console.log(`Usuario "${matricula}" creado exitosamente.`);
            console.log(`Contraseña: ${passwordPlain}`);
            process.exit(0);

        } catch (error) {
            console.error('Error creando usuario:', error);
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Error de conexión:', err);
        process.exit(1);
    });
