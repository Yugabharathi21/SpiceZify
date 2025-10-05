import { useContext } from 'react';
import { PlayerContext, PlayerContextType } from '../contexts/PlayerContext';

// Custom hook for using player context
export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};