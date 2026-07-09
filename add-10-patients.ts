import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('kidneycare.db');

async function add10Patients() {
  console.log('Adding 10 new patients...');

  const doctor = db.prepare("SELECT id FROM users WHERE role = 'doctor' LIMIT 1").get() as any;
  if (!doctor) {
    console.error('No doctor found in the database.');
    return;
  }
  const doctorId = doctor.id;

  const hashedPassword = await bcrypt.hash('password123', 10);
  const districts = ['Dhaka', 'Chittagong', 'Gazipur', 'Narayanganj', 'Rajshahi', 'Sylhet', 'Khulna', 'Barisal'];

  const sampleSurveys = [
    {
      age: 45, gender: 'Male', education: 'Secondary', occupation: 'Service', residential_area: 'Urban', monthly_income: 25000,
      hypertension_dx: 'Yes', diabetes_dx: 'Yes', family_kidney: 'No', kidney_stones: 'No', kidney_disease_prior: 'Yes',
      kidney_disease_type: 'CKD', bp_medication: 'Yes', diabetes_medication: 'Yes', dialysis: 'No',
      urine_changes: 'Yes', foamy_urine: 'Yes', leg_swelling: 'No', fatigue: 'Yes', nausea: 'No',
      appetite_loss: 'No', weight_loss: 'No', shortness_breath: 'No',
      smoker: 'No', alcohol: 'Never', water_intake: '4–7', salty_food: 'Frequently', exercise: 'No', sleep_hours: 6,
      bp_systolic: 140, bp_diastolic: 90, creatinine: 1.8, urine_test: 'Yes', kidney_function_test: 'Yes',
      aware_risk_factors: 'Yes', health_checkup_freq: 'Yearly', received_advice: 'Yes',
      dietary_restrictions: 'Yes', tested_creatinine: 'Yes', knows_htn_dm_damage: 'Yes', painkillers: 'No',
    },
    {
      age: 55, gender: 'Female', education: 'Primary', occupation: 'Housewife', residential_area: 'Rural', monthly_income: 12000,
      hypertension_dx: 'Yes', diabetes_dx: 'No', family_kidney: 'Yes', kidney_stones: 'Yes', kidney_disease_prior: 'No',
      kidney_disease_type: '', bp_medication: 'Yes', diabetes_medication: 'No', dialysis: 'No',
      urine_changes: 'No', foamy_urine: 'No', leg_swelling: 'Yes', fatigue: 'Yes', nausea: 'Yes',
      appetite_loss: 'Yes', weight_loss: 'No', shortness_breath: 'No',
      smoker: 'No', alcohol: 'Never', water_intake: 'Less than 4', salty_food: 'Occasionally', exercise: 'No', sleep_hours: 7,
      bp_systolic: 150, bp_diastolic: 95, creatinine: 2.1, urine_test: 'No', kidney_function_test: 'No',
      aware_risk_factors: 'No', health_checkup_freq: 'Only when sick', received_advice: 'No',
      dietary_restrictions: 'No', tested_creatinine: 'No', knows_htn_dm_damage: 'No', painkillers: 'Yes',
    },
    {
      age: 38, gender: 'Male', education: 'Graduate or above', occupation: 'Business', residential_area: 'Urban', monthly_income: 45000,
      hypertension_dx: 'No', diabetes_dx: 'Yes', family_kidney: 'No', kidney_stones: 'No', kidney_disease_prior: 'No',
      kidney_disease_type: '', bp_medication: 'No', diabetes_medication: 'Yes', dialysis: 'No',
      urine_changes: 'No', foamy_urine: 'No', leg_swelling: 'No', fatigue: 'No', nausea: 'No',
      appetite_loss: 'No', weight_loss: 'No', shortness_breath: 'No',
      smoker: 'Former', alcohol: 'Occasionally', water_intake: '8–10', salty_food: 'Occasionally', exercise: 'Yes', sleep_hours: 8,
      bp_systolic: 120, bp_diastolic: 80, creatinine: 1.1, urine_test: 'Yes', kidney_function_test: 'Yes',
      aware_risk_factors: 'Yes', health_checkup_freq: 'Yearly', received_advice: 'Yes',
      dietary_restrictions: 'Yes', tested_creatinine: 'Yes', knows_htn_dm_damage: 'Yes', painkillers: 'No',
    }
  ];

  for (let i = 1; i <= 10; i++) {
    const timestamp = Date.now();
    const name = `New Patient ${timestamp} ${i}`;
    const email = `newpatient_${timestamp}_${i}@example.com`;
    const district = districts[i % districts.length];
    
    // Create User
    const userResult = db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run(
      name, email, hashedPassword, 'patient', district
    );
    const userId = userResult.lastInsertRowid;
    
    const age = 30 + i * 3;
    const sex = i % 2 === 0 ? 'male' : 'female';
    const weight = 60 + i * 2;
    const diabetes = i % 2 === 0 ? 1 : 0;
    const hypertension = i % 3 === 0 ? 1 : 0;
    const ckd_stage = (i % 5) + 1;
    const risk_score = 20 + i * 5;

    // Create Patient
    const patientResult = db.prepare('INSERT INTO patients (user_id, age, sex, weight, diabetes, hypertension, risk_score, ckd_stage, assigned_doctor_id, survey_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      userId, age, sex, weight, diabetes, hypertension, risk_score, ckd_stage, doctorId, 1
    );
    const patientId = patientResult.lastInsertRowid;
    
    // Assign patient to CHW if they are in the same district
    const chwMatch = db.prepare('SELECT id FROM users WHERE role = ? AND district = ?').get('chw', district) as any;
    if (chwMatch) {
      db.prepare('INSERT INTO chw_patient_assignments (chw_id, patient_id) VALUES (?, ?)').run(chwMatch.id, patientId);
    }

    // Add some vitals
    db.prepare('INSERT INTO vitals_log (patient_id, systolic, diastolic, blood_sugar, creatinine, urine_protein) VALUES (?, ?, ?, ?, ?, ?)').run(
      patientId, 120 + i * 2, 80 + i, 5.5 + (i % 3), 1.0 + i * 0.1, 'Trace'
    );

    // Add GFR records
    db.prepare('INSERT INTO gfr_records (patient_id, mdrd, cg, ckd_epi, stage, recommendation) VALUES (?, ?, ?, ?, ?, ?)').run(
      patientId, 70 - i * 3, 65 - i * 3, 68 - i * 3, ckd_stage, 'Monitor regularly'
    );

    // Add survey response
    const surveyIndex = i % 3;
    const baseSurvey = sampleSurveys[surveyIndex];
    // Create a copy of the survey and slightly modify it
    const survey = { ...baseSurvey, age, gender: sex === 'male' ? 'Male' : 'Female' };
    const completedAt = new Date(Date.now() - i * 86400000).toISOString();
    
    db.prepare('INSERT INTO patient_surveys (patient_id, responses, completed_at) VALUES (?, ?, ?)').run(
      patientId, JSON.stringify(survey), completedAt
    );
  }

  console.log('10 new patients added successfully!');
}

add10Patients();
