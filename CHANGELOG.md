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
