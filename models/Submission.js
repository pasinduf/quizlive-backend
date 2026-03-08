const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
    },
    answers: {
        type: Map,
        of: String,
        default: {},
    },
    correctAnswerCount: {
        type: Number,
        default: 0,
    },
    submissionTime: {
        type: Date,
        default: Date.now,
    },
});

// One submission per player per session
submissionSchema.index({ playerId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
