import React, { useState } from 'react';
import { 
  ChevronRight, 
  Lock, 
  User, 
  Sword, 
  MessageSquare, 
  Trophy, 
  ChevronLeft, 
  ChevronDown, 
  Settings 
} from 'lucide-react';
import MiniBoard from '../Dashboard/MiniBoard';
import './BotSelection.css';

const BOTS = {
  Adaptive: [
    { id: 'amanat', name: 'Amanat', rating: 200, avatar: '/Amanat.png', quote: "I will study your every move, player.", level: 'INTERMEDIATE', type: 'ADAPTIVE' },
    { id: 'mazher', name: 'Mazher', rating: 200, avatar: '/Mazher.png', quote: "The more we play, the better I understand you.", level: 'INTERMEDIATE', type: 'ADAPTIVE' },
    { id: 'hasnain', name: 'Hasnain', rating: 200, avatar: '/Hasnain.png', quote: "Your strategies won't work twice against me.", level: 'INTERMEDIATE', type: 'ADAPTIVE' },
    { id: 'umair', name: 'Umair', rating: 200, avatar: '/umair.png', quote: "I am your shadow on the board.", level: 'INTERMEDIATE', type: 'ADAPTIVE' },
  ],
  Beginner: [
    { id: 'gulloo', name: 'Gulloo', rating: 250, avatar: '/gulloo.png', quote: "Ada, I'm just learning. Be gentle!", level: 'NOOB' },
    { id: 'pushpa', name: 'Pushpa', rating: 400, avatar: '/Puspha.png', quote: "The board looks like a beautiful ralli!", level: 'NOOB' },
    { id: 'sachal', name: 'Sachal', rating: 600, avatar: '/sachal.png', quote: "Let's play a game over some Sindhi tea.", level: 'BEGINNER' },
    { id: 'jamalo', name: 'Jamalo', rating: 700, avatar: '/Jamalo.png', quote: "Ho Jamalo! Let's see your moves.", level: 'BEGINNER' },
    { id: 'leela', name: 'Leela', rating: 800, avatar: '/leela.png', quote: "Chanesar taught me some tricks!", level: 'BEGINNER' },
  ],
  Intermediate: [
    { id: 'kundan', name: 'Kundan', rating: 1000, avatar: '/kundan.png', quote: "I've watched the elders play this in the village square.", level: 'BEGINNER' },
    { id: 'zohra', name: 'Zohra', rating: 1200, avatar: '/Zohra.png', quote: "Strategy is like embroidery, every move counts.", level: 'INTERMEDIATE' },
    { id: 'naresh', name: 'Naresh', rating: 1400, avatar: '/Naresh.png', quote: "I don't lose easily when the stakes are high.", level: 'INTERMEDIATE' },
    { id: 'murtaza', name: 'Murtaza', rating: 1600, avatar: '/Murtaza.png', quote: "Patience is a virtue in this game.", level: 'INTERMEDIATE' },
    { id: 'deepak', name: 'Deepak', rating: 1800, avatar: '/Deepak.png', quote: "Let's light up the board with some tactics.", level: 'INTERMEDIATE' },
  ],
  Advanced: [
    { id: 'wadero', name: 'Wadero', rating: 2000, avatar: '/wadero.png', quote: "The board is my kingdom, and I know every corner.", level: 'ADVANCED' },
    { id: 'dharam', name: 'Dharamdas', rating: 2200, avatar: '/Dharamdas.png', quote: "Wisdom comes to those who wait for the right move.", level: 'ADVANCED' },
    { id: 'shahbaaz', name: 'Shahbaaz', rating: 2500, avatar: '/shahbaaz.png', quote: "My moves are as swift as a falcon.", level: 'ADVANCED' },
    { id: 'kinza', name: 'Kinza', rating: 2800, avatar: '/kinza.png', quote: "The fragrance of victory is near.", level: 'ADVANCED' },
  ]
};

const previewBoard = Array(24).fill(null);
[0, 1, 2, 8, 9, 10, 16, 17, 18, 1, 9, 17, 3, 11, 19, 5, 13, 21].forEach(i => {
    if (i < 24) previewBoard[i] = (i % 2 === 0 ? 1 : 2);
});

