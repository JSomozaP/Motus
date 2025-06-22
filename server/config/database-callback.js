import mysql from 'mysql2';  // ✅ SANS /promise

console.log('🔧 Database CALLBACK...');

// ✅ POOL AVEC CALLBACKS (non-bloquant)
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'motus',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0
});

// ✅ WRAPPER PROMISIFIÉ MANUEL
export const connection = {
    execute: (query, params = []) => {
        return new Promise((resolve, reject) => {
            pool.execute(query, params, (error, results, fields) => {
                if (error) {
                    console.error('❌ MySQL error:', error.message);
                    reject(error);
                } else {
                    console.log('✅ MySQL success');
                    resolve([results, fields]);
                }
            });
        });
    },
    
    end: () => {
        return new Promise((resolve) => {
            pool.end(() => {
                console.log('✅ Pool fermé');
                resolve();
            });
        });
    }
};

console.log('✅ Database CALLBACK chargé');