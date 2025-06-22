import express from 'express';
import axios from 'axios';
import { getRandomWord, checkWord, getLeaderboard } from '../controllers/gameController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

console.log('✅ GameRoutes avec FALLBACK LOCAL UNIQUEMENT');

// ✅ ROUTE 1 - Mots par taille exacte (LOCAL SEULEMENT)
router.get('/proxy/trouve-mot/size/:length/:maxResults', async (req, res) => {
  try {
    const { length, maxResults } = req.params;
    console.log(`🎯 LOCAL SIZE: ${maxResults} mots de ${length} lettres (sans API externe)`);
    
    // ✅ DÉSACTIVER L'API EXTERNE - UTILISER SEULEMENT LOCAL
    const fallbackWords = {
      3: ['AXE', 'BYE', 'GYM', 'HIE', 'JEU', 'KIT', 'LAX', 'NET', 'OXY', 'QUI'],
      4: ['AXER', 'CZAR', 'DYKE', 'EXAM', 'FAUX', 'GYMS', 'JAZZ', 'KIWI', 'LYNX', 'MAXI'],
      5: ['AZYME', 'BANJO', 'CAJOU', 'DJINN', 'EPOXY', 'FJORD', 'GNOME', 'HYMEN', 'JOKER', 'KRILL'],
      6: ['ABAQUE', 'ABSOLU', 'ABSENT', 'ACHEVE', 'ACTION', 'ADAGIO', 'ADOPTE', 'ADJURE', 'ADMIRE', 'AERIEN'],
      7: ['ABYSSES', 'ACCORDE', 'ACHETER', 'ADAPTER', 'AEROBIC', 'AEROSOL', 'AFFAIRE', 'AGENCER', 'ALARMER', 'AZIMUTS'],
      8: ['ABATTOIR', 'ABSTRACT', 'ACCIDENT', 'ACHETEUR', 'ACTIVERA', 'ADAPTEUR', 'AERIENNE', 'AFFICHER', 'AGENCEUR', 'BYZANTINE'],
      9: ['ABANDONNER', 'ACCELERER', 'ACCENTUER', 'ACCEPTEUR', 'ACCESSOIRE', 'ASYMETRIE', 'COMPLEXES', 'EXCENTRIQUE', 'FREQUENCY', 'MYSTERIUM']
    };
    
    const targetLength = parseInt(length);
    const words = fallbackWords[targetLength] || fallbackWords[5];
    
    console.log(`✅ LOCAL: ${words.length} mots de ${targetLength} lettres envoyés`);
    
    res.json(words.slice(0, parseInt(maxResults)).map(word => ({ 
      name: word,
      source: 'local-only',
      length: word.length
    })));
    
  } catch (error) {
    console.error(`❌ Erreur route size:`, error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE 2 - Mots minimum (LOCAL SEULEMENT)
router.get('/proxy/trouve-mot/sizemin/:minLength/:maxResults', async (req, res) => {
  try {
    const { minLength, maxResults } = req.params;
    console.log(`💀 LOCAL SIZEMIN: ${maxResults} mots minimum ${minLength} lettres (sans API externe)`);
    
    // ✅ DÉSACTIVER L'API EXTERNE - UTILISER SEULEMENT LOCAL
    const longWords = [
      'ABSINTHE', 'BYZANTINE', 'COMPLEXE', 'DYNAMITE', 'EXORCISE', 'FREQUENCE',
      'GYMNASIUM', 'HYPNOTIC', 'ISOCLINE', 'JACINTHE', 'KRYPTONE', 'LUXURIEUX',
      'MYSTERIUM', 'NEOLATINE', 'OXYMORRON', 'PARADOXAL', 'QUIPROQUO', 'SYNCHRONE',
      'ABRICOTIER', 'BIOCHEMIQUE', 'CRYPTOGRAMME', 'EXORBITANTE', 'GYNAECOLOGIE',
      'PSYCHOLOGIE', 'XYLOGRAPHIE', 'ZOOTECHNIE', 'ABANDONNANT', 'ACCELERATION',
      'ACCLIMATENT', 'ACCOMPAGNENT', 'ACCREDITATIONS', 'ACCULTURATION', 'ABDICATIONS'
    ];
    
    const minLen = parseInt(minLength);
    const filteredWords = longWords.filter(word => word.length >= minLen);
    
    console.log(`✅ LOCAL SIZEMIN: ${filteredWords.length} mots minimum ${minLen} lettres envoyés`);
    
    res.json(filteredWords.slice(0, parseInt(maxResults)).map(word => ({ 
      name: word,
      source: 'local-only-sizemin',
      difficulty: 'cauchemar'
    })));
    
  } catch (error) {
    console.error(`❌ Erreur route sizemin:`, error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE 3 - Random (LOCAL SEULEMENT)
router.get('/proxy/trouve-mot/random', async (req, res) => {
  try {
    console.log('🎲 LOCAL RANDOM: Mot aléatoire (sans API externe)');
    
    const fallbackWords = ['SPHINX', 'QUARTZ', 'FJORD', 'WHISKY', 'GYMNOTE', 'AZYME', 'TOXIN'];
    const randomWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    
    console.log(`✅ LOCAL RANDOM: ${randomWord} envoyé`);
    
    res.json([{ name: randomWord, source: 'local-only-random' }]);
    
  } catch (error) {
    console.error('❌ Erreur random local:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE 4 - Test (LOCAL SEULEMENT)
router.get('/proxy/trouve-mot/test', async (req, res) => {
  console.log('🔗 Test connexion (mode local seulement)');
  
  res.json({ 
    available: true, 
    message: 'Mode local activé (API externe désactivée)',
    source: 'local-only'
  });
});

// ✅ À PARTIR D'ICI : Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes protégées existantes
router.get('/word', getRandomWord);
router.post('/check', checkWord);
router.get('/leaderboard', getLeaderboard);

export default router;