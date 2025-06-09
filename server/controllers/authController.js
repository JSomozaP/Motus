import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connection from '../config/db.js';

// Fonction d'inscription
const register = async (req, res) => {
    try {
        const { pseudo, password, numero_secu } = req.body;
        
        const [existingUser] = await connection.promise().query(
            'SELECT * FROM users WHERE pseudo = ?',
            [pseudo]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ message: "Ce pseudo existe déjà" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await connection.promise().query(
            'INSERT INTO users (pseudo, password, numero_secu) VALUES (?, ?, ?)',
            [pseudo, hashedPassword, numero_secu]
        );

        res.status(201).json({ message: "Utilisateur créé avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { pseudo, password } = req.body;

        const [users] = await connection.promise().query(
            'SELECT * FROM users WHERE pseudo = ?',
            [pseudo]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: "Identifiants invalides" });
        }

        const validPassword = await bcrypt.compare(password, users[0].password);
        if (!validPassword) {
            return res.status(401).json({ message: "Identifiants invalides" });
        }

        const token = jwt.sign(
            { userId: users[0].id, pseudo: users[0].pseudo },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

export { register, login };