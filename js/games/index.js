// Oyun kayıt defteri (yönergedeki sırayla)
import sudoku from './sudoku.js?v=4';
import ardisik from './ardisik.js?v=4';
import kelime from './kelime.js?v=4';
import golge from './golge.js?v=4';
import tipatip from './tipatip.js?v=4';
import ustten from './ustten.js?v=4';
import farkli from './farkli.js?v=4';
import baglamaca from './baglamaca.js?v=4';
import amiral from './amiral.js?v=4';
import komsular from './komsular.js?v=4';
import kendoku from './kendoku.js?v=4';
import cit from './cit.js?v=4';
import abc from './abc.js?v=4';
import hazine from './hazine.js?v=4';
import apartman from './apartman.js?v=4';
import sayi from './sayi.js?v=4';
import tapa from './tapa.js?v=4';
import kakuro from './kakuro.js?v=4';

export const GAMES = [sudoku, ardisik, kelime, golge, tipatip, ustten, farkli, baglamaca, amiral, komsular, kendoku, cit, abc, hazine, apartman, sayi, tapa, kakuro];
export const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
