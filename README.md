# hyperproxy

Transparently proxy to local ports or sockets with advanced routing.

## Install

```bash
$ npm install hyperproxy
```

## Library Usage

### Egregious example
```js
const hyperproxy = require('hyperproxy')

const proxy = new Proxy([
  servers: {
    [ 'tau.example.org', ':1618' ],
    [ 'pi.example.org', ':3141' ],
    [ 'euler.example.org', ':2718' ]
    [ '*.example.org', '/tmp/any-subdomain.socket' ],
    [ 'example.org', [
      ['/static/*', '/tmp/static.socket' ],
      ['/js/*', '/tmp/javascript.socket' ],
      ['/api/v*/*.json', '/tmp/json-api.socket' ],
      ['/api/v*/*.xml', '/tmp/xml-api.socket' ],
    ]],
    [ '*', '/tmp/default.socket' ],
  ]
})

const gateway = proxy
  .createServer(function(req, res, next){
    // callback is optional, if nothing is passed proxying will
    // happen as normal. when a callback is passed, calling `next`
    // will continue on to the proxy routing process.
    res.headers['x-proxy'] = 'hyperproxy'
    next() // continue to proxy routing
  }).listen(80)
```

## License

MIT

```
Copyright (c) 2013 Brian J. Brennan

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```