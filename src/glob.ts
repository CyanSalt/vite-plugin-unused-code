import * as path from 'path'
import fastglob from 'fast-glob'
import micromatch from 'micromatch'

export function searchGlobs(globs: string[], cwd = process.cwd()) {
  return fastglob.sync(globs, {
    absolute: true,
    cwd,
  })
}

export function filterGlobs(files: string[], globs: string[], cwd = process.cwd()) {
  return micromatch(
    files.map(file => path.relative(cwd, file)),
    globs,
    { cwd },
  ).map(file => path.normalize(path.join(cwd, file)))
}
