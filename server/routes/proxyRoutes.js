import express from 'express';
import axios from 'axios';

const router = express.Router();

// ✅ Route de test de connexion (SANS authentification)
router.get('/trouve-mot/test', async (req, res) => {
  try {
    console.log('🔗 Test connexion API trouve-mot.fr...');
    
    const response = await axios.get('https://trouve-mot.fr/api/random/', {
      timeout: 3000,
      headers: {
        'User-Agent': 'Motus-Game/1.0'
      }
    });
    
    res.json({ 
      available: true, 
      status: response.status,
      message: 'API trouve-mot.fr disponible'
    });
    
  } catch (error) {
    console.warn('❌ Test connexion échoué:', error.message);
    
    res.json({ 
      available: false, 
      status: 0,
      message: 'API trouve-mot.fr indisponible - fallback local activé',
      error: error.message
    });
  }
});

// ✅ Route pour mot aléatoire (SANS authentification)
router.get('/trouve-mot/random', async (req, res) => {
  try {
    console.log('🔥 Appel API trouve-mot.fr via proxy...');
    
    const response = await axios.get('https://trouve-mot.fr/api/random/', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Motus-Game/1.0',
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ Réponse API trouve-mot:', response.data);
    res.json(response.data);
    
  } catch (error) {
    console.error('❌ Erreur API trouve-mot:', error.message);
    
    // Fallback avec mots difficiles locaux
    const hardWords = [
      'AZYME', 'FJORD', 'SPHINX', 'TOXIN', 'XENON', 'QUARK', 'DJINN', 'EPOXY',
      'GEYSER', 'WHISKY', 'ZYGOTE', 'KLAXON', 'MYTHE', 'NEXUS', 'OZONE', 'KRILL'
    ];
    
    const randomWord = hardWords[Math.floor(Math.random() * hardWords.length)];
    
    res.json([{ 
      name: randomWord,
      source: 'local-fallback',
      difficulty: 'difficile'
    }]);
  }
});

// ✅ Route pour mots par longueur (SANS authentification)
router.get('/trouve-mot/longueur/:length', async (req, res) => {
  try {
    const { length } = req.params;
    console.log(`🔥 Recherche mots de ${length} lettres via proxy...`);
    
    // Fallback direct avec mots locaux (API trouve-mot souvent instable)
    const hardWordsByLength = {
      3: ['AXE', 'GYM', 'HIE', 'OXY', 'QUI', 'RYE', 'VEX', 'ZUT'],
      4: ['CZAR', 'EXAM', 'JAZZ', 'LYNX', 'ONYX', 'PRIX', 'SEXY', 'UNIX'],
      5: ['AZYME', 'DJINN', 'FJORD', 'SPHINX', 'TOXIN', 'XENON', 'QUARK', 'EPOXY'],
      6: ['AZIMUT', 'COGNAC', 'KLAXON', 'WHISKY', 'ZYGOTE', 'GEYSER'],
      7: ['AZIMUTS', 'CYCLONE', 'QUETZAL', 'RYTHMES', 'TOXINES']
    };
    
    const words = hardWordsByLength[length] || hardWordsByLength[5];
    
    res.json(words.map(word => ({ 
      name: word,
      source: 'local-fallback',
      difficulty: 'difficile'
    })));
    
  } catch (error) {
    console.error('❌ Erreur proxy longueur:', error.message);
    res.status(500).json({ error: 'Erreur serveur proxy' });
  }
});

export default router;