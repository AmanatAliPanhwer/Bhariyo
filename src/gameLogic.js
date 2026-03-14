export const NODES = [
  // Outer Square (0-7)
  { id: 0, x: 5, y: 5 },
  { id: 1, x: 50, y: 5 },
  { id: 2, x: 95, y: 5 },
  { id: 3, x: 95, y: 50 },
  { id: 4, x: 95, y: 95 },
  { id: 5, x: 50, y: 95 },
  { id: 6, x: 5, y: 95 },
  { id: 7, x: 5, y: 50 },
  
  // Middle Square (8-15)
  { id: 8, x: 20, y: 20 },
  { id: 9, x: 50, y: 20 },
  { id: 10, x: 80, y: 20 },
  { id: 11, x: 80, y: 50 },
  { id: 12, x: 80, y: 80 },
  { id: 13, x: 50, y: 80 },
  { id: 14, x: 20, y: 80 },
  { id: 15, x: 20, y: 50 },
  
  // Inner Square (16-23)
  { id: 16, x: 35, y: 35 },
  { id: 17, x: 50, y: 35 },
  { id: 18, x: 65, y: 35 },
  { id: 19, x: 65, y: 50 },
  { id: 20, x: 65, y: 65 },
  { id: 21, x: 50, y: 65 },
  { id: 22, x: 35, y: 65 },
  { id: 23, x: 35, y: 50 },
];

export const ADJACENCY = {
  0: [1, 7], 1: [0, 2, 9], 2: [1, 3], 3: [2, 4, 11], 
  4: [3, 5], 5: [4, 6, 13], 6: [5, 7], 7: [0, 6, 15],
  
  8: [9, 15], 9: [8, 10, 1, 17], 10: [9, 11], 11: [10, 12, 3, 19],
  12: [11, 13], 13: [12, 14, 5, 21], 14: [13, 15], 15: [14, 8, 7, 23],
  
  16: [17, 23], 17: [16, 18, 9], 18: [17, 19], 19: [18, 20, 11],
  20: [19, 21], 21: [20, 22, 13], 22: [21, 23], 23: [22, 16, 15]
};

export const MILLS = [
  [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],   // Outer
  [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8], // Middle
  [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16], // Inner
  [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23] // Crosses
];

export const isMill = (board, player, nodeIds) => {
  return nodeIds.every(id => board[id] === player);
};

export const findNewMills = (board, player, newMoveId) => {
  const potentialMills = MILLS.filter(mill => mill.includes(newMoveId));
  return potentialMills.filter(mill => isMill(board, player, mill));
};

export const isPhase3 = (board, player) => {
  return board.filter(p => p === player).length === 3;
};

export const checkWinList = (board, currentPlayer) => {
  const opponent = currentPlayer === 1 ? 2 : 1;
  const opponentPieces = board.filter(p => p === opponent).length;
  if(opponentPieces <= 2) return true; // Opponent has less than 3 pieces remaining
  
  // Check if opponent has valid moves
  let hasValidMove = false;
  const hasEmptySpot = board.some(p => p === null);

  for(let i=0; i<24; i++) {
    if(board[i] === opponent) {
      if(opponentPieces === 3) {
        if (hasEmptySpot) {
            hasValidMove = true;
            break;
        }
      } else {
        const adjacent = ADJACENCY[i];
        for(let j=0; j<adjacent.length; j++) {
          if(board[adjacent[j]] === null) {
            hasValidMove = true;
            break;
          }
        }
      }
    }
    if(hasValidMove) break;
  }
  
  return !hasValidMove; // if opponent has no valid moves, current player wins
};

// Check if all opponent pieces are in a mill. If so, a player CAN remove a piece from a mill.
export const canRemoveAnyPiece = (board, opponent) => {
  const opponentPiecesInfo = board.map((p, index) => p === opponent ? index : -1).filter(idx => idx !== -1);
  const piecesInMills = new Set();
  
  MILLS.forEach(mill => {
    if(isMill(board, opponent, mill)) {
      mill.forEach(m => piecesInMills.add(m));
    }
  });
  
  // If all pieces are part of a mill, return true (can remove any). Otherwise false (can only remove non-mill pieces).
  return opponentPiecesInfo.length === piecesInMills.size;
}

// Zobrist Hashing for Transposition Table
let ZOBRIST_INITED = false;
const ZOBRIST_NODES = Array.from({ length: 24 }, () => [0, 0, 0]);
const ZOBRIST_TURN = Math.floor(Math.random() * 0xFFFFFFFF);

