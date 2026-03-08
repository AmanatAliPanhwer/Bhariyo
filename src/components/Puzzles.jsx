import React, { useState, useEffect } from 'react';
import Board from './Board';
import './Learn.css'; // Reuse Learn.css for absolute consistency

const getBoardWith = (positions) => {
  const b = Array(24).fill(null);
  if (positions[1]) positions[1].forEach(i => b[i] = 1);
  if (positions[2]) positions[2].forEach(i => b[i] = 2);
  return b;
};

const FINAL_PUZZLES = [
  {
    id: 'p1',
    title: '1. Placement: Quick Mill',
    difficulty: 'Easy',
    desc: 'Complete the mill on the outer square.',
    instruction: "Place your piece to complete the mill on the outer square.",
    board: getBoardWith({1: [0, 2], 2: [8, 10]}),
    expected: { type: 'PLACE', nodeId: 1 },
  },
  {
    id: 'p2',
    title: '2. Defense: Blockade',
    difficulty: 'Easy',
    desc: 'Stop Black from forming a mill.',
    instruction: "Black is about to form a mill in the middle square (8, 9, 10). Block them!",
    board: getBoardWith({1: [0, 5], 2: [8, 10]}),
    expected: { type: 'PLACE', nodeId: 9 },
  },
  {
    id: 'p3',
    title: '3. Movement: The Strike',
    difficulty: 'Medium',
    desc: 'Slide into a winning cross-square mill.',
    instruction: "Slide your piece at node 8 to node 9 to complete a cross-square mill (1, 9, 17).",
    board: getBoardWith({1: [1, 17, 8], 2: [3, 5, 21, 23]}),
    expected: { type: 'MOVE', fromId: 8, toId: 9 },
  },
  {
    id: 'p4',
    title: '4. Flying: Anywhere',
    difficulty: 'Hard',
    desc: 'Teleport to victory.',
    instruction: "You have only 3 pieces, so you can FLY. Fly your piece at node 0 to node 21 to form a mill!",
    board: getBoardWith({1: [0, 5, 13], 2: [2, 4, 11, 12, 14, 16]}),
    expected: { type: 'MOVE', fromId: 0, toId: 21 },
  }
];

