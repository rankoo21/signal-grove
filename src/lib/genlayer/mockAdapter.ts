import type {
  BuildProofAdapter,
  BuildProofResult,
  BuildProofSummary,
  CriterionCheck,
  PhaseListener,
  SubmitInput,
  SubmissionOutcome,
  SubmissionUpdate,
  Verdict,
} from "./types";

const MOCK_ACCOUNT = "0x00000000000000000000000000000000b17d000f";
const results: BuildProofResult[] = [];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokens(value: string) {
  return new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function evaluate(requirement: string, evidence: string, index: number): CriterionCheck {
  const ignored = new Set(["the", "and", "for", "with", "from", "that", "this", "must", "should", "will", "has", "have"]);
  const requirementTokens = [...tokens(requirement)].filter((token) => token.length > 2 && !ignored.has(token));
  const evidenceTokens = tokens(evidence);
  const matches = requirementTokens.filter((token) => evidenceTokens.has(token));
  const ratio = requirementTokens.length ? matches.length / requirementTokens.length : 0;
  const status: Verdict = ratio >= 0.65 ? "pass" : ratio >= 0.3 ? "partial" : "fail";
  const lowerEvidence = evidence.toLowerCase();
  const matched = matches.find((token) => lowerEvidence.includes(token));
  let excerpt = "";
  if (matched) {
    const start = Math.max(0, lowerEvidence.indexOf(matched) - 55);
    excerpt = evidence.slice(start, Math.min(evidence.length, start + 180)).trim();
  }
  const explanation = status === "pass"
    ? "The submitted evidence directly covers the main terms in this requirement."
    : status === "partial"
      ? "The evidence overlaps with this requirement but does not fully demonstrate completion."
      : "The submitted evidence does not demonstrate this requirement.";
  return { id: `criterion-${index + 1}`, status, explanation, evidenceExcerpt: excerpt };
}

function mockHash(input: string) {
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `0x${Math.abs(hash).toString(16).padStart(8, "0")}${"0".repeat(56)}`;
}

export class MockAdapter implements BuildProofAdapter {
  readonly mode = "mock" as const;
  private walletAddress: string | null = null;

  hasInjectedWallet(): boolean { return true; }
  getWalletAddress(): string | null { return this.walletAddress; }

  async connectWallet(): Promise<string> {
    await delay(120);
    this.walletAddress = MOCK_ACCOUNT;
    return MOCK_ACCOUNT;
  }

  private emit(listener: PhaseListener | undefined, update: SubmissionUpdate) {
    listener?.(update);
  }

  async submit(input: SubmitInput, onPhase?: PhaseListener): Promise<SubmissionOutcome> {
    if (!this.walletAddress) throw new Error("Connect the local preview identity first.");
    if (results.some((item) => item.sender === this.walletAddress && item.requestId === input.requestId)) {
      throw new Error("request_id already exists for this sender");
    }
    this.emit(onPhase, { phase: "awaiting-signature", requestId: input.requestId, message: "Preparing local preview." });
    await delay(220);
    const txHash = mockHash(`${input.requestId}:${Date.now()}`);
    this.emit(onPhase, { phase: "submitted", requestId: input.requestId, txHash, message: "Local preview submitted." });
    await delay(320);
    this.emit(onPhase, { phase: "validators-evaluating", requestId: input.requestId, txHash, message: "Running deterministic preview checks." });
    const criteria = input.requirements.map((requirement, index) => evaluate(requirement, input.evidence, index));
    const statuses = criteria.map((item) => item.status);
    const verdict: Verdict = statuses.includes("fail") ? "fail" : statuses.includes("partial") ? "partial" : "pass";
    const result: BuildProofResult = {
      requestId: input.requestId,
      sender: this.walletAddress,
      verdict,
      confidence: criteria.every((item) => item.evidenceExcerpt) ? "medium" : "low",
      criteria,
      explanation: verdict === "pass"
        ? "The local preview found evidence for every requirement. Contract mode adds GenLayer validator consensus."
        : verdict === "partial"
          ? "The local preview found incomplete support for at least one requirement."
          : "The local preview found one or more requirements without sufficient implementation evidence.",
      evidenceExcerpts: criteria.map((item) => item.evidenceExcerpt).filter(Boolean),
      createdAt: Date.now(),
    };
    results.unshift(result);
    this.emit(onPhase, { phase: "accepted", requestId: input.requestId, txHash, message: "Preview decision accepted." });
    await delay(160);
    const outcome: SubmissionOutcome = { phase: "state-confirmed", requestId: input.requestId, txHash, result, message: "Preview result stored for this session." };
    this.emit(onPhase, outcome);
    return outcome;
  }

  async recover(): Promise<null> { return null; }

  async getResult(requestId: string): Promise<BuildProofResult | null> {
    return results.find((item) => item.requestId === requestId && item.sender === this.walletAddress) ?? null;
  }

  async getResults(offset = 0, limit = 20): Promise<BuildProofResult[]> {
    return results.slice(offset, offset + limit);
  }

  async getSummary(): Promise<BuildProofSummary> {
    return results.reduce<BuildProofSummary>((summary, item) => {
      summary.total += 1;
      summary[item.verdict] += 1;
      return summary;
    }, { total: 0, pass: 0, partial: 0, fail: 0 });
  }
}
