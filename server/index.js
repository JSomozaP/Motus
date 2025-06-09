import express from 'express';
import dotenv from 'dotenv';
import connection from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import testRoutes from './routes/testRoutes.js';
import gameRoutes from './routes/gameRoutes.js';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/game', gameRoutes);

// Route de test simple
app.get('/test', (req, res) => {
    res.json({ message: "Le serveur fonctionne !" });
});

// Routes d'authentification
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);

// Test de la connexion à la base de données
connection.connect(error => {
    if (error) {
        console.error('Erreur de connexion à la base de données :', error);
        return;
    }
    console.log('Connexion réussie à la base de données MySQL');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});