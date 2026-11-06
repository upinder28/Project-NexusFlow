// Tiny file persistence for graphs, so work and the running pipeline survive a server restart.
//   data/graph.json            the graph the user last saved from the canvas
//   data/active-pipeline.json  the graph that is currently deployed (re-deployed on boot)
// Writes are atomic (temp file + rename) so a crash can never leave half a JSON file behind.
const fs = require('fs');
const path = require('path');

const DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

function file(name) { return path.join(DIR, name); }

function write(name, obj) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = file(`${name}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file(name));
}

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    console.error(`[graphStore] could not read ${name}: ${err.message}`);
    return null;
  }
}

function remove(name) {
  try { fs.unlinkSync(file(name)); } catch (err) { if (err.code !== 'ENOENT') throw err; }
}

module.exports = {
  saveGraph: (graph) => write('graph.json', { savedAt: new Date().toISOString(), graph }),
  loadGraph: () => read('graph.json'),
  saveActive: (graph) => write('active-pipeline.json', { deployedAt: new Date().toISOString(), graph }),
  loadActive: () => read('active-pipeline.json'),
  clearActive: () => remove('active-pipeline.json'),
  DIR,
};
