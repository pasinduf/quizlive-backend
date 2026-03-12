const Session = require('../models/Session');
const Question = require('../models/Question');

function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Player joins a session room
        socket.on('join-session', ({ sessionId, player }) => {
            socket.join(sessionId);
            console.log(`👤 ${player?.playerName || 'Unknown'} joined session ${sessionId}`);

            // Notify host that a player joined the lobby
            socket.to(sessionId).emit('player-joined', {
                playerId: player?._id,
                playerName: player?.playerName,
                profilePicture: player?.profilePicture,
            });
        });

        // Host joins session room to receive updates
        socket.on('host-join-session', ({ sessionId }) => {
            socket.join(sessionId);
            console.log(`🎯 Host joined session ${sessionId}`);
        });

        // Host starts the quiz session
        socket.on('start-session', async ({ sessionId }) => {
            try {
                const session = await Session.findById(sessionId);
                if (session) {
                    const totalQuestions = await Question.countDocuments({ quizId: session.quizId });
                    session.status = 'active';
                    session.startTime = new Date();
                    session.totalQuestions = totalQuestions;
                    await session.save();

                    io.to(sessionId).emit('session-started', { sessionId });
                    console.log(`🚀 Session ${sessionId} started with ${totalQuestions} questions`);
                }
            } catch (err) {
                console.error('Error starting session via socket:', err);
                socket.emit('error', { message: 'Failed to start session' });
            }
        });

        // Player submitted their quiz
        socket.on('player-submitted', ({ sessionId, player, submissionOrder }) => {
            socket.to(sessionId).emit('submission-received', {
                playerId: player._id,
                playerName: player.playerName,
                profilePicture: player.profilePicture,
                submissionOrder,
            });
            console.log(`📝 ${player.playerName} submitted in session ${sessionId}`);
        });

        // Host ends session
        socket.on('end-session', async ({ sessionId }) => {
            try {
                await Session.findByIdAndUpdate(sessionId, {
                    status: 'ended',
                    endTime: new Date(),
                });
                io.to(sessionId).emit('session-ended', { sessionId });
                console.log(`🏁 Session ${sessionId} ended`);
            } catch (err) {
                socket.emit('error', { message: 'Failed to end session' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });
}

module.exports = setupSocketHandlers;
