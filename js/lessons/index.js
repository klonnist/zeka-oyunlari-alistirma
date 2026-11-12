// Ders kayıt defteri: her oyun için sabit örnekli, adım adım ders
import { GRID_LESSONS, kit } from './grid.js?v=6';
import { VISUAL_LESSONS } from './visual.js?v=6';
import { makeRng } from '../core/rng.js?v=6';

// Ders örneği: kolay seviyede sabit tohumlu bulmaca (her seferinde aynı)
export const LESSON_SEED = 'DERS-1';

export function buildLesson(game) {
  const p = game.generate(makeRng(`${game.id}:kolay:${LESSON_SEED}`), 'kolay');
  if (VISUAL_LESSONS[game.id]) return { p, steps: VISUAL_LESSONS[game.id](game, p) };
  const k = kit(game, p);
  GRID_LESSONS[game.id](k);
  return { p, steps: k.steps };
}

export const hasLesson = (id) => !!(GRID_LESSONS[id] || VISUAL_LESSONS[id]);
