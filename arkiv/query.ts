#!/usr/bin/env node

import { readFileSync } from "node:fs";

const env = { ...process.env };
const outputPath = env.ARKIV_QUERY_PATH ?? "./arkiv/output.json";
const raw = readFileSync(outputPath, "utf8");
const data = JSON.parse(raw) as { entities?: Array<Record<string, unknown>> };

console.log(JSON.stringify({ count: data.entities?.length ?? 0, entities: data.entities ?? [] }, null, 2));
