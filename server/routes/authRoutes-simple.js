import express from 'express';

const router = express.Router();

console.log('✅ AuthRoutes simple chargé');

// ✅ ROUTES BASIQUES SANS BLOCAGE
router.get('/test', (req, res) => {
    console.log('✅ Route auth/test');
    res.json({ message: 'Auth routes simple OK' });
});

router.post('/register', (req, res) => {
    console.log('✅ Route auth/register (mock)');
    res.json({ 
        message: 'Register endpoint disponible',
        note: 'Version simplifiée sans DB'
    });
});

router.post('/login', (req, res) => {
    console.log('✅ Route auth/login (mock)');
    res.json({ 
        message: 'Login endpoint disponible',
        note: 'Version simplifiée sans DB'
    });
});

export default router;