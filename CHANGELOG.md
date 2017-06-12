# 1.11.2 (2017-06-12)
 * **Updated** secure auth tokens to fix build
 * **Added** CHANGELOG details from last failed build


# 1.11.1 (2017-06-09 *unpublished*)
* Change Teamcity/Base ci to utilize addRemoteForPush

# 1.11.0 (2017-03-30)
* **Added** a command-line switch `--skip-comments` which explicitly sets `prComments` to `false` in the config, regardless of what is in `.pr-bumper.json`. Useful when you just want to get the coverage change info and setting `SKIP_COMMENTS` environment variable is difficult.

* **Fixed** grammar of PR comment about missing scope (thanks @gknoy)


# 1.10.0 (2017-03-15)
* **Updated** check for current coverage to use `statements` instead of `lines` as it seems the more accurate metric.

# 1.9.0 (2017-03-15)
* **Added** support for skipping pr comments in the `pr-bumper check-coverage` command by supplying a `SKIP_COMMENTS` env variable.

# 1.8.2 (2017-03-15)
* **Fixed** PR comments to use `## ERROR` instead of `##ERROR` since apparently at least bitbucket doesn't consider the latter a heading.


# 1.8.1 (2017-03-15)
* **Fixed** bug where `pr-bumper check-coverage` failed in dev if `prComments` was `true`
* **Fixed** logging in `pr-bumper` to only print if `VERBOSE` environment variable is set (except for coverage info, that is forced to log regardless)
* **Fixed** PR comments to include clear indication if the message is the result of an error.
* **Fixed** PR comments to be formatted nicer (using markdown syntax)
* **Fixed** PR comments to be more detailed and offer a clearer path to know how to resolve the issue at hand.
* **Added** more documentation about the changelog feature


# 1.8.0 (2017-03-14)
* **Added** ability to post comments to pull requests in certain scenarios. By default this behavior is off, it can be enabled by adding:
  ```json
  "prComments": true
  ```
  to your `.pr-bumper.json` config.
  **Sadly** this feature does not currently work in github.com/travis scenarios. Mainly because `pr-bumper` doesn't have sufficient permissions during the PR build to post a comment on the PR. We're trying to find a way around that, but in the meantime, at least the feature can be used in bitbucket server / teamcity scenarios.

