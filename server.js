const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let pool = null;

// Middleware para asegurar que haya una conexión activa
const ensurePool = (req, res, next) => {
  if (!pool) {
    return res.status(500).json({ error: 'Base de datos no configurada. Configure en la pestaña Ajustes.' });
  }
  next();
};

// Endpoint para probar conexión e inicializar todas las tablas del sistema
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

    // Probar conexión
    await newPool.query('SELECT NOW()');
    
    // 1. Tabla de Incidencias
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

    // 2. Tabla de Usuarios
    await newPool.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin'
      );
    `);

    // 3. Tabla de Áreas Hospitalarias
    await newPool.query(`
      CREATE TABLE IF NOT EXISTS hospital_areas (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // 4. Tabla de Especialidades
    await newPool.query(`
      CREATE TABLE IF NOT EXISTS hospital_specialties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Insertar datos iniciales si están vacías (Seeding)
    const areasCount = await newPool.query('SELECT COUNT(*) FROM hospital_areas');
    if (parseInt(areasCount.rows[0].count) === 0) {
      await newPool.query("INSERT INTO hospital_areas (name) VALUES ('Urgencias'), ('UCI'), ('Consultas Externas'), ('Laboratorio'), ('Hospitalización') ON CONFLICT DO NOTHING");
    }

    const specsCount = await newPool.query('SELECT COUNT(*) FROM hospital_specialties');
    if (parseInt(specsCount.rows[0].count) === 0) {
      await newPool.query("INSERT INTO hospital_specialties (name) VALUES ('Medicina General'), ('Pediatría'), ('Cardiología'), ('Ginecología'), ('Traumatología') ON CONFLICT DO NOTHING");
    }

    pool = newPool;
    console.log('✅ Sistema PostgreSQL Inicializado Completo');
    res.status(200).json({ status: 'connected' });
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener todas las incidencias
app.get('/api/complaints', ensurePool, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM medical_incidences ORDER BY registered_at DESC');
    const complaints = result.rows.map(r => ({
      id: r.audit_id,
      date: r.incidence_date ? r.incidence_date.toISOString().split('T')[0] : '',
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar nueva incidencia
app.post('/api/complaints', ensurePool, async (req, res) => {
  const c = req.body;
  try {
    const query = `
      INSERT INTO medical_incidences 
      (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, complaint_description, current_status, priority_level, satisfaction_score, ai_sentiment, ai_suggested_response)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;
    const values = [c.id, c.date, c.patientName, c.patientPhone, c.doctorName, c.specialty, c.area, c.description, c.status, c.priority, c.satisfaction, c.sentiment, c.suggestedResponse];
    await pool.query(query, values);
    res.status(201).json({ message: 'Guardado con éxito' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sincronizar estructura automáticamente
app.post('/api/sync-structure', ensurePool, async (req, res) => {
  const { type, name } = req.body;
  try {
    const table = type === 'area' ? 'hospital_areas' : 'hospital_specialties';
    await pool.query(`INSERT INTO ${table} (name) VALUES ($1) ON CONFLICT DO NOTHING`, [name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar resolución
app.put('/api/complaints/:id', ensurePool, async (req, res) => {
  const { id } = req.params;
  const { status, managementResponse, resolvedBy } = req.body;
  try {
    const query = `
      UPDATE medical_incidences 
      SET current_status = $1, management_solution = $2, resolved_by_admin = $3 
      WHERE audit_id = $4
    `;
    await pool.query(query, [status, managementResponse, resolvedBy, id]);
    res.json({ message: 'Expediente actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Puerto solicitado
const PORT = 3008;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor DAC corriendo en http://192.168.99.180:${PORT}`);
});
