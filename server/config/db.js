import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'motus_user',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'motus'
});

export default connection;