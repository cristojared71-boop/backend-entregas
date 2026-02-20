const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const Delivery = require('./models/Delivery');
const User = require('./models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ===============================
// RUTAS API
// ===============================

// Obtener todas las entregas
// Obtener todas las entregas (o filtrar por matrícula)
app.get('/api/entregas', async (req, res) => {
    try {
        const { matricula } = req.query;
        let query = {};

        if (matricula) {
            query.matricula = matricula;
        }

        const entregas = await Delivery.find(query).sort({ createdAt: -1 });
        res.json(entregas);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear una entrega (soporta archivo o JSON)
app.post('/api/entregas', upload.single('archivo'), async (req, res) => {
    try {
        console.log("📥 Recibiendo nueva entrega...");
        console.log("Body:", req.body);

        let deliveryData = { ...req.body };

        // Si hay un archivo, usamos su URL local
        if (req.file) {
            console.log("📄 Archivo recibido:", req.file.filename);
            const protocol = req.protocol;
            const host = req.get('host');
            deliveryData.archivo_url = `${protocol}://${host}/uploads/${req.file.filename}`;
        }

        const nuevaEntrega = new Delivery(deliveryData);
        const entregaGuardada = await nuevaEntrega.save();
        console.log("✅ Entrega guardada con éxito:", entregaGuardada._id);
        res.status(201).json(entregaGuardada);
    } catch (err) {
        console.error("❌ Error al guardar entrega:", err.message);
        res.status(400).json({ error: err.message });
    }
});

// Actualizar estado de una entrega
app.put('/api/entregas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const entregaActualizada = await Delivery.findByIdAndUpdate(
            id,
            { estado },
            { new: true }
        );

        if (!entregaActualizada) {
            return res.status(404).json({ error: "Entrega no encontrada" });
        }

        console.log(`✅ Entrega ${id} actualizada a estado: ${estado}`);
        res.json(entregaActualizada);
    } catch (err) {
        console.error("❌ Error al actualizar entrega:", err.message);
        res.status(400).json({ error: err.message });
    }
});

// Eliminar una entrega
app.delete('/api/entregas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const entregaEliminada = await Delivery.findByIdAndDelete(id);

        if (!entregaEliminada) {
            return res.status(404).json({ error: "Entrega no encontrada" });
        }

        console.log(`🗑️ Entrega eliminada: ${id}`);
        res.json({ message: "Entrega eliminada correctamente" });
    } catch (err) {
        console.error("❌ Error al eliminar entrega:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===============================
// AUTENTICACIÓN
// ===============================

// Registro
app.post('/api/register', async (req, res) => {
    try {
        const { matricula, password, rol } = req.body;

        const existingUser = await User.findOne({ matricula });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'La matrícula ya está registrada' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            matricula,
            passwordHash,
            rol: rol || 'alumno'
        });

        await newUser.save();

        res.status(201).json({ success: true, message: 'Usuario registrado exitosamente' });

    } catch (err) {
        console.error("Error en registro:", err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { matricula, password } = req.body;

        const user = await User.findOne({ matricula });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                matricula: user.matricula,
                rol: user.rol
            }
        });

    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API del Sistema de Entregas funcionando');
});

// Endpoint de salud para monitoreo
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// ===============================
// CONEXIÓN A MONGO Y ARRANQUE
// ===============================

const startServer = async () => {
    try {
        // CONEXIÓN A MONGODB ATLAS (Nube)
        const atlasUri = 'mongodb+srv://admin:Admin123*@cluster0.bumrdl9.mongodb.net/sistema_entregas?retryWrites=true&w=majority&appName=Cluster0'; await mongoose.connect(atlasUri, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ MongoDB Atlas conectado correctamente (Nube)');

        // Escuchar en el puerto que asigne el servidor (Render) o el 5000 por defecto
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Error FATAL al conectar a MongoDB:', err);
        process.exit(1);
    }
};

startServer();