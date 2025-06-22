import mysql from 'mysql2/promise';

console.log('🔍 Test MySQL2 isolation...');

async function testMySQL() {
    try {
        console.log('1️⃣ Création pool...');
        const pool = mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'motus',
            port: 3306,
            connectionLimit: 1
        });
        
        console.log('2️⃣ Pool créé, test requête...');
        const [rows] = await pool.execute('SELECT COUNT(*) as count FROM mots');
        console.log('3️⃣ Succès:', rows[0]);
        
        await pool.end();
        console.log('4️⃣ Pool fermé');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

testMySQL();