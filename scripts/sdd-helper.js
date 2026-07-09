import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = execSync('git rev-parse --show-toplevel').toString().trim();
const sddDir = path.join(root, '.superpowers', 'sdd');

// Ensure sdd workspace exists
fs.mkdirSync(sddDir, { recursive: true });
fs.writeFileSync(path.join(sddDir, '.gitignore'), '*\n');

const action = process.argv[2];

if (action === 'workspace') {
  console.log(sddDir);
} else if (action === 'brief') {
  const planFile = process.argv[3];
  const n = process.argv[4];
  
  if (!planFile || !n) {
    console.error('Usage: node scripts/sdd-helper.js brief PLAN_FILE TASK_NUMBER');
    process.exit(1);
  }

  const content = fs.readFileSync(planFile, 'utf8');
  const lines = content.split(/\r?\n/);
  let inTask = false;
  let infence = false;
  const taskLines = [];
  
  for (const line of lines) {
    if (line.startsWith('```')) {
      infence = !infence;
    }
    if (!infence && /^#+[ \t]+Task[ \t]+[0-9]+/.test(line)) {
      const match = line.match(/^#+[ \t]+Task[ \t]+([0-9]+)/);
      if (match && match[1] === n) {
        inTask = true;
      } else {
        inTask = false;
      }
    }
    if (inTask) {
      taskLines.push(line);
    }
  }
  
  if (taskLines.length === 0) {
    console.error(`Task ${n} not found`);
    process.exit(1);
  }
  
  const outFile = path.join(sddDir, `task-${n}-brief.md`);
  fs.writeFileSync(outFile, taskLines.join('\n'));
  console.log(outFile);
} else if (action === 'review') {
  const base = process.argv[3];
  const head = process.argv[4];
  
  if (!base || !head) {
    console.error('Usage: node scripts/sdd-helper.js review BASE HEAD');
    process.exit(1);
  }

  const baseShort = execSync(`git rev-parse --short ${base}`).toString().trim();
  const headShort = execSync(`git rev-parse --short ${head}`).toString().trim();
  const outFile = path.join(sddDir, `review-${baseShort}..${headShort}.diff`);
  
  const commits = execSync(`git log --oneline ${base}..${head}`).toString();
  const stat = execSync(`git diff --stat ${base}..${head}`).toString();
  const diff = execSync(`git diff -U10 ${base}..${head}`).toString();
  
  const packageContent = `# Review package: ${base}..${head}\n\n` +
    `## Commits\n${commits}\n` +
    `## Files changed\n${stat}\n` +
    `## Diff\n${diff}\n`;
    
  fs.writeFileSync(outFile, packageContent);
  console.log(outFile);
} else {
  console.error('Invalid action. Use workspace, brief, or review.');
  process.exit(1);
}
