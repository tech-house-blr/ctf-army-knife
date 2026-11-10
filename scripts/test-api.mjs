// npm run test:api [-- pytest args]: the API test suite in the local virtualenv.
// Tool tests skip when a tool (binwalk, zsteg, ...) isn't installed locally; CI
// also runs the suite inside the API Docker image, where every tool is present.
import { apiDir, hasVenv, run, venv } from "./dev-lib.mjs";

if (!hasVenv()) {
    console.error("apps/api/.venv is missing. Run `npm run setup` first.");
    process.exit(1);
}
run(venv("python"), ["-m", "pytest", "-q", ...process.argv.slice(2)], { cwd: apiDir });
