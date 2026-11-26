import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    coverage: { include: ['src/core/**', 'src/main/schedulerService.ts'], reporter: ['text-summary', 'text'], thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 } },
  },
});
