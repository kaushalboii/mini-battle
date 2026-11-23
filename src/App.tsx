/**
 * Mini-Battle Multi-Game Portal
 * Hosts two 3D games:
 * 1. RevSector 3D (Grand Prix Circuit Racing by Kaushal)
 * 2. Toxic Meltdown® 3D (8-Player Inflatable Sweeper Arena by Galaxy Multi Rides)
 */

import { useEffect, useState } from 'react';
import RacingGame from './components/RacingGame';
import ToxicMeltdown from './components/ToxicMeltdown';

export type GameKey = 'racing' | 'meltdown';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameKey>(() => {
    // Read from URL query param if present
    const params = new URLSearchParams(window.location.search);
    const game = params.get('game');
    if (game === 'racing' || game === 'meltdown') return game;
    // Default to 'meltdown' to showcase the new game
    return 'meltdown';
  });

  const handleSwitchGame = (game: GameKey) => {
    setActiveGame(game);
    const url = new URL(window.location.href);
    url.searchParams.set('game', game);
    window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const game = params.get('game');
      if (game === 'racing' || game === 'meltdown') {
        setActiveGame(game);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      {activeGame === 'racing' ? (
        <RacingGame onSwitchToMeltdown={() => handleSwitchGame('meltdown')} />
      ) : (
        <ToxicMeltdown onSwitchToRacing={() => handleSwitchGame('racing')} />
      )}
    </div>
  );
}
