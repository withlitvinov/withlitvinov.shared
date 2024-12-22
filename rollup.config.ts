import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { OutputOptions, RollupOptions, Plugin } from "rollup";
import json from "@rollup/plugin-json";
import alias from "@rollup/plugin-alias";
import { default as esbuild } from "rollup-plugin-esbuild";
import commonJS from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";

const PACKAGE_BASE_DIR = "packages";
const BUILD_DIR = "lib";
const DEFAULT_FORMATS: PackageFormat[] = ["es", "cjs"];

const env = {
  target: process.env.TARGET,
  sourcemap: process.env.SOURCE_MAP,
};

if (!env.target) {
  throw new Error("TARGET package must be specified via --environment flag.");
}

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// const rootVersion = require("./package.json").version;

const packagesDir = path.resolve(__dirname, PACKAGE_BASE_DIR);
const packageDir = path.resolve(packagesDir, env.target);

const resolve = (filePath: string) => path.resolve(packageDir, filePath);

const packageJson = require(resolve(`package.json`));
// const name = path.basename(packageDir);

const banner = `/**
* ${packageJson.name} v${packageJson.version}
* (c) 2024-present Anatolii Litvinov
* @license MIT
**/`;

type PackageFormat = "cjs" | "es";
type PackageOutputOptions = OutputOptions;

const outputConfigs: Record<PackageFormat, PackageOutputOptions> = {
  cjs: {
    file: resolve(`${BUILD_DIR}/index.cjs`),
    format: "cjs",
  },
  es: {
    file: resolve(`${BUILD_DIR}/index.mjs`),
    format: "es",
  },
};

const createConfig = (
  format: PackageFormat,
  output: PackageOutputOptions,
  plugins = [] as Plugin[],
): RollupOptions => {
  if (!output) {
    console.log(`Invalid format: ${format}.`);
    process.exit(1);
  }

  const isCJSBuild = format === "cjs";
  const isHaveDevDependencies = Object.keys(
    packageJson.devDependencies || {},
  ).length;

  output.banner = banner;

  if (isCJSBuild) {
    output.esModule = true;
  }

  output.sourcemap = !!env.sourcemap;
  output.externalLiveBindings = false;
  output.reexportProtoFromExternal = false;
  output.inlineDynamicImports = true;

  const resolveNodePlugins = () => {
    if (format === "cjs" && isHaveDevDependencies) {
      return [
        commonJS({
          sourceMap: false,
        }),
        nodeResolve(),
      ];
    }

    return [];
  };

  return {
    input: resolve("src/index.ts"),
    external: [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {}),
    ],
    plugins: [
      json({
        namedExports: false,
      }),
      alias(),
      esbuild({
        tsconfig: path.resolve(__dirname, "tsconfig.json"),
        sourceMap: output.sourcemap,
        minify: false,
        target: isCJSBuild ? "es2019" : "es2016",
      }),
      ...resolveNodePlugins(),
      ...plugins,
    ],
    output,
    onwarn: (msg, warn) => {
      if (msg.code !== "CIRCULAR_DEPENDENCY") {
        warn(msg);
      }
    },
    treeshake: {
      moduleSideEffects: false,
    },
  };
};

const configs: RollupOptions[] = [];

DEFAULT_FORMATS.forEach((format) => {
  configs.push(createConfig(format, outputConfigs[format]));
});

configs.push({
  input: resolve("src/index.ts"),
  external: [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
    "@typescript-eslint/utils/ts-eslint",
  ],
  output: {
    file: resolve(`${BUILD_DIR}/index.d.ts`),
    format: "es",
    banner,
  },
  plugins: [dts()],
});

export default configs;
