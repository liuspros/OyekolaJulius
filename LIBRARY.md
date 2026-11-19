# The Library: how to run it

Two open-licensed libraries (Developers, Designers) built from one file, `resources.json`.
The pages are plain static HTML, so they are fast and fully crawlable by Google. No database, no sign-in.

## Add a resource

1. Open `resources.json` and copy an existing entry in `"resources"`.
2. Fill it in:
   - `library`: `"developers"` or `"designers"`
   - `kind`, `title`, `author`, `year` (or `null`), `publisher`, `edition` (optional)
   - `apaAuthor`: how APA writes the author, e.g. `"Chacon, S., & Straub, B."`
   - `bibAuthor`: BibTeX style, e.g. `"Chacon, Scott and Straub, Ben"`, or `"{Organisation Name}"` for a company
   - `url`: the **original source page** (always required, this is the citation)
   - `license`: `name`, `url` and an optional `note`
   - `tags` and a short `summary` in your own words
3. **Hosting a file yourself?** Put it in the `files/` folder and add `"file": "my-guide.pdf"`.
   Only `.pdf` and `.zip` are supported. The size is detected automatically.
   Leave `"file"` out to show an "Open resource" link instead.
4. Run `node build-library.js`, then commit and push. Vercel redeploys on its own.

## What you may host

Host a file only if you made it, or its license clearly allows redistribution.

- Best for files you host: CC0, CC BY, MIT, Apache 2.0, ISC.
- Licenses with `NC` (non-commercial) are shown in amber. They are risky to re-host on a business site: link to the original instead.
- Never host paid templates, books or other people's zips without written permission.
- Re-check each license on its original page before you publish. Licenses change, and the starter entries were written from memory.

## Downloads: one at a time

- Files in `files/` are always sent as a download (never opened in the browser) via `vercel.json`.
- There is no "download all" button and no bundle zip, on purpose.
- `library.js` adds a courtesy limit: 3 seconds between downloads and 8 per 10 minutes per browser. A determined person can bypass this, so it is not security.
- **The real limit:** add one rate-limit rule in Vercel. Dashboard → your project → Firewall → Configure → New Rule:
  - If: Request Path starts with `/files/`
  - Then: Rate Limit, 20 requests per 60 seconds, per IP
  - Save, then Review Changes and Publish.
  (Hobby plans can have one rate-limit rule.)

## Brand logos in the marquee

Add transparent logos to the site root with these exact names (`.svg` preferred, `.png` also works):
`logo-bevic-devices`, `logo-onemore-gadgets`, `logo-hansel-homes`.
They replace the text wordmarks automatically and are shown in white on the dark band.

## Moving to your own domain

Change `"siteUrl"` in `resources.json`, update the URLs in `index.html` (canonical, og:url, og:image, JSON-LD) and run `node build-library.js` again. It rewrites the sitemap and robots.txt too.
