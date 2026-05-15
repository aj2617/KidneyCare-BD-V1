import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const railwayVolumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const databasePath =
  process.env.DATABASE_PATH ||
  (railwayVolumePath ? path.join(railwayVolumePath, 'kidneycare.db') : 'kidneycare.db');
const databaseDir = path.dirname(databasePath);

if (databaseDir && databaseDir !== '.') {
  fs.mkdirSync(databaseDir, { recursive: true });
}

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-kidneycare-bd';

// ─── Schema: Original Tables ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    division TEXT,
    district TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    age INTEGER,
    sex TEXT,
    weight REAL,
    diabetes BOOLEAN,
    hypertension BOOLEAN,
    family_history BOOLEAN,
    ckd_stage INTEGER,
    risk_score INTEGER,
    assigned_doctor_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(assigned_doctor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS vitals_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    systolic INTEGER,
    diastolic INTEGER,
    blood_sugar REAL,
    creatinine REAL,
    urine_protein TEXT,
    weight REAL,
    edema BOOLEAN,
    fatigue INTEGER,
    medications TEXT,
    logged_by TEXT DEFAULT 'patient',
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS gfr_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    creatinine REAL,
    age INTEGER,
    sex TEXT,
    weight REAL,
    uacr REAL,
    mdrd REAL,
    cg REAL,
    ckd_epi REAL,
    stage INTEGER,
    recommendation TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    doctor_id INTEGER,
    type TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT 0,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id),
    FOREIGN KEY(doctor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_en TEXT,
    title_bn TEXT,
    content_en TEXT,
    content_bn TEXT,
    category TEXT,
    target_stages TEXT
  );
`);

// ─── Schema: New Enhanced Tables ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS chw_workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    region TEXT,
    points INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chw_patient_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chw_id INTEGER,
    patient_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    lat REAL,
    lng REAL,
    visit_type TEXT,
    notes TEXT,
    FOREIGN KEY(chw_id) REFERENCES users(id),
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS chw_patient_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chw_id INTEGER,
    patient_id INTEGER,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chw_id) REFERENCES users(id),
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS teleconsultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER,
    patient_id INTEGER,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    status TEXT DEFAULT 'active',
    notes TEXT,
    FOREIGN KEY(doctor_id) REFERENCES users(id),
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER,
    patient_id INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    medicines TEXT,
    notes TEXT,
    language TEXT DEFAULT 'bn',
    qr_code TEXT,
    FOREIGN KEY(doctor_id) REFERENCES users(id),
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS medication_refills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id INTEGER,
    patient_id INTEGER,
    refill_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    source TEXT DEFAULT 'patient',
    FOREIGN KEY(prescription_id) REFERENCES prescriptions(id),
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS diet_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_name_en TEXT,
    food_name_bn TEXT,
    category TEXT,
    potassium REAL,
    sodium REAL,
    phosphorus REAL,
    allowed_stages TEXT,
    advice_en TEXT,
    advice_bn TEXT
  );

  CREATE TABLE IF NOT EXISTS outcome_cohorts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    patient_ids TEXT,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME,
    created_by INTEGER,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS research_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_by INTEGER,
    cohort_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(requested_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS risk_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER,
    patient_id INTEGER,
    reported_score INTEGER,
    feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(doctor_id) REFERENCES users(id),
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS medication_adherence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    prescription_id INTEGER,
    medicine_name TEXT NOT NULL,
    date TEXT NOT NULL,
    taken INTEGER DEFAULT 1,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id),
    FOREIGN KEY(prescription_id) REFERENCES prescriptions(id),
    UNIQUE(patient_id, prescription_id, medicine_name, date)
  );
`);

// ─── Add new columns to existing tables (safe, idempotent) ──────────────────
const addColumnIfMissing = (table: string, column: string, definition: string) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // Column already exists — ignore
  }
};

addColumnIfMissing('patients', 'arsenic_prone_area', 'BOOLEAN DEFAULT 0');
addColumnIfMissing('patients', 'herbal_remedy_use', 'BOOLEAN DEFAULT 0');
addColumnIfMissing('patients', 'nsaid_use', 'BOOLEAN DEFAULT 0');
addColumnIfMissing('patients', 'uacr', 'REAL');
addColumnIfMissing('patients', 'caregiver_phone', 'TEXT');
addColumnIfMissing('patients', 'pin', 'TEXT');
addColumnIfMissing('patients', 'streak_days', 'INTEGER DEFAULT 0');
addColumnIfMissing('patients', 'last_log_date', 'TEXT');
addColumnIfMissing('gfr_records', 'uacr', 'REAL');
addColumnIfMissing('vitals_log', 'logged_by', 'TEXT DEFAULT "patient"');

// ─── Bangladesh arsenic-prone districts ──────────────────────────────────────
const ARSENIC_DISTRICTS = new Set([
  'Chapainawabganj','Noakhali','Comilla','Munshiganj','Faridpur','Madaripur',
  'Shariatpur','Gopalganj','Bagerhat','Satkhira','Khulna','Jessore','Chuadanga',
  'Meherpur','Kushtia','Rajshahi','Pabna','Sirajganj','Manikganj','Narayanganj',
  'Chandpur','Lakshmipur','Narail','Magura','Jhenaidah'
]);

