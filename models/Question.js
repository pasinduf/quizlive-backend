const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    questionText: {
        type: String,
        required: true,
        trim: true,
    },
    optionA: {
        type: String,
        required: true,
        trim: true,
    },
    optionB: {
        type: String,
        required: true,
        trim: true,
    },
    optionC: {
        type: String,
        required: true,
        trim: true,
    },
    optionD: {
        type: String,
        required: true,
        trim: true,
    },
    correctAnswer: {
        type: String,
        required: true,
        enum: ['A', 'B', 'C', 'D'],
    },
    order: {
        type: Number,
        required: true,
    },
});

questionSchema.index({ quizId: 1, order: 1 });

module.exports = mongoose.model('Question', questionSchema);
