import jwt from 'jsonwebtoken';
import { connection } from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ message: 'Token d\'accès requis' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Vérifier que l'utilisateur existe toujours
        const [rows] = await connection.query(
            'SELECT id, pseudo, email FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!rows.length) {
            return res.status(401).json({ message: 'Utilisateur non trouvé' });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ message: 'Token invalide' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ message: 'Token expiré' });
        }
        
        console.error('Erreur middleware auth:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};