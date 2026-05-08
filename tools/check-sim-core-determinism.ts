export interface ForbiddenApiFinding {
  api: "Date.now" | "Math.random";
  filePath: string;
  line: number;
}

const FORBIDDEN_APIS = ["Math.random", "Date.now"] as const;

export function findForbiddenSimCoreApis(
  files: ReadonlyMap<string, string>,
): ForbiddenApiFinding[] {
  const findings: ForbiddenApiFinding[] = [];

  for (const [filePath, source] of files) {
    const lines = source.split("\n");

    lines.forEach((lineSource, index) => {
      for (const api of FORBIDDEN_APIS) {
        if (lineSource.includes(api)) {
          findings.push({
            api,
            filePath,
            line: index + 1,
          });
        }
      }
    });
  }

  return findings;
}
