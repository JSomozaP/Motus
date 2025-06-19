import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import des routes
import authRoutes from './routes/authRoutes.js';
// import gameRoutes from './routes/gameRoutes.js';
import proxyRoutes from './routes/proxyRoutes.js';  // ✅ Import des routes proxy

// Configuration des variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


// // Sécurité avec Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));


// ✅ Configuration CORS
app.use(cors({
    origin: [
        
        'http://localhost:4201',
        'http://127.0.0.1:4201',
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        process.env.FRONTEND_URL || 'http://localhost:4201'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware pour preflight requests
app.options('*', cors());

// Rate limiting global
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
    }
});
app.use(globalLimiter);

// Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Routes proxy PUBLIQUES (SANS authentification)
app.use('/api/proxy', proxyRoutes);

// Routes avec authentification
app.use('/api/auth', authRoutes);
// app.use('/api/game', gameRoutes);



// Route de santé
// app.get('/api/health', (req, res) => {
//     res.json({ 
//         status: 'OK', 
//         timestamp: new Date().toISOString(),
//         environment: process.env.NODE_ENV 
//     });
// });

// Middleware de gestion d'erreurs global
// app.use((err, req, res, next) => {
//     console.error('Erreur non gérée:', err);
//     res.status(500).json({ 
//         message: 'Erreur interne du serveur',
//         ...(process.env.NODE_ENV === 'development' && { error: err.message })
//     });
// });

// Gestion des routes non trouvées
// app.use('*', (req, res) => {
//     console.log('❌ Route non trouvée:', req.originalUrl);
//     res.status(404).json({ message: 'Route non trouvée', url: req.originalUrl });
// });

// Route de test simple
app.get('/test', (req, res) => {
    res.json({ message: "Le serveur fonctionne !" });
});

// Démarrage du serveur
app.listen(PORT,"127.0.0.1", () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📊 Environnement: ${process.env.NODE_ENV}`);
    console.log(`🌐 CORS autorisé pour: http://localhost:4201, http://localhost:4200`);
    console.log(`🔧 Routes proxy disponibles: /api/proxy/*`);
});

// export default app;