import pageLoad from './page-load.mjs';
import queryCode from './query-code.mjs';
import queryName from './query-name.mjs';
import rangeCustom from './range-custom.mjs';
import emptyState from './empty-state.mjs';
import invalid from './invalid.mjs';
import mobile from './mobile.mjs';
import detail from './detail.mjs';
import memory from './memory.mjs';
import bugfix000950 from './bugfix-000950.mjs';

const tests = [
  ['page-load', pageLoad],
  ['query-code', queryCode],
  ['query-name', queryName],
  ['range-custom', rangeCustom],
  ['empty-state', emptyState],
  ['invalid', invalid],
  ['mobile', mobile],
  ['detail', detail],
  ['memory', memory],
  ['bugfix-000950', bugfix000950],
];

let failures = 0;
for (const [name, fn] of tests) {
  const ok = await fn();
  if (!ok) failures += 1;
}
console.log(`\n${tests.length - failures}/${tests.length} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
