/*const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt'); // Para hashear contraseñas
const app = express();

app.use(express.json());

// Conexión a DB (Persistencia en archivo)
const db = new sqlite3.Database('./data/foro.db', (err) => {
    if (err) console.error("Error abriendo DB", err);
    console.log("Conectado a SQLite");
});

// Crear tablas iniciales
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

    db.run(`CREATE TABLE IF NOT EXISTS mensajes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        texto TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES usuarios(id)
    )`);
});

// --- RUTAS ---

// Registro (Ejemplo de lógica inicial)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    // TODO: Validar que no vengan vacíos
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = `INSERT INTO usuarios (username, password) VALUES (?, ?)`;
    db.run(sql, [username, hashedPassword], function(err) {
        if (err) return res.status(400).json({ error: "El usuario ya existe" });
        res.status(201).json({ id: this.lastID, message: "Usuario creado" });
    });
});

// Listar mensajes (Público)
app.get('/api/mensajes', (req, res) => {
    const sql = `SELECT m.texto, m.created_at, u.username 
                 FROM mensajes m JOIN usuarios u ON m.user_id = u.id 
                 ORDER BY m.created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error al obtener mensajes" });
        res.json(rows);
    });
});

app.listen(3000, () => console.log("Servidor en puerto 3000"));*/

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors()); // Permite que el frontend (puerto 8080) hable con el backend (3000)

// --- CONFIGURACIÓN DE BASE DE DATOS ---
const dbPath = path.resolve(__dirname, 'foro.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Tabla de Usuarios
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de Mensajes
    db.run(`CREATE TABLE IF NOT EXISTS mensajes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        texto TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES usuarios(id)
    )`);
});

// --- RUTAS DE AUTENTICACIÓN ---

// Registro
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Campos incompletos" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO usuarios (username, password) VALUES (?, ?)`;
        
        db.run(sql, [username, hashedPassword], function(err) {
            if (err) return res.status(400).json({ error: "El usuario ya existe" });
            res.status(201).json({ message: "Usuario creado con éxito" });
        });
    } catch (e) {
        res.status(500).json({ error: "Error interno" });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get(`SELECT * FROM usuarios WHERE username = ?`, [username], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: "Credenciales inválidas" });
        
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Credenciales inválidas" });
        
        res.json({ id: user.id, username: user.username });
    });
});

// --- RUTAS DEL FORO ---

// Listar todos los mensajes
app.get('/api/mensajes', (req, res) => {
    const sql = `
        SELECT m.id, m.texto, m.created_at, u.username 
        FROM mensajes m 
        JOIN usuarios u ON m.user_id = u.id 
        ORDER BY m.created_at DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error al leer mensajes" });
        res.json(rows);
    });
});

// Publicar un mensaje
app.post('/api/mensajes', (req, res) => {
    const { user_id, texto } = req.body;

    // Validación básica en backend
    if (!texto || texto.trim().length === 0) {
        return res.status(400).json({ error: "El mensaje no puede estar vacío" });
    }

    const sql = `INSERT INTO mensajes (user_id, texto) VALUES (?, ?)`;
    db.run(sql, [user_id, texto], function(err) {
        if (err) return res.status(500).json({ error: "Error al publicar" });
        res.status(201).json({ id: this.lastID, message: "Mensaje publicado" });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend de la Hackathon corriendo en http://localhost:${PORT}`);
});
