// Pure RxJS operator factories. Each takes a *normalised* node.data and returns an operator
// (Observable<number> -> Observable<number>). No I/O in here, so they are trivial to unit-test.
const { defer } = require('rxjs');
const { map, filter, pairwise } = require('rxjs/operators');

const r6 = (v) => Math.round(v * 1e6) / 1e6; // kill float noise (0.1+0.2)

const COMPARE = {
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '==': (a, b) => Math.abs(a - b) < 1e-9,
  '!=': (a, b) => Math.abs(a - b) >= 1e-9,
};

// Sliding window; emits from the first sample (warm-up uses the samples available so far).
// State lives inside defer() so every subscription gets its own fresh window.
const windowed = (size, reduce) => (source) =>
  defer(() => {
    const win = [];
    return source.pipe(
      map((v) => {
        win.push(v);
        if (win.length > size) win.shift();
        return reduce(win);
      })
    );
  });

function mathOperator({ operation, windowSize, operand, min, max, decimals }) {
  switch (operation) {
    case 'movingAverage':
      return windowed(windowSize, (w) => r6(w.reduce((a, b) => a + b, 0) / w.length));
    case 'rollingMin':
      return windowed(windowSize, (w) => Math.min(...w));
    case 'rollingMax':
      return windowed(windowSize, (w) => Math.max(...w));
    case 'add':
      return map((v) => r6(v + operand));
    case 'subtract':
      return map((v) => r6(v - operand));
    case 'multiply':
      return map((v) => r6(v * operand));
    case 'divide':
      return map((v) => r6(v / operand));
    case 'abs':
      return map((v) => Math.abs(v));
    case 'round':
      return map((v) => Number(v.toFixed(decimals)));
    case 'clamp':
      return map((v) => Math.min(max, Math.max(min, v)));
    case 'rateOfChange':
      return (source) => source.pipe(pairwise(), map(([a, b]) => r6(b - a)));
    default:
      throw new Error(`Unsupported math operation "${operation}"`);
  }
}

const filterOperator = ({ operator, threshold }) => filter((v) => COMPARE[operator](v, threshold));

module.exports = { mathOperator, filterOperator, COMPARE };
