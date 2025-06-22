import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Database FIXED - Non-bloquant...');

// ✅ POOL SANS OPTIONS OBSOLÈTES
let pool;

try {
    pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'motus',
        port: 3306,
        waitForConnections: true,
        connectionLimit: 3,
        queueLimit: 0
        // ❌ Retiré: acquireTimeout et timeout (obsolètes)
    });
    
    console.log('✅ Pool database créé (sans warnings)');
} catch (error) {
    console.error('❌ Erreur création pool:', error.message);
    pool = null;
}

// ✅ EXPORT IMMÉDIAT
export const connection = pool;

// ✅ TEST ASYNCHRONE
if (pool) {
    setImmediate(async () => {
        try {
            const [rows] = await pool.execute('SELECT COUNT(*) as count FROM mots');
            console.log(`✅ Database test: ${rows[0].count} mots disponibles`);
        } catch (error) {
            console.warn('⚠️ Database test échoué:', error.message);
        }
    });
}

console.log('✅ Database-fixed chargé');