const initZobrist = () => {
  if (ZOBRIST_INITED) return;
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 3; j++) {
      ZOBRIST_NODES[i][j] = Math.floor(Math.random() * 0xFFFFFFFF);
    }
  }
  ZOBRIST_INITED = true;
};

const getBoardHash = (board, currentPlayer, unplaced, phase, currentRemoving) => {
  initZobrist();
  let hash = 0;
  for (let i = 0; i < 24; i++) {
    const val = board[i] === null ? 0 : board[i]; // 0: null, 1: p1, 2: p2
    hash ^= ZOBRIST_NODES[i][val];
  }
  if (currentPlayer === 2) hash ^= ZOBRIST_TURN;
  hash ^= (unplaced[1] * 10001);
  hash ^= (unplaced[2] * 1000001);
  if (phase === 'PLACING') hash ^= 0x55555555;
  if (currentRemoving) hash ^= 0xAAAAAAAA;
  return hash;
};

const TRANSPOSITION_TABLE = new Map();
const TT_SIZE_LIMIT = 200000;

const clearTT = () => {
  if (TRANSPOSITION_TABLE.size > TT_SIZE_LIMIT) TRANSPOSITION_TABLE.clear();
};

// Heuristic Evaluation Function for Nine Men's Morris
const evaluateBoard = (board, player, phase, learnedWeights = null) => {
  const opponent = player === 1 ? 2 : 1;
  const myPieces = board.filter(p => p === player).length;
  const oppPieces = board.filter(p => p === opponent).length;
  
  if (oppPieces <= 2 && phase === 'PLAYING') return 10000;
  if (myPieces <= 2 && phase === 'PLAYING') return -10000;

  // Use dynamic weights from the learning process, or defaults
  const w = learnedWeights || {
    material: 200,
    mills: 100,
    potentialMills: 50,
    doublePotentialMills: 80,
    mobility: 10,
    blocked: 30
  };

  // 1. Material advantage
  let score = (myPieces - oppPieces) * w.material;
  
  // 2. Mills
  const myMills = MILLS.filter(mill => isMill(board, player, mill)).length;
  const oppMills = MILLS.filter(mill => isMill(board, opponent, mill)).length;
  score += (myMills - oppMills) * w.mills;
  
  // 3. Potential Mills (2 pieces in line + empty spot)
  const getPotentialMills = (p) => {
    return MILLS.filter(mill => {
      const count = mill.filter(n => board[n] === p).length;
      const empty = mill.filter(n => board[n] === null).length;
      return count === 2 && empty === 1;
    }).length;
  };
  score += (getPotentialMills(player) - getPotentialMills(opponent)) * w.potentialMills;

  // 4. Double potential mills (a node that can complete two mills)
  const getDoublePotentialMills = (p) => {
    let count = 0;
    for (let i = 0; i < 24; i++) {
      if (board[i] === null) {
        const millsWithThisNode = MILLS.filter(mill => mill.includes(i));
        const potentialMillsWithThisNode = millsWithThisNode.filter(mill => 
          mill.filter(n => board[n] === p).length === 2
        );
        if (potentialMillsWithThisNode.length >= 2) count++;
      }
    }
    return count;
  };
  score += (getDoublePotentialMills(player) - getDoublePotentialMills(opponent)) * w.doublePotentialMills;
  
  // 5. Mobility (number of valid moves)
  const getMobility = (p) => {
    let moves = 0;
    const isFlying = board.filter(val => val === p).length === 3;
    board.forEach((val, i) => {
      if (val === p) {
        if (isFlying) {
            moves += board.filter(n => n === null).length;
        } else {
            ADJACENCY[i].forEach(neighbor => {
              if (board[neighbor] === null) moves++;
            });
        }
      }
    });
    return moves;
  };
  score += (getMobility(player) - getMobility(opponent)) * w.mobility;

  // 6. Blocked pieces
  const getBlockedCount = (p) => {
    let blocked = 0;
    board.forEach((val, i) => {
      if (val === p) {
        const canMove = ADJACENCY[i].some(n => board[n] === null);
        if (!canMove) blocked++;
      }
    });
    return blocked;
  };
  score -= (getBlockedCount(player) - getBlockedCount(opponent)) * w.blocked;
  
  return score;
};