function InteractivePuzzle({ puzzle, onBack, onNextPuzzle, isMuted, onToggleMute }) {
  const [board, setBoard] = useState(puzzle.board);
  const [activeNode, setActiveNode] = useState(null);
  const [success, setSuccess] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // TTS Helper
  const speak = (text) => {
    if (isMuted) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Google')));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    setBoard(puzzle.board);
    setActiveNode(null);
    setSuccess(false);
    setFeedback(null);
    setIsProcessing(false);
    
    const timeout = setTimeout(() => {
      speak(puzzle.instruction);
    }, 100);
    return () => clearTimeout(timeout);
  }, [puzzle]);

  const handleNodeClick = (nodeId) => {
    if (success || isProcessing) return;

    const exp = puzzle.expected;
    const clickedPlayer = board[nodeId];

    if (exp.type === 'PLACE') {
      if (clickedPlayer !== null) return;

      const newBoard = [...board];
      newBoard[nodeId] = 1;
      setBoard(newBoard);

      if (nodeId === exp.nodeId) {
        handleSuccess();
      } else {
        handleWrongMove();
      }
    } else if (exp.type === 'MOVE') {
      if (activeNode === null) {
        if (clickedPlayer === 1) {
          setActiveNode(nodeId);
        }
      } else {
        if (clickedPlayer === 1) {
           setActiveNode(nodeId);
           return;
        }
        
        if (clickedPlayer !== null) return;

        // Visual move
        const newBoard = [...board];
        newBoard[nodeId] = 1;
        newBoard[activeNode] = null;
        setBoard(newBoard);

        if (nodeId === exp.toId && activeNode === exp.fromId) {
          handleSuccess();
        } else {
          handleWrongMove();
        }
        setActiveNode(null);
      }
    }
  };

  const handleSuccess = () => {
    setSuccess(true);
    setFeedback("Excellent! You found the winning move.");
    speak("Excellent! You found the winning move.");
  };

  const handleWrongMove = () => {
    setIsProcessing(true);
    setFeedback("Wrong move! Try again.");
    speak("Wrong move! Try again.");
    
    setTimeout(() => {
      setBoard(puzzle.board);
      setFeedback(null);
      setIsProcessing(false);
    }, 1200);
  };

  return (
    <div className="interactive-lesson-layout">
      {/* Left Column: Board */}
      <div className="lesson-left-col">
        <div className="interactive-board-wrapper full-size-board">
          <Board 
            board={board}
            onNodeClick={handleNodeClick}
            activeNode={activeNode}
            highlightNodes={success ? [] : (activeNode !== null ? [puzzle.expected.toId] : [])}
          />
        </div>
      </div>

      {/* Right Column: Panel */}
      <div className="lesson-right-col">
        <div className="lesson-panel-header">
          <button className="back-icon-btn" onClick={onBack} title="Back to Puzzles">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="lesson-title-area">
             <span className="learn-icon">🧩</span> 
             <h2>Puzzles</h2>
          </div>
          <button className={`sound-toggle-btn ${isMuted ? 'muted' : ''}`} onClick={onToggleMute} title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            )}
          </button>
        </div>

        <div className="lesson-panel-body">
          <div className="coach-section">
            <div className="coach-avatar">
              <img src="/usman.png" alt="Coach Avatar" className="avatar-img" />
            </div>
            <div className="coach-bubble-wrapper">
              <div className="coach-bubble">
                {feedback ? (
                  <p className={success ? "" : "error-text"}>{feedback}</p>
                ) : (
                  <p>{puzzle.instruction}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lesson-panel-footer">
          <div className="footer-title">
            <h3>{puzzle.title}</h3>
            <div style={{ marginTop: '0.4rem' }}>
                <span className={`difficulty-badge ${puzzle.difficulty.toLowerCase()}`}>
                    {puzzle.difficulty}
                </span>
            </div>
          </div>
          <div className="footer-actions">
            <button className="menu-btn" onClick={onBack} title="Puzzles Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
            {success ? (
              <button className="next-lesson-btn" onClick={onNextPuzzle}>Next Puzzle</button>
            ) : (
              <button className="next-step-btn disabled" disabled>Solve Puzzle</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Puzzles({ onBackToDashboard }) {
  const [activePuzzle, setActivePuzzle] = useState(null);
  const [activePuzzleIndex, setActivePuzzleIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('bhariyo_muted') === 'true');
  const [completedPuzzles, setCompletedPuzzles] = useState(() => {
    const saved = localStorage.getItem('bhariyo_completed_puzzles');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('bhariyo_muted', isMuted);
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('bhariyo_completed_puzzles', JSON.stringify(completedPuzzles));
  }, [completedPuzzles]);

  const toggleMute = () => setIsMuted(m => !m);

  const handleSelectPuzzle = (puzzle, index) => {
    setActivePuzzle(puzzle);
    setActivePuzzleIndex(index);
  };

  const handleNextPuzzle = () => {
    if (activePuzzle && !completedPuzzles.includes(activePuzzle.id)) {
      setCompletedPuzzles(prev => [...prev, activePuzzle.id]);
    }

    const nextIndex = activePuzzleIndex + 1;
    if (nextIndex < FINAL_PUZZLES.length) {
      setActivePuzzle(FINAL_PUZZLES[nextIndex]);
      setActivePuzzleIndex(nextIndex);
    } else {
      setActivePuzzle(null);
    }
  };

  if (activePuzzle) {
    return (
      <InteractivePuzzle 
        puzzle={activePuzzle} 
        onBack={() => setActivePuzzle(null)} 
        onNextPuzzle={handleNextPuzzle}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />
    );
  }

  const previewPuzzle = FINAL_PUZZLES[activePuzzleIndex] || FINAL_PUZZLES[0];
  const previewBoard = previewPuzzle.board;

  return (
    <div className="interactive-lesson-layout">
      {/* Left Column: Preview Board */}
      <div className="lesson-left-col">
        <div className="interactive-board-wrapper full-size-board">
          <Board
            board={previewBoard}
            onNodeClick={() => {}}
            highlightNodes={[]}
          />
        </div>
      </div>

      {/* Right Column: Puzzle Roadmap */}
      <div className="lesson-right-col">
        <div className="lesson-panel-header">
          <button className="back-icon-btn" onClick={onBackToDashboard} title="Back to Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="lesson-title-area">
            <span className="learn-icon">🧩</span>
            <h2>Puzzles</h2>
          </div>
          <button className={`sound-toggle-btn ${isMuted ? 'muted' : ''}`} onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            )}
          </button>
        </div>

        <div className="lesson-panel-body">
          <div className="coach-section">
            <div className="coach-avatar">
              <img src="/usman.png" alt="Coach" className="avatar-img" />
            </div>
            <div className="coach-bubble-wrapper">
              <div className="coach-bubble">
                <p>Sharpen your skills with daily challenges! Can you find the winning move in every scenario?</p>
              </div>
            </div>
          </div>

          <div className="lesson-roadmap">
            {FINAL_PUZZLES.map((puzzle, idx) => {
              const isCompleted = completedPuzzles.includes(puzzle.id);
              const isActive = idx === activePuzzleIndex;

              return (
                <button
                  key={puzzle.id}
                  className={`roadmap-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => handleSelectPuzzle(puzzle, idx)}
                >
                  <span className="roadmap-number">
                    {isCompleted ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="roadmap-label">{puzzle.title.replace(/^\d+\.\s*/, '')}</span>
                    <span className={`roadmap-meta difficulty-text-${puzzle.difficulty.toLowerCase()}`}>{puzzle.difficulty}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lesson-panel-footer">
          <div className="footer-title">
            <h3>{previewPuzzle.title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>{previewPuzzle.desc}</p>
          </div>
          <div className="footer-actions">
            <button className="menu-btn" onClick={onBackToDashboard} title="Back to Game">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
            </button>
            <button className="next-lesson-btn" onClick={() => handleSelectPuzzle(previewPuzzle, activePuzzleIndex)}>
              Solve Puzzle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
