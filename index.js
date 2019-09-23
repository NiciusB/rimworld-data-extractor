#!/usr/bin/env node
const { getOrganizedXmlData } = require('./xmlDataExtractor')
const { promisify } = require('util')
const path = require('path')
const fs = require('fs')
const arg = require('arg')
const handler = require('serve-handler')
const http = require('http')

const writeFileAsync = promisify(fs.writeFile)
const lstatAsync = promisify(fs.lstat)

const args = arg({
  '--rimworldGamePath': String,
})

async function main() {
  let rimworldGamePath = args['--rimworldGamePath']
  const resultPath = path.join(__dirname, 'public', 'result.json')

  if (!rimworldGamePath) {
    // Test common paths for the game dir:
    const testPaths = [
      'C:/SteamLibrary/steamapps/common/RimWorld',
      'D:/SteamLibrary/steamapps/common/RimWorld',
      'E:/SteamLibrary/steamapps/common/RimWorld',
    ]
    for (let testPath of testPaths) {
      if (await isPathDir(testPath)) {
        rimworldGamePath = testPath
        console.log(
          `Auto-detected '${testPath}' as the Rimworld installation folder, since no argument '--rimworldGamePath' was provided`
        )
      }
    }
  }

  if (!rimworldGamePath) {
    console.log('Argument --rimworldGamePath is needed, since no Rimworld installation was detected')
    return
  }

  console.log(`Getting data from the rimworld directory...`)
  const data = await getOrganizedXmlData(rimworldGamePath)
  writeFileAsync(resultPath, JSON.stringify(data))

  const server = http.createServer((request, response) => {
    return handler(request, response, {
      public: path.join(__dirname, 'public'),
    })
  })
  server.listen(3000, () => {
    console.log('Running at http://localhost:3000')
  })
}
main()

async function isPathDir(path) {
  try {
    const stat = await lstatAsync(path)
    return stat.isDirectory()
  } catch (e) {
    // lstatSync throws an error if path doesn't exist
    return false
  }
}
