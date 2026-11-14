# Symbol reference

Every shape the [BPMN profile](bpmn-profile.md) and [DMN profile](dmn-profile.md) allow, what it looks like, what it means, and when to reach for it. In the XML, the element name is in the last column. Names to put on each shape: [naming.md](naming.md).

## BPMN

### Participants

| Shape | Means | Use it for | XML |
| --- | --- | --- | --- |
| Large rectangle with a name band on the left | A pool: a participant whose steps we draw | The app or the part of it being described | `participant` with a `processRef` |
| Plain wide bar with a centred name | A black-box pool: a participant we only exchange messages with | Codex CLI, GitHub, a browser | `participant` without `processRef` |
| Horizontal strip inside a pool | A lane: a role inside one pool | The renderer vs the main process | `lane` |

### Events (circles)

| Shape | Means | Use it for | XML |
| --- | --- | --- | --- |
| Thin circle | Start | Where the process begins | `startEvent` |
| Thin circle with an envelope | Start on a message | A process started by someone else's message | `startEvent` + `messageEventDefinition` |
| Thin circle with a clock | Start on a timer | A scheduled run, such as the 15 minute report rebuild | `startEvent` + `timerEventDefinition` |
| Thick circle | End | One distinct outcome | `endEvent` |
| Thick circle with a filled envelope | End by sending a message | The last act is a message | `endEvent` + `messageEventDefinition` |
| Thick circle with a lightning bolt | End in error | An outcome that is a failure other processes must see | `endEvent` + `errorEventDefinition` |
| Thick circle with a filled circle | Terminate | Stop everything in the process, including parallel branches | `endEvent` + `terminateEventDefinition` |
| Double circle with an envelope | Wait for or send a message mid-flow | Waiting for a reply | `intermediateCatchEvent`, `intermediateThrowEvent` + `messageEventDefinition` |
| Double circle with a clock | Wait for a time | A pause or delay | `intermediateCatchEvent` + `timerEventDefinition` |
| Double circle on an activity's edge | Boundary event | A limit or failure attached to one activity; solid ring interrupts the activity, dashed ring does not | `boundaryEvent` (`cancelActivity="false"` for dashed) |

### Activities (rounded rectangles)

| Shape | Means | Use it for | XML |
| --- | --- | --- | --- |
| Plain | A task of no particular kind | When the kind does not matter | `task` |
| Person icon | User task | A person acts or decides | `userTask` |
| Gear icon | Service task | Software does it (calls a tool, an API, a program) | `serviceTask` |
| Table icon | Business rule task | Asks a decision ([BL-1](bpmn-vs-dmn.md#the-blend)) | `businessRuleTask` |
| Filled envelope | Send task | Sends a message to another participant | `sendTask` |
| Open envelope | Receive task | Waits for a message | `receiveTask` |
| Hand icon | Manual task | A person does something away from any system | `manualTask` |
| Rounded rectangle, plus sign at the bottom | Collapsed sub-process | A part of the process shown elsewhere in this file | `subProcess` (collapsed in the diagram) |
| Large rounded rectangle containing shapes | Expanded sub-process | A part shown in place | `subProcess` |
| Heavy border, plus sign | Call activity | Another process, in its own file, reused here | `callActivity` |
| Circular arrow at the bottom | Standard loop | Repeat these steps | `standardLoopCharacteristics` |
| Three vertical bars at the bottom | Parallel multi-instance | Do it for each item, at the same time | `multiInstanceLoopCharacteristics` |
| Three horizontal bars at the bottom | Sequential multi-instance | Do it for each item, one after another | `multiInstanceLoopCharacteristics isSequential="true"` |

### Gateways (diamonds)

| Shape | Means | Use it for | XML |
| --- | --- | --- | --- |
| Diamond with an X, or empty | Exclusive: exactly one path | "Which one?" after a question | `exclusiveGateway` |
| Diamond with a plus | Parallel: all paths at once (split) or wait for all (join) | Things that happen together | `parallelGateway` |
| Diamond with a pentagon in a double circle | Event-based: whichever event comes first | Waiting for a reply or a timeout | `eventBasedGateway` |
| Diamond with a circle | Inclusive: one or more paths | Rare; see BP-4 | `inclusiveGateway` |

### Flows and data

| Shape | Means | Use it for | XML |
| --- | --- | --- | --- |
| Solid line, filled arrowhead | Sequence flow: the order within a pool | Next step | `sequenceFlow` |
| Solid line with a short slash at the start | Default flow | The path taken when no other answer matches | `sequenceFlow` + `default` on the gateway |
| Dashed line, hollow circle at the start, open arrowhead | Message flow: a message between pools | Sending to or hearing from another participant | `messageFlow` |
| Page with a folded corner | Data object | A value used inside one run | `dataObjectReference` |
| Cylinder | Data store | A value that outlives one run | `dataStoreReference` |
| Dotted line, open arrowhead | Data association | Which activity reads or writes data | `dataInputAssociation`, `dataOutputAssociation` |
| Open bracket with text | Text annotation | A note that does not change the flow | `textAnnotation` + `association` |
| Dashed rounded rectangle | Group | Visually bind shapes; no meaning for the flow | `group` |

## DMN

| Shape | Means | Use it for | XML |
| --- | --- | --- | --- |
| Rectangle | Decision | A question with an answer | `decision` |
| Oval | Input data | A fact from outside | `inputData` |
| Rectangle with two clipped top corners | Business knowledge model | Shared logic | `businessKnowledgeModel` |
| Wavy-bottomed rectangle | Knowledge source | Where a rule comes from | `knowledgeSource` |
| Solid line, filled arrowhead | Information requirement | "Needs this input or decision" | `informationRequirement` |
| Dashed line, open arrowhead | Knowledge requirement | "Calls this shared logic" | `knowledgeRequirement` |
| Dashed line with a filled circle at the end | Authority requirement | "Rule comes from this source" | `authorityRequirement` |
| Grid with a hit policy letter | Decision table | The rules | `decisionTable` |

## See also

[bpmn-profile.md](bpmn-profile.md) for the rules about when each is allowed, [dmn-profile.md](dmn-profile.md) likewise, and [bpmn-vs-dmn.md](bpmn-vs-dmn.md) for choosing between them.
