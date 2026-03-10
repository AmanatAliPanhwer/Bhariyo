import React, { useState, useRef, useEffect } from 'react';
import { NODES, ADJACENCY } from '../gameLogic';
import Piece from './Piece';
import './Board.css';

export default function Board({ board, onNodeClick, activeNode, highlightNodes = [], activeMills = [], removableNodes = [] }) {
  const [arrows, setArrows] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrentNode, setDragCurrentNode] = useState(null);
  const containerRef = useRef(null);

  const isMillActive = activeMills.length > 0;
  // Flatten active mills list to check if a specific node is part of an active mill
  const activeMillNodes = activeMills.flat();

  const getMousePos = (e) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const getNearestNodeId = (pos) => {
    let minDistance = 12; // Snap distance
    let nearestId = null;
    NODES.forEach(node => {
      const dist = Math.sqrt(Math.pow(node.x - pos.x, 2) + Math.pow(node.y - pos.y, 2));
      if (dist < minDistance) {
        minDistance = dist;
        nearestId = node.id;
      }
    });
    return nearestId;
  };

  // BFS to find the shortest path along the board lines
  const findPath = (startId, endId) => {
    if (startId === null || endId === null) return [];
    if (startId === endId) return [startId];
    
    const queue = [[startId]];
    const visited = new Set([startId]);
    
    while (queue.length > 0) {
      const path = queue.shift();
      const node = path[path.length - 1];
      
      const neighbors = ADJACENCY[node] || [];
      for (const neighbor of neighbors) {
        if (neighbor === endId) return [...path, neighbor];
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return [startId, endId]; // Fallback if no path (shouldn't happen on this board)
  };

  const handleMouseDown = (e) => {
    if (e.button === 2) { // Right click
      const pos = getMousePos(e);
      const nodeId = getNearestNodeId(pos);
      if (nodeId !== null) {
        setDragStart(nodeId);
        setDragCurrentNode(nodeId);
      }
    } else if (e.button === 0) { // Left click
      setArrows([]);
    }
  };

  const handleMouseMove = (e) => {
    if (dragStart !== null) {
      const pos = getMousePos(e);
      const nodeId = getNearestNodeId(pos);
      if (nodeId !== null) {
        setDragCurrentNode(nodeId);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (dragStart !== null && e.button === 2) {
      const pos = getMousePos(e);
      const endNodeId = getNearestNodeId(pos);
      
      if (endNodeId !== null && endNodeId !== dragStart) {
        setArrows(prev => {
          const exists = prev.find(a => a.from === dragStart && a.to === endNodeId);
          if (exists) {
            return prev.filter(a => !(a.from === dragStart && a.to === endNodeId));
          }
          return [...prev, { from: dragStart, to: endNodeId }];
        });
      }
      setDragStart(null);
      setDragCurrentNode(null);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  const renderPath = (fromId, toId, opacity = 0.6) => {
    const path = findPath(fromId, toId);
    if (path.length < 2) return null;

    const points = path.map(id => `${NODES[id].x},${NODES[id].y}`).join(' ');
    
    return (
      <polyline
        points={points}
        fill="none"
        stroke={`rgba(255, 170, 0, ${opacity})`}
        strokeWidth="1.2"
        markerEnd="url(#arrowhead)"
        pointerEvents="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  };

  return (
    <div 
      className={`board-outer-container ${isMillActive ? 'board-mill-active' : ''}`}
      onContextMenu={handleContextMenu}
    >
      <div 
        className="board-container" 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg className="board-lines" width="100%" height="100%" viewBox="0 0 100 100">
          <defs>
            <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 Z" fill="rgba(255, 170, 0, 0.8)" />
            </marker>
            {/* Shadow filter for etched look */}
            <filter id="etched-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.2" floodColor="rgba(0,0,0,0.5)" />
            </filter>
          </defs>

          {/* Etched board lines */}
          <g filter="url(#etched-shadow)">
            <rect x="5" y="5" width="90" height="90" fill="none" stroke="var(--board-line)" strokeWidth="1.2" rx="1" />
            <rect x="20" y="20" width="60" height="60" fill="none" stroke="var(--board-line)" strokeWidth="1.2" rx="1" />
            <rect x="35" y="35" width="30" height="30" fill="none" stroke="var(--board-line)" strokeWidth="1.2" rx="1" />
            
            <line x1="50" y1="5" x2="50" y2="35" stroke="var(--board-line)" strokeWidth="1.2" />
            <line x1="50" y1="65" x2="50" y2="95" stroke="var(--board-line)" strokeWidth="1.2" />
            <line x1="5" y1="50" x2="35" y2="50" stroke="var(--board-line)" strokeWidth="1.2" />
            <line x1="65" y1="50" x2="95" y2="50" stroke="var(--board-line)" strokeWidth="1.2" />
          </g>

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

          {/* Draw permanent arrows */}
          {arrows.map((arrow, idx) => (
            <React.Fragment key={`arrow-group-${idx}`}>
              {renderPath(arrow.from, arrow.to, 0.6)}
            </React.Fragment>
          ))}

          {/* Draw current dragging arrow */}
          {dragStart !== null && dragCurrentNode !== null && dragStart !== dragCurrentNode && (
            renderPath(dragStart, dragCurrentNode, 0.4)
          )}
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
              {/* Node identification number */}
              <span className="node-label">{node.id + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
