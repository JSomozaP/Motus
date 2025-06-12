import { body } from 'express-validator';

// Validation pour l'inscription
export const validateRegister = [
    body('pseudo')
        .isLength({ min: 3, max: 50 })
        .withMessage('Le pseudo doit contenir entre 3 et 50 caractères')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores'),
    
    body('email')
        .isEmail()
        .withMessage('Email invalide')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Le mot de passe doit contenir au moins 6 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
];

// Validation pour la connexion
export const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Email invalide')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Mot de passe requis')
];