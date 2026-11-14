# Database — Horse Museum 2018

Static catalogue website hosted on GitHub Pages, with Supabase for account features.

## Repository layout

- `index.html` and page folders: current pages.
- Root `.html` route stubs: compatibility redirects; keep these.
- `js/` and `css/`: active JavaScript and styles.
- `assets/` and `data/`: public images and catalogue data.
- `scripts/build-news.py`: builds `_site/` and generates release news from Git history.
- `.github/workflows/`: deployment and optional audited cleanup.

## Deploy

Push to `main` or `master`, or run **Publish website and news** in GitHub Actions.
Keep the full Git checkout: the news generator reads commit history.
The build compacts public JSON in `_site/` while leaving source data readable.

## Remove old copies after uploading an update

Uploading replacement files does not remove old files. Run **Actions → Clean redundant
repository files → Run workflow** after uploading this update. It removes only the
20 unreferenced files recorded in `scripts/cleanup-manifest.json`, and only if their
SHA-256 hashes still match. Modified files are kept. Review the resulting commit.
Branch protections or organization workflow permissions may prevent the cleanup commit;
in that case, delete the listed unchanged files manually or run the Python script locally.
The workflow's bot commit may not trigger Pages automatically; run **Publish website
and news** manually afterwards if necessary.

## Performance changes

- Concurrent user verification requests share one in-flight request.
- Admin checks share a 30-second page-local result per session token; logged-out
  visitors return false without making the RPC. Authentication changes clear results.
- Only admin-display checks are cached; database authorization remains enforced by Supabase.
  No private account data is added to persistent browser storage.
- Catalogue searches reuse normalized item text and rankings, and wait 120 ms after typing.
- Catalogue JSON files load in parallel, with retry after a failed baseline load.
- News background refresh changes from one minute to five minutes. Manual refresh and
  saves remain immediate. Banner focus refreshes are limited to once a minute.
- The loader's minimum display duration is shorter. Item image decoding is asynchronous.

These changes reduce avoidable work; they do not guarantee a particular log quota.
Existing database permissions and account data are not modified by this package.
