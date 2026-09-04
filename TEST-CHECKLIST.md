# Phase 0 test checklist

Record the browser, device/viewport, result and any evidence for each item.

## A. Integrity

- [ ] `npm run check` passes.
- [ ] The page loads with JavaScript disabled; content and source links remain readable.
- [ ] Browser console shows no errors with JavaScript enabled.
- [ ] Network panel shows no API or analytics requests.
- [ ] No API keys or secrets exist in the repository.

## B. Sample-data safety

- [ ] The top Phase 0 warning appears before the dashboard.
- [ ] Weather, travel, airports and events are each labelled sample or illustrative.
- [ ] The footer tells visitors to confirm with the official operator.
- [ ] No sample wording could reasonably be mistaken for current operational advice.

## C. Controls and persistence

- [ ] Today and the next two days appear using the device date.
- [ ] Changing the date updates the events badge.
- [ ] Now, Travel, Flights and Events show only relevant cards.
- [ ] Airport choices immediately affect airport rows and board links after saving.
- [ ] Preferred station updates the travel card.
- [ ] Turning off step-free notices hides that row.
- [ ] Preferences remain after reload in the same browser.
- [ ] Reset restores Heathrow, Gatwick, Stansted, Waterloo and step-free notices.

## D. Responsive and accessible behaviour

- [ ] 320 px wide: no horizontal overflow; controls remain tappable.
- [ ] 390 px wide: cards form one column and text does not clip.
- [ ] 768 px wide: two-column cards are balanced.
- [ ] 1280 px wide: content stays within its maximum width.
- [ ] Text can be zoomed to 200% without losing controls or content.
- [ ] Keyboard reaches Skip to dashboard, all tabs, settings and links.
- [ ] Focus indicators are clearly visible.
- [ ] Settings dialog closes with its close button, Escape and backdrop click.
- [ ] Light and dark operating-system themes remain readable.
- [ ] Reduced-motion preference causes no essential information loss.

## E. Links and source attribution

- [ ] Met Office and BBC Weather links open correctly.
- [ ] TfL and National Rail links open correctly.
- [ ] Every visible selected airport has an official board link.
- [ ] Time Out is an outbound browse link only.
- [ ] All three London Advanced shortcuts open correctly.
- [ ] External links open in a new tab without controlling the source tab.

## F. Cloudflare and Google Sites

- [ ] Cloudflare deployment succeeds from the `main` branch.
- [ ] Pushing a commit triggers a fresh deployment.
- [ ] HTTPS works without mixed-content warnings.
- [ ] `_headers` values appear on the deployed response.
- [ ] The published Google Site renders the iframe rather than refusing it.
- [ ] No nested horizontal scrollbar appears in the embed.
- [ ] The chosen embed height is acceptable on desktop and mobile preview.
- [ ] Open full screen works from inside the Google Sites embed.

## Exit decision

- [ ] All blocking failures are fixed and retested.
- [ ] Phase 0 is tagged `phase-0-approved`.
- [ ] Phase 1 scope is limited to weather, caching, freshness and failure states.
