/** @type {import('vitest/config').UserConfig} */
export default {
  test: {
    include: ["tests/**/*.js"],
    exclude: ["**/node_modules/**", "**/.git/**"],
  },
};
