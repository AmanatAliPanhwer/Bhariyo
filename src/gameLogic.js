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
  for(let i=0; i<24; i++) {
    if(board[i] === opponent) {
      if(opponentPieces === 3) return false; // Flying phase always has valid moves if board has empty spots
      const adjacent = ADJACENCY[i];
      for(let j=0; j<adjacent.length; j++) {
        if(board[adjacent[j]] === null) {
          hasValidMove = true;
          break;
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
