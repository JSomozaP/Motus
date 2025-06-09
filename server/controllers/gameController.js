import fetch from 'node-fetch';
import connection from '../config/db.js';

// Liste de mots français pour le filtrage initial
const mots = [
    'MAISON', 'JARDIN', 'SOLEIL', 'PLANTE', 'VOITURE',
    'CUISINE', 'TABLEAU', 'MUSIQUE', 'FENETRE', 'CHAMBRE',
    'BOUQUET', 'PLATEAU', 'LUMIERE', 'JOURNAL', 'MONTURE',
    'PEINTURE', 'MONTAGNE', 'COUTURE', 'FESTIVAL', 'BONHEUR'
];

// Fonction pour obtenir un mot aléatoire selon la difficulté
const getRandomWord = async (req, res) => {
    try {
        const { difficulty } = req.query;
        let wordLength;
        
        // Définir la longueur du mot selon la difficulté
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

        // Filtrer les mots selon la longueur
        const motsFiltered = mots.filter(mot => mot.length === wordLength);
        
        if (motsFiltered.length === 0) {
            return res.status(404).json({ message: "Aucun mot trouvé pour cette difficulté" });
        }

        // Sélectionner un mot aléatoire
        const word = motsFiltered[Math.floor(Math.random() * motsFiltered.length)];
        const hint = word.charAt(0) + '_'.repeat(word.length - 1);

        // Sauvegarder le mot dans la base de données
        const [result] = await connection.promise().query(
            'INSERT INTO mots (word, longueur, difficulte) VALUES (?, ?, ?)',
            [word, word.length, difficulty || 'facile']
        );

        res.json({ 
            hint, 
            length: word.length,
            gameId: result.insertId
        });

    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

// Fonction pour vérifier une tentative
const checkWord = async (req, res) => {
    try {
        const { guess, gameId } = req.body;
        const [words] = await connection.promise().query(
            'SELECT word FROM mots WHERE id = ?',
            [gameId]
        );

        if (words.length === 0) {
            return res.status(404).json({ message: "Partie non trouvée" });
        }

        const targetWord = words[0].word;
        const result = [];

        // Vérification des lettres
        for (let i = 0; i < guess.length; i++) {
            if (i >= targetWord.length) {
                result.push({ letter: guess[i], status: 'invalid' });
            } else if (guess[i] === targetWord[i]) {
                result.push({ letter: guess[i], status: 'correct' });
            } else if (targetWord.includes(guess[i])) {
                result.push({ letter: guess[i], status: 'present' });
            } else {
                result.push({ letter: guess[i], status: 'absent' });
            }
        }

        res.json({ result });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

export { getRandomWord, checkWord };