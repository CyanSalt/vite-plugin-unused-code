import * as path from 'path'
import type { OutputBundle as RolldownOutputBundle, RenderedModule as RolldownRenderedModule } from 'rolldown'
import type { OutputBundle as RollupOutputBundle, RenderedModule as RollupRenderedModule } from 'rollup'

type OutputBundle = Record<string, RollupOutputBundle[string] | RolldownOutputBundle[string]>

type RenderedModule = RollupRenderedModule | (
  RolldownRenderedModule & Partial<Record<
    Exclude<keyof RollupRenderedModule, keyof RolldownRenderedModule>,
    undefined
  >>
)

export function cleanupFilePath(id: string) {
  const searchIndex = id.indexOf('?')
  return searchIndex === -1 ? id : id.slice(0, searchIndex)
}

function diff<T>(arr1: T[], arr2: T[]) {
  return [
    ...arr1.filter(item => arr2.includes(item)),
    ...arr2.filter(item => arr1.includes(item)),
  ]
}

type PropertyValue<T, K extends PropertyKey> = T extends Record<K, infer V> ? V : undefined

export interface ModuleInfo {
  removedExports?: PropertyValue<RenderedModule, 'removedExports'>,
}

export function getModules(bundle: OutputBundle, transformedModules?: Set<string>) {
  const modules = new Map<string, ModuleInfo>()
  for (const chunk of Object.values(bundle)) {
    const renderedModules: Record<string, RenderedModule> = chunk.type === 'chunk' ? chunk.modules : {}
    for (const [id, data] of Object.entries(renderedModules)) {
      const file = cleanupFilePath(id)
      if (path.isAbsolute(file)) {
        const key = path.normalize(file)
        const existing = modules.get(key)
        // Guard against missing removedExports (Rolldown doesn't provide it)
        const removedExports = (data.removedExports ?? []).filter(name => name !== '__esModule')
        modules.set(key, {
          removedExports: existing ? diff(existing.removedExports ?? [], removedExports) : removedExports,
        })
      }
    }
  }
  // Rolldown (used by Vite 8+) may not fully populate chunk.modules,
  // e.g. barrel re-exports can be missing. Merge in all modules tracked
  // via the transform hook to ensure they are not reported as unused.
  if (transformedModules) {
    for (const key of transformedModules) {
      if (!modules.has(key)) {
        modules.set(key, {})
      }
    }
  }
  return modules
}
