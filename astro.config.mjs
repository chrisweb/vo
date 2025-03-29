// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import denoAdapter from '@deno/astro-adapter';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: denoAdapter()
});