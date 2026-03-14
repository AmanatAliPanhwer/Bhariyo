import { ADJACENCY, MILLS, findNewMills, getBotMove } from './gameLogic.js';

/**
 * Generates an automatic puzzle.
 * @returns {Object} puzzle - The generated puzzle object.
 */
export const generatePuzzle = () => {
  const type = Math.random() > 0.5 ? 'PLACEMENT' : 'MOVEMENT';
  if (type === 'PLACEMENT') return generatePlacementPuzzle();
  return generateMovementPuzzle();
};

/**
 * Generates a placement puzzle where the player can form a mill in one move.
 */
const generatePlacementPuzzle = () => {
  const board = Array(24).fill(null);
  
  // Choose a random mill to set up
  const randomMill = MILLS[Math.floor(Math.random() * MILLS.length)];
  const solutionIndex = Math.floor(Math.random() * 3);
  const targetNode = randomMill[solutionIndex];
  const existingNodes = randomMill.filter((_, idx) => idx !== solutionIndex);
  
  // Set up the board for player 1 (Human)
  existingNodes.forEach(nodeId => {
    board[nodeId] = 1;
  });
  
  // Add some random noise pieces for both players to make it look "natural"
  let piecesAdded = 0;
  while (piecesAdded < 4) {
    const randomPos = Math.floor(Math.random() * 24);
    if (board[randomPos] === null && !randomMill.includes(randomPos)) {
      board[randomPos] = piecesAdded % 2 === 0 ? 1 : 2;
      piecesAdded++;
    }
  }

  return {
    id: `auto-placement-${Date.now()}`,
    type: 'PLACEMENT',
    title: 'Automatic Placement Puzzle',
    difficulty: 'Intermediate',
    board: board,
    instruction: 'Place a piece to form a mill!',
    playerSide: 1,
    expected: {
      type: 'PLACE',
      nodeId: targetNode
    }
  };
};

/**
 * Generates a movement puzzle where the player can form a mill by moving a piece.
 */
const generateMovementPuzzle = () => {
  const board = Array(24).fill(null);
  
  // Choose a random mill as the target
  const randomMill = MILLS[Math.floor(Math.random() * MILLS.length)];
  const targetNode = randomMill[Math.floor(Math.random() * 3)];
  const existingInMill = randomMill.filter(n => n !== targetNode);
  
  // Set the mill pieces (player 1)
  existingInMill.forEach(n => board[n] = 1);
  
  // Find an adjacent node to the targetNode for the piece to move from
  const adjNodes = ADJACENCY[targetNode];
  let startNode = null;
  for (let adj of adjNodes) {
    if (board[adj] === null && !randomMill.includes(adj)) {
      startNode = adj;
      break;
    }
  }
  
  // If no adjacent empty node, just pick any empty node (fallback for sanity)
  if (startNode === null) {
    for (let i = 0; i < 24; i++) {
        if (board[i] === null && !randomMill.includes(i)) {
            startNode = i;
            break;
        }
    }
  }
  
  board[startNode] = 1;

  // Add noise
  let piecesAdded = 0;
  while (piecesAdded < 6) {
    const randomPos = Math.floor(Math.random() * 24);
    if (board[randomPos] === null && !randomMill.includes(randomPos) && randomPos !== startNode) {
      board[randomPos] = piecesAdded % 2 === 0 ? 1 : 2;
      piecesAdded++;
    }
  }

  return {
    id: `auto-movement-${Date.now()}`,
    type: 'MOVEMENT',
    title: 'Automatic Movement Puzzle',
    difficulty: 'Intermediate',
    board: board,
    instruction: 'Move a piece to form a mill!',
    playerSide: 1,
    expected: {
      type: 'MOVE',
      fromId: startNode,
      toId: targetNode
    }
  };
};

/**
 * Uses the AI to find a hint for matches.
 */
export const getHintFromAI = async (board, player, phase, turnState, unplacedPieces) => {
    // We use getBotMove at EXPERT level to find the best possible move
    return await getBotMove(board, player, phase, turnState, unplacedPieces, 'EXPERT');
};
