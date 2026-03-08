const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');

// POST /api/quizzes - Create a quiz
router.post('/', async (req, res) => {
    try {
        const { title, createdBy } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }
        const quiz = new Quiz({ title, createdBy: createdBy || 'admin' });
        await quiz.save();
        res.status(201).json(quiz);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

// GET /api/quizzes - List all quizzes with session status
router.get('/', async (req, res) => {
    try {
        const quizzes = await Quiz.aggregate([
            {
                $lookup: {
                    from: 'sessions',
                    let: { quizId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$quizId', '$$quizId'] },
                                        { $in: ['$status', ['active', 'waiting']] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'activeSessions'
                }
            },
            {
                $lookup: {
                    from: 'questions',
                    localField: '_id',
                    foreignField: 'quizId',
                    as: 'questions'
                }
            },
            {
                $addFields: {
                    hasActiveSession: { $gt: [{ $size: '$activeSessions' }, 0] },
                    currentSessionStatus: { $arrayElemAt: ['$activeSessions.status', 0] },
                    questionCount: { $size: '$questions' }
                }
            },
            { $project: { questions: 0, activeSessions: 0 } },
            { $sort: { createdAt: -1 } }
        ]);
        res.json(quizzes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
});

// GET /api/quizzes/:id - Get a quiz
router.get('/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        res.json(quiz);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch quiz' });
    }
});

// DELETE /api/quizzes/:id - Delete a quiz
router.delete('/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findByIdAndDelete(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        res.json({ message: 'Quiz deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete quiz' });
    }
});

module.exports = router;
