# Layout

A correct diagram that is hard to read still fails. These rules fix how it is laid out so that diagrams look alike. In practice the renderer ([PLAN.md](../PLAN.md), phase 3) applies most of them; an agent controls the order in which it writes elements, which steers the layout, and checks the result against these rules. Notation rules: [bpmn-profile.md](bpmn-profile.md), [dmn-profile.md](dmn-profile.md).

## BPMN

- **LY-1. Left to right.** Time runs rightward. Start on the left, ends on the right.
- **LY-2. The happy path is a straight line.** The most common route from start to end runs horizontally through the middle of the pool. Everything else branches off above or below it.
- **LY-3. Exceptions below, loop-backs along the bottom.** Failure and rework paths go under the main line; a loop-back flow returns underneath, never through the shapes.
- **LY-4. Our pool on top, black boxes below.** The process we draw is the top pool; black-box pools sit under it. Message flows run vertically where they can.
- **LY-5. No crossing sequence flows.** Reorder or move shapes first. Message flows may cross when unavoidable; sequence flows should not.
- **LY-6. Standard sizes, on a grid.** Same-type shapes are the same size: task 100 × 80, event 36 × 36, gateway 50 × 50 (the defaults of the bpmn.io editor and renderer; checked in the `bpmn-js` 18.31.1 source). At least 50 between shapes horizontally and 40 vertically. Snap to a 10 px grid.
- **LY-7. Labels.** Task labels inside the task. Event, gateway and flow labels outside, beside the shape. A label never sits on a line.
- **LY-8. Lanes in order of first use.** Top to bottom, in the order the roles first act.
- **LY-9. One page.** The whole view fits a landscape page and text is at least 12 px at its drawn size. If it will not, the view is too big: BP-11 says to collapse part of it.
- **LY-10. Nothing decorative.** No colour, custom fonts, shadows or icons beyond the notation's own markers (the gear on a service task and so on).

## DMN

- **LY-11. Decisions on top, requirements below.** In the decision requirements diagram the main decision is at the top and its inputs form the bottom row; arrows point up ([DM-11](dmn-profile.md)).
- **LY-12. Tables: inputs left, outputs right.** Columns run inputs, then outputs, then an optional annotation column. Rows are numbered from 1.

## What the renderer adds

The renderer (phase 3) puts the diagram's name above it and the source file name below it, and nothing else. Do not add titles, legends or logos inside the model.

## See also

[naming.md](naming.md) for what labels say, [symbol-reference.md](symbol-reference.md) for the shapes, and [checklist.md](checklist.md) for the review list.
