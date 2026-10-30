import { dirname, join, resolve } from 'node:path'

/** Embed all JavaScript and schema data; runtime startup must not read the checkout. */
export async function buildBridge(workspace: string, outfile: string): Promise<void> {
  const result = await Bun.build({
    entrypoints: [join(workspace, 'packages/mcp/src/index.ts')],
    compile: { outfile },
    plugins: [
      {
        name: 'openpen-standalone-data',
        setup(build) {
          // The supported distribution embeds data; the Node ESM entry uses createRequire
          // with relative JSON paths that cannot survive a single executable bundle.
          build.onResolve({ filter: /^css-tree$/ }, ({ importer }) => ({
            path: Bun.resolveSync('css-tree/dist/csstree.esm', dirname(importer))
          }))
          build.onResolve({ filter: /\?raw$/ }, ({ path, importer }) => ({
            path: resolve(dirname(importer), path.slice(0, -4)),
            namespace: 'raw-text'
          }))
          build.onLoad({ filter: /.*/, namespace: 'raw-text' }, async ({ path }) => ({
            contents: await Bun.file(path).text(),
            loader: 'text'
          }))
        }
      }
    ]
  })
  if (!result.success) throw new AggregateError(result.logs, 'Standalone bridge build failed.')
}
