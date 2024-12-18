import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, test, expect } from "vitest";
import { execa } from "execa";

const WHITESPACE_ONLY = /^\s*$/;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runLintAgainst(projectName: string) {
  const parentDir = path.join(__dirname, "../examples");
  const projectDir = path.join(parentDir, projectName);
  // Use `pnpm` to avoid locating each `eslint` bin ourselves.
  // Use `--silent` to only print the output of the command, stripping the pnpm log.
  return execa({
    preferLocal: true,
    cwd: projectDir,
    reject: false,
  })`pnpm --silent lint`;
}

describe("should pass lint without error in new project", () => {
  const projectName = "minimal";

  test(projectName, async () => {
    const { stdout } = await runLintAgainst(projectName);
    expect(stdout).toMatch(WHITESPACE_ONLY);
  });
});
