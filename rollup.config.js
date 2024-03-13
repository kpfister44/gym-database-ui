import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import postcss from 'rollup-plugin-postcss'; 
import del from 'rollup-plugin-delete';
import copy from 'rollup-plugin-copy';

// Manually set the production flag
const production = false; // Set to true for production builds, false for development

export default {
  input: 'src/main.ts', 
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'public/build/bundle.js'
  },
  plugins: [
    del({ targets: 'public/build/*' }),
    svelte({
      preprocess: sveltePreprocess(),
      compilerOptions: {
        // enable run-time checks when not in production
        dev: !production
      }
    }),
    postcss({
      extract: true,
      minimize: production,
      sourceMap: !production,
      plugins: [
        require('tailwindcss'), // Add Tailwind CSS
        require('autoprefixer'), // Add Autoprefixer
      ]
    }),
    resolve({
        browser: true,
        dedupe: ['svelte']
    }),
    commonjs(),
    typescript({
      sourceMap: !production,
      inlineSources: !production
    }),
    copy({
      targets: [
        { src: 'src/index.html', dest: 'public/build' }
      ]
    }),
    production && terser()
  ],
  watch: {
    clearScreen: false
  }
};