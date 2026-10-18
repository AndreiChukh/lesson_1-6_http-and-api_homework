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

const entryForm = document.querySelector('[data-form="entry"]')
const submitStatus = document.querySelector('[data-ui="submit-status"]')

endpoint.textContent = API_URL

function setListState(state, title, message) {
  status.className = `status status--${state}`
  statusTitle.textContent = title
  statusText.textContent = message

  collection.hidden = state !== "success"
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

  card.append(title, details)

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
  setListState("loading", "Загрузка", "Загружаем книги…")

  reloadButton.disabled = true
  submitButton.disabled = true

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
    reloadButton.disabled = false
    submitButton.disabled = false
  }
}

async function createBook(book) {
  const response = await fetch(API_URL, {
    method: "POST",
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

  if (submitButton.disabled) {
    return
  }

  const formData = new FormData(entryForm)

  const book = {
    title: formData.get("title").trim(),
    author: formData.get("author").trim(),
    genre: formData.get("genre"),
    year: Number(formData.get("year"))
  }

  submitButton.disabled = true
  reloadButton.disabled = true

  submitStatus.dataset.state = "loading"
  submitStatus.textContent = "Сохраняем книгу"

  try {
    const createdBook = await createBook(book)

    console.log("Созданная книга:", createdBook)

    entryForm.reset()

    submitStatus.dataset.state = "success"
    submitStatus.textContent = "Книга добавлена в каталог."

    await loadBooks()
  } catch (error) {
    console.error("Не удалось добавить книгу:", error)

    submitStatus.dataset.state = "error"
    submitStatus.textContent =
      "Не удалось сохранить книгу. Проверьте, что API запущен, и повторите отправку. Введённые данные сохранены в форме."
  } finally {
    submitButton.disabled = false
    reloadButton.disabled = false
  }
}

reloadButton.addEventListener("click", loadBooks)
entryForm.addEventListener("submit", submitBook)

loadBooks()