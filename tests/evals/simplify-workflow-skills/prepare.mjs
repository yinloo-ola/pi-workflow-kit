import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../../..");
const output = resolve(process.argv[2] ?? resolve(import.meta.dirname, "run"));
const protocolPath = resolve(import.meta.dirname, "protocol.json");

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const protocol = JSON.parse(await readFile(protocolPath, "utf8"));
const baseline = process.env.PWK_EVAL_BASELINE_COMMIT ?? git("rev-parse", "HEAD^");
const candidate = process.env.PWK_EVAL_CANDIDATE_COMMIT ?? git("rev-parse", "HEAD");
const manifest = {
  protocolPath: "protocol.json",
  protocolHash: sha256(JSON.stringify(protocol)),
  repositoryRoot: root,
  preparedAt: new Date().toISOString(),
  commits: { baseline, candidate },
  conditions: protocol.conditions.flatMap(({ revision, size }) =>
    Array.from({ length: protocol.ordinaryTrialsPerCondition }, (_, index) => ({
      trialId: `${revision}-${size}-${index + 1}`,
      revision,
      size,
      fresh: true,
    })),
  ),
  lifecycle: protocol.conditions.map(({ revision, size }) => ({
    trialId: `${revision}-${size}-lifecycle`,
    revision,
    size,
  })),
};
manifest.hash = sha256(JSON.stringify(manifest));
await mkdir(output, { recursive: true });
await writeFile(resolve(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
