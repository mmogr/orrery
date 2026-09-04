# Changesets

A release note travels with the change that earns it. When a pull request
changes what the package does, add a file here (`npx changeset` writes it)
naming the bump — `patch`, `minor` or `major` — with a sentence in your own
words. Those sentences become the changelog; the bot keeps a standing
"Version Packages" pull request that gathers them, and merging it is the
release. Pull requests that touch only docs, tests or CI need none.
