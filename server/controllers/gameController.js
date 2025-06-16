import { connection } from '../config/database.js';

// Fonction pour calculer le score
const calculateScore = (tentativesUtilisees, tempsEcoule, motLongueur, isWon) => {
    if (!isWon) return 0;
    
    let baseScore = 1000;
    let penaliteTentatives = (tentativesUtilisees - 1) * 100;
    let penaliteTemps = Math.floor(tempsEcoule / 10) * 5;
    let bonusLongueur = (motLongueur - 5) * 50;
    
    return Math.max(100, baseScore - penaliteTentatives - penaliteTemps + bonusLongueur);
};

export const getRandomWord = async (req, res) => {
    try {
        const userId = req.user.id;
        const difficulty = req.query.difficulty || 'facile'; // ✅ Récupération du paramètre

        // Récupérer un mot selon la difficulté
        const [mots] = await connection.query(
            'SELECT id, word, longueur FROM mots WHERE difficulte = ? ORDER BY RAND() LIMIT 1',
            [difficulty]
        );

        // Si pas de mot trouvé pour cette difficulté, prendre n'importe lequel
        if (!mots.length) {
            const [allMots] = await connection.query(
                'SELECT id, word, longueur FROM mots ORDER BY RAND() LIMIT 1'
            );
            
            if (!allMots.length) {
                return res.status(404).json({ message: 'Aucun mot disponible' });
            }
            
            mots.push(allMots[0]);
        }

        const mot = mots[0];
        
        // Créer une nouvelle partie
        const [result] = await connection.query(
            'INSERT INTO parties (user_id, mot_id, nb_tentatives, status, score) VALUES (?, ?, ?, ?, ?)',
            [userId, mot.id, 6, 'en_cours', 0]
        );

        return res.json({
            gameId: result.insertId,
            length: mot.longueur,
            hint: mot.word[0],
            remainingAttempts: 6,
            difficulty: difficulty // ✅ Retourner la difficulté
        });
    } catch (error) {
        console.error('Erreur détaillée:', error);
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

export const checkWord = async (req, res) => {
    try {
        const { guess, gameId, attemptNumber } = req.body;
        const userId = req.user.id;
        
        // Vérifier que la partie appartient à l'utilisateur
        const [rows] = await connection.query(
            `SELECT p.id, p.nb_tentatives, p.status, m.word, m.longueur 
             FROM parties p 
             JOIN mots m ON p.mot_id = m.id 
             WHERE p.id = ? AND p.user_id = ?`,
            [gameId, userId]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'Partie non trouvée ou non autorisée' });
        }

        const partie = rows[0];
        
        // Vérifier que la partie est en cours
        if (partie.status !== 'en_cours') {
            return res.status(400).json({ message: 'Cette partie est déjà terminée' });
        }

        const targetWord = partie.word;
        const remainingAttempts = partie.nb_tentatives - 1;

        // Vérifier le format du mot deviné
        if (!guess || guess.length !== targetWord.length) {
            return res.status(400).json({ 
                message: `Le mot doit contenir exactement ${targetWord.length} lettres` 
            });
        }

        // Analyser la tentative
        const result = guess.toUpperCase().split('').map((letter, index) => ({
            letter,
            status: letter === targetWord[index] ? 'correct' 
                   : targetWord.includes(letter) ? 'present' 
                   : 'absent'
        }));

        // Vérification de victoire
        const isWon = guess.toUpperCase() === targetWord;
        
        // Vérification de fin de partie
        const isGameOver = remainingAttempts <= 0 && !isWon;
        
        // Calculer le score si gagné
        const score = isWon ? calculateScore(6 - remainingAttempts + 1, 0, targetWord.length, isWon) : 0;

        // Mettre à jour la partie
        const newStatus = isWon ? 'gagnee' : (isGameOver ? 'perdue' : 'en_cours');
        await connection.query(
            'UPDATE parties SET nb_tentatives = ?, status = ?, score = ? WHERE id = ?',
            [remainingAttempts, newStatus, score, gameId]
        );

        // Si partie terminée, enregistrer le score
        if (isWon || isGameOver) {
            await connection.query(
                `INSERT INTO scores (user_id, partie_id, score, tentatives_utilisees, temps_ecoule, mot_longueur, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, gameId, score, 6 - remainingAttempts + 1, 0, targetWord.length, newStatus]
            );

            // Si c'est un bon score, l'ajouter au wall of fame
            if (isWon && score > 500) {
                await connection.query(
                    'INSERT INTO wall_of_fame (user_id, score, partie_id) VALUES (?, ?, ?)',
                    [userId, score, gameId]
                );
            }
        }

        return res.json({
            result,
            won: isWon,
            gameOver: isGameOver,
            remainingAttempts,
            score: isWon || isGameOver ? score : null,
            targetWord: (isWon || isGameOver) ? targetWord : null
        });
    } catch (error) {
        console.error('Erreur:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// Récupérer le classement
export const getLeaderboard = async (req, res) => {
    try {
        const [leaderboard] = await connection.query(`
            SELECT 
                u.pseudo,
                MAX(s.score) as meilleur_score,
                COUNT(s.id) as parties_jouees,
                SUM(CASE WHEN s.status = 'gagnee' THEN 1 ELSE 0 END) as parties_gagnees,
                ROUND(AVG(CASE WHEN s.status = 'gagnee' THEN s.score ELSE NULL END), 2) as score_moyen
            FROM users u
            LEFT JOIN scores s ON u.id = s.user_id
            GROUP BY u.id, u.pseudo
            HAVING parties_jouees > 0
            ORDER BY meilleur_score DESC, parties_gagnees DESC
            LIMIT 10
        `);

        res.json(leaderboard);
    } catch (error) {
        console.error('Erreur leaderboard:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};