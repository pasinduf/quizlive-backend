const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const auth = require('../middleware/auth');

// POST /api/sessions - Create a session
router.post('/', auth, async (req, res) => {
    try {
        const { quizId } = req.body;
        if (!quizId) {
            return res.status(400).json({ error: 'quizId is required' });
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Check if there is already a waiting or active session for this quiz
        const existingSession = await Session.findOne({
            quizId,
            status: { $in: ['waiting', 'active'] }
        });

        if (existingSession) {
            return res.status(400).json({
                error: 'A session for this quiz is already active or waiting.',
                sessionId: existingSession._id
            });
        }

        const session = new Session({ quizId });
        await session.save();
        res.status(201).json(session);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// GET /api/sessions - List all sessions
router.get('/', auth, async (req, res) => {
    try {
        const sessions = await Session.find()
            .populate('quizId', 'title')
            .sort({ createdAt: -1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// GET /api/sessions/:id - Get session details
router.get('/:id', async (req, res) => {
    try {
        const session = await Session.findById(req.params.id).populate('quizId', 'title');
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// GET /api/sessions/:id/qr - Get QR code for session
router.get('/:id/qr', auth, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const clientUrl = process.env.CLIENT_URL;
        const joinUrl = `${clientUrl}/join/${session._id}`;
        const qrDataUrl = await QRCode.toDataURL(joinUrl, {
            width: 400,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
        });

        res.json({ qrCode: qrDataUrl, joinUrl });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// POST /api/sessions/:id/start - Start session
router.post('/:id/start', auth, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // Count current questions for the quiz
        const totalQuestions = await Question.countDocuments({ quizId: session.quizId });

        session.status = 'active';
        session.startTime = new Date();
        session.totalQuestions = totalQuestions;
        await session.save();

        // Broadcast via Socket.IO
        const io = req.app.get('io');
        io.to(req.params.id).emit('session-started', { sessionId: req.params.id });

        res.json(session);
    } catch (err) {
        console.error('Error starting session:', err);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// POST /api/sessions/:id/end - End session
router.post('/:id/end', auth, async (req, res) => {
    try {
        const session = await Session.findByIdAndUpdate(
            req.params.id,
            { status: 'ended', endTime: new Date() },
            { new: true }
        );
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // Broadcast via Socket.IO
        const io = req.app.get('io');
        io.to(req.params.id).emit('session-ended', { sessionId: req.params.id });

        res.json(session);
    } catch (err) {
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// DELETE /api/sessions/:id - Delete a session
router.delete('/:id', auth, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        if (session.status === 'active') {
            return res.status(400).json({ error: 'Cannot delete an active session. Please end the quiz first.' });
        }

        await Session.findByIdAndDelete(req.params.id);
        res.json({ message: 'Session deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

module.exports = router;
