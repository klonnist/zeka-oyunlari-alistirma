// Oyun kayıt defteri (yönergedeki sırayla)
import sudoku from './sudoku.js?v=5';
import ardisik from './ardisik.js?v=5';
import kelime from './kelime.js?v=5';
import golge from './golge.js?v=5';
import tipatip from './tipatip.js?v=5';
import ustten from './ustten.js?v=5';
import farkli from './farkli.js?v=5';
import baglamaca from './baglamaca.js?v=5';
import amiral from './amiral.js?v=5';
import komsular from './komsular.js?v=5';
import kendoku from './kendoku.js?v=5';
import cit from './cit.js?v=5';
import abc from './abc.js?v=5';
import hazine from './hazine.js?v=5';
import apartman from './apartman.js?v=5';
import sayi from './sayi.js?v=5';
import tapa from './tapa.js?v=5';
import kakuro from './kakuro.js?v=5';

export const GAMES = [sudoku, ardisik, kelime, golge, tipatip, ustten, farkli, baglamaca, amiral, komsular, kendoku, cit, abc, hazine, apartman, sayi, tapa, kakuro];
export const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
