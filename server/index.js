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
  let newRating = Math.round(ratingA + kFactor * (scoreA - expectedA));
  return Math.min(3200, Math.max(0, newRating));
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
      .insert([{ username, password: hashedPassword, elo: 200 }])
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign({ id: data.id, username }, JWT_SECRET);
    res.json({ token, user: { id: data.id, username, elo: 200, wins: 0, games_played: 0 } });
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
let newGamesCount = 0;

// Internal Training Function
async function trainBots() {
  try {
    const { data: games } = await supabase.from('games').select('moves, is_draw, winner_id').limit(100);
    if (!games) return;

    let adjustments = { material: 0, mills: 0, mobility: 0 };
    games.forEach(game => {
      if (game.is_draw || !game.moves) return;
      const criticalMoves = game.moves.slice(-10);
      criticalMoves.forEach(move => {
        const multiplier = (move.player === 1 && game.winner_id) || (move.player === 2 && !game.winner_id) ? 1 : -1;
        adjustments.material += 0.05 * multiplier;
        adjustments.mills += 0.1 * multiplier;
        adjustments.mobility += 0.02 * multiplier;
      });
    });

    botWeights.material = Math.max(100, Math.min(400, botWeights.material + adjustments.material));
    botWeights.mills = Math.max(50, Math.min(250, botWeights.mills + adjustments.mills));
    botWeights.mobility = Math.max(5, Math.min(50, botWeights.mobility + adjustments.mobility));
    
    newGamesCount = 0; // Reset counter after training
    console.log('Bots auto-reinforced with new weights:', botWeights);
  } catch (err) {
    console.error('Auto-training failed:', err);
  }
}

const ADAPTIVE_BOTS = ['Amanat', 'Mazher', 'Hasnain', 'Umair'];

