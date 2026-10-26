# Private activity telemetry

The profile publishes aggregate counts, never private repository names, URLs, code, languages, issue titles, or commit messages. The generator calls GitHub directly, with no third party dependencies.

## Setup

1. Create a token belonging to **RocketSloth**. Prefer a fine-grained personal access token with read-only Metadata access to repositories to count. Coverage is limited to its selected repositories and resource owner. A classic token with `repo` scope can cover private repositories but grants broader access; use only if necessary.
2. In this repository, open **Settings → Secrets and variables → Actions → New repository secret** and save it as `METRICS_TOKEN`. Never paste the token into a README, issue, or workflow file.
3. Enable **Private contributions** in your GitHub profile's contribution settings so anonymous private activity is available. GitHub contribution-calendar rules still apply: this is not a raw count of every commit.
4. Run **Engineering telemetry** from Actions, or let the daily workflow run after merging.

Without the secret, the workflow uses `GITHUB_TOKEN` and labels coverage public. Private counts show a dash, not a misleading zero. A configured token must belong to RocketSloth. Token permissions, organization authorization, and GitHub visibility settings can limit coverage.

Contributions are GitHub's calendar total over a rolling year, including whatever private activity GitHub exposes to the credential. The restricted-contribution card counts contributions GitHub reports without visible details. It is `restrictedContributionsCount`, not a separate calculation of all work inside private repositories. A zero does not certify that no private work occurred.

Repository totals count owned repositories visible to the token, including forks and archived repositories, excluding repositories owned by other users or organizations. Inventory is current; contributions cover the date window.

Failures stop the job before replacing the SVG. The timestamp remains visible so stale data can be recognized. Branch protection may require permitting bot writes or switching the workflow to pull requests.

Local checks: `node --test scripts/telemetry.test.mjs`. Generate the unmeasured initial card with `node scripts/telemetry.mjs --placeholder`.
