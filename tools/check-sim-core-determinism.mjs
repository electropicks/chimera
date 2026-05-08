// @ts-check

/** @typedef {"Date.now" | "Math.random"} ForbiddenApi */

/**
 * @typedef {object} ForbiddenApiFinding
 * @property {ForbiddenApi} api
 * @property {string} filePath
 * @property {number} line
 */

/** @type {readonly ForbiddenApi[]} */
const FORBIDDEN_APIS = ["Math.random", "Date.now"];

/**
 * @param {ReadonlyMap<string, string>} files
 * @returns {ForbiddenApiFinding[]}
 */
export function findForbiddenSimCoreApis(files) {
  /** @type {ForbiddenApiFinding[]} */
  const findings = [];

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
