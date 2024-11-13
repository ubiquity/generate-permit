import esbuild from "esbuild";
import { esBuildContext } from "./esbuild-build";

async function watch() {
  const ctx = await esbuild.context(esBuildContext);
  await ctx.watch();
  console.log("Watching...");
}

// This MUST NOT be awaited.
void watch();