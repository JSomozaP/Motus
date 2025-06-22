import mysql from 'mysql2';  // SANS /promise

console.log('🔍 Test MySQL2 callback...');

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'motus',
    port: 3306,
    connectionLimit: 1
});

console.log('1️⃣ Pool callback créé');

// ✅ TEST AVEC CALLBACK
pool.execute('SELECT COUNT(*) as count FROM mots', (error, results) => {
    if (error) {
        console.error('❌ Callback error:', error.message);
    } else {
        console.log('✅ Callback success:', results[0]);
    }
    
    pool.end(() => {
        console.log('✅ Pool callback fermé');
        process.exit(0);
    });
});

console.log('2️⃣ Requête callback lancée');
