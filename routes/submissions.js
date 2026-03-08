const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Question = require('../models/Question');
const Session = require('../models/Session');
const Player = require('../models/Player');
const auth = require('../middleware/auth');

// POST /api/submissions - Submit quiz answers
router.post('/', async (req, res) => {
    try {
        const { playerId, sessionId, answers } = req.body;

        if (!playerId || !sessionId || !answers) {
            return res.status(400).json({ error: 'playerId, sessionId, and answers are required' });
        }

        // Check session is active
        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        if (session.status === 'ended') {
            return res.status(400).json({ error: 'Session has already ended' });
        }

        // Check for duplicate submission
        const existingSubmission = await Submission.findOne({ playerId, sessionId });
        if (existingSubmission) {
            return res.status(409).json({ error: 'You have already submitted' });
        }

        // Get correct answers from DB
        const questions = await Question.find({ quizId: session.quizId });
        let correctAnswerCount = 0;

        // answers is an object: { questionId: 'A' | 'B' | 'C' | 'D' }
        questions.forEach((q) => {
            const playerAnswer = answers[q._id.toString()];
            if (playerAnswer && playerAnswer === q.correctAnswer) {
                correctAnswerCount++;
            }
        });

        // Record submission with SERVER time
        const submission = new Submission({
            playerId,
            sessionId,
            answers: new Map(Object.entries(answers)),
            correctAnswerCount,
            submissionTime: new Date(),
        });

        await submission.save();

        // Get submission count for ordering
        const submissionCount = await Submission.countDocuments({ sessionId });

        // Notify via Socket.IO
        const io = req.app.get('io');
        const player = await Player.findById(playerId);
        io.to(sessionId).emit('submission-received', {
            playerId,
            playerName: player?.playerName,
            profilePicture: player?.profilePicture,
            submissionOrder: submissionCount,
        });

        res.status(201).json({
            message: 'Quiz submitted successfully',
            correctAnswerCount,
            submissionTime: submission.submissionTime,
        });
    } catch (err) {
        console.error('Error submitting quiz:', err);
        if (err.code === 11000) {
            return res.status(409).json({ error: 'You have already submitted' });
        }
        res.status(500).json({ error: 'Failed to submit quiz' });
    }
});

// GET /api/submissions/session/:sessionId - Get submissions for a session
router.get('/session/:sessionId', auth, async (req, res) => {
    try {
        const submissions = await Submission.find({ sessionId: req.params.sessionId })
            .populate('playerId', 'playerName profilePicture playerCode')
            .sort({ submissionTime: 1 });
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// GET /api/submissions/check/:sessionId/:playerId - Check if a player has submitted
router.get('/check/:sessionId/:playerId', async (req, res) => {
    try {
        const { sessionId, playerId } = req.params;
        const existingSubmission = await Submission.findOne({ playerId, sessionId });
        res.json({ submitted: !!existingSubmission });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check submission status' });
    }
});

// GET /api/submissions/leaderboard/:sessionId - Get leaderboard
router.get('/leaderboard/:sessionId', auth, async (req, res) => {
    try {
        const submissions = await Submission.find({ sessionId: req.params.sessionId })
            .populate('playerId', 'playerName profilePicture playerCode')
            .sort({ correctAnswerCount: -1, submissionTime: 1 })
            .limit(10);

        const leaderboard = submissions.map((sub, idx) => ({
            rank: idx + 1,
            playerName: sub.playerId?.playerName,
            profilePicture: sub.playerId?.profilePicture,
            playerCode: sub.playerId?.playerCode,
            correctAnswerCount: sub.correctAnswerCount,
            submissionTime: sub.submissionTime,
        }));

        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;
