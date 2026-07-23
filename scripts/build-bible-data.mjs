// One-time build script (T2): downloads the WEB and KJV public-domain source
// texts and compiles them into compact local JSON lookup tables
// (data/web.json, data/kjv.json). Run with `node scripts/build-bible-data.mjs`.
//
// Sources are the same public-domain texts bible-api.com itself uses:
// https://github.com/seven1m/open-bibles (eng-web.usfx.xml, eng-kjv.osis.xml)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, '..', 'data', 'raw');
const OUT_DIR = path.join(__dirname, '..', 'data');

const SOURCES = {
  web: {
    url: 'https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-web.usfx.xml',
    file: path.join(RAW_DIR, 'eng-web.usfx.xml'),
  },
  kjv: {
    url: 'https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-kjv.osis.xml',
    file: path.join(RAW_DIR, 'eng-kjv.osis.xml'),
  },
};

// Canonical 66-book Protestant order, shared with the runtime lookup module
// (verses.ts) so the book list is defined exactly once.
const BOOKS = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'books.json'), 'utf-8'));

const SEP = String.fromCharCode(1);

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function ensureDownloaded(name) {
  const src = SOURCES[name];
  if (fs.existsSync(src.file)) return;
  fs.mkdirSync(RAW_DIR, { recursive: true });
  console.error(`Downloading ${name} source from ${src.url} ...`);
  const res = await fetch(src.url);
  if (!res.ok) throw new Error(`Failed to download ${name}: ${res.status} ${res.statusText}`);
  const text = await res.text();
  fs.writeFileSync(src.file, text, 'utf-8');
}

// WEB uses USFX markup: <c id="N"/> marks a chapter, <v id="N"/> starts a
// verse, <ve/> ends it. Footnotes (<f>) and cross-references (<x>) are
// stripped entirely — they aren't part of the readable verse text.
function parseWEB(xml) {
  xml = xml.replace(/<f\b[^>]*>[\s\S]*?<\/f>/g, '').replace(/<x\b[^>]*>[\s\S]*?<\/x>/g, '');

  const result = {};
  for (const [name, usfxId] of BOOKS) {
    const bookMatch = xml.match(new RegExp('<book id="' + usfxId + '">([\\s\\S]*?)<\\/book>'));
    if (!bookMatch) continue;
    let body = bookMatch[1];
    body = body
      .replace(/<c id="(\d+)"\/>/g, SEP + 'C$1' + SEP)
      .replace(/<v id="([^"]+)"\/>/g, SEP + 'V$1' + SEP)
      .replace(/<ve\/>/g, SEP + 'E' + SEP)
      .replace(/<[^>]+>/g, ' ');
    body = decodeEntities(body);

    const parts = body.split(SEP);
    const book = {};
    let chapter = null, verse = null, buf = [];
    const flush = () => {
      if (chapter != null && verse != null) {
        const text = buf.join(' ').replace(/\s+/g, ' ').trim();
        if (text) {
          book[chapter] = book[chapter] || {};
          book[chapter][verse] = text;
        }
      }
      buf = [];
    };
    for (const part of parts) {
      let m;
      if ((m = /^C(\d+)$/.exec(part))) { flush(); chapter = m[1]; verse = null; }
      else if ((m = /^V(\S+)$/.exec(part))) { flush(); verse = m[1]; }
      else if (part === 'E') { flush(); verse = null; }
      else { buf.push(part); }
    }
    flush();
    result[name] = book;
  }
  return result;
}

// KJV uses OSIS milestone markup: <verse osisID="Book.C.V" sID="X" .../> opens
// a verse, <verse eID="X"/> closes it. Book/chapter/verse come straight from
// osisID, so no separate chapter tracking is needed.
function parseKJV(xml) {
  const result = {};
  const re = /<verse osisID="([^".]+)\.(\d+)\.(\d+)" sID="([^"]+)"[^>]*\/>([\s\S]*?)<verse eID="\4"\s*\/>/g;
  let m;
  const osisToName = new Map(BOOKS.map((b) => [b[2], b[0]]));
  while ((m = re.exec(xml))) {
    const osisBook = m[1], chapter = m[2], verse = m[3], rawText = m[5];
    const name = osisToName.get(osisBook);
    if (!name) continue;
    let text = rawText.replace(/<[^>]+>/g, ' ');
    text = decodeEntities(text).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    result[name] = result[name] || {};
    result[name][chapter] = result[name][chapter] || {};
    result[name][chapter][verse] = text;
  }
  return result;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await ensureDownloaded('web');
  await ensureDownloaded('kjv');

  const web = parseWEB(fs.readFileSync(SOURCES.web.file, 'utf-8'));
  const kjv = parseKJV(fs.readFileSync(SOURCES.kjv.file, 'utf-8'));

  fs.writeFileSync(path.join(OUT_DIR, 'web.json'), JSON.stringify(web));
  fs.writeFileSync(path.join(OUT_DIR, 'kjv.json'), JSON.stringify(kjv));

  const countVerses = (bible) => {
    let n = 0;
    for (const b of Object.values(bible)) for (const c of Object.values(b)) n += Object.keys(c).length;
    return n;
  };

  console.log(`WEB: ${Object.keys(web).length}/66 books, ${countVerses(web)} verses -> data/web.json`);
  console.log(`KJV: ${Object.keys(kjv).length}/66 books, ${countVerses(kjv)} verses -> data/kjv.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
