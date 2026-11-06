// Action-trigger engine.
// An alert evaluates its condition on every incoming value, but only *fires* its action on a
// rising edge (not-triggered -> triggered) or again after the cooldown while it stays triggered.
// Without this, a sensor sitting above the threshold would send an SMS every second.
// Delivery (webhook / mock SMS / email) is handed to notifier.js through the `notify` hook, so a
// slow endpoint can never stall the rule engine.
const { COMPARE } = require('./operators');
const stats = require('./statsTracker');

const MAX_HISTORY = 100;
const history = [];
let seq = 0;

// default hook: lazy require keeps unit tests free of the notifier unless they ask for it
const defaultNotify = (record) => require('./notifier').getNotifier().enqueue(record);

/**
 * Build a stateful evaluator for one alert node.
 * @param node  normalised alert node ({ id, data })
 * @param emit  (event) => void   broadcast hook (WebSocket)
 * @param now   injectable clock for tests
 * @param notify (record) => void  delivery hook (default: notifier queue)
 * @returns (value:number) => { value, triggered, fired }
 */
function createAlertEvaluator(node, emit, now = Date.now, notify = defaultNotify) {
  const { operator, threshold, actionType, target, cooldownSec, label } = node.data;
  let wasTriggered = false;
  let lastFiredAt = -Infinity;

  return (value) => {
    const triggered = COMPARE[operator](value, threshold);
    let fired = false;

    if (triggered && (!wasTriggered || now() - lastFiredAt >= cooldownSec * 1000)) {
      fired = true;
      lastFiredAt = now();
      const record = {
        type: 'alert',
        id: `al_${now().toString(36)}_${++seq}`,
        nodeId: node.id,
        label: label || 'Alert',
        value,
        operator,
        threshold,
        actionType,
        target,
        timestamp: new Date(now()).toISOString(),
      };
      history.unshift(record);
      if (history.length > MAX_HISTORY) history.pop();
      stats.inc('alertsFired');
      try { notify(record); } catch (err) { console.error('[alert] notify failed:', err.message); }
      emit(record);
    }
    wasTriggered = triggered;
    return { value, triggered, fired };
  };
}

const getAlertHistory = () => history.slice();
const clearAlertHistory = () => { history.length = 0; };

module.exports = { createAlertEvaluator, getAlertHistory, clearAlertHistory };
