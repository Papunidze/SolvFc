# Contributing to SolvFC

Thanks for helping make SolvFC better. Bug reports, solver test cases, and pull requests are all welcome.

## Reporting problems

- **Something broken** → open a [Bug report](https://github.com/Papunidze/SolvFc/issues/new?template=bug_report.yml).
- **Solver picked a bad squad** → open a [Solver result](https://github.com/Papunidze/SolvFc/issues/new?template=solver_result.yml) and include the SBC requirements.
- **Idea** → open a [Feature request](https://github.com/Papunidze/SolvFc/issues/new?template=feature_request.yml).
- **Security issue** → report it privately, see [SECURITY.md](SECURITY.md).

## Development setup

Requires Node 24 and pnpm (version pinned in `package.json`; `corepack enable` installs it).

```sh
pnpm install
pnpm dev        # opens Chrome with the extension loaded
pnpm test       # unit tests (vitest)
pnpm typecheck  # vue-tsc
pnpm zip        # store-ready zip in .output/
```

### Project layout

| Path               | What lives there                                       |
| ------------------ | ------------------------------------------------------ |
| `src/entrypoints/` | Background script, content scripts, popup, options     |
| `src/solver/`      | Candidate selection, scoring and the LP model (HiGHS)  |
| `src/ea/`          | Reading and driving the EA FC Web App                  |
| `src/pricing/`     | Market prices and card cost estimates                  |
| `src/components/`  | Shared Vue components                                  |

## Pull requests

`main` is protected: every change goes through a pull request, needs CI to pass, and is reviewed by a maintainer.

1. Fork the repo and create a branch from `main` (`fix/chemistry-rounding`, `feat/position-lock`).
2. Keep the change focused. Add or update tests for solver, pricing and requirement logic.
3. Run `pnpm test` and `pnpm typecheck` locally.
4. Open a PR and fill in the template. Link the issue it closes.

### PR titles

PRs are squash-merged, so the PR title becomes the commit message. It must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: lock players by position
fix(solver): respect min. chemistry per player
chore(deps): bump vue to 3.6
```

Allowed types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`.

## Code of Conduct

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
