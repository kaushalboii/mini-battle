/**
 * Mini-Battle 3D Arcade Portal
 * Hosts two 3D games:
 * 1. RevSector 3D (Formula Grand Prix Circuit Racing by Kaushal)
 * 2. Toxic Meltdown® 3D (8-Player Inflatable Sweeper Arena by Galaxy Multi Rides)
 * Engineered by Kaushal.
 */

import { useEffect, useState } from 'react';
import ArcadeMenu from './components/ArcadeMenu';
import RacingGame from './components/RacingGame';
import ToxicMeltdown from './components/ToxicMeltdown';

export type GameKey = 'menu' | 'racing' | 'meltdown';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameKey>(() => {
    // Read from URL query param if present
    const params = new URLSearchParams(window.location.search);
    const game = params.get('game');
    if (game === 'racing' || game === 'meltdown') return game;
    // Default to the master arcade menu portal
    return 'menu';
  });

  const handleSwitchGame = (game: GameKey) => {
    setActiveGame(game);
    const url = new URL(window.location.href);
    if (game === 'menu') {
      url.searchParams.delete('game');
    } else {
      url.searchParams.set('game', game);
    }
    window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const game = params.get('game');
      if (game === 'racing' || game === 'meltdown') {
        setActiveGame(game);
      } else {
        setActiveGame('menu');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      {activeGame === 'menu' && (
        <ArcadeMenu onSelectGame={handleSwitchGame} />
      )}
      {activeGame === 'racing' && (
        <RacingGame
          onReturnToMenu={() => handleSwitchGame('menu')}
          onSwitchToMeltdown={() => handleSwitchGame('meltdown')}
        />
      )}
      {activeGame === 'meltdown' && (
        <ToxicMeltdown
          onReturnToMenu={() => handleSwitchGame('menu')}
          onSwitchToRacing={() => handleSwitchGame('racing')}
        />
      )}
    </div>
  );
}
