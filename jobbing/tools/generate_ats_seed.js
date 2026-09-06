const fs = require('fs');
const path = require('path');

const CSV_PATH = String.raw`C:\Users\USER\.local\share\opencode\tool-output\tool_03e7476be001i8Ou80jt2fWODL`;
const OUTPUT_PATH = String.raw`C:\Users\USER\Desktop\Automation\Upwork\jobbing\supabase\09_seed_ats_companies.sql`;
const BATCH_SIZE = 50;

const PLATFORM_MAP = {
  greenhouse: 'greenhouse',
  lever: 'lever',
  ashby: 'ashby',
};

function careersUrl(platform, boardSlug) {
  if (platform === 'greenhouse') return `https://boards.greenhouse.io/${boardSlug}`;
  if (platform === 'lever') return `https://jobs.lever.co/${boardSlug}`;
  if (platform === 'ashby') return `https://jobs.ashbyhq.com/${boardSlug}`;
  return null;
}

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

const raw = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = raw.trim().split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

const headerParts = parseCsvLine(header);
const atsVendorIdx = headerParts.indexOf('ats_vendor');
const companyNameIdx = headerParts.indexOf('company_name');
const boardSlugIdx = headerParts.indexOf('board_slug');

const rows = [];
const skipped = [];

for (const line of dataLines) {
  const fields = parseCsvLine(line);
  const vendor = fields[atsVendorIdx].trim().toLowerCase();
  const companyName = fields[companyNameIdx].trim();
  const boardSlug = fields[boardSlugIdx].trim();

  const platform = PLATFORM_MAP[vendor];
  if (!platform) {
    skipped.push({ vendor, companyName });
    continue;
  }

  const url = careersUrl(platform, boardSlug);
  if (!url) {
    skipped.push({ vendor, companyName });
    continue;
  }

  rows.push({
    name: companyName,
    platform,
    board_token: boardSlug,
    careers_url: url,
  });
}

const lines_out = [];

lines_out.push(`-- Seed watched_companies from ATS vendor data`);
lines_out.push(`-- Generated from CSV: ${path.basename(CSV_PATH)}`);
lines_out.push(`-- Total rows: ${rows.length}`);
lines_out.push(`-- Inserts are batched in groups of ${BATCH_SIZE} with ON CONFLICT DO NOTHING`);
lines_out.push(``);

for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE);
  const values = batch.map(r => {
    return `  (gen_random_uuid(), '${escapeSql(r.name)}', '${r.platform}', '${escapeSql(r.board_token)}', '${r.careers_url}', 'us', true, now(), now())`;
  });

  lines_out.push(`INSERT INTO watched_companies (id, name, platform, board_token, careers_url, region, active, created_at, updated_at) VALUES`);
  lines_out.push(values.join(',\n') + ` ON CONFLICT (careers_url) DO NOTHING;`);
  lines_out.push(``);
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, lines_out.join('\n'), 'utf-8');

console.log(`Generated ${rows.length} rows in ${Math.ceil(rows.length / BATCH_SIZE)} INSERT statements`);
console.log(`Output: ${OUTPUT_PATH}`);
if (skipped.length > 0) {
  console.log(`Skipped ${skipped.length} rows with unknown vendors:`);
  const vendorCounts = {};
  skipped.forEach(s => { vendorCounts[s.vendor] = (vendorCounts[s.vendor] || 0) + 1; });
  console.log(vendorCounts);
}
