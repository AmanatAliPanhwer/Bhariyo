const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const supabase = require('./supabase');
const authMiddleware = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

// Elo Calculation Helper
function calculateElo(ratingA, ratingB, scoreA, kFactor = 32) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(ratingA + kFactor * (scoreA - expectedA));
}

async function updatePlayerStats(userId, isWin, isDraw, opponentElo) {
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!user || fetchError) return null;

  const score = isWin ? 1 : (isDraw ? 0.5 : 0);
  const newElo = calculateElo(user.elo, opponentElo, score);
  
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ 
      elo: newElo, 
      wins: user.wins + (isWin ? 1 : 0), 
      games_played: user.games_played + 1 
    })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) return null;
  
  return updatedUser;
}

// Auth Routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{ username, password: hashedPassword, elo: 1200 }])
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign({ id: data.id, username }, JWT_SECRET);
    res.json({ token, user: { id: data.id, username, elo: 1200, wins: 0, games_played: 0 } });
  } catch (err) {
    res.status(400).json({ message: 'Username already exists or registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  
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

app.get('/api/profile', authMiddleware, async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, wins, games_played, elo')
    .eq('id', req.user.id)
    .single();
    
  if (error || !user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(user);
});

// Secure endpoint to finalize game results
// This is called by the frontend when a game ends.
// In a production environment, you might add more verification logic here.
app.post('/api/game/end', authMiddleware, async (req, res) => {
  const { winnerId, loserId, isDraw, winnerElo, loserElo } = req.body;
  
  try {
    let result = {};
    if (isDraw) {
      const p1 = await updatePlayerStats(winnerId, false, true, loserElo);
      const p2 = await updatePlayerStats(loserId, false, true, winnerElo);
      result = { p1, p2 };
    } else {
      const winner = await updatePlayerStats(winnerId, true, false, loserElo);
      const loser = await updatePlayerStats(loserId, false, false, winnerElo);
      result = { winner, loser };
    }
    res.json({ message: 'Stats updated successfully', result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update stats', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Export for Vercel
