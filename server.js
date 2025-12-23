
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

let pool = null;

const createTables = async (targetPool) => {
  // Esquema de Usuarios
  await targetPool.query(`
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

  // Esquema de Incidencias
  await targetPool.query(`
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

  // Esquema de Estadísticas
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      stat_date DATE PRIMARY KEY,
      patients_attended INTEGER DEFAULT 0,
      patients_called INTEGER DEFAULT 0
    );
  `);
};

const ensurePool = (req, res, next) => {
  if (!pool) return res.status(500).json({ error: 'PostgreSQL no conectado. Vincule el nodo primero.' });
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
    await createTables(newPool);
    pool = newPool;
    res.status(200).json({ status: 'connected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/repair-db', ensurePool, async (req, res) => {
  try {
    await createTables(pool);
    res.status(200).json({ status: 'repaired' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINTS USUARIOS
app.get('/api/users', ensurePool, async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id as id, username, full_name as name, role, permissions FROM dac_users ORDER BY created_at DESC');
    res.json(result.rows.map(r => ({
      ...r,
      permissions: r.permissions ? r.permissions.split(',') : ['dashboard']
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', ensurePool, async (req, res) => {
  const u = req.body;
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM dac_users');
    const isFirstUser = parseInt(countRes.rows[0].count) === 0;
    
    const finalRole = (isFirstUser || u.role === 'admin') ? 'admin' : 'agent';
    const permissionsStr = (isFirstUser || !u.permissions || u.permissions.length === 0) 
      ? 'dashboard,incidences,new-incidence,reports,settings' 
      : u.permissions.join(',');

    const result = await pool.query(`
      INSERT INTO dac_users (user_id, username, password, full_name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO UPDATE SET 
        role = EXCLUDED.role, 
        permissions = EXCLUDED.permissions,
        password = EXCLUDED.password,
        full_name = EXCLUDED.full_name
      RETURNING user_id as id, username, full_name as name, role, permissions
    `, [u.id, u.username, u.password, u.name || u.username, finalRole, permissionsStr]);
    
    const saved = result.rows[0];
    saved.permissions = saved.permissions ? saved.permissions.split(',') : [];
    res.status(201).json(saved);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/login', ensurePool, async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT user_id as id, username, full_name as name, role, permissions FROM dac_users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      user.permissions = user.permissions ? user.permissions.split(',') : ['dashboard'];
      res.json(user);
    } else {
      res.status(401).json({ error: 'Credenciales inválidas' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', ensurePool, async (req, res) => {
  const { id } = req.params;
  const { role, permissions } = req.body;
  const permissionsStr = permissions ? permissions.join(',') : 'dashboard';
  try {
    await pool.query('UPDATE dac_users SET role = $1, permissions = $2 WHERE user_id = $3', [role, permissionsStr, id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ENDPOINTS INCIDENCIAS
app.get('/api/complaints', ensurePool, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM medical_incidences ORDER BY registered_at DESC');
    const mapped = result.rows.map(r => ({
      id: r.audit_id,
      date: r.incidence_date ? new Date(r.incidence_date).toISOString().split('T')[0] : '',
      patientName: r.patient_name,
      patientPhone: r.patient_phone || '',
      doctorName: r.doctor_name || '',
      specialty: r.specialty_name || '',
      area: r.area_name || '',
      description: r.complaint_description,
      status: r.current_status,
      priority: r.priority_level,
      satisfaction: r.satisfaction_score,
      sentiment: r.ai_sentiment,
      suggestedResponse: r.ai_suggested_response,
      managementResponse: r.management_solution,
      resolvedBy: r.resolved_by_admin
    }));
    res.json(mapped);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/complaints', ensurePool, async (req, res) => {
  const c = req.body;
  try {
    const query = `INSERT INTO medical_incidences 
      (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, complaint_description, current_status, priority_level, satisfaction_score, ai_sentiment, ai_suggested_response, management_solution, resolved_by_admin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (audit_id) DO UPDATE SET
      current_status = EXCLUDED.current_status,
      management_solution = EXCLUDED.management_solution,
      resolved_by_admin = EXCLUDED.resolved_by_admin`;
    
    await pool.query(query, [
      c.id, c.date, c.patientName, c.patientPhone || null, 
      c.doctorName || null, c.specialty || null, c.area || null, 
      c.description, c.status, c.priority, c.satisfaction, 
      c.sentiment || null, c.suggestedResponse || null,
      c.managementResponse || null, c.resolvedBy || null
    ]);
    res.sendStatus(201);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.delete('/api/clear-data', ensurePool, async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE medical_incidences, daily_stats, dac_users CASCADE');
    res.sendStatus(200);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/daily-stats', ensurePool, async (req, res) => {
  try {
    const result = await pool.query('SELECT stat_date as date, patients_attended, patients_called FROM daily_stats ORDER BY stat_date DESC LIMIT 30');
    res.json(result.rows.map(r => ({
      ...r,
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : ''
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

app.listen(3008, '0.0.0.0', () => console.log('🚀 DAC Node Central v5.3 Online'));
