// Runs automatically via npm "prebuild". Emits public/version.json so the
// deployed build is identifiable with: curl https://<site>/version.json
// Build environments without .git (e.g. Vercel) fall back to CI env vars.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};
const env = process.env;
const commit = sh("git rev-parse --short HEAD") || (env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "unknown";
const branch = sh("git rev-parse --abbrev-ref HEAD") || env.VERCEL_GIT_COMMIT_REF || "unknown";
const version = sh("git describe --tags --always") || commit;

writeFileSync(
  "public/version.json",
  JSON.stringify({ git_commit: commit, version, branch, build_time: new Date().toISOString() }, null, 2),
);
console.log(`public/version.json written (${commit})`);