// Quiescence search to handle "noisy" positions (like pending captures)
const quiescence = (board, alpha, beta, isMaximizing, player, phase, unplaced, currentRemoving, learnedWeights) => {
  const opponent = player === 1 ? 2 : 1;
  const activePlayer = isMaximizing ? player : opponent;
  const otherPlayer = isMaximizing ? opponent : player;

  if (!currentRemoving) {
    const standPat = evaluateBoard(board, player, phase, learnedWeights);
    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }
    // Only search further if we are in a removal state
    return standPat;
  }

  // Handle removals during quiescence
  const targets = [];
  const canRemoveAny = canRemoveAnyPiece(board, otherPlayer);
  board.forEach((p, i) => {
    if (p === otherPlayer) {
      if (canRemoveAny) targets.push(i);
      else {
        const inMill = MILLS.some(mill => mill.includes(i) && isMill(board, otherPlayer, mill));
        if (!inMill) targets.push(i);
      }
    }
  });

  if (targets.length === 0) return evaluateBoard(board, player, phase, learnedWeights);

  let bestEval = isMaximizing ? -Infinity : Infinity;
  for (const target of targets) {
    const nextBoard = [...board];
    nextBoard[target] = null;
    const evaluation = quiescence(nextBoard, alpha, beta, !isMaximizing, player, phase, unplaced, false, learnedWeights);
    
    if (isMaximizing) {
      bestEval = Math.max(bestEval, evaluation);
      alpha = Math.max(alpha, evaluation);
    } else {
      bestEval = Math.min(bestEval, evaluation);
      beta = Math.min(beta, evaluation);
    }
    if (beta <= alpha) break;
  }
  return bestEval;
};

