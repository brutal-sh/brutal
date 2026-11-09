import type { AppMenuGroupSchema } from '../schema'

export const EDIT_MENU = {
  label: 'Edit',
  paletteIcon: 'pencil',
  items: [
    {
      id: 'edit.undo',
      label: 'Undo',
      command: 'edit.undo'
    },
    {
      id: 'edit.redo',
      label: 'Redo',
      command: 'edit.redo'
    },
    { type: 'separator' },
    { id: 'copy', label: 'Copy', shortcut: 'MOD+C' },
    { id: 'cut', label: 'Cut', shortcut: 'MOD+X' },
    { id: 'paste', label: 'Paste', shortcut: 'MOD+V' },
    { id: 'paste-to-replace', label: 'Paste to replace', shortcut: 'MOD+SHIFT+R' },
    {
      id: 'selection.duplicate',
      label: 'Duplicate',
      command: 'selection.duplicate'
    },
    {
      id: 'selection.delete',
      label: 'Delete',
      command: 'selection.delete'
    },
    { id: 'selection.rename', label: 'Rename Selection…', shortcut: 'MOD+R' },
    { type: 'separator' },
    {
      id: 'selection.selectAll',
      label: 'Select All',
      command: 'selection.selectAll'
    },
    {
      id: 'selection.selectInverse',
      label: 'Select Inverse',
      command: 'selection.selectInverse'
    }
  ]
} satisfies AppMenuGroupSchema

export const OBJECT_MENU = {
  label: 'Object',
  paletteIcon: 'layers',
  items: [
    {
      id: 'selection.group',
      label: 'Group Selection',
      command: 'selection.group'
    },
    {
      id: 'selection.frameSelection',
      label: 'Frame Selection',
      command: 'selection.frameSelection'
    },
    {
      id: 'selection.ungroup',
      label: 'Ungroup Selection',
      command: 'selection.ungroup'
    },
    { type: 'separator' },
    {
      id: 'insert-icon',
      label: 'Insert Icon…',
      palette: { keywords: ['iconify', 'symbol', 'glyph', 'lucide'] }
    },
    { type: 'separator' },
    {
      id: 'selection.toggleMask',
      label: 'Use as Mask',
      command: 'selection.toggleMask'
    },
    {
      id: 'selection.toggleVisibility',
      label: 'Show/Hide',
      command: 'selection.toggleVisibility'
    },
    {
      id: 'selection.toggleLock',
      label: 'Lock/Unlock',
      command: 'selection.toggleLock'
    },
    { type: 'separator' },
    {
      id: 'selection.flipHorizontal',
      label: 'Flip Horizontal',
      command: 'selection.flipHorizontal'
    },
    {
      id: 'selection.flipVertical',
      label: 'Flip Vertical',
      command: 'selection.flipVertical'
    },
    { type: 'separator' },
    {
      id: 'selection.booleanUnion',
      label: 'Union selection',
      command: 'selection.booleanUnion'
    },
    {
      id: 'selection.booleanSubtract',
      label: 'Subtract selection',
      command: 'selection.booleanSubtract'
    },
    {
      id: 'selection.booleanIntersect',
      label: 'Intersect selection',
      command: 'selection.booleanIntersect'
    },
    {
      id: 'selection.booleanExclude',
      label: 'Exclude selection',
      command: 'selection.booleanExclude'
    },
    {
      id: 'selection.flatten',
      label: 'Flatten',
      command: 'selection.flatten'
    },
    {
      id: 'selection.outlineText',
      label: 'Outline text',
      command: 'selection.outlineText'
    },
    {
      id: 'selection.outlineStroke',
      label: 'Outline stroke',
      command: 'selection.outlineStroke'
    },
    { type: 'separator' },
    {
      id: 'selection.createComponent',
      label: 'Create Component',
      command: 'selection.createComponent'
    },
    {
      id: 'selection.createComponentSet',
      label: 'Create Component Set',
      command: 'selection.createComponentSet'
    },
    {
      id: 'selection.createInstance',
      label: 'Create Instance',
      command: 'selection.createInstance'
    },
    {
      id: 'selection.createSlot',
      label: 'Create Slot',
      command: 'selection.createSlot'
    },
    {
      id: 'selection.goToMainComponent',
      label: 'Go to Main Component',
      command: 'selection.goToMainComponent'
    },
    {
      id: 'selection.detachInstance',
      label: 'Detach Instance',
      command: 'selection.detachInstance'
    },
    {
      id: 'selection.detachIcon',
      label: 'Detach Icon',
      command: 'selection.detachIcon'
    },
    { type: 'separator' },
    {
      id: 'selection.moveToPage',
      label: 'Move to Page',
      command: 'selection.moveToPage',
      target: 'browser'
    },
    {
      id: 'selection.bringForward',
      label: 'Bring Forward',
      command: 'selection.bringForward'
    },
    {
      id: 'selection.bringToFront',
      label: 'Bring to Front',
      command: 'selection.bringToFront'
    },
    {
      id: 'selection.sendBackward',
      label: 'Send Backward',
      command: 'selection.sendBackward'
    },
    {
      id: 'selection.sendToBack',
      label: 'Send to Back',
      command: 'selection.sendToBack'
    }
  ]
} satisfies AppMenuGroupSchema

