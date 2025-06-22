import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { connection } from './config/database-mock-complet.js';
import authRoutes from './routes/authRoutes-ultra-simple.js';
// import proxyRoutes from './routes/proxyRoutes.js'; // ❌ TEMPORAIREMENT DÉSACTIVÉ
import databaseRoutes from './routes/database-routes.js';
import gameRoutes from './routes/gameRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

console.log('🚀 Index.js SANS proxyRoutes (test)...');

// ✅ DEBUG
app.use((req, res, next) => {
    console.log(`📍 ${req.method} ${req.url}`);
    next();
});

// ✅ CORS
app.use(cors({
    origin: ['http://localhost:4201', 'http://localhost:4200'],
    credentials: true
}));

// ✅ JSON
app.use(express.json());

// ✅ ROUTES BASIQUES
app.get('/test', (req, res) => {
    console.log('✅ Route /test index.js');
    res.json({ message: "Index.js fonctionne !" });
});

// ✅ ROUTES - SANS proxyRoutes
app.use('/api/auth', authRoutes);
app.use('/api/db', databaseRoutes);
// app.use('/api/proxy', proxyRoutes); // ❌ TEMPORAIREMENT DÉSACTIVÉ
app.use('/api', gameRoutes); // ✅ SEUL à gérer /proxy/trouve-mot/*

// ❌ SUPPRIMEZ TOUT CE BLOC (déjà dans database-routes.js)
// app.get('/api/db/test', async (req, res) => { ... });
// app.get('/api/db/mots/random', async (req, res) => { ... });

// ✅ GARDEZ CES ROUTES QUI N'EXISTENT PAS AILLEURS
app.get('/api/mots/difficulte/:niveau', async (req, res) => {
    const niveau = req.params.niveau;
    const [rows] = await connection.execute(`SELECT * FROM mots WHERE difficulte = '${niveau}'`);
    res.json(rows);
});

// 🎮 ENDPOINTS DE JEU
app.post('/api/parties/nouvelle', async (req, res) => {
    console.log('🎮 Création nouvelle partie');
    try {
        const { userId, difficulte } = req.body;
        const [mots] = await connection.execute(`SELECT * FROM mots WHERE difficulte = '${difficulte}' ORDER BY RAND() LIMIT 1`);
        res.json({ 
            message: 'Partie créée',
            partie: { 
                id: Date.now(), 
                mot: mots[0], 
                userId,
                dateCreation: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🏆 ENDPOINTS DE SCORING
app.post('/api/scores/enregistrer', async (req, res) => {
    console.log('🏆 Enregistrement score');
    try {
        const { userId, score, temps, motId } = req.body;
        const nouveauScore = {
            id: Date.now(),
            userId,
            score,
            temps,
            motId,
            date: new Date().toISOString()
        };
        res.json({ 
            message: 'Score enregistré', 
            scoreId: nouveauScore.id,
            data: nouveauScore
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 👤 ENDPOINTS UTILISATEURS
app.get('/api/users/:id', async (req, res) => {
    console.log(`👤 Récupération utilisateur ${req.params.id}`);
    try {
        const [users] = await connection.execute(`SELECT * FROM users WHERE id = ${req.params.id}`);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📊 ENDPOINT STATISTIQUES
app.get('/api/stats/mots', async (req, res) => {
    console.log('📊 Statistiques mots');
    try {
        const [faciles] = await connection.execute(`SELECT COUNT(*) as count FROM mots WHERE difficulte = 'facile'`);
        const [moyens] = await connection.execute(`SELECT COUNT(*) as count FROM mots WHERE difficulte = 'moyen'`);
        const [difficiles] = await connection.execute(`SELECT COUNT(*) as count FROM mots WHERE difficulte = 'difficile'`);
        
        res.json({
            facile: faciles[0].count,
            moyen: moyens[0].count,
            difficile: difficiles[0].count,
            total: faciles[0].count + moyens[0].count + difficiles[0].count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ AJOUTEZ CETTE ROUTE APRÈS LES AUTRES
app.get('/api/leaderboard/global', async (req, res) => {
    console.log('🏆 Récupération leaderboard global');
    try {
        // Mock de scores pour le leaderboard
        const mockLeaderboard = [
            { login: "Champion", score: 1500, words_found: 25, date_achieved: "2025-06-20" },
            { login: "Expert", score: 1200, words_found: 20, date_achieved: "2025-06-19" },
            { login: "Maître", score: 1000, words_found: 18, date_achieved: "2025-06-18" }
        ];
        res.json(mockLeaderboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

app.listen(PORT, () => {
    console.log(`✅ Index.js SANS imports sur port ${PORT}`);
});