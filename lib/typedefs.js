/**
 * The options that can be defined in .pr-bumper.json
 * @typedef Options
 * @param {String} [owner] - the organization/user/project that owns the repository (overriding repoSlugEnv)
 * @param {String} [repo] - the name of the repository (overriding repoSlugEnv)
 * @param {String} [repoSlugEnv=TRAVIS_REPO_SLUG] - env var for repo slug "owner/repo"
 * @param {String} [commitEnv=TRAVIS_COMMIT] - env var for current commit hash
 * @param {String} [prEnv=TRAVIS_PULL_REQUEST] - env var for current pr # (or 'false')
 * @param {String} [buildNumberEnv=TRAVIS_BUILD_NUMBER] - env var for current build #
 * @param {String}
 */

/**
 * The configuration object built from the options
 * @typedef Config
 * @param {String} owner - the organization/user/project that owns the repository
 * @param {String} repo - the name of the repository
 * @param {String} commitSha - the sha of the current commit
 * @param {Boolean} isPr - true if pull request build
 * @param {String} buildNumber - the CI build #
 */

/**
 * The representation of a commit within the GitHub API
 * @typedef GitHubCommit
 * @param {String} sha - the SHA hash for the commit
 */

/**
 * The shape of the PR pulled from GitHub's `/repos/:owner/:repo/pulls` API
 * {@link https://developer.github.com/v3/pulls/}
 *
 * @typedef GitHubPullRequest
 * @property {Number} number - the PR #
 * @property {String} body - the description of the PR
 * @property {String} html_url - the URL for the web interface of the PR
 * @property {String} merge_commit_sha - you guessed it, the SHA for the merge commit of the PR
 * @property {GitHubCommit} head - representation of the tip commit from the branch being merged
 * @property {GitHubCommit} base - representation of the tip commit from the branch being merged into
 */

/**
 * Generic Pull Request representation
 *
 * @typedef PullRequest
 * @property {Number} number - the PR #
 * @property {String} description - the description of the PR
 * @property {String} url - the URL for the web interface of the PR
 * @property {String} mergeCommitSha - you guessed it, the SHA for the merge commit of the PR
 * @property {String} headCommitSha - SHA for the head commit of the incoming branch for the PR
 */

/**
 * A Promise that will be resolved with a PullRequest
 *
 * @typedef PrPromise
 */

/**
 * Generic interface for a version control system (i.e. github.com)
 *
 * @interface Vcs
 */

/**
 * Get the open Pull Request for a given SHA hash
 *
 * @function
 * @name Vcs#getOpenPrForSha
 * @param {String} sha - the merge commit SHA for the PR
 * @returns {PrPromise} a promise resolved with the the PullRequest (or rejected if none found)
 */

/**
 * Get the closed Pull Request for a given SHA hash
 *
 * @function
 * @name Vcs#getClosedPrForSha
 * @param {String} sha - the commit SHA for the head of the branch that was merged
 * @returns {PrPromise} a promise resolved with the the PullRequest (or rejected if none found)
 */

/**
 * Push local changes to the remote server
 *
 * @function
 * @name Vcs#push
 * @return Promise - a promise resolved with result of git commands
 */
