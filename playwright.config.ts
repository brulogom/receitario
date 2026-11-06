import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  reporter: 'line',
  use: { baseURL: 'http://localhost:4173/' },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    { name: 'computador', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
  },
});