// Minimax with Alpha-Beta Pruning, PVS, and Transposition Table
const minimax = (board, depth, alpha, beta, isMaximizing, player, phase, unplaced, currentRemoving = false, learnedWeights = null) => {
  const opponent = player === 1 ? 2 : 1;
  const activePlayer = isMaximizing ? player : opponent;
  const otherPlayer = isMaximizing ? opponent : player;

  // Terminal conditions
  if (checkWinList(board, otherPlayer)) return isMaximizing ? -10000 - depth : 10000 + depth;
  if (depth === 0) return quiescence(board, alpha, beta, isMaximizing, player, phase, unplaced, currentRemoving, learnedWeights);

  // TT Lookup
  const hash = getBoardHash(board, activePlayer, unplaced, phase, currentRemoving);
  const cached = TRANSPOSITION_TABLE.get(hash);
  if (cached && cached.depth >= depth) {
    if (cached.flag === 'EXACT') return cached.value;
    if (cached.flag === 'LOWER' && cached.value >= beta) return cached.value;
    if (cached.flag === 'UPPER' && cached.value <= alpha) return cached.value;
  }

  if (currentRemoving) {
    // Current player needs to remove an opponent's piece
    const targets = [];
    const canRemoveAny = canRemoveAnyPiece(board, otherPlayer);
    board.forEach((p, i) => {
      if (p === otherPlayer) {
        if (canRemoveAny) targets.push(i);
        else {
          const inMill = MILLS.some(mill => mill.includes(i) && isMill(board, otherPlayer, mill));
          if (!inMill) targets.push(i);
        }
      }
    });

    if (targets.length === 0) {
        return minimax(board, depth - 1, alpha, beta, !isMaximizing, player, phase, unplaced, false, learnedWeights);
    }

    let bestEval = isMaximizing ? -Infinity : Infinity;
    for (const target of targets) {
      const nextBoard = [...board];
      nextBoard[target] = null;
      const evaluation = minimax(nextBoard, depth - 1, alpha, beta, !isMaximizing, player, phase, unplaced, false, learnedWeights);
      
      if (isMaximizing) {
        bestEval = Math.max(bestEval, evaluation);
        alpha = Math.max(alpha, evaluation);
      } else {
        bestEval = Math.min(bestEval, evaluation);
        beta = Math.min(beta, evaluation);
      }
      if (beta <= alpha) break;
    }
    
    let flag = 'EXACT';
    if (bestEval <= alpha) flag = 'UPPER';
    else if (bestEval >= beta) flag = 'LOWER';
    TRANSPOSITION_TABLE.set(hash, { depth, value: bestEval, flag });
    
    return bestEval;
  }

  // Generate regular moves
  const moves = [];
  const currentUnplaced = unplaced[activePlayer];
  
  if (phase === 'PLACING' && currentUnplaced > 0) {
      board.forEach((p, i) => { if (p === null) moves.push(i); });
  } else {
      const isFlying = board.filter(p => p === activePlayer).length === 3;
      board.forEach((p, i) => {
          if (p === activePlayer) {
              if (isFlying) {
                  board.forEach((t, j) => { if (t === null) moves.push({from: i, to: j}); });
              } else {
                  ADJACENCY[i].forEach(n => { if (board[n] === null) moves.push({from: i, to: n}); });
              }
          }
      });
  }

  if (moves.length === 0) {
      return isMaximizing ? -10000 - depth : 10000 + depth;
  }

  // Move ordering: prioritize moves that create mills
  moves.sort((a, b) => {
      const targetA = typeof a === 'number' ? a : a.to;
      const targetB = typeof b === 'number' ? b : b.to;
      const millA = findNewMills(board, activePlayer, targetA).length;
      const millB = findNewMills(board, activePlayer, targetB).length;
      return millB - millA;
  });

  let bestEval = isMaximizing ? -Infinity : Infinity;
  let firstMove = true;

  for (const move of moves) {
    const nextBoard = [...board];
    const target = typeof move === 'number' ? move : move.to;
    const from = typeof move === 'number' ? null : move.from;
    if (from !== null) nextBoard[from] = null;
    nextBoard[target] = activePlayer;
    
    const nextUnplaced = { ...unplaced };
    if (phase === 'PLACING' && from === null) nextUnplaced[activePlayer]--;

    const newMills = findNewMills(nextBoard, activePlayer, target);
    let nextPhase = phase;
    if (nextPhase === 'PLACING' && nextUnplaced[1] === 0 && nextUnplaced[2] === 0) nextPhase = 'PLAYING';

    let evaluation;
    if (firstMove) {
        evaluation = minimax(nextBoard, depth - 1, alpha, beta, newMills.length === 0 ? !isMaximizing : isMaximizing, player, nextPhase, nextUnplaced, newMills.length > 0, learnedWeights);
        firstMove = false;
    } else {
        // PVS: Search with null window first
        evaluation = minimax(nextBoard, depth - 1, isMaximizing ? alpha : beta - 1, isMaximizing ? alpha + 1 : beta, newMills.length === 0 ? !isMaximizing : isMaximizing, player, nextPhase, nextUnplaced, newMills.length > 0, learnedWeights);
        if (isMaximizing ? (evaluation > alpha && evaluation < beta) : (evaluation < beta && evaluation > alpha)) {
            // Re-search if null window search failed
            evaluation = minimax(nextBoard, depth - 1, alpha, beta, newMills.length === 0 ? !isMaximizing : isMaximizing, player, nextPhase, nextUnplaced, newMills.length > 0, learnedWeights);
        }
    }
    
    if (isMaximizing) {
      bestEval = Math.max(bestEval, evaluation);
      alpha = Math.max(alpha, evaluation);
    } else {
      bestEval = Math.min(bestEval, evaluation);
      beta = Math.min(beta, evaluation);
    }
    if (beta <= alpha) break;
  }

  let flag = 'EXACT';
  if (bestEval <= alpha) flag = 'UPPER';
  else if (bestEval >= beta) flag = 'LOWER';
  TRANSPOSITION_TABLE.set(hash, { depth, value: bestEval, flag });

  return bestEval;
};

import { BhariyoGCN } from './GCN.js';
import { BhariyoONNXModel } from './ONNXModel.js';

// Global singleton for the neural networks
let GLOBAL_GCN = null;
let GLOBAL_ONNX = null;

const getGCN = () => {
  if (!GLOBAL_GCN) GLOBAL_GCN = new BhariyoGCN();
  return GLOBAL_GCN;
};

const getONNXModel = () => {
    if (!GLOBAL_ONNX) GLOBAL_ONNX = new BhariyoONNXModel();
    return GLOBAL_ONNX;
};

// State encoding for Neural Networks: [24, 3] tensor
const encodeStateForNN = (board) => {
  return board.map(p => {
    if (p === null) return [1, 0, 0]; // Empty
    if (p === 1) return [0, 1, 0];    // Player 1
    return [0, 0, 1];                 // Player 2
  });
};

