const test = require('tap').test
const urlglob = require('../urlglob')

test('urlglob', function (t) {
  t.same(str(urlglob('*')), str(/^.*?\/?$/), 'should match all')
  t.same(str(urlglob('\\*lol.com\\*')), str(/^\*lol\.com\*\/?$/), 'should escape stuff')

  t.ok(urlglob('/food/*/cheese', '/food/sandwich/cheese'), 'should match cheese sandwich')
  t.ok(urlglob('/food/*/cheese', '/food/pizza/cheese/'), 'should match cheese pizza')
  t.ok(urlglob('/star/\\*', '/star/*'), 'should match literal star')
  t.notOk(urlglob('/star/\\*', '/star/anything'), 'should not match anything')
  t.ok(urlglob.inCache('*'), 'should be in cache')
  t.ok(urlglob.inCache('/star/\\*'), 'should be in cache')

  console.dir(urlglob.cache.keys())

  t.end()
})

function str(thing) {
  return thing.toString()
}
