# hyperproxy changelog

## v0.6.0
* [breaking] rename `secureOnly` to `forceSecure`, which is a better name for what the option actually does.

## v0.5.3
* Add `secureOnly` feature, which redirects from an insecure server to the secure one.

## v0.5.0
* Add support for HTTPS, serving multiple certificates with SNI
* Add “explicit” style of declaring servers, using objects instead of arrays.