# 1.7.0 (2017-03-14)
* **Added** a date string (ISO standard `YYYY-MM-DD`) to the title line when prepending changelog with a new version.
* **Fixed** bug where version bump in `package.json` was being overwritten by coverage update  [#89](https://github.com/ciena-blueplanet/pr-bumper/issues/89).

# 1.6.0 (never published due to [#89](https://github.com/ciena-blueplanet/pr-bumper/issues/89))
* **Added** the ability to ensure code coverage does not decrease because of a PR. Simply add your project's current code coverage in `package.json` under:
  ```js
  "pr-bumper": {
    "coverage": 95.93
  }
   ```
  Then add a `pr-bumper check-coverage` call to your CI. The `check-coverage` command will fail if the current code coverage is below the baseline in your `package.json`.  

  **NOTE**: You must place the `pr-bumper check-coverage` line **after** you run your tests, or `pr-bumper` will not be able to find the current code coverage information to check against the baseline, and your build will fail regardless of your code coverage.

  During a `pr-bumper bump` command, the current coverage will be saved to `package.json`

* **Added** the ability to customize the name of the changelog file to prepend (defaults to `CHANGELOG.md` still).
* **Added** a `[pr-bumper]` prefix to all commits made by `pr-bumper` so they can be easily identified.
* **Added** a `pr-bumper: ` prefix to all messages logged to the console by `pr-bumper` so they can be easily identified.
* **Added** initial coverage baseline to `package.json` within this project to enable code coverage check.
* **Added** `check-coverage` check after the build.
* **Added** `.travis/maybe-check-coverage.sh` script to wrap a call to `pr-bumper check-coverage` and skip it if the commit being built is a `pr-bumper` commit.
* **Updated** how `.travis/is-bump-commit.sh` verifies that a commit came from `pr-bumper` to match the new prefix being used by `pr-bumper` for commits.

# 1.5.0
* **Improved** application of default values when processing `.pr-bumper.json`. Whereas previously you would have to provide an entire, complex, nested object if you wanted to override the default for any part of a config object, you can now override a partial object in your `.pr-bumper.json` and the rest of the object will get the appropriate defaults.


# 1.4.0
* **Updated** script to allow the passing of an argument to run only on non-bump commits

# 1.3.0
* **Added** initial support for GitHub Enterprise (not integration tested yet)


# 1.2.0
* **Added** ability to override the default `node` version that will be used for publishing via the `PUBLISH_NODE_VERSION` environment variable in `.travis/` scripts provided by `pr-bumper`
  ```bash
  PUBLISH_NODE_VERSION=stable $(npm root -g)/pr-bumper/.travis/maybe-bump-version.sh
  ```

  can be used to switch the `node` version that used for bumping from `6.9.1` to `stable`
* **Updated** `README.md` to suggest installing `pr-bumper` with a version scope, to protect against future breaking changes

# 1.1.13

* **Fixed** bug where merge would fail when using `none` scope as it'd still expect a changelog to be present.

# 1.1.12

* **Updated** Travis build scripts.

  > NOTE: For projects already using *pr-bumper* with Travis CI, you'll want to update your *.travis.yml* file to match the updated [README](https://github.com/sandersky/pr-bumper/#travis-ci).

# 1.1.11
* **Fixed** speed of redundant builds to hopefully skip most things

# 1.1.10
* **Stopped** adding `[ci skip]` to commit messages to try to get tags to build

# 1.1.9
* **Fixed** travis config (hopefully)

# 1.1.8
* **Tried** again to fix the Travis CI build

# 1.1.7
 * **Fix** publishing of non `#none#` bumps


# 1.1.6
* **Fixed** (or trying to at least) CI publishing


# 1.1.5
* **Added** slack integration for codecov.io

# 1.1.4
* **Fixed** an issue with running `npm shrinkwrap` that arises when some package installs things into `node_modules` that isn't in `package.json` by doing an `npm prune` before `npm shrinkwrap`


# 1.1.3
* **Fixed** issue where `npm shrinkwrap` was being called w/o `--dev` so not all dependencies were actually being accounted for in the snapshot. This is particularly important in things like ember apps where everything is in `devDependencies`.


# 1.1.2
 * **Updated** tests to run in `node@5.0.0` and `node@6.9.1` and only publish after success on `node@6.9.1`.


# 1.1.1
* Remove destructuring to avoid problem on node 5.11.1

# 1.1.0
* **Added** a `dependencySnapshotFile` property to `.pr-bumper.json` which defaults to `dependency-snapshot.json` more information available [here](https://github.com/ciena-blueplanet/pr-bumper#dependencysnapshotfile)


# 1.0.0
 * **Fixed** #44 by throwing an error when `# CHANGELOG` is missing/empty unless `prependChangelog` is set to `false`.  This is a **breaking** change as previously missing `# CHANGELOG` sections would result in a default message in the `CHANGELOG.md` file.


# 0.7.4
* **Addedd** another test to try out codecov.io reporting.

# 0.7.3
* **Attempted** to switch from [coveralls.io](http://coveralls.io) to [codecov.io](http://codecov.io)


# 0.7.2
 * **Restored** default behavior of using `master` branch if no `ci.env.branch` config is specified.


# 0.7.1
* **Fixed** #55



# 0.7.0
`.pr-bumper.json` app configs now take new options:
```
...
"dependencies": {
    "output": {
      "directory": "somedir",
      "requirementsFile": "requirements.json",
      "reposFile": "repos",
      "ignoreFile": "ignore"
    },
    production: false,
    "additionalRepos": [
          {
            "pattern": "\\s+\"(ember\\-frost\\-\\S+)\"",
            "url": "https://github.com/ciena-frost/${REPO_NAME}.git"
          },
          {
            "pattern": "\\s+\"(frost\\-\\S+)\"",
            "url": "https://bitbucket.ciena.com/scm/bp_frost/${REPO_NAME}.git"
          }
        ]
  },
...
```

If this option block is present, it triggers running the dependency reporting routine, which generates a list of all required deps in the `requirementsFile`, a list of additional repos in the `reposFile` and a list of pertinent ignores in the `ignoreFile`.  These files land in the `directory` in the root of the reporting project.

The `additionalRepos` block is an array of hashes that indicate a RegEx pattern to search `package.json` entries for, and each corresponding url will be used to give an absolute path to the matched repo.  This is useful for coming up with lists of repo locations needed by the auditing party.

The `production` property will cause the tool to only search `dependencies` in your `package.json`.  If it's left `false` (the default) or omitted, the reporter will search both `dependencies` and `devDependencies`.

# 0.6.0
 * **Added** support for using GFM Checkboxes to choose scope
 * **Added** a `PULL_REQUEST_TEMPLATE` for the `pr-bumper` repository itself

# 0.5.2
- Adds config to suppress changelog generation

Closes #43

# 0.5.1
 * **Added** documentation about `RO_GH_TOKEN` and a warning that it is printed to travis logs.

# 0.5.0
You can now configure `pr-bumper` to work with something other than Travis CI and GitHub. The only other configuration that has been tested is TeamCity and Bitbucket Server. You can configure `pr-bumper` to work with TeamCity and Bitbucket Server by placing a `.pr-bumper.json` file in the root of your repository and filling in some information about your CI setup:

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
## `ci.env.buildNumber`
A string that provides the environment variable that holds the TeamCity build number on the agent that runs your build. One way to set that variable is with the following in your Build Step:
```
export TEAMCITY_BUILD_NUMBER="%teamcity.build.id%"
```
## `ci.env.pr`
A string that provides the environment variable that holds the PR number of the pull request being built (empty when a not a PR build). One way to fill that variable is by including the following in your Build Step:
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

## `ci.gitUser`
You can configure the `email` and `name` that will be used by the `git` user for the `commit` that bumps the version in `package.json` and prepends content to `CHANGELOG.md` This setting can be used even if you're using the `travis` provider (see below)

## `ci.provider`
Here you configure what CI system you use, the only currently supported options are `travis` (the default), or `teamcity`

## `owner`
The Bitbucket project where your repository resides

## `repo`
The name of your Bitbucket repository

## `vcs.domain`
The domain of your Bitbucket Server installation

## `vcs.env.username` and `vcs.env.password`
Strings that provide the environment variables which hold the credentials for a user with write permissions on the repository in question.

## `vcs.provider`
Here you configure what VCS system you use, the only currently supported options are `github` (the default), or `bitbucket-server`


# 0.4.2
Format the `CHANGELOG.md` file properly by adding some newlines after the prepended entry.

# 0.4.1
 * Fixes issue where `\r` characters in the pr description weren't properly handled. Who knew GitHub was built on Windows? ;)
 * Fixes issue where users had to be extremely specific with their `# CHANGELOG` section heading. The following are now all valid as well: `#CHANGELOG`, `# CHANGELOG  `, `#changelog `, `# changelog`

# 0.4.0
Added ability to maintain a `CHANGELOG.md` file automatically via Pull Requests. Whenever `pr-bumper` runs on a merge build, it now not only bumps `package.json`, but also prepends some content into `CHANGELOG.md` at the root of the repository. If that file doesn't exist, it's created.

## What is added to `CHANGELOG.md`?
`pr-bumper` will always add a new section at the top of the `CHANGELOG.md` file with new version (after the bump), for instance, if `pr-bumper` just applied a `minor` bump to a package at version `1.2.3`, the new section in `CHANGELOG.md` would be `# 1.3.0`. What goes under that section depends on what is in the PR Description. If there is a section that is exactly `# CHANGELOG`, everything below that is put into the new section. If there is no `# CHANGELOG` section in the description, some filler text is placed in the `CHANGELOG.md` giving instructions on how to have that section populated automatically by `pr-bumper` in the future.
