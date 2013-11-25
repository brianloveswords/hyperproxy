# hyperproxy [![Build Status](https://secure.travis-ci.org/brianloveswords/hyperproxy.png?branch=master)](http://travis-ci.org/brianloveswords/hyperproxy)

Reverse proxy with advanced routing capabilities

Uses <code>[urlglob](https://github.com/brianloveswords/urlglob)</code> for route matching

## Install

```bash
$ npm install hyperproxy
```

## Library Usage

### Egregious example
```js
const Hyperproxy = require('hyperproxy')

const proxy = new Hyperproxy({
  servers: [
    // routes are tested in order, so exact matches should come first
    // and less specific routes afterwards

    // exact matches, routes to local ports
    [ 'tau.example.org', ':1618' ],
    [ 'pi.example.org', ':3141'  ],
    [ 'euler.example.org', ':2718' ],

    // route to an external domain
    [ 'google.example.org', 'google:80' ],

    // matches
    // - 'images.example.org'
    // - 'stuff.user.example.org'
    // - '⚡.example.org'
    [ '*.example.org', '/tmp/any-subdomain.socket' ],

    // url matching!
    [ 'example.org', [
      // matches all sub paths, e.g. /static/a/b/
      ['/static/*', '/tmp/static.socket' ],

      // use '*?' to match one level deep, e.g '/js/x.js',
      // but not '/js/sub/x.js'
      ['/js/*?', '/tmp/javascript.socket' ],

      // matches '/v2/x/y/z.json', '/v22.73/stuff.json'
      ['/api/*.json', '/tmp/json-api.socket' ],

      // matches '/v1/x/y/z.xml', '/vπ/stuff.xml'
      ['/api/*.xml', '/tmp/xml-api.socket' ],
    ]],

    // handle anything that falls through.
    [ '*', '/tmp/default.socket' ],
  ]
})

const server = proxy
  .createServer(function(req, res, proxyRoute){
    // callback is optional, if nothing is passed proxying will
    // happen as normal. when a callback is passed, calling `proxyRoute`
    // will continue on to the proxy routing process.
    res.headers['x-proxy'] = 'hyperproxy'
    proxyRoute() // continue to proxy routing
  }).listen(80)
```

### Error Handling

There are number of things that can go wrong when trying to proxy a request: it could not match any routes, the socket could be missing or dead, the remote host could be down or something else completely unexpected.

When this happens, the default method of handling it will be to return a `HTTP 502: Bad Gateway` to the requesting client. However, if you attach an event handler to any one of the events below, the default behavior will be bypassed (though you will still be able to invoke it from the event handler).

#### <code>proxyMiss</code>
 A route couldn't be found

#### <code>missingSocketFile</code>
 Couldn't find the socket file associated with the route

#### <code>hostNotFound</code>
Couldn't find the host associated with the route

#### <code>unknownError</code>
Catch-all for any other problems that occur when trying to attach an endpoint to a request.

All event handlers get four arguments: `(err, req, res, defaultHandler)`

`defaultHandler` is a reference to the default error handler. For example, if you wanted to log all unknown errors and passthrough to the default handler, you could do the following:

```js
server.on('unknownError', function(err, req, res, defaultHandler){
  // use your log handler
  logger.log('unknown proxy error', err)
  defaultHandler()
})
```


## Current Limitations
These may be implemented as plugins later on.

* `http` only, no support for `https` or `ws`.
* No load balancing, caching or any "advanced" features.

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