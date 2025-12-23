
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

let pool = null;

// Función para inicializar tablas - Asegura que los tipos de datos coincidan con el Front
const createTables = async (targetPool) => {
  try {
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

    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        stat_date DATE PRIMARY KEY,
        patients_attended INTEGER DEFAULT 0,
        patients_called INTEGER DEFAULT 0
      );
    `);
    console.log("✅ Estructura de base de datos PostgreSQL validada.");
  } catch (err) {
    console.error("❌ Error fatal de estructura SQL:", err);
    throw err;
  }
};

// Middleware para verificar que la conexión a la DB esté viva
const ensurePool = (req, res, next) => {
  if (!pool) {
    console.warn("⚠️ Pool no detectado. Solicitando re-inicialización al cliente.");
    return res.status(503).json({ error: 'NODE_NOT_INITIALIZED' });
  }
  next();
};

// Endpoint de vinculación
app.post('/api/test-db', async (req, res) => {
  const config = req.body;
  console.log("🔗 Intentando vincular Nodo:", config.host);
  try {
    const newPool = new Pool({
      user: config.user || 'postgres',
      host: config.host || 'localhost',
      database: config.database || 'calidad_dac_db',
      password: config.password || '',
      port: config.port || 5432,
      connectionTimeoutMillis: 10000,
    });
    
    await newPool.query('SELECT NOW()');
    await createTables(newPool);
    
    pool = newPool;
    console.log("🚀 Nodo vinculado y Tablas listas.");
    res.status(200).json({ status: 'connected' });
  } catch (err) {
    console.error("❌ Error en vinculación:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/repair-db', ensurePool, async (req, res) => {
  try {
    await createTables(pool);
    res.status(200).json({ status: 'repaired' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GESTIÓN DE USUARIOS - Corrección de permisos y guardado
app.get('/api/users', ensurePool, async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id as id, username, full_name as name, role, permissions FROM dac_users');
    res.json(result.rows.map(r => ({
      ...r,
      permissions: r.permissions ? r.permissions.split(',') : ['dashboard']
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', ensurePool, async (req, res) => {
  const u = req.body;
  console.log("👤 Grabando usuario en Postgres:", u.username);
  try {
    const permissionsStr = Array.isArray(u.permissions) ? u.permissions.join(',') : 'dashboard';
    const result = await pool.query(`
      INSERT INTO dac_users (user_id, username, password, full_name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO UPDATE SET 
        role = EXCLUDED.role, 
        permissions = EXCLUDED.permissions,
        password = EXCLUDED.password
      RETURNING user_id as id, username, role, permissions
    `, [u.id, u.username, u.password, u.name || u.username, u.role, permissionsStr]);
    
    const saved = result.rows[0];
    saved.permissions = saved.permissions.split(',');
    res.status(201).json(saved);
  } catch (err) { 
    console.error("❌ Error SQL Usuarios:", err.message);
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/login', ensurePool, async (req, res) => {
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
        permissions: user.permissions ? user.permissions.split(',') : ['dashboard']
      });
    } else { res.status(401).json({ error: 'Invalido' }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// INCIDENCIAS
app.get('/api/complaints', ensurePool, async (req, res) => {
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

app.post('/api/complaints', ensurePool, async (req, res) => {
  const c = req.body;
  try {
    await pool.query(`
      INSERT INTO medical_incidences 
      (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, complaint_description, current_status, priority_level, satisfaction_score, ai_sentiment, ai_suggested_response, management_solution, resolved_by_admin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (audit_id) DO UPDATE SET current_status = EXCLUDED.current_status
    `, [c.id, c.date, c.patientName, c.patientPhone || '', c.doctorName || '', c.specialty, c.area, c.description, c.status, c.priority, c.satisfaction, c.sentiment, c.suggestedResponse, c.managementResponse, c.resolvedBy]);
    res.sendStatus(201);
  } catch (err) { 
    console.error("❌ Error SQL Incidencias:", err.message);
    res.status(500).json({ error: err.message }); 
  }
});

app.put('/api/complaints/:id', ensurePool, async (req, res) => {
  const { id } = req.params;
  const { status, managementResponse, resolvedBy } = req.body;
  try {
    await pool.query(`UPDATE medical_incidences SET current_status = $1, management_solution = $2, resolved_by_admin = $3 WHERE audit_id = $4`, [status, managementResponse, resolvedBy, id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ESTADISTICAS
app.get('/api/stats', ensurePool, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_stats ORDER BY stat_date DESC');
    res.json(result.rows.map(r => ({ date: r.stat_date.toISOString().split('T')[0], patients_attended: r.patients_attended, patients_called: r.patients_called })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/stats', ensurePool, async (req, res) => {
  const s = req.body;
  try {
    await pool.query(`INSERT INTO daily_stats (stat_date, patients_attended, patients_called) VALUES ($1, $2, $3) ON CONFLICT (stat_date) DO UPDATE SET patients_attended = EXCLUDED.patients_attended, patients_called = EXCLUDED.patients_called`, [s.date, s.patients_attended, s.patients_called]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clear-data', ensurePool, async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE medical_incidences, daily_stats');
    res.sendStatus(200);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3008, '0.0.0.0', () => console.log('🚀 Nodo DAC Central v5.6 ACTIVO en puerto 3008'));
