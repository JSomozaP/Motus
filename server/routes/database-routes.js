import express from 'express';
import { connection } from '../config/database-mock-complet.js';

const router = express.Router();

// ✅ Route test
router.get('/test', async (req, res) => {
    console.log('📍 GET /api/db/test');
    try {
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM mots');
        res.json({ 
            message: "Database mock connectée !",
            count: rows[0].count,
            status: "mock",
            note: "MySQL2 temporairement remplacé par un mock"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Mot aléatoire
router.get('/mots/random', async (req, res) => {
    console.log('📍 GET /api/db/mots/random');
    console.log('🎭 Mock DB query: SELECT * FROM mots ORDER BY RAND() LIMIT 1');
    
    try {
        const [rows] = await connection.execute('SELECT * FROM mots ORDER BY RAND() LIMIT 1');
        if (rows && rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Aucun mot trouvé' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ NOUVELLES ROUTES
router.get('/mots/difficulte/:difficulte', async (req, res) => {
    const { difficulte } = req.params;
    console.log(`📍 GET /api/db/mots/difficulte/${difficulte}`);
    console.log(`🎭 Mock DB query: SELECT * FROM mots WHERE difficulte = '${difficulte}'`);
    
    try {
        const [rows] = await connection.execute(`SELECT * FROM mots WHERE difficulte = '${difficulte}'`);
        if (rows && rows.length > 0) {
            res.json(rows);
        } else {
            res.status(404).json({ error: `Aucun mot trouvé pour la difficulté: ${difficulte}` });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/mots/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`📍 GET /api/db/mots/${id}`);
    console.log(`🎭 Mock DB query: SELECT * FROM mots WHERE id = ${id}`);
    
    try {
        const [rows] = await connection.execute(`SELECT * FROM mots WHERE id = ${id}`);
        if (rows && rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: `Mot avec ID ${id} non trouvé` });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;