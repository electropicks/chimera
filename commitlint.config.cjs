const allowedScopes = [
  "sim-core",
  "creature-ai",
  "content",
  "renderer",
  "ui",
  "app",
  "infra",
  "docs",
  "adr",
  "tools",
  "deps",
];

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-empty": [2, "never"],
    "scope-enum": [2, "always", allowedScopes],
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "style",
        "test",
      ],
    ],
  },
};
