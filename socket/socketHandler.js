const jwt = require('jsonwebtoken');

module.exports = (io) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error: No token provided'));
        
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return next(new Error('Authentication error: Invalid token'));
            socket.user = user;
            
            // Disconnect socket when token expires
            const expiresInMs = (user.exp * 1000) - Date.now();
            if (expiresInMs <= 0) return next(new Error('Authentication error: Token expired'));
            
            socket.tokenTimeout = setTimeout(() => {
                console.log(`Token expired for ${user.username}, disconnecting socket.`);
                socket.emit('token_expired');
                socket.disconnect(true);
            }, expiresInMs);

            next();
        });
    });

    io.on('connection', (socket) => {
        console.log(`User connected via socket: ${socket.user.username} (Worker ${process.pid})`);
        
        // Securely isolate events to their specific user ID room
        socket.join(`user_${socket.user.id}`);
        
        socket.on('disconnect', () => {
            clearTimeout(socket.tokenTimeout);
            console.log(`User disconnected: ${socket.user.username}`);
        });
    });
};