export default function BotSelection({ onSelectBot, onBack, adaptiveStats, onResetBot, onPreviewBot }) {
  const [selectedBot, setSelectedBot] = useState(BOTS.Adaptive[0]);
  const [expandedCategory, setExpandedCategory] = useState('Beginner');
  const [hoveredBotId, setHoveredBotId] = useState(null);
  const [showLab, setShowLab] = useState(false);

  // Initial fetch for the default selected bot
  React.useEffect(() => {
    if (onPreviewBot) onPreviewBot(BOTS.Adaptive[0]);
  }, []);

  const handleBotClick = (bot) => {
    setSelectedBot(bot);
    if (onPreviewBot) onPreviewBot(bot);
  };

  const renderAvatar = (bot, size = 'small') => {
    const isImage = bot.avatar.startsWith('/');
    const className = size === 'large' ? 'hero-avatar' : 'bot-card-avatar';
    
    if (isImage) {
      return (
        <div className={className}>
          <img src={bot.avatar} alt={bot.name} />
        </div>
      );
    }
    return <div className={className}>{bot.avatar}</div>;
  };

  const handleCategoryClick = (cat) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  return (
    <div className="bot-selection-view">
      <div className="bot-selection-layout">
        <div className="bot-selection-left">
           <div className="selection-board-wrapper">
              <MiniBoard board={previewBoard} />
           </div>
        </div>

        <div className="bot-selection-right">
          <div className="bot-selection-header">
             <button className="back-link" onClick={onBack}>
                <ChevronLeft size={18} />
                <span>Back</span>
             </button>
             <h1>Play Bots</h1>
          </div>

          <div className="selected-bot-hero">
            <div className="hero-avatar-box">
               {renderAvatar(selectedBot, 'large')}
            </div>
            <div className="hero-details">
               <div className="hero-name-row">
                  <span className="hero-name">{selectedBot.name}</span>
                  <span className="hero-rating">({selectedBot.rating})</span>
                  {selectedBot.type === 'ADAPTIVE' && (
                    <button className="bot-settings-btn" onClick={() => setShowLab(true)} title="Intelligence Lab">
                      <Settings size={20} />
                    </button>
                  )}
               </div>
               <div className="hero-quote-box">
                  <MessageSquare size={14} className="quote-icon" />
                  <p>{selectedBot.quote}</p>
               </div>
            </div>
          </div>
          
          {showLab && selectedBot.type === 'ADAPTIVE' && (
            <div className="lab-overlay" onClick={() => setShowLab(false)}>
              <div className="lab-modal glass-morphism" onClick={e => e.stopPropagation()}>
                <div className="lab-modal-header">
                  <h2>{selectedBot.name}'s Intelligence Lab</h2>
                  <button className="close-lab-btn" onClick={() => setShowLab(false)}>×</button>
                </div>
                
                <div className="bot-intelligence-lab-content">
                  {!adaptiveStats ? (
                    <div className="lab-loading">Analyzing Brain Patterns...</div>
                  ) : (
                    <>
                      <div className="lab-stats-summary">
                        <div className="stat-pill">
                          <span className="label">Games Studied</span>
                          <span className="value">{adaptiveStats.games_played}</span>
                        </div>
                        <div className="stat-pill">
                          <span className="label">Current Elo</span>
                          <span className="value">{selectedBot.rating}</span>
                        </div>
                      </div>
                      
                      <div className="weights-grid">
                        <div className="weight-bar-item">
                          <div className="weight-info">
                            <span>Material Priority</span>
                            <span>{Math.round(adaptiveStats.weights.material)}</span>
                          </div>
                          <div className="bar-bg"><div className="bar-fill" style={{ width: `${(adaptiveStats.weights.material / 400) * 100}%` }}></div></div>
                        </div>
                        <div className="weight-bar-item">
                          <div className="weight-info">
                            <span>Mill Aggression</span>
                            <span>{Math.round(adaptiveStats.weights.mills)}</span>
                          </div>
                          <div className="bar-bg"><div className="bar-fill" style={{ width: `${(adaptiveStats.weights.mills / 250) * 100}%` }}></div></div>
                        </div>
                        <div className="weight-bar-item">
                          <div className="weight-info">
                            <span>Board Mobility</span>
                            <span>{Math.round(adaptiveStats.weights.mobility)}</span>
                          </div>
                          <div className="bar-bg"><div className="bar-fill" style={{ width: `${(adaptiveStats.weights.mobility / 50) * 100}%` }}></div></div>
                        </div>
                      </div>

                      <div className="lab-actions">
                        <p className="lab-help-text">This bot learns specifically from your playstyle. Resetting will wipe its memory of you.</p>
                        <button 
                          className="reset-intelligence-btn"
                          onClick={() => {
                            if(window.confirm(`Wipe ${selectedBot.name}'s memory? This cannot be undone.`)) {
                              onResetBot(selectedBot.name);
                            }
                          }}
                        >
                          Factory Reset Memory
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="selection-scroll-area">
            {Object.keys(BOTS).map(cat => {
              const isExpanded = expandedCategory === cat;
              return (
                <div key={cat} className={`category-section ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
                  <button className="category-header-btn" onClick={() => handleCategoryClick(cat)}>
                    <div className="cat-header-left">
                      <div className="cat-icon-avatar">
                        <img src={BOTS[cat][0].avatar} alt="" />
                      </div>
                      <span className="cat-name">{cat}</span>
                    </div>
                    <div className="cat-header-right">
                      <span className="cat-count">{BOTS[cat].length} bots</span>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bots-grid-compact">
                      {BOTS[cat].map(bot => (
                        <div 
                          key={bot.id} 
                          className="bot-item-wrapper"
                          onMouseEnter={() => setHoveredBotId(bot.id)}
                          onMouseLeave={() => setHoveredBotId(null)}
                        >
                          {hoveredBotId === bot.id && (
                            <div className="bot-tooltip">
                              <span>{bot.name} ({bot.rating})</span>
                              <span className="flag">🇵🇰</span>
                            </div>
                          )}
                          <button 
                            className={`bot-mini-card ${selectedBot.id === bot.id ? 'active' : ''}`}
                            onClick={() => handleBotClick(bot)}
                          >
                            <div className="bot-mini-avatar">
                              <img src={bot.avatar} alt={bot.name} />
                            </div>
                            {selectedBot.id === bot.id && <div className="selection-indicator"></div>}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="selection-footer">
            <button className="btn-chess btn-chess-primary btn-large full-w" onClick={() => onSelectBot(selectedBot)}>
               <Sword size={20} />
               <span>Play</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
