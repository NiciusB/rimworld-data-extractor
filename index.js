#!/usr/bin/env node
const { getOrganizedXmlData } = require('./xmlDataExtractor')
const { promisify } = require('util')
const path = require('path')
const fs = require('fs')
const arg = require('arg')
const handler = require('serve-handler')
const http = require('http')

const writeFileAsync = promisify(fs.writeFile)

const args = arg({
  '--rimworldGamePath': String,
  '--resultPath': String,
})

async function main() {
  const rimworldGamePath = args['--rimworldGamePath']
  const resultPath = path.join(__dirname, 'public', 'result.json')

  if (!rimworldGamePath) {
    console.log('Param --rimworldGamePath is needed')
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
