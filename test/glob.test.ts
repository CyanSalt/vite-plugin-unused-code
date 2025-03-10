import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { filterGlobs, searchGlobs } from '../src/glob'

describe('glob', () => {

  const root = path.dirname(fileURLToPath(import.meta.url))

  it('should traverse all matched files', () => {
    const result = searchGlobs(['fixtures/*.ts'], root)
    expect(result).toEqual([
      path.join(root, 'fixtures/partially-used.ts'),
      path.join(root, 'fixtures/unused.ts'),
      path.join(root, 'fixtures/used.ts'),
    ])
  })

  it('should be able to filter files with glob patterns', () => {
    const files = [
      path.join(root, 'fixtures/invalid.ts'),
      path.join(root, 'fixtures/unused.ts'),
      path.join(root, 'fixtures/unused.json'),
    ]
    const result = filterGlobs(files, ['fixtures/*.ts'], root)
    expect(result).toEqual([
      path.join(root, 'fixtures/invalid.ts'),
      path.join(root, 'fixtures/unused.ts'),
    ])
  })

})
