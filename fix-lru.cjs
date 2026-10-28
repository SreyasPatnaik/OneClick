const fs = require('fs');
const path = require('path');

const dirs = [
  path.resolve(__dirname, 'node_modules/lru-cache'),
  path.resolve(__dirname, 'apps/desktop/node_modules/lru-cache'),
];

const wrapperContent = `const { LRUCache } = require("./dist/commonjs/index.js");
module.exports = LRUCache;
module.exports.LRUCache = LRUCache;
module.exports.default = LRUCache;
`;

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.writeFileSync(path.join(dir, 'wrapper.cjs'), wrapperContent, 'utf8');
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.main = './wrapper.cjs';
      pkg.exports = {
        '.': {
          require: './wrapper.cjs',
          import: './dist/esm/index.js',
        },
      };
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
      console.log('Fixed', pkgPath);
    }
  }
});

// Also patch @babel/helper-compilation-targets in apps/desktop and root
const babelDirs = [
  path.resolve(__dirname, 'node_modules/@babel/helper-compilation-targets/lib/index.js'),
  path.resolve(__dirname, 'apps/desktop/node_modules/@babel/helper-compilation-targets/lib/index.js'),
];

babelDirs.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
      'var _lruCache = require("lru-cache");',
      'var _lruCache = require("lru-cache"); if (_lruCache.LRUCache) _lruCache = _lruCache.LRUCache;'
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched babel helper targets at', filePath);
  }
});

console.log('Verifying require("lru-cache"):');
const LRU = require('lru-cache');
const testCache = new LRU({ max: 64 });
console.log('Cache instantiated successfully! max =', testCache.max);
