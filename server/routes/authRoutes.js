import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';

const router = express.Router();

// Rate limiting pour les tentatives de connexion
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives par IP
    message: {
        message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting pour l'inscription
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 3, // 3 inscriptions par IP par heure
    message: {
        message: 'Trop d\'inscriptions depuis cette IP. Réessayez dans 1 heure.'
    }
});

// Routes publiques
router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);

// Routes protégées
router.get('/profile', authenticateToken, getProfile);
router.post('/logout', authenticateToken, logout);

export default router;