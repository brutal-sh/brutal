# Pen.app parity and work order

Snapshot of November 23, 2026, against Pen 1.2.24 on Apple silicon. The [Trello register](https://trello.com/c/cr0YPLzZ) is the live tracker.

The [requirements](requirements.csv) cover 164 named behaviors and their acceptance checks. The [work order](board-order.csv) records 6 Ready cards and 422 Backlog cards. List positions and sizes reflect the date of the snapshot. Frequency is estimated from editing workflows and user reports. A completed comparison requires running the same case in both apps.

Two reproducible examples informed the priorities. Brutal rejected a 2.25 file containing one frame and one rectangle and opened the equivalent 2.22 file. The [upstream OpenPencil revision](https://github.com/open-pencil/open-pencil/tree/1814dcbd0a493924adc6518e5bd35f25a60a582e) opened the basic 2.25 file, but converted a browser layer into an empty frame. In a separate layout check, two 10 px children with a 20 px gap produced a 20 px hugging row in Brutal instead of 40 px. [File compatibility](https://trello.com/c/ATjvRJxT) · [Hugging row](https://trello.com/c/WfU1SIEJ)

## Trello sections

These links open the section records on the Brutal board. Each record contains its named requirements, acceptance checks and linked cards.

- [Install, onboard and update](https://trello.com/c/5owUQLlv#comment-6b04487ac53c97a6ab155716)
- [Accounts, workspace and usage](https://trello.com/c/XDyGVz1C#comment-6b04487d471521a8798af78b)
- [Home, tabs and recovery](https://trello.com/c/5owUQLlv#comment-6b044880f5b680b9dd094665)
- [Navigation and keyboard](https://trello.com/c/PDFR1gPR#comment-6b0448830324426ae79544ba)
- [Canvas, layers and geometry](https://trello.com/c/PDFR1gPR#comment-6b04488679c3be15f6e843ea)
- [Inspector, layout, typography and effects](https://trello.com/c/xUOJr8uG#comment-6b044888bf599c45c1ca7270)
- [Components, variables, libraries and slots](https://trello.com/c/8xmRnFsF#comment-6b04488bb0d820f88cadd5f0)
- [Goodies, scripts, shaders and code](https://trello.com/c/pyMNsMVF#comment-6b04488ea921dc6305e42c90)
- [Browser, capture and web import](https://trello.com/c/Z1ocdtYQ#comment-6b044891c986aea9b43e6646)
- [File formats, clipboard and export](https://trello.com/c/CnwCPA0g#comment-6b0448941844258f87b850b2)
- [Chat, models and agent activity](https://trello.com/c/qua6eecg#comment-6b0448978971fc47f23fa0c0)
- [Settings, providers, MCP and CLI](https://trello.com/c/SSIh4gnd#comment-6b04489aad38143df5259c07)
- [Sharing, comments and sync](https://trello.com/c/XDyGVz1C#comment-6b04489d5ef382b91c1750a5)
- [Slides and presentations](https://trello.com/c/FmUZ73Th#comment-6b0448a0ddc0149aae5afdfc)
- [Hosted site, help and companion entry points](https://trello.com/c/TupdvCai#comment-6b0448a2b711777d373340db)

The [parity register](https://trello.com/c/cr0YPLzZ) has the active work order.