// AI Logic
export const getBotMove = async (board, player, phase, turnState, unplacedPieces, level = 'BEGINNER', learnedWeights = null) => {
  const opponent = player === 1 ? 2 : 1;
  
  // Difficulty Settings
  const config = {
      'NOOB': { kRandom: 0.8, depth: 1, skillCap: 0.2 },
      'BEGINNER': { kRandom: 0.4, depth: 2, skillCap: 0.5 },
      'INTERMEDIATE': { useMCTS: true, numSearches: 100, kRandom: 0.1, fallbackDepth: 2 },
      'ADVANCED': { useMCTS: true, numSearches: 400, kRandom: 0.0, fallbackDepth: 4, useGCN: true },
      'EXPERT': { useMCTS: true, numSearches: 800, kRandom: 0.0, useONNX: true }
  };
  const currentConfig = config[level] || config.BEGINNER;

  if (currentConfig.useMCTS) {
    // Probability of making a random move even for MCTS bots (lower for higher levels)
    if (Math.random() < (currentConfig.kRandom || 0)) {
        const moves = getValidMovesInternal(board, player, phase, turnState, unplacedPieces);
        return moves[Math.floor(Math.random() * moves.length)];
    }

    // Dynamic Thinking: Determine if the position is "Critical"
    const evalScore = evaluateBoard(board, player, phase, learnedWeights);
    const opp = player === 1 ? 2 : 1;
    
    // Criticality Factors:
    // 1. Opponent has a potential mill (immediate threat)
    // 2. Evaluation is near zero (very balanced/tense game)
    // 3. One player is close to losing (3 pieces left)
    const getPotentialMills = (p) => MILLS.filter(mill => mill.filter(n => board[n] === p).length === 2 && mill.filter(n => board[n] === null).length === 1).length;
    const isCritical = getPotentialMills(opp) > 0 || Math.abs(evalScore) < 500 || board.filter(p => p === player).length <= 4 || board.filter(p => p === opp).length <= 4;
    
    let adjustedSearches = currentConfig.numSearches;
    if (isCritical) {
        // Double the "thinking" effort for critical moves
        adjustedSearches *= 2;
        console.log(`%c [BOT] Critical position detected. Intensifying search: ${adjustedSearches} iterations.`, 'color: #ff9900; font-weight: bold;');
    }

    const game = new BhariyoMCTSWrapper();
    const state = { board, player, phase, unplacedPieces, turnState };
    const mctsArgs = {
        num_searches: adjustedSearches,
        c_puct: 2.5, // High exploration for expert
        dirichlet_epsilon: level === 'EXPERT' ? 0.35 : (level === 'ADVANCED' ? 0.25 : 0.1),
        dirichlet_alpha: 0.5
    };
    
    // Neural Network or Heuristic model
    const gcnModel = getGCN();
    const onnxModel = getONNXModel();
    const useGCN = currentConfig.useGCN;
    const useONNX = currentConfig.useONNX;

    const modelProxy = async (s) => {
        const moves = getValidMovesInternal(s.board, s.player, s.phase, s.turnState, s.unplacedPieces);
        if (moves.length === 0) return { policy: [], value: 0 };

        if (useONNX || useGCN) {
            const encoded = encodeStateForNN(s.board);
            const { policy, value } = useONNX ? await onnxModel.predict(encoded) : await gcnModel.predict(encoded);
            
            // Map 624-sized policy back to current legal moves
            const movesWithScores = moves.map(move => {
                let actionIdx;
                if (typeof move === 'number') actionIdx = move; // Place/Remove
                else actionIdx = 24 + move.from * 24 + move.to; // Move
                
                return { action: move, prob: policy[actionIdx] || 0.001 };
            });
            return { policy: movesWithScores, value };
        } else {
            // Fallback to Heuristic
            const movesWithScores = moves.map(move => {
                const target = typeof move === 'number' ? move : move.to;
                const millCount = findNewMills(s.board, s.player, target).length;
                return { action: move, prob: 1 + millCount * 10 };
            });
            const totalProb = movesWithScores.reduce((sum, m) => sum + m.prob, 0);
            const policy = movesWithScores.map(m => ({ action: m.action, prob: m.prob / totalProb }));
            const evalScore = evaluateBoard(s.board, s.player, s.phase, learnedWeights);
            const value = Math.tanh(evalScore / 2000);
            return { policy, value };
        }
    };

    const mcts = new MCTS(game, mctsArgs, modelProxy);
    const actionVisits = await mcts.search(state);
    
    if (actionVisits.length === 0) return null;
    
    // Calculate Win Probability based on root value
    const rootValue = mcts.rootValue;
    const winProb = (rootValue + 1) / 2;

    // Resignation Logic: If win probability is extremely low for several turns
    if (winProb < 0.05 && board.filter(p => p !== null).length > 12) {
        return { type: 'RESIGN' };
    }

    // Draw Offer Logic: If position is very balanced and it's a long game
    if (Math.abs(rootValue) < 0.1 && board.filter(p => p !== null).length > 15 && Math.random() < 0.05) {
        return { type: 'OFFER_DRAW' };
    }

    // Select action with most visits
    actionVisits.sort((a, b) => b.visits - a.visits);
    return actionVisits[0].action;
  }

  const { kRandom, depth: maxDepth, skillCap } = currentConfig;
  clearTT();

  // Apply Skill Cap: Dumbing down the learned weights for lower bots
  let restrictedWeights = null;
  if (learnedWeights) {
      const defaultWeights = { material: 200, mills: 100, potentialMills: 50, doublePotentialMills: 80, mobility: 10, blocked: 30 };
      restrictedWeights = {};
      Object.keys(learnedWeights).forEach(key => {
          restrictedWeights[key] = (learnedWeights[key] * skillCap) + (defaultWeights[key] * (1 - skillCap));
      });
  }

  const isRemoving = turnState === 'REMOVING_OPPONENT';
  const getTargets = () => {
    const targets = [];
    const canRemoveAny = canRemoveAnyPiece(board, opponent);
    board.forEach((p, i) => {
      if (p === opponent) {
        if (canRemoveAny) targets.push(i);
        else {
          const inMill = MILLS.some(mill => mill.includes(i) && isMill(board, opponent, mill));
          if (!inMill) targets.push(i);
        }
      }
    });
    return targets;
  };

  const getValidMoves = () => {
    if (phase === 'PLACING') {
      return board.map((p, i) => p === null ? i : -1).filter(i => i !== -1);
    } else {
      const moves = [];
      const isFlying = board.filter(p => p === player).length === 3;
      board.forEach((p, i) => {
        if (p === player) {
          if (isFlying) {
            board.forEach((target, j) => {
              if (target === null) moves.push({ from: i, to: j });
            });
          } else {
            ADJACENCY[i].forEach(neighbor => {
              if (board[neighbor] === null) moves.push({ from: i, to: neighbor });
            });
          }
        }
      });
      return moves;
    }
  };

  const validOptions = isRemoving ? getTargets() : getValidMoves();
  if (validOptions.length === 0) return null;

  // Move ordering for root
  validOptions.sort((a, b) => {
      const targetA = typeof a === 'number' ? a : a.to;
      const targetB = typeof b === 'number' ? b : b.to;
      const millA = isRemoving ? 0 : findNewMills(board, player, targetA).length;
      const millB = isRemoving ? 0 : findNewMills(board, player, targetB).length;
      return millB - millA;
  });

  if (Math.random() < kRandom) return validOptions[Math.floor(Math.random() * validOptions.length)];

  let bestMoveGlobal = validOptions[0];
  const startTime = Date.now();
  const TIME_LIMIT = 2000; // 2 seconds
  
  // Iterative Deepening
  for (let d = 1; d <= maxDepth; d++) {
    let bestEval = -Infinity;
    let bestMoveAtDepth = validOptions[0];
    let completedDepth = true;

    for (const move of validOptions) {
      if (Date.now() - startTime > TIME_LIMIT) {
          completedDepth = false;
          break;
      }
      const tempBoard = [...board];
      let evaluation;

      if (isRemoving) {
        tempBoard[move] = null;
        evaluation = minimax(tempBoard, d - 1, -Infinity, Infinity, false, player, phase, unplacedPieces, false, restrictedWeights);
      } else {
        const target = typeof move === 'number' ? move : move.to;
        const from = typeof move === 'number' ? null : move.from;
        if (from !== null) tempBoard[from] = null;
        tempBoard[target] = player;
        
        const nextUnplaced = { ...unplacedPieces };
        if (phase === 'PLACING' && from === null) nextUnplaced[player]--;

        const newMills = findNewMills(tempBoard, player, target);
        let nextPhase = phase;
        if (nextPhase === 'PLACING' && nextUnplaced[1] === 0 && nextUnplaced[2] === 0) nextPhase = 'PLAYING';

        evaluation = minimax(tempBoard, d - 1, -Infinity, Infinity, newMills.length === 0, player, nextPhase, nextUnplaced, newMills.length > 0, restrictedWeights);
      }

      if (evaluation > bestEval) {
        bestEval = evaluation;
        bestMoveAtDepth = move;
      }
    }
    
    if (completedDepth) {
        bestMoveGlobal = bestMoveAtDepth;
        
        // Sort validOptions based on bestMoveAtDepth for next iteration's move ordering
        const bestIdx = validOptions.indexOf(bestMoveAtDepth);
        if (bestIdx > 0) {
            validOptions.splice(bestIdx, 1);
            validOptions.unshift(bestMoveAtDepth);
        }
    } else {
        break; // Stop if time limit reached
    }
  }

  return bestMoveGlobal;
};

