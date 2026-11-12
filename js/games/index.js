// Oyun kayıt defteri (yönergedeki sırayla)
import sudoku from './sudoku.js?v=6';
import ardisik from './ardisik.js?v=6';
import kelime from './kelime.js?v=6';
import golge from './golge.js?v=6';
import tipatip from './tipatip.js?v=6';
import ustten from './ustten.js?v=6';
import farkli from './farkli.js?v=6';
import baglamaca from './baglamaca.js?v=6';
import amiral from './amiral.js?v=6';
import komsular from './komsular.js?v=6';
import kendoku from './kendoku.js?v=6';
import cit from './cit.js?v=6';
import abc from './abc.js?v=6';
import hazine from './hazine.js?v=6';
import apartman from './apartman.js?v=6';
import sayi from './sayi.js?v=6';
import tapa from './tapa.js?v=6';
import kakuro from './kakuro.js?v=6';

export const GAMES = [sudoku, ardisik, kelime, golge, tipatip, ustten, farkli, baglamaca, amiral, komsular, kendoku, cit, abc, hazine, apartman, sayi, tapa, kakuro];
export const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
