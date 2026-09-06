# SwiftUI Canvas: sketches from an AI agent (beta)

SwiftUI Canvas is a browser editor for SwiftUI screens: the person sketches iPhone screens on a canvas, links them, taps through a preview, and copies a prompt for a coding tool. A design is one JSON document. You, the agent, write that document and hand it back; the person opens it on their canvas, refines it, and turns it into a prompt.

This format is in beta. Fields may be added; existing ones keep their meaning.

## What to deliver

**Reply with a share link.** If you cannot run code, reply with the JSON document itself in a code block; the person saves it as a `.json` file and opens it with **Open JSON**. Either way, **do not verify, decode, or round-trip your output**: the app checks the document when it opens and tells the person what is wrong, so your checks add nothing.

To make the link:

1. Save the document to a file, for example `design.json`. Do not inline it in a shell command; quoting breaks in PowerShell and long shells.
2. Run one of these on the file and reply with the printed link. Build the link on the same address you fetched this guide from (the app lives next to it).

```js
// Node (link.mjs): node link.mjs design.json
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
const json = readFileSync(process.argv[2], "utf8");
console.log("<app-url>#sw=" + deflateRawSync(json).toString("base64url"));
```

```python
# Python (link.py): python link.py design.json
import sys, zlib, base64
data = open(sys.argv[1], "rb").read()
c = zlib.compressobj(9, zlib.DEFLATED, -15)          # raw deflate, no header
raw = c.compress(data) + c.flush()
print("<app-url>#sw=" + base64.urlsafe_b64encode(raw).decode().rstrip("="))
```

The link is long (a few thousand characters for a few screens). That is expected; it carries the whole design and nothing is stored anywhere.

> `<app-url>` above is a placeholder: replace it with the URL this app is
> hosted at, e.g. `http://localhost:3000` during development or
> `https://<user>.github.io/<repo>` for a GitHub Pages deployment.

Rough placement is fine. The person presses **Tidy** and bars snap to the edges while the rest stacks on 16pt margins. Spend your effort on the right parts, sensible labels, and the navigation between screens.

Keep the document under about 100 KB. Do not embed image data.

## The document

```jsonc
{
  "title": "Tea Timer",            // the app's name
  "lang": "en",                    // UI language: "en" | "zh"
  "platform": "ios",               // always "ios"
  "theme": {
    "accent": "systemBlue",        // a preset key or a "#rrggbb" hex
    "scheme": "light",             // "light" | "dark"
    "shape": "default",            // "default" | "capsule"
    "font": "system"               // "system" | "rounded" | "serif" | "monospaced"
  },
  "screens": [ /* screens */ ],
  "parts": [ /* parts, bottom layer first */ ]
}
```

Accent presets: `systemBlue`, `systemIndigo`, `systemPurple`, `systemPink`, `systemRed`, `systemOrange`, `systemGreen`, `systemMint`, `systemTeal`.

### Screens

A screen is **393 × 852** logical points (iPhone). Place screens side by side on the canvas, about 120 apart:

```json
{ "id": "home", "name": "Home", "x": 0, "y": 0, "note": "Lists the saved timers." }
{ "id": "detail", "name": "Timer", "x": 513, "y": 0 }
```

