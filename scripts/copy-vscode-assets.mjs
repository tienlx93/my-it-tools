// scripts/copy-vscode-assets.mjs
// Copies dist-ext/* → dist-vscode/webview/ and vscode.package.json → dist-vscode/package.json
import fs from 'node:fs';
import path from 'node:path';

const distExt = path.resolve('dist-ext');
const distVscode = path.resolve('dist-vscode');
const webviewDir = path.join(distVscode, 'webview');
const manifestSrc = path.resolve('vscode.package.json');
const manifestDest = path.join(distVscode, 'package.json');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    }
    else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

fs.mkdirSync(webviewDir, { recursive: true });
copyDir(distExt, webviewDir);
console.log('✓ dist-ext/* copied to dist-vscode/webview/');

fs.copyFileSync(manifestSrc, manifestDest);
console.log('✓ vscode.package.json copied to dist-vscode/package.json');
