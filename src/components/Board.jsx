import React from 'react';
import { NODES } from '../gameLogic';
import Piece from './Piece';
import './Board.css';

export default function Board({ board, onNodeClick, activeNode, highlightNodes, activeMills = [], removableNodes = [] }) {
  const isMillActive = activeMills.length > 0;
  // Flatten active mills list to check if a specific node is part of an active mill
  const activeMillNodes = activeMills.flat();

  return (
    <div className={`board-outer-container ${isMillActive ? 'board-mill-active' : ''}`}>
      <div className="board-container">
        <svg className="board-lines" width="100%" height="100%" viewBox="0 0 100 100">
          {/* Thick board lines to look like etched physical board */}
          <rect x="5" y="5" width="90" height="90" fill="none" stroke="var(--board-line)" strokeWidth="1.5" rx="1" />
          <rect x="20" y="20" width="60" height="60" fill="none" stroke="var(--board-line)" strokeWidth="1.5" rx="1" />
          <rect x="35" y="35" width="30" height="30" fill="none" stroke="var(--board-line)" strokeWidth="1.5" rx="1" />
          
          <line x1="50" y1="5" x2="50" y2="35" stroke="var(--board-line)" strokeWidth="1.5" />
          <line x1="50" y1="65" x2="50" y2="95" stroke="var(--board-line)" strokeWidth="1.5" />
          <line x1="5" y1="50" x2="35" y2="50" stroke="var(--board-line)" strokeWidth="1.5" />
          <line x1="65" y1="50" x2="95" y2="50" stroke="var(--board-line)" strokeWidth="1.5" />

          {/* Draw glowing yellow line that connects the active mill pieces */}
          {activeMills.map((mill, idx) => {
            const n1 = NODES[mill[0]];
            const n2 = NODES[mill[1]];
            const n3 = NODES[mill[2]];
            return (
              <polyline
                key={`mill-line-${idx}`}
                points={`${n1.x},${n1.y} ${n2.x},${n2.y} ${n3.x},${n3.y}`}
                fill="none"
                stroke="var(--brand-yellow)"
                strokeWidth="2.5"
                className="mill-glow-line"
              />
            );
          })}
        </svg>
        
        {/* Nodes */}
        {NODES.map((node) => {
          const player = board[node.id];
          const isOccupied = player !== null;
          const isActive = activeNode === node.id;
          const isHighlighted = highlightNodes.includes(node.id);
          const isMill = activeMillNodes.includes(node.id);
          const isRemovable = removableNodes.includes(node.id);
          
          return (
            <div
              key={node.id}
              className={`board-node ${isHighlighted ? 'valid-move-indicator' : ''} ${!isOccupied ? 'empty-node' : 'occupied-node'} ${isRemovable ? 'removal-target' : ''}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => onNodeClick(node.id)}
            >
              {isOccupied ? <Piece player={player} isActive={isActive} isMill={isMill} /> : null}
              {/* If highlighted and empty, show a distinct dot to indicate a valid move spot */}
              {isHighlighted && !isOccupied && <div className="move-target-dot"></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
