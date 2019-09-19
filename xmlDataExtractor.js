const fs = require('fs')
const path = require('path')
const { flattenArray } = require('./utils')
const { promisify } = require('util')
const parseXmlString = require('xml2js').parseString

const readdirAsync = promisify(fs.readdir)
const readFileAsync = promisify(fs.readFile)
const parseXmlStringAsync = promisify(parseXmlString)

async function recursiveGetXmlFromFolder(initialPath) {
  const initialPathContent = await readdirAsync(initialPath)
  if (initialPathContent.length === 0) return []

  // Find files and parse them
  const fileNames = initialPathContent.filter(name => name.endsWith('.xml'))
  const filesContent = await Promise.all(fileNames.map(fileName => readFileAsync(path.join(initialPath, fileName))))
  const filesParsedXml = await Promise.all(filesContent.map(fileContent => parseXmlStringAsync(fileContent)))
  const result = filesParsedXml.map((xml, index) => ({
    path: path.join(initialPath, fileNames[index]),
    xml,
  }))

  // Recursive stuff
  const folders = initialPathContent.filter(name => name.indexOf('.') === -1)
  const folderPaths = folders.map(folder => path.join(initialPath, folder))
  const folderContentPromises = folderPaths.map(folderPath => recursiveGetXmlFromFolder(folderPath))
  const folderContent = await Promise.all(folderContentPromises)

  return result.concat(folderContent)
}

async function getAllDefsFromRimworldFolder(rimworldGamePath) {
  const modsFolder = path.join(rimworldGamePath, 'Mods')
  const modsList = await readdirAsync(modsFolder)

  const defPromises = modsList.map(async modName => {
    const modPath = path.join(modsFolder, modName)
    const dirs = await readdirAsync(modPath)
    if (dirs.indexOf('Defs') === -1) return []

    return await recursiveGetXmlFromFolder(path.join(modPath, 'Defs'))
  })

  const defs = flattenArray(await Promise.all(defPromises))
  return defs
}

async function getOrganizedXmlData(rimworldGamePath) {
  const defs = await getAllDefsFromRimworldFolder(rimworldGamePath)
  const result = {}
  const invalidDefTypes = new Set(['0', '1', '2', '3', '4'])

  defs.forEach(def => {
    Object.keys(def.xml.Defs).forEach(defType => {
      if (invalidDefTypes.has(defType)) return
      if (!result[defType]) result[defType] = []

      const definitions = def.xml.Defs[defType]
      result[defType].push(...definitions)
    })
  })

  return result
}

module.exports.getOrganizedXmlData = getOrganizedXmlData
