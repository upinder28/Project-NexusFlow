import { useState } from 'react';

const TABS = [
  ['json', 'Graph JSON'],
  ['issues', 'Issues'],
  ['alerts', 'Alerts'],
  ['ingest', 'Ingestion'],
];

export default function InspectorPanel({ proof, issues, backend, alerts, onClearAlerts, stats, onFocusNode, onCopy, onDownload, tab, setTab }) {
  const [open, setOpen] = useState(true);
  const errs = issues.errors.length + (backend?.errors?.length ?? 0);

  return (
    <aside className={`nf-panel ${open ? '' : 'is-collapsed'}`}>
      <div className="nf-panel__tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => { setTab(id); setOpen(true); }}>
            {label}
            {id === 'issues' && errs > 0 && <b className="nf-badge nf-badge--bad">{errs}</b>}
            {id === 'alerts' && alerts.length > 0 && <b className="nf-badge">{alerts.length}</b>}
          </button>
        ))}
        <button className="nf-panel__toggle" onClick={() => setOpen(!open)} aria-label="Toggle panel">{open ? '»' : '«'}</button>
      </div>

      {open && tab === 'json' && (
        <div className="nf-panel__body">
          <ul className="nf-checks">
            {proof.checks.map((c) => (
              <li key={c.name} className={c.pass ? 'pass' : 'fail'}>
                <span>{c.pass ? '✔' : '✖'}</span>
                <div>{c.name}{c.detail && <small>{c.detail}</small>}</div>
              </li>
            ))}
          </ul>
          <div className="nf-row">
            <button className="nf-btn" onClick={onCopy}>Copy JSON</button>
            <button className="nf-btn" onClick={onDownload}>Download</button>
          </div>
          <pre className="nf-code">{JSON.stringify(proof.graph, null, 2)}</pre>
        </div>
      )}

      {open && tab === 'issues' && (
        <div className="nf-panel__body">
          {errs === 0 && issues.warnings.length === 0 && <p className="nf-empty">No issues. The graph is valid ✔</p>}
          {backend && !backend.valid && <p className="nf-sub">Backend rejected the graph:</p>}
          {[...(backend?.errors ?? []), ...issues.errors].filter((e, i, a) => a.findIndex((x) => x.message === e.message) === i).map((e, i) => (
            <button key={`e${i}`} className="nf-issue nf-issue--error" onClick={() => onFocusNode(e.nodeId ?? e.nodeIds?.[0])}>✖ {e.message}</button>
          ))}
          {issues.warnings.map((w, i) => (
            <button key={`w${i}`} className="nf-issue nf-issue--warn" onClick={() => onFocusNode(w.nodeId)}>⚠ {w.message}</button>
          ))}
          {backend?.valid && <p className="nf-ok">✔ Backend accepted the graph (execution order: {backend.order?.join(' → ')})</p>}
        </div>
      )}

      {open && tab === 'alerts' && (
        <div className="nf-panel__body">
          <div className="nf-row"><button className="nf-btn" onClick={onClearAlerts} disabled={!alerts.length}>Clear</button></div>
          {alerts.length === 0 && <p className="nf-empty">No alerts fired yet. Deploy a graph and wait for a value to cross a threshold.</p>}
          {alerts.map((a, i) => (
            <div key={i} className="nf-alert">
              <strong>{a.label}</strong>
              <span>{a.actionType.toUpperCase()}{a.target ? ` → ${a.target}` : ''} · value {a.value} {a.operator} {a.threshold}</span>
              <small>{new Date(a.timestamp).toLocaleTimeString()} · delivery {a.delivery}</small>
            </div>
          ))}
        </div>
      )}

      {open && tab === 'ingest' && (
        <div className="nf-panel__body">
          {!stats ? <p className="nf-empty">Waiting for the backend…</p> : (
            <dl className="nf-stats">
              <div><dt>Accepted / sec</dt><dd>{stats.ingestPerSec.toLocaleString()}</dd></div>
              <div><dt>Stored / sec</dt><dd>{stats.persistPerSec.toLocaleString()}</dd></div>
              <div><dt>Peak stored / sec</dt><dd>{stats.peakPersistPerSec.toLocaleString()}</dd></div>
              <div><dt>Total stored</dt><dd>{stats.persisted.toLocaleString()}</dd></div>
              <div><dt>Buffered now</dt><dd>{stats.buffered.toLocaleString()}</dd></div>
              <div><dt>Rejected / dropped</dt><dd>{stats.rejected} / {stats.dropped}</dd></div>
              <div><dt>Last / max flush</dt><dd>{stats.lastFlushMs} / {stats.maxFlushMs} ms</dd></div>
              <div><dt>Batch size / interval</dt><dd>{stats.config.batchSize} / {stats.config.flushMs} ms</dd></div>
            </dl>
          )}
          <p className="nf-hint">Run <code>npm run benchmark</code> in /backend to drive 5,000 writes/sec and watch this tab.</p>
        </div>
      )}
    </aside>
  );
}

