import express from 'express';
import { getRandomWord, checkWord, getLeaderboard } from '../controllers/gameController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Toutes les routes de jeu nécessitent une authentification
router.use(authenticateToken);

// Routes protégées
router.get('/word', getRandomWord);
router.post('/check', checkWord);
router.get('/leaderboard', getLeaderboard);

export default router;