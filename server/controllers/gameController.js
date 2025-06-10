import fetch from 'node-fetch';
import connection from '../config/db.js';
import { getRandomWord as fetchWordFromAPI } from '../services/wordAPI.js';

// Liste de mots français pour le fallback si l'API échoue
const mots = [
    'MAISON', 'JARDIN', 'SOLEIL', 'PLANTE', 'VOITURE',
    'CUISINE', 'TABLEAU', 'MUSIQUE', 'FENETRE', 'CHAMBRE',
    'BOUQUET', 'PLATEAU', 'LUMIERE', 'JOURNAL', 'MONTURE',
    'PEINTURE', 'MONTAGNE', 'COUTURE', 'FESTIVAL', 'BONHEUR'
];

// Fonction de calcul du score
const calculateScore = (attempts, difficulty) => {
    const baseScore = {
        'facile': 100,
        'moyen': 200,
        'difficile': 300
    };
    return baseScore[difficulty] - ((attempts - 1) * 10);
};

// Fonction pour obtenir un mot aléatoire selon la difficulté
const getRandomWord = async (req, res) => {
    try {
        const { difficulty } = req.query;
        let wordLength;
        
        switch(difficulty) {
            case 'difficile':
                wordLength = 8;
                break;
            case 'moyen':
                wordLength = 7;
                break;
            default:
                wordLength = 6; // facile
        }

        let word = await fetchWordFromAPI(wordLength);
        
        // Si aucun mot n'est trouvé après 3 tentatives, utiliser la liste statique
        if (!word) {
            console.log('Utilisation de la liste statique après échec de l\'API');
            const motsFiltered = mots.filter(mot => mot.length === wordLength);
            if (motsFiltered.length === 0) {
                return res.status(404).json({ message: "Aucun mot trouvé pour cette difficulté" });
            }
            word = motsFiltered[Math.floor(Math.random() * motsFiltered.length)];
        }
        console.log('Mot final utilisé:', word);

        const hint = word.charAt(0) + '_'.repeat(word.length - 1);

        const [result] = await connection.promise().query(
            'INSERT INTO mots (word, longueur, difficulte) VALUES (?, ?, ?)',
            [word, word.length, difficulty || 'facile']
        );

        // Création d'une nouvelle partie
        const [gameResult] = await connection.promise().query(
            'INSERT INTO parties (user_id, mot_id, nb_tentatives, status) VALUES (?, ?, ?, ?)',
            [req.user.userId, result.insertId, 0, 'en_cours']
        );

        res.json({ 
            hint, 
            length: word.length,
            gameId: result.insertId,
            remainingAttempts: 6
        });

    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

// Fonction pour vérifier une tentative
const checkWord = async (req, res) => {
    try {
        const { guess, gameId, attempts = 1 } = req.body;
        const [words] = await connection.promise().query(
            'SELECT word, difficulte FROM mots WHERE id = ?',
            [gameId]
        );

        if (words.length === 0) {
            return res.status(404).json({ message: "Partie non trouvée" });
        }

        const targetWord = words[0].word;
        const result = [];
        let correctCount = 0;

        // Vérification des lettres
        for (let i = 0; i < guess.length; i++) {
            if (i >= targetWord.length) {
                result.push({ letter: guess[i], status: 'invalid' });
            } else if (guess[i] === targetWord[i]) {
                result.push({ letter: guess[i], status: 'correct' });
                correctCount++;
            } else if (targetWord.includes(guess[i])) {
                result.push({ letter: guess[i], status: 'present' });
            } else {
                result.push({ letter: guess[i], status: 'absent' });
            }
        }

        // Vérifier si le mot est trouvé
        if (correctCount === targetWord.length) {
            const score = calculateScore(attempts, words[0].difficulte);

            await connection.promise().query(
                'UPDATE parties SET status = ?, score = ?, nb_tentatives = ? WHERE mot_id = ?',
                ['gagnee', score, attempts, gameId]
            );
            
            await connection.promise().query(
                'INSERT INTO wall_of_fame (scores, login, game_id) VALUES (?, ?, ?)',
                [score, req.user.pseudo, gameId]
            );

            return res.json({ 
                result,
                won: true,
                score,
                message: "Félicitations ! Vous avez trouvé le mot !"
            });
        }

        // Vérifier le nombre de tentatives
        if (attempts >= 6) {
            await connection.promise().query(
                'UPDATE parties SET status = ?, nb_tentatives = ? WHERE mot_id = ?',
                ['perdue', attempts, gameId]
            );

            return res.json({
                result,
                won: false,
                gameOver: true,
                message: `Game Over ! Le mot était : ${targetWord}`
            });
        }

        res.json({ 
            result,
            won: false,
            remainingAttempts: 6 - attempts
        });

    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

// Fonction pour obtenir le classement améliorée
const getLeaderboard = async (req, res) => {
    try {
        // Récupérer d'abord le nombre total de joueurs distincts
        const [totalPlayers] = await connection.promise().query(
            'SELECT COUNT(DISTINCT login) as total FROM wall_of_fame'
        );

        // Puis récupérer le classement
        const [scores] = await connection.promise().query(
            `SELECT 
                login,
                MAX(scores) as best_score,
                DENSE_RANK() OVER (ORDER BY MAX(scores) DESC) as rank
            FROM wall_of_fame 
            GROUP BY login
            ORDER BY best_score DESC 
            LIMIT 10`
        );
        
        res.json({ 
            leaderboard: scores,
            currentPlayer: req.user.pseudo,
            totalPlayers: totalPlayers[0].total
        });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

// Fonction pour obtenir l'historique des parties du joueur
const getPlayerHistory = async (req, res) => {
    try {
        const [history] = await connection.promise().query(
            `SELECT 
                m.word,
                m.difficulte,
                w.scores,
                w.created_at as played_at
            FROM wall_of_fame w
            JOIN mots m ON w.game_id = m.id
            WHERE w.login = ?
            ORDER BY w.created_at DESC
            LIMIT 10`,
            [req.user.pseudo]
        );
        
        res.json({ 
            history: history || [],
            totalGames: history.length
        });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

// Fonction pour obtenir les statistiques du joueur
const getPlayerStats = async (req, res) => {
    try {
        const [stats] = await connection.promise().query(
            `SELECT 
                COUNT(*) as total_games,
                SUM(CASE WHEN status = 'gagnee' THEN 1 ELSE 0 END) as games_won,
                AVG(nb_tentatives) as avg_attempts,
                MAX(score) as best_score
            FROM parties
            WHERE user_id = ?`,
            [req.user.userId]
        );
        
        res.json(stats[0]);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

export { getRandomWord, checkWord, getLeaderboard, getPlayerHistory, getPlayerStats };