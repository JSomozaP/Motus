import express from 'express';
import { connection } from '../config/database.js';

const router = express.Router();

// ✅ RÉCUPÉRER LE CLASSEMENT GLOBAL
router.get('/global', async (req, res) => {
  try {
    const [leaderboard] = await connection.execute(`
      SELECT 
        wof.id,
        wof.score,
        wof.login,
        wof.difficulty,
        wof.words_found,
        DATE_FORMAT(wof.created_at, '%d/%m/%Y %H:%i') as date_achieved
      FROM wall_of_fame wof
      JOIN users u ON wof.user_id = u.id
      ORDER BY wof.score DESC
      LIMIT 50
    `);
    
    res.json(leaderboard);
    
  } catch (error) {
    console.error('❌ Erreur récupération leaderboard:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ AJOUTER UN SCORE AU WALL OF FAME
router.post('/add-score', async (req, res) => {
  try {
    const { user_id, login, score, words_found, difficulty } = req.body;
    
    // Validation
    if (!user_id || !login || !score) {
      return res.status(400).json({ message: 'Données manquantes' });
    }
    
    // Vérifier que l'utilisateur existe
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [user_id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Ajouter au Wall of Fame
    const [result] = await connection.execute(`
      INSERT INTO wall_of_fame (user_id, login, score, difficulty, words_found)
      VALUES (?, ?, ?, ?, ?)
    `, [user_id, login, score, difficulty || 'facile', words_found || 0]);
    
    console.log(`🏆 Nouveau score ajouté: ${login} - ${score} points`);
    
    res.status(201).json({ 
      message: 'Score ajouté au Wall of Fame',
      scoreId: result.insertId 
    });
    
  } catch (error) {
    console.error('❌ Erreur ajout score:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ CLASSEMENT PAR DIFFICULTÉ
router.get('/by-difficulty/:difficulty', async (req, res) => {
  try {
    const { difficulty } = req.params;
    
    const [scores] = await connection.execute(`
      SELECT login, score, words_found, 
             DATE_FORMAT(created_at, '%d/%m/%Y') as date_achieved
      FROM wall_of_fame 
      WHERE difficulty = ?
      ORDER BY score DESC
      LIMIT 20
    `, [difficulty]);
    
    res.json(scores);
    
  } catch (error) {
    console.error('❌ Erreur classement par difficulté:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ STATISTIQUES UTILISATEUR
router.get('/user-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_games,
        AVG(score) as avg_score,
        MAX(score) as best_score,
        SUM(words_found) as total_words_found
      FROM wall_of_fame 
      WHERE user_id = ?
    `, [userId]);
    
    res.json(stats[0] || { total_games: 0, avg_score: 0, best_score: 0, total_words_found: 0 });
    
  } catch (error) {
    console.error('❌ Erreur statistiques utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;