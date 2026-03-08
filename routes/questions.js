const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Session = require('../models/Session');

// POST /api/questions - Create question(s)
router.post('/', async (req, res) => {
    try {
        const { quizId, questions } = req.body;

        if (!quizId) {
            return res.status(400).json({ error: 'quizId is required' });
        }

        // Support both single question and batch
        if (Array.isArray(questions)) {
            const docs = questions.map((q) => ({ ...q, quizId }));
            const created = await Question.insertMany(docs);
            return res.status(201).json(created);
        }

        // Single question
        const { questionText, optionA, optionB, optionC, optionD, correctAnswer, order } = req.body;
        if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
            return res.status(400).json({ error: 'All question fields are required' });
        }

        const question = new Question({
            quizId,
            questionText,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            order: order || 1,
        });
        await question.save();
        res.status(201).json(question);
    } catch (err) {
        console.error('Error creating question:', err);
        res.status(500).json({ error: 'Failed to create question' });
    }
});

// GET /api/questions/session/:sessionId - Get questions for a specific session
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { role } = req.query;
        const session = await Session.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        let query = Question.find({ quizId: session.quizId }).sort({ order: 1 });

        // Exclude correctAnswer for player-facing requests
        if (role === 'player') {
            query = query.select('-correctAnswer');
        }

        const questions = await query;
        res.json(questions);
    } catch (err) {
        console.error('Error fetching questions by session:', err);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// GET /api/questions/quiz/:quizId - Get questions for a quiz
router.get('/quiz/:quizId', async (req, res) => {
    try {
        const { role } = req.query;
        let query = Question.find({ quizId: req.params.quizId }).sort({ order: 1 });

        // Exclude correctAnswer for player-facing requests
        if (role === 'player') {
            query = query.select('-correctAnswer');
        }

        const questions = await query;
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// PUT /api/questions/:id - Update a question
router.put('/:id', async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!question) return res.status(404).json({ error: 'Question not found' });
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update question' });
    }
});

// DELETE /api/questions/:id - Delete a question
router.delete('/:id', async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);
        if (!question) return res.status(404).json({ error: 'Question not found' });
        res.json({ message: 'Question deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

module.exports = router;
