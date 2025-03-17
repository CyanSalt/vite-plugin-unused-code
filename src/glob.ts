import * as path from 'path'
import fastglob from 'fast-glob'
import micromatch from 'micromatch'

export function searchGlobs(globs: string[], cwd = process.cwd()) {
  const files = fastglob.sync(globs, {
    absolute: true,
    cwd,
  })
  /**
   * `fast-glob` will return absolute paths in POSIX style on Windows
   * {@link https://github.com/micromatch/micromatch?tab=readme-ov-file#backslashes}
   */
  return process.platform === 'win32'
    ? files.map(file => path.normalize(file))
    : files
}

export function filterGlobs(files: string[], globs: string[], cwd = process.cwd()) {
  return micromatch(
    files.map(file => path.relative(cwd, file)),
    globs,
    { cwd },
  ).map(file => path.normalize(path.join(cwd, file)))
}
