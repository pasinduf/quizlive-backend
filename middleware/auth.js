const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ error: 'No authentication token, access denied' });
        }

        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No authentication token, access denied' });
        }

        const verified = jwt.verify(token, process.env.JWT_SECRET || 'quiz_app_secret_key');
        if (!verified) {
            return res.status(401).json({ error: 'Token verification failed, access denied' });
        }

        req.adminId = verified.id;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token, access denied' });
    }
};

module.exports = auth;
