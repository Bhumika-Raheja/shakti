// Writes PRIVACY.md and TERMS.md (in the main repo folder) from legal.json,
// so the app and the files on GitHub always say the same thing.
// Run with:  node tools/export-legal.js
const fs = require("fs");
const path = require("path");
const legal = require("../src/constants/legal.json");

const fill = (t) => t.replaceAll("{{contact}}", legal.contact).replaceAll("{{updated}}", legal.updated);

function toMarkdown(doc) {
    const lines = [`# ${doc.title}`, "", fill(doc.intro), ""];
    doc.sections.forEach((s) => {
        lines.push(`## ${s.heading}`, "");
        (s.paragraphs || []).forEach((p) => lines.push(fill(p), ""));
        (s.bullets || []).forEach((b) => lines.push(`- ${fill(b)}`));
        if (s.bullets) lines.push("");
    });
    return lines.join("\n");
}

const root = path.join(__dirname, "..", "..");
fs.writeFileSync(path.join(root, "PRIVACY.md"), toMarkdown(legal.privacy));
fs.writeFileSync(path.join(root, "TERMS.md"), toMarkdown(legal.terms));
console.log("Done: PRIVACY.md and TERMS.md written in the main repo folder");