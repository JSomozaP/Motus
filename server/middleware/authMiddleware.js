// Middleware de protection des routes avec authentification JWT
import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    try {
        // Récupère le token du header Authorization
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: "Pas de token fourni" });
        }

        // Vérifie le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Ajoute les informations de l'utilisateur à la requête
        req.user = decoded;
        
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token invalide" });
    }
};

export default authMiddleware;