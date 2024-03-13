import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

const production = false;

export default {
  input: 'src/backend/server.ts', 
  output: {
    sourcemap: !production,
    format: 'cjs', 
    file: 'dist/backend/server.js' 
  },
  plugins: [
    json(),
    resolve({
      preferBuiltins: true, // Prefer Node.js built-ins over npm modules
    }),
    commonjs(),
    typescript({
        tsconfig: './tsconfig.backend.json' 
    }),
  ],
  external: ['express', 'mysql'], // Mark express and mysql as external
  watch: {
    clearScreen: false
  }
};