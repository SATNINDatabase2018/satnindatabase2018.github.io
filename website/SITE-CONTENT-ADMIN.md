# Admin website content editor

## Setup

1. Run `supabase-site-content-setup.sql` from the update package in Supabase SQL Editor.
2. Upload the contents of the package's `website/` folder to the repository root.
3. Let GitHub Pages deploy, refresh, and sign in with an existing admin account.

No new admin account is created. Existing item/horse editing and saved account data are preserved.

## Edit content

- Click **Edit website** in the bottom-right corner. Outlined public text/pictures can be clicked to open the editor. Click **Finish editing** to leave this mode.
- Open **Admin → Site content — header, footer and pages** for a searchable list of all entries. This also exposes link destinations, input hints, browser tab titles, extra paragraphs, and entries that were cleared or are currently hidden.
- **Save for everyone** publishes the change through Supabase. Other visitors see it when loading or refreshing the page. No GitHub upload is required for each content edit.
- **Restore original** restores the bundled default for an entry.
- Use the additional-information entry on public information pages to add paragraphs separated by blank lines.
- The footer copyright entry accepts `{year}` for the current year.
- Changing the shared logo URL replaces theme-specific logo pictures. Restore original to use theme logos again.
- In admin visitor-preview modes, these editing controls are hidden. Leave preview mode to edit.

## Coverage

The first version contains 730 content entries: shared header labels, dropdown labels/descriptions, logo, footer labels and copy, static page text, browser titles, input hints, public-page links/pictures, extra paragraphs, and Spirit/championship locations. Catalogue items and horses keep using the existing data editor.

This is a content editor. It does not edit feature logic, account permissions, game-time calculations, arbitrary HTML/JavaScript/CSS, or another user's private wardrobe/outfits. Changing a guide's explanatory wording does not change scheduling rules. Displayed current/next guide locations do use edited table locations.

## Storage and permissions

Public overrides live in `public.hm_site_content`. Only the key, value and revision columns are readable by visitors. The admin-only `hm_save_site_content` function checks existing `hm_is_admin()` membership on every write. Visitors and ordinary accounts have no direct table write grants. Revision checking rejects stale saves instead of silently replacing newer changes. A null value restores the original while retaining its revision.

All values are rendered as plain text or validated URLs. Raw HTML is never executed. Do not store private information here: these values are public website content.

## Maintaining this feature

Preserve existing `data-site-key` identifiers when changing templates. Renumbering keys would attach saved content to the wrong entry. `data/site-content-defaults.json` supplies labels/defaults for the admin list; `js/site-content.js` applies public overrides; `css/site-content.css` styles the controls. New editable entries should receive unique stable keys and a matching definition. This update does not overwrite the deployment or cleanup workflows.

## Validation

JavaScript syntax, unchanged original page copy, all static bindings/defaults, unsafe-URL blocking, text-only rendering, restoring defaults, simulated guest/admin editor behavior, conflict feedback, and the Pages build passed. SQL permissions/conflict logic were reviewed but not executed against a live Supabase project. Real-browser and live sign-in/save checks remain to be performed after setup.
