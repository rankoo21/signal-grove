export type Verdict = "pass" | "partial" | "fail";
export type Confidence = "low" | "medium" | "high";
export type ConsensusPhase =
  | "idle"
  | "awaiting-signature"
  | "submitted"
  | "validators-evaluating"
  | "accepted"
  | "state-confirmed"
  | "failed";

export interface Requirement { id: string; text: string }
export interface CriterionCheck {
  id: string;
  status: Verdict;
  explanation: string;
  evidenceExcerpt: string;
}
export interface BuildProofResult {
  requestId: string;
  sender: string;
  verdict: Verdict;
  confidence: Confidence;
  criteria: CriterionCheck[];
  explanation: string;
  evidenceExcerpts: string[];
  createdAt: number;
}
export interface BuildProofSummary { total: number; pass: number; partial: number; fail: number }
export interface SubmitInput { requestId: string; requirements: string[]; evidence: string; context?: string }
export interface SubmissionUpdate {
  phase: ConsensusPhase;
  requestId: string;
  txHash?: string;
  explorerUrl?: string;
  message?: string;
}
export interface SubmissionOutcome extends SubmissionUpdate {
  phase: "state-confirmed";
  result: BuildProofResult;
}
export type PhaseListener = (update: SubmissionUpdate) => void;
export interface BuildProofAdapter {
  readonly mode: "mock" | "contract";
  hasInjectedWallet(): boolean;
  connectWallet(): Promise<string>;
  getWalletAddress(): string | null;
  submit(input: SubmitInput, onPhase?: PhaseListener): Promise<SubmissionOutcome>;
  recover(onPhase?: PhaseListener): Promise<SubmissionOutcome | null>;
  getResult(requestId: string): Promise<BuildProofResult | null>;
  getResults(offset?: number, limit?: number): Promise<BuildProofResult[]>;
  getSummary(): Promise<BuildProofSummary>;
}