// Get personalized bot stats for a user
app.get('/api/bot/adaptive/:botName', authMiddleware, async (req, res) => {
  const { botName } = req.params;
  const userId = req.user.id;

  try {
    let { data: stats, error } = await supabase
      .from('adaptive_bot_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('bot_name', botName)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found, create default entry
      const { data: newStats, error: createError } = await supabase
        .from('adaptive_bot_stats')
        .insert([{ user_id: userId, bot_name: botName }])
        .select()
        .single();
      if (createError) throw createError;
      stats = newStats;
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch adaptive bot', error: err.message });
  }
});

// Internal function to perform RL on a specific adaptive bot
async function reinforceAdaptiveBot(userId, botName, wonAgainstPlayer, moves) {
  try {
    const { data: stats } = await supabase
      .from('adaptive_bot_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('bot_name', botName)
      .single();

    if (!stats) return;

    let weights = stats.weights;
    let rating = stats.rating;

    // 1. Update Rating (Bot Elo)
    const kFactor = 32;
    const expectedBot = 1 / (1 + Math.pow(10, (200 - rating) / 400)); // Simplified: assuming player is near base
    const score = wonAgainstPlayer ? 1 : 0;
    rating = Math.min(3200, Math.max(0, Math.round(rating + kFactor * (score - expectedBot))));

    // 2. Adjust Weights (Reinforcement Learning)
    // We look at the last moves to see what worked
    const criticalMoves = moves.slice(-10);
    const multiplier = wonAgainstPlayer ? 1 : -1;
    
    weights.material = Math.max(100, Math.min(400, weights.material + (0.5 * multiplier)));
    weights.mills = Math.max(50, Math.min(250, weights.mills + (1.0 * multiplier)));
    weights.mobility = Math.max(5, Math.min(50, weights.mobility + (0.2 * multiplier)));

    await supabase
      .from('adaptive_bot_stats')
      .update({ 
        weights, 
        rating, 
        games_played: stats.games_played + 1 
      })
      .eq('user_id', userId)
      .eq('bot_name', botName);

  } catch (err) {
    console.error('Adaptive RL failed:', err);
  }
}

app.post('/api/game/end', authMiddleware, async (req, res) => {
  const { winnerId, loserId, isDraw, winnerElo, loserElo, gameData } = req.body;
  
  try {
    // 1. Regular Elo Update logic
    const isValidWinner = winnerId && winnerId !== 'bot' && winnerId !== 'local' && typeof winnerId === 'number';
    const isValidLoser = loserId && loserId !== 'bot' && loserId !== 'local' && typeof loserId === 'number';
    const isMultiplayer = gameData?.mode === 'multiplayer';
    const isBotGame = gameData?.mode === 'bot';

    let result = {};
    if (isMultiplayer && isValidWinner && isValidLoser) {
        // ... (existing Elo logic)
        if (isDraw) {
          const p1 = await updatePlayerStats(winnerId, false, true, loserElo);
          const p2 = await updatePlayerStats(loserId, false, true, winnerElo);
          result = { p1, p2 };
        } else {
          const winner = await updatePlayerStats(winnerId, true, false, loserElo);
          const loser = await updatePlayerStats(loserId, false, false, winnerElo);
          result = { winner, loser };
        }
    }

    // 2. Save detailed game data
    if (gameData) {
      await supabase.from('games').insert([{
        winner_id: isDraw || !isValidWinner ? null : winnerId,
        loser_id: isDraw || !isValidLoser ? null : loserId,
        is_draw: isDraw,
        moves: gameData.moves,
        opponent_name: gameData.opponent,
        mode: gameData.mode,
        bot_level: gameData.botLevel,
        reason: gameData.reason,
        created_at: new Date().toISOString()
      }]);

      // 3. SPECIAL: Adaptive Bot Reinforcement
      if (isBotGame && ADAPTIVE_BOTS.includes(gameData.opponent)) {
        const botWon = winnerId === 'bot';
        await reinforceAdaptiveBot(req.user.id, gameData.opponent, botWon, gameData.moves);
      } else {
        // Regular bots auto-train trigger
        newGamesCount++;
        if (newGamesCount >= 50) trainBots();
      }
    }

    res.json({ message: 'Stats updated', result });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Default Weights for the AI (Base Knowledge)
let botWeights = {
  material: 200,
  mills: 100,
  potentialMills: 50,
  doublePotentialMills: 80,
  mobility: 10,
  blocked: 30
};

// Learning Algorithm: Analyzes past games to optimize weights
app.get('/api/bot/weights', (req, res) => {
  res.json(botWeights);
});

app.post('/api/bot/train', authMiddleware, async (req, res) => {
  try {
    const { data: games, error } = await supabase
      .from('games')
      .select('moves, is_draw, winner_id')
      .limit(100); // Analyze last 100 games

    if (error || !games) throw error;

    // Simple Reinforcement Learning: Correlation Analysis
    // We look at the final moves of winners and losers to see which features were high
    // This is a simplified Gradient Descent approach
    let adjustments = { material: 0, mills: 0, potentialMills: 0, doublePotentialMills: 0, mobility: 0, blocked: 0 };
    let gameCount = 0;

    games.forEach(game => {
      if (game.is_draw || !game.moves) return;
      gameCount++;
      
      // Analyze the last 5 moves (the most critical part of the game)
      const criticalMoves = game.moves.slice(-5);
      criticalMoves.forEach(move => {
        const isWinnerMove = (move.player === 1 && game.winner_id) || (move.player === 2 && !game.winner_id);
        const multiplier = isWinnerMove ? 1 : -1;

        // Note: In a real ML setup, we'd recalculate features here. 
        // For this implementation, we observe general trends in the game history.
        // We'll increment weights that are present in winning states.
        adjustments.material += 0.1 * multiplier;
        adjustments.mills += 0.2 * multiplier;
        adjustments.mobility += 0.05 * multiplier;
      });
    });

    // Update global weights based on findings
    if (gameCount > 0) {
      botWeights.material = Math.max(50, botWeights.material + adjustments.material);
      botWeights.mills = Math.max(20, botWeights.mills + adjustments.mills);
      botWeights.mobility = Math.max(2, botWeights.mobility + adjustments.mobility);
    }

    res.json({ message: 'Learning complete', newWeights: botWeights });
  } catch (error) {
    res.status(500).json({ message: 'Learning failed', error: error.message });
  }
});

// Reset personalized bot stats
app.post('/api/bot/adaptive/reset', authMiddleware, async (req, res) => {
  const { botName } = req.body;
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('adaptive_bot_stats')
      .update({ 
        rating: 200, 
        games_played: 0,
        weights: { material: 200, mills: 100, potentialMills: 50, doublePotentialMills: 80, mobility: 10, blocked: 30 }
      })
      .eq('user_id', userId)
      .eq('bot_name', botName)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Bot memory reset successfully', stats: data });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset bot', error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Export for Vercel
