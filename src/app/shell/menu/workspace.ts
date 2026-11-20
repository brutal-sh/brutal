import type {
  Menu as NativeMenu,
  MenuItem as NativeMenuItem,
  MenuItemOptions
} from '@tauri-apps/api/menu'

import type { Vector } from '@open-pencil/scene-graph/primitives'

import { openExternalLink } from '@/app/shell/ui'
import { OPEN_PEN_CLI_GUIDE_URL } from '@/constants'

/** Desktop uses the platform popup; browser commands stay in the web dropdown. */
export async function popupWorkspaceMenu(
  position: Vector,
  links: readonly { label: string; href: string }[],
  actions: { toggleTheme: () => void; toggleUI: () => void }
) {
  const [{ Menu, MenuItem }, { LogicalPosition }] = await Promise.all([
    import('@tauri-apps/api/menu'),
    import('@tauri-apps/api/dpi')
  ])
  const items: NativeMenuItem[] = []
  let menu: NativeMenu | undefined
  // Tauri 2.12.1 drops inline items' action channels; retain explicit resources until dismissal.
  async function item(options: MenuItemOptions) {
    const resource = await MenuItem.new(options)
    items.push(resource)
    return resource
  }
  try {
    const linkItems: NativeMenuItem[] = []
    for (const [index, link] of links.entries()) {
      linkItems.push(
        await item({
          id: `workspace-link-${index}`,
          text: link.label.replaceAll('&', '&&'),
          action: () => void openExternalLink(link.href)
        })
      )
    }
    menu = await Menu.new({
      items: [
        ...linkItems,
        { item: 'Separator' },
        await item({ text: 'Toggle Light/Dark mode', action: actions.toggleTheme }),
        await item({
          text: 'Show/Hide UI',
          accelerator: 'CmdOrCtrl+Backslash',
          action: actions.toggleUI
        }),
        { item: 'Separator' },
        await item({
          text: 'Brutal CLI docs',
          action: () => void openExternalLink(OPEN_PEN_CLI_GUIDE_URL)
        })
      ]
    })
    await menu.popup(new LogicalPosition(position.x, position.y))
  } finally {
    await Promise.all([menu?.close(), ...items.map((resource) => resource.close())])
  }
}
