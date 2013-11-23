const LRU = require('lru-cache')
const cache = LRU(500)

const sep = '%'+Date.now()+'%'

module.exports = urlglob

function urlglob(pattern, test) {
  var regex;
  const regexFromCache = cache.get(pattern)
  if (regexFromCache)
    regex = regexFromCache
  else {
    regex = convert(pattern)
    cache.set(pattern, regex)
  }
  if (!test) return regex

  const cacheKey = [pattern, sep ,test].join('')
  const matchFromCache = cache.get(cacheKey)

  if (typeof matchFromCache != 'undefined')
    return matchFromCache

  const match = regex.test(test)
  cache.set(cacheKey, match)
  return match
}

function convert(pattern) {
  const escaped = pattern.replace(/([()[{+.$^\\|?])/g, '\\$1');
  const placeholder = '%STAR%' + Date.now() + '%'
  const catchAll = '.*?'
  const regexp = '^' + escaped
    .replace(/\\[*]/g, placeholder)
    .replace(/\*/, catchAll)
    .replace(RegExp(placeholder, 'g'), '*')
    + '\\/?$'
  return new RegExp(regexp)
}

urlglob.inCache = function inCache(pattern) {
  return cache.get(pattern)
}

urlglob.cache = cache
urlglob.convert = convert