// MCTS Implementation
export const shouldBotAcceptDraw = async (board, player, phase, turnState, unplacedPieces, level = 'BEGINNER', learnedWeights = null) => {
  const score = evaluateBoard(board, player, phase, learnedWeights);
  
  // Higher level bots are more "stubborn" and only accept draws if the position is truly deadlocked
  const config = {
      'NOOB': { threshold: 600 },
      'BEGINNER': { threshold: 400 },
      'INTERMEDIATE': { threshold: 200 },
      'ADVANCED': { threshold: 100 }
  };
  const { threshold } = config[level] || config.BEGINNER;

  // If evaluation is close to 0, bot accepts. 
  // If bot is significantly winning (score > threshold), it declines.
  // if bot is significantly losing (score < -threshold), it might actually accept a draw as a "save"!
  
  if (score > threshold) return false; // Bot is winning, won't accept
  return true; // Position is balanced or bot is losing (so it accepts draw to avoid loss)
};

class MCTSNode {
  constructor(game, args, state, parent = null, actionTaken = null, prior = 0) {
    this.game = game;
    this.args = args;
    this.state = state;
    this.parent = parent;
    this.actionTaken = actionTaken;
    this.prior = prior;
    this.children = [];
    this.visitCount = 0;
    this.valueSum = 0;
  }

