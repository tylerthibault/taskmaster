const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['main.js'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  format: 'cjs',
  outfile: 'main.js',
  external: ['obsidian'],
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  logLevel: 'info',
};

if (isWatch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log('Watching for changes...');
  });
} else {
  esbuild.build(buildOptions).then(() => {
    console.log('Build completed successfully!');
  }).catch(() => process.exit(1));
}
