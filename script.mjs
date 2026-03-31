const dl_uint8 = (uint8Array, filename) => {
  const blob = new Blob([uint8Array], {type: "application/octet-stream"})
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")

  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const dl_string = (string, filename) => {
  const encoded_text = new TextEncoder().encode(string)
  const blob = new Blob([encoded_text], {type: "text/plain"})
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")

  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const editorState = (() => {
  let history = []
  if (localStorage?.content?.length) localStorage.content += "\n"

  return {
    get_raw: () => history,
    //TODO this is actually non trivial because we need to handle mouse inputs since you're no longer guaranteed to always be at the end of the file, alternatley only commit on word or never let the user navigate within a word
    delete: () => {
      save_dirty = true
      ;((localStorage.content = localStorage.content.slice(0, -1)),
        history.push({t: new Date(), delete: true}))
    },
    input: event => {
      const {data} = event
      if (data) {
        save_dirty = true
        localStorage.content += data
        history.push({t: new Date(), data})
      }
    },
    get_text: () => localStorage.content,
  }
})()

let save_dirty = localStorage?.content?.length

window.onload = () => {
  let input = document.getElementById("input")
  const title = document.getElementById("title")
  const header = document.querySelector("#header")
  header.addEventListener(
    "animationend",
    e => e.target.classList.remove("first-load"),
    {once: true},
  )
  header.addEventListener(
    "mouseover",
    e => e.target.classList.remove("first-load"),
    {once: true},
  )
  const new_title = () => {
    localStorage.title = datetitle() + ".txt"
    title.innerText = localStorage.title
  }
  document.getElementById("newtitle").onclick = new_title

  const pad = n => n.toString().padStart(2, "0")
  const datetitle = (d = new Date()) =>
    `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}_${pad(d.getHours())}${pad(d.getMinutes())}`

  if (localStorage.title) {
    title.innerText = localStorage.title
  } else {
    new_title()
  }
  if (!localStorage.content) {
    localStorage.content = ""
  }

  title.oninput = () => {
    localStorage.title = title.innerText
  }

  title.onblur = () => {
    if (!title.innerText.trim().length) {
      new_title()
    }
  }

  const addspan = (linebreak, event) => {
    const prevspan = input.lastElementChild
    let span = document.createElement("span")
    if (prevspan) {
      console.log(prevspan.getClientRects()[0].width)
      prevspan.contentEditable = false
      prevspan.style.setProperty(
        "--original-width",
        `${prevspan.getClientRects()[0].width}px`,
      )
      prevspan.classList.add("fade")
      let span = document.createElement("span")
      span.innerHTML += "&nbsp;"
      input.appendChild(span)
      console.log(prevspan.getClientRects()[0].width)
      prevspan.onanimationend = () => {
        //prevspan.remove()
      }
    }
    if (linebreak) {
      const old_input = input
      old_input.id = ""
      old_input.classList.add("old-input")
      old_input.querySelector("br").remove()
      input = document.createElement("p")
      setup_handlers(input, old_input)
      old_input.style.setProperty(
        "--original-height",
        `${old_input.getClientRects()[0].height}px`,
      )
      text.appendChild(input)
      input.classList.add("input")
      //((what value, this is a stale ass comment i don't understand))
      //TODO this should get the value from .old-input
      //it doesn't because it triggers on the end of a child anim i think
      setTimeout(() => old_input.remove(), 13000)
    }
    input.appendChild(span)
    span.contentEditable = true
    span.innerHTML = `&#8203;`
    span.focus()
  }
  addspan()

  const inputhandler = input => e => {
    const inputType = e.inputType
    const key = e.data

    // Special case handling
    if (inputType === "deleteContentBackward") {
      console.log("Backspace pressed")
      if (input.lastElementChild.innerText.length) editorState.delete()
      e.preventDefault()
    } else if (key === " ") {
      console.log("Space pressed")
      addspan(undefined, true)
    } else if (
      inputType === "insertLineBreak" ||
      inputType === "insertParagraph"
    ) {
      console.log("Enter pressed")
      editorState.input({data: "\n"})
      e.preventDefault()
      addspan(true)
    } else {
      console.log("Other key pressed:", key)
      console.log(e)
    }

    const fixHangingSpaces = () => {
      const spans = Array.from(input.children)
      spans.forEach(s => s.classList.remove("wrap-hide"))

      // Read: Get all Y offsets at once to avoid layout thrashing
      const offsets = spans.map(s => s.offsetTop)

      // Write 2: Hide spaces that are the first item on a new line
      spans.forEach((span, i) => {
        if (
          i > 0 &&
          span.textContent.match(/^\W$/) &&
          offsets[i] > offsets[i - 1]
        ) {
          span.classList.add("wrap-hide")
        }
      })
    }
    fixHangingSpaces()
    editorState.input(e)
    // Update state with new content
  }
  const setup_handlers = (input, prev_input) => {
    input.oninput = inputhandler(input)
    old_input.oninput = undefined
    input.onbeforeinput = e => {
      if (e.data === " ") {
        e.preventDefault()
        inputhandler(input)(e)
        return false
      }
    }
  }
  setup_handlers()
  document.querySelector("#root").onclick = () => {
    input.lastElementChild.focus()
  }
  document.getElementById("new").onclick = () => {
    let clear = true
    if (save_dirty) {
      clear = confirm("You have unsaved data, you sure?")
    }
    if (clear) {
      localStorage.title = ""
      localStorage.content = ""
      location.reload()
    }
  }

  document.getElementById("save").onclick = () => {
    // Skeleton save handler
    save_dirty = false
    console.log("Saving:", editorState.get_text())
    let filename = title.innerText
    const ext = filename.split(".").length
    if (!ext.length) filename += ".txt"
    dl_string(editorState.get_text(), filename)
  }

  document.getElementById("raw").onclick = () => {
    // Skeleton raw handler
    console.log("Raw content:", editorState.get_raw())
  }

  const z = {
    anim: () => {
      let input = document.querySelector(".input:not(.old-input)")
      let inputs = [...document.querySelectorAll(".input")]
      let inputs_height = inputs
        .map(input => {
          let rects = input.getClientRects()[0]
          return rects.height
        })
        .reduce((a, b) => a + b)
      let emheight = parseFloat(getComputedStyle(input)["font-size"])
      let text = document.querySelector("#text")
      text.style.marginTop = `-${inputs_height + emheight * 2}px`
      requestAnimationFrame(window.z.anim)
    },
  }
  window.z = z

  window.z.anim()
}
