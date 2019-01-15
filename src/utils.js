/*
 * Generate a random UUID
 */
const UUID = (size) => {
  const def = 32
  var len = size && size.length > 0 ? size : def

  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('')
  if (typeof len !== 'number') {
    len = def
  }
  var str = ''
  for (var i = 0; i < len; i++) {
    str += chars[Math.floor(Math.random() * chars.length)]
  }
  return str
}

module.exports = { UUID }
