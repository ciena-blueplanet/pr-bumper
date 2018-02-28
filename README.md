[ci-img]: https://img.shields.io/travis/ciena-blueplanet/pr-bumper.svg "Travis CI Build Status"
[ci-url]: https://travis-ci.org/ciena-blueplanet/pr-bumper

[cov-img]: https://img.shields.io/coveralls/ciena-blueplanet/pr-bumper.svg "Coveralls Code Coverage"
[cov-url]: https://coveralls.io/github/ciena-blueplanet/pr-bumper

[npm-img]: https://img.shields.io/npm/v/pr-bumper.svg "NPM Version"
[npm-url]: https://www.npmjs.com/package/pr-bumper

# pr-bumper <br /> [![Travis][ci-img]][ci-url] [![Coveralls][cov-img]][cov-url] [![NPM][npm-img]][npm-url]

Use text from a pull request description to automatically bump the version number of a project upon merge.
`pr-bumper` performs three main tasks:
 1. Check if an open pull request has the appropriate version bump scope in its description.
 1. Update the version of `package.json` when a pull request is merged based on the scope from the pull request.
 1. Create a tag of the new version after the bump commit.

There are also a number of additional tasks that can be enabled by setting the appropriate values in `.pr-bumper.json`
See [below](#features) for more info on the available optional features.

## Pull Requests
`pr-bumper` uses [Semantic Versioning](http://semver.org/).

Pull request descriptions must include a directive indicating the scope of the change being made
(`major`/`minor`/`patch`/`none`). Directives are **case insensitive** and wrapped in `#` to avoid a description such as

```
Fixing a major bug in the code
```

being considered a `major` change.

We also support the aliases of `breaking`, `feature`, and `fix`.

In addition, `pre-release` tags on versions are supported, but only for the `patch` or `none` scope. When using
`minor` or `major` with a `pre-release` tag, the `pre-release` tag will be cleared.

**NOTE** `pr-bumper` never *introduces* a pre-release tag, it only supports an existing pre-release tag. If you want
to use a pre-release tag, you'll need to add it manually to the `version` in your `package.json` as part of your PR,
then `pr-bumper` will be able to do a `patch` bump to increment the last number in the pre-release for you.

| Starting Version | Directive                 | Ending Version |
| :--------------- | :------------------------ | :------------- |
| 1.2.3            | `#none#`                  | 1.2.3          |
| 1.2.3-alpha.4    | `#none#`                  | 1.2.3-alpha.4  |
| 1.2.3            | `#patch#` or `#fix#`      | 1.2.4          |
| 1.2.3-alpha.4    | `#patch#` or `#fix#`      | 1.2.3-alpha.5  |
| 1.2.3-a.b.9      | `#patch#` or `#fix#`      | 1.2.3-a.b.10   |
| 1.2.3            | `#minor#` or `#feature#`  | 1.3.0          |
| 1.2.3-alpha.4    | `#minor#` or `#feature#`  | 1.3.0          |
| 1.2.3            | `#major#` or `#breaking#` | 2.0.0          |
| 1.2.3-alpha.4    | `#major#` or `#breaking#` | 2.0.0          |


[gfm-checklist-url]: https://github.com/blog/1375-task-lists-in-gfm-issues-pulls-comments
[pr-template-url]: https://github.com/blog/2111-issue-and-pull-request-templates

### GFM Checklist support
You may also specify a list of possible scopes in a [GFM checklist][gfm-checklist-url]
 Example:

 ### This project uses [semver](semver.org), please check the scope of this pr:
 - [ ] #none# - documentation fixes and/or test additions
 - [ ] #patch# - backwards-compatible bug fix
 - [ ] #minor# - adding functionality in a backwards-compatible manner
 - [x] #major# - incompatible API change

Combined with [Pull Request Templates][pr-template-url], contributors who are unfamiliar with `pr-bumper`
will know exactly what to do before the build fails.

## Integrations
[github-url]: https://github.com
[bitbucket-url]: https://bitbucket.org/product
[bitbucket-server-url]: https://bitbucket.org/product/server
[travis-url]: https://travis-ci.org
[teamcity-url]: https://www.jetbrains.com/teamcity/
[bamboo-url]: https://www.atlassian.com/software/bamboo

`pr-bumper` currently supports pull requests on [GitHub][github-url], [Bitbucket][bitbucket-url], and [Bitbucket Server][bitbucket-server-url]

It is also optimized to work with [Travis CI][travis-url] out-of-the box, but can be configured to work with
[TeamCity][teamcity-url] or [Bamboo][bamboo-url] as well using the [`.pr-bumper.json`](#pr-bumperjson) config file.

## Installation

  ```bash
  npm install -g pr-bumper@^3.0.0
  ```

The specific version range is important so that you don't pick up a breaking major version bump without meaning to, for example in your CI script.


## Usage
You can check for the existence of a valid directive in the current (open) pr (during the pr build) by using

  ```bash
  pr-bumper check
  ```

If you set `config.features.coverage.enabled` to `true` in your `.pr-bumper.json`, you can compare your current code
coverage against the saved baseline in `package.json` by using:

  ```bash
  pr-bumper check-coverage
  ```

> **NOTE** You must wait until after your tests have run to perform the above check, or there will be no new coverage
info for `pr-bumper` to check against the baseline.

You can perform the automated bump in the merge build by using:

  ```
  pr-bumper bump
  ```

## Configuration
If you're using Travis CI and public GitHub, `pr-bumper` will probably work well for you out-of-the-box. However, you
can create a `.pr-bumper.json` file at the root of your repository to override any of the defaults.
Here are the defaults that are provided by `pr-bumper` and can be overwritten by defining them in your own
`.pr-bumper.json` file:

  ```json
  {
    "ci": {
      "env": {
        "branch": "TRAVIS_BRANCH",
        "buildNumber": "TRAVIS_BUILD_NUMBER",
        "pr": "TRAVIS_PULL_REQUEST",
        "repoSlug": "TRAVIS_REPO_SLUG"
      },
      "gitUser": {
        "email": "travis.ci.ciena@gmail.com",
        "name": "Travis CI"
      },
      "provider": "travis"
    },
    "features": {
      "changelog": {
        "enabled": false,
        "file": "CHANGELOG.md"
      },
      "comments": {
        "enabled": false
      },
      "compliance": {
        "enabled": false,
        "production": false,
        "output": {
          "requirementsFile": "js-requirements.json",
          "reposFile": "repos",
          "ignoreFile": "ignore"
        },
        "additionalRepos": []
      },
      "coverage": {
        "enabled": false,
        "file": "coverage/coverage-summary.json"
      },
      "dependencies": {
        "enabled": false,
        "snapshotFile": "dependency-snapshot.json"
      },
      "maxScope": {
        "enabled": false,
        "value": "major"
      },
      "logging": {
        "enabled": false,
        "file": "pr-bumper-log.json"
      }
    },
    "vcs": {
      "domain": "github.com",
      "env": {
        "readToken": "RO_GH_TOKEN",
        "writeToken": "GITHUB_TOKEN",
        "username": "",
        "password": ""
      },
      "provider": "github",
      "repository": {
        "name": "",
        "owner": ""
      }
    }
  }
  ```

You'll notice the data in `.pr-bumper.json` is separated into three top-level properties, `ci`, `features` and `vcs`.
[`ci`](#ci) and [`vcs`](#vcs) help `pr-bumper` work with your particular environment, while [`features`](#features)
allows you to enable and configure optional features within `pr-bumper`.

### `ci`
Holds all the information `pr-bumper` needs to interact with your continuous integration system.

#### `ci.env`
Defines the names of the environment variables that `pr-bumper` needs to find out information about the current build.

##### `ci.env.branch`
The name of the environment variable that holds the current branch being built (on a merge build) or the target branch
of a pull request (on a pr build).

The default is `TRAVIS_BRANCH` which is already set in Travis CI.

If you're using a `provider` of `teamcity`, you'll want to specify your own value here (e.g. `TEAMCITY_BRANCH`).

Don't forget you'll need to update your build step in TeamCity to set the variable as well:

  ```bash
  export TEAMCITY_BRANCH="%teamcity.build.branch%"
  ```

##### `ci.env.buildNumber`
The name of the environment variable that holds the number of the current build.

The default is `TRAVIS_BUILD_NUMBER` which is already set in Travis CI.

If you're using a `provider` of `teamcity`, you'll want to specify your own value here (e.g. `TEAMCITY_BUILD_NUMBER`)

Don't forget you'll need to update your build step in TeamCity to set the variable as well:

  ```bash
  export TEAMCITY_BUILD_NUMBER="%teamcity.build.id%"
  ```

##### `ci.env.pr`
The name of the environment variable that holds the number of the pull request (on a pr build) or `false` (on a
merge build)

The default is `TRAVIS_PULL_REQUEST` which is already set in Travis CI.

If you're using a `provider` of `teamcity` or `bamboo`, you'll want to specify your own value here (e.g. `TEAMCITY_PULL_REQUEST`)

Don't forget you'll need to update your build step in TeamCity to set the variable as well:

  ```bash
  stripped_branch=\$(echo "%teamcity.build.branch%" | sed -e "s/\/merge//")
  re='^[0-9]+$'
  if [[ \$stripped_branch =~ \$re ]]
  then
      export TEAMCITY_PULL_REQUEST="\$stripped_branch"
  else
      export TEAMCITY_PULL_REQUEST="false"
  fi
  ```

##### `ci.env.repoSlug`
The name of the environment variable that holds the slug for the repository `<owner>/<name>`.

The default is `TRAVIS_REPO_SLOG` which is already set in Travis CI.

If you're using a `provider` of `teamcity`, there isn't a clean way of getting that information, so you can provide
the owner of the repository (GitHub organization or Bitbucket project) via the `vcs.repo.owner` field.
Similarly, you can provide the name of the repository via the `vcs.repo.name` field.

#### `ci.gitUser`
Information about the git user that will be used by `pr-bumper` to make the version bump commit and create the tag
for the release.

##### `ci.gitUser.email`
You guessed it, the email address of the git user.

##### `ci.gitUser.name`
Surprisingly enough, the name of the git user.

#### `ci.provider`
`pr-bumper` currently supports `travis` (the default), `teamcity` and `bamboo`. When using `travis`, the only
thing you'll probably want to configure is the `ci.gitUser`

### `features`
Holds individual properties for configuring optional features of `pr-bumper`. None of them are enabled by
default.

#### `features.changelog`
`pr-bumper` includes support for managing your `CHANGELOG.md` file for you. When this feature is enabled (by setting
`config.features.changelog.enabled` to `true`) `pr-bumper` augments the behavior of some of its commands.

  ```bash
  pr-bumper check
  ```

This command will now also check the PR description for the existence of a `# CHANGELOG` section, and throw an error
if one is not found.

  ```bash
  pr-bumper bump
  ```

This command will now also take all the content below the `# CHANGELOG` line, and prepend it to the `CHANGELOG.md`.
It will give this new content a heading with the newly bumped version number, along with the date
(in ISO `yyyy-mm-dd` format, based on UTC timezone)

So, if your project is at version `1.2.3` and you have a PR description that looks like:

  ```gfm
  This is a new #feature#

  # CHANGELOG
   * **Added** the ability to do fizz-bang
  ```

that is merged on January 15th, 2017, `pr-bumper` will prepend your `CHANGELOG.md` with the following:

  ```gfm
  # 1.3.0 (2017-01-15)
   * **Added** the ability to do fizz-bang

  ```

##### `features.changelog.enabled`
Set this value to `true` to enable changelog processing

##### `features.changelog.file`
The file to prepend when adding the `# CHANGELOG` section of your pull request description (default is `CHANGELOG.md`).

#### `features.comments`
`pr-bumper` has the ability to post comments to the pull request in certain scenarios. Unfortunately, due to the fact
that posting comments requires write permissions, and Travis CI does not allow access to secure environment variables
during pull request builds (for good reason), posting comments to pull requests is not supported when using Travis CI.

If anyone has any ideas on how to make that work, permission-wise, we'd love to add that support.

For all others (which for now is just TeamCity), one can enable posting pull request comments by setting
`features.comments.enabled` to `true`.

When that flag is set, `pr-bumper` will post comments to pull requests in the following situations:

 * If `pr-bumper check` fails because there is no valid PR scope is found in the PR description.
 * If `pr-bumper check` fails because there is no `# CHANGELOG` section is found in the PR description
    (only if `features.changelog.enabled` is `true`)
 * If `pr-bumper check-coverage` fails because code coverage decreases
    (only if `features.coverage.enabled` is `true`)
 * If `pr-bumper check-coverage` succeeds
    (only if `features.coverage.enabled` is `true`)

##### `features.comments.enabled`
Set this value to `true` to enable PR comments (everywhere but Travis CI)

#### `features.compliance`
`pr-bumper` has the ability to generate a report about what libraries your project is using and what licenses those
libraries are published under.

##### `features.compliance.enabled`
Set this value to `true` to enable compliance reporting.

#### `features.coverage`
`pr-bumper` supports ensuring that code coverage is not decreasing because of a pull request. This is achieved by
comparing the current code coverage against a saved "baseline" coverage percentage. Enabling this feature is done
by setting `features.coverage.enabled` to `true`. The baseline coverage will be stored in `package.json` in the
the following format:

  ```json
  "pr-bumper": {
    "coverage": 85.93
  }
  ```

When enabling the coverage feature, you can either manually create the initial baseline percentage, or let
`pr-bumper` do so after its first `pr-bumper bump` command.

Enabling this feature enables the following command:

  ```bash
  pr-bumper check-coverage
  ```

This will compare your current coverage info against the baseline in `package.json` and throw an error if it is lower
than the baseline.

It also augments the following command:

  ```bash
  pr-bumper bump
  ```

This will now also update the baseline coverage in `package.json` or write it, if it doesn't yet exist.

##### `features.coverage.enabled`
Set this value to `true` to enable coverage checking. Don't forget you also need to add an entry in `package.json`
for the baseline coverage to compare against.

##### `features.coverage.file`
The path to the coverage file to use when comparing against the baseline. The path is relative to the root of the
repository (or, more accurately, wherever `pr-bumper` is being run from). It defaults to
`coverage/coverage-summary.json`. While the location of the file is configurable, the format is not. It is assumed
to be the format used by `istanbul` when using the `json-summary` reporter. There are a number of statistics available
in the `json-summary` report, but the ones that `pr-bumper` looks at are:

 * `total.statements.total`
 * `total.statements.covered`
 * `total.branches.total`
 * `total.branches.covered`

Basically, it aggregates the `statements` and `branches` totals and calculates a covered/total percentage for that
aggregation. This is so that both branches and statements are included in the single coverage number that
`pr-bumper` deals with, to give it more accuracy than just checking a single statistic.

#### `features.dependencies`
`pr-bumper` has the ability to automatically use `npm shrinkwrap` to output a `dependency-snapshot.json`
file for every release. This lets you see exactly what versions of all your dependencies were in use when that version
was built.

When enabled, it will augment the following command:

  ```bash
  pr-bumper bump
  ```

In the same commit that bumps the version, `pr-bumper` will use `npm shrinkwrap` to spit out a dependency snapshot
at the time of that release, which will then be included in the tag for that release, providing a snapshot of exactly
what versions of every nested dependency was used at the time of the build for that release. Such a snapshot can be
very useful in trying to find out what downstream dependency changed to break your project.

##### `features.dependencies.enabled`
Set this value to `true` to enable the dependency snapshot feature.

##### `features.dependencies.snapshotFile`
The name of the file to generate when creating a dependency snapshot (default is `dependency-snapshot.json`)

#### `features.maxScope`
Make sure not to accept bumps of a higher scope than you want. Ideal for maintenance branches, to prevent a `major`
bump that would conflict with the main branch. The order from least to greatest of scopes is:
 * `none`
 * `patch`
 * `minor`
 * `major`

So, if `features.maxScope.value` is `major` (the default), all bumps are allowed.
If `features.maxScope.value` is `patch`, only `none` and `patch` are allowed. You get the idea.

##### `features.maxScope.enabled`
Set this value to `true` to enable the maxScope check.

##### `features.maxScope.value`
The value to use for the maximum scope (default is `major`), must be one of [`major`, `minor`, `patch`, `none`]

#### `features.logging`
Log what `pr-bumper` does during a `bump` to a file, so the information can be used by another tool later on.

The log file that will be created will look something like this:

```json
{
  "changelog": "### Added\n- Some cool new feature",
  "pr": {
    "number": 123,
    "url": "https://github.com/ciena-blueplanet/pr-bumper/pull/123"
  },
  "scope": "minor",
  "version": "1.3.0",
}
```

- `changelog` - The full text of the changelog that was added during this `bump`
- `pr.number` - The pull request number that was merged for this `bump`
- `pr.url` - The URL for the pull request that was merged for this `bump`
- `scope` - the scope of the `bump` performed
- `version` - the new version after the `bump`

##### `features.logging.enabled`
Set this value to `true` to enable the creation of the log file during a `bump`.

##### `features.logging.file`
The name of the file to create after a `bump`, the contents of the file will be `json` regardless of the name of
the file given here.

### `vcs`
Holds all the information `pr-bumper` needs to interact with your version control system.

#### `vcs.domain`
The domain of your VCS. This would be `github.com` (the default) if using public github, or the domain of your
private GitHub Enterprise or Bitbucket Server instance.

#### `vcs.env`
Holds the names of environment variables `pr-bumper` uses to interact with your VCS.

##### `vcs.env.readToken`
[env-docs]: https://docs.travis-ci.com/user/environment-variables/#Encrypted-Variables
The name of the environment variable that holds the read only access token to use when accessing the GitHub API.
While one can access the GitHub API just fine without a token, there are rate-limits imposed on anonymous API requests.
Since those rate-limits are based on the IP of the requester, you'd be sharing a limit with anyone else building in
your CI, which, for Travis CI, could be quite a few people. So, if you specify a `vcs.env.readToken` and
set the corresponding environment variable in your CI environment, `pr-bumper` will use that token when making API
requests to find out information about pull requests. Since we need to be able to access `RO_GH_TOKEN` during a PR
build, it cannot be encrypted, and thus will not be private. See [travis docs][env-docs] for more info about encrypted
environment variables.

> **NOTE** Since `RO_GH_TOKEN` is not secure, it is printed directly into your Travis Logs!!!
> So, make sure it has only read access to your repository. Hence the name `RO_GH_TOKEN` (Read Only GitHub Token)

##### `vcs.env.writeToken`
The name of the environment variable that holds the write access token to use when pushing commits to your vcs
(specifically GitHub). Since this environment variable stores a token with write access to your repository, it must
be encrypted. The default value is `GITHUB_TOKEN`. Here's an example of how you can encrypt a `GITHUB_TOKEN` into your
`.travis.yml` for use in Travis CI. If you have a private CI, you can probably just configure the environment variable.

[github-pat]: https://help.github.com/articles/creating-an-access-token-for-command-line-use/
In case you're unfamiliar, GitHub allows users to create [Personal Access Tokens][github-pat] to allow various levels
of access to external systems. The `public_repo` access is sufficient for `pr-bumper` to be able to push commits and
create tags on your behalf. You'll want to create this token on whatever GitHub user you want to be responsible for
your version bump commits and automatic release tags. Once you've got a Personal Access Token with the correct
permissions, you'll want to encrypt it into `.travis.yml` to let it be accessible in your merge builds, but not
publicly available.

You can do so by using the [Travis Client](https://github.com/travis-ci/travis.rb) to `travis encrypt` your token.

First, you'll need to authenticate with `travis` (you can use the same token for that)

  ```bash
  travis login --github-token <your-token>
  travis encrypt GITHUB_TOKEN=<your-token> --add -r <owner>/<repo>
  ```

If you do not use a fork workflow and your `origin` is the main repository, you can skip the `-r <owner>/<repo>` part.
Otherwise, replace the `<owner>/<repo>` with the organization and name of your `upstream` repository.

##### `vcs.env.username` and `vcs.env.password`
The names of the environment variables that hold credentials for a Bitbucket Server user with write permissions on
your repository. This is necessary when using a `provider` of `bitbucket-server` since Bitbucket Server doesn't have
a Personal Access Token concept like GitHub and GitHub Enterprise do.

#### `vcs.provider`
`pr-bumper` currently supports three VCS providers: `github` (the default), `github-enterprise`,
and `bitbucket-server`. When using `github` the defaults should be sufficient, when using `github-enterprise` make
sure to remember to set `vcs.domain` to point to your GitHub Enterprise instance. When using
`bitbucket-server`, make sure to set the following:
 * `vcs.domain`
 * `vcs.env.username`
 * `vcs.env.password`
 * `vcs.repository.name`
 * `vcs.repository.owner`

#### `vcs.repository`
Holds info about the name and organization of the repository. Not required when using a `travis` CI, but necessary
when using a `teamcity` CI.

##### `vcs.repository.name`
The name of the repository (no matter what kind of VCS you have).

##### `vcs.repository.owner`
The name of the project that holds your repository (in Bitbucket Server), or the name of the organization that holds
your repository (in GitHub and GitHub Enterprise).

## Integrations

### Travis CI
`pr-bumper` is optimized to work with Travis CI and by default uses Travis CI environment variables for configuration.

Add the following snippet to your `.travis.yml` file to integrate `pr-bumper`

  ```yaml
  before_install:
    - npm install -g pr-bumper@^3.0.0

  install:
    - $(npm root -g)/pr-bumper/.travis/maybe-install.sh

  before_script:
    - $(npm root -g)/pr-bumper/.travis/maybe-check-scope.sh

  script:
    - $(npm root -g)/pr-bumper/.travis/maybe-test.sh
    - $(npm root -g)/pr-bumper/.travis/maybe-bump-version.sh

  after_success:
    - $(npm root -g)/pr-bumper/.travis/maybe-publish-coverage.sh

  deploy:
    on:
      all_branches: true
      node: '6.11.0'
      tags: true
  ```

This will allow `pr-bumper` to be installed for your build, allow it to check for the existence of version-bump
comments on your PRs, as well as allow it to automatically version-bump and git tag your releases before you deploy
them. You'll notice that in the *deploy* section we tell Travis to deploy for all branches when a tag is part of the
commit. The way this works is when you merge a pull request the merge build will run the tests as well as the
`pr-bumper bump` command. As part of this build a new commit will be pushed back to your VCS firing off two new builds,
one for the branch and one for the tag. The build for the branch will be exited as soon as possible as we don't care
about that build. The build for the tag is where the actual deployment to npm will occur.

*NOTE: The above snippet uses the scripts from this project itself which may or may not suite your needs. If you find
one of the scripts doesn't do exactly what you need, then copy it directly into your project, modify it, and update
the Travis config to run you modified copy instead.*

### Bitbucket / TeamCity
You can now configure `pr-bumper` to work with something other than Travis CI and GitHub.
The only other configuration that has been tested is TeamCity and Bitbucket Server.
Example TeamCity and Bitbucket Server configuration:

  ```json
  {
    "config": {
      "ci": {
        "env": {
          "branch": "TEAMCITY_BRANCH",
          "buildNumber": "TEAMCITY_BUILD_NUMBER",
          "pr": "TEAMCITY_PULL_REQUEST"
        },
        "gitUser": {
          "email": "ci-user",
          "name": "ci-user@my-company-domain.com"
        },
        "provider": "teamcity",
        "repository": {
          "owner": "my-bitbucket-project",
          "name": "my-bitbucket-repository"
        }
      },
      "vcs": {
        "domain": "bitbucket.my-company-domain.com",
        "env": {
          "username": "BITBUCKET_USERNAME",
          "password": "BITBUCKET_PASSWORD"
        },
        "provider": "bitbucket-server"
      }
    }
  }
  ```

Example Bamboo and Bitbucket configuration:
```json
  {
    "config": {
      "ci": {
        "env": {
          "branch": "$bamboo_BRANCH",
          "buildNumber": "$bamboo_BUILD_NUMBER",
          "pr": "$bamboo_PULL_REQUEST"
        },
        "gitUser": {
          "email": "ci-user",
          "name": "ci-user@my-company-domain.com"
        },
        "provider": "bamboo",
        "repository": {
          "owner": "my-bitbucket-project",
          "name": "my-bitbucket-repository"
        }
      },
      "vcs": {
        "domain": "api.bitbucket.org",
        "env": {
          "username": "$bamboo_BITBUCKET_USERNAME",
          "password": "$bamboo_BITBUCKET_PASSWORD"
        },
        "provider": "bitbucket"
      }
    }
  }
  ```
