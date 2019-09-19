async function main() {
  const idsList = document.getElementById('idsList')
  const infoList = document.getElementById('HTML_Info')
  const searchInput = document.getElementById('searchInput')

  const defsByType = await window.fetch('result.json').then(res => res.json())
  const defs = {}

  Object.keys(defsByType).forEach(defType => {
    defsByType[defType]
      .filter(def => def.defName || def.$) // Filter out weird ones. They're sounds afaik
      .forEach(def => {
        def.__name = def.defName ? def.defName[0] : def.$.Name
        def.__parentName = (def.parent && def.parent[0]) || (def.$ && def.$.ParentName)
        defs[def.__name] = def
      })
  })

  window.addEventListener('hashchange', onHashChange, false)
  function onHashChange() {
    let hash = location.hash.slice(1)
    if (!defs[hash]) hash = 'Root'

    // add html content
    const defContent = getDefContent(hash)
    while (infoList.firstChild) {
      infoList.removeChild(infoList.firstChild)
    }
    infoList.appendChild(defContent)
  }
  onHashChange()

  const onSearchChange = debounce(() => {
    const term = searchInput.value

    const idsContent = getIDsListContent(term)
    while (idsList.firstChild) {
      idsList.removeChild(idsList.firstChild)
    }
    idsList.appendChild(idsContent)
  }, 500)
  searchInput.addEventListener('input', onSearchChange)
  onSearchChange()

  function getIDsListContent(term) {
    const container = document.createElement('div')
    term = term.toLowerCase()
    Object.values(defs).forEach(def => {
      if (
        JSON.stringify(def)
          .toLowerCase()
          .indexOf(term) === -1
      )
        return

      const newChild = document.createElement('a')
      newChild.href = `#${encodeURIComponent(def.__name)}`
      newChild.appendChild(document.createTextNode(def.__name))
      container.appendChild(newChild)
    })
    return container
  }

  function getDefParents(defName) {
    const def = defs[defName]
    if (!def) return []
    const parentName = def.__parentName
    if (!parentName) return []
    if (parentName === defName) return [defName]

    return [...getDefParents(parentName), parentName]
  }

  function getDefChildrens(defName) {
    const def = defs[defName]
    if (!def) return []

    return Object.values(defs)
      .filter(testDef => {
        const parentName = testDef.__parentName
        return parentName === defName
      })
      .map(def => def.__name)
  }

  function getDefContent(defName) {
    const def = defs[defName]

    // Content list
    const container = document.createElement('div')
    // Title
    const title = document.createElement('h2')
    title.id = encodeURIComponent(defName)
    title.appendChild(document.createTextNode(defName))
    container.appendChild(title)

    // Parents
    const parents = getDefParents(defName)
    if (parents.length) {
      const title = document.createElement('b')
      title.appendChild(document.createTextNode('Parents: '))
      container.appendChild(title)

      parents.forEach((parentName, index) => {
        const parentLink = document.createElement('a')
        parentLink.href = `#${encodeURIComponent(parentName)}`
        parentLink.appendChild(document.createTextNode(parentName))
        container.appendChild(parentLink)
        container.appendChild(document.createTextNode(' > '))
        if (index === parents.length - 1) {
          container.appendChild(document.createTextNode(defName))
        }
      })
    }

    container.appendChild(document.createElement('br'))
    container.appendChild(document.createElement('br'))

    // Childrens
    const childrens = getDefChildrens(defName)
    if (childrens.length) {
      const title = document.createElement('b')
      title.appendChild(document.createTextNode('Chidrens: '))
      container.appendChild(title)

      childrens.forEach((childrenName, index) => {
        const parentLink = document.createElement('a')
        parentLink.href = `#${encodeURIComponent(childrenName)}`
        parentLink.appendChild(document.createTextNode(childrenName))
        container.appendChild(parentLink)
        if (index !== childrens.length - 1) {
          container.appendChild(document.createTextNode(', '))
        }
      })
    }

    container.appendChild(document.createElement('br'))

    // Extra data
    const extraData = document.createElement('pre')
    extraData.appendChild(document.createTextNode(JSON.stringify(def, undefined, 2)))
    container.appendChild(extraData)

    return container
  }
}
main()

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
  var timeout
  return function() {
    var context = this,
      args = arguments
    var later = function() {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}
