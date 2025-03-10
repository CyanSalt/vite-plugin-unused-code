import * as fs from 'fs'
import * as path from 'path'
import type { Options as GlobOptions } from 'fast-glob'
import fastglob from 'fast-glob'
import micromatch from 'micromatch'
import type { OutputBundle, RenderedModule } from 'rollup'
import type { Plugin } from 'vite'

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

function getModules(bundle: OutputBundle) {
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

function filterGlobs(files: string[], globs: string[], options?: GlobOptions) {
  if (options?.absolute) {
    const cwd = options.cwd ?? process.cwd()
    files = files.map(file => path.relative(cwd, file))
    return micromatch(files, globs, options)
      .map(file => path.normalize(path.join(cwd, file)))
  }
  return micromatch(files, globs, options)
    .map(file => path.normalize(file))
}

function generateUnusedFilesMessage(unusedFiles: string[]) {
  const numberOfUnusedFile = unusedFiles.length
  const shouldUsePlural = numberOfUnusedFile > 1
  return `
--------------------- Unused Files ---------------------
${numberOfUnusedFile ? `
${unusedFiles.join('\n\n')}

There are ${numberOfUnusedFile} unused file${shouldUsePlural ? 's' : ''}. Please be careful if you want to remove ${shouldUsePlural ? 'them' : 'it'}.
` : `Perfect, there is nothing to do.`}`
}

type ExportsGroup = [string, string[]]

function generateUnusedExportsMessage(unusedExports: ExportsGroup[]) {
  const numberOfUnusedExport = unusedExports
    .map(([file, exports]) => exports.length)
    .reduce((a, b) => a + b, 0)
  const shouldUsePlural = numberOfUnusedExport > 1
  return `
--------------------- Unused Exports ---------------------
${numberOfUnusedExport ? `${unusedExports.map(([file, exports]) => `${file}
    ⟶  ${exports.join(', ')}`).join('\n\n')}

There are ${numberOfUnusedExport} unused export${shouldUsePlural ? 's' : ''}. Please be careful if you want to remove ${shouldUsePlural ? 'them' : 'it'}.
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

type RequiredExcept<T, U extends keyof T> = Pick<T, U> & Required<Omit<T, U>>

const unusedCodePlugin = (customOptions: Options): Plugin => {
  const options: RequiredExcept<Options, 'context' | 'log'> = {
    patterns: ['**/*.*'],
    exclude: [],
    detectUnusedFiles: true,
    detectUnusedExport: true,
    exportJSON: false,
    failOnHint: false,
    ...customOptions,
  }
  return {
    enforce: 'post',
    apply: 'build',
    name: 'vite-plugin-unused-code',
    configResolved(config) {
      options.context ??= config.root
      options.log ??= config.logLevel === 'silent' ? 'none' : (
        config.logLevel === 'info' ? 'all' : 'unused'
      )
    },
    generateBundle(outputOptions, bundle) {
      const {
        context = process.cwd(),
        patterns,
        exclude,
        detectUnusedFiles,
        detectUnusedExport,
        log = 'all',
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
