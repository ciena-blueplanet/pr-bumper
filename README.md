[ci-img]: https://img.shields.io/travis/ciena-blueplanet/pr-bumper.svg "Travis CI Build Status"
[ci-url]: https://travis-ci.org/ciena-blueplanet/pr-bumper

[cov-img]: https://img.shields.io/coveralls/ciena-blueplanet/pr-bumper.svg "Coveralls Code Coverage"
[cov-url]: https://coveralls.io/github/ciena-blueplanet/pr-bumper

[npm-img]: https://img.shields.io/npm/v/pr-bumper.svg "NPM Version"
[npm-url]: https://www.npmjs.com/package/pr-bumper

# pr-bumper <br /> [![Travis][ci-img]][ci-url] [![Coveralls][cov-img]][cov-url] [![NPM][npm-img]][npm-url]

Use text from a pull request description to automatically bump the version number of a project upon merge.
`pr-bumper` performs two tasks:
 1. Checking if an open pull request has the appropriate version bump text in its description
 1. Performing the version bump when a pull request is merged.

## Pull Requests
`pr-bumper` uses [Semantic Versioning](http://semver.org/).

Pull requests must include a directive indicating the
scope of the change being made (`MAJOR`/`MINOR`/`PATCH`). Directives are **case insensitive** and wrapped in `#` to
allow them to be used in descriptions. For instance, we wouldn't want a description that says

```
Fixing a major bug in the code
```

To be considered a `MAJOR` change.

We also support the aliases of `BREAKING`, `FEATURE`, and `FIX`.

| Starting Version | Directive    | Ending Version |
| :--------------: | :----------- | :------------: |
| 1.2.3            | `#PATCH#`    | 1.2.4          |
| 1.2.3            | `#FIX#`      | 1.2.4          |
| 1.2.3            | `#MINOR#`    | 1.3.0          |
| 1.2.3            | `#FEATURE#`  | 1.3.0          |
| 1.2.3            | `#MAJOR#`    | 2.0.0          |
| 1.2.3            | `#BREAKING#` | 2.0.0          |


## Integrations
`pr-bumper` currently only supports pull requets on [GitHub](github.com),
but support is also planned for [Bitbucket Server](https://bitbucket.org/product/server).

## Installation

```
npm install pr-bumper
```

## Usage

