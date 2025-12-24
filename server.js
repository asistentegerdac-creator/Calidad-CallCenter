
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

// Función para inicializar tablas - Estructura robusta para CALIDAD DAC
const syncDatabaseSchema = async (targetPool) => {
  const client = await targetPool.connect();
  try {
    await client.query('BEGIN');
    
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        stat_date DATE PRIMARY KEY,
        patients_attended INTEGER DEFAULT 0,
        patients_called INTEGER DEFAULT 0
      );
    `);

    await client.query('COMMIT');
    console.log("✅ [DB] Esquema sincronizado correctamente.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ [DB] Error sincronizando esquema:", err.message);
    throw err;
  } finally {
    client.release();
  }
};

// Carga configuración persistente al arrancar
const initServer = async () => {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      console.log(`📂 [INIT] Cargando configuración de: ${config.host}`);
      const testPool = new Pool({ ...config, connectionTimeoutMillis: 5000 });
      await testPool.query('SELECT 1');
      await syncDatabaseSchema(testPool);
      pool = testPool;
      currentConfig = config;
      console.log("🚀 [INIT] Conexión automática establecida.");
    } catch (err) {
      console.error("⚠️ [INIT] No se pudo reconectar automáticamente:", err.message);
    }
  }
};

initServer();

// Middleware de verificación de salud
const validateConnection = async (req, res, next) => {
  if (!pool) return res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
  try {
    await pool.query('SELECT 1');
    next();
  } catch (err) {
    console.error("❌ [DB] Error de conexión:", err.message);
    pool = null;
    return res.status(503).json({ error: 'DATABASE_CONNECTION_LOST' });
  }
};

// --- ENDPOINTS ---

app.post('/api/test-db', async (req, res) => {
  const config = req.body;
  console.log(`🔌 [TEST] Probando conexión a ${config.host}...`);
  try {
    const testPool = new Pool({ ...config, connectionTimeoutMillis: 10000 });
    await testPool.query('SELECT 1');
    await syncDatabaseSchema(testPool);
    
    // Si funciona, guardamos en disco
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    if (pool) await pool.end();
    pool = testPool;
    currentConfig = config;
    
    res.json({ status: 'connected', database: config.database });
  } catch (err) {
    console.error("❌ [TEST] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', async (req, res) => {
  if (!pool) return res.json({ connected: false, message: 'Nodo no vinculado' });
  try {
    await pool.query('SELECT 1');
    res.json({ connected: true, database: currentConfig.database });
  } catch (err) {
    res.json({ connected: false, message: err.message });
  }
});

app.get('/api/users', validateConnection, async (req, res) => {
  try {
    const r = await pool.query('SELECT user_id as id, username, full_name as name, role, permissions FROM dac_users');
    res.json(r.rows.map(row => ({ ...row, permissions: row.permissions ? row.permissions.split(',') : [] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', validateConnection, async (req, res) => {
  const u = req.body;
  try {
    const perms = Array.isArray(u.permissions) ? u.permissions.join(',') : 'dashboard';
    const r = await pool.query(`
      INSERT INTO dac_users (user_id, username, password, full_name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions
      RETURNING *
    `, [u.id, u.username, u.password, u.name, u.role, perms]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', validateConnection, async (req, res) => {
  const { username, password } = req.body;
  try {
    const r = await pool.query('SELECT * FROM dac_users WHERE username = $1 AND password = $2', [username, password]);
    if (r.rows.length > 0) {
      const u = r.rows[0];
      res.json({ id: u.user_id, username: u.username, name: u.full_name, role: u.role, permissions: u.permissions ? u.permissions.split(',') : [] });
    } else { res.status(401).json({ error: 'Credenciales inválidas' }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/complaints', validateConnection, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM medical_incidences ORDER BY registered_at DESC');
    res.json(r.rows.map(row => ({
      id: row.audit_id,
      date: row.incidence_date.toISOString().split('T')[0],
      patientName: row.patient_name,
      patientPhone: row.patient_phone,
      doctorName: row.doctor_name,
      specialty: row.specialty_name,
      area: row.area_name,
      description: row.complaint_description,
      status: row.current_status,
      priority: row.priority_level,
      satisfaction: row.satisfaction_score,
      sentiment: row.ai_sentiment,
      suggestedResponse: row.ai_suggested_response,
      managementResponse: row.management_solution,
      resolvedBy: row.resolved_by_admin
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/complaints', validateConnection, async (req, res) => {
  const c = req.body;
  try {
    await pool.query(`
      INSERT INTO medical_incidences 
      (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, complaint_description, current_status, priority_level, satisfaction_score, ai_sentiment, ai_suggested_response, management_solution, resolved_by_admin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (audit_id) DO UPDATE SET current_status = EXCLUDED.current_status, management_solution = EXCLUDED.management_solution
    `, [c.id, c.date, c.patientName, c.patientPhone, c.doctorName, c.specialty, c.area, c.description, c.status, c.priority, c.satisfaction, c.sentiment, c.suggestedResponse, c.managementResponse, c.resolvedBy]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats', validateConnection, async (req, res) => {
  try {
    const r = await pool.query('SELECT stat_date as date, patients_attended, patients_called FROM daily_stats ORDER BY stat_date DESC');
    res.json(r.rows.map(row => ({ ...row, date: row.date.toISOString().split('T')[0] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/stats', validateConnection, async (req, res) => {
  const s = req.body;
  try {
    await pool.query(`INSERT INTO daily_stats (stat_date, patients_attended, patients_called) VALUES ($1, $2, $3) ON CONFLICT (stat_date) DO UPDATE SET patients_attended = EXCLUDED.patients_attended, patients_called = EXCLUDED.patients_called`, [s.date, s.patients_attended, s.patients_called]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3008, '0.0.0.0', () => console.log('🚀 [NODE] Backend DAC v6.8 Activo en puerto 3008'));
