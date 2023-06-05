# vite-plugin-unused-code

[![npm](https://img.shields.io/npm/v/vite-plugin-unused-code.svg)](https://www.npmjs.com/package/vite-plugin-unused-code)

Vite/Rollup plugin to detect unused files and unused exports in used files.

This package is a ported version of [`webpack-deadcode-plugin`](https://github.com/MQuy/webpack-deadcode-plugin).

## Installation

```shell
npm install --save-dev vite-plugin-unused-code
```

## Usage

```js
// vite.config.js
import unusedCode from 'vite-plugin-unused-code'

export default {
  plugins: [
    unusedCode({
      patterns: ['src/**/*.*'],
    }),
  ],
}
```

## Options

### `context`

- **Type:** `string`
- **Default:** `process.cwd()`

  Current working directory where `patterns` and `exclude` are located.

### `patterns`

- **Type:** `string[]`
- **Default:** `['**/*.*']`

  The array of [`micromatch`](https://github.com/micromatch/micromatch) patterns to look for unused files and unused export in used files.

### `exclude`

- **Type:** `string[]`
- **Default:** `[]`

  *Deprecated*. The array of patterns to not look at. `{ exclude: ['foo'] }` is actually equivalent to `{ patterns: ['!foo'] }`.

  This option is reserved only for compatibility with `webpack-deadcode-plugin`.

### `detectUnusedFiles`

- **Type:** `boolean`
- **Default:** `true`

  Whether to run unused files detection or not.

### `detectUnusedExport`

- **Type:** `boolean`
- **Default:** `true`

  Whether to run unused export detection in used files or not.

### `log`

- **Type:** `'all' | 'used' | 'none'`
- **Default:** `'all'`

  Adjust console output verbosity.

  - `'all'`: Show all messages.
  - `'used'`: Only show messages when there are either unused files or unused export.
  - `'none'`: Won't show unused files or unused export messages in the console. It can keep terminal clean when set `exportJSON` to `true`.

### `exportJSON`

- **Type:** `boolean | string`
- **Default:** `false`

  Whether to export data in JSON format. A `unused-code.json` file will be created in the current directory is specified as `true`. You can also specify a directory to create in it instead.

### `failOnHint`

- **Type:** `boolean`
- **Default:** `false`

  Whether to interrupt the compilation when unused files or exports detected.
