import fetch from 'node-fetch';

const getRandomWord = async (length) => {
    try {
        // Maximum 3 tentatives pour obtenir un mot de la bonne longueur
        for(let i = 0; i < 3; i++) {
            const response = await fetch('https://trouve-mot.fr/api/random');
            
            if (!response.ok) {
                console.error(`Erreur HTTP à la tentative ${i + 1}: ${response.status}`);
                continue;
            }

            const data = await response.json();
            
            if (data && Array.isArray(data) && data.length > 0) {
                const word = data[0].name.toUpperCase();
                console.log(`Tentative ${i + 1}: Mot "${word}" (longueur: ${word.length})`);
                
                if (word.length === length) {
                    console.log(`✅ Mot valide trouvé à la tentative ${i + 1}`);
                    return word;
                }
                console.log(`❌ Longueur incorrecte (attendu: ${length})`);
            }
        }
        
        console.log('⚠️ Aucun mot valide trouvé après 3 tentatives');
        return null;
    } catch (error) {
        console.error('Erreur API mots:', error);
        return null;
    }
};

export { getRandomWord };