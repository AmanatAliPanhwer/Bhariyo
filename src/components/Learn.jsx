import React, { useState, useEffect } from 'react';
import Board from './Board';
import './Learn.css';

// Helper to quickly build boards
const getBoardWith = (positions) => {
  const b = Array(24).fill(null);
  if (positions[1]) positions[1].forEach(i => b[i] = 1);
  if (positions[2]) positions[2].forEach(i => b[i] = 2);
  return b;
};

const LESSONS = [
  {
    id: 'seesaw',
    title: '1. The Seesaw (Double-Mill)',
    desc: 'The deadliest trap in Bhariyo. Master the art of the infinite pound.',
    steps: [
      {
        instruction: "You have a strong setup. Click the highlighted node to complete the outer mill.",
        board: getBoardWith({1: [0, 2, 8, 10], 2: [3, 4, 5, 23, 22]}),
        highlightNodes: [1],
        expected: { type: 'PLACE', nodeId: 1 },
      },
      {
        instruction: "Mill formed! Now 'pound' (remove) the highlighted Black piece by clicking it.",
        board: getBoardWith({1: [0, 1, 2, 8, 10], 2: [3, 4, 5, 23, 22]}),
        highlightNodes: [4],
        removableNodes: [4],
        activeMills: [[0, 1, 2]],
        expected: { type: 'REMOVE', nodeId: 4 },
      },
      {
        instruction: "Black moved. Now, slide your shared piece down to complete the inner mill!",
        board: getBoardWith({1: [0, 1, 2, 8, 10], 2: [3, 5, 23, 22, 12]}),
        highlightNodes: [1, 9],
        expected: { type: 'MOVE', fromId: 1, toId: 9 },
      },
      {
        instruction: "Another mill! You can pound again. This is the Seesaw—move back and forth to dominate.",
        board: getBoardWith({1: [0, 2, 8, 9, 10], 2: [3, 5, 23, 22, 12]}),
        highlightNodes: [12],
        removableNodes: [12],
        activeMills: [[8, 9, 10]],
        expected: { type: 'REMOVE', nodeId: 12 },
      }
    ]
  },
  {
    id: 'midpoint',
    title: '2. Midpoint Dominance',
    desc: 'Learn why the center of the lines is more powerful than the corners.',
    steps: [
      {
        instruction: "Corners only give you 2 directions. Midpoints give you 3 or 4! Click the highlighted midpoint to claim the center.",
        board: getBoardWith({2: [0]}),
        highlightNodes: [9],
        expected: { type: 'PLACE', nodeId: 9 }
      },
      {
        instruction: "Now place another piece on a midpoint. Control the midpoints early to dictate the game's flow.",
        board: getBoardWith({1: [9], 2: [0, 6]}),
        highlightNodes: [11],
        expected: { type: 'PLACE', nodeId: 11 }
      }
    ]
  },
  {
    id: 'blockade',
    title: '3. The "Blockade" Gambit',
    desc: 'Sometimes defense is the best offense. Suffocate your opponent.',
    steps: [
      {
        instruction: "Black is about to form a mill at the top right! Place your piece there to block them.",
        board: getBoardWith({1: [8, 10], 2: [0, 1, 6, 7]}),
        highlightNodes: [2],
        expected: { type: 'PLACE', nodeId: 2 }
      },
      {
        instruction: "Great block! Now block their other potential mill on the left side.",
        board: getBoardWith({1: [8, 10, 2], 2: [0, 1, 6, 7, 22]}),
        highlightNodes: [23],
        expected: { type: 'PLACE', nodeId: 23 }
      }
    ]
  },
  {
    id: 'flying',
    title: '4. The "Flying" Endgame',
    desc: 'Down to 3 pieces? You can now teleport anywhere on the board.',
    steps: [
      {
        instruction: "You are down to your last 3 pieces, so you can FLY! Select your piece at the top left.",
        board: getBoardWith({1: [0, 12, 13], 2: [2, 4, 6, 8, 16]}),
        highlightNodes: [0],
        expected: { type: 'SELECT', nodeId: 0 }
      },
      {
        instruction: "Now fly directly to the middle bottom to complete a unexpected mill!",
        board: getBoardWith({1: [0, 12, 13], 2: [2, 4, 6, 8, 16]}),
        highlightNodes: [14],
        expected: { type: 'MOVE', fromId: 0, toId: 14 }
      }
    ]
  },
  {
    id: 'pound',
    title: '5. The Tactical Pound',
    desc: 'Never eat a random piece. Always target the biggest threat.',
    steps: [
      {
        instruction: "You just formed a mill! Black has a dangerous piece at 8 forming a trap. Click it to break their structure.",
        board: getBoardWith({1: [0, 1, 2], 2: [8, 15, 23]}),
        highlightNodes: [8],
        removableNodes: [8],
        activeMills: [[0, 1, 2]],
        expected: { type: 'REMOVE', nodeId: 8 }
      }
    ]
  },
  {
    id: 'triangle',
    title: '6. The Triangle Trap',
    desc: 'Force your opponent into a defensive disadvantage.',
    steps: [
      {
        instruction: "Setting up a triangle early forces Black to block you, leaving other midpoints open. Place your piece at node 10.",
        board: getBoardWith({1: [8, 9]}),
        highlightNodes: [10],
        expected: { type: 'PLACE', nodeId: 10 }
      }
    ]
  },
  {
    id: 'suffocation',
    title: '7. Endgame: Suffocation',
    desc: 'Victory through immobility.',
    steps: [
      {
        instruction: "Black is nearly trapped. Slide your piece to node 4 to block their last escape route.",
        board: getBoardWith({1: [3, 5, 22], 2: [12, 13, 14, 4]}), // Simplified for tutorial
        highlightNodes: [3, 4],
        expected: { type: 'MOVE', fromId: 3, toId: 4 }
      }
    ]
  },
  {
    id: 'breaking_mill',
    title: '8. Defense: Breaking a Mill',
    desc: 'Stop the pound before it happens.',
    steps: [
      {
        instruction: "Black only needs node 7 to complete a mill. Place your piece there to stop them!",
        board: getBoardWith({2: [6, 0]}),
        highlightNodes: [7],
        expected: { type: 'PLACE', nodeId: 7 }
      }
    ]
  },
  {
    id: 'double_threat',
    title: '9. Efficiency: Double Threat',
    desc: 'One move, two deadly paths.',
    steps: [
      {
        instruction: "You can form a mill in two different directions! Click node 1 to threaten both lines.",
        board: getBoardWith({1: [0, 2, 9, 17]}),
        highlightNodes: [1],
        expected: { type: 'PLACE', nodeId: 1 }
      }
    ]
  }
];

