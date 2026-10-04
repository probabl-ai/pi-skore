#!/usr/bin/env node
// Fails if the bundle is not installable: every declared dependency must be
// present under node_modules and every `pi` manifest entry must resolve.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const errors = [];

const dependencies = Object.keys(manifest.dependencies ?? {});
if (dependencies.length === 0) {
	errors.push("package.json declares no dependencies");
}

const bundled = new Set(manifest.bundleDependencies ?? manifest.bundledDependencies ?? []);
for (const name of dependencies) {
	if (!bundled.has(name)) {
		errors.push(`dependency "${name}" is not in bundleDependencies`);
	}
	if (!existsSync(join(root, "node_modules", name, "package.json"))) {
		errors.push(`dependency "${name}" is missing from node_modules (run: npm install)`);
	}
}
for (const name of bundled) {
	if (!dependencies.includes(name)) {
		errors.push(`bundled dependency "${name}" is not declared in dependencies`);
	}
}

for (const entry of manifest.pi?.extensions ?? []) {
	const target = resolve(root, entry);
	if (!existsSync(target)) {
		errors.push(`pi.extensions entry does not resolve: ${entry} -> ${target}`);
	}
}

if (errors.length > 0) {
	console.error("verify-bundle: FAILED");
	for (const error of errors) console.error(`  - ${error}`);
	process.exit(1);
}

console.log(
	`verify-bundle: OK (${dependencies.length} bundled dependencies, ${manifest.pi.extensions.length} extensions)`,
);
for (const entry of manifest.pi.extensions) {
	console.log(`  - ${entry}`);
}