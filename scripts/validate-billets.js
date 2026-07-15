// Sanity-checks every billet-*.html before it gets committed/pushed:
//   - exactly 40 questions
//   - category distribution matches the official ETG breakdown (for billets
//     using the 10 official theme names; older/legacy taxonomies are skipped)
//   - no duplicate question text within a billet, or across billets
//
// Usage: node scripts/validate-billets.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ETG_DISTRIBUTION = {
  'Le conducteur': 10,
  'Les autres usagers de la route': 5,
  'Circulation routière': 4,
  'Mécanique et équipements': 4,
  'La route': 4,
  'Notions diverses': 3,
  'Prendre et quitter son véhicule': 3,
  'Sécurité du passager': 3,
  'Environnement': 3,
  'Premiers secours': 1,
};
const ETG_CATEGORIES = new Set(Object.keys(ETG_DISTRIBUTION));
const ETG_TOTAL = Object.values(ETG_DISTRIBUTION).reduce((a, b) => a + b, 0);

function extractQuestions(html, file) {
  const m = html.match(/const QUESTIONS = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error(`${file}: could not find "const QUESTIONS = [...]"`);
  return eval(m[1]);
}

function main() {
  const files = fs.readdirSync(ROOT)
    .filter(f => /^billet-\d+\.html$/.test(f))
    .sort();

  let ok = true;
  const seenGlobally = new Map(); // question text -> file it first appeared in

  for (const file of files) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    let questions;
    try {
      questions = extractQuestions(html, file);
    } catch (e) {
      console.log(`✗ ${file}: ${e.message}`);
      ok = false;
      continue;
    }

    const issues = [];

    if (questions.length !== ETG_TOTAL) {
      issues.push(`expected ${ETG_TOTAL} questions, found ${questions.length}`);
    }

    const usesEtgTaxonomy = questions.every(q => ETG_CATEGORIES.has(q.cat));
    if (usesEtgTaxonomy) {
      const counts = {};
      for (const q of questions) counts[q.cat] = (counts[q.cat] || 0) + 1;
      for (const cat of Object.keys(ETG_DISTRIBUTION)) {
        const expected = ETG_DISTRIBUTION[cat];
        const actual = counts[cat] || 0;
        if (actual !== expected) {
          issues.push(`category "${cat}": expected ${expected}, found ${actual}`);
        }
      }
    }

    const seenInFile = new Set();
    for (const q of questions) {
      if (seenInFile.has(q.q)) {
        issues.push(`duplicate question within file: "${q.q.slice(0, 60)}..."`);
      }
      seenInFile.add(q.q);

      if (seenGlobally.has(q.q)) {
        issues.push(`question also appears in ${seenGlobally.get(q.q)}: "${q.q.slice(0, 60)}..."`);
      } else {
        seenGlobally.set(q.q, file);
      }
    }

    if (issues.length === 0) {
      console.log(`✓ ${file}: ${questions.length} questions, OK`);
    } else {
      ok = false;
      console.log(`✗ ${file}:`);
      for (const issue of issues) console.log(`    - ${issue}`);
    }
  }

  process.exit(ok ? 0 : 1);
}

main();
