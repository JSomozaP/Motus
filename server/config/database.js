import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration de la base de données
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'motus',
    waitForConnections: true,
    port: process.env.DB_PORT || 3306,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};
console.log(dbConfig)
// Créer la connexion
//`mysql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
export const connection = mysql.createConnection({
    host: "localhost",
    user:"root",   
    database:"motus",
});

// Test de connexion
const testConnection =  async() => {
    
    try {
        const [row] = await connection.execute('SELECT * FROM mots;');
        console.log('✅ Connexion à la base de données réussie');
        // Si la requête réussit, la connexion est établie
        return true;
    } catch (error) {
        console.error('❌ Erreur de connexion à la base de données:', error.message);
        return false;
    }
};

// Initialiser la connexion au démarrage
testConnection();