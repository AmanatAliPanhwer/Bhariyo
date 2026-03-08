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
    games_played INTEGER DEFAULT 0,
    elo INTEGER DEFAULT 1200
  )
`);

// Migrations for existing databases
const migrations = [
  'ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN games_played INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN elo INTEGER DEFAULT 1200'
];

migrations.forEach(m => {
  try {
    db.exec(m);
  } catch (e) {
    // Column already exists or other error
  }
});

// Elo Calculation Helper
function calculateElo(ratingA, ratingB, scoreA, kFactor = 32) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(ratingA + kFactor * (scoreA - expectedA));
}

function updatePlayerStats(userId, isWin, isDraw, opponentElo) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  const score = isWin ? 1 : (isDraw ? 0.5 : 0);
  const newElo = calculateElo(user.elo, opponentElo, score);
  
  const stmt = db.prepare(`
    UPDATE users 
    SET elo = ?, 
        wins = wins + ?, 
        games_played = games_played + 1 
    WHERE id = ?
  `);
  stmt.run(newElo, isWin ? 1 : 0, userId);
  
  return { ...user, elo: newElo, wins: user.wins + (isWin ? 1 : 0), games_played: user.games_played + 1 };
}

// Auth Routes
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    const stmt = db.prepare('INSERT INTO users (username, password, elo) VALUES (?, ?, 1200)');
    const result = stmt.run(username, hashedPassword);
    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET);
    res.json({ token, user: { id: result.lastInsertRowid, username, elo: 1200, wins: 0, games_played: 0 } });
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
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        wins: user.wins, 
        games_played: user.games_played,
        elo: user.elo 
      } 
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/profile', authMiddleware, (req, res) => {
  const stmt = db.prepare('SELECT id, username, wins, games_played, elo FROM users WHERE id = ?');
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
      elo: userData.elo || 1200,
      status: 'AVAILABLE' 
    });
    broadcastOnlineUsers();
  });

  const endGame = (roomId, winnerUsername, reason, isDraw = false) => {
    const match = matches.get(roomId);
    if (!match) return;

    clearInterval(match.timer);

    if (!isDraw) {
      const winnerPlayer = match.players.find(p => p.username === winnerUsername);
      const loserPlayer = match.players.find(p => p.username !== winnerUsername);

      if (winnerPlayer && loserPlayer) {
        const winnerData = onlineUsers.get(winnerPlayer.id);
        const loserData = onlineUsers.get(loserPlayer.id);

        if (winnerData && loserData) {
          const updatedWinner = updatePlayerStats(winnerData.id, true, false, loserData.elo);
          const updatedLoser = updatePlayerStats(loserData.id, false, false, winnerData.elo);

          // Update onlineUsers cache
          winnerData.elo = updatedWinner.elo;
          loserData.elo = updatedLoser.elo;

          io.to(winnerPlayer.id).emit('stats_update', updatedWinner);
          io.to(loserPlayer.id).emit('stats_update', updatedLoser);
        }
      }
    } else {
      // Draw logic
      const p1 = match.players[0];
      const p2 = match.players[1];
      const p1Data = onlineUsers.get(p1.id);
      const p2Data = onlineUsers.get(p2.id);

      if (p1Data && p2Data) {
        const updatedP1 = updatePlayerStats(p1Data.id, false, true, p2Data.elo);
        const updatedP2 = updatePlayerStats(p2Data.id, false, true, p1Data.elo);

        p1Data.elo = updatedP1.elo;
        p2Data.elo = updatedP2.elo;

        io.to(p1.id).emit('stats_update', updatedP1);
        io.to(p2.id).emit('stats_update', updatedP2);
      }
    }

    io.to(roomId).emit('game_over', { winner: winnerUsername, reason, isDraw });
    
    match.players.forEach(p => {
      const u = onlineUsers.get(p.id);
      if (u) u.status = 'AVAILABLE';
    });

    matches.delete(roomId);
    broadcastOnlineUsers();
  };

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
            { id: challenge.from, username: p1.username, side: 1, elo: p1.elo },
            { id: challenge.to, username: p2.username, side: 2, elo: p2.elo }
          ]
        };

        matches.set(roomId, matchData);
        
        // Both players join the room
        const p1Socket = io.sockets.sockets.get(challenge.from);
        const p2Socket = io.sockets.sockets.get(challenge.to);
        if (p1Socket) p1Socket.join(roomId);
        if (p2Socket) p2Socket.join(roomId);

        io.to(roomId).emit('game_start', matchData);
        
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
            const winnerSide = m.p1Time <= 0 ? 2 : 1;
            const winner = m.players.find(p => p.side === winnerSide).username;
            endGame(roomId, winner, 'Time Out');
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
      socket.broadcast.to(roomId).emit('opponent_move', moveData);
      
      if (moveData.isWin) {
        endGame(roomId, moveData.isWin, 'Defeat');
      }
    }
  });

  socket.on('resign', (roomId) => {
    const match = matches.get(roomId);
    if (match) {
      const loser = onlineUsers.get(socket.id);
      const winner = match.players.find(p => p.id !== socket.id);
      if (loser && winner) {
        endGame(roomId, winner.username, 'Resignation');
      }
    }
  });

  socket.on('offer_draw', (roomId) => {
    socket.broadcast.to(roomId).emit('draw_offered');
  });

  socket.on('accept_draw', (roomId) => {
    endGame(roomId, null, 'Mutual Agreement', true);
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
