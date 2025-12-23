const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

let pool = null;

const ensurePool = (req, res, next) => {
  if (!pool) return res.status(500).json({ error: 'PostgreSQL no conectado.' });
  next();
};

app.post('/api/test-db', async (req, res) => {
  const config = req.body;
  try {
    const newPool = new Pool({
      user: config.user || 'postgres',
      host: config.host || 'localhost',
      database: config.database || 'calidad_dac_db',
      password: config.password || '',
      port: config.port || 5432,
    });
    await newPool.query('SELECT NOW()');
    
    // Esquema de Usuarios
    await newPool.query(`
      CREATE TABLE IF NOT EXISTS dac_users (
        user_id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(20) DEFAULT 'agent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Esquema de Incidencias
    await newPool.query(`
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

    // Esquema de Estadísticas Diarias
    await newPool.query(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        stat_date DATE PRIMARY KEY,
        patients_attended INTEGER DEFAULT 0,
        patients_called INTEGER DEFAULT 0
      );
    `);
    
    pool = newPool;
    res.status(200).json({ status: 'connected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINTS DE USUARIOS
app.get('/api/users', ensurePool, async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id as id, username, full_name as name, role FROM dac_users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', ensurePool, async (req, res) => {
  const u = req.body;
  try {
    await pool.query(`
      INSERT INTO dac_users (user_id, username, password, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING
    `, [u.id, u.username, u.password, u.name, u.role]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', ensurePool, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    await pool.query('UPDATE dac_users SET role = $1 WHERE user_id = $2', [role, id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ENDPOINTS DE INCIDENCIAS
app.get('/api/complaints', ensurePool, async (req, res) => {
  const { start, end } = req.query;
  try {
    let query = 'SELECT * FROM medical_incidences';
    const params = [];
    if (start && end) {
      query += ' WHERE incidence_date BETWEEN $1 AND $2';
      params.push(start, end);
    }
    query += ' ORDER BY registered_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(r => ({
      id: r.audit_id,
      date: r.incidence_date ? new Date(r.incidence_date).toISOString().split('T')[0] : '',
      patientName: r.patient_name,
      patientPhone: r.patient_phone || '',
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

app.post('/api/complaints', ensurePool, async (req, res) => {
  const c = req.body;
  try {
    const query = `INSERT INTO medical_incidences 
      (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, complaint_description, current_status, priority_level, satisfaction_score, ai_sentiment, ai_suggested_response)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (audit_id) DO UPDATE SET
      current_status = EXCLUDED.current_status,
      management_solution = EXCLUDED.management_solution,
      resolved_by_admin = EXCLUDED.resolved_by_admin`;
    await pool.query(query, [c.id, c.date, c.patientName, c.patientPhone || null, c.doctorName || null, c.specialty, c.area, c.description, c.status, c.priority, c.satisfaction, c.sentiment, c.suggestedResponse]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/complaints/:id', ensurePool, async (req, res) => {
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

// LIMPIEZA DE TABLAS
app.delete('/api/clear-data', ensurePool, async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE medical_incidences, daily_stats CASCADE');
    res.sendStatus(200);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/daily-stats', ensurePool, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_stats ORDER BY stat_date DESC LIMIT 30');
    res.json(result.rows.map(r => ({
      date: r.stat_date ? new Date(r.stat_date).toISOString().split('T')[0] : '',
      patients_attended: r.patients_attended,
      patients_called: r.patients_called
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/daily-stats', ensurePool, async (req, res) => {
  const { date, patients_attended, patients_called } = req.body;
  try {
    await pool.query(`
      INSERT INTO daily_stats (stat_date, patients_attended, patients_called)
      VALUES ($1, $2, $3)
      ON CONFLICT (stat_date) DO UPDATE SET 
      patients_attended = EXCLUDED.patients_attended, 
      patients_called = EXCLUDED.patients_called
    `, [date, patients_attended, patients_called]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3008, '0.0.0.0', () => console.log('🚀 Backend DAC v4.5 Pro en puerto 3008'));