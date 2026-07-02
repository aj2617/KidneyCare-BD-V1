import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('kidneycare.db');

async function seed() {
  console.log('Seeding database...');

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
  db.exec('PRAGMA foreign_keys = ON;');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
    'Admin Officer', 'admin@kidneycare.bd', hashedPassword, 'admin'
  );

  // Create Doctor
  const doctorResult = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
    'Dr. Ahmed Khan', 'doctor@kidneycare.bd', hashedPassword, 'doctor'
  );
  const doctorId = doctorResult.lastInsertRowid;

  // Create CHWs
  const chwSeed = [
    { name: 'CHW Fatema Begum', email: 'chw@kidneycare.bd', district: 'Rajshahi', division: 'Rajshahi' },
    { name: 'CHW Nasrin Akter', email: 'chw2@kidneycare.bd', district: 'Dhaka', division: 'Dhaka' },
    { name: 'CHW Rokeya Khanam', email: 'chw3@kidneycare.bd', district: 'Khulna', division: 'Khulna' },
    { name: 'CHW Momotaz Begum', email: 'chw4@kidneycare.bd', district: 'Sylhet', division: 'Sylhet' },
    { name: 'CHW Shapla Rani', email: 'chw5@kidneycare.bd', district: 'Barisal', division: 'Barisal' }
  ];
  chwSeed.forEach(c => {
    const u = db.prepare('INSERT INTO users (name, email, password, role, district, division) VALUES (?, ?, ?, ?, ?, ?)').run(
      c.name, c.email, hashedPassword, 'chw', c.district, c.division
    );
    db.prepare('INSERT INTO chw_workers (user_id, region) VALUES (?, ?)').run(u.lastInsertRowid, c.district);
  });

  // Create Patients
  const districts = ['Dhaka', 'Chittagong', 'Gazipur', 'Narayanganj', 'Rajshahi'];

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
    },
  ];
  
  for (let i = 1; i <= 5; i++) {
    const name = `Patient ${i}`;
    const email = `patient${i}@example.com`;
    const district = districts[i % districts.length];
    
    const userResult = db.prepare('INSERT INTO users (name, email, password, role, district) VALUES (?, ?, ?, ?, ?)').run(
      name, email, hashedPassword, 'patient', district
    );
    const userId = userResult.lastInsertRowid;
    
    const patientResult = db.prepare('INSERT INTO patients (user_id, age, sex, weight, diabetes, hypertension, risk_score, ckd_stage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      userId, 40 + i * 5, i % 2 === 0 ? 'male' : 'female', 65 + i * 2, i % 2 === 0 ? 1 : 0, 1, 30 + i * 10, i % 3 + 1
    );
    const patientId = patientResult.lastInsertRowid;
    
    // Assign patient to CHW if they are in the same district
    const chwMatch = db.prepare('SELECT user_id FROM users WHERE role = ? AND district = ?').get('chw', district) as any;
    if (chwMatch) {
      db.prepare('INSERT INTO chw_patient_assignments (chw_id, patient_id) VALUES (?, ?)').run(chwMatch.user_id, patientId);
    }

    // Add some vitals
    db.prepare('INSERT INTO vitals_log (patient_id, systolic, diastolic, blood_sugar, creatinine, urine_protein) VALUES (?, ?, ?, ?, ?, ?)').run(
      patientId, 130 + i, 85 + i, 6.5, 1.2 + i * 0.1, '1+'
    );

    // Add GFR records
    db.prepare('INSERT INTO gfr_records (patient_id, mdrd, cg, ckd_epi, stage, recommendation) VALUES (?, ?, ?, ?, ?, ?)').run(
      patientId, 60 - i * 5, 55 - i * 5, 58 - i * 5, i % 3 + 1, 'Monitor regularly'
    );

    // Add survey responses for first 3 patients (as if they completed the survey)
    if (i <= 3) {
      const survey = sampleSurveys[i - 1];
      const completedAt = new Date(Date.now() - i * 86400000).toISOString();
      db.prepare('INSERT INTO patient_surveys (patient_id, responses, completed_at) VALUES (?, ?, ?)').run(
        patientId, JSON.stringify(survey), completedAt
      );
      db.prepare('UPDATE patients SET survey_completed = 1 WHERE id = ?').run(patientId);
    }
  }

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

  console.log('Seeding complete!');
}

seed();
