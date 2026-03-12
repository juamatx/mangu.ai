import './style.css';
import { initWaves }    from './waves.js';
import { initFloaters } from './leaves.js';

const hero = document.getElementById('hero');

initWaves(hero);
initFloaters();
