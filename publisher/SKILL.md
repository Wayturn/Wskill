---
name: wskill-publisher
description: Publish an existing text Skill to the author's Cloudflare Workers Free account and verify its visitor chat URL. Use when asked to share or update a Skill using Wskill.
---

Work from the Wskill checkout (clone https://github.com/Wayturn/Wskill if necessary). Identify the author's existing Skill. Review its instructions, references and required integrations. v1 runs text instructions, bundled Markdown references and optionally a hook-writing subtask. Report unsupported scripts, external services or media requirements before claiming compatibility.

Use an existing examples/*/publish.json for its matching demo. Otherwise create a publish.json next to the author's Skill with the same fields and relative paths. Only bundle public-safe brand and voice files. Choose a unique stable Worker name for this project. Install with npm ci. Run npm run publish-skill -- /absolute/path/to/publish.json --build; resolve missing references. Check Wrangler whoami; if needed run npx wrangler login (use --device on a remote machine) and let the author authorize directly. Use the author's Workers Free account. Run the same publisher command with --deploy. Reuse the same name when updating.

Open the exact live URL Wrangler returned. Submit the manifest example via the visitor page, then a follow-up and a separate fresh session. For the included demos run README H1/R1 and check each criterion. Return the URL, actual example output and any unverified checks. If inference fails, report the deployment and the failed acceptance step separately.
