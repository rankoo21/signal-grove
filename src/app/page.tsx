"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getAdapter,
  type BuildProofResult,
  type BuildProofSummary,
  type SubmissionUpdate,
} from "@/lib/genlayer";

const EMPTY_SUMMARY: BuildProofSummary = { total: 0, pass: 0, partial: 0, fail: 0 };
const PHASES = ["Awaiting signature", "Submitted", "Evaluating", "Accepted", "Persisted"];

function shortAddress(value: string | null) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "Not connected";
}

function formatTime(value: number) {
  return value ? new Date(value).toLocaleString() : "Unknown time";
}

export default function Page() {
  const adapter = useMemo(() => getAdapter(), []);
  const [requestId, setRequestId] = useState("");
  const [requirements, setRequirements] = useState([""]);
  const [evidence, setEvidence] = useState("");
  const [context, setContext] = useState("");
  const [wallet, setWallet] = useState<string | null>(adapter.getWalletAddress());
  const [update, setUpdate] = useState<SubmissionUpdate | null>(null);
  const [result, setResult] = useState<BuildProofResult | null>(null);
  const [recent, setRecent] = useState<BuildProofResult[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function refresh() {
    try {
      const [nextSummary, nextRecent] = await Promise.all([
        adapter.getSummary(),
        adapter.getResults(0, 6),
      ]);
      setSummary(nextSummary);
      setRecent(nextRecent);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Contract state could not be loaded.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function onPhase(next: SubmissionUpdate) {
    setUpdate(next);
    setNotice(next.message ?? "");
  }

  async function connect() {
    setNotice("");
    try {
      setWallet(await adapter.connectWallet());
      setNotice(adapter.mode === "mock" ? "Local preview identity connected." : "Wallet connected.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }

  async function recover() {
    setBusy(true);
    setNotice("");
    try {
      const outcome = await adapter.recover(onPhase);
      if (!outcome) setNotice("No pending BuildProof transaction was found.");
      else {
        setResult(outcome.result);
        setWallet(adapter.getWalletAddress());
        await refresh();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Recovery failed.");
    } finally {
      setBusy(false);
    }
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!requestId.trim()) next.requestId = "Enter a request ID.";
    else if (requestId.trim().length > 96) next.requestId = "Use 96 characters or fewer.";
    const cleanRequirements = requirements.map((item) => item.trim()).filter(Boolean);
    if (!cleanRequirements.length) next.requirements = "Add at least one requirement.";
    if (cleanRequirements.length > 12) next.requirements = "Use no more than 12 requirements.";
    if (!evidence.trim()) next.evidence = "Paste implementation evidence.";
    else if (evidence.trim().length > 20000) next.evidence = "Use 20,000 characters or fewer.";
    setErrors(next);
    const firstInvalid = next.requestId
      ? "request-id"
      : next.requirements
        ? "requirement-0"
        : next.evidence
          ? "evidence"
          : null;
    if (firstInvalid) {
      window.requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
    }
    return { valid: Object.keys(next).length === 0, cleanRequirements };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const checked = validate();
    if (!checked.valid) return;
    setBusy(true);
    setResult(null);
    setNotice("");
    try {
      const outcome = await adapter.submit({
        requestId: requestId.trim(),
        requirements: checked.cleanRequirements,
        evidence: evidence.trim(),
        context: context.trim(),
      }, onPhase);
      setResult(outcome.result);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The check failed.");
    } finally {
      setBusy(false);
    }
  }

  function setRequirement(index: number, value: string) {
    setRequirements((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  const activeStep = update ? ["awaiting-signature", "submitted", "validators-evaluating", "accepted", "state-confirmed"].indexOf(update.phase) : -1;

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <main className="app-shell" id="main">
      <header className="topbar">
        <a className="brand" href="#main">BuildProof <span>GenLayer verification</span></a>
        <div className="header-actions">
          <span className="network">Bradbury testnet</span>
          <span className={`mode mode-${adapter.mode}`}>{adapter.mode === "mock" ? "Preview mode" : "Contract mode"}</span>
          <button className="button button-secondary" type="button" onClick={connect}>
            {wallet ? shortAddress(wallet) : adapter.mode === "mock" ? "Connect preview" : "Connect wallet"}
          </button>
        </div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Consensus backed implementation checks</p>
          <h1 id="page-title">Turn requirements and evidence into a persisted verdict.</h1>
          <p className="hero-copy">BuildProof asks independent GenLayer validators to compare explicit acceptance criteria with the implementation evidence you submit. The contract stores one grounded result.</p>
        </div>
        <dl className="summary-grid" aria-label="Result summary">
          <div><dt>Total checks</dt><dd>{summary.total}</dd></div>
          <div><dt>Pass</dt><dd>{summary.pass}</dd></div>
          <div><dt>Partial</dt><dd>{summary.partial}</dd></div>
          <div><dt>Fail</dt><dd>{summary.fail}</dd></div>
        </dl>
      </section>

      <div className="workspace">
        <form className="panel form-panel" onSubmit={submit} noValidate>
          <div className="panel-heading">
            <div><p className="section-index">01</p><h2>Define the check</h2></div>
            <button className="text-button" type="button" onClick={recover} disabled={busy}>Recover pending</button>
          </div>

          <div className="field">
            <label htmlFor="request-id">Request ID</label>
            <input id="request-id" value={requestId} onChange={(event) => setRequestId(event.target.value)} maxLength={96} placeholder="release-2025-04" aria-describedby="request-help request-error" aria-invalid={Boolean(errors.requestId)} />
            <div className="field-meta"><span id="request-help">Unique for the connected sender.</span><span>{requestId.length}/96</span></div>
            {errors.requestId && <p className="error" id="request-error">{errors.requestId}</p>}
          </div>

          <fieldset className="field requirement-field">
            <legend>Requirements</legend>
            <p className="helper" id="requirements-help">Use one observable acceptance criterion per row.</p>
            {requirements.map((requirement, index) => (
              <div className="requirement-row" key={index}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <input id={`requirement-${index}`} aria-label={`Requirement ${index + 1}`} aria-describedby="requirements-help requirements-error" aria-invalid={Boolean(errors.requirements)} value={requirement} maxLength={1000} onChange={(event) => setRequirement(index, event.target.value)} placeholder="The production build completes without errors." />
                {requirements.length > 1 && <button type="button" aria-label={`Remove requirement ${index + 1}`} onClick={() => setRequirements((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}
              </div>
            ))}
            {requirements.length < 12 && <button className="text-button add-button" type="button" onClick={() => setRequirements((current) => [...current, ""])}>Add requirement</button>}
            {errors.requirements && <p className="error" id="requirements-error">{errors.requirements}</p>}
          </fieldset>

          <div className="field">
            <label htmlFor="evidence">Implementation evidence</label>
            <textarea id="evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} maxLength={20000} rows={10} placeholder="Paste test output, code excerpts, build logs, or implementation notes." aria-describedby="evidence-help evidence-error" aria-invalid={Boolean(errors.evidence)} />
            <div className="field-meta"><span id="evidence-help">Only submitted evidence can support a passing result.</span><span>{evidence.length}/20,000</span></div>
            {errors.evidence && <p className="error" id="evidence-error">{errors.evidence}</p>}
          </div>

          <div className="field">
            <label htmlFor="context">Context <span>Optional</span></label>
            <textarea id="context" value={context} onChange={(event) => setContext(event.target.value)} maxLength={8000} rows={4} placeholder="Add scope, constraints, or relevant environment details." />
            <div className="field-meta"><span>Context informs judgment but does not replace evidence.</span><span>{context.length}/8,000</span></div>
          </div>

          <div className="submit-row">
            <p>One wallet signature. One contract write. The submitted hash is reused during recovery.</p>
            <button className="button button-primary" type="submit" disabled={busy || !wallet}>{busy ? "Check in progress" : wallet ? "Run consensus check" : "Connect to continue"}</button>
          </div>
        </form>

        <aside className="panel result-panel" aria-label="Consensus result">
          <div className="panel-heading"><div><p className="section-index">02</p><h2>Consensus trace</h2></div>{update?.explorerUrl && <a className="text-link" href={update.explorerUrl} target="_blank" rel="noreferrer">View transaction</a>}</div>
          <ol className="trace-list">
            {PHASES.map((phase, index) => <li className={index <= activeStep ? "active" : ""} key={phase}><span>{String(index + 1).padStart(2, "0")}</span><strong>{phase}</strong></li>)}
          </ol>
          <div className="live-status" aria-live="polite" aria-atomic="true">
            <span className={`status-dot ${update?.phase === "failed" ? "failed" : ""}`} />
            <p>{notice || "Ready for a new implementation check."}</p>
          </div>

          {result ? (
            <article className="verdict-card">
              <div className="verdict-top"><div><p>Canonical verdict</p><h3>{result.verdict}</h3></div><span>{result.confidence} confidence</span></div>
              <p>{result.explanation}</p>
              <dl className="result-meta"><div><dt>Request</dt><dd>{result.requestId}</dd></div><div><dt>Created</dt><dd>{formatTime(result.createdAt)}</dd></div></dl>
              <h4>Criterion checks</h4>
              <ul className="criteria-list">{result.criteria.map((criterion) => <li key={criterion.id}><div><strong>{criterion.id}</strong><span className={`verdict-tag verdict-${criterion.status}`}>{criterion.status}</span></div><p>{criterion.explanation}</p>{criterion.evidenceExcerpt && <blockquote>{criterion.evidenceExcerpt}</blockquote>}</li>)}</ul>
            </article>
          ) : (
            <div className="empty-result"><span>BP</span><h3>No result selected</h3><p>Submit a check to inspect its validator trace, grounded excerpts, and persisted verdict.</p></div>
          )}
        </aside>
      </div>

      <section className="recent-section">
        <div className="section-title"><div><p className="section-index">03</p><h2>Recent contract results</h2></div><button className="text-button" type="button" onClick={refresh}>Refresh</button></div>
        {recent.length ? <div className="table-wrap"><table><thead><tr><th>Request</th><th>Verdict</th><th>Confidence</th><th>Sender</th><th>Created</th></tr></thead><tbody>{recent.map((item) => <tr key={`${item.sender}:${item.requestId}`}><td>{item.requestId}</td><td><span className={`verdict-tag verdict-${item.verdict}`}>{item.verdict}</span></td><td>{item.confidence}</td><td className="mono">{shortAddress(item.sender)}</td><td>{formatTime(item.createdAt)}</td></tr>)}</tbody></table></div> : <p className="empty-table">No persisted results are available yet.</p>}
      </section>

      <footer><span>BuildProof</span><p>Grounded implementation verification on GenLayer.</p><span>{adapter.mode === "mock" ? "Bradbury preview" : "Bradbury validator consensus"}</span></footer>
      </main>
    </>
  );
}
