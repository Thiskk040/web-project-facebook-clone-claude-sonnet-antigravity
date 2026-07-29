const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Throttle tracking map (userId_roomId -> timestamp)
const lastTypingEmitMap = new Map();

function getOptInStatus(userId) {
    return new Promise((resolve) => {
        db.get("SELECT live_typing_enabled FROM users WHERE id = ?", [userId], (err, row) => {
            if (err || !row) return resolve(false);
            resolve(row.live_typing_enabled === 1);
        });
    });
}

module.exports = (io) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error: No token provided'));
        
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return next(new Error('Authentication error: Invalid token'));
            if (user.purpose) return next(new Error('Authentication error: Token not valid for socket connection'));
            
            db.get("SELECT token_version FROM users WHERE id = ?", [user.id], (err, dbUser) => {
                if (err || !dbUser) return next(new Error('Authentication error: User session invalid'));
                if (user.token_version !== undefined && dbUser.token_version !== user.token_version) {
                    return next(new Error('Authentication error: Session expired or revoked'));
                }

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
    });

    io.on('connection', (socket) => {
        console.log(`User connected via socket: ${socket.user.username} (Worker ${process.pid})`);
        
        // Track joined rooms for cleanup on disconnect/toggle
        socket.activeRooms = new Set();
        socket.join(`user_${socket.user.id}`);
        socket.activeRooms.add(`user_${socket.user.id}`);

        // Client room join event
        socket.on('join_room', async (data) => {
            const roomId = typeof data === 'string' ? data : data?.roomId;
            const targetUserId = data?.targetUserId;
            if (!roomId) return;

            socket.join(roomId);
            socket.activeRooms.add(roomId);

            if (targetUserId) {
                const senderOptIn = await getOptInStatus(socket.user.id);
                const peerOptIn = await getOptInStatus(parseInt(targetUserId));
                const isActive = senderOptIn && peerOptIn;

                io.to(roomId).emit('live_typing_status_changed', {
                    roomId,
                    active: isActive,
                    senderOptIn,
                    peerOptIn
                });
            }
        });

        // Live typing draft relay
        socket.on('typing_draft', async (data) => {
            if (!data) return;
            const { roomId, targetUserId, draftText } = data;
            const senderId = socket.user.id;
            const targetId = parseInt(targetUserId);

            if (!targetId || isNaN(targetId)) return;

            const effectiveRoomId = roomId || `chat_${Math.min(senderId, targetId)}_${Math.max(senderId, targetId)}`;

            // 1. Dual Opt-In Verification (MANDATORY SERVER GATE)
            const senderOptIn = await getOptInStatus(senderId);
            const peerOptIn = await getOptInStatus(targetId);

            if (!senderOptIn || !peerOptIn) {
                // Dual opt-in failed: drop draft silently
                return;
            }

            // 2. Server-Side Throttle (150ms window)
            const throttleKey = `${senderId}_${effectiveRoomId}`;
            const now = Date.now();
            const lastEmit = lastTypingEmitMap.get(throttleKey) || 0;
            if (now - lastEmit < 150) {
                return; // Suppress high-frequency emissions
            }
            lastTypingEmitMap.set(throttleKey, now);

            // 3. Length Limit Truncation (Max 500 characters)
            const safeText = typeof draftText === 'string' ? draftText.slice(0, 500) : '';

            // 4. Relay to peer across cluster workers
            const payload = {
                userId: senderId,
                username: socket.user.username,
                roomId: effectiveRoomId,
                draftText: safeText
            };

            socket.to(effectiveRoomId).emit('peer_typing_draft', payload);
            io.to(`user_${targetId}`).emit('peer_typing_draft', payload);
        });

        // Typing stopped event
        socket.on('typing_stopped', (data) => {
            const senderId = socket.user.id;
            const targetId = data?.targetUserId ? parseInt(data.targetUserId) : null;
            const effectiveRoomId = data?.roomId || (targetId ? `chat_${Math.min(senderId, targetId)}_${Math.max(senderId, targetId)}` : null);

            const payload = { userId: senderId, roomId: effectiveRoomId };

            if (effectiveRoomId) {
                socket.to(effectiveRoomId).emit('peer_typing_stopped', payload);
            }
            if (targetId) {
                io.to(`user_${targetId}`).emit('peer_typing_stopped', payload);
            }
        });

        // Toggle event handling (Instant Database Sync & Dual Opt-In Broadcast)
        socket.on('live_typing_toggle', async (data) => {
            const enabled = !!data?.enabled;

            db.run("UPDATE users SET live_typing_enabled = ? WHERE id = ?", [enabled ? 1 : 0, socket.user.id], async () => {
                for (const r of socket.activeRooms) {
                    const match = r.match(/^chat_(\d+)_(\d+)$/);
                    if (match) {
                        const u1 = parseInt(match[1]);
                        const u2 = parseInt(match[2]);
                        const opt1 = await getOptInStatus(u1);
                        const opt2 = await getOptInStatus(u2);
                        const isBothActive = opt1 && opt2;

                        io.to(r).emit('live_typing_status_changed', { roomId: r, active: isBothActive });

                        if (!isBothActive) {
                            io.to(r).emit('peer_typing_stopped', { userId: socket.user.id, roomId: r });
                        }
                    }
                }
            });
        });

        socket.on('disconnect', () => {
            clearTimeout(socket.tokenTimeout);
            
            // Broadcast typing stopped to all active rooms on disconnect
            socket.activeRooms.forEach(r => {
                socket.to(r).emit('peer_typing_stopped', { userId: socket.user.id, roomId: r });
            });

            console.log(`User disconnected: ${socket.user.username}`);
        });
    });
};
