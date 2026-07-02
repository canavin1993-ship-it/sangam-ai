// Runs automatically via npm "prebuild". Emits public/version.json so the
// deployed build is identifiable with: curl https://<site>/version.json
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const sh = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();
writeFileSync(
  "public/version.json",
  JSON.stringify(
    {
      git_commit: sh("git rev-parse --short HEAD"),
      version: sh("git describe --tags --always"),
      build_time: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("public/version.json written");