export const TEXT_MENU = {
  label: 'Text',
  paletteIcon: 'type',
  items: [
    { id: 'text.bold', label: 'Bold', shortcut: 'MOD+B' },
    { id: 'text.italic', label: 'Italic', shortcut: 'MOD+I' },
    { id: 'text.underline', label: 'Underline', shortcut: 'MOD+U' }
  ]
} satisfies AppMenuGroupSchema

export const ARRANGE_MENU = {
  label: 'Arrange',
  paletteIcon: 'layers',
  items: [
    {
      id: 'selection.wrapInAutoLayout',
      label: 'Wrap in Auto Layout',
      command: 'selection.wrapInAutoLayout'
    },
    { type: 'separator' },
    { id: 'arrange.align-left', label: 'Align Left', shortcut: 'ALT+A' },
    { id: 'arrange.align-center', label: 'Align Center', shortcut: 'ALT+H' },
    { id: 'arrange.align-right', label: 'Align Right', shortcut: 'ALT+D' },
    { type: 'separator' },
    { id: 'arrange.align-top', label: 'Align Top', shortcut: 'ALT+W' },
    { id: 'arrange.align-middle', label: 'Align Middle', shortcut: 'ALT+V' },
    { id: 'arrange.align-bottom', label: 'Align Bottom', shortcut: 'ALT+S' },
    { type: 'separator' },
    {
      id: 'selection.distributeHorizontal',
      label: 'Distribute Horizontal Spacing',
      command: 'selection.distributeHorizontal'
    },
    {
      id: 'selection.distributeVertical',
      label: 'Distribute Vertical Spacing',
      command: 'selection.distributeVertical'
    },
    { type: 'separator' },
    { id: 'selection.tidyUp', label: 'Tidy Up', command: 'selection.tidyUp' },
    {
      id: 'selection.packHorizontal',
      label: 'Pack Horizontal',
      command: 'selection.packHorizontal'
    },
    { id: 'selection.packVertical', label: 'Pack Vertical', command: 'selection.packVertical' },
    {
      id: 'arrange-layout',
      label: 'Auto Arrange',
      sub: [
        {
          id: 'selection.arrangeSpread',
          label: 'Spread Apart',
          command: 'selection.arrangeSpread'
        },
        {
          id: 'selection.arrangeCompact',
          label: 'Spread and Compact',
          command: 'selection.arrangeCompact'
        },
        {
          id: 'selection.arrangePack',
          label: 'Pack into Rows',
          command: 'selection.arrangePack'
        },
        { type: 'separator' },
        {
          id: 'selection.arrangeFlowDown',
          label: 'Flow, Top to Bottom',
          command: 'selection.arrangeFlowDown'
        },
        {
          id: 'selection.arrangeFlowRight',
          label: 'Flow, Left to Right',
          command: 'selection.arrangeFlowRight'
        },
        {
          id: 'selection.arrangeTreeDown',
          label: 'Tree, Top to Bottom',
          command: 'selection.arrangeTreeDown'
        },
        {
          id: 'selection.arrangeTreeRight',
          label: 'Tree, Left to Right',
          command: 'selection.arrangeTreeRight'
        },
        {
          id: 'selection.arrangeRadial',
          label: 'Radial Map',
          command: 'selection.arrangeRadial'
        },
        { id: 'selection.arrangeNetwork', label: 'Network', command: 'selection.arrangeNetwork' }
      ]
    }
  ]
} satisfies AppMenuGroupSchema
