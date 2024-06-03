const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET user preferences
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST update user preferences
router.post('/:userId', async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: { colorTheme: req.body.colorTheme } },
            { new: true }
        );
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
 
