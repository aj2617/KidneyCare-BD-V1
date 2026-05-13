import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('kidneycare.db');

async function seed() {
  console.log('Seeding database...');

  // Clear existing data
  db.exec('DELETE FROM articles');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM patients');
  db.exec('DELETE FROM vitals_log');
  db.exec('DELETE FROM gfr_records');
  db.exec('DELETE FROM alerts');

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

  // Create Patients
  const districts = ['Dhaka', 'Chittagong', 'Gazipur', 'Narayanganj', 'Rajshahi'];
  
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

    // Add some vitals
    db.prepare('INSERT INTO vitals_log (patient_id, systolic, diastolic, blood_sugar, creatinine, urine_protein) VALUES (?, ?, ?, ?, ?, ?)').run(
      patientId, 130 + i, 85 + i, 6.5, 1.2 + i * 0.1, '1+'
    );

    // Add GFR records
    db.prepare('INSERT INTO gfr_records (patient_id, mdrd, cg, ckd_epi, stage, recommendation) VALUES (?, ?, ?, ?, ?, ?)').run(
      patientId, 60 - i * 5, 55 - i * 5, 58 - i * 5, i % 3 + 1, 'Monitor regularly'
    );
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
