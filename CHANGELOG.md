# 0.4.2
Format the `CHANGELOG.md` file properly by adding some newlines after the prepended entry.

# 0.4.1
 * Fixes issue where `\r` characters in the pr description weren't properly handled. Who knew GitHub was built on Windows? ;) 
 * Fixes issue where users had to be extremely specific with their `# CHANGELOG` section heading. The following are now all valid as well: `#CHANGELOG`, `# CHANGELOG  `, `#changelog `, `# changelog`

# 0.4.0
Added ability to maintain a `CHANGELOG.md` file automatically via Pull Requests. Whenever `pr-bumper` runs on a merge build, it now not only bumps `package.json`, but also prepends some content into `CHANGELOG.md` at the root of the repository. If that file doesn't exist, it's created.

## What is added to `CHANGELOG.md`?
`pr-bumper` will always add a new section at the top of the `CHANGELOG.md` file with new version (after the bump), for instance, if `pr-bumper` just applied a `minor` bump to a package at version `1.2.3`, the new section in `CHANGELOG.md` would be `# 1.3.0`. What goes under that section depends on what is in the PR Description. If there is a section that is exactly `# CHANGELOG`, everything below that is put into the new section. If there is no `# CHANGELOG` section in the description, some filler text is placed in the `CHANGELOG.md` giving instructions on how to have that section populated automatically by `pr-bumper` in the future.