  isFullyExpanded() {
    return this.children.length > 0;
  }

  select() {
    let bestChild = null;
    let bestUCB = -Infinity;

    for (const child of this.children) {
      const ucb = this.getUCB(child);
      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestChild = child;
      }
    }
    return bestChild;
  }

  getUCB(child) {
    const qValue = child.visitCount === 0 ? 0 : (child.valueSum / child.visitCount);
    // UCB formula: Q + C * P * sqrt(parent_N) / (1 + child_N)
    return qValue + this.args.c_puct * child.prior * Math.sqrt(this.visitCount) / (1 + child.visitCount);
  }

  async expand(policy) {
    // policy is an array of { action, prob }
    for (const { action, prob } of policy) {
      const nextState = await this.game.getNextState(this.state, action);
      this.children.push(new MCTSNode(this.game, this.args, nextState, this, action, prob));
    }
  }
}

class MCTS {
  constructor(game, args, model) {
    this.game = game;
    this.args = args;
    this.model = model;
  }

  async search(state) {
    const root = new MCTSNode(this.game, this.args, state);

    // Initial expansion
    let { policy } = await this.model(state);
    
    // Add Dirichlet noise to root
    if (this.args.dirichlet_epsilon > 0 && policy.length > 0) {
      const noise = this.getDirichletNoise(policy.length, this.args.dirichlet_alpha);
      policy = policy.map((p, i) => ({
        action: p.action,
        prob: (1 - this.args.dirichlet_epsilon) * p.prob + this.args.dirichlet_epsilon * noise[i]
      }));
    }

    await root.expand(policy);

    for (let i = 0; i < this.args.num_searches; i++) {
      let node = root;
      while (node.isFullyExpanded()) {
        const nextNode = node.select();
        if (!nextNode) break;
        node = nextNode;
      }

      let { value, isTerminal } = this.game.getValueAndTerminated(node.state, node.actionTaken);
      value = this.game.getOpponentValue(value);

      if (!isTerminal) {
        const res = await this.model(node.state);
        await node.expand(res.policy);
        value = res.value;
      }

      this.backpropagate(node, value);
    }

    // Store root value for evaluation
    this.rootValue = root.visitCount > 0 ? (root.valueSum / root.visitCount) : 0;

    return root.children.map(child => ({
      action: child.actionTaken,
      visits: child.visitCount
    }));
  }

