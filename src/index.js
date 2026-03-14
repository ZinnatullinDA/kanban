import { BoardView } from './js/board'
import BoardState from './js/state'
import './css/style.css'

const app = document.getElementById('app')
const state = new BoardState()
const board = new BoardView(app, state)

board.init()
