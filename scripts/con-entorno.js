#!/usr/bin/env node
/*
    Author: German Valencia
    Ejecuta un comando con variables de entorno extra, también en Windows (donde «VAR=1 comando» no funciona).
    Uso: node scripts/con-entorno.js VAR=valor [OTRA=valor] comando args…
    Sin dependencias: lo usa «npm run android:dev».
*/
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const extra = {};
while (args.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0])) {
    const par = args.shift();
    const i = par.indexOf('=');
    extra[par.slice(0, i)] = par.slice(i + 1);
}

if (!args.length) {
    console.error('Uso: node scripts/con-entorno.js VAR=valor comando args…');
    process.exit(1);
}

// shell: true para que en Windows se resuelvan npx.cmd, npm.cmd, etc.
const hijo = spawn(args[0], args.slice(1), {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...extra }
});
hijo.on('exit', (codigo, senal) => process.exit(senal ? 1 : codigo ?? 1));
hijo.on('error', (e) => {
    console.error(e.message);
    process.exit(1);
});
