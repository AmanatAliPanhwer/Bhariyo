import React from 'react';
import './Piece.css';

export default function Piece({ player, isActive, isMill }) {
  const playerClass = player === 1 ? 'piece-p1' : 'piece-p2';
  const activeClass = isActive ? 'piece-active' : '';
  const millClass = isMill ? 'piece-mill' : '';
  
  return (
    <div className={`piece ${playerClass} ${activeClass} ${millClass}`}>
      <div className="piece-inner"></div>
    </div>
  );
}
