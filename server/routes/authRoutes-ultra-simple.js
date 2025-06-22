import express from 'express';

const router = express.Router();

console.log('✅ AuthRoutes ULTRA-simple chargé');

// ✅ ROUTES SANS AUCUN IMPORT EXTERNE
router.get('/test', (req, res) => {
    console.log('✅ Route auth/test');
    res.json({ message: 'Auth ultra-simple OK' });
});

router.post('/register', (req, res) => {
    console.log('✅ Route auth/register (ultra-simple)');
    res.json({ 
        message: 'Register disponible',
        body: req.body,
        note: 'Version ultra-simple'
    });
});

router.post('/login', (req, res) => {
    console.log('✅ Route auth/login (ultra-simple)');
    res.json({ 
        message: 'Login disponible',
        body: req.body,
        note: 'Version ultra-simple'
    });
});

export default router;