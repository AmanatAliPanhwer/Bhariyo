import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Board from './components/Board';
import GameStatus from './components/GameStatus';
import Learn from './components/Learn';
import Puzzles from './components/Puzzles';
import AuthForms from './components/Auth/AuthForms';
import PlayOnline from './components/Multiplayer/PlayOnline';
import ChallengeOverlay from './components/Multiplayer/ChallengeOverlay';
import Dashboard from './components/Dashboard/Dashboard';
import MatchTimer from './components/Game/MatchTimer';
import GameSetup from './components/Game/GameSetup';
import BotSelection from './components/Game/BotSelection';
import { useAuth } from './contexts/AuthContext';
import { findNewMills, checkWinList, ADJACENCY, isPhase3, canRemoveAnyPiece, MILLS, getBotMove } from './gameLogic';
import { io } from 'socket.io-client';
import { 
  Trophy, 
  GraduationCap, 
  ChevronDown, 
  Settings,
  Users,
  Gamepad2,
  Sword,
  LogOut,
  Maximize2,
  Minimize2,
  Flag,
  Puzzle,
  MoreHorizontal,
  Menu,
  Mail,
  Bell,
  ChevronRight
} from 'lucide-react';

const SOCKET_URL = 'http://localhost:5000';

function App() {
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'game', 'learn', 'play_online'
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [playerSide, setPlayerSide] = useState(null); // 1 or 2
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [isBotGame, setIsBotGame] = useState(false);
  const [bot, setBot] = useState(null);
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Match Center');
  const [showMatchCenter, setShowMatchCenter] = useState(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [board, setBoard] = useState(Array(24).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [unplacedPieces, setUnplacedPieces] = useState({ 1: 9, 2: 9 });
  const [gamePhase, setGamePhase] = useState('PLACING');
  const [turnState, setTurnState] = useState('IDLE');
  const [activeNode, setActiveNode] = useState(null);
  const [activeMills, setActiveMills] = useState([]);
  const [winner, setWinner] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);

  // Timer states
  const [p1Time, setP1Time] = useState(600);
  const [p2Time, setP2Time] = useState(600);

  // Local timer effect
  useEffect(() => {
    let interval;
    if (!isMultiplayer && currentView === 'game' && !winner) {
      interval = setInterval(() => {
        if (currentPlayer === 1) {
          setP1Time(prev => Math.max(0, prev - 1));
        } else {
          setP2Time(prev => Math.max(0, prev - 1));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isMultiplayer, currentView, currentPlayer, winner]);

  // Bot Move Effect
  useEffect(() => {
    if (isBotGame && currentPlayer === 2 && !winner && currentView === 'game') {
      const timer = setTimeout(() => {
        if (turnState === 'SELECTED_PIECE' && activeNode !== null) {
          // If we already selected a piece, we need to find WHERE to move it
          const move = getBotMove(board, 2, gamePhase, 'IDLE', unplacedPieces, bot?.level);
          if (move && typeof move === 'object' && move.from === activeNode) {
            handleNodeClick(move.to);
          } else {
             // Bot might have changed its mind or state is weird, deselect
             handleNodeClick(activeNode);
          }
          return;
        }

        const move = getBotMove(board, 2, gamePhase, turnState, unplacedPieces, bot?.level);
        if (move !== null) {
          if (turnState === 'REMOVING_OPPONENT') {
            handleNodeClick(move);
          } else if (gamePhase === 'PLACING') {
            handleNodeClick(move);
          } else if (gamePhase === 'PLAYING') {
            if (turnState === 'IDLE') {
              handleNodeClick(move.from);
              // The next tick will handle the 'to' part because turnState will be SELECTED_PIECE
            }
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isBotGame, currentPlayer, turnState, gamePhase, winner, currentView, board, unplacedPieces, bot, activeNode]);

  // Handle local timeout
  useEffect(() => {
    if (!isMultiplayer && (p1Time === 0 || p2Time === 0)) {
      setWinner(p1Time === 0 ? 'Player 2' : user?.username || 'Player 1');
    }
  }, [p1Time, p2Time, isMultiplayer, user?.username]);

  const p1Count = unplacedPieces[1] + board.filter(p => p === 1).length;
  const p2Count = unplacedPieces[2] + board.filter(p => p === 2).length;

  // Initialize Socket
  useEffect(() => {
    if (user) {
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('register_online', { username: user.username, id: user.id, elo: user.elo });
      });

      newSocket.on('stats_update', (updatedStats) => {
        updateUser(updatedStats);
      });

      newSocket.on('game_start', (matchData) => {
        setRoom(matchData);
        const mySide = matchData.players.find(p => p.username === user.username)?.side;
        setPlayerSide(mySide);
        setIsMultiplayer(true);
        setCurrentView('game');
        setIncomingChallenge(null);
        setP1Time(matchData.p1Time);
        setP2Time(matchData.p2Time);
        resetGame();
      });

      newSocket.on('time_sync', ({ p1Time: t1, p2Time: t2 }) => {
        setP1Time(t1);
        setP2Time(t2);
      });

      newSocket.on('game_over', ({ winner: winUser, reason }) => {
        setWinner(winUser);
        alert(`Game Over! ${winUser} won by ${reason}`);
      });

      newSocket.on('draw_offered', () => {
        if (window.confirm('Opponent offered a draw. Accept?')) {
          newSocket.emit('accept_draw', room?.id);
        }
      });

      newSocket.on('draw_accepted', () => {
        setWinner('Draw');
        alert('Game ended in a draw.');
      });

      newSocket.on('incoming_challenge', (challengeData) => {
        setIncomingChallenge(challengeData);
      });

      newSocket.on('challenge_declined', () => {
        alert('Challenge declined');
      });

      newSocket.on('opponent_move', (moveData) => {
        handleMoveImpact(moveData, true);
      });

      newSocket.on('player_disconnected', () => {
        alert('Opponent disconnected');
        handleQuitGame();
      });

      return () => newSocket.disconnect();
    }
  }, [user, room?.id]);

  useEffect(() => {
    if (unplacedPieces[1] === 0 && unplacedPieces[2] === 0 && gamePhase === 'PLACING') {
      setGamePhase('PLAYING');
    }
  }, [unplacedPieces, gamePhase]);

  const resetGame = () => {
    setBoard(Array(24).fill(null));
    setCurrentPlayer(1);
    setUnplacedPieces({ 1: 9, 2: 9 });
    setGamePhase('PLACING');
    setTurnState('IDLE');
    setWinner(null);
    setActiveNode(null);
    setActiveMills([]);
    setMoveHistory([]);
  };

  const handlePlayLocal = () => {
    setIsMultiplayer(false);
    setIsBotGame(false);
    setBot(null);
    setRoom(null);
    setPlayerSide(null);
    setCurrentView('game_setup');
  };

  const handlePlayBots = () => {
    setCurrentView('play_bots');
  };

  const handleSelectBot = (selectedBot) => {
    setBot(selectedBot);
    setIsBotGame(true);
    setIsMultiplayer(false);
    setPlayerSide(1); // User is always player 1 vs bot for now
    resetGame();
    setP1Time(600);
    setP2Time(600);
    setCurrentView('game');
  };

  const handleStartLocalGame = (seconds) => {
    resetGame();
    setP1Time(seconds);
    setP2Time(seconds);
    setCurrentView('game');
  };

  const handlePlayOnline = () => {
    setCurrentView('play_online');
  };

  const handleAcceptChallenge = (challengeId) => {
    socket.emit('accept_challenge', challengeId);
  };

  const handleDeclineChallenge = (challengeId) => {
    socket.emit('decline_challenge', challengeId);
    setIncomingChallenge(null);
  };

  const handleResign = () => {
    if (!winner && window.confirm('Are you sure you want to resign?')) {
      if (isMultiplayer && socket && room) {
        socket.emit('resign', room.id);
      } else {
        setWinner(currentPlayer === 1 ? 'Player 2' : user?.username || 'Player 1');
      }
    }
  };

  const handleOfferDraw = () => {
    if (!winner) {
      if (isMultiplayer && socket && room) {
        socket.emit('offer_draw', room.id);
        alert('Draw offer sent');
      } else {
        if (window.confirm('Propose a draw?')) {
          setWinner('Draw');
        }
      }
    }
  };

  const addMoveToHistory = (player, from, to, type) => {
    // NODE coordinates/indices are roughly 0-23. Let's make them 1-based labels for display
    const label = (idx) => idx === null ? '' : idx + 1;
    const playerTag = player === 1 ? 'W' : 'B';

    let moveStr = '';
    if (type === 'PLACE') moveStr = `${playerTag}: @Node ${label(to)}`;
    else if (type === 'REMOVE') moveStr = `${playerTag}: Captured @${label(to)}`;
    else moveStr = `${playerTag}: ${label(from)} -> ${label(to)}`;

    setMoveHistory(prev => [...prev, moveStr]);
  };

  const handleMoveImpact = useCallback((moveData, isFromOpponent = false) => {
    const { boardState, unplacedState, playerMoved, nextTurnState, nextMills, nextPlayer, isWin, type, nodeId, fromNode } = moveData;

    setBoard(boardState);
    setUnplacedPieces(unplacedState);
    setCurrentPlayer(nextPlayer);
    setTurnState(nextTurnState);
    setActiveMills(nextMills || []);
    if (isWin) setWinner(isWin);
    if (nextTurnState === 'IDLE') setActiveNode(null);

    if (isFromOpponent) {
      addMoveToHistory(playerMoved, fromNode, nodeId, type);
    }
  }, []);

  const emitMove = (moveData) => {
    if (room && socket) {
      socket.emit('move', { roomId: room.id, moveData });
    }
  };

  const handleNodeClick = (nodeId) => {
    if (winner) return;
    if (isMultiplayer && currentPlayer !== playerSide) return;

    const clickedPlayer = board[nodeId];
    const opponent = currentPlayer === 1 ? 2 : 1;

    let nextBoard = [...board];
    let nextUnplaced = { ...unplacedPieces };
    let nextTurn = turnState;
    let nextPlayer = currentPlayer;
    let nextMills = [];
    let isWin = null;
    if (turnState === 'REMOVING_OPPONENT') {
      if (clickedPlayer !== opponent) return;
      
      let isInMill = false;
      MILLS.forEach(mill => {
        if (mill.includes(nodeId) && mill.every(n => board[n] === opponent)) {
          isInMill = true;
        }
      });
      
      if (isInMill && !canRemoveAnyPiece(board, opponent)) return; 
      
      nextBoard[nodeId] = null;
      
      if (gamePhase === 'PLAYING') {
        if (checkWinList(nextBoard, currentPlayer)) {
          isWin = currentPlayer === 1 ? user.username : (isBotGame ? bot.name : 'Opponent');
        }
      }
      
      if (!isWin) {
        nextTurn = 'IDLE';
        nextPlayer = opponent;
      }

      const moveData = {
        nodeId,
        type: 'REMOVE',
        boardState: nextBoard,
        unplacedState: nextUnplaced,
        playerMoved: currentPlayer,
        nextTurnState: nextTurn,
        nextPlayer,
        isWin
      };

      setBoard(nextBoard);
      setTurnState(nextTurn);
      setCurrentPlayer(nextPlayer);
      setActiveMills([]);
      if (isWin) setWinner(isWin);
      addMoveToHistory(currentPlayer, null, nodeId, 'REMOVE');
      if (isMultiplayer) emitMove(moveData);
      return;
    }

    if (gamePhase === 'PLACING' && turnState === 'IDLE') {
      if (clickedPlayer !== null) return;
      
      nextBoard[nodeId] = currentPlayer;
      nextUnplaced[currentPlayer] -= 1;
      
      const newMills = findNewMills(nextBoard, currentPlayer, nodeId);
      if (newMills.length > 0) {
        nextTurn = 'REMOVING_OPPONENT';
        nextMills = newMills;
      } else {
        nextPlayer = opponent;
      }

      const moveData = {
        nodeId,
        type: 'PLACE',
        boardState: nextBoard,
        unplacedState: nextUnplaced,
        playerMoved: currentPlayer,
        nextTurnState: nextTurn,
        nextMills: nextMills,
        nextPlayer,
        isWin: null
      };

      setBoard(nextBoard);
      setUnplacedPieces(nextUnplaced);
      setTurnState(nextTurn);
      setActiveMills(nextMills);
      setCurrentPlayer(nextPlayer);
      addMoveToHistory(currentPlayer, null, nodeId, 'PLACE');
      if (isMultiplayer) emitMove(moveData);
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
            nextBoard[nodeId] = currentPlayer;
            nextBoard[activeNode] = null;
            
            const newMills = findNewMills(nextBoard, currentPlayer, nodeId);
            if (newMills.length > 0) {
              nextTurn = 'REMOVING_OPPONENT';
              nextMills = newMills;
            } else {
              if (checkWinList(nextBoard, currentPlayer)) {
                isWin = currentPlayer === 1 ? user.username : (isBotGame ? bot.name : 'Opponent');
              } else {
                nextTurn = 'IDLE';
                nextPlayer = opponent;
              }
            }

            const moveData = {
              nodeId,
              fromNode: activeNode,
              type: 'MOVE',
              boardState: nextBoard,
              unplacedState: nextUnplaced,
              playerMoved: currentPlayer,
              nextTurnState: nextTurn,
              nextMills: nextMills,
              nextPlayer,
              isWin
            };

            setBoard(nextBoard);
            setTurnState(nextTurn);
            setActiveMills(nextMills);
            setCurrentPlayer(nextPlayer);
            setActiveNode(null);
            if (isWin) setWinner(isWin);
            addMoveToHistory(currentPlayer, activeNode, nodeId, 'MOVE');
            if (isMultiplayer) emitMove(moveData);
          }
        }
      }
    }
  };

  const handleQuitGame = () => {
    socket?.emit('leave_game', room?.id);
    setRoom(null);
    setIsMultiplayer(false);
    setIsBotGame(false);
    setBot(null);
    setCurrentView('dashboard');
    setIsFocusMode(false);
    setP1Time(600);
    setP2Time(600);
  };

  if (authLoading) return <div className="loading">Loading...</div>;
  if (!user) return <AuthForms />;

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

  const opponent = isMultiplayer 
    ? room.players.find(p => p.id !== socket?.id) 
    : (isBotGame ? { username: bot.name, elo: bot.rating, avatar: bot.avatar } : { username: 'Player 2' });

  const renderContent = () => {
    if (currentView === 'dashboard') {
      return (
        <Dashboard 
          onPlayLocal={handlePlayLocal} 
          onPlayOnline={handlePlayOnline}
          onPlayBots={handlePlayBots}
          onLearnClick={() => setCurrentView('learn')}
          onPuzzlesClick={() => setCurrentView('puzzles')}
        />
      );
    }
    if (currentView === 'learn') return <Learn onPlayClick={handlePlayLocal} />;
    if (currentView === 'puzzles') return <Puzzles onBackToDashboard={() => setCurrentView('dashboard')} />;
    if (currentView === 'game_setup') {
      return <GameSetup onStart={handleStartLocalGame} onBack={() => setCurrentView('dashboard')} />;
    }
    if (currentView === 'play_online') {
      return <PlayOnline socket={socket} />;
    }
    if (currentView === 'play_bots') {
      return <BotSelection onSelectBot={handleSelectBot} onBack={() => setCurrentView('dashboard')} />;
    }

    return (
      <main className={`main-layout ${isFocusMode ? 'focus-layout-active' : ''}`}>
        {isFocusMode && (
          <div className="focus-sidebar-left">
             <div className="focus-avatar-box opponent">
                <div className="avatar-med">{opponent.username[0].toUpperCase()}</div>
                <div className="piece-stats-badge">
                   <span className="label">REMAINING</span>
                   <span className="val">{playerSide === 1 ? unplacedPieces[2] : unplacedPieces[1]}</span>
                </div>
                <div className="piece-stats-badge">
                   <span className="label">ALIVE</span>
                   <span className="val">{playerSide === 1 ? p2Count : p1Count}</span>
                </div>
                <MatchTimer seconds={playerSide === 1 ? p2Time : p1Time} isActive={currentPlayer !== playerSide} />
             </div>
             
             <button className="focus-btn exit" onClick={() => setIsFocusMode(false)}>
                <Minimize2 size={24} />
             </button>

             <div className="focus-avatar-box self">
                <div className="avatar-med">{user.username[0].toUpperCase()}</div>
                <div className="piece-stats-badge">
                   <span className="label">REMAINING</span>
                   <span className="val">{playerSide === 1 ? unplacedPieces[1] : unplacedPieces[2]}</span>
                </div>
                <div className="piece-stats-badge">
                   <span className="label">ALIVE</span>
                   <span className="val">{playerSide === 1 ? p1Count : p2Count}</span>
                </div>
                <MatchTimer seconds={playerSide === 1 ? p1Time : p2Time} isActive={currentPlayer === playerSide} />
             </div>
          </div>
        )}

        <div className="game-center">
          {!isFocusMode && (
            <div className="player-strip opponent-strip">
              <div className="player-meta">
                <div className="avatar-small">
                  {opponent.avatar ? (
                    <img src={opponent.avatar} alt="" className="player-img-avatar" />
                  ) : (
                    opponent.username[0].toUpperCase()
                  )}
                </div>
                <div className="player-name-badges">
                  <span className="player-name">{opponent.username}</span>
                  <span className="rating-badge">{opponent.elo || 1200}</span>
                </div>
              </div>
              {isMultiplayer && <MatchTimer seconds={playerSide === 1 ? p2Time : p1Time} isActive={currentPlayer !== playerSide} />}
              {!isMultiplayer && <MatchTimer seconds={p2Time} isActive={currentPlayer === 2} />}
            </div>
          )}

          <div className="board-container-wrapper">
            {!isFocusMode && (
              <div className="board-sidebar-controls left">
                   <button className="icon-btn mobile-hide" title="Focus Mode" onClick={() => setIsFocusMode(true)}>
                      <Maximize2 size={20} />
                   </button>
              </div>

            )}

            <Board 
                board={board} 
                onNodeClick={handleNodeClick} 
                activeNode={activeNode}
                highlightNodes={highlightNodes}
                activeMills={activeMills}
                removableNodes={removableNodes}
            />

            {!isFocusMode && (
              <div className="board-sidebar-controls right">
                  <button className="icon-btn" title="Settings"><Settings size={20} /></button>
              </div>
            )}
          </div>

          {!isFocusMode && (
            <div className="player-strip self-strip">
              <div className="player-meta">
                <div className="avatar-small">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="player-img-avatar" />
                  ) : (
                    user.username[0].toUpperCase()
                  )}
                </div>
                <div className="player-name-badges">
                  <span className="player-name">{user.username}</span>
                  <span className="rating-badge">{user.elo || 1200}</span>
                  <span className="player-flag">🇵🇰</span>
                </div>
              </div>
              {isMultiplayer && <MatchTimer seconds={playerSide === 1 ? p1Time : p2Time} isActive={currentPlayer === playerSide} />}
              {!isMultiplayer && <MatchTimer seconds={p1Time} isActive={currentPlayer === 1} />}
            </div>
          )}
        </div>
        
        {isFocusMode ? (
          <div className="focus-sidebar-right">
             <button className="focus-action-btn" onClick={handleOfferDraw} title="Draw">
                <span className="fraction">½</span>
             </button>
             <button className="focus-action-btn" onClick={handleResign} title="Resign">
                <Flag size={28} />
             </button>
             <button className="focus-action-btn" title="Settings">
                <Settings size={28} />
             </button>
          </div>
        ) : (
          <>
            {showMatchCenter && <div className="panel-overlay mobile-only" onClick={() => setShowMatchCenter(false)} />}
            <aside className={`match-center-panel ${showMatchCenter ? 'open' : ''}`}>
              <div className="panel-header mobile-only">
                 <button className="close-panel-btn" onClick={() => setShowMatchCenter(false)}>
                    <ChevronDown size={24} />
                 </button>
              </div>
              <div className="panel-tabs">
               <button 
                className={`tab ${activeTab === 'Match Center' ? 'active' : ''}`}
                onClick={() => setActiveTab('Match Center')}
               >
                Match Center
               </button>
               <button 
                className={`tab ${activeTab === 'Moves' ? 'active' : ''}`}
                onClick={() => setActiveTab('Moves')}
               >
                Moves
               </button>
            </div>

            <div className="panel-content">
               <GameStatus 
                  currentPlayer={currentPlayer}
                  turnState={turnState}
                  gamePhase={gamePhase}
                  unplacedPieces={unplacedPieces}
                  p1Count={p1Count}
                  p2Count={p2Count}
                  winner={winner}
                  moveHistory={moveHistory}
                  activeTab={activeTab}
               />

               <div className="game-action-buttons">
                  <button className="btn-chess btn-chess-secondary full-w" onClick={handleResign}>
                    <Flag size={18} /> Resign
                  </button>
                  <button className="btn-chess btn-chess-secondary full-w" onClick={handleOfferDraw}>
                    <span className="txt-bold">½</span> Draw
                  </button>
               </div>
            </div>

            <div className="panel-footer">
               <button className="btn-chess btn-chess-primary full-w" onClick={handleQuitGame}>
                  {room ? 'Leave Match' : 'Quit Game'}
               </button>
            </div>
          </aside>
          </>
        )}

        {winner && (
          <div className="game-over-modal">
             <div className="modal-content">
                <div className="modal-icon">🏆</div>
                <h1>Game Over</h1>
                <p>{winner === 'Draw' ? "It's a draw!" : `${winner} has won the match!`}</p>
                {isMultiplayer && (
                  <div className="elo-update-summary">
                    <span className="current-rating">Your New Rating: <strong>{user.elo}</strong></span>
                  </div>
                )}
                <div className="modal-actions">
                   <button className="btn-chess btn-chess-primary full-w" onClick={() => { resetGame(); setWinner(null); }}>
                      Play Again
                   </button>
                   <button className="btn-chess btn-chess-secondary full-w" onClick={handleQuitGame}>
                      Back to Dashboard
                   </button>
                </div>
             </div>
          </div>
        )}
      </main>
    );
  };

  return (
    <div className={`app-container ${isFocusMode ? 'focus-active' : ''}`}>
      {!isFocusMode && (
        <header className="mobile-header mobile-only">
          <div className="header-left">
            <button className="icon-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="mobile-logo">
              <img src="/logo-long.png" alt="Bhariyo" className="sidebar-logo" />
            </div>
          </div>
          <div className="header-right">
            <button className="icon-btn"><Users size={20} /></button>
            <button className="icon-btn inbox-btn">
              <Mail size={20} />
              <span className="notification-badge">1</span>
            </button>
            <button className="icon-btn"><Bell size={20} /></button>
          </div>
        </header>
      )}

      {isSidebarOpen && <div className="sidebar-overlay mobile-only" onClick={() => setIsSidebarOpen(false)} />}
      
      {incomingChallenge && (
        <ChallengeOverlay 
          challenge={incomingChallenge} 
          onAccept={handleAcceptChallenge}
          onDecline={handleDeclineChallenge}
        />
      )}
      
      {!isFocusMode && (
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-top">
            <div className="sidebar-brand mobile-hide" onClick={() => setCurrentView('dashboard')}>
              <img src="/logo-long.png" alt="Bhariyo" className="sidebar-logo" />
            </div>
            
            <nav className="sidebar-nav">
            <div className="nav-item-with-menu">
              <button 
                className={`sidebar-btn ${currentView === 'game' || currentView === 'play_online' ? 'active' : ''}`}
                onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }}
              >
                <Trophy size={24} fill={currentView === 'game' ? 'currentColor' : 'none'} />
                <span>Play</span>
              </button>
              
              <div className="hover-menu">
                <button onClick={handlePlayOnline} className="menu-item">
                  <Gamepad2 size={18} />
                  <span>Play Online</span>
                </button>
                <button onClick={handlePlayBots} className="menu-item">
                  <Sword size={18} />
                  <span>Play Bots</span>
                </button>
                <button onClick={handlePlayLocal} className="menu-item">
                  <Users size={18} />
                  <span>Play Local</span>
                </button>
              </div>
            </div>

            <button 
              className={`sidebar-btn ${currentView === 'puzzles' ? 'active' : ''}`}
              onClick={() => setCurrentView('puzzles')}
            >
              <Puzzle size={24} />
              <span>Puzzles</span>
            </button>

            <button 
              className={`sidebar-btn ${currentView === 'learn' ? 'active' : ''}`}
              onClick={() => setCurrentView('learn')}
            >
              <GraduationCap size={24} />
              <span>Learn</span>
            </button>

            <button className="sidebar-btn">
              <MoreHorizontal size={24} />
              <span>More</span>
            </button>
            </nav>
          </div>

          <div className="sidebar-bottom">
            <div className="profile-compact" onClick={() => setCurrentView('dashboard')}>
              <div className="avatar-small">{user.username[0].toUpperCase()}</div>
              <div className="profile-name">
                <span>{user.username}</span>
              </div>
            </div>
            
            <div className="utility-icons">
              <button className="util-btn" title="Settings"><Settings size={18} /></button>
              <button className="util-btn" title="Logout" onClick={logout}><LogOut size={18} /></button>
            </div>
          </div>
        </aside>
      )}
      
      <div className="app-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
