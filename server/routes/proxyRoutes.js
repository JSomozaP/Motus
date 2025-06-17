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

// ✅ NOUVEAU - Route pour /size/:length/:count (mots de longueur exacte)
router.get('/trouve-mot/size/:length/:count?', async (req, res) => {
  try {
    const { length, count = 1 } = req.params;
    console.log(`💀 Appel API size/${length}/${count} via proxy...`);
    
    const response = await axios.get(`https://trouve-mot.fr/api/size/${length}/${count}`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Motus-Game/1.0',
        'Accept': 'application/json'
      }
    });
    
    console.log(`✅ API size réponse: ${response.data?.length || 0} mots`);
    res.json(response.data);
    
  } catch (error) {
    console.error(`❌ Erreur API size/${length}/${count}:`, error.message);
    
    // ✅ Fallback intelligent avec mots locaux de la bonne longueur
    const hardWordsByLength = {
      3: ['AXE', 'GYM', 'HIE', 'OXY', 'QUI', 'RYE', 'VEX', 'ZUT'],
      4: ['CZAR', 'EXAM', 'JAZZ', 'LYNX', 'ONYX', 'PRIX', 'SEXY', 'UNIX'],
      5: ['AZYME', 'DJINN', 'FJORD', 'SPHINX', 'TOXIN', 'XENON', 'QUARK', 'EPOXY'],
      6: ['AZIMUT', 'COGNAC', 'KLAXON', 'WHISKY', 'ZYGOTE', 'GEYSER', 'ABAQUE', 'ABSOLU'],
      7: ['AZIMUTS', 'CYCLONE', 'QUETZAL', 'RYTHMES', 'TOXINES', 'ABYSSES', 'ACCORDE'],
      8: ['ABATTOIR', 'ABSTRACT', 'ACCIDENT', 'ACCORDER', 'BYZANTINE', 'COMPLEXE', 'DYNAMITE'],
      9: ['ABANDONNER', 'BYZANTINE', 'COMPLEXES', 'FREQUENCY', 'GLYCERINE', 'HYPNOTIZE', 'MYSTERIUM'],
      10: ['ABANDONNEE', 'ABDICATION', 'ABERRANTES', 'ABOLITISME', 'ABONNEMENT', 'ABRICOTIER'],
      11: ['ABANDONNANT', 'ABDICATIONS', 'ABERRATIONS', 'ABOLITIONS', 'ABONNEMENTS'],
      12: ['ABANDONNATES', 'ACCELERATIONS', 'ACCENTUATIONS', 'ACCEPTATIONS', 'ACCESSOIRES']
    };
    
    const words = hardWordsByLength[length] || hardWordsByLength[5];
    const requestedCount = Math.min(parseInt(count), words.length);
    const selectedWords = words.slice(0, requestedCount);
    
    console.log(`🔄 Fallback size: ${selectedWords.length} mots de ${length} lettres`);
    
    // Retourner directement les mots (pas d'objets)
    res.json(selectedWords);
  }
});

// ✅ NOUVEAU - Route pour /sizemin/:length/:count (mots de longueur minimum)
router.get('/trouve-mot/sizemin/:length/:count?', async (req, res) => {
  try {
    const { length, count = 1 } = req.params;
    console.log(`💀 Appel API sizemin/${length}/${count} via proxy...`);
    
    const response = await axios.get(`https://trouve-mot.fr/api/sizemin/${length}/${count}`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Motus-Game/1.0',
        'Accept': 'application/json'
      }
    });
    
    console.log(`✅ API sizemin réponse: ${response.data?.length || 0} mots`);
    res.json(response.data);
    
  } catch (error) {
    console.error(`❌ Erreur API sizemin/${length}/${count}:`, error.message);
    
    // ✅ Fallback intelligent avec mots de longueur >= length
    const allHardWords = [
      // 6 lettres
      'AZIMUT', 'COGNAC', 'KLAXON', 'WHISKY', 'ZYGOTE', 'GEYSER', 'ABAQUE', 'ABSOLU', 'ABSENT', 'ABSOUS',
      'ABYSME', 'ACACIA', 'ACCRUE', 'ACHEVE', 'ACIDUS', 'ACIERU', 'ACTION', 'ADAGIO', 'ADAPTE', 'ADROIT',
      
      // 7 lettres
      'AZIMUTS', 'CYCLONE', 'QUETZAL', 'RYTHMES', 'TOXINES', 'ABYSSES', 'ACCORDE', 'ACHETER', 'ACQUISE', 'ACTIVER',
      'ADAPTER', 'ADHERER', 'ADJOINT', 'ADMIRER', 'ADOPTER', 'AEROBIC', 'AEROSOL', 'AFFAIRE', 'AFFICHE', 'AFFREUX',
      
      // 8 lettres
      'ABATTOIR', 'ABSTRACT', 'ACCIDENT', 'ACCORDER', 'BYZANTINE', 'COMPLEXE', 'DYNAMITE', 'EXORCISE', 'FREQUENCE',
      'GLYOXYLE', 'HYPNOTIC', 'ISOCLINE', 'JACINTHE', 'KRYPTONE', 'LUXUEUX', 'MAXIMUM', 'NOCTULE', 'OXIDANT',
      
      // 9 lettres
      'ABANDONNER', 'BYZANTINE', 'COMPLEXES', 'FREQUENCY', 'GLYCERINE', 'HYPNOTIZE', 'MYSTERIUM', 'IZQUIERDA',
      'JUXTAPOSE', 'KRYOLITE', 'LUXURIEUX', 'NEOLATINE', 'OXYMORRON', 'PARADOXAL', 'QUIPROQUO', 'RHAPSODIC',
      
      // 10+ lettres
      'ABANDONNEE', 'ABDICATION', 'ABERRANTES', 'ABOLITISME', 'ABONNEMENT', 'ABRICOTIER', 'ABSTINENCE', 'ACCESSOIRE',
      'ABANDONNANT', 'ABDICATIONS', 'ABERRATIONS', 'ABOLITIONS', 'ABONNEMENTS', 'ABREVIATIONS',
      'ABANDONNATES', 'ACCELERATIONS', 'ACCENTUATIONS', 'ACCEPTATIONS', 'ACCESSOIRES'
    ];
    
    // Filtrer les mots de longueur >= length
    const minLength = parseInt(length);
    const validWords = allHardWords.filter(word => word.length >= minLength);
    const requestedCount = Math.min(parseInt(count), validWords.length);
    const selectedWords = validWords.slice(0, requestedCount);
    
    console.log(`🔄 Fallback sizemin: ${selectedWords.length} mots (>= ${minLength} lettres)`);
    
    // Retourner directement les mots
    res.json(selectedWords);
  }
});

export default router;