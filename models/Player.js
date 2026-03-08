const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    playerName: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    profilePicture: {
        type: String,
        default: '',
    },
    playerCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Player', playerSchema);
