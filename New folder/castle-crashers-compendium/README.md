# Castle Crashers Fan Compendium

An unofficial capstone web application. The site displays a curated, sourced game fact sheet and answers visitor questions from those records. It includes a responsive gallery and looping audio control. The optional Cloudflare Worker generates concise answers using an AI API while keeping the key off GitHub Pages. If the Worker is absent or fails, visitors still see the reviewed fact entries.

## What is ready

- Searchable and filterable fact cards with 31 entries from The Behemoth's game, support, and blog pages.
- Browser based question retrieval with links to source pages and an explicit unsupported answer.
- Gallery slots for your authorized screenshots and a play/pause audio control for your track.
- A separate, deployable AI Worker with server-side fact retrieval, origin checking, and secret handling. It needs your Cloudflare account and API key before it can run.

## Publish the website

1. Create a public GitHub repository, for example `castle-crashers-compendium`.
2. Upload the **contents of this folder** to the repository root. `index.html` and `facts.json` should appear at the top level. GitHub's browser upload may not preserve empty directories, which is fine; add media folders when you upload actual files.
3. Open repository **Settings → Pages**. Choose **Deploy from a branch**, `main`, `/ (root)`, and save.
4. Open the Pages URL and try “How many players can play?” and an unsupported question such as “What is the developer's favorite dessert?” The answer area should include a source for the first question and decline the second.

To preview locally, run `python3 -m http.server 8000` from this directory and visit `http://localhost:8000`. Loading `index.html` directly from disk can prevent JSON loading.

## Add your pictures and music

Upload screenshots you have permission to publish under `assets/images/`. The names expected by `gallery.json` are `screenshot-1.jpg`, `screenshot-2.jpg`, and `screenshot-3.jpg`; edit that JSON file if your names or captions differ. Upload your licensed MP3 as `assets/audio/theme.mp3`. Browsers require each visitor to press **Play music** before audio can start. It loops until paused or the tab closes. A single page means it keeps playing as visitors browse its sections.

## Enable the AI answers

The site works without this step, but the proposal's AI endpoint requires it. Cloudflare Workers hosts the API separately from GitHub Pages.

1. Create a Cloudflare account and install Node.js locally. In the `worker` directory run `npx wrangler login`.
2. In `worker/wrangler.jsonc`, set `SITE_ORIGIN` to the **origin** of your Pages URL: `https://YOUR-USERNAME.github.io` (no repository path or final slash). If you use a custom domain, use its origin instead.
3. Run `npx wrangler secret put OPENAI_API_KEY` from the `worker` directory. Paste your API key only into the secret prompt. Never commit it or paste it into `config.js`. API usage can incur charges; set a budget with your provider. The Worker also accepts `OPENAI_MODEL` in `wrangler.jsonc`.
4. Run `npx wrangler deploy` in the `worker` directory and copy the resulting `https://...workers.dev` URL.
5. Edit root `config.js` so `window.COMPENDIUM_API_URL` equals that URL plus `/ask`. Commit the change. The site will now display AI answers with source links and fall back to the direct facts if the service errors.

The Worker accepts POST requests from the configured site origin, searches the same fact file, refuses unmatched questions before contacting AI, and sends only the top relevant records to the model. The model is instructed to avoid outside claims and to say when evidence is insufficient. Source URLs come from the records, not the model. **Generated wording still needs human evaluation**; citations indicate the records supplied, not a guarantee that every sentence is correct. A public Worker is not a strong anti-abuse boundary: before significant public traffic, add provider rate limiting, logging that protects visitor privacy, and spending limits.

## Maintain facts

Each object in `facts.json` has a unique `id`, `category`, `title`, `fact`, `keywords`, and `source` URL. Verify each claim against its linked primary source before committing. When editing facts, redeploy the Worker as well; its copy is bundled at deployment, while GitHub Pages publishes the updated file separately. This project currently uses a read-only version controlled JSON fact store. A relational database and user submissions are outside the MVP.

## Documentation and tests

See `docs/architecture.md` for the architecture, user flows, data design, limitations, and test checklist. Run `node --test tests/` for the data and UI contract checks. Review both supported and unsupported questions manually after publication, including a question that tries to override the AI instructions. Keep weekly Git commits and log your own prompts, review decisions, and bug fixes for the capstone presentation.

## Source and media note

This site is not affiliated with The Behemoth. Castle Crashers belongs to The Behemoth. The original four helmet shapes are CSS artwork; no game screenshots or soundtrack are bundled. Add only media you may publish and retain credit or permission details in your project records.
