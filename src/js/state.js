const STORAGE_KEY = 'trello-dnd-state'

function createInitialState() {
  return {
    columns: [
      {
        id: 'todo',
        title: 'TODO',
        cards: [
          { id: crypto.randomUUID(), text: 'Welcome to Trello clone' },
        ],
      },
      {
        id: 'inprogress',
        title: 'IN PROGRESS',
        cards: [
          { id: crypto.randomUUID(), text: 'Drag cards between columns' },
        ],
      },
      {
        id: 'done',
        title: 'DONE',
        cards: [
          { id: crypto.randomUUID(), text: 'All changes are stored in LocalStorage' },
        ],
      },
    ],
  }
}

export default class BoardState {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey
    this.state = this.load()
  }

  load() {
    const raw = localStorage.getItem(this.storageKey)

    if (!raw) {
      const initial = createInitialState()
      this.save(initial)
      return initial
    }

    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed.columns) || parsed.columns.length !== 3) {
        throw new Error('Invalid storage shape')
      }
      return parsed
    }
    catch (error) {
      const initial = createInitialState()
      this.save(initial)
      console.error(error)
      return initial
    }
  }

  save(nextState = this.state) {
    this.state = nextState
    localStorage.setItem(this.storageKey, JSON.stringify(this.state))
  }

  getState() {
    return structuredClone(this.state)
  }

  addCard(columnId, text) {
    const column = this.state.columns.find(({ id }) => id === columnId)
    column.cards.push({ id: crypto.randomUUID(), text })
    this.save()
  }

  removeCard(cardId) {
    this.state.columns.forEach((column) => {
      column.cards = column.cards.filter(card => card.id !== cardId)
    })
    this.save()
  }

  moveCard(cardId, targetColumnId, targetIndex) {
    let movedCard = null

    this.state.columns.forEach((column) => {
      const cardIndex = column.cards.findIndex(card => card.id === cardId)
      if (cardIndex !== -1) {
        [movedCard] = column.cards.splice(cardIndex, 1)
      }
    })

    if (!movedCard) {
      return
    }

    const targetColumn = this.state.columns.find(({ id }) => id === targetColumnId)
    const safeIndex = Math.max(0, Math.min(targetIndex, targetColumn.cards.length))
    targetColumn.cards.splice(safeIndex, 0, movedCard)
    this.save()
  }
}
