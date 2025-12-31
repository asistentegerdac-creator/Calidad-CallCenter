
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
    
    // 1. Crear Tablas base si no existen
    await client.query(`CREATE TABLE IF NOT EXISTS dac_areas_master (name VARCHAR(100) PRIMARY KEY);`);
    await client.query(`CREATE TABLE IF NOT EXISTS dac_specialties_master (name VARCHAR(100) PRIMARY KEY);`);
    await client.query(`CREATE TABLE IF NOT EXISTS dac_users (user_id VARCHAR(50) PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, full_name VARCHAR(255), role VARCHAR(20) DEFAULT 'agent', permissions TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await client.query(`CREATE TABLE IF NOT EXISTS dac_areas_config (area_name VARCHAR(100) PRIMARY KEY, manager_name VARCHAR(255) NOT NULL);`);
    await client.query(`CREATE TABLE IF NOT EXISTS medical_incidences (audit_id VARCHAR(50) PRIMARY KEY, incidence_date DATE NOT NULL, patient_name VARCHAR(255) NOT NULL, complaint_description TEXT NOT NULL, registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await client.query(`CREATE TABLE IF NOT EXISTS daily_stats (stat_date DATE PRIMARY KEY);`);
    await client.query(`CREATE TABLE IF NOT EXISTS dac_no_call_list (id VARCHAR(50) PRIMARY KEY, patient_name VARCHAR(255) NOT NULL, patient_phone VARCHAR(50) NOT NULL, registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);

    // 2. REPARACIÓN PROFUNDA: FORZAR COLUMNAS FALTANTES
    await client.query(`ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS patients_attended INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS patients_called INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS calls_unanswered INTEGER DEFAULT 0;`);

    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(50);`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS specialty_name VARCHAR(100);`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS area_name VARCHAR(100);`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255);`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS current_status VARCHAR(50) DEFAULT 'Pendiente';`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS priority_level VARCHAR(50) DEFAULT 'Media';`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER;`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS management_solution TEXT;`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS resolved_by_admin VARCHAR(150);`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS sentiment_analysis TEXT;`);
    await client.query(`ALTER TABLE medical_incidences ADD COLUMN IF NOT EXISTS suggested_response TEXT;`);

    await client.query(`ALTER TABLE dac_no_call_list ADD COLUMN IF NOT EXISTS reason TEXT;`);

    await client.query('COMMIT');
    console.log("✅ [DAC] Postgres Estructura OK");
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ [DAC] Error Estructural:", err.message);
    throw err;
  } finally {
    client.release();
  }
};

const loadConfig = async () => {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      const newPool = new Pool({ ...config, connectionTimeoutMillis: 5000 });
      await newPool.query('SELECT 1');
      await syncSchema(newPool);
      pool = newPool;
      currentConfig = config;
    } catch (e) { console.error("DAC DB Load Error"); }
  }
};
loadConfig();

// ENDPOINTS RESTAURADOS
app.post('/api/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'OFFLINE' });
  const { username, password } = req.body;
  try {
    const r = await pool.query('SELECT user_id as id, username, full_name as name, role FROM dac_users WHERE username=$1 AND password=$2', [username, password]);
    res.json(r.rows[0] || null);
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/init-db', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'OFFLINE' });
  try {
    await syncSchema(pool);
    res.json({ success: true, message: "Estructura reparada correctamente" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/test-db', async (req, res) => {
  const config = req.body;
  const testPool = new Pool({ ...config, connectionTimeoutMillis: 5000 });
  try {
    await testPool.query('SELECT 1');
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
    await syncSchema(testPool);
    pool = testPool;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/health', async (req, res) => {
  if (!pool) return res.json({ connected: false });
  try {
    await pool.query('SELECT 1');
    res.json({ connected: true });
  } catch (e) { res.json({ connected: false }); }
});

app.get('/api/stats', async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const r = await pool.query('SELECT stat_date as date, patients_attended, patients_called, calls_unanswered FROM daily_stats ORDER BY stat_date DESC');
    res.json(r.rows.map(row => ({ ...row, date: row.date.toISOString().split('T')[0] })));
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/stats', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'OFFLINE' });
  const { date, patients_attended, patients_called, calls_unanswered } = req.body;
  try {
    await pool.query(`
      INSERT INTO daily_stats (stat_date, patients_attended, patients_called, calls_unanswered)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (stat_date) DO UPDATE SET 
        patients_attended = EXCLUDED.patients_attended, 
        patients_called = EXCLUDED.patients_called, 
        calls_unanswered = EXCLUDED.calls_unanswered
    `, [date, parseInt(patients_attended) || 0, parseInt(patients_called) || 0, parseInt(calls_unanswered) || 0]);
    res.sendStatus(201);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/complaints', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'OFFLINE' });
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
      resolvedBy: row.resolved_by_admin,
      sentiment: row.sentiment_analysis,
      suggestedResponse: row.suggested_response
    })));
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/complaints', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'OFFLINE' });
  const c = req.body;
  try {
    await pool.query(`
      INSERT INTO medical_incidences (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, manager_name, complaint_description, current_status, priority_level, satisfaction_score, management_solution, resolved_by_admin, sentiment_analysis, suggested_response)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (audit_id) DO UPDATE SET 
        incidence_date=EXCLUDED.incidence_date, patient_name=EXCLUDED.patient_name, patient_phone=EXCLUDED.patient_phone, doctor_name=EXCLUDED.doctor_name, specialty_name=EXCLUDED.specialty_name, area_name=EXCLUDED.area_name, manager_name=EXCLUDED.manager_name, complaint_description=EXCLUDED.complaint_description, current_status=EXCLUDED.current_status, priority_level=EXCLUDED.priority_level, satisfaction_score=EXCLUDED.satisfaction_score, management_solution=EXCLUDED.management_solution, resolved_by_admin=EXCLUDED.resolved_by_admin, sentiment_analysis=EXCLUDED.sentiment_analysis, suggested_response=EXCLUDED.suggested_response
    `, [c.id, c.date, c.patientName, c.patientPhone, c.doctorName, c.specialty, c.area, c.managerName, c.description, c.status, c.priority, c.satisfaction, c.managementResponse, c.resolvedBy, c.sentiment, c.suggestedResponse]);
    res.sendStatus(201);
  } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/complaints/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'OFFLINE' });
  try {
    await pool.query('DELETE FROM medical_incidences WHERE audit_id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/nocall', async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const r = await pool.query('SELECT id, patient_name as "patientName", patient_phone as "patientPhone", reason, registered_at as "registeredAt" FROM dac_no_call_list ORDER BY registered_at DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/nocall', async (req, res) => {
  if (!pool) return res.sendStatus(503);
  const p = req.body;
  try {
    await pool.query('INSERT INTO dac_no_call_list (id, patient_name, patient_phone, reason, registered_at) VALUES ($1,$2,$3,$4,$5)', [p.id, p.patientName, p.patientPhone, p.reason, p.registeredAt]);
    res.sendStatus(201);
  } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/nocall/:id', async (req, res) => {
  if (!pool) return res.sendStatus(503);
  try {
    await pool.query('DELETE FROM dac_no_call_list WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/users', async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const r = await pool.query('SELECT user_id as id, username, password, full_name as name, role FROM dac_users');
    res.json(r.rows);
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/users', async (req, res) => {
  if (!pool) return res.sendStatus(503);
  const u = req.body;
  try {
    await pool.query('INSERT INTO dac_users (user_id, username, password, full_name, role) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO UPDATE SET username=EXCLUDED.username, password=EXCLUDED.password, full_name=EXCLUDED.full_name, role=EXCLUDED.role', [u.id, u.username, u.password, u.name, u.role]);
    res.sendStatus(201);
  } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/users/:id', async (req, res) => {
  if (!pool) return res.sendStatus(503);
  try {
    await pool.query('DELETE FROM dac_users WHERE user_id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/areas-config', async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const r = await pool.query('SELECT area_name as "areaName", manager_name as "managerName" FROM dac_areas_config');
    res.json(r.rows);
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/areas-config', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'OFFLINE' });
  const { areaName, managerName } = req.body;
  try {
    await pool.query('INSERT INTO dac_areas_config (area_name, manager_name) VALUES ($1, $2) ON CONFLICT (area_name) DO UPDATE SET manager_name=EXCLUDED.manager_name', [areaName, managerName]);
    res.sendStatus(201);
  } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/areas-config/:area', async (req, res) => {
  if (!pool) return res.sendStatus(503);
  try {
    await pool.query('DELETE FROM dac_areas_config WHERE area_name = $1', [req.params.area]);
    res.sendStatus(200);
  } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/catalog/areas', async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const r = await pool.query('SELECT name FROM dac_areas_master ORDER BY name ASC');
    res.json(r.rows.map(row => row.name));
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/catalog/areas', async (req, res) => {
  if (!pool) return res.sendStatus(503);
  try {
    await pool.query('INSERT INTO dac_areas_master (name) VALUES ($1) ON CONFLICT DO NOTHING', [req.body.name]);
    res.sendStatus(201);
  } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/catalog/areas/:name', async (req, res) => {
  if (!pool) return res.sendStatus(503);
  try {
    await pool.query('DELETE FROM dac_areas_master WHERE name = $1', [req.params.name]);
    res.sendStatus(200);
  } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/catalog/specialties', async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const r = await pool.query('SELECT name FROM dac_specialties_master ORDER BY name ASC');
    res.json(r.rows.map(row => row.name));
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/catalog/specialties', async (req, res) => {
  if (!pool) return res.sendStatus(503);
  try {
    await pool.query('INSERT INTO dac_specialties_master (name) VALUES ($1) ON CONFLICT DO NOTHING', [req.body.name]);
    res.sendStatus(201);
  } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/catalog/specialties/:name', async (req, res) => {
  if (!pool) return res.sendStatus(503);
  try {
    await pool.query('DELETE FROM dac_specialties_master WHERE name = $1', [req.params.name]);
    res.sendStatus(200);
  } catch (e) { res.status(500).send(e.message); }
});

const PORT = 3008;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 [DAC] Backend v9.1 - FULL SERVICE RESTORED` ));
