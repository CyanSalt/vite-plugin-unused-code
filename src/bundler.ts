import * as path from 'path'
import type { OutputBundle, RenderedModule } from 'rollup'

function cleanupFilePath(id: string) {
  const searchIndex = id.indexOf('?')
  return searchIndex === -1 ? id : id.slice(0, searchIndex)
}

function diff<T>(arr1: T[], arr2: T[]) {
  return [
    ...arr1.filter(item => arr2.includes(item)),
    ...arr2.filter(item => arr1.includes(item)),
  ]
}

interface ModuleInfo {
  removedExports: RenderedModule['removedExports'],
}

export function getModules(bundle: OutputBundle) {
  const modules = new Map<string, ModuleInfo>()
  for (const chunk of Object.values(bundle)) {
    const renderedModules = chunk.type === 'chunk' ? chunk.modules : {}
    for (const [id, data] of Object.entries(renderedModules)) {
      const file = cleanupFilePath(id)
      if (path.isAbsolute(file)) {
        const key = path.normalize(file)
        const existing = modules.get(key)
        // Used by bundler
        const removedExports = data.removedExports.filter(name => name !== '__esModule')
        modules.set(key, {
          removedExports: existing ? diff(existing.removedExports, removedExports) : removedExports,
        })
      }
    }
  }
  return modules
}
