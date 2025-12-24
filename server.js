
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const CONFIG_PATH = path.join(__dirname, 'db_config.json');
let pool = null;
let currentConfig = null;

// Inicializa las tablas necesarias
const syncDatabaseSchema = async (targetPool) => {
  try {
    const client = await targetPool.connect();
    try {
      await client.query('BEGIN');
      
      // Tabla de Usuarios
      await client.query(`
        CREATE TABLE IF NOT EXISTS dac_users (
          user_id VARCHAR(50) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          role VARCHAR(20) DEFAULT 'agent',
          permissions TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Tabla de Incidencias
      await client.query(`
        CREATE TABLE IF NOT EXISTS medical_incidences (
          audit_id VARCHAR(50) PRIMARY KEY,
          incidence_date DATE NOT NULL,
          patient_name VARCHAR(255) NOT NULL,
          patient_phone VARCHAR(50),
          doctor_name VARCHAR(255),
          specialty_name VARCHAR(100),
          area_name VARCHAR(100),
          complaint_description TEXT NOT NULL,
          current_status VARCHAR(50) DEFAULT 'Pendiente',
          priority_level VARCHAR(50) DEFAULT 'Media',
          satisfaction_score INTEGER,
          ai_sentiment VARCHAR(50),
          ai_suggested_response TEXT,
          management_solution TEXT,
          resolved_by_admin VARCHAR(150),
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Tabla de Estadísticas Diarias
      await client.query(`
        CREATE TABLE IF NOT EXISTS daily_stats (
          stat_date DATE PRIMARY KEY,
          patients_attended INTEGER DEFAULT 0,
          patients_called INTEGER DEFAULT 0
        );
      `);

      await client.query('COMMIT');
      console.log("✅ Estructura de base de datos sincronizada correctamente.");
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Error al sincronizar el esquema:", err.message);
    throw err;
  }
};

// Carga la configuración guardada e intenta conectar al iniciar
const initializeDatabase = async () => {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      console.log(`📂 Cargando configuración persistente: ${config.database}@${config.host}`);
      
      const newPool = new Pool({
        ...config,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20
      });

      // Prueba real de conexión
      await newPool.query('SELECT 1');
      await syncDatabaseSchema(newPool);
      
      pool = newPool;
      currentConfig = config;
      console.log("🚀 Nodo Central vinculado con éxito.");
    } catch (err) {
      console.error("⚠️ Fallo al reconectar automáticamente:", err.message);
      pool = null;
    }
  } else {
    console.log("ℹ️ No hay configuración de base de datos previa.");
  }
};

initializeDatabase();

// Middleware: Valida que la conexión esté activa antes de procesar cualquier ruta /api
const validateDbConnection = async (req, res, next) => {
  if (!pool) {
    return res.status(503).json({ 
      error: 'NODE_DISCONNECTED', 
      message: 'El backend no tiene una base de datos vinculada.' 
    });
  }
  try {
    await pool.query('SELECT 1');
    next();
  } catch (err) {
    console.error("❌ Error de comunicación con Postgres:", err.message);
    pool = null; // Reset pool if connection is dead
    return res.status(503).json({ 
      error: 'CONNECTION_LOST', 
      message: 'Se ha perdido la conexión con el servidor de base de datos.' 
    });
  }
};

// --- ENDPOINTS ---

// 1. Probar y Guardar Conexión (PERSISTENTE)
app.post('/api/test-db', async (req, res) => {
  const config = req.body;
  console.log(`🔌 Solicitud de vinculación: ${config.host}:${config.port}`);
  
  try {
    const testPool = new Pool({
      user: config.user,
      host: config.host,
      database: config.database,
      password: config.password,
      port: config.port || 5432,
      connectionTimeoutMillis: 10000
    });
    
    // Verificación de fuego: Consulta real
    await testPool.query('SELECT 1');
    
    // Si funciona, preparamos las tablas
    await syncDatabaseSchema(testPool);
    
    // Guardamos en archivo local
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    // Cerramos pool anterior si existe y activamos el nuevo
    if (pool) await pool.end();
    pool = testPool;
    currentConfig = config;
    
    console.log("✅ Nueva configuración validada y grabada localmente.");
    res.status(200).json({ status: 'connected', database: config.database });
  } catch (err) {
    console.error("❌ Error en prueba de conexión:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. Estado de Salud (Ping Real a Postgres)
app.get('/api/health', async (req, res) => {
  if (!pool) return res.json({ connected: false, status: 'offline', message: 'No configurado' });
  try {
    await pool.query('SELECT 1');
    res.json({ connected: true, status: 'online', database: currentConfig.database });
  } catch (err) {
    res.json({ connected: false, status: 'error', message: err.message });
  }
});

// 3. Usuarios
app.get('/api/users', validateDbConnection, async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id as id, username, full_name as name, role, permissions FROM dac_users ORDER BY created_at DESC');
    res.json(result.rows.map(r => ({
      ...r,
      permissions: r.permissions ? r.permissions.split(',') : []
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', validateDbConnection, async (req, res) => {
  const u = req.body;
  try {
    const perms = Array.isArray(u.permissions) ? u.permissions.join(',') : 'dashboard';
    const result = await pool.query(`
      INSERT INTO dac_users (user_id, username, password, full_name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO UPDATE SET 
        role = EXCLUDED.role, 
        permissions = EXCLUDED.permissions,
        password = EXCLUDED.password
      RETURNING user_id as id, username, role, permissions
    `, [u.id, u.username, u.password, u.name || u.username, u.role, perms]);
    
    const saved = result.rows[0];
    saved.permissions = saved.permissions.split(',');
    res.status(201).json(saved);
  } catch (err) { 
    console.error("Error SQL Users:", err.message);
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/login', validateDbConnection, async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM dac_users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({
        id: user.user_id,
        username: user.username,
        name: user.full_name,
        role: user.role,
        permissions: user.permissions ? user.permissions.split(',') : []
      });
    } else {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Incidencias
app.get('/api/complaints', validateDbConnection, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM medical_incidences ORDER BY registered_at DESC');
    res.json(result.rows.map(r => ({
      id: r.audit_id,
      date: r.incidence_date.toISOString().split('T')[0],
      patientName: r.patient_name,
      patientPhone: r.patient_phone,
      doctorName: r.doctor_name,
      specialty: r.specialty_name,
      area: r.area_name,
      description: r.complaint_description,
      status: r.current_status,
      priority: r.priority_level,
      satisfaction: r.satisfaction_score,
      sentiment: r.ai_sentiment,
      suggestedResponse: r.ai_suggested_response,
      managementResponse: r.management_solution,
      resolvedBy: r.resolved_by_admin
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/complaints', validateDbConnection, async (req, res) => {
  const c = req.body;
  try {
    await pool.query(`
      INSERT INTO medical_incidences 
      (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, complaint_description, current_status, priority_level, satisfaction_score, ai_sentiment, ai_suggested_response, management_solution, resolved_by_admin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (audit_id) DO UPDATE SET 
        current_status = EXCLUDED.current_status, 
        management_solution = EXCLUDED.management_solution, 
        resolved_by_admin = EXCLUDED.resolved_by_admin
    `, [
      c.id, c.date, c.patientName, c.patientPhone || '', 
      c.doctorName || '', c.specialty, c.area, c.description, 
      c.status, c.priority, c.satisfaction, c.sentiment, 
      c.suggestedResponse, c.managementResponse, c.resolvedBy
    ]);
    res.sendStatus(201);
  } catch (err) { 
    console.error("Error SQL Complaints:", err.message);
    res.status(500).json({ error: err.message }); 
  }
});

app.put('/api/complaints/:id', validateDbConnection, async (req, res) => {
  const { id } = req.params;
  const { status, managementResponse, resolvedBy } = req.body;
  try {
    await pool.query(`
      UPDATE medical_incidences 
      SET current_status = $1, management_solution = $2, resolved_by_admin = $3 
      WHERE audit_id = $4
    `, [status, managementResponse, resolvedBy, id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Estadísticas
app.get('/api/stats', validateDbConnection, async (req, res) => {
  try {
    const result = await pool.query('SELECT stat_date as date, patients_attended, patients_called FROM daily_stats ORDER BY stat_date DESC');
    res.json(result.rows.map(r => ({
      date: r.date.toISOString().split('T')[0],
      patients_attended: r.patients_attended,
      patients_called: r.patients_called
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/stats', validateDbConnection, async (req, res) => {
  const s = req.body;
  try {
    await pool.query(`
      INSERT INTO daily_stats (stat_date, patients_attended, patients_called) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (stat_date) DO UPDATE SET 
        patients_attended = EXCLUDED.patients_attended, 
        patients_called = EXCLUDED.patients_called
    `, [s.date, s.patients_attended, s.patients_called]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = 3008;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀--------------------------------------------------🚀
    SISTEMA DAC CENTRAL - NODO DE DATOS v6.5 ACTIVO
    Puerto: ${PORT}
    Host: 0.0.0.0 (Accesible en red local)
  🚀--------------------------------------------------🚀
  `);
});
