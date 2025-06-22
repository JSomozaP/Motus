import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

console.log('🚀 Serveur SANS database.js...');

// ✅ MIDDLEWARE DE DEBUG
app.use((req, res, next) => {
    console.log(`📍 ${req.method} ${req.url}`);
    next();
});

// ✅ CORS
app.use(cors());

// ✅ JSON
app.use(express.json());

// ✅ ROUTE TEST
app.get('/test', (req, res) => {
    console.log('✅ Route /test exécutée');
    res.json({ 
        message: "Serveur SANS DB fonctionne !",
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// ✅ ROUTE PROXY SIMPLE
app.get('/api/proxy/test', (req, res) => {
    console.log('✅ Route /api/proxy/test exécutée');
    res.json({ 
        message: "Proxy simple OK",
        available: true
    });
});

// ✅ ROUTE POUR TESTER JSON
app.post('/api/test', (req, res) => {
    console.log('✅ Route POST /api/test exécutée');
    res.json({ 
        message: "POST fonctionne",
        received: req.body
    });
});

// ✅ 404
app.use('*', (req, res) => {
    console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        error: 'Route non trouvée',
        url: req.originalUrl,
        available: ['/test', '/api/proxy/test', '/api/test']
    });
});

// ✅ DÉMARRAGE
app.listen(PORT, () => {
    console.log(`✅ Serveur SANS DB démarré sur port ${PORT}`);
    console.log(`🔧 Testez: curl http://localhost:${PORT}/test`);
});