- `id`: any unique string. `name`: what the screen is called in the prompt (keep the person's language).
- `note` (optional): what the screen is for, in a sentence. It goes into the prompt.

### Parts

Every part has `id`, `screen` (a screen id), `kind`, `variant`, `label` (may be `""`), and **screen-relative** `x`/`y` (0…393, 0…852 from the screen's top-left — not canvas coordinates). Later parts draw on top of earlier ones.

```json
{ "id": "nav", "screen": "home", "kind": "navBar", "x": 0, "y": 0, "label": "Timers", "icon": null, "icon2": "plus", "variant": "large" }
{ "id": "row1", "screen": "home", "kind": "list", "x": 16, "y": 120, "label": "", "variant": "insetGrouped",
  "options": [ { "label": "Green tea", "icon": "leaf" }, { "label": "Oolong", "icon": "leaf" }, { "label": "Black tea", "icon": "leaf" } ] }
{ "id": "tabs", "screen": "home", "kind": "tabBar", "x": 0, "y": 769, "label": "", "variant": "plain", "selected": 0,
  "options": [ { "label": "Timers", "icon": "house", "target": "home" }, { "label": "Settings", "icon": "gearshape", "target": "detail" } ] }
{ "id": "go", "screen": "detail", "kind": "button", "x": 16, "y": 200, "label": "Start", "variant": "borderedProminent",
  "link": { "target": "back", "transition": "push" }, "note": "Starts the timer." }
```

Bars: put a `navBar` at `0,0` (96 tall when `large`, 54 when `inline`) and a `tabBar` at `0,769` (83 tall). A `sheet` hugs the bottom (`h` is its height). Everything else lives in the content area between them.

Fields any part may carry:

- `note`: what the part does, in your words. It goes into the prompt verbatim — say what happens on tap, what is saved, what is validated.
- `link`: `{ "target": "<screen id>" | "back", "transition": "push" | "zoom" | "sheet" | "cover" | "none" }`, the screen a tap opens. `zoom` is the iOS 26 zoom navigation transition.
- `w`/`h`: size overrides; heights below are what the canvas draws when omitted.

### Kinds

| kind | what it is | useful fields | default size |
|---|---|---|---|
| `navBar` | navigation bar | `label` title, `icon` leading, `icon2` trailing, `variant` `large` / `inline` | 393 × 96 |
| `tabBar` | tab bar (TabView) | `options` `{label, icon, target}`, `selected` | 393 × 83 |
| `button` | Button | `label`, `icon`, `variant`, `link`, `note` | 160 × 50 |
| `iconButton` | icon Button | `icon`, `variant`, `link` | 44 × 44 |
| `toggle` | Toggle (switch) | `label`, `checked` | 200 × 31 |
| `slider` | Slider | `value` 0–100 | 300 × 36 |
| `segmented` | segmented Picker | `options` `{label}`, `selected` | 361 × 32 |
| `picker` | menu Picker | `label`, `options`, `selected` | 361 × 60 |
| `textField` | TextField | `label`, `supporting` placeholder, `icon` | 361 × 64 |
| `searchField` | .searchable bar | `label` placeholder | 361 × 40 |
| `list` | List with rows | `options` `{label, icon}`, `variant` `insetGrouped` / `plainList` | 361 × 44 × rows |
| `card` | card | `label`, `supporting`, `icon`, `variant` `filled` / `stroke`, `w`, `h` | 361 × 140 |
| `alert` | .alert | `label` title, `supporting` message, `options` as buttons | 270 wide |
| `sheet` | .sheet | `label`, `supporting`, `h` | 393 × 260 |
| `progress` | ProgressView | `variant` `linear` / `circular`, `value` (omit for indeterminate) | 300 × 20 |
| `gauge` | Gauge | `label`, `value` 0–100 | 160 × 120 |
| `text` | Text | `label`, `variant` `largeTitle` / `title` / `headline` / `body` / `callout` / `footnote` / `caption` | 300 wide |
| `image` | image placeholder | `icon`, `w`, `h` | 200 × 200 |
| `divider` | Divider | | 361 × 1 |
| `box` | rounded container | `variant` `background` / `secondary` / `tertiary`, `w`, `h` | 361 × 220 |

Button and icon button variants: `bordered`, `borderedProminent`, `gray`, `plain`, `glass`, `glassProminent`. The `glass` variants stand for the iOS 26 Liquid Glass button styles.

Icons are **SF Symbols** names (`house`, `gearshape`, `plus`, `person`, `magnifyingglass`, `heart`, `star`, `bell`, `chevron.left`, …). Write the exact name; the generated app uses it verbatim in `Image(systemName:)`.

## Keep it simple

- Leave what the app does not need empty: `"icon": null`, no `icon2`, no `note`, no `supporting`. A nav bar with just a title is normal.
- Do not add parts to fill space. A screen with a bar, a list and one action is complete.
- One idea per screen; close your navigation: list rows and buttons open detail screens, detail screens get a way back (`"target": "back"`), the tab bar links its items with `target`.
- Real labels in the person's language, not lorem ipsum. Match the language of the request.
- Three to five screens is plenty. Leave polish to the person: they will tidy, retheme, and edit.

## Checklist before you reply

- Every `id` is unique; every `link.target` and tab `target` names a screen `id` or `back`.
- Every part has `id`, `screen`, `kind`, `label`, `variant`, and screen-relative `x`/`y`.
- Bars sit at their edges (`navBar` at 0,0; `tabBar` at 0,769); nothing overlaps them.
- You are replying with the link (or the JSON), not with a description of it.
