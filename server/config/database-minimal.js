import mysql from 'mysql2/promise';

console.log('🔧 Database MINIMAL...');

// ✅ CONFIGURATION ULTRA-CONSERVATIVE
const pool = mysql.createPool({
    host: '127.0.0.1',        // ✅ IP au lieu de localhost
    user: 'root',
    password: '',
    database: 'motus',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 1,       // ✅ Une seule connexion
    queueLimit: 0,
    acquireTimeout: 2000,     // ✅ Timeout court
    timeout: 2000             // ✅ Timeout court
});

export const connection = pool;
console.log('✅ Database MINIMAL chargé');