import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { connection } from '../config/database.js';

// Générer un token JWT
const generateToken = (userId) => {
    return jwt.sign(
        { userId }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

// Inscription
export const register = async (req, res) => {
    try {
        // Validation des erreurs
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Données invalides', 
                errors: errors.array() 
            });
        }

        const { pseudo, email, password } = req.body;

        // Vérifier si l'utilisateur existe déjà
        const [existingUsers] = await connection.query(
            'SELECT id FROM users WHERE email = ? OR pseudo = ?',
            [email, pseudo]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                message: 'Utilisateur déjà existant avec cet email ou pseudo' 
            });
        }

        // Hasher le mot de passe
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Créer l'utilisateur
        const [result] = await connection.query(
            'INSERT INTO users (pseudo, email, password) VALUES (?, ?, ?)',
            [pseudo, email, passwordHash]
        );

        // Générer le token
        const token = generateToken(result.insertId);

        res.status(201).json({
            message: 'Utilisateur créé avec succès',
            token,
            user: {
                id: result.insertId,
                pseudo,
                email
            }
        });

    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
    }
};

// Connexion
export const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Données invalides', 
                errors: errors.array() 
            });
        }

        const { email, password } = req.body;

        // Trouver l'utilisateur
        const [rows] = await connection.query(
            'SELECT id, pseudo, email, password FROM users WHERE email = ?',
            [email]
        );

        if (!rows.length) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        const user = rows[0];

        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        // Générer le token
        const token = generateToken(user.id);

        res.json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                pseudo: user.pseudo,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
    }
};

// Profil utilisateur
export const getProfile = async (req, res) => {
    try {
        // req.user est défini par le middleware authenticateToken
        const userId = req.user.id;

        // Récupérer les stats de l'utilisateur
        const [stats] = await connection.query(`
            SELECT 
                COUNT(*) as parties_jouees,
                SUM(CASE WHEN status = 'gagnee' THEN 1 ELSE 0 END) as parties_gagnees,
                AVG(CASE WHEN status = 'gagnee' THEN score ELSE NULL END) as score_moyen,
                MAX(score) as meilleur_score
            FROM scores 
            WHERE user_id = ?
        `, [userId]);

        res.json({
            user: req.user,
            stats: stats[0] || {
                parties_jouees: 0,
                parties_gagnees: 0,
                score_moyen: 0,
                meilleur_score: 0
            }
        });

    } catch (error) {
        console.error('Erreur profil:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// Logout 
export const logout = (req, res) => {
    res.json({ message: 'Déconnexion réussie' });
};