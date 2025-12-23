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
    
    // Inicialización de esquema completo
    await newPool.query(`
      CREATE TABLE IF NOT EXISTS medical_incidences (
        audit_id VARCHAR(50) PRIMARY KEY,
        incidence_date DATE NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        patient_phone VARCHAR(50) NOT NULL,
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
    
    pool = newPool;
    res.status(200).json({ status: 'connected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/complaints', ensurePool, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM medical_incidences ORDER BY registered_at DESC');
    const complaints = result.rows.map(r => ({
      id: r.audit_id,
      date: r.incidence_date ? new Date(r.incidence_date).toISOString().split('T')[0] : '',
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
    }));
    res.json(complaints);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/complaints', ensurePool, async (req, res) => {
  const c = req.body;
  try {
    const query = `INSERT INTO medical_incidences 
      (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, complaint_description, current_status, priority_level, satisfaction_score, ai_sentiment, ai_suggested_response)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (audit_id) DO NOTHING`;
    await pool.query(query, [c.id, c.date, c.patientName, c.patientPhone, c.doctorName, c.specialty, c.area, c.description, c.status, c.priority, c.satisfaction, c.sentiment, c.suggestedResponse]);
    res.sendStatus(201);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/complaints/bulk', ensurePool, async (req, res) => {
  const { complaints } = req.body;
  try {
    for (const c of complaints) {
      const query = `INSERT INTO medical_incidences 
        (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, complaint_description, current_status, priority_level, satisfaction_score, ai_sentiment, ai_suggested_response, management_solution, resolved_by_admin)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (audit_id) DO UPDATE SET current_status = EXCLUDED.current_status, management_solution = EXCLUDED.management_solution`;
      await pool.query(query, [c.id, c.date, c.patientName, c.patientPhone, c.doctorName, c.specialty, c.area, c.description, c.status, c.priority, c.satisfaction, c.sentiment, c.suggestedResponse, c.managementResponse || '', c.resolvedBy || '']);
    }
    res.json({ success: true, count: complaints.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/complaints/:id', ensurePool, async (req, res) => {
  const { id } = req.params;
  const { status, managementResponse, resolvedBy } = req.body;
  try {
    await pool.query(`UPDATE medical_incidences SET current_status = $1, management_solution = $2, resolved_by_admin = $3 WHERE audit_id = $4`, [status, managementResponse, resolvedBy, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3008, '0.0.0.0', () => console.log('🚀 Backend DAC en http://192.168.99.180:3008'));