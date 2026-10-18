// Стартовая точка домашней работы.
// Спроектируйте модель ресурса, запросы и состояния самостоятельно.
"use strict"

const API_URL = "http://localhost:3000/books"

const SEARCH_DELAY = 400
const REQUEST_TIMEOUT = 5000

const collection = document.querySelector('[data-ui="collection"]')
const endpoint = document.querySelector('[data-ui="endpoint"]')
const status = document.querySelector('[data-ui="status"]')
const statusTitle = status.querySelector(".status__title")
const statusText = status.querySelector(".status__text")

const reloadButton = document.querySelector('[data-action="reload"]')
const submitButton = document.querySelector('[data-action="submit"]')
const cancelButton = document.querySelector('[data-action="cancel-edit"]')

const entryForm = document.querySelector('[data-form="entry"]')
const formTitle = document.querySelector("#form-title")
const formEyebrow = document.querySelector(".panel--form .panel__eyebrow")
const submitStatus = document.querySelector('[data-ui="submit-status"]')

const titleInput = document.querySelector("#entry-title")
const authorInput = document.querySelector("#entry-author")
const genreSelect = document.querySelector("#entry-genre")
const yearInput = document.querySelector("#entry-year")
const searchInput = document.querySelector("#book-search")

let editingBook = null
let isBusy = false
let isLoading = false

let searchTimer = null
let activeController = null
let requestId = 0

endpoint.textContent = API_URL

function setBusy(value) {
  isBusy = value

  if (value) {
    clearTimeout(searchTimer)
    cancelBooksRequest()
  }

  updateControls()
}

function updateControls() {
  const disabled = isBusy || isLoading

  reloadButton.disabled = disabled
  submitButton.disabled = disabled
  cancelButton.disabled = disabled

  collection.querySelectorAll("button").forEach((button) => {
    button.disabled = disabled
  })

  entryForm.querySelectorAll("input, select, textarea").forEach((field) => {
    field.disabled = disabled
  })

  searchInput.disabled = isBusy
}

function setListState(state, title, message) {
  status.className = `status status--${state}`
  statusTitle.textContent = title
  statusText.textContent = message

  collection.hidden = state !== "success"
}

function setSubmitState(state, message) {
  submitStatus.dataset.state = state
  submitStatus.textContent = message
}

function resetEditor() {
  editingBook = null
  entryForm.reset()

  formTitle.textContent = "Добавить книгу"
  formEyebrow.textContent = "Новая книга"
  submitButton.textContent = "Добавить книгу"
  cancelButton.hidden = true
}

function startEditing(book) {
  if (isBusy || isLoading) {
    return
  }

  editingBook = book

  titleInput.value = book.title
  authorInput.value = book.author
  genreSelect.value = book.genre
  yearInput.value = book.year

  formTitle.textContent = "Редактировать книгу"
  formEyebrow.textContent = "Редактирование"
  submitButton.textContent = "Сохранить изменения"
  cancelButton.hidden = false

  setSubmitState("", "")
  titleInput.focus()
}

function createBookCard(book) {
  const card = document.createElement("article")
  card.className = "card"

  const title = document.createElement("h3")
  title.className = "card__title"
  title.textContent = book.title

  const details = document.createElement("dl")
  details.className = "card__meta"

  const properties = [
    ["Автор", book.author],
    ["Жанр", book.genre],
    ["Год издания", book.year]
  ]

  properties.forEach(([label, value]) => {
    const row = document.createElement("div")
    row.className = "card__row"

    const term = document.createElement("dt")
    term.className = "card__label"
    term.textContent = label

    const description = document.createElement("dd")
    description.className = "card__value"
    description.textContent = value

    row.append(term, description)
    details.append(row)
  })

  const actions = document.createElement("div")
  actions.className = "card__actions"

  const editButton = document.createElement("button")
  editButton.type = "button"
  editButton.className = "button button--secondary"
  editButton.textContent = "Редактировать"
  editButton.addEventListener("click", () => startEditing(book))

  const deleteButton = document.createElement("button")
  deleteButton.type = "button"
  deleteButton.className = "button button--danger"
  deleteButton.textContent = "Удалить"
  deleteButton.addEventListener("click", () => deleteBook(book))

  actions.append(editButton, deleteButton)
  card.append(title, details, actions)

  return card
}

function renderBooks(books) {
  collection.replaceChildren()

  if (books.length === 0) {
    setListState(
      "empty",
      "Каталог пуст",
      "Добавьте первую книгу через форму."
    )

    return
  }

  books.forEach((book) => {
    collection.append(createBookCard(book))
  })

  setListState(
    "success",
    "Книги загружены",
    `Книг в каталоге: ${books.length}.`
  )
}

function cancelBooksRequest() {
  requestId += 1

  activeController?.abort()
  activeController = null

  isLoading = false
  updateControls()
}

