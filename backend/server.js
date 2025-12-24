
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
    
    // Tabla Usuarios
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

    // Tabla Mapeo Jefaturas
    await client.query(`
      CREATE TABLE IF NOT EXISTS dac_areas_config (
        area_name VARCHAR(100) PRIMARY KEY,
        manager_name VARCHAR(255) NOT NULL
      );
    `);

    // Tabla Incidencias Principal
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

    // Migración dinámica de columnas faltantes
    const checkCol = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='medical_incidences' AND column_name='manager_name'
    `);
    if (checkCol.rows.length === 0) {
      await client.query('ALTER TABLE medical_incidences ADD COLUMN manager_name VARCHAR(255)');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        stat_date DATE PRIMARY KEY,
        patients_attended INTEGER DEFAULT 0,
        patients_called INTEGER DEFAULT 0
      );
    `);

    await client.query('COMMIT');
    console.log("✅ [ESQUEMA] Base de datos sincronizada.");
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
    } catch (err) {}
  }
};

loadPersistedConfig();

app.post('/api/test-db', async (req, res) => {
  const config = req.body;
  try {
    const testPool = new Pool({ ...config, connectionTimeoutMillis: 10000 });
    await testPool.query('SELECT 1');
    await syncSchema(testPool);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    if (pool) await pool.end();
    pool = testPool;
    currentConfig = config;
    res.json({ status: 'connected', database: config.database });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', async (req, res) => {
  if (!pool) return res.json({ connected: false });
  try {
    await pool.query('SELECT 1');
    res.json({ connected: true, database: currentConfig.database });
  } catch (err) { res.json({ connected: false }); }
});

app.get('/api/areas-config', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try {
    const r = await pool.query('SELECT area_name as "areaName", manager_name as "managerName" FROM dac_areas_config');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/areas-config', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  const { areaName, managerName } = req.body;
  try {
    await pool.query(`
      INSERT INTO dac_areas_config (area_name, manager_name) 
      VALUES ($1, $2) 
      ON CONFLICT (area_name) DO UPDATE SET manager_name = EXCLUDED.manager_name
    `, [areaName, managerName]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/areas-config/:areaName', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try {
    await pool.query('DELETE FROM dac_areas_config WHERE area_name = $1', [req.params.areaName]);
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
      sentiment: row.ai_sentiment,
      suggestedResponse: row.ai_suggested_response,
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
      INSERT INTO medical_incidences 
      (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, manager_name, complaint_description, current_status, priority_level, satisfaction_score, ai_sentiment, ai_suggested_response, management_solution, resolved_by_admin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (audit_id) DO UPDATE SET 
        incidence_date = EXCLUDED.incidence_date,
        patient_name = EXCLUDED.patient_name,
        patient_phone = EXCLUDED.patient_phone,
        doctor_name = EXCLUDED.doctor_name,
        specialty_name = EXCLUDED.specialty_name,
        area_name = EXCLUDED.area_name,
        manager_name = EXCLUDED.manager_name,
        complaint_description = EXCLUDED.complaint_description,
        current_status = EXCLUDED.current_status, 
        management_solution = EXCLUDED.management_solution, 
        resolved_by_admin = EXCLUDED.resolved_by_admin
    `, [c.id, c.date, c.patientName, c.patientPhone, c.doctorName, c.specialty, c.area, c.managerName, c.description, c.status, c.priority, c.satisfaction, c.sentiment, c.suggestedResponse, c.managementResponse, c.resolvedBy]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/complaints/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try {
    await pool.query('DELETE FROM medical_incidences WHERE audit_id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try {
    const r = await pool.query('SELECT user_id as id, username, full_name as name, role, permissions FROM dac_users');
    res.json(r.rows.map(row => ({ ...row, permissions: row.permissions ? row.permissions.split(',') : [] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  const u = req.body;
  try {
    const perms = Array.isArray(u.permissions) ? u.permissions.join(',') : 'dashboard';
    await pool.query(`
      INSERT INTO dac_users (user_id, username, password, full_name, role, permissions) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, password = EXCLUDED.password, permissions = EXCLUDED.permissions
    `, [u.id, u.username, u.password, u.name, u.role, perms]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:userId', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try {
    await pool.query('DELETE FROM dac_users WHERE user_id = $1', [req.params.userId]);
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  const { username, password } = req.body;
  try {
    const r = await pool.query('SELECT * FROM dac_users WHERE username = $1 AND password = $2', [username, password]);
    if (r.rows.length > 0) {
      const u = r.rows[0];
      res.json({ id: u.user_id, username: u.username, name: u.full_name, role: u.role, permissions: u.permissions ? u.permissions.split(',') : [] });
    } else { res.status(401).json({ error: 'Credenciales inválidas' }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  try {
    const r = await pool.query('SELECT stat_date as date, patients_attended, patients_called FROM daily_stats ORDER BY stat_date DESC');
    res.json(r.rows.map(row => ({ ...row, date: row.date.toISOString().split('T')[0] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/stats', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'DB_OFFLINE' });
  const s = req.body;
  try {
    await pool.query(`
      INSERT INTO daily_stats (stat_date, patients_attended, patients_called) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (stat_date) DO UPDATE SET patients_attended = EXCLUDED.patients_attended, patients_called = EXCLUDED.patients_called
    `, [s.date, s.patients_attended, s.patients_called]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = 3008;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 [BACKEND] DAC Cloud v7.9 Activo en el puerto ${PORT}`);
});
