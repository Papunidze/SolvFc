# SolvFC

[![CI](https://github.com/Papunidze/SolvFc/actions/workflows/ci.yml/badge.svg)](https://github.com/Papunidze/SolvFc/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Papunidze/SolvFc/actions/workflows/codeql.yml/badge.svg)](https://github.com/Papunidze/SolvFc/actions/workflows/codeql.yml)
[![Latest release](https://img.shields.io/github/v/release/Papunidze/SolvFc)](https://github.com/Papunidze/SolvFc/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Free browser extension that solves EA FC Ultimate Team Squad Building Challenges with the cheapest cards from your club.

SolvFC is not affiliated with or endorsed by Electronic Arts.

## Install

1. Download the latest `solvfc-*-chrome.zip` from [Releases](https://github.com/Papunidze/SolvFc/releases/latest) and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode**, and click **Load unpacked**.
3. Select the unzipped folder, then open the EA FC Web App.

## Development

Requires Node 24 and pnpm.

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm zip
```

`pnpm dev` opens Chrome with the extension loaded. `pnpm zip` builds the store-ready zip in `.output/`.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, project layout and PR rules. `main` is protected, so all changes go through a pull request with passing CI.

Found a problem? [Open an issue](https://github.com/Papunidze/SolvFc/issues/new/choose). Security issues go through [SECURITY.md](SECURITY.md).

## Releasing

Commit your changes, then run:

```sh
pnpm release
```

It bumps the patch version, commits, tags, and pushes. `main` is protected, so only the repo admin (who can bypass the rule) can run it. For bigger releases run `pnpm version minor` or `pnpm version major` instead.

The pushed tag starts the Release workflow. It builds the zip, attaches it to a GitHub Release, and submits it to the Chrome Web Store when store credentials are configured.

### Chrome Web Store credentials

In the repo settings under Secrets and variables, Actions, add:

| Kind     | Name                                  |
| -------- | ------------------------------------- |
| Variable | `CHROME_EXTENSION_ID`                 |
| Variable | `CHROME_PUBLISHER_ID`                 |
| Secret   | `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` |
| Secret   | `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`  |

Without them, releases still publish the zip to GitHub and skip the store upload.

## Support

If SolvFC saves you coins and time, you can support it from the button in the extension popup.

## License

MIT
