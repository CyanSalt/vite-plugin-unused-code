import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
    dts: {
      tsconfig: './tsconfig.lib.json',
      compilerOptions: {
        composite: false,
      },
    },
  },
})
