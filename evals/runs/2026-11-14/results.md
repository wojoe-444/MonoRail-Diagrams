| Case | files | built | brief | lint | expect | Result |
| --- | --- | --- | --- | --- | --- | --- |
| backup-schedule | yes | yes | yes | yes | yes | pass |
| child-turn | yes | yes | yes | yes | yes | pass |
| connection-check | yes | yes | yes | yes | **no** | **fail** |
| remote-access | yes | yes | yes | yes | yes | pass |
| update-flow | yes | yes | yes | yes | yes | pass |

What failed:

- connection-check, expect: a process was added around a lone decision (BL-11)
