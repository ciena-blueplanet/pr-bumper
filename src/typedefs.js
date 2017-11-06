/**
 * @flow
 */

// ==========================================================================================================
// Configuration
// ==========================================================================================================

/**
 * The VCS Auth config (pulled from the environment using VcsEnv)
 */
export type VcsAuth = {|
  password: string, // the actual vcs password
  readToken?: string, // the actual vcs read token
  username: string, // the actual vcs username
  writeToken?: string // the actual vcs read/write token
|}

/**
 * The configuration object that can be customized with .pr-bumper.json
 */
export type Config = {|
  ci: {|
    buildNumber?: string, // the number of the build (in a string) pulled from the env
    env: {|
      branch: string,
      buildNumber: string, // the environment variable that will hold the build number
      pr: string, // the environment variable that will hold the PR number (if it's a PR build)
      repoSlug: string // the environment variable that will hold the repo slug (owner/repo)
    |},
    gitUser: {|
      email: string, // the github user email to use for commits
      name: string // the github user name to use for commits
    |},
    provider?: string // the CI provider (one of "travis" or "teamcity" for now)
  |},
  computed: {|
    baselineCoverage: number, // the basline coverage read from package.json
    ci: {|
      buildNumber: string, // the identifier for the current build
      branch: string, // the branch being built, or targeted by the pr build
      isPr: boolean, // true if this is a PR build
      prNumber: string // the number of the PR
    |},
    vcs: {|
      auth: VcsAuth, // the auth settings pulled from environment
    |}
  |},
  features: {|
    changelog: {|
      enabled: boolean, // true if changelog feature is enabled
      file: string, // the file to use for changelog tracking
    |},
    comments: {|
      enabled: boolean, // true if comments feature is enabled
    |},
    compliance: {|
      additionalRepos: string[],
      enabled: boolean, // true if compliance feature is enabled
      output: {|
        directory?: string,
        ignoreFile: string,
        reposFile: string,
        requirementsFile: string
      |},
      production: boolean,
    |},
    coverage: {|
      enabled: boolean, // true if coverage feature is enabled
      file?: string, // the file that holds the json summary coverage
    |},
    dependencies: {|
      enabled: boolean, // true if dependencies feature is enabled
      snapshotFile?: string, // the file to dump dependencies to
    |},
    maxScope: {|
      enabled: boolean, // true if maxScope feature is enabled
      value?: string, // the maximum scope allowed when the feature is enabled
    |},
  |},
  isEnabled: (featureName: string) => boolean, // check if a given feature is enabled
  vcs: {|
    auth?: VcsAuth, // the auth info pulled from the env given
    domain: string, // the domain for version control system (defaults to github.com for GitHub)
    env: {|
      password: string, // the name of the environment variable that holds the vcs password
      readToken: string, // the name of the environment variable that holds the vcs read-only token
      username: string, // the name of the environemnt variable that holds the vcs username
      writeToken: string // the name of the environment variable that holds the vcs read-write token
    |},
    provider: string, // the VCS provider ("github", "bitbucket-server" or "github-enterprise" right now)
    repository: {|
      name: string, // the name of the repository
      owner: string // the organization/user/project that owns the repository
    |}
  |}
|}

// ==========================================================================================================
// Version Control
// ==========================================================================================================

/**
 * The representation of a commit within the GitHub API
 */
export type GitHubCommit = {|
  sha: string // the SHA hash for the commit
|}

/**
 * The shape of the PR pulled from GitHub's `/repos/:owner/:repo/pulls` API
 * {@link https://developer.github.com/v3/pulls/}
 */
export type GitHubPullRequest = {|
  number: number, // the PR #
  body: string, // the description of the PR
  html_url: string, // the URL for the web interface of the PR
  head: GitHubCommit, // representation of the tip commit from the branch being merged
  base: GitHubCommit // representation of the tip commit from the branch being merged into
|}

/**
 * The representation of a reference within the Bitbucket Server API
 */
export type BitbucketRef = {|
  id: string, // the id of the git ref
  latestCommit: string // the SHA hash for the latest commit in the git ref
|}

/**
 * An object to wrap a Bitbucket link
 */
export type BitbucketLink = {|
  href: string // the actual link
|}

export type BitbucketLinks = {|
  self: BitbucketLink[] // the array of links to this pr
|}

/**
 * The shape of the PR pulled from Bitbucket's `/projects/:owner/repos/:repo/pull-requests` API
 * {@link https://developer.atlassian.com/static/rest/bitbucket-server/4.6.0/bitbucket-rest.html#idp1756896}
 */
export type BitbucketPullRequest = {|
  description: string, // the description of the PR
  fromRef: BitbucketRef, // the ref of the source of the pr
  id: number, // the PR #
  links: BitbucketLinks, // http links
  toRef: BitbucketRef // the ref of the destination of the pr
|}

/**
 * Generic Pull Request representation
 */
export type PullRequest = {|
  description: string, // the description of the PR
  headSha: string, // SHA for the head commit of the incoming branch for the PR
  number: number, // the PR #
  url: string // the URL for the web interface of the PR
|}

/**
 * Generic Pull Request info (used for updating package.json and CHANGELOG.md files)
 */
export type PrInfo = {|
  changelog: string, // the changelog text
  modifiedFiles: string[],
  scope: string, // the scope of the PR
  version: string // the new version after bumping based on scope
|}

/**
 * Generic interface for a version control system (i.e. github.com)
 */
export interface Vcs {
  /**
   * Sometimes, based on the CI system, one might need to create a git remote to
   * be able to push, this method provides a hook to do just that.
   * @return Promise - a promise resolved with the result of the git command
   */
  addRemoteForPush(): Promise<*>,

  /**
   * Push local changes to the remote server
   * @param {String} prNumber - the number of the pull request being fetched
   * @return Promise - a promise resolved with a pull request object
   */
  getPr(prNumber: string): Promise<PullRequest>,

  /**
   * Post a comment to the given PR
   * @param {String} prNumber - the PR number (i.e. 31)
   * @param {String} comment - the comment body
   * @returns {Promise} a promise resolved with result of posting the comment
   */
  postComment(prNumber: string, comment: string): Promise<*>
}

// ==========================================================================================================
// Continuous Integration
// ==========================================================================================================

/**
 * Generic interface for a CI system (i.e. travis)
 */
export interface Ci {
  /**
   * Add changed files
   * @param {String[]} files - the files to add
   * @returns {Promise} - a promise resolved with result of git commands
   */
  add(files: string[]): Promise<*>,

  /**
   * Commit local changes
   * @param {String} summary - the git commit summary
   * @param {String} message - the detailed commit message
   * @returns {Promise} - a promise resolved with result of git commands
   */
  commit(summary: string, message: string): Promise<*>,

  /**
   * Get the most recent commit message summary
   * @returns {Promise} - a promise resolved with result of git command
   */
  getLastCommitMsg(): Promise<*>,

  /**
   * Push local changes to the remote server
   * @returns {Promise} - a promise resolved with result of git commands
   */
  push(): Promise<*>,

  /**
   * Setup the local git environment (make sure you're in a proper branch, with proper user attribution, etc
   * @returns {Promise} - a promise resolved with result of git commands
   */
  setupGitEnv(): Promise<*>,

  /**
   * Create a local tag
   * @param {String} name - the name of the tag to create
   * @param {String} message - commit message of the tag being created
   * @returns {Promise} - a promise resolved with result of git commands
   */
  tag(name: string, message: string): Promise<*>
}
