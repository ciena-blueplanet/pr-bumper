/**
 * @typedef PR
 *
 * The shape of the PR pulled from GitHub's `/repos/:owner/:repo/pulls` API
 * {@link https://developer.github.com/v3/pulls/}
 *
 * @property {Number} number - the PR #
 * @property {String} body - the description of the PR
 * @property {String} html_url - the URL for the web interface of the PR
 * @property {String} merge_commit_sha - you guessed it, the SHA for the merge commit of the PR
 */
