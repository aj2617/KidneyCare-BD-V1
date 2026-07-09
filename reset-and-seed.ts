import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('kidneycare.db');

async function resetAndSeed() {
  console.log('Resetting and seeding database...');

  // Clear existing data with FK check disabled
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM articles');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM patients');
  db.exec('DELETE FROM vitals_log');
  db.exec('DELETE FROM gfr_records');
  db.exec('DELETE FROM alerts');
  db.exec('DELETE FROM chw_workers');
  db.exec('DELETE FROM chw_patient_assignments');
  db.exec('DELETE FROM chw_scheduled_visits');
  db.exec('DELETE FROM chw_visit_summaries');
  db.exec('DELETE FROM patient_surveys');
  db.exec('DELETE FROM consultation_requests');
  db.exec('PRAGMA foreign_keys = ON;');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Admin
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
    'Admin Officer', 'admin@kidneycare.bd', hashedPassword, 'admin'
  );

  // 2. Create 5 Doctors
  const doctorIds: number[] = [];
  const doctorNames = ['Dr. Hasan', 'Dr. Rahman', 'Dr. Ahmed', 'Dr. Chowdhury', 'Dr. Islam'];
  for (let i = 0; i < doctorNames.length; i++) {
    const doctorResult = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
      doctorNames[i], `doctor${i + 1}@kidneycare.bd`, hashedPassword, 'doctor'
    );
    doctorIds.push(doctorResult.lastInsertRowid as number);
  }
  console.log(`Created ${doctorIds.length} doctors.`);

  // 3. Create CHWs
  const chwDistricts = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Sylhet', 'Barisal', 'Rangpur', 'Mymensingh', 'Comilla', 'Gazipur'];
  chwDistricts.forEach((district, i) => {
    const chwResult = db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run(
      `CHW ${district}`, `chw_${district.toLowerCase()}@kidneycare.bd`, hashedPassword, 'chw', district
    );
    db.prepare('INSERT INTO chw_workers (user_id, region) VALUES (?, ?)').run(chwResult.lastInsertRowid, district);
  });
  console.log(`Created CHWs for ${chwDistricts.length} districts.`);

  // 4. Create 20 Patients
  const districts = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Sylhet', 'Barisal', 'Rangpur', 'Mymensingh', 'Comilla', 'Gazipur'];
  
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

  for (let i = 1; i <= 20; i++) {
    const timestamp = Date.now();
    const name = `Patient ${i} (Dist-${i})`;
    const email = `patient_${i}@kidneycare.bd`;
    const district = districts[i % districts.length];
    
    // Create User
    const userResult = db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run(
      name, email, hashedPassword, 'patient', district
    );
    const userId = userResult.lastInsertRowid;
    
    const age = 20 + (i * 3);
    const sex = i % 2 === 0 ? 'male' : 'female';
    const weight = 55 + i * 1.5;
    const diabetes = i % 2 === 0 ? 1 : 0;
    const hypertension = i % 3 === 0 ? 1 : 0;
    const ckd_stage = (i % 5) + 1;
    const risk_score = 15 + i * 4;
    
    // Assign to a doctor round-robin
    const doctorId = doctorIds[i % doctorIds.length];

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
      patientId, 110 + i * 2, 70 + i, 5.0 + (i % 4), 0.8 + i * 0.15, 'Trace'
    );

    // Add GFR records
    db.prepare('INSERT INTO gfr_records (patient_id, mdrd, cg, ckd_epi, stage, recommendation) VALUES (?, ?, ?, ?, ?, ?)').run(
      patientId, 90 - i * 3, 85 - i * 3, 88 - i * 3, ckd_stage, 'Monitor regularly'
    );

    // Add survey response
    const surveyIndex = i % 3;
    const baseSurvey = sampleSurveys[surveyIndex];
    const survey = { ...baseSurvey, age, gender: sex === 'male' ? 'Male' : 'Female' };
    const completedAt = new Date(Date.now() - i * 86400000).toISOString();
    
    db.prepare('INSERT INTO patient_surveys (patient_id, responses, completed_at) VALUES (?, ?, ?)').run(
      patientId, JSON.stringify(survey), completedAt
    );
  }
  console.log('Created 20 patients and assigned them to doctors.');

  // Create Articles
  const articles = [
    {
      title_en: 'Understanding CKD Stages',
      title_bn: 'সিকেডি পর্যায়গুলি বোঝা',
      content_en: 'Chronic Kidney Disease (CKD) is divided into 5 stages based on your GFR score. Stage 1 is mild, while Stage 5 means kidney failure.',
      content_bn: 'ক্রনিক কিডনি ডিজিজ (সিকেডি) আপনার জিএফআর স্কোরের উপর ভিত্তি করে ৫টি পর্যায়ে বিভক্ত। পর্যায় ১ মৃদু, আর পর্যায় ৫ মানে কিডনি বিকল হওয়া।',
      category: 'Basics'
    },
    {
      title_en: 'Diet Tips for Kidney Health',
      title_bn: 'কিডনি স্বাস্থ্যের জন্য ডায়েট টিপস',
      content_en: 'A kidney-friendly diet involves low sodium, low potassium, and controlled protein intake. Focus on fresh vegetables and fruits.',
      content_bn: 'কিডনি-বান্ধব ডায়েটে কম সোডিয়াম, কম পটাশিয়াম এবং নিয়ন্ত্রিত প্রোটিন গ্রহণ অন্তর্ভুক্ত। তাজা শাকসবজি এবং ফলের দিকে মনোনিবেশ করুন।',
      category: 'Diet'
    }
  ];

  const insertArticle = db.prepare('INSERT INTO articles (title_en, title_bn, content_en, content_bn, category) VALUES (?, ?, ?, ?, ?)');
  articles.forEach(a => insertArticle.run(a.title_en, a.title_bn, a.content_en, a.content_bn, a.category));
  console.log('Created knowledge base articles.');

  console.log('Seeding complete! Database has been reset with 5 doctors and 20 patients.');
}

resetAndSeed();
