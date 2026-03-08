import React, { useState } from 'react';
import { Clock, Play, ChevronLeft, User, UserPlus, Zap, Flame, Timer, Hourglass, ChevronDown } from 'lucide-react';
import Board from '../Board';
import './GameSetup.css';
import '../Learn.css';

const TIME_OPTIONS = [
  { label: '1 min', seconds: 60, type: 'Bullet', icon: <Zap size={18} /> },
  { label: '3 min', seconds: 180, type: 'Blitz', icon: <Flame size={18} /> },
  { label: '5 min', seconds: 300, type: 'Blitz', icon: <Flame size={18} /> },
  { label: '10 min', seconds: 600, type: 'Rapid', icon: <Timer size={18} /> },
  { label: '30 min', seconds: 1800, type: 'Classical', icon: <Hourglass size={18} /> },
];

const PREVIEW_BOARD = Array(24).fill(null);
[0, 1, 2, 8, 9, 10].forEach((id, i) => {
  PREVIEW_BOARD[id] = i < 3 ? 1 : 2;
});

export default function GameSetup({ onStart, onBack }) {
  const [selectedTime, setSelectedTime] = useState(TIME_OPTIONS[3]); // Default 10 min
  const [p1Name, setP1Name] = useState('Player 1');
  const [p2Name, setP2Name] = useState('Player 2');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="interactive-lesson-layout setup-layout-override">
      {/* Left Column: Board Visual */}
      <div className="lesson-left-col board-preview-col">
        <div className="interactive-board-wrapper full-size-board">
          <Board 
            board={PREVIEW_BOARD}
            onNodeClick={() => {}}
            highlightNodes={[]}
          />
        </div>
      </div>

      {/* Right Column: Setup Panel */}
      <div className="lesson-right-col setup-panel-col">
        <div className="lesson-panel-header">
          <button className="back-icon-btn" onClick={onBack}>
            <ChevronLeft size={20} />
          </button>
          <div className="lesson-title-area">
             <span className="learn-icon">🎮</span> 
             <h2>New Game</h2>
          </div>
        </div>

        <div className="lesson-panel-body setup-panel-body">
          <div className="setup-section-inline">
            <div className="section-label">
              <Clock size={18} />
              <span>Time Control</span>
            </div>
            
            <div className="custom-dropdown-container">
              <button 
                className="dropdown-trigger" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="selected-info">
                  <span className={`icon-wrapper ${selectedTime.type.toLowerCase()}`}>
                    {selectedTime.icon}
                  </span>
                  <div className="text-info">
                    <span className="val">{selectedTime.label}</span>
                    <span className="type">{selectedTime.type}</span>
                  </div>
                </div>
                <ChevronDown size={20} className={`chevron ${isDropdownOpen ? 'open' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="dropdown-menu">
                  {TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      className={`dropdown-item ${selectedTime.label === opt.label ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedTime(opt);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span className={`icon-wrapper ${opt.type.toLowerCase()}`}>
                        {opt.icon}
                      </span>
                      <div className="text-info">
                        <span className="val">{opt.label}</span>
                        <span className="type">{opt.type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="setup-section-inline">
            <div className="section-label">
              <UserPlus size={18} />
              <span>Players</span>
            </div>
            <div className="players-stack">
              <div className="player-input-box">
                 <User size={16} className="input-icon" />
                 <input 
                  type="text" 
                  value={p1Name} 
                  onChange={(e) => setP1Name(e.target.value)} 
                  placeholder="White Player"
                 />
              </div>
              <div className="player-input-box">
                 <User size={16} className="input-icon" />
                 <input 
                  type="text" 
                  value={p2Name} 
                  onChange={(e) => setP2Name(e.target.value)} 
                  placeholder="Black Player"
                 />
              </div>
            </div>
          </div>
        </div>

        <div className="lesson-panel-footer">
          <div className="footer-title">
            <h3>Local Match</h3>
            <span className="step-counter">{selectedTime.label} • {selectedTime.type}</span>
          </div>
          <div className="footer-actions">
            <button className="btn-chess btn-chess-primary full-w" onClick={() => onStart(selectedTime.seconds)}>
              <Play size={20} fill="currentColor" />
              START
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

