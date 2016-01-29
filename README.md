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

It is also optimized to work with [Travis CI](https://travis-ci.org) out-of-the box, but support is also
planned for [TeamCity](https://www.jetbrains.com/teamcity/)

## Installation

```
npm install pr-bumper
```

## Usage
You can check for the existence of a valid directive in the current (open) pr (during the pr build) by using

```
pr-bumper check
```

You can perform the automated bump in the merge build by using:

```
pr-bumper bump
```

## Travis CI
`pr-bumper` is optimized to work with Travis CI and by defaults uses Travis CI environment variables for configuration.

Add the following snippets to your `.travis.yml` file to integrate `pr-bumper`

```yaml
branches:
  except:
    - /^v[0-9\.]+/

before_install:
  - npm install -g pr-bumper

before_script:
  - pr-bumper check

before_deploy:
  - pr-bumper bump
```

This will allow `pr-bumper` to be installed for your build, allow it to check for the existence of version-bump
comments on your PRs, as well as allow it to automatically version-bump and git tag your releases before you deploy
them.

The `branches` section tells travis to skip the `v#.#.#` branches (or tags)

Before `pr-bumper` can push commits and tags back to your repository however, you need to set up authentication.

You'll need a [Personal Access Token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/)
to let Travis push commits to GitHub. Granting `public_repo` access is sufficient for the token you need to use.
The `GITHUB_TOKEN` environment variable needs to be set with your token.
Since you're token should be kept secret, you'll want to encrypt it.

You can do so by using the [Travis Client](https://github.com/travis-ci/travis.rb) to `travis encrypt` your token.

First, you'll need to authenticate with `travis` (you can use the same token for that)

```
travis login --github-token your-token-goes-here
travis encrypt GITHUB_TOKEN=your-token-goes-here --add
```
