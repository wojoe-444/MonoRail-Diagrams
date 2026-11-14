# Pinned versions

The single place that says which versions of the notations and tools this standard uses. Other pages link here instead of repeating versions. Last checked **2026-11-14**.

## Notations

| Notation | Version we use | What was checked |
| --- | --- | --- |
| BPMN | 2.0.2 (OMG formal, January 2014); published as ISO/IEC 19510:2013 | OMG's BPMN page lists 2.0.2 as the latest. ISO's own catalogue says its text is identical to 2.0.1, so sources disagree on which maintenance release ISO adopted. The shapes and meanings we use are the same in both. |
| BPMN files | XML namespace `http://www.omg.org/spec/BPMN/20100524/MODEL` | The namespace every 2.0.x release shares. |
| DMN (spec) | Current formal release is 1.6 (September 2026); 1.7 is in beta | OMG's DMN page. Earlier formal releases: 1.5 (August 2024), 1.4 (April 2023), 1.3 (February 2021). |
| DMN files | **1.3**, namespace `https://www.omg.org/spec/DMN/20191111/MODEL/` | The editor and parser libraries current today ship a 1.3 definition only (the `dmn-moddle` package contains `dmn13.json` and `dmndi13.json`, nothing newer). Decision tables, decision requirement diagrams and the FEEL subset we allow in [dmn-profile.md](dmn-profile.md) all exist in 1.3, so nothing we use is lost. |

When the tools read a newer DMN version, move the pin here, check [dmn-profile.md](dmn-profile.md) against the new spec, and re-run the examples.

## Tools (used from phase 3)

| Package | Version | Role |
| --- | --- | --- |
| `bpmn-moddle` | 10.3.1 | Read and write BPMN XML |
| `dmn-moddle` | 12.2.1 | Read and write DMN XML |
| `bpmn-js` | 18.31.1 | Render BPMN |
| `dmn-js` | 18.0.3 | Render DMN |
| `bpmnlint` | 12.1.1 | Lint BPMN |
| `dmnlint` | 2.0.0 | Lint DMN |
| `bpmn-auto-layout` | 1.3.0 | Lay out BPMN that has no coordinates |

These are the latest versions on npm on the check date. Whether `bpmn-auto-layout` copes with pools, message flows, data stores and loop markers is **not yet verified**; phase 3 in the [plan](../PLAN.md) settles it.

## How to update this page

Check the OMG pages and npm directly, never memory. Change the date at the top. If a notation pin moves, search the repo for the old version number and fix every mention.

Back to the [standard's start page](../README.md). The rules that depend on these versions are in [bpmn-profile.md](bpmn-profile.md) and [dmn-profile.md](dmn-profile.md).
