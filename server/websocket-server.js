import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'gyandeep-jwt-secret';

// Authenticate socket connections using a Bearer JWT sent in `socket.handshake.auth.token`
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth && socket.handshake.auth.token
        if (!token) return next(new Error('Authentication error: token required'))
        const payload = jwt.verify(token, JWT_SECRET)
        socket.user = payload
        return next()
    } catch (err) {
        return next(new Error('Authentication error'))
    }
});

// Store active sessions and connections
const activeSessions = new Map();
const userConnections = new Map();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle user identification
    socket.on('identify', (userData) => {
        userConnections.set(socket.id, userData);
        console.log('User identified:', userData.id, userData.role);

        // Send current active sessions
        socket.emit('active-sessions', Array.from(activeSessions.values()));
    });

    // Handle attendance updates
    socket.on('attendance-update', (data) => {
        console.log('Attendance update:', data);
        // Broadcast to all connected clients
        io.emit('attendance-changed', data);
    });

    // Handle performance updates
    socket.on('performance-update', (data) => {
        console.log('Performance update:', data);
        io.emit('performance-changed', data);
    });

    // Handle quiz submissions
    socket.on('quiz-submitted', (data) => {
        console.log('Quiz submitted:', data);
        io.emit('quiz-submission', data);
    });

    // Handle class session updates
    socket.on('session-update', (sessionData) => {
        console.log('Session update:', sessionData);
        activeSessions.set(sessionData.code, sessionData);
        io.emit('session-changed', sessionData);
    });

    // Handle session end
    socket.on('session-end', (sessionCode) => {
        console.log('Session ended:', sessionCode);
        activeSessions.delete(sessionCode);
        io.emit('session-ended', sessionCode);
    });

    // Handle real-time chat messages
    socket.on('chat-message', (message) => {
        console.log('Chat message:', message);
        io.emit('new-chat-message', message);
    });

    // Handle engagement metrics
    socket.on('engagement-metric', (metric) => {
        console.log('Engagement metric:', metric);
        io.emit('engagement-update', metric);
    });

    // Handle blockchain transaction updates
    socket.on('blockchain-transaction', (txData) => {
        console.log('Blockchain transaction:', txData);
        io.emit('blockchain-update', txData);
    });

    // Handle digital twin state updates
    socket.on('digital-twin-update', (state) => {
        console.log('Digital twin update:', state);
        io.emit('digital-twin-changed', state);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const userData = userConnections.get(socket.id);
        if (userData) {
            console.log('User disconnected:', userData.id);
            userConnections.delete(socket.id);
        } else {
            console.log('Client disconnected:', socket.id);
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        connections: userConnections.size,
        activeSessions: activeSessions.size
    });
});

const PORT = process.env.WEBSOCKET_PORT || 3002;

httpServer.listen(PORT, () => {
    console.log(`WebSocket server running on http://localhost:${PORT}`);
    console.log('Ready to accept connections...');
});

// Handle uncaught exceptions to prevent silent crashes
process.on('uncaughtException', (err) => {
    console.error('WebSocket server uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('WebSocket server unhandled rejection:', reason);
});
