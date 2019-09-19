module.exports.flattenArray = arr1 => {
  return arr1.reduce(
    (acc, val) => (Array.isArray(val) ? acc.concat(module.exports.flattenArray(val)) : acc.concat(val)),
    []
  )
}
