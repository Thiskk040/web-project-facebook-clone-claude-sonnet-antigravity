require('dotenv').config();
const cluster = require("cluster");
const http = require("http");
const { setupMaster, setupWorker } = require("@socket.io/sticky");
const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");
const numCPUs = require("os").cpus().length;

if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
    const httpServer = http.createServer();
    
    // setup sticky sessions (load balancing across workers)
    setupMaster(httpServer, {
        loadBalancingMethod: "least-connection",
    });
    
    // setup connections between the workers
    setupPrimary();
    
    // needed for sticky sessions
    cluster.setupPrimary({
        serialization: "advanced",
    });
    
    httpServer.listen(3000, () => {
        console.log(`Cluster Server listening on port 3000. Spawning ${numCPUs} workers...`);
    });
    
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    
    cluster.on("exit", (worker) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    // Worker processes
    const express = require('express');
    const cors = require('cors');
    const path = require('path');
    const { Server } = require("socket.io");
    require('dotenv').config();
    
    const app = express();
    const httpServer = http.createServer(app);
    
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map(o => o.trim());

    const corsOptions = {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('CORS policy violation: Access denied'));
            }
        },
        credentials: true
    };

    app.use(cors(corsOptions));
    app.use(express.json());
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    
    const io = new Server(httpServer, {
        cors: { origin: allowedOrigins, credentials: true }
    });
    
    // use the cluster adapter so io.emit goes to all workers
    io.adapter(createAdapter());
    setupWorker(io);
    
    // Setup Socket Handlers
    require('./socket/socketHandler')(io);
    
    // Attach IO to request so modular routes can emit events
    app.set('io', io);
    
    // Register Routes
    app.use('/auth', require('./routes/authRoutes'));
    app.use('/posts', require('./routes/postRoutes'));
    app.use('/interactions', require('./routes/interactionRoutes'));
    app.use('/comments', require('./routes/commentRoutes'));
    app.use('/friendships', require('./routes/friendshipRoutes'));
    app.use('/friend-request', require('./routes/friendRequestRoutes'));
    app.use('/friend-requests', require('./routes/friendRequestsGetRoutes'));
    app.use('/users', require('./routes/userRoutes'));
    app.use('/messages', require('./routes/messageRoutes'));
    app.use('/notifications', require('./routes/notificationRoutes'));
    
    const multer = require('multer');
    app.use((err, req, res, next) => {
        console.error(`Worker ${process.pid} Error:`, err.stack);
        if (err instanceof multer.MulterError || err.message.includes('Images Only')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: "Something went wrong!" });
    });
    
    console.log(`Worker ${process.pid} started`);
}
