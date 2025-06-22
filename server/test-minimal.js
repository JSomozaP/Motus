import express from 'express';

console.log('🚀 Démarrage serveur minimal...');

const app = express();

// ✅ LOG DE TOUTES LES REQUÊTES
app.use((req, res, next) => {
    console.log(`📍 REQUÊTE REÇUE: ${req.method} ${req.url}`);
    next();
});

// ✅ ROUTE TEST ULTRA SIMPLE
app.get('/test', (req, res) => {
    console.log('✅ ROUTE /test EXÉCUTÉE');
    res.json({ 
        message: "Serveur minimal fonctionne !",
        timestamp: new Date().toISOString()
    });
});

// ✅ ROUTE CATCH-ALL
app.use('*', (req, res) => {
    console.log(`❌ ROUTE NON TROUVÉE: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Route non trouvée' });
});

// ✅ DÉMARRAGE
app.listen(3001, () => {
    console.log('✅ Serveur minimal démarré sur http://localhost:3001');
    console.log('🔧 Routes disponibles: GET /test');
});

console.log('📝 Fichier chargé, serveur en cours de démarrage...');