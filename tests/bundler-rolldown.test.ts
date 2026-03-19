import path from 'path'
import { fileURLToPath } from 'url'
import type { OutputBundle } from 'rolldown'
import * as vite from 'rolldown-vite'
import { describe, expect, it } from 'vitest'
import { getModules } from '../src/bundler'

describe('bundler-rolldown', () => {

  it('should report unused files', async () => {
    const root = path.dirname(fileURLToPath(import.meta.url))
    const outputBundle = await new Promise<OutputBundle>(resolve => {
      vite.build({
        root,
        plugins: [
          {
            name: import.meta.url,
            generateBundle(outputOptions, bundle) {
              resolve(bundle)
            },
          },
        ],
        logLevel: 'silent',
      })
    })
    expect(outputBundle).toBeDefined()
    const modules = getModules(outputBundle)
    expect(modules.size).toBe(4)
    expect(Array.from(modules)).toEqual([
      [
        path.join(root, 'fixtures/partially-used.ts'),
        expect.objectContaining({
          // TODO: `removedExports` is not reported in rolldown
          // removedExports: ['unusedText'],
          removedExports: [],
        }),
      ],
      [
        path.join(root, 'fixtures/used.ts'),
        expect.anything(),
      ],
      [
        path.join(root, 'main.ts'),
        expect.anything(),
      ],
      [
        path.join(root, 'index.html'),
        expect.anything(),
      ],
    ])
  })

})
