# SolvFC

Free browser extension that solves EA FC Ultimate Team Squad Building Challenges with the cheapest cards from your club.

SolvFC is not affiliated with or endorsed by Electronic Arts.

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

1. Fork the repo and create a branch.
2. Make your change and run `pnpm test` and `pnpm typecheck`.
3. Open a pull request. CI runs the same checks automatically.

## Releasing

1. Bump `version` in `package.json` and commit.
2. Tag and push:

   ```sh
   git tag v0.2.0
   git push origin main --tags
   ```

The Release workflow builds the zip, attaches it to a GitHub Release, and submits it to the Chrome Web Store when store credentials are configured.

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