async function loadBooks() {
  clearTimeout(searchTimer)
  cancelBooksRequest()

  const currentRequestId = requestId
  const controller = new AbortController()

  activeController = controller

  let timedOut = false

  const url = new URL(API_URL)
  const query = searchInput.value.trim()

  if (query) {
    url.searchParams.set("title:contains", query)
  }

  isLoading = true
  updateControls()

  setListState("loading", "Загрузка", "Загружаем книги")

  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, {
      signal: controller.signal
    })

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`)
      error.status = response.status

      throw error
    }

    const books = await response.json()

    if (currentRequestId !== requestId) {
      return
    }

    if (query && books.length === 0) {
      collection.replaceChildren()

      setListState(
        "empty",
        "Ничего не найдено",
        "Попробуйте другое название."
      )

      return
    }

    renderBooks(books)
  } catch (error) {
    if (currentRequestId !== requestId) {
      return
    }

    if (timedOut) {
      setListState(
        "error",
        "Тайм-аут",
        "Сервер не ответил за 5 секунд. Нажмите «Обновить»."
      )
    } else if (controller.signal.aborted) {
      return
    } else if (error.status === 404) {
      setListState(
        "error",
        "Ошибка 404",
        "Ресурс не найден. Проверьте адрес API."
      )
    } else if (error instanceof TypeError) {
      setListState(
        "error",
        "Ошибка соединения",
        "Не удалось связаться с API. Проверьте запуск backend и нажмите «Обновить»."
      )
    } else {
      setListState(
        "error",
        "Ошибка загрузки",
        `Не удалось загрузить каталог: ${error.message}`
      )
    }
  } finally {
    clearTimeout(timeoutId)

    if (currentRequestId === requestId) {
      activeController = null
      isLoading = false

      updateControls()
    }
  }
}

async function saveBook(book, id = null) {
  const url = id === null
    ? API_URL
    : `${API_URL}/${encodeURIComponent(id)}`

  const response = await fetch(url, {
    method: id === null ? "POST" : "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(book)
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return await response.json()
}

async function submitBook(event) {
  event.preventDefault()

  if (isBusy || isLoading) {
    return
  }

  const formData = new FormData(entryForm)

  const book = {
    title: formData.get("title").trim(),
    author: formData.get("author").trim(),
    genre: formData.get("genre"),
    year: Number(formData.get("year"))
  }

  const isEditing = editingBook !== null
  let payload = book

  if (isEditing) {
    payload = {}

    Object.keys(book).forEach((key) => {
      if (book[key] !== editingBook[key]) {
        payload[key] = book[key]
      }
    })

    if (Object.keys(payload).length === 0) {
      setSubmitState(
        "",
        "Измените данные или нажмите «Отменить редактирование»."
      )

      return
    }
  }

  setBusy(true)
  setSubmitState("loading", "Сохраняем книгу")

  try {
    const savedBook = await saveBook(
      payload,
      isEditing ? editingBook.id : null
    )

    console.log("Сохранённая книга:", savedBook)

    resetEditor()

    setSubmitState(
      "success",
      isEditing ? "Изменения сохранены." : "Книга добавлена в каталог."
    )

    await loadBooks()
  } catch (error) {
    console.error("Не удалось сохранить книгу:", error)

    setSubmitState(
      "error",
      "Не удалось сохранить книгу. Проверьте, что API запущен, и повторите отправку. Введённые данные сохранены в форме."
    )
  } finally {
    setBusy(false)
  }
}

async function deleteBook(book) {
  if (isBusy || isLoading) {
    return
  }

  if (!window.confirm(`Удалить книгу «${book.title}»?`)) {
    return
  }

  setBusy(true)
  setSubmitState("loading", "Удаляем книгу…")

  try {
    const response = await fetch(
      `${API_URL}/${encodeURIComponent(book.id)}`,
      { method: "DELETE" }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    if (editingBook !== null && editingBook.id === book.id) {
      resetEditor()
    }

    setSubmitState("success", "Книга удалена.")

    await loadBooks()
  } catch (error) {
    console.error("Не удалось удалить книгу:", error)

    setSubmitState(
      "error",
      "Не удалось удалить книгу. Проверьте, что API запущен, и повторите попытку."
    )
  } finally {
    setBusy(false)
  }
}

reloadButton.addEventListener("click", () => {
  if (!isBusy && !isLoading) {
    loadBooks()
  }
})

entryForm.addEventListener("submit", submitBook)

cancelButton.addEventListener("click", () => {
  if (isBusy || isLoading) {
    return
  }

  resetEditor()
  setSubmitState("", "Редактирование отменено.")
  titleInput.focus()
})

searchInput.addEventListener("input", () => {
  if (isBusy) {
    return
  }

  clearTimeout(searchTimer)
  cancelBooksRequest()

  setListState(
    "loading",
    "Ожидание поиска",
    "Поиск начнётся после паузы во вводе."
  )

  searchTimer = setTimeout(() => {
    loadBooks()
  }, SEARCH_DELAY)
})

loadBooks()