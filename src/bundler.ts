import * as path from 'path'
import type { OutputBundle, RenderedModule } from 'rollup'

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

export interface ModuleInfo {
  removedExports: RenderedModule['removedExports'],
}

export function getModules(bundle: OutputBundle, transformedModules?: Set<string>) {
  const modules = new Map<string, ModuleInfo>()
  for (const chunk of Object.values(bundle)) {
    const renderedModules = chunk.type === 'chunk' ? chunk.modules : {}
    for (const [id, data] of Object.entries(renderedModules)) {
      const file = cleanupFilePath(id)
      if (path.isAbsolute(file)) {
        const key = path.normalize(file)
        const existing = modules.get(key)
        // Guard against missing removedExports (Rolldown doesn't provide it)
        const removedExports = (data.removedExports ?? []).filter(name => name !== '__esModule')
        modules.set(key, {
          removedExports: existing ? diff(existing.removedExports, removedExports) : removedExports,
        })
      }
    }
  }
  // Rolldown (used by Vite 8+) doesn't populate chunk.modules.
  // Fall back to modules tracked via the transform hook.
  if (modules.size === 0 && transformedModules) {
    for (const key of transformedModules) {
      modules.set(key, { removedExports: [] })
    }
  }
  return modules
}
