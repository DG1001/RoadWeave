import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import ReactionButton from './ReactionButton';

const PostReactions = ({ token, contentId }) => {
  const [reactions, setReactions] = useState({
    like: 0,
    applause: 0,
    support: 0,
    love: 0,
    insightful: 0,
    funny: 0
  });
  const [userReaction, setUserReaction] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get user's current reaction from localStorage
  const getUserReaction = () => {
    const stored = localStorage.getItem(`reaction_${contentId}`);
    return stored || null;
  };

  // Set user's reaction in localStorage
  const setUserReactionInStorage = (reactionType) => {
    if (reactionType) {
      localStorage.setItem(`reaction_${contentId}`, reactionType);
    } else {
      localStorage.removeItem(`reaction_${contentId}`);
    }
  };

  // Load reactions on component mount
  useEffect(() => {
    const storedReaction = getUserReaction();
    setUserReaction(storedReaction);
    loadReactions();
  }, [contentId, token]);

  const loadReactions = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/public/${token}/reactions/${contentId}`));
      setReactions(response.data);
    } catch (error) {
      console.error('Failed to load reactions:', error);
      // Continue with default values on error
    }
  };

  const handleReactionClick = async (reactionType, isCurrentlyActive) => {
    if (loading) return;

    setLoading(true);

    try {
      // Determine action: if clicking the same reaction, remove it; otherwise add new one
      let action;
      let newUserReaction;

      if (isCurrentlyActive) {
        // User is removing their reaction
        action = 'remove';
        newUserReaction = null;
      } else {
        // User is adding/changing reaction
        action = 'add';
        newUserReaction = reactionType;
      }

      // Optimistic update
      const optimisticReactions = { ...reactions };
      
      // If user had a previous reaction, remove it
      if (userReaction && userReaction !== reactionType) {
        optimisticReactions[userReaction] = Math.max(0, optimisticReactions[userReaction] - 1);
      }

      // Apply the new action
      if (action === 'add') {
        optimisticReactions[reactionType] = (optimisticReactions[reactionType] || 0) + 1;
      } else if (action === 'remove' && userReaction === reactionType) {
        optimisticReactions[reactionType] = Math.max(0, optimisticReactions[reactionType] - 1);
      }

      setReactions(optimisticReactions);
      setUserReaction(newUserReaction);
      setUserReactionInStorage(newUserReaction);

      // Send request to backend
      await axios.post(getApiUrl(`/api/public/${token}/reactions/${contentId}`), {
        reaction_type: reactionType,
        action: action
      });

      // Reload actual data to ensure consistency
      await loadReactions();

    } catch (error) {
      console.error('Failed to update reaction:', error);
      // Revert optimistic update on error
      await loadReactions();
      const storedReaction = getUserReaction();
      setUserReaction(storedReaction);
    } finally {
      setLoading(false);
    }
  };

  // Handle case where user had a reaction but is now changing it
  const handleReactionChange = async (newReactionType) => {
    if (loading) return;

    setLoading(true);

    try {
      // Remove old reaction if exists
      if (userReaction) {
        await axios.post(getApiUrl(`/api/public/${token}/reactions/${contentId}`), {
          reaction_type: userReaction,
          action: 'remove'
        });
      }

      // Add new reaction
      await axios.post(getApiUrl(`/api/public/${token}/reactions/${contentId}`), {
        reaction_type: newReactionType,
        action: 'add'
      });

      setUserReaction(newReactionType);
      setUserReactionInStorage(newReactionType);
      await loadReactions();

    } catch (error) {
      console.error('Failed to change reaction:', error);
      // Revert on error
      await loadReactions();
      const storedReaction = getUserReaction();
      setUserReaction(storedReaction);
    } finally {
      setLoading(false);
    }
  };

  const handleReactionButtonClick = (reactionType, isCurrentlyActive) => {
    if (userReaction && userReaction !== reactionType) {
      // User wants to change to a different reaction
      handleReactionChange(reactionType);
    } else {
      // User wants to add/remove the same reaction
      handleReactionClick(reactionType, isCurrentlyActive);
    }
  };

  const reactionTypes = ['like', 'applause', 'support', 'love', 'insightful', 'funny'];

  return (
    <div className="post-reactions">
      <div className="reactions-container">
        {reactionTypes.map((type) => (
          <ReactionButton
            key={type}
            type={type}
            count={reactions[type] || 0}
            isActive={userReaction === type}
            onClick={handleReactionButtonClick}
            disabled={loading}
          />
        ))}
      </div>
    </div>
  );
};

export default PostReactions;