import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.lib.json',
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ],
  build: {
    copyPublicDir: false,
    lib: {
      entry: 'src/lib/index.ts',
      name: 'GeoCrossSection',
      formats: ['es', 'umd'],
      fileName: (format) => `geo-cross-section.${format}.js`,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
