const packageNames = ["app", "ui", "renderer", "creature-ai", "sim-core", "content"];

// ADR 0002 applies public-entrypoint-only imports to every package, including
// content; content purity is enforced separately by no-content-runtime-package-deps.
const packageInternalImportRules = packageNames.map((packageName) => ({
  name: `no-${packageName}-internal-imports`,
  severity: "error",
  comment: "Cross-package imports must go through the target package public src/index.ts export.",
  from: {
    path: "^(packages|tools)/",
    pathNot: `^packages/${packageName}/`,
  },
  to: {
    path: `^packages/${packageName}/src/(?!index\\.ts$).+\\.ts$`,
  },
}));

module.exports = {
  forbidden: [
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment: "Imports must resolve so package-boundary violations point to real files.",
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: "no-ui-to-app",
      severity: "error",
      comment: "The package graph is one way: app -> ui -> renderer -> creature-ai -> sim-core.",
      from: {
        path: "^packages/ui/src/",
      },
      to: {
        path: "^packages/app/src/",
      },
    },
    {
      name: "no-renderer-to-ui-or-app",
      severity: "error",
      comment: "Renderer must stay below UI/app and communicate upward through events.",
      from: {
        path: "^packages/renderer/src/",
      },
      to: {
        path: "^packages/(ui|app)/src/",
      },
    },
    {
      name: "no-creature-ai-to-presentation-or-app",
      severity: "error",
      comment: "Creature AI may depend on sim-core contracts, not renderer/ui/app layers.",
      from: {
        path: "^packages/creature-ai/src/",
      },
      to: {
        path: "^packages/(renderer|ui|app)/src/",
      },
    },
    {
      name: "no-sim-core-to-higher-layers",
      severity: "error",
      comment: "sim-core is the deterministic base layer and must not import higher layers.",
      from: {
        path: "^packages/sim-core/src/",
      },
      to: {
        path: "^packages/(creature-ai|renderer|ui|app)/src/",
      },
    },
    {
      name: "no-content-runtime-package-deps",
      severity: "error",
      comment: "content is pure serializable data and must not take runtime package deps.",
      from: {
        path: "^packages/content/src/",
      },
      to: {
        path: "^packages/(app|ui|renderer|creature-ai|sim-core)/src/",
        // Dependency Cruiser 17.4 emits "type-only" for `import type` and
        // "type-import" for `import("...").T` type queries.
        dependencyTypesNot: ["type-only", "type-import"],
      },
    },
    ...packageInternalImportRules,
  ],
  options: {
    combinedDependencies: true,
    doNotFollow: {
      path: "node_modules",
    },
    enhancedResolveOptions: {
      conditionNames: ["import", "node", "default"],
      exportsFields: ["exports"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    },
    progress: {
      type: "none",
    },
    skipAnalysisNotInRules: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    tsPreCompilationDeps: "specify",
  },
};
