import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connection from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import testRoutes from './routes/testRoutes.js';
import gameRoutes from './routes/gameRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes du jeu
app.use('/api/game', gameRoutes);

// Route de test simple
app.get('/test', (req, res) => {
    res.json({ message: "Le serveur fonctionne !" });
});

// Routes d'authentification
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);

// Test de la connexion à la base de données
console.log('Connexion à la base de données établie');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});