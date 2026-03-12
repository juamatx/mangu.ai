import './style.css';
import { initWaves }  from './waves.js';
import { initLeaves } from './leaves.js';

const hero = document.getElementById('hero');

initWaves(hero);
initLeaves();
