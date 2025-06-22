import express from 'express';

const router = express.Router();

console.log('✅ ProxyRoutes SANS database chargé');

// ✅ ROUTES BASIQUES SANS DB
router.get('/test', (req, res) => {
    console.log('✅ Route proxy/test');
    res.json({ message: 'Proxy routes OK (sans DB)' });
});

router.get('/trouve-mot/random', (req, res) => {
    console.log('✅ Route proxy/trouve-mot/random (fallback)');
    res.json([{
        name: "EXEMPLE",
        source: "fallback-proxy",
        difficulty: "moyen"
    }]);
});

router.get('/trouve-mot/:mot', (req, res) => {
    console.log('✅ Route proxy/trouve-mot/:mot (fallback)');
    res.json([{
        name: req.params.mot.toUpperCase(),
        source: "fallback-proxy",
        difficulty: "inconnu"
    }]);
});

export default router;