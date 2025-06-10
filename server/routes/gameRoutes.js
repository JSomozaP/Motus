import express from 'express';
import { getRandomWord, checkWord, getLeaderboard, getPlayerHistory, getPlayerStats } from '../controllers/gameController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes protégées par authentification
router.get('/word', authMiddleware, getRandomWord);
router.post('/check', authMiddleware, checkWord);
router.get('/leaderboard', authMiddleware, getLeaderboard);
router.get('/history', authMiddleware, getPlayerHistory);
router.get('/stats', authMiddleware, getPlayerStats);

export default router;