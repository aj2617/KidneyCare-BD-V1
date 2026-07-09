import Database from 'better-sqlite3';

const db = new Database('kidneycare.db');

const counts = db.prepare(`
  SELECT u.name, u.email, COUNT(p.id) as patient_count 
  FROM users u
  LEFT JOIN patients p ON u.id = p.assigned_doctor_id
  WHERE u.role = 'doctor'
  GROUP BY u.id
`).all();

console.table(counts);
