import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import MiniBoard from './MiniBoard';
import './Dashboard.css';

// Sample board configurations for previews
const onlineBoard = Array(24).fill(null);
[0, 9, 21].forEach(i => onlineBoard[i] = 1);
[1, 2, 22].forEach(i => onlineBoard[i] = 2);

const localBoard = Array(24).fill(null);
[3, 10, 18, 5].forEach(i => localBoard[i] = 1);
[4, 11, 19, 7].forEach(i => localBoard[i] = 2);

const learnBoard = Array(24).fill(null);
[0, 1, 2].forEach(i => learnBoard[i] = 1); // A mill example

const puzzlesBoard = Array(24).fill(null);
[16, 17, 18, 9, 1].forEach(i => puzzlesBoard[i] = 1);

const botsBoard = Array(24).fill(null);
[0, 1, 2, 8, 9, 10, 16, 17, 18].forEach(i => botsBoard[i] = (i % 2 === 0 ? 1 : 2));

export default function Dashboard({ onPlayLocal, onPlayOnline, onPlayBots, onLearnClick, onPuzzlesClick }) {
  const { user } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <header className="dashboard-header">
          <div className="user-hero">
            <div className="hero-avatar">{user.username[0].toUpperCase()}</div>
            <div className="hero-text">
              <h1>{user.username}</h1>
              <p>Member since March 2026</p>
            </div>
          </div>

          <div className="stats-header-row">
            <div className="header-stat">
              <span className="h-stat-label">📈 Rating</span>
              <span className="h-stat-value">{user.elo || 1200}</span>
            </div>
            <div className="header-stat">
              <span className="h-stat-label">🏆 Wins</span>
              <span className="h-stat-value">{user.wins || 0}</span>
            </div>
            <div className="header-stat">
              <span className="h-stat-label">🎮 Games</span>
              <span className="h-stat-value">{user.games_played || 0}</span>
            </div>
          </div>
        </header>

        <div className="square-cards-grid">
          <button className="square-card glass-morphism" onClick={onPlayOnline}>
             <div className="card-preview">
                <MiniBoard board={onlineBoard} />
             </div>
             <div className="card-footer">
                <span>Play Online</span>
             </div>
          </button>

          <button className="square-card glass-morphism" onClick={onPlayBots}>
             <div className="card-preview">
                <MiniBoard board={botsBoard} />
             </div>
             <div className="card-footer">
                <span>Play Bots</span>
             </div>
          </button>

          <button className="square-card glass-morphism" onClick={onPlayLocal}>
             <div className="card-preview">
                <MiniBoard board={localBoard} />
             </div>
             <div className="card-footer">
                <span>Play Local</span>
             </div>
          </button>

          <button className="square-card glass-morphism" onClick={onPuzzlesClick}>
             <div className="card-preview">
                <MiniBoard board={puzzlesBoard} />
             </div>
             <div className="card-footer">
                <span>Daily Puzzles</span>
             </div>
          </button>

          <button className="square-card glass-morphism" onClick={onLearnClick}>
             <div className="card-preview">
                <MiniBoard board={learnBoard} />
             </div>
             <div className="card-footer">
                <span>Learn Rules</span>
             </div>
          </button>
        </div>
      </div>
    </div>
  );
}
