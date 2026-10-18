// Стартовая точка домашней работы.
// Спроектируйте модель ресурса, запросы и состояния самостоятельно.
"use strict"

const API_URL = "http://localhost:3000/books"

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

let editingBook = null
let isBusy = false

endpoint.textContent = API_URL

function setBusy(value) {
  isBusy = value

  reloadButton.disabled = value
  submitButton.disabled = value
  cancelButton.disabled = value

  collection.querySelectorAll("button").forEach((button) => {
    button.disabled = value
  })

  entryForm.querySelectorAll("input, select, textarea").forEach((field) => {
    field.disabled = value
  })
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
  if (isBusy) {
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

async function loadBooks() {
  setBusy(true)
  setListState("loading", "Загрузка", "Загружаем книги…")

  try {
    const response = await fetch(API_URL)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const books = await response.json()

    renderBooks(books)
  } catch (error) {
    console.error("Не удалось загрузить книги:", error)

    setListState(
      "error",
      "Ошибка загрузки",
      "Не удалось загрузить каталог. Проверьте, что API запущен, и нажмите «Обновить»."
    )
  } finally {
    setBusy(false)
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

  if (isBusy) {
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
  setSubmitState("loading", "Сохраняем книгу…")

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
  if (isBusy || !window.confirm(`Удалить книгу «${book.title}»?`)) {
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
  if (!isBusy) {
    loadBooks()
  }
})

entryForm.addEventListener("submit", submitBook)

cancelButton.addEventListener("click", () => {
  if (isBusy) {
    return
  }

  resetEditor()
  setSubmitState("", "Редактирование отменено.")
  titleInput.focus()
})

loadBooks()