# London Now — Build 2.4: unified tools and white theme (v0.3.4)

This release groups every London Advanced tool in one block and fixes the dashboard to the same white background used by the linked Google Sites pages. It updates the existing `london-now` Worker and requires no Cloudflare configuration change.

## What changes

- Removes the separate map-based Smart Navigation promotion.
- Places all four London Advanced tools in one card.
- Uses the native `londonadvanced.com` URL for every tool.
- Adds London by Mood.
- Removes the automatic dark colour scheme so the dashboard remains white on every device.
- Leaves TfL, Met Office weather, airport access, departure boards and Google Sites framing unchanged.

## Deploy directly to main

1. Confirm v0.3.3 is working and committed to `main`.
2. Open the existing GitHub `london-now` repository and select `main`.
3. Choose **Add file → Upload files**.
4. Upload the contents inside this package folder to the repository root. Do not upload the ZIP or its enclosing folder.
5. Commit directly to `main` with `Unify London Advanced tools and white theme`.
6. Wait for the connected Cloudflare build to complete.

No variable, secret, KV namespace, trigger, deploy command or Google Sites embed change is required.

## Validate production

Open:

```text
https://london-now.ppastorin.workers.dev/api/health
https://london-now.ppastorin.workers.dev/
```

Health must return HTTP 200 and version `0.3.4`. Complete `TEST-CHECKLIST.md`, then refresh and republish the Google Sites page if its existing embed still shows a cached version.

## Native London Advanced links

- [Escape the crowds](https://www.londonadvanced.com/home/escape-the-crowds)
- [Travel fare calculator](https://www.londonadvanced.com/home/travel-fare-calculator)
- [Smart navigation](https://www.londonadvanced.com/home/smart-navigation)
- [London by mood](https://www.londonadvanced.com/home/london-by-mood)

## Rollback

If production validation fails, roll Cloudflare back to the approved v0.3.3 deployment and revert the GitHub commit. This release creates no resource and adds no secret.
