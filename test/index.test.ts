import path from 'path'
import { fileURLToPath } from 'url'
import * as vite from 'vite'
import { describe, expect, it, vi } from 'vitest'
import unusedCode from '../src'

describe('vite-plugin-unused-code', () => {

  it('should report unused files', async () => {
    const mockConsole = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }
    const root = path.dirname(fileURLToPath(import.meta.url))
    await vite.build({
      root,
      plugins: [
        unusedCode({
          detectUnusedFiles: true,
          detectUnusedExport: false,
          patterns: [
            '**/*.ts',
            '!**/*.test.ts',
          ],
        }),
      ],
      customLogger: vite.createLogger('info', {
        console: mockConsole as unknown as Console,
      }),
    })
    expect(mockConsole.warn).toHaveBeenCalledOnce()
    const message = mockConsole.warn.mock.calls[0][0]
    expect(message).toEqual(
      expect.stringContaining('There are 1 unused file.'),
    )
    expect(message).toEqual(
      expect.stringContaining(path.join(root, 'fixtures/unused.ts')),
    )
  })

  it('should report unused exports', async () => {
    const mockConsole = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }
    const root = path.dirname(fileURLToPath(import.meta.url))
    await vite.build({
      root,
      plugins: [
        unusedCode({
          detectUnusedFiles: false,
          detectUnusedExport: true,
          patterns: [
            '**/*.ts',
            '!**/*.test.ts',
          ],
        }),
      ],
      customLogger: vite.createLogger('info', {
        console: mockConsole as unknown as Console,
      }),
    })
    expect(mockConsole.warn).toHaveBeenCalledOnce()
    const message = mockConsole.warn.mock.calls[0][0]
    expect(message).toEqual(
      expect.stringContaining('There are 1 unused export.'),
    )
    expect(message).toEqual(
      expect.stringContaining(path.join(root, 'fixtures/partially-used.ts')),
    )
    expect(message).toEqual(
      expect.stringContaining('unusedText'),
    )
  })

})
