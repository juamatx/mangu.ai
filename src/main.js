import { initFlow } from './flow.js'
import { generateTexture } from './texture.js'
import './style.css'

// generate organic texture and apply to body
const textureUrl = generateTexture()
document.body.style.backgroundImage = `url(${textureUrl})`

const canvas = document.getElementById('flow')
const flow = initFlow(canvas)

document.fonts.ready.then(() => flow.startText())
