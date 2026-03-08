import React from 'react';
import { NODES } from '../../gameLogic';
import './MiniBoard.css';

export default function MiniBoard({ board }) {
  return (
    <div className="mini-board-container">
      <svg className="mini-board-lines" width="100%" height="100%" viewBox="0 0 100 100">
        <rect x="5" y="5" width="90" height="90" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="1" />
        <rect x="20" y="20" width="60" height="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="1" />
        <rect x="35" y="35" width="30" height="30" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="1" />
        
        <line x1="50" y1="5" x2="50" y2="35" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1="50" y1="65" x2="50" y2="95" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1="5" y1="50" x2="35" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1="65" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
      
      {NODES.map((node) => {
        const player = board[node.id];
        if (player === null) return null;
        
        return (
          <div
            key={node.id}
            className={`mini-node p${player}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          />
        );
      })}
    </div>
  );
}
