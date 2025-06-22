import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

console.log('🚀 Serveur Motus - Version working...');

// ✅ MIDDLEWARE DE DEBUG
app.use((req, res, next) => {
    console.log(`📍 ${req.method} ${req.url}`);
    next();
});

// ✅ CORS
app.use(cors({
    origin: [
        'http://localhost:4201',
        'http://localhost:4200',
        'http://127.0.0.1:4201',
        'http://127.0.0.1:4200'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// ✅ JSON PARSER SIMPLE (sans iconv-lite complexe)
app.use(express.json());

// ✅ ROUTE TEST
app.get('/test', (req, res) => {
    console.log('✅ Route /test exécutée');
    res.json({ 
        message: "Serveur Motus fonctionne !",
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// ✅ ROUTES PROXY BASIQUES
app.get('/api/proxy/test', (req, res) => {
    console.log('✅ Route /api/proxy/test exécutée');
    res.json({ 
        message: "API trouve-mot.fr test",
        available: true,
        status: 200
    });
});

app.get('/api/proxy/trouve-mot/random', (req, res) => {
    console.log('✅ Route /api/proxy/trouve-mot/random exécutée');
    res.json([
        {
            name: "EXEMPLE",
            source: "local-fallback",
            difficulty: "difficile"
        }
    ]);
});

// ✅ ROUTES AUTH BASIQUES (pour test)
app.post('/api/auth/register', (req, res) => {
    console.log('✅ Route /api/auth/register exécutée');
    res.json({ 
        message: "Route auth disponible",
        note: "Database non connectée"
    });
});

app.post('/api/auth/login', (req, res) => {
    console.log('✅ Route /api/auth/login exécutée');
    res.json({ 
        message: "Route login disponible",
        note: "Database non connectée"
    });
});

// ✅ 404
app.use('*', (req, res) => {
    console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        error: 'Route non trouvée',
        url: req.originalUrl,
        available: [
            '/test',
            '/api/proxy/test',
            '/api/proxy/trouve-mot/random',
            '/api/auth/register',
            '/api/auth/login'
        ]
    });
});

// ✅ DÉMARRAGE
app.listen(PORT, () => {
    console.log(`✅ Serveur Motus working sur port ${PORT}`);
    console.log(`🔧 Routes disponibles:`);
    console.log(`   - GET /test`);
    console.log(`   - GET /api/proxy/test`);
    console.log(`   - GET /api/proxy/trouve-mot/random`);
    console.log(`   - POST /api/auth/register`);
    console.log(`   - POST /api/auth/login`);
});