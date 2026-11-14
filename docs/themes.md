# Themes

A theme decides how a diagram **looks**. It never changes what the diagram **says**. The plain, technical style stays the default; the styled themes are for places where a softer look reads better (a README, a slide, a dark page). Same files, same shapes, same rules: only the paint differs.

See all of them side by side in the [explainer](../explainer/index.html), and the shapes themselves in [symbol-reference.md](symbol-reference.md).

## The themes

| Theme | Look | Use it for |
| --- | --- | --- |
| `plain` (default) | Black on white, the notation as in a technical document. | Reviews, printing, anywhere you want nothing but the diagram. |
| `cards` | Soft white cards with rounded corners and a light shadow, grey connectors, semibold names, a pale page. Modelled on a status-board look. | READMEs, slides, onboarding pages. |
| `dusk` | The Cards look on a dark page. | Dark documentation, slides on a dark background. |

## Choosing one

A project picks one theme in a small file, `diagrams.config.json`, next to its diagrams (or anywhere above them, such as the repository root):

```json
{ "theme": "cards" }
```

The nearest such file above a diagram wins. With none, the theme is `plain`. For one run you can override it with `--theme <id>` ([tools/README.md](../tools/README.md)), and `--theme all` writes `<name>.<theme>.svg` for every theme so you can compare them without touching the real render.

Agents do not choose a theme. They run the build; the project's config decides ([AGENTS.md](../AGENTS.md)).

## Rules

- **T-1. A theme changes presentation only.** Colour, font, corner radius, shadow and the weight of event rings. Never a shape, a marker, a line pattern (dashed message flows, dotted associations), a label or the layout. The stylesheet is checked against a list of the only properties a theme may set; hiding, moving, resizing or re-patterning anything is rejected.
- **T-2. Colour only repeats what the shape already says.** A theme may tint start events, end events, intermediate and boundary events, gateways, sub-processes, data, pools and black-box pools, because those are already different shapes. It may not use colour to say anything the notation does not: nothing is red for bad, green for good, bold for important, or coloured by owner. (That is why end events are indigo and not red: a normal outcome must not look like an error.)
- **T-3. The files carry no theme.** The `.bpmn` and `.dmn` hold no colour or style ([BP-17](bpmn-profile.md), [DM-14](dmn-profile.md)). A theme is applied when the SVG is drawn, so changing theme never changes a source file and never needs a review of one.
- **T-4. A legibility floor.** Text is at least 4.5:1 against what it sits on; outlines, connectors and arrowheads at least 3:1; an end-event ring at least twice the weight of a start-event ring. A soft look may not be bought by faint lines: this is why the Cards outline is a mid grey, not the very light grey of a typical card UI.
- **T-5. Nothing is added or taken away.** A themed render has exactly the shapes, text, line patterns and positions of the plain render.
- **T-6. One project, one theme.** Do not mix themes among one project's diagrams; consistency is what this repository is for.

## How it is enforced

`npm test` in `tools/` holds every theme to this, so a new or edited theme cannot quietly weaken the notation:

- every theme passes the contrast and ring-weight floor, and tints only the kinds in T-2;
- the generated stylesheet sets only allowed properties (T-1);
- for every example and template, in every theme, the render is **identical to the plain one except for the stylesheet and kind classes** (T-1, T-5), is well-formed XML, leaves nothing in the viewer's own default colour, keeps its dash patterns, and has the same text in decision tables.

## What a theme sets

| A theme sets | A theme never sets |
| --- | --- |
| Colour of text, outlines, fills, connectors, arrowheads, the page | Which shape is drawn, or its size or position |
| Font family and the weight of names | Markers (gear, envelope, clock, loop arrow, plus) |
| Corner radius of tasks, sub-processes, decisions | Dashes and dots on lines |
| A drop shadow on tasks, sub-processes, decisions | Whether anything is shown |
| Ring weight of events (start thinner than end) | Labels, wording, order |

## Adding a theme

Add an object to `THEMES` in `tools/themes.mjs`, with every key the others have (colours are `#rrggbb`). Run `npm test`: it fails with the contrast or rule that the new theme breaks. Render it with `node diagrams.mjs render <folder> --theme <id> --png` and look at a process, a decision and a table before adding it to the table above. A theme that needs a property outside the allowed list is asking to change what the diagram says; change the standard first, not the list.

## See also

[layout.md](layout.md) for the fixed geometry a theme sits on, [checklist.md](checklist.md) for review, and [adopting.md](adopting.md) for putting the config file in an app.
