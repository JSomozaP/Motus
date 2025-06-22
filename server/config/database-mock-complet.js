// config/database-mock-complet.js
console.log('🔧 Database MOCK COMPLET...');

// ✅ SIMULATION COMPLÈTE DE DATABASE
const mockData = {
    mots: [
        { id: 1, mot: 'MOTUS', difficulte: 'facile', lettres: 5 },
        { id: 2, mot: 'PENDU', difficulte: 'moyen', lettres: 5 },
        { id: 3, mot: 'BRAVE', difficulte: 'facile', lettres: 5 },
        { id: 4, mot: 'MONDE', difficulte: 'facile', lettres: 5 },
        { id: 5, mot: 'JOUER', difficulte: 'moyen', lettres: 5 }
    ],
    users: [
        { id: 1, username: 'test', email: 'test@test.com' }
    ],
    parties: [],
    scores: []
};

// ✅ MOCK DE CONNECTION AVEC TOUTES LES MÉTHODES
export const connection = {
    execute: async (query, params = []) => {
        console.log('🎭 Mock DB query:', query);
        
        // Simulation de délai réseau
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (query.includes('COUNT(*) as count FROM mots')) {
            return [[{ count: mockData.mots.length }]];
        }
        
        if (query.includes('SELECT 1 as test')) {
            return [[{ test: 1 }]];
        }
        
        if (query.includes('SELECT * FROM mots')) {
            if (query.includes('LIMIT 1')) {
                const randomMot = mockData.mots[Math.floor(Math.random() * mockData.mots.length)];
                return [[randomMot]];
            }
            return [mockData.mots];
        }
        
        if (query.includes('INSERT INTO users')) {
            const newId = mockData.users.length + 1;
            const newUser = { id: newId, username: 'user' + newId, email: 'user' + newId + '@test.com' };
            mockData.users.push(newUser);
            return [{ insertId: newId, affectedRows: 1 }];
        }
        
        if (query.includes('SELECT * FROM users')) {
            return [mockData.users];
        }
        
        // Default
        return [[]];
    },
    
    end: async () => {
        console.log('🎭 Mock DB end');
        return true;
    },
    
    query: async (query, params = []) => {
        return this.execute(query, params);
    }
};

const mockConnection = {
    execute: async (query, params = []) => {
        console.log('🎭 Mock DB query:', query);
        
        // ✅ CORRECTION - Parsing des requêtes SQL
        if (query.includes('ORDER BY RAND() LIMIT 1')) {
            // Mot aléatoire
            const randomIndex = Math.floor(Math.random() * mockTables.mots.length);
            return [mockTables.mots.slice(randomIndex, randomIndex + 1)];
        }
        
        if (query.includes('WHERE difficulte =')) {
            // ✅ EXTRACTION DE LA DIFFICULTÉ
            const difficulteMatch = query.match(/WHERE difficulte = '([^']+)'/);
            if (difficulteMatch) {
                const difficulte = difficulteMatch[1];
                const filtered = mockTables.mots.filter(mot => mot.difficulte === difficulte);
                console.log(`🔍 Filtrage ${difficulte}:`, filtered);
                return [filtered];
            }
        }
        
        if (query.includes('WHERE id =')) {
            // ✅ EXTRACTION DE L'ID
            const idMatch = query.match(/WHERE id = (\d+)/);
            if (idMatch) {
                const id = parseInt(idMatch[1]);
                const found = mockTables.mots.find(mot => mot.id === id);
                console.log(`🔍 Recherche ID ${id}:`, found);
                return found ? [[found]] : [[]];
            }
        }
        
        if (query.includes('COUNT(*)')) {
            // ✅ COMPTAGE AVEC FILTRE
            if (query.includes('WHERE difficulte =')) {
                const difficulteMatch = query.match(/WHERE difficulte = '([^']+)'/);
                if (difficulteMatch) {
                    const difficulte = difficulteMatch[1];
                    const count = mockTables.mots.filter(mot => mot.difficulte === difficulte).length;
                    return [[{ count }]];
                }
            } else {
                return [[{ count: mockTables.mots.length }]];
            }
        }
        
        // Fallback : retourner tous les mots
        return [mockTables.mots];
    },

    // ✅ AJOUTEZ CETTE MÉTHODE POUR LA COMPATIBILITÉ
    query: (query) => {
        console.log('🎭 Mock DB query:', query);
        
        if (query.includes('ORDER BY RAND() LIMIT 1')) {
            const randomIndex = Math.floor(Math.random() * mockTables.mots.length);
            return mockTables.mots.slice(randomIndex, randomIndex + 1);
        }
        
        if (query.includes('COUNT(*)')) {
            return [{ count: mockTables.mots.length }];
        }
        
        return mockTables.mots;
    }
};

console.log('✅ Database MOCK COMPLET chargé - Simulation parfaite !');