const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const db = new Database('bhariyo.db');
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    wins INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0
  )
`);

// Migrations for existing databases
try {
  db.exec('ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0');
} catch (e) {
  // Column already exists or other error
}

try {
  db.exec('ALTER TABLE users ADD COLUMN games_played INTEGER DEFAULT 0');
} catch (e) {
  // Column already exists or other error
}

// Auth Routes
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const result = stmt.run(username, hashedPassword);
    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET);
    res.json({ token, user: { id: result.lastInsertRowid, username } });
  } catch (err) {
    res.status(400).json({ message: 'Username already exists' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);
  
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, wins: user.wins, games_played: user.games_played } });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/profile', authMiddleware, (req, res) => {
  const stmt = db.prepare('SELECT id, username, wins, games_played FROM users WHERE id = ?');
  const user = stmt.get(req.user.id);
  res.json(user);
});

// Social Multiplayer Logic
const onlineUsers = new Map(); // socket.id -> { id, username, status }
const challenges = new Map(); // challengeId -> { from, to }
const matches = new Map(); // roomId -> { timer, p1Time, p2Time, currentPlayer, players }

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  socket.on('register_online', (userData) => {
    onlineUsers.set(socket.id, { 
      socketId: socket.id,
      username: userData.username, 
      id: userData.id,
      status: 'AVAILABLE' 
    });
    broadcastOnlineUsers();
  });

  socket.on('send_challenge', (targetSocketId) => {
    const challenger = onlineUsers.get(socket.id);
    const target = onlineUsers.get(targetSocketId);

    if (challenger && target && target.status === 'AVAILABLE') {
      const challengeId = Math.random().toString(36).substring(7);
      challenges.set(challengeId, { from: socket.id, to: targetSocketId });
      
      io.to(targetSocketId).emit('incoming_challenge', {
        challengeId,
        from: { socketId: socket.id, username: challenger.username }
      });
    }
  });

  socket.on('accept_challenge', (challengeId) => {
    const challenge = challenges.get(challengeId);
    if (challenge) {
      const p1 = onlineUsers.get(challenge.from);
      const p2 = onlineUsers.get(challenge.to);

      if (p1 && p2) {
        const roomId = `room_${challengeId}`;
        p1.status = 'IN_GAME';
        p2.status = 'IN_GAME';
        
        const matchData = {
          id: roomId,
          name: `${p1.username} vs ${p2.username}`,
          p1Time: 600, // 10 minutes
          p2Time: 600,
          currentPlayer: 1,
          players: [
            { id: challenge.from, username: p1.username, side: 1 },
            { id: challenge.to, username: p2.username, side: 2 }
          ]
        };

        matches.set(roomId, matchData);
        socket.join(roomId);
        io.to(challenge.from).to(challenge.to).emit('game_start', matchData);
        
        // Start match timer
        matchData.timer = setInterval(() => {
          const m = matches.get(roomId);
          if (!m) return;

          if (m.currentPlayer === 1) {
            m.p1Time -= 1;
          } else {
            m.p2Time -= 1;
          }

          if (m.p1Time <= 0 || m.p2Time <= 0) {
            clearInterval(m.timer);
            const winnerSide = m.p1Time <= 0 ? 2 : 1;
            io.to(roomId).emit('game_over', { 
              winner: m.players.find(p => p.side === winnerSide).username,
              reason: 'Time Out'
            });
            matches.delete(roomId);
          } else {
            io.to(roomId).emit('time_sync', { p1Time: m.p1Time, p2Time: m.p2Time });
          }
        }, 1000);

        challenges.delete(challengeId);
        broadcastOnlineUsers();
      }
    }
  });

  socket.on('decline_challenge', (challengeId) => {
    const challenge = challenges.get(challengeId);
    if (challenge) {
      io.to(challenge.from).emit('challenge_declined');
      challenges.delete(challengeId);
    }
  });

  socket.on('move', ({ roomId, moveData }) => {
    const match = matches.get(roomId);
    if (match) {
      match.currentPlayer = moveData.nextPlayer;
      // Immediate sync on move
      io.to(roomId).emit('time_sync', { p1Time: match.p1Time, p2Time: match.p2Time });
      socket.broadcast.emit('opponent_move', moveData);
    }
  });

  socket.on('leave_game', (roomId) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.status = 'AVAILABLE';
      broadcastOnlineUsers();
    }
    const match = matches.get(roomId);
    if (match) {
      clearInterval(match.timer);
      matches.delete(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    onlineUsers.delete(socket.id);
    
    // Cleanup pending challenges
    for (const [id, challenge] of challenges.entries()) {
      if (challenge.from === socket.id || challenge.to === socket.id) {
        challenges.delete(id);
      }
    }

    // Cleanup active matches
    for (const [roomId, match] of matches.entries()) {
      if (match.players.some(p => p.id === socket.id)) {
        clearInterval(match.timer);
        matches.delete(roomId);
        io.to(roomId).emit('player_disconnected');
      }
    }
    broadcastOnlineUsers();
  });

  function broadcastOnlineUsers() {
    const users = Array.from(onlineUsers.values());
    io.emit('online_users_update', users);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
