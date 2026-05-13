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
  process.env.DATABASE_URL ||
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

    db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run('Admin Officer', 'admin@kidneycare.bd', hashedPassword, 'admin', 'Dhaka');
    db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run('Dr. Ahmed Khan', 'doctor@kidneycare.bd', hashedPassword, 'doctor', 'Dhaka');

    const chwUser = db.prepare('INSERT INTO users (name, email, password, role, district, division) VALUES (?, ?, ?, ?, ?, ?)').run('CHW Fatema Begum', 'chw@kidneycare.bd', hashedPassword, 'chw', 'Rajshahi', 'Rajshahi');
    db.prepare('INSERT INTO chw_workers (user_id, region) VALUES (?, ?)').run(chwUser.lastInsertRowid, 'Rajshahi');

    const districts = ['Dhaka', 'Chittagong', 'Gazipur', 'Narayanganj', 'Rajshahi', 'Sylhet', 'Khulna', 'Barisal', 'Chapainawabganj', 'Noakhali'];
    districts.forEach((dist, i) => {
      const p = db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run(`Patient ${dist}`, `patient_${dist.toLowerCase().replace(/[' ]/g, '_')}@kidneycare.bd`, hashedPassword, 'patient', dist);
      const doctorId = i % 2 === 0 ? 2 : null;
      const isArsenic = ARSENIC_DISTRICTS.has(dist) ? 1 : 0;
      const patRec = db.prepare('INSERT INTO patients (user_id, age, sex, weight, diabetes, hypertension, risk_score, ckd_stage, assigned_doctor_id, arsenic_prone_area) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(p.lastInsertRowid, 40 + i * 5, i % 2 === 0 ? 'male' : 'female', 60 + i * 2, i % 3 === 0 ? 1 : 0, 1, 20 + i * 10, (i % 4) + 1, doctorId, isArsenic);
      // Seed some vitals
      db.prepare('INSERT INTO vitals_log (patient_id, systolic, diastolic, blood_sugar, creatinine, urine_protein, weight, edema, fatigue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(patRec.lastInsertRowid, 130 + i * 3, 85 + i * 2, 5.5 + i * 0.3, 1.1 + i * 0.2, 'Negative', 60 + i * 2, 0, 4);
    });

    const articles = [
      { en: 'Understanding CKD Stages', bn: 'সিকেডি পর্যায়গুলি বোঝা', cat: 'Basics', content_en: 'Chronic Kidney Disease (CKD) is divided into 5 stages based on your GFR score. Stage 1 is mild, while Stage 5 means kidney failure. Monitoring your GFR is crucial for early detection.', content_bn: 'ক্রনিক কিডনি ডিজিজ (সিকেডি) আপনার জিএফআর স্কোরের উপর ভিত্তি করে ৫টি পর্যায়ে বিভক্ত। পর্যায় ১ মৃদু, আর পর্যায় ৫ মানে কিডনি বিকল হওয়া।' },
      { en: 'Diet Tips for Kidney Health', bn: 'কিডনি স্বাস্থ্যের জন্য ডায়েট টিপস', cat: 'Diet', content_en: 'A kidney-friendly diet involves low sodium, low potassium, and controlled protein intake. Focus on fresh vegetables like cauliflower and fruits like apples. Avoid processed foods.', content_bn: 'কিডনি-বান্ধব ডায়েটে কম সোডিয়াম, কম পটাশিয়াম এবং নিয়ন্ত্রিত প্রোটিন গ্রহণ অন্তর্ভুক্ত।' },
      { en: 'Managing Hypertension', bn: 'উচ্চ রক্তচাপ ব্যবস্থাপনা', cat: 'Management', content_en: 'High blood pressure is a leading cause of CKD. Maintain a healthy weight, exercise regularly, and take prescribed medications to protect your kidneys.', content_bn: 'উচ্চ রক্তচাপ সিকেডির একটি প্রধান কারণ। আপনার কিডনি রক্ষা করার জন্য স্বাস্থ্যকর ওজন বজায় রাখুন।' },
      { en: 'Diabetes and Kidney Disease', bn: 'ডায়াবেটিস এবং কিডনি রোগ', cat: 'Management', content_en: 'Uncontrolled diabetes can damage the small blood vessels in your kidneys. Keep your blood sugar levels within target range to prevent CKD progression.', content_bn: 'অনিয়ন্ত্রিত ডায়াবেটিস আপনার কিডনির ছোট রক্তনালীগুলিকে ক্ষতিগ্রস্ত করতে পারে।' },
      { en: 'Dialysis and Transplantation', bn: 'ডায়ালাইসিস এবং প্রতিস্থাপন', cat: 'Treatment', content_en: 'When kidneys reach Stage 5 (failure), treatments like hemodialysis or a kidney transplant are necessary. Hemodialysis filters blood using a machine, while a transplant involves surgery.', content_bn: 'যখন কিডনি পর্যায় ৫-এ (বিকল) পৌঁছায়, তখন হেমোডায়ালাইসিস বা কিডনি প্রতিস্থাপনের মতো চিকিৎসার প্রয়োজন হয়।' },
      { en: 'Arsenic and Kidney Health in Bangladesh', bn: 'বাংলাদেশে আর্সেনিক ও কিডনি স্বাস্থ্য', cat: 'Basics', content_en: 'Groundwater arsenic contamination in many Bangladesh districts is a known nephrotoxin. Patients in affected areas face higher CKD risk. Use safe water sources and get tested.', content_bn: 'বাংলাদেশের অনেক জেলায় ভূগর্ভস্থ জলে আর্সেনিক দূষণ কিডনির জন্য ক্ষতিকর। নিরাপদ পানি ব্যবহার করুন।' },
    ];
    const insertArt = db.prepare('INSERT INTO articles (title_en, title_bn, content_en, content_bn, category) VALUES (?, ?, ?, ?, ?)');
    articles.forEach(a => insertArt.run(a.en, a.bn, a.content_en, a.content_bn, a.cat));

    console.log('Seeding complete.');
  }

  // ─── Seed diet suggestions ────────────────────────────────────────────────
  const dietCount = db.prepare('SELECT COUNT(*) as count FROM diet_suggestions').get() as any;
  if (dietCount.count === 0) {
    const foods = [
      { en: 'Banana', bn: 'কলা', cat: 'Fruit', k: 422, na: 1, p: 22, stages: '1,2', ae: 'Limit in stages 3-5 due to high potassium.', ab: 'পর্যায় ৩-৫ এ পটাশিয়াম বেশি থাকায় পরিমিত খান।' },
      { en: 'Apple', bn: 'আপেল', cat: 'Fruit', k: 195, na: 2, p: 20, stages: '1,2,3,4,5', ae: 'Safe for all CKD stages.', ab: 'সব পর্যায়ে নিরাপদ।' },
      { en: 'White Rice', bn: 'সাদা চাল', cat: 'Grain', k: 55, na: 1, p: 68, stages: '1,2,3,4,5', ae: 'Preferred over red/brown rice due to lower phosphorus.', ab: 'লাল চালের চেয়ে কম ফসফরাস থাকায় সাদা চাল ভালো।' },
      { en: 'Red Rice', bn: 'লাল চাল', cat: 'Grain', k: 154, na: 7, p: 162, stages: '1,2', ae: 'High phosphorus — use white rice instead for stage 3+.', ab: 'ফসফরাস বেশি — পর্যায় ৩+ এ সাদা চাল ব্যবহার করুন।' },
      { en: 'Cauliflower', bn: 'ফুলকপি', cat: 'Vegetable', k: 320, na: 30, p: 44, stages: '1,2,3,4,5', ae: 'Excellent kidney-friendly vegetable.', ab: 'চমৎকার কিডনি-বান্ধব সবজি।' },
      { en: 'Spinach', bn: 'পালং শাক', cat: 'Vegetable', k: 839, na: 65, p: 49, stages: '1,2', ae: 'Very high potassium — avoid in stage 3+.', ab: 'পটাশিয়াম অনেক বেশি — পর্যায় ৩+ এ এড়িয়ে চলুন।' },
      { en: 'Egg White', bn: 'ডিমের সাদা অংশ', cat: 'Protein', k: 54, na: 55, p: 5, stages: '1,2,3,4,5', ae: 'High-quality low-phosphorus protein source.', ab: 'উচ্চমানের কম ফসফরাসযুক্ত প্রোটিন।' },
      { en: 'Fish (small)', bn: 'ছোট মাছ', cat: 'Protein', k: 350, na: 70, p: 200, stages: '1,2,3', ae: 'Good protein source; limit portions in stage 4-5.', ab: 'ভালো প্রোটিন; পর্যায় ৪-৫ এ পরিমাণ সীমিত করুন।' },
      { en: 'Lentils (Dal)', bn: 'ডাল', cat: 'Protein', k: 730, na: 4, p: 180, stages: '1,2', ae: 'High potassium and phosphorus — limit to 1-2 times/week in stage 3+.', ab: 'পটাশিয়াম ও ফসফরাস বেশি — পর্যায় ৩+ এ সপ্তাহে ১-২ বার সীমিত করুন।' },
      { en: 'Bottle Gourd (Lau)', bn: 'লাউ', cat: 'Vegetable', k: 170, na: 2, p: 20, stages: '1,2,3,4,5', ae: 'Excellent low-potassium vegetable for CKD.', ab: 'সিকেডির জন্য চমৎকার কম পটাশিয়ামের সবজি।' },
      { en: 'Bitter Gourd (Karela)', bn: 'করলা', cat: 'Vegetable', k: 296, na: 5, p: 31, stages: '1,2,3,4,5', ae: 'Good for diabetic CKD patients; moderate potassium.', ab: 'ডায়াবেটিক সিকেডি রোগীর জন্য ভালো।' },
      { en: 'Coconut Water', bn: 'ডাবের পানি', cat: 'Beverage', k: 600, na: 252, p: 48, stages: '1', ae: 'Very high potassium — avoid in CKD stage 2+.', ab: 'পটাশিয়াম অনেক বেশি — সিকেডি পর্যায় ২+ এ এড়িয়ে চলুন।' },
      { en: 'Guava', bn: 'পেয়ারা', cat: 'Fruit', k: 417, na: 2, p: 40, stages: '1,2', ae: 'High potassium — limit in stage 3+.', ab: 'পটাশিয়াম বেশি — পর্যায় ৩+ এ সীমিত করুন।' },
      { en: 'Papaya', bn: 'পেঁপে', cat: 'Fruit', k: 264, na: 8, p: 10, stages: '1,2,3', ae: 'Moderate potassium — safe in early CKD.', ab: 'মধ্যম পটাশিয়াম — প্রাথমিক সিকেডিতে নিরাপদ।' },
      { en: 'Chicken (skinless)', bn: 'মুরগির মাংস (চামড়া ছাড়া)', cat: 'Protein', k: 256, na: 74, p: 220, stages: '1,2,3,4,5', ae: 'Good protein, moderate phosphorus — limit to 3oz per meal.', ab: 'ভালো প্রোটিন, মধ্যম ফসফরাস।' },
      { en: 'Salt (table)', bn: 'লবণ', cat: 'Condiment', k: 8, na: 38758, p: 3, stages: '', ae: 'Limit strictly — high sodium worsens hypertension and CKD.', ab: 'কঠোরভাবে সীমিত করুন — উচ্চ সোডিয়াম সিকেডি আরও খারাপ করে।' },
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

  app.get('/api/doctor/assign-patient', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'doctor') return res.sendStatus(403);
    const { patient_id } = req.query;
    db.prepare('UPDATE patients SET assigned_doctor_id = ? WHERE id = ?').run(req.user.id, patient_id);
    res.json({ message: 'Patient assigned' });
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
