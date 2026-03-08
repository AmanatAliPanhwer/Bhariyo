import React from 'react';
import './GameStatus.css';

const PlayerCard = ({ playerNum, isActive, unplaced, totalAlive, isPlacing }) => {
  const isP1 = playerNum === 1;
  const name = isP1 ? "White" : "Black";
  const rating = isP1 ? "1200" : "1500";
  
  return (
    <div className={`player-card ${isActive ? 'active' : ''} p${playerNum}`}>
      <div className="player-avatar">
        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <div className="player-info-wrapper">
        <div className="player-name">
          {name} <span className="player-rating">({rating})</span>
        </div>
        <div className="player-stats">
          <span className="stat-label">{isPlacing ? 'Unplaced Pieces:' : 'Pieces on Board:'}</span>
          <span className="stat-value">{isPlacing ? unplaced : totalAlive}</span>
        </div>
      </div>
      {isActive && <div className="turn-indicator">Your Turn</div>}
    </div>
  );
};

export default function GameStatus({ 
  currentPlayer, 
  turnState, 
  gamePhase, 
  unplacedPieces, 
  p1Count, 
  p2Count,
  winner
}) {

  let instruction = '';
  if (winner) {
    instruction = `Player ${winner} Wins!`;
  } else if (turnState === 'REMOVING_OPPONENT') {
    instruction = 'Mill formed! Select a highlighted red opponent\'s piece to remove (Pieces in a mill are safe!).';
  } else if (gamePhase === 'PLACING') {
    instruction = 'Place a piece on an empty intersection.';
  } else if (turnState === 'IDLE') {
    instruction = 'Select one of your pieces to move.';
  } else if (turnState === 'SELECTED_PIECE') {
    instruction = 'Select an empty connected spot or tap your piece again to deselect.';
  }

  return (
    <div className="status-panel">
      {/* Removed the 'Bhariyo' title from here to avoid duplication with navbar */}
      
      <div className="header-info">
        <div className="phase-badge">{gamePhase} PHASE</div>
        
        {winner ? (
          <div className="winner-banner pulse-anim">
            {instruction}
          </div>
        ) : (
          <div className="instruction-box">
             <span className="instruction-icon">ℹ️</span>
             {instruction}
          </div>
        )}
      </div>

      <div className="players-container">
        {/* Often Player 2 (Black) is shown at the top like chess */}
        <PlayerCard 
          playerNum={2} 
          isActive={currentPlayer === 2 && !winner} 
          unplaced={unplacedPieces[2]} 
          totalAlive={p2Count}
          isPlacing={gamePhase === 'PLACING'}
        />
        
        <div className="vs-divider">
           <div className="vs-line"></div>
           <span className="vs-text">VS</span>
           <div className="vs-line"></div>
        </div>

        <PlayerCard 
          playerNum={1} 
          isActive={currentPlayer === 1 && !winner} 
          unplaced={unplacedPieces[1]} 
          totalAlive={p1Count}
          isPlacing={gamePhase === 'PLACING'}
        />
      </div>
    </div>
  );
}
