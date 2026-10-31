# Prompt Gallery & Tips

These prompts are written for Open Pen’s chat and local canvas tools. Connect an AI provider or an existing coding-agent login in Settings first. The provider supplies inference; Open Pen supplies the document tools. Review the result on the canvas and save the document yourself.

## Create an editable screen

> Create a 1440×900 project dashboard with a left navigation rail, a page heading, three summary cards and a task list. Use editable frames and text. Use a dark neutral palette with one purple accent. Name the layers by their purpose. Finish by describing what you changed.

Specify the frame size, content, layout and visual constraints. Select the relevant frame before asking for a revision. Attach a reference image when its appearance matters; describe which parts to follow.

## Revise the selection

> Update only the selected card. Keep its dimensions and position. Increase the title’s contrast, align the text and action button, and use 16px internal spacing. Preserve the other cards. Explain any constraint you cannot meet.

Give the intended scope explicitly. Inspect the layer tree and properties after the reply. Use Undo if the result is unsuitable; an agent’s success message is not visual acceptance.

## Prepare a code handoff

> Inspect the selected frame. Describe its layout, typography, colors and reusable components, then propose a React implementation. Preserve the visible content and identify any asset or behavior you cannot infer.

For a file export, use Open Pen’s code-export controls and inspect the generated output. For an external agent, use File → Guide: How to Export Design to Code and check the local MCP server status. Code generation depends on the connected client and model; a running bridge alone does not generate a working application.

## Check the result

Compare the result at its intended zoom. Check text overflow, spacing, layer names and selection scope. Save, reopen and inspect exported assets before relying on them. Add one concrete correction per revision when that makes the result easier to evaluate.

The [feature catalog](pen-feature-reference/README.md) and [acceptance record](ACCEPTANCE.md) distinguish documented features from executed workflows. These examples are starting prompts; results vary by model and are not guaranteed design presets.