function InteractiveLesson({ lesson, onBack, onNextLesson, isMuted, onToggleMute }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [board, setBoard] = useState(lesson.steps[0].board);
  const [activeNode, setActiveNode] = useState(null);
  const [success, setSuccess] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);

  const step = lesson.steps[stepIndex];

  // TTS Helper
  const speak = (text) => {
    if (isMuted) return;
    window.speechSynthesis.cancel(); // Stop current speech
    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a good female/instructor voice, otherwise default
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Google')));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Reset state and speak instruction when step changes
  useEffect(() => {
    if (!step) return;
    setBoard(step.board);
    setActiveNode(null);
    setSuccess(false);
    
    // Slight delay to ensure it doesn't sound jittery on transition
    const timeout = setTimeout(() => {
      speak(step.instruction);
    }, 100);
    return () => clearTimeout(timeout);
  }, [stepIndex, step]);

  if (!step) return null;

  const handleNextStep = () => {
    if (stepIndex < lesson.steps.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      setLessonComplete(true);
    }
  };

  const handleNodeClick = (nodeId) => {
    if (success || lessonComplete) return;

    const exp = step.expected;

    if (exp.type === 'PLACE') {
      if (nodeId === exp.nodeId) {
        handleSuccess(() => {
          const newBoard = [...board];
          newBoard[nodeId] = 1;
          setBoard(newBoard);
        });
      }
    } else if (exp.type === 'REMOVE') {
      if (nodeId === exp.nodeId) {
        handleSuccess(() => {
          const newBoard = [...board];
          newBoard[nodeId] = null;
          setBoard(newBoard);
        });
      }
    } else if (exp.type === 'SELECT') {
      if (nodeId === exp.nodeId) {
        setActiveNode(nodeId);
        handleSuccess();
      }
    } else if (exp.type === 'MOVE') {
      if (activeNode === null) {
        if (nodeId === exp.fromId) {
          setActiveNode(nodeId);
        }
      } else {
        if (nodeId === exp.toId && activeNode === exp.fromId) {
          handleSuccess(() => {
            const newBoard = [...board];
            newBoard[exp.toId] = 1;
            newBoard[exp.fromId] = null;
            setBoard(newBoard);
            setActiveNode(null);
          });
        } else if (board[nodeId] === 1) {
          setActiveNode(nodeId);
        } else {
          setActiveNode(null);
        }
      }
    }
  };

  const handleSuccess = (stateUpdateFn = () => {}) => {
    stateUpdateFn();
    setSuccess(true);
    speak("Great move!");
  };

  const getHighlights = () => {
    if (success || !step) return [];
    if (step.highlightNodes) return step.highlightNodes;
    const exp = step.expected;
    if (exp.type === 'PLACE') return [exp.nodeId];
    if (exp.type === 'MOVE') {
      if (activeNode === null) return [exp.fromId];
      return [exp.toId];
    }
    if (exp.type === 'REMOVE') return [exp.nodeId];
    return [];
  };

  return (
    <div className="interactive-lesson-layout">
      {/* Left Column: The Board container */}
      <div className="lesson-left-col">
        <div className="interactive-board-wrapper full-size-board">
          <Board 
            board={board}
            onNodeClick={handleNodeClick}
            activeNode={activeNode}
            highlightNodes={getHighlights()}
            activeMills={step.activeMills || []}
            removableNodes={step.removableNodes || []}
          />
        </div>
      </div>

      {/* Right Column: Information Panel */}
      <div className="lesson-right-col">
        <div className="lesson-panel-header">
          <button className="back-icon-btn" onClick={onBack} title="Back to Lessons">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="lesson-title-area">
             <span className="learn-icon">🎓</span> 
             <h2>Learn</h2>
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
              <img src="/usman.png" alt="Coach Avatar" className="avatar-img" title="Usman" />
            </div>
            <div className="coach-bubble-wrapper">
              <div className="coach-bubble">
                {lessonComplete ? (
                  <p>Excellent job! You've mastered this concept. Ready for the next one?</p>
                ) : (
                  <>
                    <p>{step.instruction}</p>
                    {success && <p className="success-text">Great move!</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lesson-panel-footer">
          <div className="footer-title">
            <h3>{lesson.title}</h3>
            <span className="step-counter">Step {stepIndex + 1}/{lesson.steps.length}</span>
          </div>
          <div className="footer-actions">
            <button className="menu-btn" onClick={onBack} title="Lessons Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
            {lessonComplete ? (
              <button className="next-lesson-btn" onClick={onNextLesson}>Next Lesson</button>
            ) : (
              <button 
                className={`next-step-btn ${success ? 'active' : 'disabled'}`} 
                onClick={success ? handleNextStep : undefined}
                disabled={!success}
              >
                {success ? "Next" : "Make a Move"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Learn({ onPlayClick }) {
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('bhariyo_muted') === 'true');
  const [completedLessons, setCompletedLessons] = useState(() => {
    const saved = localStorage.getItem('bhariyo_completed');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('bhariyo_muted', isMuted);
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('bhariyo_completed', JSON.stringify(completedLessons));
  }, [completedLessons]);

  const toggleMute = () => setIsMuted(m => !m);

  const handleSelectLesson = (lesson, index) => {
    const isLocked = index > 0 && !completedLessons.includes(LESSONS[index - 1].id);
    if (isLocked) return;
    setActiveLesson(lesson);
    setActiveLessonIndex(index);
  };

  const handleNextLesson = () => {
    // Mark current as completed
    if (activeLesson && !completedLessons.includes(activeLesson.id)) {
      setCompletedLessons(prev => [...prev, activeLesson.id]);
    }

    const nextIndex = activeLessonIndex + 1;
    if (nextIndex < LESSONS.length) {
      setActiveLesson(LESSONS[nextIndex]);
      setActiveLessonIndex(nextIndex);
    } else {
      setActiveLesson(null);
    }
  };

  if (activeLesson) {
    return (
      <InteractiveLesson 
        key={activeLesson.id}
        lesson={activeLesson} 
        onBack={() => setActiveLesson(null)} 
        onNextLesson={handleNextLesson} 
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />
    );
  }

  // Default Learn landing: board on left, lesson roadmap on right
  const previewLesson = LESSONS[activeLessonIndex] || LESSONS[0];
  const previewBoard = previewLesson.steps[0].board;

  return (
    <div className="interactive-lesson-layout selection-view">
      {/* Left Column: Preview Board */}
      <div className="lesson-left-col">
        <div className="interactive-board-wrapper full-size-board">
          <Board
            board={previewBoard}
            onNodeClick={() => {}}
            highlightNodes={previewLesson.steps[0].highlightNodes || []}
            activeMills={previewLesson.steps[0].activeMills || []}
          />
        </div>
      </div>

      {/* Right Column: Lesson Roadmap */}
      <div className="lesson-right-col">
        <div className="lesson-panel-header">
          <div className="lesson-title-area" style={{ paddingRight: 0 }}>
            <span className="learn-icon">🎓</span>
            <h2>Learn</h2>
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
              <img src="/usman.png" alt="Coach" className="avatar-img" title="Usman" />
            </div>
            <div className="coach-bubble-wrapper">
              <div className="coach-bubble">
                <p>Ready to master Bhariyo? Pick a lesson below to get started!</p>
              </div>
            </div>
          </div>

          <div className="lesson-roadmap">
            {LESSONS.map((lesson, idx) => {
              const isCompleted = completedLessons.includes(lesson.id);
              const isLocked = idx > 0 && !completedLessons.includes(LESSONS[idx - 1].id);
              const isActive = idx === activeLessonIndex;

              return (
                <button
                  key={lesson.id}
                  className={`roadmap-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => handleSelectLesson(lesson, idx)}
                  disabled={isLocked}
                >
                  <span className="roadmap-number">
                    {isCompleted ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg>
                    ) : isLocked ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span className="roadmap-label">{lesson.title.replace(/^\d+\.\s*/, '')}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lesson-panel-footer">
          <div className="footer-title">
            <h3>{previewLesson.title}</h3>
          </div>
          <div className="footer-actions">
            <button className="menu-btn" onClick={onPlayClick} title="Back to Game">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
            </button>
            <button className="next-lesson-btn" onClick={() => handleSelectLesson(previewLesson, activeLessonIndex)}>
              Start Lesson
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

