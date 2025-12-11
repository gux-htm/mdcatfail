const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/register', (req, res) => res.render('register'));
router.get('/login', (req, res) => res.render('index'));

router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        if (await User.findOne({ email })) return res.status(400).send('User exists');
        const user = new User({ firstName, lastName, email, password });
        await user.save();
        req.session.user = user;
        res.redirect('/dashboard');
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) return res.status(400).send('Invalid credentials');

        // Streak Logic
        const today = new Date();
        today.setHours(0,0,0,0);
        if (user.lastLogin) {
            const lastLogin = new Date(user.lastLogin);
            lastLogin.setHours(0,0,0,0);
            const diffDays = (today - lastLogin) / (1000 * 60 * 60 * 24);
            if (diffDays === 1) {
                user.streak += 1;
            } else if (diffDays > 1) {
                user.streak = 1;
            }
        } else {
            user.streak = 1;
        }
        user.lastLogin = new Date();
        await user.save();

        req.session.user = user;
        res.redirect('/dashboard');
    } catch (err) { res.status(500).send(err.message); }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
