import { Router } from 'express';
import { getRandomWord, checkWord } from '../controllers/gameController.js';

const router = Router();

// Routes du jeu
router.get('/word', getRandomWord); 
router.post('/check', checkWord);   

export default router;