
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

const syncSchema = async (targetPool) => {
  const client = await targetPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS dac_areas_master (name VARCHAR(100) PRIMARY KEY);`);
    await client.query(`CREATE TABLE IF NOT EXISTS dac_specialties_master (name VARCHAR(100) PRIMARY KEY);`);
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
    await client.query(`CREATE TABLE IF NOT EXISTS dac_areas_config (area_name VARCHAR(100) PRIMARY KEY, manager_name VARCHAR(255) NOT NULL);`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS medical_incidences (
        audit_id VARCHAR(50) PRIMARY KEY,
        incidence_date DATE NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        patient_phone VARCHAR(50),
        doctor_name VARCHAR(255),
        specialty_name VARCHAR(100),
        area_name VARCHAR(100),
        manager_name VARCHAR(255),
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
        patients_called INTEGER DEFAULT 0,
        calls_unanswered INTEGER DEFAULT 0
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS dac_no_call_list (
        id VARCHAR(50) PRIMARY KEY,
        patient_name VARCHAR(255) NOT NULL,
        patient_phone VARCHAR(50) NOT NULL,
        reason TEXT,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query('COMMIT');
    console.log("✅ [ESQUEMA] Sincronizado.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ [ESQUEMA] Error:", err.message);
    throw err;
  } finally {
    client.release();
  }
};

const loadPersistedConfig = async () => {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      const newPool = new Pool({ ...config, connectionTimeoutMillis: 5000 });
      await newPool.query('SELECT 1');
      await syncSchema(newPool);
      pool = newPool;
      currentConfig = config;
      console.log(`✅ [NODO] Activo: ${config.database}`);
    } catch (err) {
      console.error("❌ [NODO] Error carga:", err.message);
    }
  }
};

loadPersistedConfig();

app.post('/api/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  const { username, password } = req.body;
  try {
    const r = await pool.query(
      'SELECT user_id as id, username, full_name as name, role, permissions FROM dac_users WHERE username = $1 AND password = $2',
      [username, password]
    );
    if (r.rows.length > 0) {
      const user = r.rows[0];
      try { user.permissions = JSON.parse(user.permissions || '[]'); } catch(e) { user.permissions = []; }
      res.json(user);
    } else {
      res.status(401).json({ error: 'No autorizado' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try {
    const r = await pool.query('SELECT user_id as id, username, password, full_name as name, role, permissions FROM dac_users ORDER BY full_name ASC');
    res.json(r.rows.map(u => {
      let perms = [];
      try { perms = JSON.parse(u.permissions || '[]'); } catch(e) {}
      return { ...u, permissions: perms };
    }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  const u = req.body;
  try {
    await pool.query(`
      INSERT INTO dac_users (user_id, username, password, full_name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET
        username = EXCLUDED.username, password = EXCLUDED.password, full_name = EXCLUDED.full_name, role = EXCLUDED.role, permissions = EXCLUDED.permissions
    `, [u.id, u.username, u.password, u.name, u.role, JSON.stringify(u.permissions || [])]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/areas-config', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try {
    const r = await pool.query('SELECT area_name as "areaName", manager_name as "managerName" FROM dac_areas_config');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CRÍTICO: Actualización en Cascada de Jefaturas (Solo Pendientes/Proceso)
app.post('/api/areas-config', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  const { areaName, managerName } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Actualizar catálogo de configuración
    await client.query(`
      INSERT INTO dac_areas_config (area_name, manager_name) 
      VALUES ($1, $2) 
      ON CONFLICT (area_name) 
      DO UPDATE SET manager_name = EXCLUDED.manager_name
    `, [areaName, managerName]);

    // 2. Actualizar incidencias existentes EXCEPTO las ya resueltas (Trazabilidad Histórica)
    await client.query(`
      UPDATE medical_incidences 
      SET manager_name = $1 
      WHERE area_name = $2 
      AND current_status IN ('Pendiente', 'En Proceso')
    `, [managerName, areaName]);

    await client.query('COMMIT');
    res.sendStatus(201);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/complaints', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
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
      managerName: row.manager_name,
      description: row.complaint_description,
      status: row.current_status,
      priority: row.priority_level,
      satisfaction: row.satisfaction_score,
      managementResponse: row.management_solution,
      resolvedBy: row.resolved_by_admin
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/complaints', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  const c = req.body;
  try {
    await pool.query(`
      INSERT INTO medical_incidences (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, manager_name, complaint_description, current_status, priority_level, satisfaction_score, management_solution, resolved_by_admin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (audit_id) DO UPDATE SET 
        incidence_date = EXCLUDED.incidence_date, patient_name = EXCLUDED.patient_name, patient_phone = EXCLUDED.patient_phone, doctor_name = EXCLUDED.doctor_name, specialty_name = EXCLUDED.specialty_name, area_name = EXCLUDED.area_name, manager_name = EXCLUDED.manager_name, complaint_description = EXCLUDED.complaint_description, current_status = EXCLUDED.current_status, management_solution = EXCLUDED.management_solution, resolved_by_admin = EXCLUDED.resolved_by_admin
    `, [c.id, c.date, c.patientName, c.patientPhone, c.doctorName, c.specialty, c.area, c.managerName, c.description, c.status, c.priority, c.satisfaction, c.managementResponse, c.resolvedBy]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/catalog/areas', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try {
    const r = await pool.query('SELECT name FROM dac_areas_master ORDER BY name ASC');
    res.json(r.rows.map(row => row.name));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/catalog/areas', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try { await pool.query('INSERT INTO dac_areas_master (name) VALUES ($1) ON CONFLICT DO NOTHING', [req.body.name]); res.sendStatus(201); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/stats', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try {
    const r = await pool.query('SELECT stat_date as date, patients_attended, patients_called, calls_unanswered FROM daily_stats ORDER BY stat_date DESC');
    res.json(r.rows.map(row => ({ ...row, date: row.date.toISOString().split('T')[0] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/stats', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try { await pool.query('INSERT INTO daily_stats (stat_date, patients_attended, patients_called, calls_unanswered) VALUES ($1, $2, $3, $4) ON CONFLICT (stat_date) DO UPDATE SET patients_attended = EXCLUDED.patients_attended, patients_called = EXCLUDED.patients_called, calls_unanswered = EXCLUDED.calls_unanswered', [req.body.date, req.body.patients_attended, req.body.patients_called, req.body.calls_unanswered]); res.sendStatus(201); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/health', async (req, res) => {
  if (!pool) return res.json({ connected: false, message: 'Nodo no vinculado' });
  try { await pool.query('SELECT 1'); res.json({ connected: true, database: currentConfig.database }); } catch (err) { res.json({ connected: false, message: 'DB_TIMEOUT' }); }
});

const PORT = 3008;
app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 [NODO] DAC v8.0 en puerto ${PORT}`); });
