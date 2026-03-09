import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { supabase } from './supabaseClient';
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

const API_BASE_URL = 'https://bhariyo-backend.vercel.app'; // Your Vercel backend URL

function App() {
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [channel, setChannel] = useState(null);
  const [room, setRoom] = useState(null);
  const [playerSide, setPlayerSide] = useState(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [isBotGame, setIsBotGame] = useState(false);
  const [bot, setBot] = useState(null);
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Match Center');
  const [showMatchCenter, setShowMatchCenter] = useState(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const [board, setBoard] = useState(Array(24).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [unplacedPieces, setUnplacedPieces] = useState({ 1: 9, 2: 9 });
  const [gamePhase, setGamePhase] = useState('PLACING');
  const [turnState, setTurnState] = useState('IDLE');
  const [activeNode, setActiveNode] = useState(null);
  const [activeMills, setActiveMills] = useState([]);
  const [winner, setWinner] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [pendingBotMove, setPendingBotMove] = useState(null);

  // Timer states
  const [p1Time, setP1Time] = useState(600);
  const [p2Time, setP2Time] = useState(600);

  // Derived counts
  const p1Count = unplacedPieces[1] + board.filter(p => p === 1).length;
  const p2Count = unplacedPieces[2] + board.filter(p => p === 2).length;

  // Use refs to avoid closure issues in callbacks
  const roomRef = useRef(null);
  const playerSideRef = useRef(null);
  const userRef = useRef(null);
  const winnerRef = useRef(null);

  useEffect(() => {
    roomRef.current = room;
    playerSideRef.current = playerSide;
    userRef.current = user;
    winnerRef.current = winner;
  }, [room, playerSide, user, winner]);

  // Local timer effect
  useEffect(() => {
    let interval;
    if (currentView === 'game' && !winner) {
      interval = setInterval(() => {
        if (currentPlayer === 1) {
          setP1Time(prev => Math.max(0, prev - 1));
        } else {
          setP2Time(prev => Math.max(0, prev - 1));
        }

        // If it's my turn in multiplayer and I run out of time
        if (isMultiplayer && roomRef.current && !winnerRef.current) {
           const myTime = playerSideRef.current === 1 ? p1Time : p2Time;
           if (myTime <= 1) { // 1 to account for lag
             handleTimeout();
           }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentView, currentPlayer, winner, isMultiplayer, p1Time, p2Time]);

  const handleTimeout = async () => {
    if (winnerRef.current) return;
    const opponent = roomRef.current.players.find(p => p.username !== userRef.current.username);
    await finalizeGame(opponent.username, 'Time Out');
  };

  const finalizeGame = async (winUser, reason, isDraw = false) => {
    if (winnerRef.current) return;
    setWinner(winUser || (isDraw ? 'Draw' : 'Unknown'));
    updateLobbyStatus('AVAILABLE');
    
    if (isMultiplayer && roomRef.current) {
      const me = userRef.current;
      const opponent = roomRef.current.players.find(p => p.username !== me.username);
      const isMeWinner = winUser === me.username;

      try {
        const response = await fetch(`${API_BASE_URL}/api/game/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            winnerId: isMeWinner ? me.id : (isDraw ? me.id : opponent.id),
            loserId: isMeWinner ? opponent.id : (isDraw ? opponent.id : me.id),
            isDraw,
            winnerElo: isMeWinner ? me.elo : (isDraw ? me.elo : (opponent.elo || 1200)),
            loserElo: isMeWinner ? (opponent.elo || 1200) : (isDraw ? (opponent.elo || 1200) : me.elo)
          })
        });
        
        const data = await response.json();
        if (data.result) {
          const updatedMe = isMeWinner ? data.result.winner : (isDraw ? data.result.p1 : data.result.loser);
          updateUser(updatedMe);
        }
      } catch (err) {
        console.error('Failed to update stats:', err);
      }
    }
  };

  // Bot logic effect
  useEffect(() => {
    if (isBotGame && !winner && currentPlayer === 2 && !pendingBotMove) {
      const botMoveTimer = setTimeout(() => {
        const level = bot?.level || 'BEGINNER';
        const move = getBotMove(board, 2, gamePhase, turnState, unplacedPieces, level);
        
        if (move !== null) {
          if (typeof move === 'number') {
            handleNodeClick(move);
          } else {
            // It's a move from -> to
            setPendingBotMove(move);
            handleNodeClick(move.from);
          }
        }
      }, 1000);
      return () => clearTimeout(botMoveTimer);
    }
  }, [isBotGame, winner, currentPlayer, turnState, board, gamePhase, unplacedPieces, bot, pendingBotMove]);

  // Bot move completion effect
  useEffect(() => {
    if (pendingBotMove && turnState === 'SELECTED_PIECE' && activeNode === pendingBotMove.from) {
      const timer = setTimeout(() => {
        handleNodeClick(pendingBotMove.to);
        setPendingBotMove(null);
      }, 600);
      return () => clearTimeout(timer);
    } else if (pendingBotMove && turnState === 'IDLE' && activeNode === null) {
       // Bot move might have been aborted or something, clear it
       setPendingBotMove(null);
    }
  }, [pendingBotMove, turnState, activeNode]);

  // Initialize Supabase Realtime
  useEffect(() => {
    if (user) {
      const lobbyChannel = supabase.channel('lobby', {
        config: {
          presence: {
            key: user.username,
          },
        },
      });

      lobbyChannel
        .on('presence', { event: 'sync' }, () => {
          const state = lobbyChannel.presenceState();
          const users = [];
          Object.keys(state).forEach((key) => {
            const presenceList = state[key];
            if (presenceList && presenceList.length > 0) {
              const presence = presenceList[0];
              if (presence.username && presence.username !== user.username) {
                users.push(presence);
              }
            }
          });
          setOnlineUsers(users);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (newPresences && newPresences.length > 0) {
            const newUser = newPresences[0];
            if (newUser.username && newUser.username !== user.username) {
              setOnlineUsers(prev => {
                const filtered = prev.filter(u => u.username !== newUser.username);
                return [...filtered, newUser];
              });
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
           if (leftPresences && leftPresences.length > 0) {
             const leftUser = leftPresences[0];
             setOnlineUsers(prev => prev.filter(u => u.username !== leftUser.username));
           }
        })
        .on('broadcast', { event: 'challenge' }, (payload) => {
          if (payload.payload.to === user.username) {
            setIncomingChallenge({
              challengeId: payload.payload.challengeId,
              from: { username: payload.payload.from, elo: payload.payload.elo }
            });
          }
        })
        .on('broadcast', { event: 'challenge_response' }, (payload) => {
          if (payload.payload.to === user.username) {
            if (payload.payload.accepted) {
              startMultiplayerGame(payload.payload.roomData, payload.payload.side);
            } else {
              alert('Challenge declined');
            }
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await lobbyChannel.track({
              username: user.username,
              id: user.id,
              elo: user.elo || 1200,
              status: 'AVAILABLE',
              online_at: new Date().toISOString(),
            });
          }
        });

      setChannel(lobbyChannel);

      return () => {
        lobbyChannel.unsubscribe();
      };
    }
  }, [user]);

  const updateLobbyStatus = async (status) => {
    if (channel && user) {
      await channel.track({
        username: user.username,
        id: user.id,
        elo: user.elo || 1200,
        status: status,
        online_at: new Date().toISOString(),
      });
    }
  };

  const startMultiplayerGame = (roomData, mySide) => {
    const gameChannel = supabase.channel(`room_${roomData.id}`);

    gameChannel
      .on('broadcast', { event: 'move' }, (payload) => {
        handleMoveImpact(payload.payload, true);
      })
      .on('broadcast', { event: 'resign' }, async (payload) => {
        if (payload.payload.from !== userRef.current.username) {
          await finalizeGame(userRef.current.username, 'Resignation');
        }
      })
      .on('broadcast', { event: 'draw_offer' }, (payload) => {
        if (payload.payload.from !== userRef.current.username) {
           if (window.confirm('Opponent offered a draw. Accept?')) {
             gameChannel.send({
               type: 'broadcast',
               event: 'draw_response',
               payload: { accepted: true, from: userRef.current.username }
             });
             finalizeGame(null, 'Mutual Agreement', true);
           }
        }
      })
      .on('broadcast', { event: 'draw_response' }, (payload) => {
         if (payload.payload.accepted && payload.payload.from !== userRef.current.username) {
            finalizeGame(null, 'Mutual Agreement', true);
         }
      })
      .subscribe();

    setRoom({ ...roomData, channel: gameChannel });
    setPlayerSide(mySide);
    setIsMultiplayer(true);
    setCurrentView('game');
    setIncomingChallenge(null);
    setP1Time(600);
    setP2Time(600);
    resetGame();
    updateLobbyStatus('IN_GAME');
  };

  const handleAcceptChallenge = (challenge) => {
    const roomId = Math.random().toString(36).substring(7);
    const roomData = {
      id: roomId,
      players: [
        { username: challenge.from.username, side: 1, elo: challenge.from.elo },
        { username: user.username, side: 2, elo: user.elo }
      ]
    };

    channel.send({
      type: 'broadcast',
      event: 'challenge_response',
      payload: { 
        to: challenge.from.username, 
        accepted: true, 
        roomData, 
        side: 1,
        challengeId: challenge.challengeId 
      }
    });

    startMultiplayerGame(roomData, 2);
    setIncomingChallenge(null);
  };

  const handleDeclineChallenge = (challenge) => {
    channel.send({
      type: 'broadcast',
      event: 'challenge_response',
      payload: { to: challenge.from.username, accepted: false }
    });
    setIncomingChallenge(null);
  };

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

  const handleResign = async () => {
    if (!winnerRef.current && window.confirm('Are you sure you want to resign?')) {
      if (isMultiplayer && room?.channel) {
        room.channel.send({
          type: 'broadcast',
          event: 'resign',
          payload: { from: user.username }
        });
        const opponent = room.players.find(p => p.username !== user.username);
        await finalizeGame(opponent.username, 'Resignation');
      } else {
        setWinner(currentPlayer === 1 ? 'Player 2' : user?.username || 'Player 1');
      }
    }
  };

  const handleOfferDraw = () => {
    if (!winnerRef.current) {
      if (isMultiplayer && room?.channel) {
        room.channel.send({
          type: 'broadcast',
          event: 'draw_offer',
          payload: { from: user.username }
        });
        alert('Draw offer sent');
      } else {
        if (window.confirm('Propose a draw?')) {
          setWinner('Draw');
        }
      }
    }
  };

  const emitMove = (moveData) => {
    if (isMultiplayer && room?.channel) {
      room.channel.send({
        type: 'broadcast',
        event: 'move',
        payload: moveData
      });
    }
  };

  const handleMoveImpact = useCallback((moveData, isFromOpponent = false) => {
    const { boardState, unplacedState, playerMoved, nextTurnState, nextMills, nextPlayer, isWin, type, nodeId, fromNode, nextPhase } = moveData;

    setBoard(boardState);
    setUnplacedPieces(unplacedState);
    setCurrentPlayer(nextPlayer);
    setTurnState(nextTurnState);
    if (nextPhase) setGamePhase(nextPhase);
    setActiveMills(nextMills || []);
    if (isWin) finalizeGame(isWin, 'Defeat');
    if (nextTurnState === 'IDLE') setActiveNode(null);

    if (isFromOpponent) {
      addMoveToHistory(playerMoved, fromNode, nodeId, type);
    }
  }, []);

  const addMoveToHistory = (player, from, to, type) => {
    const label = (idx) => idx === null ? '' : idx + 1;
    const playerTag = player === 1 ? 'W' : 'B';

    let moveStr = '';
    if (type === 'PLACE') moveStr = `${playerTag}: @Node ${label(to)}`;
    else if (type === 'REMOVE') moveStr = `${playerTag}: Captured @${label(to)}`;
    else moveStr = `${playerTag}: ${label(from)} -> ${label(to)}`;

    setMoveHistory(prev => [...prev, moveStr]);
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
    let nextPhaseValue = gamePhase;
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
        if (nextUnplaced[1] === 0 && nextUnplaced[2] === 0) {
          nextPhaseValue = 'PLAYING';
          setGamePhase('PLAYING');
        }
      }

      const moveData = {
        nodeId,
        type: 'REMOVE',
        boardState: nextBoard,
        unplacedState: nextUnplaced,
        playerMoved: currentPlayer,
        nextTurnState: nextTurn,
        nextPlayer,
        isWin,
        nextPhase: nextPhaseValue
      };

      setBoard(nextBoard);
      setTurnState(nextTurn);
      setCurrentPlayer(nextPlayer);
      setActiveMills([]);
      if (isWin) finalizeGame(isWin, 'Defeat');
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
        if (nextUnplaced[1] === 0 && nextUnplaced[2] === 0) {
          nextPhaseValue = 'PLAYING';
          setGamePhase('PLAYING');
        }
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
        isWin: null,
        nextPhase: nextPhaseValue
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
              isWin,
              nextPhase: nextPhaseValue
            };

            setBoard(nextBoard);
            setTurnState(nextTurn);
            setActiveMills(nextMills);
            setCurrentPlayer(nextPlayer);
            setActiveNode(null);
            if (isWin) finalizeGame(isWin, 'Defeat');
            addMoveToHistory(currentPlayer, activeNode, nodeId, 'MOVE');
            if (isMultiplayer) emitMove(moveData);
          }
        }
      }
    }
  };


  const handleQuitGame = () => {
    if (isMultiplayer && room?.channel) {
       room.channel.unsubscribe();
    }
    updateLobbyStatus('AVAILABLE');
    setRoom(null);
    setIsMultiplayer(false);
    setIsBotGame(false);
    setBot(null);
    setCurrentView('dashboard');
    setIsFocusMode(false);
    setP1Time(600);
    setP2Time(600);
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
    setPlayerSide(1); 
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

  const opponentInfo = isMultiplayer 
    ? room.players.find(p => p.username !== user.username) 
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
      return <PlayOnline supabase={supabase} channel={channel} onlineUsers={onlineUsers} />;
    }
    if (currentView === 'play_bots') {
      return <BotSelection onSelectBot={handleSelectBot} onBack={() => setCurrentView('dashboard')} />;
    }

    return (
      <main className={`main-layout ${isFocusMode ? 'focus-layout-active' : ''}`}>
        {isFocusMode && (
          <div className="focus-sidebar-left">
             <div className="focus-avatar-box opponent">
                <div className="avatar-med">{opponentInfo.username[0].toUpperCase()}</div>
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
                  {opponentInfo.avatar ? (
                    <img src={opponentInfo.avatar} alt="" className="player-img-avatar" />
                  ) : (
                    opponentInfo.username[0].toUpperCase()
                  )}
                </div>
                <div className="player-name-badges">
                  <span className="player-name">{opponentInfo.username}</span>
                  <span className="rating-badge">{opponentInfo.elo || 1200}</span>
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
