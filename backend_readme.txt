CALIDAD DAC - GUÍA DE BACKEND (POSTGRESQL)

1. Instalar dependencias en una nueva carpeta de proyecto:
   npm init -y
   npm install express pg cors body-parser

2. Crear un archivo 'server.js' con el siguiente contenido:

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let pool;

app.post('/api/test-db', async (req, res) => {
    const config = req.body;
    try {
        // Inicializar pool con credenciales recibidas o del sistema
        pool = new Pool({
            user: config.user || 'postgres',
            host: config.host || 'localhost',
            database: config.database || 'calidad_dac_db',
            password: config.password || '',
            port: config.port || 5432,
        });
        await pool.query('SELECT NOW()');
        res.status(200).send({ status: 'connected' });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.get('/api/complaints', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM medical_incidences ORDER BY registered_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/complaints', async (req, res) => {
    const c = req.body;
    try {
        const query = `INSERT INTO medical_incidences 
        (audit_id, incidence_date, patient_name, patient_phone, doctor_name, specialty_name, area_name, complaint_description, current_status, priority_level, satisfaction_score, ai_sentiment, ai_suggested_response)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
        const values = [c.id, c.date, c.patientName, c.patientPhone, c.doctorName, c.specialty, c.area, c.description, c.status, c.priority, c.satisfaction, c.sentiment, c.suggestedResponse];
        await pool.query(query, values);
        res.sendStatus(201);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3000, () => console.log('Backend DAC Corriendo en puerto 3000'));
