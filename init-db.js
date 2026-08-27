import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://techops_feedback_user:nZHAnAY3qdtJHgtkVFEvXHCIE0XaQXR7@dpg-da7s1j67bikc738eblg0-a.singapore-postgres.render.com/techops_feedback'
});

async function initDatabase() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'db/init.sql'), 'utf-8');
    
    console.log('Executing database schema...');
    await pool.query(sql);
    
    console.log('✅ Database initialized successfully!');
    console.log('Verifying tables...');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Tables created:');
    result.rows.forEach(row => console.log('  -', row.table_name));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();