  backpropagate(node, value) {
    node.valueSum += value;
    node.visitCount += 1;
    value = this.game.getOpponentValue(value);
    if (node.parent) {
      this.backpropagate(node.parent, value);
    }
  }

  getDirichletNoise(size, alpha) {
    const alphas = Array(size).fill(alpha);
    let samples = alphas.map(a => this.gammaSample(a, 1));
    const sum = samples.reduce((a, b) => a + b, 0);
    return samples.map(s => s / (sum || 1));
  }

  gammaSample(alpha, beta) {
    if (alpha < 1) return this.gammaSample(alpha + 1, beta) * Math.pow(Math.random(), 1 / alpha);
    const d = alpha - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v, u = Math.random();
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      if (u < 1 - 0.0331 * x * x * x * x) return d * v / beta;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v / beta;
    }
  }

  normalRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}

class BhariyoMCTSWrapper {
  getNextState(state, action) {
    return getNextStateInternal(state, action);
  }

  getValueAndTerminated(state, action) {
    const isWin = checkWinList(state.board, state.player === 1 ? 2 : 1);
    if (isWin) return { value: 1, isTerminal: true };
    
    const hasMoves = getValidMovesInternal(state.board, state.player, state.phase, state.turnState, state.unplacedPieces).length > 0;
    if (!hasMoves) return { value: -1, isTerminal: true };
    
    return { value: 0, isTerminal: false };
  }

  getOpponentValue(value) {
    return -value;
  }
}

const getValidMovesInternal = (board, player, phase, turnState, unplacedPieces) => {
  const isRemoving = turnState === 'REMOVING_OPPONENT';
  const opponent = player === 1 ? 2 : 1;
  
  if (isRemoving) {
    const targets = [];
    const canRemoveAny = canRemoveAnyPiece(board, opponent);
    board.forEach((p, i) => {
      if (p === opponent) {
        if (canRemoveAny) targets.push(i);
        else {
          const inMill = MILLS.some(mill => mill.includes(i) && isMill(board, opponent, mill));
          if (!inMill) targets.push(i);
        }
      }
    });
    return targets;
  }

  if (phase === 'PLACING' && unplacedPieces[player] > 0) {
    return board.map((p, i) => p === null ? i : -1).filter(i => i !== -1);
  } else {
    const moves = [];
    const isFlying = board.filter(p => p === player).length === 3;
    board.forEach((p, i) => {
      if (p === player) {
        if (isFlying) {
          board.forEach((target, j) => {
            if (target === null) moves.push({ from: i, to: j });
          });
        } else {
          ADJACENCY[i].forEach(neighbor => {
            if (board[neighbor] === null) moves.push({ from: i, to: neighbor });
          });
        }
      }
    });
    return moves;
  }
};

const getNextStateInternal = (state, move) => {
  const { board, player, phase, unplacedPieces, turnState } = state;
  const nextBoard = [...board];
  const opponent = player === 1 ? 2 : 1;
  let nextPhase = phase;
  let nextUnplaced = { ...unplacedPieces };
  let nextTurnState = turnState;
  let nextPlayer = player;

  if (turnState === 'REMOVING_OPPONENT') {
    nextBoard[move] = null;
    nextTurnState = nextPhase === 'PLACING' ? 'PLACING' : 'MOVING';
    nextPlayer = opponent;
    if (nextPhase === 'PLACING' && nextUnplaced[1] === 0 && nextUnplaced[2] === 0) nextPhase = 'PLAYING';
    if (nextPhase === 'PLAYING') nextTurnState = 'MOVING';
  } else {
    const target = typeof move === 'number' ? move : move.to;
    const from = typeof move === 'number' ? null : move.from;
    if (from !== null) nextBoard[from] = null;
    nextBoard[target] = player;
    
    if (phase === 'PLACING' && from === null) nextUnplaced[player]--;

    const newMills = findNewMills(nextBoard, player, target);
    if (newMills.length > 0) {
      nextTurnState = 'REMOVING_OPPONENT';
    } else {
      nextPlayer = opponent;
      if (nextPhase === 'PLACING' && nextUnplaced[1] === 0 && nextUnplaced[2] === 0) nextPhase = 'PLAYING';
      nextTurnState = nextPhase === 'PLACING' ? 'PLACING' : 'MOVING';
    }
  }

  return { 
    board: nextBoard, 
    player: nextPlayer, 
    phase: nextPhase, 
    unplacedPieces: nextUnplaced, 
    turnState: nextTurnState 
  };
};


