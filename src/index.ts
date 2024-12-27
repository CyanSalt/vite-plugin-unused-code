import * as fs from 'fs'
import * as path from 'path'
import type { Options as GlobOptions } from 'fast-glob'
import fastglob from 'fast-glob'
import micromatch from 'micromatch'
import type { OutputBundle, RenderedModule } from 'rollup'
import type { Plugin } from 'vite'

function cleanupFilePath(id: string) {
  return id.slice(id.indexOf('?') + 1)
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

function getModules(bundle: OutputBundle) {
  const modules = new Map<string, ModuleInfo>()
  for (const chunk of Object.values(bundle)) {
    const renderedModules = chunk.type === 'chunk' ? chunk.modules : {}
    for (const [id, data] of Object.entries(renderedModules)) {
      const file = cleanupFilePath(id)
      if (path.isAbsolute(file)) {
        const existing = modules.get(file)
        // Used by bundler
        const removedExports = data.removedExports.filter(name => name !== '__esModule')
        modules.set(file, {
          removedExports: existing ? diff(existing.removedExports, removedExports) : removedExports,
        })
      }
    }
  }
  return modules
}

function filterGlobs(files: string[], globs: string[], options?: GlobOptions) {
  if (options?.absolute) {
    const cwd = options.cwd ?? process.cwd()
    files = files.map(file => path.relative(cwd, file))
    return micromatch(files, globs, options)
      .map(file => path.join(cwd, file))
  }
  return micromatch(files, globs, options)
}

function generateUnusedFilesMessage(unusedFiles: string[]) {
  return `
--------------------- Unused Files ---------------------
${unusedFiles.length ? `
${unusedFiles.join('\n\n')}

There are ${unusedFiles.length} unused files. Please be careful if you want to remove them.
` : `Perfect, there is nothing to do.`}`
}

type ExportsGroup = [string, string[]]

function generateUnusedExportsMessage(unusedExports: ExportsGroup[]) {
  const numberOfUnusedExport = unusedExports
    .map(([file, exports]) => exports.length)
    .reduce((a, b) => a + b, 0)
  return `
--------------------- Unused Exports ---------------------
${numberOfUnusedExport ? `${unusedExports.map(([file, exports]) => `${file}
    ⟶  ${exports.join(', ')}`).join('\n\n')}

There are ${numberOfUnusedExport} unused exports. Please be careful if you want to remove them.
` : `Perfect, there is nothing to do.`}`
}

async function ensureFile(file: string) {
  try {
    await fs.promises.mkdir(path.dirname(file), { recursive: true })
  } catch {
    // ignore error
  }
}

async function writeJSON(file: string, data: unknown) {
  await ensureFile(file)
  await fs.promises.writeFile(file, JSON.stringify(data, null, 2) + '\n')
}

export interface Options {
  context?: string,
  patterns?: string[],
  exclude?: string[],
  detectUnusedFiles?: boolean,
  detectUnusedExport?: boolean,
  log?: 'all' | 'unused' | 'none',
  exportJSON?: boolean | string,
  failOnHint?: boolean,
}

const unusedCodePlugin = (customOptions: Options): Plugin => {
  const options: Required<Options> = {
    context: process.cwd(),
    patterns: ['**/*.*'],
    exclude: [],
    detectUnusedFiles: true,
    detectUnusedExport: true,
    log: 'all',
    exportJSON: false,
    failOnHint: false,
    ...customOptions,
  }
  return {
    enforce: 'post',
    apply: 'build',
    name: 'vite-plugin-unused-code',
    generateBundle(outputOptions, bundle) {
      const {
        context,
        patterns,
        exclude,
        detectUnusedFiles,
        detectUnusedExport,
        log,
        exportJSON,
        failOnHint,
      } = options

      const globs = patterns.concat(exclude.map(pattern => `!${pattern}`))
      const modules = getModules(bundle)
      let unusedFiles: string[] = []
      let unusedExports: ExportsGroup[] = []

      if (detectUnusedFiles) {
        const includedFiles = fastglob.sync(globs, {
          absolute: true,
          cwd: context,
        })
        unusedFiles = includedFiles.filter(file => !modules.has(file))
        if (log === 'all' || log === 'unused' && unusedFiles.length) {
          this.warn(generateUnusedFilesMessage(unusedFiles))
        }
      }

      if (detectUnusedExport) {
        const usedFiles = filterGlobs([...modules.keys()], globs, {
          absolute: true,
          cwd: context,
        })
        unusedExports = usedFiles
          .filter(file => {
            return modules.get(file)!.removedExports.length
          })
          .map(file => {
            return [file, modules.get(file)!.removedExports]
          })
        if (log === 'all' || log === 'unused' && unusedExports.length) {
          this.warn(generateUnusedExportsMessage(unusedExports))
        }
      }

      if (exportJSON) {
        let exportPath = 'unused-code.json'
        if (typeof exportJSON === 'string') {
          exportPath = path.join(exportJSON, exportPath)
        }
        writeJSON(exportPath, {
          files: unusedFiles,
          exports: unusedExports,
        })
      }

      if (failOnHint && (unusedFiles.length > 0 || unusedExports.length > 0)) {
        this.error('Unused code detected.')
      }
    },
  }
}

export default unusedCodePlugin
