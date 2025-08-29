import React from 'react';

const ReactionButton = ({ 
  type, 
  count = 0, 
  isActive = false, 
  onClick, 
  disabled = false 
}) => {
  // Reaction configurations matching LinkedIn style
  const reactions = {
    like: {
      icon: '👍',
      label: 'Like',
      color: '#0073b1'
    },
    applause: {
      icon: '👏', 
      label: 'Applause',
      color: '#057642'
    },
    support: {
      icon: '💪',
      label: 'Support', 
      color: '#8b5a96'
    },
    love: {
      icon: '❤️',
      label: 'Love',
      color: '#df704d'
    },
    insightful: {
      icon: '💡',
      label: 'Insightful',
      color: '#f5b800'
    },
    funny: {
      icon: '😂',
      label: 'Funny',
      color: '#0073b1'
    }
  };

  const reaction = reactions[type];
  
  if (!reaction) {
    return null;
  }

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(type, isActive);
    }
  };

  return (
    <button
      className={`reaction-button ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      title={reaction.label}
      style={{
        '--reaction-color': reaction.color
      }}
    >
      <span className="reaction-icon">{reaction.icon}</span>
      {count > 0 && <span className="reaction-count">{count}</span>}
    </button>
  );
};

export default ReactionButton;