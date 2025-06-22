import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Database.js NON-BLOQUANT...');

// ✅ POOL SIMPLE
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'motus',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0
});

// ✅ EXPORT IMMÉDIAT
export const connection = pool;

console.log('✅ Database.js chargé (pool créé)');

// ✅ TEST ASYNCHRONE NON-BLOQUANT
setImmediate(async () => {
    try {
        const [rows] = await pool.execute('SELECT COUNT(*) as count FROM mots');
        console.log(`✅ Database connectée: ${rows[0].count} mots disponibles`);
    } catch (error) {
        console.warn('⚠️ Database non accessible:', error.message);
    }
});