import connection from '../config/db.js';

// Liste de mots français
const mots = [
    'MAISON', 'JARDIN', 'SOLEIL', 'PLANTE', 'VOITURE',
    'CUISINE', 'TABLEAU', 'MUSIQUE', 'FENETRE', 'CHAMBRE',
    'BOUQUET', 'PLATEAU', 'LUMIERE', 'JOURNAL', 'MONTURE'
];

// Fonction simplifiée pour obtenir un mot aléatoire
export const getRandomWord = async (req, res) => {
    try {
        const motIndex = Math.floor(Math.random() * mots.length);
        const mot = mots[motIndex];
        
        // Stocker l'INDEX du mot pour pouvoir le retrouver
        const [result] = await connection.query(
            'INSERT INTO parties (user_id, mot_id, nb_tentatives, status, score) VALUES (?, ?, ?, ?, ?)',
            [1, motIndex, 6, 'en_cours', 0]  // motIndex au lieu de 1 fixe !
        );

        return res.json({
            gameId: result.insertId,
            length: mot.length,
            hint: mot[0],
            remainingAttempts: 6
        });
    } catch (error) {
        console.error('Erreur détaillée:', error);
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

export const checkWord = async (req, res) => {
    try {
        const { guess, gameId } = req.body;
        
        const [rows] = await connection.query(
            'SELECT id, nb_tentatives, mot_id FROM parties WHERE id = ?',
            [gameId]
        );

        if (!rows.length) return res.status(404).json({ message: 'Partie non trouvée' });

        // CORRECTION MAJEURE : Utiliser le bon mot !
        const targetWord = mots[rows[0].mot_id]; // Au lieu de mots[0] !
        
        const remainingAttempts = rows[0].nb_tentatives - 1;

        const result = guess.split('').map((letter, index) => ({
            letter,
            status: letter === targetWord[index] ? 'correct' 
                   : targetWord.includes(letter) ? 'present' 
                   : 'absent'
        }));

        // Vérification de victoire
        const isWon = guess === targetWord;
        
        // Vérification de fin de partie
        const isGameOver = remainingAttempts <= 0 && !isWon;

        await connection.query(
            'UPDATE parties SET nb_tentatives = ?, status = ? WHERE id = ?',
            [remainingAttempts, isWon ? 'gagnee' : (isGameOver ? 'perdue' : 'en_cours'), gameId]
        );

        return res.json({
            result,
            won: isWon,
            gameOver: isGameOver,
            remainingAttempts,
            targetWord: (isWon || isGameOver) ? targetWord : null
        });
    } catch (error) {
        console.error('Erreur:', error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};