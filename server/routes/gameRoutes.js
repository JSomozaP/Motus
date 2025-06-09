import express from 'express';
import { getRandomWord, checkWord } from '../controllers/gameController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes protégées par authentification
router.get('/word', authMiddleware, getRandomWord);
router.post('/check', authMiddleware, checkWord);

export default router;