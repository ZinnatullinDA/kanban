function createCardElement(card) {
  const cardElement = document.createElement('li')
  cardElement.className = 'card'
  cardElement.dataset.cardId = card.id

  const content = document.createElement('div')
  content.className = 'card__content'
  content.textContent = card.text

  const deleteButton = document.createElement('button')
  deleteButton.className = 'card__delete'
  deleteButton.type = 'button'
  deleteButton.setAttribute('aria-label', 'Удалить карточку')
  deleteButton.textContent = '✕'

  cardElement.append(content, deleteButton)
  return cardElement
}

function createComposer(columnId) {
  const composer = document.createElement('div')
  composer.className = 'composer'
  composer.innerHTML = `
    <button class="composer__toggle" type="button">+ Add another card</button>
    <form class="composer__form hidden" data-column-id="${columnId}">
      <textarea class="composer__input" name="text" placeholder="Enter a title for this card..." required></textarea>
      <div class="composer__actions">
        <button class="composer__submit" type="submit">Add Card</button>
        <button class="composer__cancel" type="button">✕</button>
      </div>
    </form>
  `
  return composer
}

function createColumnElement(column) {
  const columnElement = document.createElement('section')
  columnElement.className = 'column'
  columnElement.dataset.columnId = column.id

  const title = document.createElement('h2')
  title.className = 'column__title'
  title.textContent = column.title

  const list = document.createElement('ul')
  list.className = 'column__list'

  column.cards.forEach((card) => {
    list.append(createCardElement(card))
  })

  columnElement.append(title, list, createComposer(column.id))
  return columnElement
}

export function renderBoard(container, state) {
  container.innerHTML = ''

  const board = document.createElement('div')
  board.className = 'board'

  state.columns.forEach((column) => {
    board.append(createColumnElement(column))
  })

  container.append(board)
}

function getPointerPosition(event) {
  if (event.touches?.length) {
    return event.touches[0]
  }
  return event
}

class DragManager {
  constructor(container, onMove) {
    this.container = container
    this.onMove = onMove
    this.dragState = null
    this.placeholder = document.createElement('li')
    this.placeholder.className = 'card-placeholder'
  }

  init() {
    this.container.addEventListener('mousedown', this.onPointerDown)
  }

  destroy() {
    this.container.removeEventListener('mousedown', this.onPointerDown)
    document.removeEventListener('mousemove', this.onPointerMove)
    document.removeEventListener('mouseup', this.onPointerUp)
  }

  onPointerDown = (event) => {
    const card = event.target.closest('.card')
    const deleteButton = event.target.closest('.card__delete')
    const formToggle = event.target.closest('.composer__toggle, .composer__cancel')

    if (deleteButton || formToggle || !card) {
      return
    }

    event.preventDefault()

    const point = getPointerPosition(event)
    const rect = card.getBoundingClientRect()
    this.dragState = {
      cardId: card.dataset.cardId,
      sourceCard: card,
      shiftX: point.clientX - rect.left,
      shiftY: point.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      currentColumnId: card.closest('.column').dataset.columnId,
      targetIndex: [...card.parentElement.children].indexOf(card),
    }

    this.placeholder.style.height = `${rect.height}px`
    card.after(this.placeholder)

    card.classList.add('card_dragged')
    card.style.width = `${rect.width}px`
    card.style.left = `${rect.left}px`
    card.style.top = `${rect.top}px`
    document.body.classList.add('dragging')

    document.addEventListener('mousemove', this.onPointerMove)
    document.addEventListener('mouseup', this.onPointerUp)
    this.moveAt(point.clientX, point.clientY)
  }

  onPointerMove = (event) => {
    if (!this.dragState) {
      return
    }

    const point = getPointerPosition(event)
    this.moveAt(point.clientX, point.clientY)
    this.updatePlaceholder(point.clientX, point.clientY)
  }

  onPointerUp = () => {
    if (!this.dragState) {
      return
    }

    const { cardId, currentColumnId, targetIndex, sourceCard } = this.dragState

    sourceCard.classList.remove('card_dragged')
    sourceCard.removeAttribute('style')
    this.placeholder.remove()
    document.body.classList.remove('dragging')
    document.removeEventListener('mousemove', this.onPointerMove)
    document.removeEventListener('mouseup', this.onPointerUp)

    this.dragState = null
    this.onMove(cardId, currentColumnId, targetIndex)
  }

  moveAt(clientX, clientY) {
    const { sourceCard, shiftX, shiftY } = this.dragState
    sourceCard.style.left = `${clientX - shiftX}px`
    sourceCard.style.top = `${clientY - shiftY}px`
  }

  updatePlaceholder(clientX, clientY) {
    const dropColumns = [...this.container.querySelectorAll('.column')]
    const activeColumn = dropColumns.find((column) => {
      const rect = column.getBoundingClientRect()
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    })

    if (!activeColumn) {
      return
    }

    const list = activeColumn.querySelector('.column__list')
    const cards = [...list.querySelectorAll('.card:not(.card_dragged)')]
    const nextCard = cards.find((card) => {
      const rect = card.getBoundingClientRect()
      return clientY < rect.top + rect.height / 2
    })

    if (nextCard) {
      list.insertBefore(this.placeholder, nextCard)
    }
    else {
      list.append(this.placeholder)
    }

    this.dragState.currentColumnId = activeColumn.dataset.columnId
    this.dragState.targetIndex = [...list.children].indexOf(this.placeholder)
  }
}

export class BoardView {
  constructor(container, stateService) {
    this.container = container
    this.stateService = stateService
    this.dragManager = new DragManager(container, this.handleMoveCard)
  }

  init() {
    this.render()
    this.container.addEventListener('click', this.handleClick)
    this.container.addEventListener('submit', this.handleSubmit)
    this.dragManager.init()
  }

  render() {
    renderBoard(this.container, this.stateService.getState())
  }

  handleClick = (event) => {
    const deleteButton = event.target.closest('.card__delete')
    if (deleteButton) {
      const card = deleteButton.closest('.card')
      this.stateService.removeCard(card.dataset.cardId)
      this.render()
      return
    }

    const toggle = event.target.closest('.composer__toggle')
    if (toggle) {
      const composer = toggle.closest('.composer')
      composer.querySelector('.composer__form').classList.remove('hidden')
      toggle.classList.add('hidden')
      composer.querySelector('.composer__input').focus()
      return
    }

    const cancel = event.target.closest('.composer__cancel')
    if (cancel) {
      const composer = cancel.closest('.composer')
      composer.querySelector('.composer__form').reset()
      composer.querySelector('.composer__form').classList.add('hidden')
      composer.querySelector('.composer__toggle').classList.remove('hidden')
    }
  }

  handleSubmit = (event) => {
    const form = event.target.closest('.composer__form')
    if (!form) {
      return
    }

    event.preventDefault()
    const textarea = form.querySelector('.composer__input')
    const text = textarea.value.trim()

    if (!text) {
      textarea.focus()
      return
    }

    this.stateService.addCard(form.dataset.columnId, text)
    this.render()
  }

  handleMoveCard = (cardId, targetColumnId, targetIndex) => {
    this.stateService.moveCard(cardId, targetColumnId, targetIndex)
    this.render()
  }
}
