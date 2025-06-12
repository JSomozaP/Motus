import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration de la base de données
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'motus_user',
    password: process.env.DB_PASSWORD || 'votre_mot_de_passe',
    database: process.env.DB_NAME || 'motus_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

// Créer la connexion
export const connection = mysql.createPool(dbConfig);

// Test de connexion
export const testConnection = async () => {
    try {
        const testQuery = await connection.execute('SELECT 1 as test');
        console.log('✅ Connexion à la base de données réussie');
        return true;
    } catch (error) {
        console.error('❌ Erreur de connexion à la base de données:', error.message);
        return false;
    }
};

// Initialiser la connexion au démarrage
testConnection();

export default connection;