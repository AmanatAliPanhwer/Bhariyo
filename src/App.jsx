import React, { useState, useEffect } from 'react';
import './App.css';
import Board from './components/Board';
import GameStatus from './components/GameStatus';
import { findNewMills, checkWinList, ADJACENCY, isPhase3, canRemoveAnyPiece, MILLS } from './gameLogic';

function App() {
  const [board, setBoard] = useState(Array(24).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [unplacedPieces, setUnplacedPieces] = useState({ 1: 9, 2: 9 });
  
  const [gamePhase, setGamePhase] = useState('PLACING');
  const [turnState, setTurnState] = useState('IDLE');
  const [activeNode, setActiveNode] = useState(null);
  const [activeMills, setActiveMills] = useState([]);
  const [winner, setWinner] = useState(null);

  const p1Count = unplacedPieces[1] + board.filter(p => p === 1).length;
  const p2Count = unplacedPieces[2] + board.filter(p => p === 2).length;

  useEffect(() => {
    if (unplacedPieces[1] === 0 && unplacedPieces[2] === 0 && gamePhase === 'PLACING') {
      setGamePhase('PLAYING');
    }
  }, [unplacedPieces, gamePhase]);

  const handleNodeClick = (nodeId) => {
    if (winner) return;

    const clickedPlayer = board[nodeId];
    const opponent = currentPlayer === 1 ? 2 : 1;

    if (turnState === 'REMOVING_OPPONENT') {
      if (clickedPlayer !== opponent) return;
      
      let isInMill = false;
      MILLS.forEach(mill => {
        if (mill.includes(nodeId) && mill.every(n => board[n] === opponent)) {
          isInMill = true;
        }
      });
      
      if (isInMill && !canRemoveAnyPiece(board, opponent)) return; 
      
      const newBoard = [...board];
      newBoard[nodeId] = null;
      setBoard(newBoard);
      
      if (gamePhase === 'PLAYING') {
        if (checkWinList(newBoard, currentPlayer)) {
          setWinner(currentPlayer);
          return;
        }
      }
      
      setTurnState('IDLE');
      setActiveNode(null);
      setActiveMills([]);
      setCurrentPlayer(opponent);
      return;
    }

    if (gamePhase === 'PLACING' && turnState === 'IDLE') {
      if (clickedPlayer !== null) return;
      
      const newBoard = [...board];
      newBoard[nodeId] = currentPlayer;
      setBoard(newBoard);
      
      setUnplacedPieces(prev => ({ ...prev, [currentPlayer]: prev[currentPlayer] - 1 }));
      
      const newMills = findNewMills(newBoard, currentPlayer, nodeId);
      if (newMills.length > 0) {
        setTurnState('REMOVING_OPPONENT');
        setActiveMills(newMills);
      } else {
        setCurrentPlayer(opponent);
      }
      return;
    }

    if (gamePhase === 'PLAYING') {
      if (turnState === 'IDLE') {
        if (clickedPlayer === currentPlayer) {
          setActiveNode(nodeId);
          setTurnState('SELECTED_PIECE');
        }
      } else if (turnState === 'SELECTED_PIECE') {
        if (clickedPlayer === currentPlayer) {
          if (activeNode === nodeId) {
            setActiveNode(null);
            setTurnState('IDLE');
          } else {
            setActiveNode(nodeId);
          }
          return;
        }
        
        if (clickedPlayer === null) {
          const isFlying = isPhase3(board, currentPlayer);
          const isAdjacent = ADJACENCY[activeNode].includes(nodeId);
          
          if (isFlying || isAdjacent) {
            const newBoard = [...board];
            newBoard[nodeId] = currentPlayer;
            newBoard[activeNode] = null;
            setBoard(newBoard);
            setActiveNode(null);
            
            const newMills = findNewMills(newBoard, currentPlayer, nodeId);
            if (newMills.length > 0) {
              setTurnState('REMOVING_OPPONENT');
              setActiveMills(newMills);
            } else {
              if (checkWinList(newBoard, currentPlayer)) {
                setWinner(currentPlayer);
              } else {
                setTurnState('IDLE');
                setCurrentPlayer(opponent);
              }
            }
          }
        }
      }
    }
  };

  let highlightNodes = [];
  if (turnState === 'SELECTED_PIECE' && activeNode !== null) {
    if (isPhase3(board, currentPlayer)) {
      highlightNodes = board.map((p, i) => p === null ? i : -1).filter(i => i !== -1);
    } else {
      highlightNodes = ADJACENCY[activeNode].filter(n => board[n] === null);
    }
  }
  let removableNodes = [];
  if (turnState === 'REMOVING_OPPONENT') {
    const opponent = currentPlayer === 1 ? 2 : 1;
    const canRemoveAny = canRemoveAnyPiece(board, opponent);
    
    board.forEach((p, i) => {
      if (p === opponent) {
        if (canRemoveAny) {
          removableNodes.push(i);
        } else {
          let isInMill = false;
          MILLS.forEach(mill => {
            if (mill.includes(i) && mill.every(n => board[n] === opponent)) {
              isInMill = true;
            }
          });
          if (!isInMill) removableNodes.push(i);
        }
      }
    });
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-brand">
          <img src="/logo.png" alt="Bhariyo Logo" className="nav-logo" />
          Bhariyo
        </div>
      </nav>
      
      <main className="main-layout">
        <div className="board-section">
          <Board 
            board={board} 
            onNodeClick={handleNodeClick} 
            activeNode={activeNode}
            highlightNodes={highlightNodes}
            activeMills={activeMills}
            removableNodes={removableNodes}
          />
        </div>
        
        <aside className="status-section">
          <GameStatus 
            currentPlayer={currentPlayer}
            turnState={turnState}
            gamePhase={gamePhase}
            unplacedPieces={unplacedPieces}
            p1Count={p1Count}
            p2Count={p2Count}
            winner={winner}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
