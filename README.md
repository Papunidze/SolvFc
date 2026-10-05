# SolvFC

A free Chrome extension that solves EA FC Ultimate Team **Squad Building Challenges (SBCs)** for you. It uses the cheapest cards from your own club.

> SolvFC is not affiliated with or endorsed by Electronic Arts.

## What it does

- Adds a **Solve with SolvFC** button to the SBC screen in the EA FC Web App.
- Picks the cheapest squad that meets every requirement (rating, chemistry, leagues, nations, and so on).
- Uses duplicates and untradeable cards first, and keeps the cards you could sell.
- Runs entirely in your browser. Your club data never leaves your device.
- Free, with no limits and no account.

## Install

### From a release (easiest)

1. Download the latest `*-chrome.zip` file from the [Releases](../../releases) page.
2. Unzip it.
3. Open `chrome://extensions` in Chrome.
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked** and select the unzipped folder.

### From source

You need [Node 24](https://nodejs.org) and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm build
```

Then load the `.output/chrome-mv3` folder with **Load unpacked**, as in step 5 above.

## How to use

1. Open the [EA FC Web App](https://www.ea.com/ea-sports-fc/ultimate-team/web-app/) and log in.
2. Go to **SBC** and open a challenge.
3. Click **Solve with SolvFC**.
4. Check the squad and submit it.

## Settings

Click the extension icon, then **Configuration options**:

- **Card value**: how much each card type "costs" when the solver chooses players (duplicates, untradeables, tradeables, market players).
- **Time limit**: how long the solver can search. Rating SBCs take about a second. Chemistry SBCs may use the full limit.

Changes save automatically.

## Development

```sh
pnpm install     # install dependencies
pnpm dev         # open Chrome with the extension loaded and live reload
pnpm test        # run unit tests
pnpm typecheck   # check types
pnpm zip         # build the zip into .output/
```

### Project structure

| Folder             | What's inside                                  |
| ------------------ | ---------------------------------------------- |
| `src/entrypoints/` | Popup, options page, and Web App scripts       |
| `src/ea/`          | Reads your club and SBC requirements from EA   |
| `src/solver/`      | Finds the cheapest valid squad                 |
| `src/pricing/`     | Loads market prices and calculates card cost   |
| `src/components/`  | Shared Vue components                          |

Built with [WXT](https://wxt.dev), Vue 3, Tailwind CSS, and the [HiGHS](https://highs.dev) solver.

## Contributing

1. Fork the repo and create a branch.
2. Make your change.
3. Run `pnpm test` and `pnpm typecheck`.
4. Open a pull request. CI runs the same checks.

## Releasing

Commit your changes, then run:

```sh
pnpm release
```

This bumps the patch version, then commits, tags, and pushes. For bigger releases, use `pnpm version minor` or `pnpm version major`.

The new tag starts the Release workflow. It builds the zip and attaches it to a GitHub Release.

## Security

Please report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## Support

If SolvFC saves you coins and time, you can support it with the **Donate** button in the extension popup.

## License

[MIT](LICENSE)
