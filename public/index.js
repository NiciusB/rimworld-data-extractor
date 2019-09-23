async function main() {
  const idsList = document.getElementById('idsList')
  const infoList = document.getElementById('HTML_Info')
  const searchInput = document.getElementById('searchInput')

  // Parse defs from result.json
  const defsByType = await window.fetch('result.json').then(res => res.json())
  const defs = {}
  Object.keys(defsByType).forEach(defType => {
    defsByType[defType]
      .map(def => {
        if (def.defName || def.$) def.__name = def.defName ? def.defName[0] : def.$.Name
        return def
      })
      .filter(def => def.__name) // Filter out weird ones. They're sounds afaik
      .forEach(def => {
        def.__parentName = (def.parent && def.parent[0]) || (def.$ && def.$.ParentName)
        def.__parentID = def.__parentName
        def.__defType = defType
        def.__defID = encodeURIComponent(def.__name)
        while (defs[def.__defID]) {
          if (def.__defID.indexOf('-') !== -1)
            def.__defID = def.__defID.split('-')[0] + ('-' + (parseInt(def.__defID.split('-')[1]) + 1))
          else def.__defID = def.__defID + '-2'
        }
        defs[def.__defID] = def
      })
  })

  window.addEventListener('hashchange', onHashChange, false)
  function onHashChange() {
    const hash = location.hash.slice(1)
    let defNameFromHash = hash.split('-')[0]
    if (defNameFromHash === '') defNameFromHash = 'Root'

    if (!defs[defNameFromHash]) return

    // remove old content, and add new
    while (infoList.firstChild) {
      infoList.removeChild(infoList.firstChild)
    }

    let defID = { num: 1, id: defNameFromHash }
    while (defs[defID.id]) {
      const defContent = getDefContent(defID.id)
      infoList.appendChild(defContent)

      defID.num++
      defID.id = `${defNameFromHash}-${defID.num}`
    }

    const hasMoreThanOneDefinition = defID.num > 2
    const targetDiv = document.getElementById(hash)
    if (targetDiv) {
      targetDiv.scrollIntoView()
      if (hasMoreThanOneDefinition) {
        targetDiv.classList.add('highlight')
        setTimeout(() => {
          targetDiv.classList.remove('highlight')
        }, 800)
      }
    }
  }

  const onSearchChange = debounce(() => {
    const term = searchInput.value

    const idsContent = getIDsListContent(term)
    while (idsList.firstChild) {
      idsList.removeChild(idsList.firstChild)
    }
    idsList.appendChild(idsContent)
  }, 500)
  searchInput.addEventListener('input', onSearchChange)

  function getIDsListContent(term) {
    const container = document.createElement('div')
    term = term.toLowerCase()
    let lastDefType = null
    Object.values(defs).forEach(def => {
      if (
        JSON.stringify(def)
          .toLowerCase()
          .indexOf(term) === -1
      )
        return

      if (lastDefType !== def.__defType) {
        lastDefType = def.__defType
        const defTypeTitle = document.createElement('h3')
        defTypeTitle.appendChild(document.createTextNode(def.__defType))
        container.appendChild(defTypeTitle)
      }

      const newChild = document.createElement('a')
      newChild.href = `#${def.__defID}`
      newChild.appendChild(document.createTextNode(def.__name))
      container.appendChild(newChild)
    })
    return container
  }

  function getDefParents(def) {
    if (!def) return []
    const parentID = def.__parentID
    if (!parentID || !defs[parentID]) return []
    if (parentID === def.__defID) return [def]

    return [...getDefParents(defs[parentID]), defs[parentID]]
  }

  function getDefChildrens(def) {
    if (!def) return []

    return Object.values(defs).filter(testDef => testDef.__parentID === def.__defID)
  }

  function getDefContent(defID) {
    const def = defs[defID]
    // Content list
    const container = document.createElement('div')
    container.classList.add('singleDefContainer')
    container.id = def.__defID
    // Title
    const title = document.createElement('h2')
    const titleText = `${def.__defID} (${def.__defType.replace('Def', '')})`
    title.appendChild(document.createTextNode(titleText))
    container.appendChild(title)

    // Parents
    const parents = getDefParents(def)
    if (parents.length) {
      const title = document.createElement('b')
      title.appendChild(document.createTextNode('Parents: '))
      container.appendChild(title)

      parents.forEach((parent, index) => {
        const parentLink = document.createElement('a')
        parentLink.href = `#${parent.__defID}`
        parentLink.appendChild(document.createTextNode(parent.__defID))
        container.appendChild(parentLink)
        container.appendChild(document.createTextNode(' > '))
        if (index === parents.length - 1) {
          container.appendChild(document.createTextNode(def.__defID))
        }
      })
    }

    container.appendChild(document.createElement('br'))
    container.appendChild(document.createElement('br'))

    // Childrens
    const childrens = getDefChildrens(def)
    if (childrens.length) {
      const title = document.createElement('b')
      title.appendChild(document.createTextNode('Chidrens: '))
      container.appendChild(title)

      childrens.forEach((children, index) => {
        const parentLink = document.createElement('a')
        parentLink.href = `#${children.__defID}`
        parentLink.appendChild(document.createTextNode(children.__defID))
        container.appendChild(parentLink)
        if (index !== childrens.length - 1) {
          container.appendChild(document.createTextNode(', '))
        }
      })
    }

    container.appendChild(document.createElement('br'))

    // Extra data
    const extraDataElm = document.createElement('pre')
    const extraDataHtml = getExtraDataHtml(def)
    extraDataElm.innerHTML = extraDataHtml
    container.appendChild(extraDataElm)

    return container
  }

  function getExtraDataHtml(def) {
    const keysThatAreNotArraysOfThings = new Set(['label'])
    function replacer(key, value) {
      if (key === 'defName' || key === 'parent') return
      if (key === '$') {
        value = Object.assign({}, value)
        delete value.ParentName
        delete value.Name
        if (Object.keys(value).length === 0) return
      }
      if (
        Array.isArray(value) &&
        !keysThatAreNotArraysOfThings.has(key) &&
        value.length &&
        typeof value[0] === 'string'
      ) {
        value = value.map(val => {
          if (!defs[val]) return val
          let response = `<a href='#${encodeURIComponent(val)}'>${val}</a>`
          return response
        })
      }

      return value
    }

    return JSON.stringify(def, replacer, 2)
  }

  onHashChange()
  onSearchChange()
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
