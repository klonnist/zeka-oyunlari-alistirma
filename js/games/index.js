// Oyun kayıt defteri (yönergedeki sırayla)
import sudoku from './sudoku.js';
import ardisik from './ardisik.js';
import kelime from './kelime.js';
import golge from './golge.js';
import tipatip from './tipatip.js';
import ustten from './ustten.js';
import farkli from './farkli.js';
import baglamaca from './baglamaca.js';
import amiral from './amiral.js';
import komsular from './komsular.js';
import kendoku from './kendoku.js';
import cit from './cit.js';
import abc from './abc.js';
import hazine from './hazine.js';
import apartman from './apartman.js';
import sayi from './sayi.js';
import tapa from './tapa.js';
import kakuro from './kakuro.js';

export const GAMES = [sudoku, ardisik, kelime, golge, tipatip, ustten, farkli, baglamaca, amiral, komsular, kendoku, cit, abc, hazine, apartman, sayi, tapa, kakuro];
export const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
