import { execSync } from 'node:child_process';
import { $, argv } from 'zx';
import { consola } from 'consola';
import { rawCommitsToMarkdown } from './shared/commits.mjs';
import { addToChangelog } from './shared/changelog.mjs';

$.verbose = false;

if (process.platform === 'win32') {
  $.shell = 'powershell.exe';
  $.prefix = '';
}

const isDryRun = argv['dry-run'] ?? false;

const now = new Date();
const currentShortSha = (await $`git rev-parse --short HEAD`).stdout.trim();

const calver = now.toISOString().slice(0, 10).replace(/-/g, '.');
const version = `${calver}-${currentShortSha}`;

const fromCommit = argv.from;
let lastTag = '';

if (fromCommit) {
  lastTag = String(fromCommit).trim();
  consola.info(`Using base commit/tag specified via --from: ${lastTag}`);
} else {
  try {
    lastTag = (await $`git describe --tags --abbrev=0`).stdout.trim();
  } catch (error) {
    // If no tags are found, get the first commit hash of the repository
    const firstCommit = (await $`git rev-list --max-parents=0 HEAD`).stdout.trim();
    lastTag = firstCommit;
    consola.info(`No tag found. Using initial commit as base: ${lastTag}`);
  }
}

const range = `${lastTag}..HEAD`;
const rawCommits = execSync(`git log --pretty=oneline ${range}`, { encoding: 'utf-8' });

const markdown = rawCommitsToMarkdown({ rawCommits });

consola.info(`Changelog: \n\n${markdown}\n\n`);

if (isDryRun) {
  consola.info(`[dry-run] Not creating version nor tag`);
  consola.info('Aborting');
  process.exit(0);
}

const shouldContinue = await consola.prompt(
  'This script will create a new version and tag, and update the changelog. Continue?',
  {
    type: 'confirm',
  },
);

if (!shouldContinue) {
  consola.info('Aborting');
  process.exit(0);
}

consola.info('Updating changelog');
await addToChangelog({ changelog: markdown, version });
consola.success('Changelog updated');

try {
  consola.info('Committing changelog changes');
  await $`git add CHANGELOG.md`;
  await $`git commit -m "docs(changelog): update changelog for ${version}"`;
  consola.success('Changelog changes committed');

  consola.info('Creating version and tag');
  await $`npm version ${version} -m "chore(version): release ${version}"`;
  consola.info('Npm version released with tag');
} catch (error) {
  consola.error(error);
  consola.info('Aborting');
  process.exit(1);
}