// ─── Risk Score Calculator ────────────────────────────────────────────────────
function calculateRiskScore(patient: any, district: string): number {
  let score = 0;
  if (patient.age > 60) score += 35;
  else if (patient.age > 40) score += 20;
  if (patient.sex === 'female') score += 10;
  if (patient.diabetes) score += 25;
  if (patient.hypertension) score += 20;
  if (patient.family_history) score += 15;
  if (district && !['Dhaka', 'Chittagong'].includes(district)) score += 5;
  // Bangladesh-specific factors
  if (patient.arsenic_prone_area || ARSENIC_DISTRICTS.has(district)) score += 10;
  if (patient.herbal_remedy_use) score += 5;
  if (patient.nsaid_use) score += 5;
  // UACR modifier
  if (patient.uacr) {
    if (patient.uacr >= 300) score += 15;
    else if (patient.uacr >= 30) score += 8;
  }
  return Math.min(score, 100);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // ─── Heatmap & Reports ────────────────────────────────────────────────────
  const getAdminHeatmapData = () => db.prepare(`
    SELECT u.district as district, COUNT(*) as count, AVG(COALESCE(p.risk_score, 0)) as avg_risk
    FROM users u
    JOIN patients p ON u.id = p.user_id
    WHERE u.role = 'patient' AND u.district IS NOT NULL AND TRIM(u.district) <> ''
    GROUP BY u.district
    ORDER BY count DESC, u.district ASC
  `).all() as Array<{ district: string; count: number; avg_risk: number | null }>;

  const buildPolicyReports = () => {
    const heatmap = getAdminHeatmapData();
    const totalPatients = heatmap.reduce((sum, row) => sum + row.count, 0);
    const nationalAverageRisk = heatmap.length
      ? heatmap.reduce((sum, row) => sum + (row.avg_risk ?? 0), 0) / heatmap.length
      : 0;
    const topDistricts = heatmap.slice(0, 3);
    const reportDate = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date());

    return [
      {
        id: 'resource-allocation-plan',
        title: 'Resource Allocation Plan',
        desc: topDistricts.length
          ? `Prioritize dialysis and specialist capacity in ${topDistricts.map((d) => d.district).join(', ')}.`
          : 'Prioritize dialysis and specialist capacity using district-level patient concentration.',
        date: reportDate,
        filename: `KidneyCareBD_Resource_Allocation_${new Date().toISOString().split('T')[0]}.md`,
        content: [
          '# Resource Allocation Plan',
          `Report date: ${reportDate}`, `Total tracked patients: ${totalPatients}`,
          `Average national risk score: ${nationalAverageRisk.toFixed(1)}`,
          '## High-priority districts',
          ...(topDistricts.map((d, i) => `${i + 1}. ${d.district}: ${d.count} patients, avg risk ${Math.round(d.avg_risk ?? 0)}`)),
          '## Recommended actions',
          '1. Expand screening and nephrology referral capacity in highest-burden districts.',
          '2. Prioritize medicine stock and dialysis support where average risk remains elevated.',
          '3. Reassess district allocations monthly as new patient data arrives.',
        ].join('\n'),
      },
      {
        id: 'rural-screening-initiative',
        title: 'Rural Screening Initiative',
        desc: 'Deploy mobile screening in non-metro districts with elevated CKD risk.',
        date: reportDate,
        filename: `KidneyCareBD_Rural_Screening_${new Date().toISOString().split('T')[0]}.md`,
        content: [
          '# Rural Screening Initiative',
          `Report date: ${reportDate}`,
          '## Rationale',
          'Rural patients often present later in the disease course and have weaker follow-up continuity.',
          '## Suggested focus areas',
          ...(heatmap.filter((d) => !['Dhaka', 'Chittagong'].includes(d.district)).slice(0, 5).map((d, i) =>
            `${i + 1}. ${d.district}: ${d.count} patients, avg risk ${Math.round(d.avg_risk ?? 0)}`
          )),
          '## Operational recommendations',
          '1. Schedule rotating mobile creatinine and blood pressure screening camps.',
          '2. Pair each camp with referral routing to the nearest nephrology-capable center.',
          '3. Track conversion from screening to follow-up visit as a monthly KPI.',
        ].join('\n'),
      },
      {
        id: 'medication-subsidy-impact',
        title: 'Medication Subsidy Impact',
        desc: `Review high-risk patient burden against current subsidy coverage using ${totalPatients} patient records.`,
        date: reportDate,
        filename: `KidneyCareBD_Medication_Subsidy_${new Date().toISOString().split('T')[0]}.md`,
        content: [
          '# Medication Subsidy Impact',
          `Report date: ${reportDate}`, `Tracked patient records: ${totalPatients}`,
          `National average risk score: ${nationalAverageRisk.toFixed(1)}`,
          '## Recommended actions',
          '1. Link subsidy eligibility to risk score and CKD stage progression.',
          '2. Monitor refill adherence alongside vitals deterioration.',
          '3. Re-run the subsidy impact review after each monthly data refresh.',
        ].join('\n'),
      },
      {
        id: 'arsenic-exposure-report',
        title: 'Arsenic Exposure Risk Report',
        desc: 'CKD patients in arsenic-prone districts face elevated nephrotoxic exposure risk.',
        date: reportDate,
        filename: `KidneyCareBD_Arsenic_Risk_${new Date().toISOString().split('T')[0]}.md`,
        content: [
          '# Arsenic Exposure Risk Report',
          `Report date: ${reportDate}`,
          '## Background',
          'Multiple Bangladesh districts have documented groundwater arsenic contamination, linked to increased CKD risk.',
          '## Flagged districts (25 high-risk zones)',
          Array.from(ARSENIC_DISTRICTS).join(', '),
          '## Recommended actions',
          '1. Screen all CKD patients in flagged districts for arsenic biomarkers.',
          '2. Provide safe water access information alongside nephrology care.',
          '3. Track arsenic-prone flag in patient risk scoring systematically.',
        ].join('\n'),
      },
    ];
  };

  // ─── Alert Engine ─────────────────────────────────────────────────────────
  function checkAlerts(patientId: number) {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) as any;
    const latestVitals = db.prepare('SELECT * FROM vitals_log WHERE patient_id = ? ORDER BY date DESC LIMIT 3').all(patientId) as any[];

    if (!latestVitals.length) return;
    const v = latestVitals[0];

    if (v.systolic > 160 || v.diastolic > 100) {
      db.prepare('INSERT INTO alerts (patient_id, doctor_id, type, message) VALUES (?, ?, ?, ?)').run(
        patientId, patient?.assigned_doctor_id, 'CRITICAL', `Dangerously high BP detected: ${v.systolic}/${v.diastolic} mmHg. Immediate review required.`
      );
    } else if (v.systolic > 140 || v.diastolic > 90) {
      db.prepare('INSERT INTO alerts (patient_id, doctor_id, type, message) VALUES (?, ?, ?, ?)').run(
        patientId, patient?.assigned_doctor_id, 'WARNING', `Elevated blood pressure: ${v.systolic}/${v.diastolic} mmHg.`
      );
    }
    if (v.creatinine > 5) {
      db.prepare('INSERT INTO alerts (patient_id, doctor_id, type, message) VALUES (?, ?, ?, ?)').run(
        patientId, patient?.assigned_doctor_id, 'CRITICAL', `Very high creatinine: ${v.creatinine} mg/dL. Urgent nephrology review needed.`
      );
    } else if (v.creatinine > 2) {
      db.prepare('INSERT INTO alerts (patient_id, doctor_id, type, message) VALUES (?, ?, ?, ?)').run(
        patientId, patient?.assigned_doctor_id, 'WARNING', `Elevated creatinine: ${v.creatinine} mg/dL.`
      );
    }
    if (v.edema) {
      db.prepare('INSERT INTO alerts (patient_id, doctor_id, type, message) VALUES (?, ?, ?, ?)').run(
        patientId, patient?.assigned_doctor_id, 'WARNING', 'Patient reported edema/swelling. Fluid management review advised.'
      );
    }
    // Weight change check (>5kg in 7 days)
    if (latestVitals.length >= 2 && latestVitals[0].weight && latestVitals[1].weight) {
      const weightDiff = Math.abs(latestVitals[0].weight - latestVitals[1].weight);
      if (weightDiff > 5) {
        db.prepare('INSERT INTO alerts (patient_id, doctor_id, type, message) VALUES (?, ?, ?, ?)').run(
          patientId, patient?.assigned_doctor_id, 'WARNING', `Rapid weight change detected: ${weightDiff.toFixed(1)} kg.`
        );
      }
    }
  }

  // ─── Streak Tracker ──────────────────────────────────────────────────────
  function updateStreak(patientId: number) {
    const patient = db.prepare('SELECT streak_days, last_log_date FROM patients WHERE id = ?').get(patientId) as any;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak = 1;
    if (patient?.last_log_date === yesterday) {
      newStreak = (patient.streak_days || 0) + 1;
    } else if (patient?.last_log_date === today) {
      newStreak = patient.streak_days || 1;
    }
    db.prepare('UPDATE patients SET streak_days = ?, last_log_date = ? WHERE id = ?').run(newStreak, today, patientId);
  }

  // ─── Plausibility Check ──────────────────────────────────────────────────
  function validateVitals(data: any): string | null {
    if (data.creatinine !== undefined && data.creatinine !== null && data.creatinine !== '') {
      const cr = parseFloat(data.creatinine);
      if (cr < 0.1) return 'Creatinine value too low (< 0.1 mg/dL). Please recheck.';
      if (cr > 30) return 'Creatinine value too high (> 30 mg/dL). Please recheck.';
    }
    if (data.systolic !== undefined && data.systolic !== null && data.systolic !== '') {
      const sys = parseInt(data.systolic);
      if (sys < 70 || sys > 250) return `Systolic BP ${sys} mmHg is outside plausible range (70–250 mmHg).`;
    }
    if (data.diastolic !== undefined && data.diastolic !== null && data.diastolic !== '') {
      const dia = parseInt(data.diastolic);
      if (dia < 40 || dia > 150) return `Diastolic BP ${dia} mmHg is outside plausible range (40–150 mmHg).`;
    }
    if (data.blood_sugar !== undefined && data.blood_sugar !== null && data.blood_sugar !== '') {
      const bs = parseFloat(data.blood_sugar);
      if (bs < 1 || bs > 60) return `Blood sugar ${bs} mmol/L is outside plausible range (1–60 mmol/L).`;
    }
    return null;
  }

  // ─── Seed initial data ────────────────────────────────────────────────────
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    console.log('Database empty, seeding initial data...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // ── Admins ──
    db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run('Admin Officer', 'admin@kidneycare.bd', hashedPassword, 'admin', 'Dhaka');
    db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run('Rahim Chowdhury', 'admin2@kidneycare.bd', hashedPassword, 'admin', 'Chittagong');

    // ── Doctors ──
    const doc1 = db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run('Dr. Ahmed Khan', 'doctor@kidneycare.bd', hashedPassword, 'doctor', 'Dhaka');
    const doc2 = db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run('Dr. Rashida Begum', 'doctor2@kidneycare.bd', hashedPassword, 'doctor', 'Chittagong');
    const doc3 = db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run('Dr. Karim Molla', 'doctor3@kidneycare.bd', hashedPassword, 'doctor', 'Rajshahi');
    const doctorIds = [doc1.lastInsertRowid, doc2.lastInsertRowid, doc3.lastInsertRowid];

    // ── CHWs ──
    const chwSeed = [
      { name: 'CHW Fatema Begum', email: 'chw@kidneycare.bd', district: 'Rajshahi', division: 'Rajshahi' },
      { name: 'CHW Nasrin Akter', email: 'chw2@kidneycare.bd', district: 'Dhaka', division: 'Dhaka' },
      { name: 'CHW Rokeya Khanam', email: 'chw3@kidneycare.bd', district: 'Khulna', division: 'Khulna' },
      { name: 'CHW Momotaz Begum', email: 'chw4@kidneycare.bd', district: 'Sylhet', division: 'Sylhet' },
      { name: 'CHW Shapla Rani', email: 'chw5@kidneycare.bd', district: 'Barisal', division: 'Barisal' },
    ];
    chwSeed.forEach(c => {
      const u = db.prepare('INSERT INTO users (name, email, password, role, district, division) VALUES (?, ?, ?, ?, ?, ?)').run(c.name, c.email, hashedPassword, 'chw', c.district, c.division);
      db.prepare('INSERT INTO chw_workers (user_id, region) VALUES (?, ?)').run(u.lastInsertRowid, c.district);
    });

    // ── 50 Patients across Bangladesh districts ──
    // [name, emailKey, district, age, sex, weight, diabetes, htn, stage, risk, arsenic, herbal, nsaid]
    const patientsSeed: [string,string,string,number,string,number,number,number,number,number,number,number,number][] = [
      ['Abdul Karim', 'dhaka1', 'Dhaka', 52, 'male', 72, 1, 1, 2, 55, 0, 0, 1],
      ['Fatema Khatun', 'dhaka2', 'Dhaka', 45, 'female', 58, 0, 1, 1, 30, 0, 1, 0],
      ['Mohammad Hossain', 'gazipur', 'Gazipur', 60, 'male', 80, 1, 1, 3, 70, 0, 0, 1],
      ['Rahela Begum', 'narayanganj', 'Narayanganj', 38, 'female', 62, 1, 0, 1, 40, 0, 1, 0],
      ['Nurul Islam', 'rajshahi1', 'Rajshahi', 55, 'male', 68, 0, 1, 2, 50, 0, 0, 0],
      ['Sufia Khatun', 'rajshahi2', 'Rajshahi', 48, 'female', 55, 1, 1, 3, 65, 0, 1, 1],
      ['Rahim Uddin', 'ctg1', 'Chittagong', 63, 'male', 75, 1, 1, 4, 80, 0, 0, 1],
      ['Hasina Begum', 'ctg2', 'Chittagong', 42, 'female', 60, 0, 0, 1, 20, 0, 0, 0],
      ['Karim Mia', 'sylhet1', 'Sylhet', 57, 'male', 70, 1, 0, 2, 45, 0, 1, 0],
      ['Bilkis Akter', 'sylhet2', 'Sylhet', 50, 'female', 58, 1, 1, 3, 72, 0, 0, 1],
      ['Jalal Uddin', 'chapai1', 'Chapainawabganj', 49, 'male', 65, 0, 1, 2, 58, 1, 1, 0],
      ['Moriam Begum', 'chapai2', 'Chapainawabganj', 44, 'female', 52, 1, 1, 3, 75, 1, 0, 1],
      ['Abul Kashem', 'noakhali1', 'Noakhali', 66, 'male', 70, 1, 1, 4, 85, 1, 1, 1],
      ['Laila Arjuman', 'noakhali2', 'Noakhali', 39, 'female', 56, 0, 0, 1, 25, 1, 0, 0],
      ['Siraj Mia', 'comilla1', 'Comilla', 53, 'male', 73, 1, 1, 3, 68, 0, 0, 0],
      ['Amena Khatun', 'comilla2', 'Comilla', 41, 'female', 59, 1, 0, 2, 42, 0, 1, 0],
      ['Harun Rashid', 'khulna1', 'Khulna', 58, 'male', 68, 0, 1, 2, 52, 0, 0, 1],
      ['Sabina Yasmin', 'khulna2', 'Khulna', 35, 'female', 54, 0, 0, 1, 18, 0, 0, 0],
      ['Babul Akter', 'barisal1', 'Barisal', 61, 'male', 76, 1, 1, 4, 82, 0, 1, 1],
      ['Razia Sultana', 'barisal2', 'Barisal', 46, 'female', 57, 0, 1, 2, 48, 0, 0, 0],
      ['Jamal Hossain', 'rangpur1', 'Rangpur', 54, 'male', 69, 1, 0, 2, 47, 0, 1, 0],
      ['Minu Akhter', 'rangpur2', 'Rangpur', 37, 'female', 51, 0, 0, 1, 15, 0, 0, 0],
      ['Selim Reza', 'dinajpur', 'Dinajpur', 62, 'male', 74, 1, 1, 4, 78, 0, 0, 1],
      ['Halima Khatun', 'bogra', 'Bogra', 47, 'female', 60, 1, 1, 3, 66, 0, 1, 0],
      ['Anisur Rahman', 'pabna', 'Pabna', 56, 'male', 71, 0, 1, 2, 53, 0, 0, 0],
      ['Taslima Begum', 'sirajganj', 'Sirajganj', 43, 'female', 55, 1, 0, 2, 38, 0, 1, 1],
      ['Mahbub Alam', 'tangail', 'Tangail', 59, 'male', 77, 1, 1, 3, 71, 0, 0, 1],
      ['Nasreen Jahan', 'faridpur', 'Faridpur', 40, 'female', 58, 0, 0, 1, 22, 0, 0, 0],
      ['Kamal Hossain', 'jessore', 'Jessore', 64, 'male', 72, 1, 1, 4, 88, 0, 1, 1],
      ['Begum Rokeya', 'kushtia', 'Kushtia', 45, 'female', 56, 1, 0, 2, 40, 0, 0, 0],
      ['Abdur Rahim', 'mymensingh1', 'Mymensingh', 68, 'male', 66, 1, 1, 5, 92, 0, 1, 1],
      ['Salma Khatun', 'mymensingh2', 'Mymensingh', 52, 'female', 60, 1, 1, 4, 79, 0, 0, 1],
      ['Nurul Amin', 'coxsbazar', "Cox's Bazar", 55, 'male', 70, 0, 1, 2, 49, 0, 1, 0],
      ['Fatema Tuz', 'sunamganj', 'Sunamganj', 44, 'female', 54, 1, 0, 2, 43, 0, 0, 0],
      ['Shahjahan Mia', 'habiganj', 'Habiganj', 57, 'male', 73, 1, 1, 3, 67, 0, 1, 1],
      ['Monowara Begum', 'moulvibazar', 'Moulvibazar', 49, 'female', 58, 0, 1, 2, 44, 0, 0, 0],
      ['Abul Bashar', 'netrokona', 'Netrokona', 61, 'male', 69, 1, 1, 3, 73, 0, 1, 0],
      ['Kamrunnahar', 'sherpur', 'Sherpur', 38, 'female', 52, 0, 0, 1, 17, 0, 0, 0],
      ['Ekramul Haq', 'naogaon', 'Naogaon', 53, 'male', 71, 1, 0, 2, 46, 0, 1, 0],
      ['Sultana Razia', 'natore', 'Natore', 42, 'female', 57, 0, 1, 2, 41, 0, 0, 1],
      ['Mannan Mia', 'narsingdi', 'Narsingdi', 60, 'male', 75, 1, 1, 4, 81, 0, 0, 1],
      ['Shirin Akter', 'manikganj', 'Manikganj', 36, 'female', 53, 0, 0, 1, 19, 0, 0, 0],
      ['Hatem Ali', 'chandpur', 'Chandpur', 65, 'male', 70, 1, 1, 4, 84, 1, 1, 1],
      ['Tahmina Khatun', 'feni', 'Feni', 48, 'female', 59, 1, 0, 2, 39, 1, 0, 0],
      ['Lutfur Rahman', 'lakshmipur', 'Lakshmipur', 56, 'male', 72, 0, 1, 3, 62, 1, 1, 0],
      ['Rokshana Begum', 'magura', 'Magura', 44, 'female', 55, 0, 0, 1, 21, 0, 0, 0],
      ['Delwar Hossain', 'jhenaidah', 'Jhenaidah', 59, 'male', 68, 1, 1, 3, 69, 0, 1, 1],
      ['Feroza Khatun', 'narail', 'Narail', 47, 'female', 56, 1, 0, 2, 37, 0, 0, 0],
      ['Mizanur Rahman', 'satkhira', 'Satkhira', 62, 'male', 74, 1, 1, 4, 83, 0, 0, 1],
      ['Nurunnahar Begum', 'bagerhat', 'Bagerhat', 41, 'female', 58, 0, 1, 2, 45, 0, 1, 0],
    ];

    const patientRecordIds: number[] = [];
    patientsSeed.forEach(([name, key, district, age, sex, weight, diabetes, htn, stage, risk, arsenic, herbal, nsaid], i) => {
      const u = db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run(name, `patient_${key}@kidneycare.bd`, hashedPassword, 'patient', district);
      const doctorId = doctorIds[i % doctorIds.length];
      const isArsenic = ARSENIC_DISTRICTS.has(district) ? 1 : arsenic;
      const p = db.prepare('INSERT INTO patients (user_id, age, sex, weight, diabetes, hypertension, risk_score, ckd_stage, assigned_doctor_id, arsenic_prone_area, herbal_remedy_use, nsaid_use) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(u.lastInsertRowid, age, sex, weight, diabetes, htn, risk, stage, doctorId, isArsenic, herbal, nsaid);
      patientRecordIds.push(Number(p.lastInsertRowid));
    });

    // ── 6-month vitals history for first 10 patients ──
    const vitalStmt = db.prepare('INSERT INTO vitals_log (patient_id, systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema, fatigue, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const proteinOpts = ['Negative', 'Trace', '1+', '2+', '3+'];
    const rnd = (range: number) => (Math.random() - 0.5) * range;
    for (let pi = 0; pi < Math.min(10, patientRecordIds.length); pi++) {
      const patId = patientRecordIds[pi];
      const baseCr = 0.9 + pi * 0.22;
      const baseSys = 122 + pi * 5;
      const baseWt = 55 + pi * 2;
      for (let daysAgo = 180; daysAgo >= 0; daysAgo -= 4) {
        const d = new Date(); d.setDate(d.getDate() - daysAgo);
        const prog = (180 - daysAgo) / 180;
        const cr = Math.max(0.5, +(baseCr + prog * pi * 0.12 + rnd(0.15)).toFixed(2));
        const sys = Math.round(Math.max(100, baseSys + prog * 8 + rnd(8)));
        const dia = Math.round(Math.max(60, 80 + pi * 1.5 + rnd(6)));
        const sugar = Math.max(3, +(5.4 + (pi % 3 === 0 ? 2.5 : 0) + rnd(0.8)).toFixed(1));
        const wt = +(baseWt + rnd(0.8)).toFixed(1);
        const protein = proteinOpts[Math.min(Math.floor(pi / 2.5), 4)];
        vitalStmt.run(patId, sys, dia, sugar, cr, protein, wt, pi > 7 ? 1 : 0, Math.round(4 + pi * 0.5 + rnd(1.5)), d.toISOString());
      }
    }
    // Single vitals for remaining patients
    for (let pi = 10; pi < patientRecordIds.length; pi++) {
      const patId = patientRecordIds[pi];
      vitalStmt.run(patId, 125 + pi, 82 + Math.floor(pi / 2), 5.5, +(1.0 + pi * 0.1).toFixed(1), 'Negative', 60 + pi % 20, 0, 4, new Date().toISOString());
    }

    // ── GFR history for first 10 patients (every 30 days, 6 months) ──
    const gfrStmt = db.prepare('INSERT INTO gfr_records (patient_id, creatinine, age, sex, weight, mdrd, cg, ckd_epi, stage, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (let pi = 0; pi < Math.min(10, patientRecordIds.length); pi++) {
      const patId = patientRecordIds[pi];
      const [,, , age,sex, weight,,, stage] = patientsSeed[pi];
      for (let daysAgo = 150; daysAgo >= 0; daysAgo -= 30) {
        const d = new Date(); d.setDate(d.getDate() - daysAgo);
        const cr = +(0.9 + pi * 0.22 + (daysAgo / 150) * 0.25).toFixed(2);
        const gfr = Math.max(8, 115 - pi * 13 - (150 - daysAgo) / 15);
        gfrStmt.run(patId, cr, age, sex, weight, +gfr.toFixed(1), +(gfr * 0.96).toFixed(1), +(gfr * 1.04).toFixed(1), stage, d.toISOString());
      }
    }

    // ── 15 Bilingual Education Articles ──
    const articles = [
      { en: 'Understanding CKD Stages', bn: 'সিকেডি পর্যায়গুলি বোঝা', cat: 'Basics',
        ce: 'CKD is divided into 5 stages based on GFR. Stage 1 (GFR ≥90) is mild damage with normal function. Stage 2 (GFR 60-89) shows mild reduction. Stage 3 (GFR 30-59) is moderate — specialist referral needed. Stage 4 (GFR 15-29) is severe and requires preparation for kidney replacement therapy. Stage 5 (GFR <15) is kidney failure. Regular GFR testing every 3–6 months is essential for monitoring progression.',
        cb: 'সিকেডি জিএফআরের উপর ভিত্তি করে ৫টি পর্যায়ে বিভক্ত। পর্যায় ১ (জিএফআর ≥৯০) স্বাভাবিক কার্যকারিতা সহ মৃদু ক্ষতি। পর্যায় ৩ মাঝারি — বিশেষজ্ঞ রেফারেল প্রয়োজন। পর্যায় ৫ কিডনি বিকল — ডায়ালাইসিস বা প্রতিস্থাপন প্রয়োজন। প্রতি ৩-৬ মাসে নিয়মিত জিএফআর পরীক্ষা অপরিহার্য।' },
      { en: 'Kidney-Friendly Diet for Bangladeshis', bn: 'বাংলাদেশিদের জন্য কিডনি-বান্ধব ডায়েট', cat: 'Diet',
        ce: 'Limit sodium to 2000mg/day — avoid shutki (dried fish), pickles, and processed snacks. Avoid high-potassium foods (bananas, coconut water, spinach, dal) in stage 3+. White rice is better than red rice. Good choices: bottle gourd (lau), cauliflower, cabbage, cucumber, apple, egg whites, skinless chicken. Boil vegetables and discard water to reduce potassium by 50%. Consult a dietitian for your specific CKD stage.',
        cb: 'সোডিয়াম দৈনিক ২০০০ মিগ্রায় সীমিত করুন — শুঁটকি, আচার এবং প্রক্রিয়াজাত স্ন্যাকস এড়িয়ে চলুন। পর্যায় ৩+ এ উচ্চ পটাশিয়ামযুক্ত খাবার (কলা, ডাবের পানি, পালং শাক, ডাল) এড়িয়ে চলুন। সবজি সিদ্ধ করে পানি ফেলে দিলে পটাশিয়াম ৫০% কমে।' },
      { en: 'Managing Hypertension with CKD', bn: 'সিকেডি সহ উচ্চ রক্তচাপ ব্যবস্থাপনা', cat: 'Management',
        ce: 'Target BP for CKD patients is below 130/80 mmHg. ACE inhibitors or ARBs are recommended — they protect kidneys beyond just lowering BP. Take medications every day, even when you feel well. Reduce salt intake, walk 30 min/day 5 days/week, and maintain healthy weight. Monitor BP at home daily. If BP is consistently above 140/90, contact your doctor immediately.',
        cb: 'সিকেডি রোগীদের লক্ষ্য রক্তচাপ ১৩০/৮০ মিমিএইচজি এর নিচে। এসিই ইনহিবিটর বা এআরবি সুপারিশ করা হয় — এগুলো শুধু রক্তচাপ কমায় না, কিডনিও রক্ষা করে। প্রতিদিন ওষুধ খান, এমনকি সুস্থ অনুভব করলেও।' },
      { en: 'Diabetes and Kidney Disease', bn: 'ডায়াবেটিস এবং কিডনি রোগ', cat: 'Management',
        ce: 'Diabetic nephropathy is the #1 cause of CKD in Bangladesh. Keep HbA1c below 7% to protect kidneys. Check blood sugar daily. Avoid NSAIDs (ibuprofen, naproxen) which harm kidneys. Ask your doctor about SGLT2 inhibitors (empagliflozin, dapagliflozin) which protect kidneys in diabetic CKD. Never skip insulin or diabetes medications.',
        cb: 'ডায়াবেটিক নেফ্রোপ্যাথি বাংলাদেশে সিকেডির ১নং কারণ। কিডনি রক্ষা করতে HbA1c ৭% এর নিচে রাখুন। আইবুপ্রোফেন, ন্যাপ্রক্সেন এড়িয়ে চলুন যা কিডনির ক্ষতি করে।' },
      { en: 'Dialysis Options in Bangladesh', bn: 'বাংলাদেশে ডায়ালাইসিস বিকল্প', cat: 'Treatment',
        ce: 'When kidneys fail (Stage 5), options are hemodialysis (3 sessions/week, 4hrs each; government hospitals: 12,000–20,000 BDT/month) or peritoneal dialysis (home-based, daily). Kidney transplant costs 5–8 lakh BDT. Subsidized care available at BSMMU, DMCH, Chittagong Medical College, and Rajshahi Medical College. Apply for government kidney patient assistance scheme. Early referral gives better outcomes.',
        cb: 'কিডনি বিকল হলে (পর্যায় ৫), হেমোডায়ালাইসিস (সপ্তাহে ৩ বার; সরকারি হাসপাতালে মাসে ১২,০০০–২০,০০০ টাকা) বা পেরিটোনিয়াল ডায়ালাইসিস (ঘরে, প্রতিদিন) বিকল্প। বিএসএমএমইউ, ডিএমসিএইচ-এ ভর্তুকিপ্রাপ্ত সেবা পাওয়া যায়।' },
      { en: 'Arsenic Exposure and CKD in Bangladesh', bn: 'বাংলাদেশে আর্সেনিক এক্সপোজার ও সিকেডি', cat: 'Basics',
        ce: 'Over 20 districts have arsenic-contaminated groundwater, including Chapainawabganj, Noakhali, Chandpur, Faridpur, and Satkhira. Chronic arsenic exposure damages kidney tubules and raises CKD risk by 30–40%. Use BRAC-certified safe water, boil water, or use arsenic-removal filters. Get annual urine arsenic testing if you live in a red-zone district. Report symptoms like keratosis, darkening skin, or fatigue.',
        cb: 'চাঁপাইনবাবগঞ্জ, নোয়াখালী, চাঁদপুর, ফরিদপুর, সাতক্ষীরা সহ ২০+ জেলায় আর্সেনিক দূষিত ভূগর্ভস্থ পানি রয়েছে। দীর্ঘস্থায়ী এক্সপোজার সিকেডি ঝুঁকি ৩০-৪০% বাড়ায়। ব্র্যাক-প্রত্যয়িত নিরাপদ পানি ব্যবহার করুন।' },
      { en: 'Understanding Your GFR Result', bn: 'আপনার জিএফআর ফলাফল বোঝা', cat: 'Basics',
        ce: 'GFR measures kidney filtration efficiency. Normal is ≥90 mL/min/1.73m². Three formulas (MDRD, Cockcroft-Gault, CKD-EPI) use creatinine, age, sex, and weight. A drop of >5 mL/min/year suggests rapid progression. Track trends over time — a single result is less meaningful than a pattern. UACR (protein in urine) combined with GFR gives the most accurate CKD classification under KDIGO guidelines.',
        cb: 'জিএফআর কিডনির ফিল্ট্রেশন দক্ষতা পরিমাপ করে। স্বাভাবিক ≥৯০। বছরে >৫ হ্রাস দ্রুত অগ্রগতির ইঙ্গিত। ইউএসিআর সহ জিএফআর সবচেয়ে সঠিক সিকেডি শ্রেণীবদ্ধকরণ দেয়।' },
      { en: 'Herbal Remedies and Kidney Damage', bn: 'ভেষজ প্রতিকার এবং কিডনির ক্ষতি', cat: 'Basics',
        ce: 'Many traditional herbal medicines (kabiraji medicine, certain roots, bark extracts) contain aristolochic acid or heavy metals that cause irreversible kidney damage. This is called herbal nephropathy. Always inform your doctor about ALL traditional remedies you take. Never mix herbal and prescribed medicines without medical guidance. Studies show herbal remedy use is associated with 2x higher CKD risk in Bangladesh.',
        cb: 'অনেক ঐতিহ্যবাহী ভেষজ ওষুধে অ্যারিস্টোলোকিক অ্যাসিড বা ভারী ধাতু থাকে যা অপরিবর্তনীয় কিডনির ক্ষতি করে। সকল ঐতিহ্যবাহী ওষুধ সম্পর্কে আপনার ডাক্তারকে অবহিত করুন।' },
      { en: 'UACR and Protein in Urine Explained', bn: 'ইউএসিআর এবং প্রস্রাবে প্রোটিন ব্যাখ্যা', cat: 'Basics',
        ce: 'UACR (Urine Albumin-to-Creatinine Ratio) measures protein leaking into urine — a key sign of kidney damage. Normal: <30 mg/g (A1). Moderately increased: 30–300 mg/g (A2). Severely increased: ≥300 mg/g (A3). High UACR means kidney filters are damaged. Test UACR every 6–12 months. Reducing proteinuria with ACE inhibitors slows CKD progression significantly.',
        cb: 'ইউএসিআর প্রস্রাবে প্রোটিন লিকেজ পরিমাপ করে। স্বাভাবিক: <৩০ মিগ্রা/গ্রা। মধ্যম: ৩০-৩০০ মিগ্রা/গ্রা। মারাত্মক: ≥৩০০ মিগ্রা/গ্রা। প্রতি ৬-১২ মাসে পরীক্ষা করুন।' },
      { en: 'Exercise for CKD Patients', bn: 'সিকেডি রোগীদের জন্য ব্যায়াম', cat: 'Management',
        ce: 'Regular moderate exercise controls BP, blood sugar, and weight — all critical for CKD. Aim for 30 min brisk walking, 5 days/week. Swimming and gentle yoga are excellent low-impact options. Avoid heavy lifting if eGFR <30. Exercise after dialysis sessions, not during. Start slowly if you have been inactive. Always consult your nephrologist before beginning a new program.',
        cb: 'নিয়মিত মাঝারি ব্যায়াম রক্তচাপ, রক্তে শর্করা এবং ওজন নিয়ন্ত্রণ করে। সপ্তাহে ৫ দিন ৩০ মিনিট দ্রুত হাঁটুন। সাঁতার এবং মৃদু যোগব্যায়াম চমৎকার বিকল্প।' },
      { en: 'Limiting Salt and Sodium in CKD', bn: 'সিকেডিতে লবণ ও সোডিয়াম সীমাবদ্ধতা', cat: 'Diet',
        ce: 'Limit sodium to 2000mg/day (≈1 teaspoon of salt). High sodium raises BP and worsens CKD. Avoid: shutki (dried fish — 9800mg Na/100g!), soy sauce, pickles, packaged chips, instant noodles. Cook at home using turmeric, cumin, ginger, lemon for flavor. Read nutrition labels. Reducing sodium can lower BP by 5–10 mmHg in CKD patients.',
        cb: 'সোডিয়াম দৈনিক ২০০০ মিগ্রায় সীমিত করুন (≈১ চা চামচ লবণ)। শুঁটকি (১০০ গ্রামে ৯৮০০ মিগ্রা সোডিয়াম!), সয় সস, আচার এড়িয়ে চলুন। রান্নায় হলুদ, জিরা, আদা, লেবু ব্যবহার করুন।' },
      { en: 'Taking Medications Correctly in CKD', bn: 'সিকেডিতে সঠিকভাবে ওষুধ গ্রহণ', cat: 'Management',
        ce: 'Never skip BP medications, diabetes medications, phosphate binders, or vitamin D supplements. Set daily phone alarms. Use a weekly pill organizer. Never stop medications without your doctor\'s approval — even if you feel well. Some medicines (NSAIDs, contrast dye for CT scans, certain antibiotics) are harmful to kidneys — always mention your CKD to every doctor you see.',
        cb: 'রক্তচাপের ওষুধ, ডায়াবেটিসের ওষুধ, ফসফেট বাইন্ডার বাদ দেবেন না। দৈনিক ফোন অ্যালার্ম সেট করুন। কিছু ওষুধ (NSAIDs, CT স্ক্যান কনট্রাস্ট ডাই) কিডনির ক্ষতি করে — প্রতিটি ডাক্তারকে আপনার সিকেডির কথা জানান।' },
      { en: 'CKD in Women: What You Need to Know', bn: 'মহিলাদের সিকেডি: জরুরি তথ্য', cat: 'Basics',
        ce: 'CKD in women presents unique challenges: anemia is more common, hormonal changes can affect CKD progression, and pregnancy with stage 4-5 CKD carries high risk of premature birth and maternal complications. Women of childbearing age should discuss contraception with their nephrologist. Iron supplementation is often needed for CKD anemia. Symptoms like excessive fatigue, swollen ankles, and frequent urination at night warrant kidney testing.',
        cb: 'মহিলাদের সিকেডি অনন্য চ্যালেঞ্জ উপস্থাপন করে: রক্তশূন্যতা বেশি সাধারণ। পর্যায় ৪-৫ সিকেডিতে গর্ভাবস্থা উচ্চ ঝুঁকি বহন করে। সন্তান জন্মদানের বয়সী মহিলারা নেফ্রোলজিস্টের সাথে গর্ভনিরোধ নিয়ে আলোচনা করুন।' },
      { en: 'Managing Potassium Levels in CKD', bn: 'সিকেডিতে পটাশিয়াম ব্যবস্থাপনা', cat: 'Diet',
        ce: 'Damaged kidneys cannot remove excess potassium, causing hyperkalemia which can trigger dangerous heart arrhythmias. Avoid: bananas, coconut water, spinach, lentils (dal), tomatoes, potatoes, and jackfruit in stage 3+. Tip: boiling vegetables and discarding the water reduces potassium by 50%. Check serum potassium every 3 months. Target: 3.5–5.0 mEq/L. Seek emergency care if you feel heart palpitations.',
        cb: 'ক্ষতিগ্রস্ত কিডনি অতিরিক্ত পটাশিয়াম সরাতে পারে না। কলা, ডাবের পানি, পালং শাক, ডাল, টমেটো, আলু পর্যায় ৩+ এ এড়িয়ে চলুন। সবজি সিদ্ধ করে পানি ফেলুন — পটাশিয়াম ৫০% কমে।' },
      { en: 'Staying Hydrated with CKD', bn: 'সিকেডিতে সঠিক পানি পান', cat: 'Management',
        ce: 'Hydration needs vary by CKD stage. Early stages (1-3): drink 1.5–2L/day unless restricted. Later stages with fluid retention or reduced urine output: your doctor may limit fluids. Monitor swelling (edema) in feet, legs, or face — this indicates fluid buildup. Avoid sugary drinks and sodas. Track daily urine output — less than 500mL/day is concerning. Report changes to your doctor promptly.',
        cb: 'প্রাথমিক পর্যায় (১-৩): দিনে ১.৫-২ লিটার পান করুন। পরবর্তী পর্যায়ে আপনার ডাক্তার তরল সীমিত করতে পারেন। পায়ে, পায়ের পাতায় বা মুখে ফুলে যাওয়া পর্যবেক্ষণ করুন — তরল জমার লক্ষণ।' },
    ];
    const insertArt = db.prepare('INSERT INTO articles (title_en, title_bn, content_en, content_bn, category) VALUES (?, ?, ?, ?, ?)');
    articles.forEach(a => insertArt.run(a.en, a.bn, a.ce, a.cb, a.cat));

    console.log('Seeding complete.');
  }

  // ─── Seed diet suggestions ────────────────────────────────────────────────
  const dietCount = db.prepare('SELECT COUNT(*) as count FROM diet_suggestions').get() as any;
  if (dietCount.count === 0) {
    const foods = [
      // ── Fruits ──
      { en: 'Apple', bn: 'আপেল', cat: 'Fruit', k: 195, na: 2, p: 20, stages: '1,2,3,4,5', ae: 'Safe for all CKD stages — low potassium and phosphorus.', ab: 'সব পর্যায়ে নিরাপদ — কম পটাশিয়াম এবং ফসফরাস।' },
      { en: 'Banana', bn: 'কলা', cat: 'Fruit', k: 422, na: 1, p: 22, stages: '1,2', ae: 'Limit in stages 3-5 due to high potassium.', ab: 'পর্যায় ৩-৫ এ পটাশিয়াম বেশি থাকায় পরিমিত খান।' },
      { en: 'Watermelon', bn: 'তরমুজ', cat: 'Fruit', k: 170, na: 2, p: 11, stages: '1,2,3,4,5', ae: 'Low potassium — excellent refreshing choice for CKD.', ab: 'কম পটাশিয়াম — সিকেডির জন্য চমৎকার তাজা পছন্দ।' },
      { en: 'Papaya', bn: 'পেঁপে', cat: 'Fruit', k: 264, na: 8, p: 10, stages: '1,2,3', ae: 'Moderate potassium — safe in early CKD.', ab: 'মধ্যম পটাশিয়াম — প্রাথমিক সিকেডিতে নিরাপদ।' },
      { en: 'Guava', bn: 'পেয়ারা', cat: 'Fruit', k: 417, na: 2, p: 40, stages: '1,2', ae: 'High potassium — limit in stage 3+.', ab: 'পটাশিয়াম বেশি — পর্যায় ৩+ এ সীমিত করুন।' },
      { en: 'Pineapple', bn: 'আনারস', cat: 'Fruit', k: 109, na: 1, p: 8, stages: '1,2,3,4,5', ae: 'Low potassium — safe for most CKD stages.', ab: 'কম পটাশিয়াম — বেশিরভাগ সিকেডি পর্যায়ে নিরাপদ।' },
      { en: 'Lemon', bn: 'লেবু', cat: 'Fruit', k: 138, na: 2, p: 16, stages: '1,2,3,4,5', ae: 'Low potassium; use for flavoring instead of salt.', ab: 'কম পটাশিয়াম; লবণের পরিবর্তে স্বাদের জন্য ব্যবহার করুন।' },
      { en: 'Mango (small portion)', bn: 'আম (ছোট অংশ)', cat: 'Fruit', k: 168, na: 2, p: 14, stages: '1,2,3', ae: 'Moderate potassium; enjoy in small portions in stage 3.', ab: 'মধ্যম পটাশিয়াম; পর্যায় ৩ তে ছোট অংশে উপভোগ করুন।' },
      { en: 'Jackfruit (ripe)', bn: 'পাকা কাঁঠাল', cat: 'Fruit', k: 448, na: 3, p: 36, stages: '1,2', ae: 'High potassium — limit to small amounts in stage 3+.', ab: 'পটাশিয়াম বেশি — পর্যায় ৩+ এ সীমিত পরিমাণে খান।' },
      { en: 'Starfruit (Kamranga)', bn: 'কামরাঙা', cat: 'Fruit', k: 133, na: 2, p: 12, stages: '1,2', ae: 'CAUTION: Contains nephrotoxic oxalic acid — avoid in stage 3+.', ab: 'সতর্কতা: নেফ্রোটক্সিক অক্সালিক অ্যাসিড রয়েছে — পর্যায় ৩+ এ এড়িয়ে চলুন।' },
      { en: 'Coconut Water', bn: 'ডাবের পানি', cat: 'Beverage', k: 600, na: 252, p: 48, stages: '1', ae: 'Very high potassium — avoid in CKD stage 2+.', ab: 'পটাশিয়াম অনেক বেশি — সিকেডি পর্যায় ২+ এ এড়িয়ে চলুন।' },
      // ── Vegetables ──
      { en: 'Bottle Gourd (Lau)', bn: 'লাউ', cat: 'Vegetable', k: 170, na: 2, p: 20, stages: '1,2,3,4,5', ae: 'Excellent low-potassium vegetable for CKD.', ab: 'সিকেডির জন্য চমৎকার কম পটাশিয়ামের সবজি।' },
      { en: 'Cauliflower', bn: 'ফুলকপি', cat: 'Vegetable', k: 320, na: 30, p: 44, stages: '1,2,3,4,5', ae: 'Excellent kidney-friendly vegetable.', ab: 'চমৎকার কিডনি-বান্ধব সবজি।' },
      { en: 'Cabbage', bn: 'বাঁধাকপি', cat: 'Vegetable', k: 170, na: 18, p: 26, stages: '1,2,3,4,5', ae: 'Very kidney-friendly; low in all minerals.', ab: 'খুব কিডনি-বান্ধব; সব খনিজে কম।' },
      { en: 'Spinach', bn: 'পালং শাক', cat: 'Vegetable', k: 839, na: 65, p: 49, stages: '1,2', ae: 'Very high potassium — avoid in stage 3+.', ab: 'পটাশিয়াম অনেক বেশি — পর্যায় ৩+ এ এড়িয়ে চলুন।' },
      { en: 'Bitter Gourd (Karela)', bn: 'করলা', cat: 'Vegetable', k: 296, na: 5, p: 31, stages: '1,2,3,4,5', ae: 'Good for diabetic CKD patients; moderate potassium.', ab: 'ডায়াবেটিক সিকেডি রোগীর জন্য ভালো।' },
      { en: 'Ridge Gourd (Jhinga)', bn: 'ঝিঙে', cat: 'Vegetable', k: 139, na: 3, p: 30, stages: '1,2,3,4,5', ae: 'Very low potassium and sodium — ideal for CKD diet.', ab: 'খুব কম পটাশিয়াম ও সোডিয়াম — সিকেডি ডায়েটের জন্য আদর্শ।' },
      { en: 'Pointed Gourd (Potol)', bn: 'পটল', cat: 'Vegetable', k: 160, na: 3, p: 29, stages: '1,2,3,4,5', ae: 'Good low-mineral vegetable for daily CKD diet.', ab: 'দৈনিক সিকেডি ডায়েটের জন্য ভালো কম-খনিজ সবজি।' },
      { en: 'Ash Gourd (Chalkumra)', bn: 'চালকুমড়া', cat: 'Vegetable', k: 130, na: 18, p: 19, stages: '1,2,3,4,5', ae: 'Very kidney-friendly; traditional Bangladeshi vegetable.', ab: 'খুব কিডনি-বান্ধব; ঐতিহ্যবাহী বাংলাদেশী সবজি।' },
      { en: 'Eggplant (Begun)', bn: 'বেগুন', cat: 'Vegetable', k: 229, na: 2, p: 24, stages: '1,2,3,4,5', ae: 'Moderate potassium; safe for most CKD stages.', ab: 'মধ্যম পটাশিয়াম; বেশিরভাগ সিকেডি পর্যায়ে নিরাপদ।' },
      { en: 'Radish (Mula)', bn: 'মুলা', cat: 'Vegetable', k: 233, na: 39, p: 20, stages: '1,2,3,4,5', ae: 'Low potassium; great for CKD patients.', ab: 'কম পটাশিয়াম; সিকেডি রোগীদের জন্য দুর্দান্ত।' },
      { en: 'Green Beans (Shim)', bn: 'শিম', cat: 'Vegetable', k: 209, na: 6, p: 38, stages: '1,2,3,4,5', ae: 'Low potassium; excellent fiber source for CKD.', ab: 'কম পটাশিয়াম; সিকেডির জন্য চমৎকার ফাইবার উৎস।' },
      { en: 'Cucumber', bn: 'শসা', cat: 'Vegetable', k: 147, na: 2, p: 24, stages: '1,2,3,4,5', ae: 'Very low in all minerals; excellent daily food for CKD.', ab: 'সব খনিজে খুব কম; সিকেডির জন্য চমৎকার দৈনিক খাবার।' },
      { en: 'Tomato (small)', bn: 'টমেটো', cat: 'Vegetable', k: 237, na: 5, p: 24, stages: '1,2,3', ae: 'Moderate potassium — limit to half a tomato in stage 4+.', ab: 'মধ্যম পটাশিয়াম — পর্যায় ৪+ এ অর্ধেক টমেটোতে সীমিত করুন।' },
      { en: 'Sweet Pumpkin (Kumra)', bn: 'মিষ্টি কুমড়া', cat: 'Vegetable', k: 340, na: 1, p: 44, stages: '1,2,3', ae: 'Moderate potassium; limit in advanced CKD.', ab: 'মধ্যম পটাশিয়াম; উন্নত সিকেডিতে সীমিত করুন।' },
      { en: 'Potato (boiled, drained)', bn: 'সিদ্ধ আলু (পানি ঝরানো)', cat: 'Vegetable', k: 328, na: 5, p: 57, stages: '1,2,3', ae: 'Boiling and discarding water reduces potassium by 50%.', ab: 'সিদ্ধ করে পানি ফেলে দিলে পটাশিয়াম ৫০% কমে।' },
      { en: 'Sweet Potato', bn: 'মিষ্টি আলু', cat: 'Vegetable', k: 475, na: 55, p: 54, stages: '1,2', ae: 'High potassium — boil and discard water; limit stage 3+.', ab: 'পটাশিয়াম বেশি — সিদ্ধ করে পানি ফেলুন; পর্যায় ৩+ এ সীমিত করুন।' },
      // ── Grains ──
      { en: 'White Rice', bn: 'সাদা চাল', cat: 'Grain', k: 55, na: 1, p: 68, stages: '1,2,3,4,5', ae: 'Preferred over red/brown rice — lower phosphorus.', ab: 'লাল চালের চেয়ে কম ফসফরাস — সাদা চাল ভালো।' },
      { en: 'Red Rice', bn: 'লাল চাল', cat: 'Grain', k: 154, na: 7, p: 162, stages: '1,2', ae: 'High phosphorus — use white rice instead for stage 3+.', ab: 'ফসফরাস বেশি — পর্যায় ৩+ এ সাদা চাল ব্যবহার করুন।' },
      { en: 'Puffed Rice (Muri)', bn: 'মুড়ি', cat: 'Grain', k: 150, na: 3, p: 63, stages: '1,2,3,4,5', ae: 'Good low-sodium snack option for CKD.', ab: 'সিকেডির জন্য ভালো কম-সোডিয়াম স্ন্যাক।' },
      { en: 'Flattened Rice (Chira)', bn: 'চিড়া', cat: 'Grain', k: 157, na: 8, p: 126, stages: '1,2,3,4', ae: 'Moderate phosphorus; better than bread for CKD.', ab: 'মধ্যম ফসফরাস; সিকেডিতে রুটির চেয়ে ভালো।' },
      { en: 'Semolina (Suji)', bn: 'সুজি', cat: 'Grain', k: 152, na: 1, p: 136, stages: '1,2,3,4', ae: 'Low potassium; moderate phosphorus — good CKD breakfast.', ab: 'কম পটাশিয়াম; মধ্যম ফসফরাস — ভালো সিকেডি সকালের নাস্তা।' },
      { en: 'Vermicelli (Semai)', bn: 'সেমাই', cat: 'Grain', k: 67, na: 5, p: 61, stages: '1,2,3,4,5', ae: 'Low potassium; kidney-friendly festive food in moderation.', ab: 'কম পটাশিয়াম; পরিমিতভাবে কিডনি-বান্ধব উৎসবের খাবার।' },
      { en: 'White Bread', bn: 'পাউরুটি (সাদা)', cat: 'Grain', k: 74, na: 490, p: 57, stages: '1,2,3', ae: 'High sodium — limit to 1-2 slices; avoid in hypertensive CKD.', ab: 'সোডিয়াম বেশি — ১-২ স্লাইসে সীমিত করুন।' },
      // ── Proteins ──
      { en: 'Egg White', bn: 'ডিমের সাদা অংশ', cat: 'Protein', k: 54, na: 55, p: 5, stages: '1,2,3,4,5', ae: 'High-quality low-phosphorus protein source.', ab: 'উচ্চমানের কম ফসফরাসযুক্ত প্রোটিন।' },
      { en: 'Whole Egg', bn: 'পুরো ডিম', cat: 'Protein', k: 126, na: 142, p: 172, stages: '1,2,3', ae: 'Good protein but high phosphorus — limit to 1/day in stage 4+.', ab: 'ভালো প্রোটিন কিন্তু ফসফরাস বেশি — পর্যায় ৪+ এ দিনে ১টিতে সীমিত করুন।' },
      { en: 'Chicken (skinless)', bn: 'মুরগির মাংস (চামড়া ছাড়া)', cat: 'Protein', k: 256, na: 74, p: 220, stages: '1,2,3,4,5', ae: 'Good protein, moderate phosphorus — limit to 3oz per meal.', ab: 'ভালো প্রোটিন, মধ্যম ফসফরাস — প্রতি খাবারে ৩ আউন্সে সীমিত করুন।' },
      { en: 'Small Freshwater Fish', bn: 'ছোট মিঠা পানির মাছ', cat: 'Protein', k: 350, na: 70, p: 200, stages: '1,2,3', ae: 'Good protein source; limit portions in stage 4-5.', ab: 'ভালো প্রোটিন; পর্যায় ৪-৫ এ পরিমাণ সীমিত করুন।' },
      { en: 'Hilsa Fish (Ilish)', bn: 'ইলিশ মাছ', cat: 'Protein', k: 400, na: 110, p: 280, stages: '1,2,3', ae: 'Good protein but moderate-high phosphorus; limit portion.', ab: 'ভালো প্রোটিন কিন্তু মধ্যম-উচ্চ ফসফরাস; ছোট অংশে খান।' },
      { en: 'Rohu Fish', bn: 'রুই মাছ', cat: 'Protein', k: 320, na: 65, p: 210, stages: '1,2,3', ae: 'Common Bangladeshi fish; moderate phosphorus — limit in stage 4+.', ab: 'সাধারণ বাংলাদেশী মাছ; মধ্যম ফসফরাস — পর্যায় ৪+ এ সীমিত করুন।' },
      { en: 'Lentils (Masur Dal)', bn: 'মসুর ডাল', cat: 'Protein', k: 730, na: 4, p: 180, stages: '1,2', ae: 'High potassium and phosphorus — limit to 1-2 times/week in stage 3+.', ab: 'পটাশিয়াম ও ফসফরাস বেশি — পর্যায় ৩+ এ সপ্তাহে ১-২ বার সীমিত করুন।' },
      { en: 'Mung Beans (Mung Dal)', bn: 'মুগ ডাল', cat: 'Protein', k: 369, na: 15, p: 99, stages: '1,2,3', ae: 'Lower phosphorus than other dals; better choice for CKD.', ab: 'অন্য ডালের তুলনায় কম ফসফরাস; সিকেডির জন্য ভালো পছন্দ।' },
      { en: 'Dried Fish (Shutki)', bn: 'শুঁটকি মাছ', cat: 'Protein', k: 2100, na: 9800, p: 1100, stages: '', ae: 'AVOID: Extremely high sodium — strictly avoid in all CKD stages.', ab: 'এড়িয়ে চলুন: অত্যন্ত উচ্চ সোডিয়াম — সব সিকেডি পর্যায়ে কঠোরভাবে এড়িয়ে চলুন।' },
      // ── Dairy ──
      { en: 'Full-Fat Milk', bn: 'গরুর দুধ (ফুল ফ্যাট)', cat: 'Dairy', k: 322, na: 107, p: 247, stages: '1,2', ae: 'High phosphorus — limit to ½ cup/day in stage 3+.', ab: 'ফসফরাস বেশি — পর্যায় ৩+ এ দিনে আধা কাপে সীমিত করুন।' },
      { en: 'Yogurt (Dahi)', bn: 'দই', cat: 'Dairy', k: 141, na: 36, p: 105, stages: '1,2,3', ae: 'Moderate phosphorus; limit to ¼ cup in stage 4+.', ab: 'মধ্যম ফসফরাস; পর্যায় ৪+ এ ¼ কাপে সীমিত করুন।' },
      // ── Oils & Spices ──
      { en: 'Mustard Oil', bn: 'সরিষার তেল', cat: 'Oil', k: 0, na: 0, p: 0, stages: '1,2,3,4,5', ae: 'Good for cooking; zero potassium/sodium. Use in moderation.', ab: 'রান্নার জন্য ভালো; শূন্য পটাশিয়াম/সোডিয়াম। পরিমিত ব্যবহার করুন।' },
      { en: 'Turmeric (Halud)', bn: 'হলুদ', cat: 'Spice', k: 2525, na: 38, p: 299, stages: '1,2,3,4,5', ae: 'Used in tiny amounts — anti-inflammatory; minimal impact on minerals.', ab: 'সামান্য পরিমাণে ব্যবহৃত — প্রদাহবিরোধী; খনিজে ন্যূনতম প্রভাব।' },
      { en: 'Cumin (Jeera)', bn: 'জিরা', cat: 'Spice', k: 1788, na: 168, p: 499, stages: '1,2,3,4,5', ae: 'Used in tiny amounts — safe salt-free flavor alternative.', ab: 'সামান্য পরিমাণে ব্যবহৃত — নিরাপদ লবণমুক্ত স্বাদ বিকল্প।' },
      { en: 'Garlic', bn: 'রসুন', cat: 'Spice', k: 401, na: 17, p: 153, stages: '1,2,3,4,5', ae: 'Used in small amounts as flavor — heart-healthy; fine for CKD.', ab: 'স্বাদের জন্য অল্প পরিমাণে ব্যবহৃত — হৃদয়-স্বাস্থ্যকর।' },
      { en: 'Ginger', bn: 'আদা', cat: 'Spice', k: 415, na: 13, p: 34, stages: '1,2,3,4,5', ae: 'Anti-inflammatory; safe as spice in normal cooking amounts.', ab: 'প্রদাহবিরোধী; স্বাভাবিক রান্নার পরিমাণে নিরাপদ।' },
      { en: 'Green Chili', bn: 'কাঁচা মরিচ', cat: 'Spice', k: 340, na: 7, p: 43, stages: '1,2,3,4,5', ae: 'Low sodium; used in small amounts — fine for CKD.', ab: 'কম সোডিয়াম; অল্প পরিমাণে ব্যবহৃত — সিকেডির জন্য ঠিক।' },
      { en: 'Salt (table)', bn: 'লবণ', cat: 'Condiment', k: 8, na: 38758, p: 3, stages: '', ae: 'LIMIT STRICTLY — high sodium worsens hypertension and CKD progression.', ab: 'কঠোরভাবে সীমিত করুন — উচ্চ সোডিয়াম সিকেডি আরও খারাপ করে।' },
      // ── Beverages ──
      { en: 'Plain Water', bn: 'সাধারণ পানি', cat: 'Beverage', k: 0, na: 0, p: 0, stages: '1,2,3,4,5', ae: 'Best beverage for CKD; aim for 1.5-2L/day unless fluid-restricted.', ab: 'সিকেডির জন্য সেরা পানীয়; তরল সীমাবদ্ধ না হলে দিনে ১.৫-২ লিটার।' },
      { en: 'Tea (without milk/sugar)', bn: 'চা (দুধ ও চিনি ছাড়া)', cat: 'Beverage', k: 88, na: 3, p: 1, stages: '1,2,3,4,5', ae: 'Very low minerals; safe for CKD without additives.', ab: 'খুব কম খনিজ; সংযোজন ছাড়া সিকেডির জন্য নিরাপদ।' },
      { en: 'Sugarcane Juice', bn: 'আখের রস', cat: 'Beverage', k: 160, na: 11, p: 22, stages: '1,2,3', ae: 'Moderate potassium; limit to small glass in early CKD only.', ab: 'মধ্যম পটাশিয়াম; শুধুমাত্র প্রাথমিক সিকেডিতে ছোট গ্লাসে সীমিত করুন।' },
    ];
    const ins = db.prepare('INSERT INTO diet_suggestions (food_name_en, food_name_bn, category, potassium, sodium, phosphorus, allowed_stages, advice_en, advice_bn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    foods.forEach(f => ins.run(f.en, f.bn, f.cat, f.k, f.na, f.p, f.stages, f.ae, f.ab));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AUTH ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, division, district } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const result = db.prepare('INSERT INTO users (name, email, password, role, division, district) VALUES (?, ?, ?, ?, ?, ?)').run(name, email, hashedPassword, role, division, district);
      const userId = result.lastInsertRowid;
      if (role === 'patient') {
        db.prepare('INSERT INTO patients (user_id) VALUES (?)').run(userId);
      } else if (role === 'chw') {
        db.prepare('INSERT INTO chw_workers (user_id, region) VALUES (?, ?)').run(userId, district || '');
      }
      res.status(201).json({ message: 'User registered successfully' });
    } catch {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PATIENT ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  app.get('/api/patient/profile', authenticateToken, (req: any, res) => {
    const patient = db.prepare(`
      SELECT u.*, p.*
      FROM users u JOIN patients p ON u.id = p.user_id
      WHERE u.id = ?
    `).get(req.user.id);
    res.json(patient);
  });

  app.put('/api/patient/profile', authenticateToken, (req: any, res) => {
    const { age, sex, weight, diabetes, hypertension, family_history, arsenic_prone_area, herbal_remedy_use, nsaid_use, uacr, caregiver_phone } = req.body;
    db.prepare(`
      UPDATE patients SET age = ?, sex = ?, weight = ?, diabetes = ?, hypertension = ?, family_history = ?,
        arsenic_prone_area = ?, herbal_remedy_use = ?, nsaid_use = ?, uacr = ?, caregiver_phone = ?
      WHERE user_id = ?
    `).run(age, sex, weight, diabetes ? 1 : 0, hypertension ? 1 : 0, family_history ? 1 : 0,
      arsenic_prone_area ? 1 : 0, herbal_remedy_use ? 1 : 0, nsaid_use ? 1 : 0, uacr || null, caregiver_phone || null, req.user.id);

    const patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(req.user.id) as any;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    const score = calculateRiskScore(patient, user.district);
    db.prepare('UPDATE patients SET risk_score = ? WHERE user_id = ?').run(score, req.user.id);
    res.json({ message: 'Profile updated' });
  });

  app.post('/api/patient/vitals', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const validationError = validateVitals(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema, fatigue, medications } = req.body;
    db.prepare(`
      INSERT INTO vitals_log (patient_id, systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema, fatigue, medications)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(patient.id, systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema ? 1 : 0, fatigue, medications);

    updateStreak(patient.id);
    checkAlerts(patient.id);
    res.json({ message: 'Vitals logged' });
  });

  app.get('/api/patient/vitals', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    if (!patient) return res.json([]);
    const logs = db.prepare('SELECT * FROM vitals_log WHERE patient_id = ? ORDER BY date DESC').all(patient.id);
    res.json(logs);
  });

  // Batch endpoint — accepts array of offline-queued vitals entries
  app.post('/api/patient/vitals/batch', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const { entries } = req.body as { entries: any[] };
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array required' });
    }

    const results: { ok: boolean; date?: string; error?: string }[] = [];
    const stmt = db.prepare(`
      INSERT INTO vitals_log (patient_id, systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema, fatigue, medications, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const entry of entries) {
      const err = validateVitals(entry);
      if (err) { results.push({ ok: false, error: err }); continue; }
      const { systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema, fatigue, medications, date } = entry;
      const insertDate = date || new Date().toISOString();
      try {
        stmt.run(patient.id, systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema ? 1 : 0, fatigue, medications, insertDate);
        results.push({ ok: true, date: insertDate });
      } catch (e: any) {
        results.push({ ok: false, error: e.message });
      }
    }

    updateStreak(patient.id);
    checkAlerts(patient.id);
    res.json({ synced: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results });
  });

  app.post('/api/patient/gfr', authenticateToken, (req: any, res) => {
    const { creatinine, age, sex, weight, uacr } = req.body;
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    let mdrd = 175 * Math.pow(creatinine, -1.154) * Math.pow(age, -0.203);
    if (sex === 'female') mdrd *= 0.742;

    let cg = ((140 - age) * weight) / (72 * creatinine);
    if (sex === 'female') cg *= 0.85;

    const k = sex === 'female' ? 0.7 : 0.9;
    const a = sex === 'female' ? -0.329 : -0.411;
    let ckdEpi = 141 * Math.pow(Math.min(creatinine / k, 1), a) * Math.pow(Math.max(creatinine / k, 1), -1.209) * Math.pow(0.993, age);
    if (sex === 'female') ckdEpi *= 1.018;

    const avgGfr = (mdrd + cg + ckdEpi) / 3;

    // KDIGO staging with UACR
    let stage = 1;
    if (avgGfr < 15) stage = 5;
    else if (avgGfr < 30) stage = 4;
    else if (avgGfr < 60) stage = 3;
    else if (avgGfr < 90) stage = 2;

    // Refine by UACR if provided
    let uacrCategory = '';
    if (uacr !== undefined && uacr !== null && uacr !== '') {
      const uacrVal = parseFloat(uacr);
      if (uacrVal >= 300) uacrCategory = 'A3 (Severely Increased ≥300 mg/g)';
      else if (uacrVal >= 30) uacrCategory = 'A2 (Moderately Increased 30-300 mg/g)';
      else uacrCategory = 'A1 (Normal to Mildly Increased <30 mg/g)';
      // KDIGO: Elevate stage if high UACR
      if (uacrVal >= 300 && stage < 3) stage = 3;
    }

    const recommendation = stage >= 4 ? 'Urgent nephrology referral required' :
      stage === 3 ? 'Refer to nephrologist; intensify risk factor management' :
      stage === 2 ? 'Monitor every 3 months; lifestyle modification' : 'Annual monitoring; preventive care';

    db.prepare(`
      INSERT INTO gfr_records (patient_id, creatinine, age, sex, weight, uacr, mdrd, cg, ckd_epi, stage, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(patient.id, creatinine, age, sex, weight, uacr || null, mdrd, cg, ckdEpi, stage, recommendation);

    // Update CKD stage in patients table
    db.prepare('UPDATE patients SET ckd_stage = ? WHERE id = ?').run(stage, patient.id);

    res.json({ mdrd, cg, ckdEpi, stage, recommendation, uacrCategory, avgGfr });
  });

  app.get('/api/patient/gfr-history', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    if (!patient) return res.json([]);
    const history = db.prepare('SELECT * FROM gfr_records WHERE patient_id = ? ORDER BY date ASC').all(patient.id);
    res.json(history);
  });

  app.get('/api/patient/risk-score', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(req.user.id) as any;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    if (!patient) return res.json({ score: 0, factors: [] });

    const score = calculateRiskScore(patient, user.district);
    db.prepare('UPDATE patients SET risk_score = ? WHERE user_id = ?').run(score, req.user.id);

    const factors: string[] = [];
    if (patient.age > 60) factors.push('Age > 60');
    else if (patient.age > 40) factors.push('Age 40-60');
    if (patient.diabetes) factors.push('Diabetes');
    if (patient.hypertension) factors.push('Hypertension');
    if (patient.family_history) factors.push('Family history');
    if (patient.arsenic_prone_area || ARSENIC_DISTRICTS.has(user.district)) factors.push('Arsenic-prone area (+10)');
    if (patient.herbal_remedy_use) factors.push('Herbal remedy use (+5)');
    if (patient.nsaid_use) factors.push('Frequent NSAID use (+5)');
    if (patient.uacr >= 300) factors.push('Severely elevated UACR (+15)');
    else if (patient.uacr >= 30) factors.push('Moderately elevated UACR (+8)');

    res.json({ score, factors });
  });

  app.get('/api/patient/streak', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT streak_days, last_log_date FROM patients WHERE user_id = ?').get(req.user.id) as any;
    res.json({ streak: patient?.streak_days || 0, last_log_date: patient?.last_log_date });
  });

  app.post('/api/patient/set-pin', authenticateToken, async (req: any, res) => {
    const { pin } = req.body;
    if (!pin || pin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 digits' });
    const hashedPin = await bcrypt.hash(pin, 10);
    db.prepare('UPDATE patients SET pin = ? WHERE user_id = ?').run(hashedPin, req.user.id);
    res.json({ message: 'PIN set successfully' });
  });

  app.post('/api/patient/verify-pin', authenticateToken, async (req: any, res) => {
    const { pin } = req.body;
    const patient = db.prepare('SELECT pin FROM patients WHERE user_id = ?').get(req.user.id) as any;
    if (!patient?.pin) return res.status(400).json({ error: 'No PIN set' });
    const valid = await bcrypt.compare(pin, patient.pin);
    res.json({ valid });
  });

  app.post('/api/patient/ocr-prefill', authenticateToken, (req: any, res) => {
    // Simple OCR text parser — extracts common lab values from text
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const result: Record<string, string> = {};
    const lower = text.toLowerCase();

    const creatMatch = lower.match(/creatinine[\s:=]+([0-9]+\.?[0-9]*)/);
    if (creatMatch) result.creatinine = creatMatch[1];

    const bsMatch = lower.match(/(?:blood sugar|glucose|bs|rbs|fbs)[\s:=]+([0-9]+\.?[0-9]*)/);
    if (bsMatch) result.blood_sugar = bsMatch[1];

    const bpMatch = lower.match(/(?:bp|blood pressure)[\s:=]+([0-9]+)[\/\\]([0-9]+)/);
    if (bpMatch) { result.systolic = bpMatch[1]; result.diastolic = bpMatch[2]; }

    const uacrMatch = lower.match(/(?:uacr|albumin.creatinine)[\s:=]+([0-9]+\.?[0-9]*)/);
    if (uacrMatch) result.uacr = uacrMatch[1];

    res.json({ extracted: result, confidence: Object.keys(result).length > 0 ? 'partial' : 'none' });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DOCTOR ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  app.get('/api/doctor/patients', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { assignedOnly } = req.query;
    let query = `SELECT u.name, u.email, u.district, p.* FROM users u JOIN patients p ON u.id = p.user_id`;
    const params: any[] = [];
    if (assignedOnly === 'true') {
      query += ' WHERE p.assigned_doctor_id = ?';
      params.push(req.user.id);
    }
    res.json(db.prepare(query).all(...params));
  });

  app.get('/api/doctor/patient/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const patient = db.prepare(`
      SELECT u.name, u.email, u.division, u.district, p.*
      FROM users u JOIN patients p ON u.id = p.user_id WHERE p.id = ?
    `).get(req.params.id);
    const vitals = db.prepare('SELECT * FROM vitals_log WHERE patient_id = ? ORDER BY date DESC').all(req.params.id);
    const gfr = db.prepare('SELECT * FROM gfr_records WHERE patient_id = ? ORDER BY date DESC').all(req.params.id);
    const prescriptions = db.prepare('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY date DESC LIMIT 5').all(req.params.id);
    res.json({ patient, vitals, gfr, prescriptions });
  });

  app.get('/api/doctor/alerts', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const alerts = db.prepare(`
      SELECT a.*, u.name as patient_name
      FROM alerts a JOIN patients p ON a.patient_id = p.id JOIN users u ON p.user_id = u.id
      ORDER BY triggered_at DESC
    `).all();
    res.json(alerts);
  });

  app.post('/api/doctor/alerts/read', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { alertId } = req.body;
    if (alertId) db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(alertId);
    else db.prepare('UPDATE alerts SET is_read = 1').run();
    res.json({ message: 'Alerts marked as read' });
  });

  app.post('/api/doctor/risk-feedback', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { patient_id, reported_score, feedback } = req.body;
    db.prepare('INSERT INTO risk_feedback (doctor_id, patient_id, reported_score, feedback) VALUES (?, ?, ?, ?)').run(req.user.id, patient_id, reported_score, feedback);
    res.json({ message: 'Feedback recorded' });
  });

  app.get('/api/doctor/unassigned-patients', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { q } = req.query as { q?: string };
    let query = `SELECT u.name, u.email, u.district, p.*
      FROM users u JOIN patients p ON u.id = p.user_id
      WHERE (p.assigned_doctor_id IS NULL OR p.assigned_doctor_id != ?)`;
    const params: any[] = [req.user.id];
    if (q) {
      query += ' AND (LOWER(u.name) LIKE ? OR LOWER(u.district) LIKE ?)';
      params.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
    }
    query += ' ORDER BY u.name LIMIT 30';
    res.json(db.prepare(query).all(...params));
  });

  app.post('/api/doctor/log-vitals', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { patient_id, systolic, diastolic, blood_sugar, creatinine, weight, edema, notes } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id required' });
    const validErr = validateVitals({ systolic, diastolic, blood_sugar, creatinine, weight });
    if (validErr) return res.status(400).json({ error: validErr });
    db.prepare(`
      INSERT INTO vitals_log (patient_id, systolic, diastolic, blood_sugar, creatinine, weight, edema, logged_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'doctor')
    `).run(
      patient_id,
      systolic || null, diastolic || null,
      blood_sugar || null, creatinine || null,
      weight || null, edema ? 1 : 0
    );
    checkAlerts(patient_id);
    res.json({ message: 'Vitals logged' });
  });

  // GET 7-day adherence grid for a specific prescription (doctor view)
  app.get('/api/doctor/adherence/:patientId/:prescriptionId', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { patientId, prescriptionId } = req.params;

    // Build list of last 7 dates (inclusive of today)
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const rows = db.prepare(`
      SELECT medicine_name, date, taken
      FROM medication_adherence
      WHERE patient_id = ? AND prescription_id = ?
        AND date >= date('now', '-6 days')
      ORDER BY date ASC
    `).all(patientId, prescriptionId) as any[];

    // Group: { medicineName -> { date -> taken } }
    const byMed: Record<string, Record<string, boolean>> = {};
    for (const row of rows) {
      if (!byMed[row.medicine_name]) byMed[row.medicine_name] = {};
      byMed[row.medicine_name][row.date] = row.taken === 1;
    }

    res.json({ dates, byMed });
  });

  app.post('/api/doctor/assign-patient', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { patient_id } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id required' });
    db.prepare('UPDATE patients SET assigned_doctor_id = ? WHERE id = ?').run(req.user.id, patient_id);
    res.json({ message: 'Patient assigned' });
  });

  app.post('/api/doctor/unassign-patient', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { patient_id } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id required' });
    db.prepare('UPDATE patients SET assigned_doctor_id = NULL WHERE id = ? AND assigned_doctor_id = ?').run(patient_id, req.user.id);
    res.json({ message: 'Patient unassigned' });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PRESCRIPTIONS
  // ════════════════════════════════════════════════════════════════════════════
  app.post('/api/prescriptions', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { patient_id, medicines, notes, language } = req.body;
    const qrCode = `KC-RX-${Date.now()}-${patient_id}`;
    const result = db.prepare('INSERT INTO prescriptions (doctor_id, patient_id, medicines, notes, language, qr_code) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, patient_id, JSON.stringify(medicines), notes, language || 'bn', qrCode);
    res.json({ id: result.lastInsertRowid, qr_code: qrCode });
  });

  app.get('/api/prescriptions', authenticateToken, (req: any, res) => {
    const { patient_id } = req.query;
    let rows: any[];
    if (req.user.role === 'doctor') {
      rows = patient_id
        ? db.prepare('SELECT p.*, u.name as patient_name FROM prescriptions p JOIN patients pa ON p.patient_id = pa.id JOIN users u ON pa.user_id = u.id WHERE p.patient_id = ? AND p.doctor_id = ? ORDER BY p.date DESC').all(patient_id, req.user.id)
        : db.prepare('SELECT p.*, u.name as patient_name FROM prescriptions p JOIN patients pa ON p.patient_id = pa.id JOIN users u ON pa.user_id = u.id WHERE p.doctor_id = ? ORDER BY p.date DESC').all(req.user.id);
    } else {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
      rows = patient ? db.prepare('SELECT p.*, u.name as doctor_name FROM prescriptions p JOIN users u ON p.doctor_id = u.id WHERE p.patient_id = ? ORDER BY p.date DESC').all(patient.id) : [];
    }
    res.json(rows.map(r => ({ ...r, medicines: JSON.parse(r.medicines || '[]') })));
  });

  app.get('/api/prescriptions/:id', authenticateToken, (req: any, res) => {
    const rx = db.prepare('SELECT p.*, u.name as doctor_name, u2.name as patient_name FROM prescriptions p JOIN users u ON p.doctor_id = u.id JOIN patients pa ON p.patient_id = pa.id JOIN users u2 ON pa.user_id = u2.id WHERE p.id = ?').get(req.params.id) as any;
    if (!rx) return res.status(404).json({ error: 'Not found' });
    res.json({ ...rx, medicines: JSON.parse(rx.medicines || '[]') });
  });

  app.post('/api/prescriptions/:id/refill', authenticateToken, (req: any, res) => {
    const { source } = req.body;
    const rx = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id) as any;
    if (!rx) return res.status(404).json({ error: 'Not found' });
    db.prepare('INSERT INTO medication_refills (prescription_id, patient_id, source) VALUES (?, ?, ?)').run(rx.id, rx.patient_id, source || 'patient');
    res.json({ message: 'Refill logged' });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // MEDICATION ADHERENCE
  // ════════════════════════════════════════════════════════════════════════════

  // GET today's adherence status + active prescriptions
  app.get('/api/patient/adherence/today', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const today = new Date().toISOString().slice(0, 10);
    const prescriptions = db.prepare(
      `SELECT p.*, u.name as doctor_name FROM prescriptions p
       JOIN users u ON p.doctor_id = u.id
       WHERE p.patient_id = ? ORDER BY p.date DESC`
    ).all(patient.id) as any[];

    const takenRows = db.prepare(
      `SELECT prescription_id, medicine_name, taken FROM medication_adherence
       WHERE patient_id = ? AND date = ?`
    ).all(patient.id, today) as any[];

    const takenMap: Record<string, Record<string, boolean>> = {};
    for (const row of takenRows) {
      if (!takenMap[row.prescription_id]) takenMap[row.prescription_id] = {};
      takenMap[row.prescription_id][row.medicine_name] = row.taken === 1;
    }

    const result = prescriptions.map(rx => ({
      ...rx,
      medicines: JSON.parse(rx.medicines || '[]'),
      taken_today: takenMap[rx.id] || {},
    }));

    res.json({ date: today, prescriptions: result });
  });

  // POST mark a medicine as taken or untaken
  app.post('/api/patient/adherence', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const { prescription_id, medicine_name, date, taken } = req.body;
    if (!prescription_id || !medicine_name || !date) {
      return res.status(400).json({ error: 'prescription_id, medicine_name, and date are required' });
    }

    db.prepare(
      `INSERT INTO medication_adherence (patient_id, prescription_id, medicine_name, date, taken)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(patient_id, prescription_id, medicine_name, date)
       DO UPDATE SET taken = excluded.taken, logged_at = CURRENT_TIMESTAMP`
    ).run(patient.id, prescription_id, medicine_name, date, taken ? 1 : 0);

    res.json({ message: 'Adherence recorded' });
  });

  // GET 84-day adherence history for heatmap (12 weeks)
  app.get('/api/patient/adherence/history', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // For each day in the last 84 days, calculate total medicines expected vs taken
    const rows = db.prepare(
      `SELECT date,
              SUM(CASE WHEN taken = 1 THEN 1 ELSE 0 END) as taken_count,
              COUNT(*) as total_count
       FROM medication_adherence
       WHERE patient_id = ? AND date >= date('now', '-84 days')
       GROUP BY date
       ORDER BY date ASC`
    ).all(patient.id) as any[];

    // Also get overall adherence rate
    const overall = db.prepare(
      `SELECT SUM(CASE WHEN taken = 1 THEN 1 ELSE 0 END) as taken_count,
              COUNT(*) as total_count
       FROM medication_adherence
       WHERE patient_id = ? AND date >= date('now', '-30 days')`
    ).get(patient.id) as any;

    const rate30d = overall?.total_count > 0
      ? Math.round((overall.taken_count / overall.total_count) * 100)
      : null;

    res.json({ history: rows, rate_30d: rate30d });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TELECONSULTATIONS
  // ════════════════════════════════════════════════════════════════════════════
  app.post('/api/teleconsult/start', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { patient_id } = req.body;
    const result = db.prepare('INSERT INTO teleconsultations (doctor_id, patient_id, status) VALUES (?, ?, ?)').run(req.user.id, patient_id, 'active');
    res.json({ id: result.lastInsertRowid, room: `kc-room-${result.lastInsertRowid}` });
  });

  app.post('/api/teleconsult/:id/end', authenticateToken, (req: any, res) => {
    const { notes } = req.body;
    db.prepare('UPDATE teleconsultations SET end_time = CURRENT_TIMESTAMP, status = ?, notes = ? WHERE id = ?').run('ended', notes, req.params.id);
    res.json({ message: 'Consultation ended' });
  });

  app.get('/api/teleconsult/history', authenticateToken, (req: any, res) => {
    let rows: any[];
    if (req.user.role === 'doctor') {
      rows = db.prepare('SELECT t.*, u.name as patient_name FROM teleconsultations t JOIN patients p ON t.patient_id = p.id JOIN users u ON p.user_id = u.id WHERE t.doctor_id = ? ORDER BY t.start_time DESC').all(req.user.id);
    } else {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.id) as any;
      rows = patient ? db.prepare('SELECT t.*, u.name as doctor_name FROM teleconsultations t JOIN users u ON t.doctor_id = u.id WHERE t.patient_id = ? ORDER BY t.start_time DESC').all(patient.id) : [];
    }
    res.json(rows);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DIET ASSISTANT
  // ════════════════════════════════════════════════════════════════════════════
  app.get('/api/diet/foods', authenticateToken, (req: any, res) => {
    const { stage, search } = req.query;
    let foods = db.prepare('SELECT * FROM diet_suggestions').all() as any[];
    if (search) {
      const q = (search as string).toLowerCase();
      foods = foods.filter(f => f.food_name_en.toLowerCase().includes(q) || f.food_name_bn.includes(q));
    }
    if (stage) {
      const s = parseInt(stage as string);
      foods = foods.map(f => ({
        ...f,
        allowed: f.allowed_stages ? f.allowed_stages.split(',').map(Number).includes(s) : false,
      }));
    }
    res.json(foods);
  });

  app.get('/api/diet/recommendations', authenticateToken, (req: any, res) => {
    const patient = db.prepare(`SELECT p.*, u.district FROM patients p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?`).get(req.user.id) as any;
    if (!patient) return res.json({ warnings: [], recommendations: [] });

    const stage = patient.ckd_stage || 1;
    const foods = db.prepare('SELECT * FROM diet_suggestions').all() as any[];

    const warnings = foods.filter(f => {
      if (!f.allowed_stages) return true;
      return !f.allowed_stages.split(',').map(Number).includes(stage);
    }).map(f => ({ food_en: f.food_name_en, food_bn: f.food_name_bn, reason_en: f.advice_en, reason_bn: f.advice_bn }));

    const safe = foods.filter(f => {
      if (!f.allowed_stages) return false;
      return f.allowed_stages.split(',').map(Number).includes(stage);
    }).map(f => ({ food_en: f.food_name_en, food_bn: f.food_name_bn, advice_bn: f.advice_bn }));

    res.json({ stage, warnings: warnings.slice(0, 8), recommendations: safe.slice(0, 8) });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CAREGIVER
  // ════════════════════════════════════════════════════════════════════════════
  app.post('/api/patient/caregiver', authenticateToken, (req: any, res) => {
    const { caregiver_phone } = req.body;
    db.prepare('UPDATE patients SET caregiver_phone = ? WHERE user_id = ?').run(caregiver_phone, req.user.id);
    res.json({ message: 'Caregiver linked' });
  });

  app.get('/api/patient/caregiver', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT caregiver_phone FROM patients WHERE user_id = ?').get(req.user.id) as any;
    res.json({ caregiver_phone: patient?.caregiver_phone || null });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CHW ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  app.get('/api/chw/profile', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'chw') return res.sendStatus(403);
    const chw = db.prepare('SELECT c.*, u.name, u.email, u.district FROM chw_workers c JOIN users u ON c.user_id = u.id WHERE c.user_id = ?').get(req.user.id);
    res.json(chw);
  });

  app.get('/api/chw/patients', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'chw') return res.sendStatus(403);
    const patients = db.prepare(`
      SELECT u.name, u.district, p.*, a.assigned_at
      FROM chw_patient_assignments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE a.chw_id = ?
      ORDER BY p.risk_score DESC
    `).all(req.user.id);
    res.json(patients);
  });

  app.post('/api/chw/assign-patient', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'chw') return res.sendStatus(403);
    const { patient_id } = req.body;
    const count = db.prepare('SELECT COUNT(*) as c FROM chw_patient_assignments WHERE chw_id = ?').get(req.user.id) as any;
    if (count.c >= 30) return res.status(400).json({ error: 'CHW patient limit (30) reached' });
    try {
      db.prepare('INSERT INTO chw_patient_assignments (chw_id, patient_id) VALUES (?, ?)').run(req.user.id, patient_id);
      res.json({ message: 'Patient assigned to CHW' });
    } catch {
      res.status(400).json({ error: 'Already assigned' });
    }
  });

  app.post('/api/chw/log-visit', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'chw') return res.sendStatus(403);
    const { patient_id, lat, lng, visit_type, notes, vitals } = req.body;

    db.prepare('INSERT INTO chw_patient_logs (chw_id, patient_id, lat, lng, visit_type, notes) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, patient_id, lat, lng, visit_type, notes);

    if (vitals && Object.keys(vitals).length > 0) {
      const validErr = validateVitals(vitals);
      if (!validErr) {
        const { systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema, fatigue } = vitals;
        db.prepare(`INSERT INTO vitals_log (patient_id, systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema, fatigue, logged_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(patient_id, systolic, diastolic, blood_sugar, creatinine, urine_protein || 'Negative', weight, edema ? 1 : 0, fatigue, 'chw');
        checkAlerts(patient_id);
      }
    }

    // Award points to CHW
    db.prepare('UPDATE chw_workers SET points = points + 10 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'Visit logged' });
  });

  app.get('/api/chw/visits', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'chw') return res.sendStatus(403);
    const visits = db.prepare(`
      SELECT l.*, u.name as patient_name
      FROM chw_patient_logs l JOIN patients p ON l.patient_id = p.id JOIN users u ON p.user_id = u.id
      WHERE l.chw_id = ? ORDER BY l.timestamp DESC
    `).all(req.user.id);
    res.json(visits);
  });

  app.get('/api/chw/all-patients', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'chw') return res.sendStatus(403);
    const patients = db.prepare('SELECT u.name, u.email, u.district, p.* FROM users u JOIN patients p ON u.id = p.user_id WHERE u.role = "patient" ORDER BY p.risk_score DESC LIMIT 50').all();
    res.json(patients);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  app.get('/api/admin/heatmap', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const data = getAdminHeatmapData();
    // Add CHW-verified data points
    const chwPoints = db.prepare(`
      SELECT l.lat, l.lng, u.name as patient_name, p.risk_score, l.timestamp
      FROM chw_patient_logs l JOIN patients p ON l.patient_id = p.id JOIN users u ON p.user_id = u.id
      WHERE l.lat IS NOT NULL AND l.lng IS NOT NULL ORDER BY l.timestamp DESC LIMIT 100
    `).all();
    res.json({ districts: data, chw_points: chwPoints });
  });

  app.get('/api/admin/export-research-data', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const data = db.prepare(`
      SELECT u.id as user_id, u.division, u.district,
        p.age, p.sex, p.diabetes, p.hypertension, p.family_history, p.ckd_stage, p.risk_score,
        p.arsenic_prone_area, p.herbal_remedy_use, p.nsaid_use, p.uacr,
        v.systolic, v.diastolic, v.blood_sugar, v.creatinine as latest_creatinine, v.urine_protein, v.edema, v.fatigue,
        g.mdrd, g.cg, g.ckd_epi
      FROM users u JOIN patients p ON u.id = p.user_id
      LEFT JOIN (SELECT * FROM vitals_log WHERE id IN (SELECT MAX(id) FROM vitals_log GROUP BY patient_id)) v ON p.id = v.patient_id
      LEFT JOIN (SELECT * FROM gfr_records WHERE id IN (SELECT MAX(id) FROM gfr_records GROUP BY patient_id)) g ON p.id = g.patient_id
      WHERE u.role = 'patient'
    `).all();
    res.json(data);
  });

  app.get('/api/admin/reports', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    res.json(buildPolicyReports());
  });

  app.get('/api/admin/export-national-report', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const heatmap = getAdminHeatmapData();
    const totalPatients = heatmap.reduce((sum, row) => sum + row.count, 0);
    const averageRisk = heatmap.length ? heatmap.reduce((sum, row) => sum + (row.avg_risk ?? 0), 0) / heatmap.length : 0;
    const content = [
      '# KidneyCare BD National CKD Burden Report',
      `Generated on: ${new Date().toISOString()}`,
      `Total tracked patients: ${totalPatients}`,
      `Districts represented: ${heatmap.length}`,
      `Average district risk score: ${averageRisk.toFixed(1)}`,
      '## District summary',
      ...(heatmap.map((d, i) => `${i + 1}. ${d.district}: ${d.count} patients, avg risk ${Math.round(d.avg_risk ?? 0)}`)),
      '## Policy priorities',
      '1. Expand screening in the highest-burden districts.',
      '2. Improve follow-up capacity for districts with elevated average risk.',
      '3. Use monthly exports to compare district trend movement over time.',
    ].join('\n');
    res.json({ filename: `KidneyCareBD_National_CKD_Report_${new Date().toISOString().split('T')[0]}.md`, content });
  });

  // ─── Budget Impact Simulator ──────────────────────────────────────────────
  app.post('/api/admin/budget-simulator', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { population, district, years = 5, screening_coverage = 0.3 } = req.body;
    const pop = parseInt(population);
    const yrs = parseInt(years);
    const cov = parseFloat(screening_coverage);

    // Bangladesh CKD epidemiology estimates
    const ckdPrevalence = 0.17; // 17% estimated
    const progressionRate = 0.05; // 5% per year progress to next stage without intervention
    const earlyInterventionReduction = 0.40; // 40% slower progression with early detection
    const dialysisCostPerPatientPerYear = 480000; // BDT ~480,000/year hemodialysis
    const medicationCostPerPatientPerYear = 36000; // BDT ~36,000/year CKD medication
    const screeningCostPerPerson = 500; // BDT ~500 per screening

    const estimatedCKD = Math.round(pop * ckdPrevalence);
    const screened = Math.round(estimatedCKD * cov);
    const earlyDetected = Math.round(screened * 0.6); // 60% would be early stage
    const dialysisWithoutIntervention = Math.round(estimatedCKD * progressionRate * yrs);
    const dialysisWithIntervention = Math.round(dialysisWithoutIntervention * (1 - earlyInterventionReduction));
    const dialysisPrevented = dialysisWithoutIntervention - dialysisWithIntervention;

    const screeningCost = screened * screeningCostPerPerson;
    const medicationCost = earlyDetected * medicationCostPerPatientPerYear * yrs;
    const totalInterventionCost = screeningCost + medicationCost;
    const dialysisCostSaved = dialysisPrevented * dialysisCostPerPatientPerYear * yrs;
    const netSaving = dialysisCostSaved - totalInterventionCost;

    res.json({
      population: pop, district, years: yrs, screening_coverage: cov,
      estimated_ckd: estimatedCKD,
      screened_patients: screened,
      early_detected: earlyDetected,
      dialysis_without_intervention: dialysisWithoutIntervention,
      dialysis_with_intervention: dialysisWithIntervention,
      dialysis_cases_prevented: dialysisPrevented,
      screening_cost_bdt: screeningCost,
      medication_cost_bdt: medicationCost,
      total_intervention_cost_bdt: totalInterventionCost,
      dialysis_cost_saved_bdt: dialysisCostSaved,
      net_saving_bdt: netSaving,
      roi_percent: totalInterventionCost > 0 ? ((netSaving / totalInterventionCost) * 100).toFixed(1) : '∞',
    });
  });

  // ─── Outcome Cohorts ─────────────────────────────────────────────────────
  app.post('/api/admin/cohorts', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, description, patient_ids, end_date } = req.body;
    const result = db.prepare('INSERT INTO outcome_cohorts (name, description, patient_ids, end_date, created_by) VALUES (?, ?, ?, ?, ?)').run(name, description, JSON.stringify(patient_ids || []), end_date, req.user.id);
    res.json({ id: result.lastInsertRowid });
  });

  app.get('/api/admin/cohorts', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const cohorts = db.prepare('SELECT * FROM outcome_cohorts ORDER BY start_date DESC').all() as any[];
    res.json(cohorts.map(c => ({ ...c, patient_ids: JSON.parse(c.patient_ids || '[]') })));
  });

  app.get('/api/admin/cohorts/:id/report', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const cohort = db.prepare('SELECT * FROM outcome_cohorts WHERE id = ?').get(req.params.id) as any;
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    const ids = JSON.parse(cohort.patient_ids || '[]');
    if (!ids.length) return res.json({ cohort, patients: [], summary: {} });

    const placeholders = ids.map(() => '?').join(',');
    const patients = db.prepare(`
      SELECT u.name, u.district, p.age, p.sex, p.ckd_stage, p.risk_score, p.diabetes, p.hypertension
      FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id IN (${placeholders})
    `).all(...ids) as any[];

    const avgRisk = patients.length ? patients.reduce((s, p) => s + (p.risk_score || 0), 0) / patients.length : 0;
    const stageDistribution: Record<number, number> = {};
    patients.forEach(p => { stageDistribution[p.ckd_stage || 0] = (stageDistribution[p.ckd_stage || 0] || 0) + 1; });

    res.json({
      cohort,
      patients,
      summary: {
        total: patients.length,
        avg_risk: avgRisk.toFixed(1),
        stage_distribution: stageDistribution,
        diabetic_count: patients.filter(p => p.diabetes).length,
        hypertensive_count: patients.filter(p => p.hypertension).length,
      }
    });
  });

  app.get('/api/admin/stats', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const totalPatients = (db.prepare('SELECT COUNT(*) as c FROM patients').get() as any).c;
    const totalDoctors = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role='doctor'").get() as any).c;
    const totalCHW = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role='chw'").get() as any).c;
    const highRiskPatients = (db.prepare('SELECT COUNT(*) as c FROM patients WHERE risk_score > 60').get() as any).c;
    const totalVitalsLogs = (db.prepare('SELECT COUNT(*) as c FROM vitals_log').get() as any).c;
    const stageStats = db.prepare('SELECT ckd_stage, COUNT(*) as count FROM patients WHERE ckd_stage IS NOT NULL GROUP BY ckd_stage').all();
    const feedback = db.prepare('SELECT COUNT(*) as c FROM risk_feedback').get() as any;

    res.json({
      total_patients: totalPatients,
      total_doctors: totalDoctors,
      total_chw: totalCHW,
      high_risk_patients: highRiskPatients,
      total_vitals_logs: totalVitalsLogs,
      stage_distribution: stageStats,
      risk_feedback_count: feedback.c,
    });
  });

  // ─── DHIS2 Export ──────────────────────────────────────────────────────────
  app.get('/api/admin/dhis2-export', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const heatmap = getAdminHeatmapData();
    const dhis2 = {
      dataValues: heatmap.map(d => ({
        dataElement: 'ckd_prevalence',
        orgUnit: d.district,
        value: d.count,
        period: new Date().toISOString().slice(0, 7).replace('-', ''),
        comment: `avg_risk:${Math.round(d.avg_risk ?? 0)}`,
      })),
      exportedAt: new Date().toISOString(),
      program: 'KidneyCare BD CKD Programme',
      format: 'DHIS2 2.38+',
    };
    res.json(dhis2);
  });

  // ─── FHIR R4 API ─────────────────────────────────────────────────────────
  app.get('/api/fhir/Patient/:id', authenticateToken, (req: any, res) => {
    const user = db.prepare('SELECT u.*, p.* FROM users u JOIN patients p ON u.id = p.user_id WHERE p.id = ?').get(req.params.id) as any;
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({
      resourceType: 'Patient',
      id: `patient-${user.id}`,
      name: [{ use: 'official', text: user.name }],
      gender: user.sex === 'female' ? 'female' : 'male',
      birthDate: user.age ? `${new Date().getFullYear() - user.age}-01-01` : undefined,
      address: [{ country: 'Bangladesh', district: user.district }],
      extension: [
        { url: 'ckd-stage', valueInteger: user.ckd_stage },
        { url: 'risk-score', valueInteger: user.risk_score },
      ],
    });
  });

  app.get('/api/fhir/Observation', authenticateToken, (req: any, res) => {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ error: 'patient param required' });
    const vitals = db.prepare('SELECT * FROM vitals_log WHERE patient_id = ? ORDER BY date DESC LIMIT 10').all(patient) as any[];
    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: vitals.length,
      entry: vitals.map(v => ({
        resource: {
          resourceType: 'Observation',
          id: `obs-${v.id}`,
          status: 'final',
          subject: { reference: `Patient/${patient}` },
          effectiveDateTime: v.date,
          component: [
            { code: { text: 'SystolicBP' }, valueQuantity: { value: v.systolic, unit: 'mmHg' } },
            { code: { text: 'DiastolicBP' }, valueQuantity: { value: v.diastolic, unit: 'mmHg' } },
            { code: { text: 'Creatinine' }, valueQuantity: { value: v.creatinine, unit: 'mg/dL' } },
            { code: { text: 'BloodSugar' }, valueQuantity: { value: v.blood_sugar, unit: 'mmol/L' } },
          ],
        }
      })),
    };
    res.json(bundle);
  });

  app.get('/api/fhir/Condition', authenticateToken, (req: any, res) => {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ error: 'patient param required' });
    const p = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient) as any;
    if (!p) return res.status(404).json({ error: 'Not found' });
    const conditions = [];
    if (p.ckd_stage) conditions.push({ resourceType: 'Condition', id: `cond-ckd-${p.id}`, clinicalStatus: { coding: [{ code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '709044004', display: `Chronic kidney disease stage ${p.ckd_stage}` }] }, subject: { reference: `Patient/${patient}` } });
    if (p.diabetes) conditions.push({ resourceType: 'Condition', id: `cond-dm-${p.id}`, code: { coding: [{ system: 'http://snomed.info/sct', code: '44054006', display: 'Type 2 diabetes mellitus' }] }, subject: { reference: `Patient/${patient}` } });
    if (p.hypertension) conditions.push({ resourceType: 'Condition', id: `cond-htn-${p.id}`, code: { coding: [{ system: 'http://snomed.info/sct', code: '38341003', display: 'Hypertension' }] }, subject: { reference: `Patient/${patient}` } });
    res.json({ resourceType: 'Bundle', type: 'searchset', total: conditions.length, entry: conditions.map(r => ({ resource: r })) });
  });

  // ─── Articles ─────────────────────────────────────────────────────────────
  app.get('/api/articles', (req, res) => {
    res.json(db.prepare('SELECT * FROM articles').all());
  });

  // ─── Research Export ─────────────────────────────────────────────────────
  app.post('/api/research/export', authenticateToken, (req: any, res) => {
    if (!['admin'].includes(req.user.role)) return res.sendStatus(403);
    const { cohort_id } = req.body;
    db.prepare('INSERT INTO research_exports (requested_by, cohort_id) VALUES (?, ?)').run(req.user.id, cohort_id || null);

    const data = db.prepare(`
      SELECT u.division, u.district, p.age, p.sex, p.ckd_stage, p.risk_score, p.diabetes, p.hypertension,
        p.family_history, p.arsenic_prone_area, p.nsaid_use, p.uacr
      FROM patients p JOIN users u ON p.user_id = u.id WHERE u.role = 'patient'
    `).all();

    res.json({ exported: data.length, data });
  });

  // ─── Admin User Management ────────────────────────────────────────────────
  app.get('/api/admin/users', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.district, u.division, u.created_at,
        COALESCE(u.active, 1) as active,
        CASE WHEN u.role = 'patient' THEN p.ckd_stage ELSE NULL END as ckd_stage,
        CASE WHEN u.role = 'patient' THEN p.risk_score ELSE NULL END as risk_score
      FROM users u
      LEFT JOIN patients p ON u.role = 'patient' AND p.user_id = u.id
      ORDER BY u.created_at DESC
    `).all();
    res.json(users);
  });

  app.post('/api/admin/users/:id/toggle', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot modify your own account' });
    try {
      db.prepare('ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1').run();
    } catch { /* column already exists */ }
    const user = db.prepare('SELECT COALESCE(active, 1) as active FROM users WHERE id = ?').get(userId) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newStatus = user.active ? 0 : 1;
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(newStatus, userId);
    res.json({ id: userId, active: newStatus });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SMS / USSD / IVR ENDPOINTS (Mock — integration-ready)
  // ════════════════════════════════════════════════════════════════════════════

  // Inbound SMS: "BP 140 90" | "BS 6.5" | "CR 1.4" | "STATUS"
  app.post('/api/sms/inbound', (req, res) => {
    const { from, text, patientId } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });
    const parts = text.trim().toUpperCase().split(/\s+/);
    const cmd = parts[0];
    let reply = '';
    if (patientId) {
      const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(patientId) as any;
      if (patient) {
        if (cmd === 'BP' && parts.length >= 3) {
          const sys = parseInt(parts[1]), dia = parseInt(parts[2]);
          if (!isNaN(sys) && !isNaN(dia)) {
            db.prepare('INSERT INTO vitals_log (patient_id, systolic, diastolic) VALUES (?, ?, ?)').run(patient.id, sys, dia);
            reply = `BP recorded: ${sys}/${dia} mmHg. ${sys > 140 ? 'WARNING: High BP — consult your doctor.' : 'Looks good!'}`;
          }
        } else if (cmd === 'BS' && parts.length >= 2) {
          const sugar = parseFloat(parts[1]);
          if (!isNaN(sugar)) {
            db.prepare('INSERT INTO vitals_log (patient_id, blood_sugar) VALUES (?, ?)').run(patient.id, sugar);
            reply = `Blood sugar recorded: ${sugar} mmol/L. ${sugar > 10 ? 'WARNING: High sugar. Check your diet.' : 'Good.'}`;
          }
        } else if (cmd === 'CR' && parts.length >= 2) {
          const cr = parseFloat(parts[1]);
          if (!isNaN(cr) && cr > 0.1 && cr < 30) {
            db.prepare('INSERT INTO vitals_log (patient_id, creatinine) VALUES (?, ?)').run(patient.id, cr);
            reply = `Creatinine recorded: ${cr} mg/dL.`;
          }
        } else if (cmd === 'STATUS') {
          const pat = db.prepare('SELECT ckd_stage, risk_score FROM patients WHERE user_id = ?').get(patientId) as any;
          if (pat) reply = `KidneyCare BD: Stage ${pat.ckd_stage}, Risk ${pat.risk_score}/100. Reply BP, BS, or CR to log vitals.`;
        }
      }
    }
    if (!reply) reply = 'KidneyCare BD: Commands: BP 140 90, BS 6.5, CR 1.4, STATUS. SMS to update your health data.';
    res.json({ success: true, reply, from, cmd });
  });

  // USSD session menu (simulated)
  app.get('/api/ussd/session', authenticateToken, (req: any, res) => {
    const patient = db.prepare('SELECT p.*, u.name, u.district FROM patients p JOIN users u ON p.user_id = u.id WHERE p.user_id = ?').get(req.user.id) as any;
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const lastVital = db.prepare('SELECT systolic, diastolic FROM vitals_log WHERE patient_id = ? ORDER BY id DESC LIMIT 1').get(patient.id) as any;
    res.json({
      session: {
        patientName: patient.name,
        district: patient.district,
        menu: [
          { key: '1', action: 'CKD Stage & Risk Score', value: `Stage ${patient.ckd_stage} | Risk: ${patient.risk_score}/100` },
          { key: '2', action: 'Latest Blood Pressure', value: lastVital ? `${lastVital.systolic}/${lastVital.diastolic} mmHg` : 'No record yet' },
          { key: '3', action: 'Next Follow-up Reminder', value: 'Contact your CHW or assigned doctor' },
          { key: '4', action: 'Nearest Dialysis Centre', value: patient.district === 'Dhaka' ? 'BSMMU: 02-9661064' : 'Contact district hospital' },
          { key: '5', action: 'Log Vitals via SMS', value: 'Send: BP 140 90 / BS 6.5 / CR 1.4' },
        ],
      },
    });
  });

  // IVR automated reminder (mock — integrate with Twilio/Robi for production)
  app.post('/api/ivr/reminder', authenticateToken, (req: any, res) => {
    const { patientId, message } = req.body;
    const patient = db.prepare('SELECT u.name FROM users u WHERE u.id = ?').get(patientId) as any;
    const defaultMsg = patient
      ? `Hello ${patient.name}, this is KidneyCare BD. Please log your vitals today and take your medications as prescribed. For help, press 1.`
      : 'Please log your vitals today.';
    res.json({ success: true, mock: true, message: message || defaultMsg, note: 'Integrate with Twilio or Robi IVR for live calls.' });
  });

  // Missed-call webhook → replies with latest GFR summary via SMS
  app.post('/api/ivr/missed-call', (req, res) => {
    const { from } = req.body;
    const gfr = db.prepare('SELECT * FROM gfr_records ORDER BY id DESC LIMIT 1').get() as any;
    const smsReply = gfr
      ? `KidneyCare BD: Your latest GFR is ${Math.round(gfr.ckd_epi)} mL/min, CKD Stage ${gfr.stage}. Visit app.kidneycare.bd for full report.`
      : 'KidneyCare BD: No GFR record found. Register at app.kidneycare.bd or ask your CHW.';
    res.json({ success: true, mock: true, smsReply, from });
  });

  // ─── Vite / Static ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true, allowedHosts: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KidneyCare BD Enhanced Server running on http://localhost:${PORT}`);
    console.log(`Database: ${databasePath}`);
  });
}

startServer();
