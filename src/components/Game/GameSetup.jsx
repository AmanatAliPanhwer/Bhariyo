import React, { useState } from 'react';
import { Clock, Play, ChevronLeft, User, UserPlus, Zap, Flame, Timer, Hourglass, ChevronDown, Settings } from 'lucide-react';
import MiniBoard from '../Dashboard/MiniBoard';
import './GameSetup.css';

const TIME_OPTIONS = [
  { label: '1 min', seconds: 60, type: 'Bullet', icon: <Zap size={18} /> },
  { label: '3 min', seconds: 180, type: 'Blitz', icon: <Flame size={18} /> },
  { label: '5 min', seconds: 300, type: 'Blitz', icon: <Flame size={18} /> },
  { label: '10 min', seconds: 600, type: 'Rapid', icon: <Timer size={18} /> },
  { label: '30 min', seconds: 1800, type: 'Classical', icon: <Hourglass size={18} /> },
];

const PREVIEW_BOARD = Array(24).fill(null);
[0, 1, 2, 8, 9, 10, 16, 17, 18, 1, 9, 17, 3, 11, 19, 5, 13, 21].forEach(i => {
    if (i < 24) PREVIEW_BOARD[i] = (i % 2 === 0 ? 1 : 2);
});

export default function GameSetup({ onStart, onBack }) {
  const [selectedTime, setSelectedTime] = useState(TIME_OPTIONS[3]); // Default 10 min
  const [p1Name, setP1Name] = useState('Player 1');
  const [p2Name, setP2Name] = useState('Player 2');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="bot-selection-view">
      <div className="bot-selection-layout">
        <div className="bot-selection-left">
           <div className="selection-board-wrapper">
              <MiniBoard board={PREVIEW_BOARD} />
           </div>
        </div>

        <div className="bot-selection-right">
          <div className="bot-selection-header">
             <button className="back-link" onClick={onBack}>
                <ChevronLeft size={18} />
                <span>Back</span>
             </button>
             <h1>New Game</h1>
          </div>

          <div className="selected-bot-hero">
            <div className="hero-avatar-box">
               <div className="hero-avatar">
                  <Clock size={40} color="white" />
               </div>
            </div>
            <div className="hero-details">
               <div className="hero-name-row">
                  <span className="hero-name">{selectedTime.label}</span>
                  <span className="hero-rating">({selectedTime.type})</span>
               </div>
               <div className="hero-quote-box">
                  <UserPlus size={14} className="quote-icon" />
                  <p>{p1Name} vs {p2Name}</p>
               </div>
            </div>
          </div>
          
          <div className="selection-scroll-area setup-padding">
            <div className="setup-section-plain">
                <div className="section-label-simple">Time Control</div>
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

            <div className="setup-section-plain">
                <div className="section-label-simple">Players</div>
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

          <div className="selection-footer">
            <button className="btn-chess btn-chess-primary btn-large full-w" onClick={() => onStart(selectedTime.seconds)}>
               <Play size={20} fill="currentColor" />
               <span>Start Game</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
