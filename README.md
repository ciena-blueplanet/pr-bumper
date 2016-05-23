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
avoid a description such as

```
Fixing a major bug in the code
```

being considered a `MAJOR` change.

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
travis encrypt GITHUB_TOKEN=your-token-goes-here --add -r owner/repo
```

If you do not use a fork workflow and your `origin` is the main repository, you can skip the `-r owner/repo` part.
Otherwise, replace the `owner/repo` with the organization and repo of your `upstream` repository.

[env-docs]: https://docs.travis-ci.com/user/environment-variables/#Encrypted-Variables
Also, to avoid rate-limit issues on API requests to github, you should also specify a `RO_GH_TOKEN` 
for `pr-bumper` to use when making read requests to github. This is necessary because secure environment variables are not available
to pull request builds when coming from forks in travis for [security reasons][env-docs].

> **NOTE** Since `RO_GH_TOKEN` is not secure, it is printed directly into your Travis Logs!!! 
> So, make sure it has only read access to your repository. Hence the name `RO_GH_TOKEN` (Read Only GitHub Token)

## .pr-bumper.json
If using TravisCI most configuration options will not be needed, but if you have a different CI or specific requirements 
like handling changelog generation separately, configuration can be defined by placing a `.pr-bumper.json` file in the root of your repository.

### Bitbucket Server / TeamCity
You can now configure `pr-bumper` to work with something other than Travis CI and GitHub.
The only other configuration that has been tested is TeamCity and Bitbucket Server.
Example TeamCity and Bitbucket setup:


```json
{
  "ci": {
    "env": {
      "buildNumber": "TEAMCITY_BUILD_NUMBER",
      "pr": "TEAMCITY_PULL_REQUEST"
    },
    "gitUser": {
      "email": "ci-user",
      "name": "ci-user@my-company-domain.com"
    },
    "provider": "teamcity"
  },
  "owner": "my-bitbucket-project",
  "repo": "my-bitbucket-repository",
  "vcs": {
    "domain": "bitbucket.my-company-domain.com",
    "env": {
      "username": "BITBUCKET_USERNAME",
      "password": "BITBUCKET_PASSWORD"
    },
    "provider": "bitbucket-server"
  }
}
```

### `ci.env.buildNumber`
A string that provides the environment variable that holds the TeamCity build number on the agent that runs your build.
One way to set that variable is with the following in your Build Step:

```
export TEAMCITY_BUILD_NUMBER="%teamcity.build.id%"
```

### `ci.env.pr`
A string that provides the environment variable that holds the PR number of the pull request
being built (empty when a not a PR build).
One way to fill that variable is by including the following in your Build Step:

```
stripped_branch=\$(echo "%teamcity.build.branch%" | sed -e "s/\/merge//")
re='^[0-9]+$'
if [[ \$stripped_branch =~ \$re ]]
then
    export TEAMCITY_PULL_REQUEST="\$stripped_branch"
else
    export TEAMCITY_PULL_REQUEST="false"
fi
```

### `ci.gitUser`
You can configure the `email` and `name` that will be used by the `git` user for the `commit` that bumps the
version in `package.json` and prepends content to `CHANGELOG.md` This setting can be used even if you're using
the `travis` provider (see below)

### `ci.provider`
Here you configure what CI system you use, the only currently supported options are `travis` (the default),
or `teamcity`

### `owner`
The Bitbucket project where your repository resides

### `repo`
The name of your Bitbucket repository

### `vcs.domain`
The domain of your Bitbucket Server installation

### `vcs.env.username` and `vcs.env.password`
Strings that provide the environment variables which hold the credentials for a user with write permissions on the
repository in question.

### `vcs.provider`
Here you configure what VCS system you use, the only currently supported options are `github` (the default),
or `bitbucket-server`

### `prependChangelog`
Boolean whether to read the PR description to insert into CHANGELOG.md on bump. Defaults to `true`.

Disable `prependChangelog` example:

`.pr-bumper.json`
```json
{
  "prependChangelog": false
}
```