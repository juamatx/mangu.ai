import { initFlow } from './flow.js'
import './style.css'

const canvas = document.getElementById('flow')
const flow = initFlow(canvas)

// Font may already be cached — either way, start text as soon as it's ready
document.fonts.ready.then(() => flow.startText())
