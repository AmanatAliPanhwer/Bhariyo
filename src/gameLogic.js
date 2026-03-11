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

// AI Logic
export const getBotMove = (board, player, phase, turnState, unplacedPieces, level = 'BEGINNER', learnedWeights = null) => {
  const opponent = player === 1 ? 2 : 1;
  
  // Difficulty Settings
  const config = {
      'NOOB': { kRandom: 0.8, depth: 1, skillCap: 0.2 },
      'BEGINNER': { kRandom: 0.4, depth: 2, skillCap: 0.5 },
      'INTERMEDIATE': { kRandom: 0.1, depth: 3, skillCap: 0.8 },
      'ADVANCED': { kRandom: 0.0, depth: 5, skillCap: 1.0 }
  };
  const { kRandom, depth: maxDepth, skillCap } = config[level] || config.BEGINNER;

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


