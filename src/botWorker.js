import { getBotMove } from './gameLogic';

self.onmessage = async (e) => {
  const { board, player, phase, turnState, unplacedPieces, level, learnedWeights } = e.data;
  
  try {
    const move = await getBotMove(board, player, phase, turnState, unplacedPieces, level, learnedWeights);
    self.postMessage({ move });
  } catch (error) {
    console.error('Bot Worker Error:', error);
    self.postMessage({ error: error.message });
  }
};
