const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    status: {
        type: String,
        enum: ['waiting', 'active', 'ended'],
        default: 'waiting',
    },
    startTime: {
        type: Date,
        default: null,
    },
    endTime: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Session', sessionSchema);
