import express from 'express';

console.log('🚀 Serveur ZÉRO import...');

const app = express();
const PORT = 3002;

// ✅ LOG IMMÉDIAT
console.log('📝 Configuration Express...');

app.use((req, res, next) => {
    console.log(`📍 REQUÊTE REÇUE: ${req.method} ${req.url}`);
    console.log(`📍 Timestamp: ${new Date().toISOString()}`);
    next();
});

app.get('/test', (req, res) => {
    console.log('✅ ROUTE /test EXÉCUTÉE');
    res.json({ 
        message: "ZÉRO import fonctionne !",
        success: true
    });
});

console.log('📝 Démarrage serveur...');

app.listen(PORT, () => {
    console.log(`✅ Serveur ZÉRO import démarré sur port ${PORT}`);
    console.log(`🔗 Test: curl http://localhost:${PORT}/test`);
});

console.log('📝 Fin du fichier atteinte');