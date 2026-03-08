const express = require('express');
const router = express.Router();
const multer = require('multer');
const Player = require('../models/Player');
const { uploadToCloudinary } = require('../config/cloudinary');
const auth = require('../middleware/auth');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
});

// POST /api/players - Register a new player
router.post('/', auth, upload.single('profilePicture'), async (req, res) => {
    try {
        const { playerName, playerCode } = req.body;

        if (!playerName || !playerCode) {
            return res.status(400).json({ error: 'playerName and playerCode are required' });
        }

        // Check for duplicate code
        const existingCode = await Player.findOne({ playerCode: playerCode.toUpperCase() });
        if (existingCode) {
            return res.status(409).json({ error: 'Player code already exists' });
        }

        // Check for duplicate name (case-insensitive)
        const existingName = await Player.findOne({ playerName: { $regex: new RegExp(`^${playerName}$`, 'i') } });
        if (existingName) {
            return res.status(409).json({ error: 'Player name already exists' });
        }

        const player = new Player({
            playerName,
            playerCode: playerCode.toUpperCase(),
        });

        if (req.file) {
            player.profilePicture = await uploadToCloudinary(req.file.buffer, 'quiz-app/players', player._id.toString());
        }

        await player.save();
        res.status(201).json(player);
    } catch (err) {
        console.error('Error creating player:', err);
        res.status(500).json({ error: 'Failed to create player' });
    }
});

// GET /api/players - List all players
router.get('/', auth, async (req, res) => {
    try {
        const players = await Player.find().sort({ createdAt: -1 });
        res.json(players);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// GET /api/players/:id - Get player by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const player = await Player.findById(req.params.id);
        if (!player) return res.status(404).json({ error: 'Player not found' });
        res.json(player);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch player' });
    }
});

// POST /api/players/validate - Validate player code for session join
router.post('/validate', async (req, res) => {
    try {
        const { playerCode, sessionId } = req.body;

        if (!playerCode) {
            return res.status(400).json({ error: 'playerCode is required' });
        }

        const player = await Player.findOne({ playerCode: playerCode.toUpperCase() });
        if (!player) {
            return res.status(404).json({ error: 'Invalid player code' });
        }

        res.json({
            _id: player._id,
            playerName: player.playerName,
            profilePicture: player.profilePicture,
            playerCode: player.playerCode,
        });
    } catch (err) {
        res.status(500).json({ error: 'Validation failed' });
    }
});

// PUT /api/players/:id - Update player details
router.put('/:id', auth, upload.single('profilePicture'), async (req, res) => {
    try {
        const { playerName, playerCode } = req.body;
        const player = await Player.findById(req.params.id);
        if (!player) return res.status(404).json({ error: 'Player not found' });

        // If code is being changed, check for uniqueness
        if (playerCode && playerCode.toUpperCase() !== player.playerCode) {
            const existingCode = await Player.findOne({ playerCode: playerCode.toUpperCase() });
            if (existingCode) return res.status(409).json({ error: 'Player code already exists' });
            player.playerCode = playerCode.toUpperCase();
        }

        // If name is being changed, check for uniqueness
        if (playerName && playerName !== player.playerName) {
            const existingName = await Player.findOne({
                playerName: { $regex: new RegExp(`^${playerName}$`, 'i') },
                _id: { $ne: player._id }
            });
            if (existingName) return res.status(409).json({ error: 'Player name already exists' });
            player.playerName = playerName;
        }

        // Handle profile picture update
        if (req.file) {
            player.profilePicture = await uploadToCloudinary(req.file.buffer, 'quiz-app/players', player._id.toString());
        }

        await player.save();
        res.json(player);
    } catch (err) {
        console.error('Error updating player:', err);
        res.status(500).json({ error: 'Failed to update player' });
    }
});

// DELETE /api/players/:id - Delete a player
router.delete('/:id', auth, async (req, res) => {
    try {
        const player = await Player.findByIdAndDelete(req.params.id);
        if (!player) return res.status(404).json({ error: 'Player not found' });
        res.json({ message: 'Player deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete player' });
    }
});

module.exports = router;
