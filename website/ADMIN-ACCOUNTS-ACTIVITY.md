# Admin accounts and activity — update 185

## Install

1. Run `admin-content-activity-setup.sql` from the update package in Supabase SQL Editor. It includes the earlier site-content setup and is safe to rerun without clearing existing content or accounts.
2. Upload the contents of `website/` to the repository root, preserving folders, and deploy.
3. Sign in with your existing admin account. Leave logged-in/logged-out visitor-preview mode.
4. The header has **Edit website**, **Site content**, and **Accounts & activity** shortcuts. The Admin page also has direct section links.

If content storage is unavailable, controls remain discoverable and display setup/connection errors. Admin-page content links can appear independently of catalogue loading. A missing editor script produces a diagnostic message rather than a silently missing panel.

## Account directory

The admin-only directory shows all current accounts, including unconfirmed accounts, 50 at a time. Search by email, name or user ID. Sort by latest activity/sign-in, newest account or email. Use Previous/Next to view every matching account. Refresh explicitly to update the table; it does not poll automatically.

Fields: email, name, creation date, last sign-in, last page-activity timestamp, last recorded page, email confirmation, role and user ID. Historical sign-ins come from Supabase Auth. Page-activity records start only after the update is installed; no earlier browsing history is invented.

## Activity behavior

Only signed-in visitors record activity. The feature stores one latest timestamp and one coarse page name per account, not a timeline, search terms, private item data or IP addresses. Idle/hidden pages stop reporting. A client limit shared across tabs and an atomic server-side throttle limit successful writes to once per account per five minutes. Navigation within that period can leave the displayed page behind the visitor's current page; the column is labeled “Last recorded page.” Activity can also be delayed or absent when offline or when scripts are blocked.

The public Privacy page includes a notice. Existing account/wardrobe/outfit data is preserved. Account administration does not expose users' private collections or outfits.

## Security

- `hm_record_account_activity(text)` derives the user ID from `auth.uid()`, accepts only approved general page names, and sets time on the server.
- `hm_admin_accounts_activity_overview(text,integer,text)` checks `hm_is_admin()` for every call before reading `auth.users` or activity records.
- Ordinary accounts and guests have no direct activity-table read/write grants. Guests cannot execute either RPC.
- Account lists remain in page memory and are cleared when admin access changes. Search values are parameters, and all display fields use textContent.
- The existing content editor's write permissions and revision checks remain in place.

## Verification

JavaScript syntax, the Pages build, editor boot/save/conflict behavior in a simulated DOM, signed-out activity suppression, per-account client throttling, idle suppression and sign-out behavior passed. New SQL access checks, server throttling and pagination were reviewed, but the SQL was not executed on a live Supabase database. Real browser/device and live role-permission checks remain to be performed after setup.
