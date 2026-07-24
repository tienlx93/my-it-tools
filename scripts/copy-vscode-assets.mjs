// scripts/copy-vscode-assets.mjs
// Copies dist-ext/* → dist-vscode/webview/ and vscode.package.json → dist-vscode/package.json
import fs from 'node:fs';
import path from 'node:path';

const distExt = path.resolve('dist-ext');
const distVscode = path.resolve('dist-vscode');
const webviewDir = path.join(distVscode, 'webview');
const manifestSrc = path.resolve('vscode.package.json');
const manifestDest = path.join(distVscode, 'package.json');

fs.mkdirSync(webviewDir, { recursive: true });
fs.cpSync(distExt, webviewDir, { recursive: true });
console.log('✓ dist-ext/* copied to dist-vscode/webview/');

fs.copyFileSync(manifestSrc, manifestDest);
console.log('✓ vscode.package.json copied to dist-vscode/package.json');
