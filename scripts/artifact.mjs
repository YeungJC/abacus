// Turns dist/index.html into dist/artifact.html: the page content without its own
// doctype/html/head/body wrapper, which the artifact host adds at publish time.
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const keep = head
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .trim();
// <title> first so the host finds it in the first 8KB
const title = keep.match(/<title>[\s\S]*?<\/title>/)[0];
const rest = keep.replace(title, "");
writeFileSync("dist/artifact.html", `${title}\n${rest}\n${body.trim()}\n`);
console.log(`dist/artifact.html ${(Buffer.byteLength(readFileSync("dist/artifact.html")) / 1024).toFixed(0)} KB`);
