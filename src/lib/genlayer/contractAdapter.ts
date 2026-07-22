import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { localnet, studionet, testnetBradbury } from "genlayer-js/chains";
import {
  ExecutionResult,
  TransactionStatus,
  type CalldataEncodable,
  type GenLayerTransaction,
  type Hash,
} from "genlayer-js/types";
import type {
  BuildProofAdapter,
  BuildProofResult,
  BuildProofSummary,
  CriterionCheck,
  PhaseListener,
  SubmitInput,
  SubmissionOutcome,
  SubmissionUpdate,
} from "./types";

type GenLayerClient = ReturnType<typeof createClient>;
type Chain = typeof studionet;
type Network = "studionet" | "testnetBradbury" | "localnet";
type Pending = {
  app: "buildproof";
  version: 1;
  requestId: string;
  hash: Hash;
  account: string;
  submittedAt: number;
};
type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

const APP_ID = "buildproof" as const;
const PENDING_KEY = "buildproof.pending-transaction.v1";
const READ_KEY = "buildproof.read-account.v1";
const RECEIPT_RETRIES = 120;
const STATE_RETRIES = 45;

export interface ContractAdapterConfig {
  contractAddress: string;
  network?: string;
}

function pickNetwork(value = "studionet"): { chain: Chain; name: Network } {
  const normalized = value.toLowerCase();
  if (["bradbury", "testnet-bradbury", "testnetbradbury"].includes(normalized)) {
    return { chain: testnetBradbury, name: "testnetBradbury" };
  }
  if (normalized === "localnet") return { chain: localnet, name: "localnet" };
  return { chain: studionet, name: "studionet" };
}

function toPlain(value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value].map(([key, item]) => [String(key), toPlain(item)]),
    );
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toPlain(item)]),
    );
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function provider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum ?? null;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isVerdict(value: unknown): value is BuildProofResult["verdict"] {
  return value === "pass" || value === "partial" || value === "fail";
}

function isConfidence(value: unknown): value is BuildProofResult["confidence"] {
  return value === "low" || value === "medium" || value === "high";
}

function normalizeCriterion(value: unknown): CriterionCheck {
  const item = asRecord(value);
  if (!item || !isVerdict(item.status)) {
    throw new Error("The contract returned an invalid criterion check.");
  }
  return {
    id: String(item.id ?? ""),
    status: item.status,
    explanation: String(item.explanation ?? ""),
    evidenceExcerpt: String(item.evidenceExcerpt ?? ""),
  };
}

function normalizeResult(value: unknown): BuildProofResult | null {
  const item = asRecord(toPlain(value));
  if (!item || !item.requestId) return null;
  if (!isVerdict(item.verdict) || !isConfidence(item.confidence) || !Array.isArray(item.criteria)) {
    throw new Error("The contract returned an invalid BuildProof result.");
  }
  return {
    requestId: String(item.requestId),
    sender: String(item.sender ?? ""),
    verdict: item.verdict,
    confidence: item.confidence,
    criteria: item.criteria.map(normalizeCriterion),
    explanation: String(item.explanation ?? ""),
    evidenceExcerpts: Array.isArray(item.evidenceExcerpts)
      ? item.evidenceExcerpts.map(String)
      : [],
    createdAt: Number(item.createdAt ?? 0),
  };
}

function isHash(value: unknown): value is Hash {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function receiptFailure(receipt: GenLayerTransaction): string | null {
  const failedExecution = receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR;
  const failedResult = Boolean(receipt.resultName && [
    "DISAGREE",
    "TIMEOUT",
    "DETERMINISTIC_VIOLATION",
    "NO_MAJORITY",
    "MAJORITY_DISAGREE",
  ].includes(receipt.resultName));
  const failedStatus = receipt.statusName === TransactionStatus.CANCELED
    || receipt.statusName === TransactionStatus.UNDETERMINED
    || receipt.statusName === TransactionStatus.VALIDATORS_TIMEOUT
    || receipt.statusName === TransactionStatus.LEADER_TIMEOUT;
  if (!failedExecution && !failedResult && !failedStatus) return null;

  const details = [
    receipt.statusName && `status ${receipt.statusName}`,
    receipt.resultName && `result ${receipt.resultName}`,
    receipt.txExecutionResultName && `execution ${receipt.txExecutionResultName}`,
  ].filter((value): value is string => Boolean(value));
  const leaderError = receipt.consensus_data?.leader_receipt
    ?.map((item) => item.error?.trim())
    .find((value): value is string => Boolean(value));
  if (leaderError) details.push(`contract error ${leaderError.slice(0, 240)}`);
  return `The transaction reached a terminal failure${details.length ? `: ${details.join("; ")}` : "."}`;
}

export class ContractAdapter implements BuildProofAdapter {
  readonly mode = "contract" as const;
  private readonly address: `0x${string}`;
  private readonly chain: Chain;
  private readonly network: Network;
  private readonly readClient: GenLayerClient;
  private walletClient: GenLayerClient | null = null;
  private walletAddress: string | null = null;

  constructor(config: ContractAdapterConfig) {
    this.address = config.contractAddress as `0x${string}`;
    const selected = pickNetwork(config.network);
    this.chain = selected.chain;
    this.network = selected.name;
    let key = generatePrivateKey();
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(READ_KEY);
      if (saved) key = saved as `0x${string}`;
      else localStorage.setItem(READ_KEY, key);
    }
    this.readClient = createClient({ chain: this.chain, account: createAccount(key) });
  }

  hasInjectedWallet(): boolean {
    return Boolean(provider());
  }

  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  async connectWallet(): Promise<string> {
    const ethereum = provider();
    if (!ethereum) throw new Error("No compatible browser wallet was found.");
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
      throw new Error("The wallet returned no account.");
    }
    const address = accounts[0];
    const client = createClient({ chain: this.chain, account: address as `0x${string}` });
    await client.connect(this.network);
    this.walletClient = client;
    this.walletAddress = address;
    return address;
  }

  private emit(listener: PhaseListener | undefined, update: SubmissionUpdate) {
    listener?.(update);
  }

  private explorer(hash: string): string | undefined {
    const configured = process.env.NEXT_PUBLIC_BUILDPROOF_EXPLORER;
    const base = configured ?? this.chain.blockExplorers?.default.url;
    return base ? `${base.replace(/\/$/, "")}/tx/${hash}` : undefined;
  }

  private savePending(pending: Pending | null) {
    if (typeof window === "undefined") return;
    if (pending) localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else localStorage.removeItem(PENDING_KEY);
  }

  private loadPending(): Pending | null {
    if (typeof window === "undefined") return null;
    try {
      const value = asRecord(JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null"));
      if (
        !value
        || value.app !== APP_ID
        || value.version !== 1
        || typeof value.requestId !== "string"
        || !isHash(value.hash)
        || typeof value.account !== "string"
        || typeof value.submittedAt !== "number"
      ) {
        return null;
      }
      return {
        app: APP_ID,
        version: 1,
        requestId: value.requestId,
        hash: value.hash,
        account: value.account,
        submittedAt: value.submittedAt,
      };
    } catch {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
  }

  private async readWith<T>(client: GenLayerClient, functionName: string, args: CalldataEncodable[] = []): Promise<T> {
    const value = await client.readContract({
      address: this.address,
      functionName,
      args,
    });
    return toPlain(value) as T;
  }

  private resultClient(): GenLayerClient {
    return this.walletClient ?? this.readClient;
  }

  private async confirmPending(pending: Pending, listener?: PhaseListener): Promise<SubmissionOutcome> {
    const common = {
      requestId: pending.requestId,
      txHash: pending.hash,
      explorerUrl: this.explorer(pending.hash),
    };
    this.emit(listener, {
      ...common,
      phase: "validators-evaluating",
      message: "Validators are evaluating the submitted evidence.",
    });
    try {
      const receipt = await this.resultClient().waitForTransactionReceipt({
        hash: pending.hash,
        status: TransactionStatus.ACCEPTED,
        interval: 5000,
        retries: RECEIPT_RETRIES,
      });
      const failure = receiptFailure(receipt);
      if (failure) throw new Error(failure);
      this.emit(listener, {
        ...common,
        phase: "accepted",
        message: "Consensus accepted. Confirming persisted contract state.",
      });
      for (let attempt = 0; attempt < STATE_RETRIES; attempt += 1) {
        const result = await this.getResult(pending.requestId);
        if (result) {
          this.savePending(null);
          const outcome: SubmissionOutcome = {
            ...common,
            phase: "state-confirmed",
            message: "Canonical result confirmed in contract state.",
            result,
          };
          this.emit(listener, outcome);
          return outcome;
        }
        await sleep(2000);
      }
      throw new Error("Consensus was accepted, but the persisted result was not visible before the read timeout.");
    } catch (error) {
      const update: SubmissionUpdate = {
        ...common,
        phase: "failed",
        message: errorMessage(error),
      };
      this.emit(listener, update);
      throw new Error(update.message);
    }
  }

  async submit(input: SubmitInput, onPhase?: PhaseListener): Promise<SubmissionOutcome> {
    if (!this.walletClient || !this.walletAddress) {
      throw new Error("Connect a wallet before running a consensus check.");
    }
    const existing = this.loadPending();
    if (existing) {
      throw new Error(`A transaction for ${existing.requestId} is already pending. Recovery must finish before another submission.`);
    }
    this.emit(onPhase, {
      phase: "awaiting-signature",
      requestId: input.requestId,
      message: "Approve the single submit_check transaction in your wallet.",
    });
    try {
      const payload = JSON.stringify({
        requirements: input.requirements.map((text, index) => ({
          id: `criterion-${index + 1}`,
          text,
        })),
        evidence: input.evidence,
        context: input.context ?? "",
      });
      const submitted = await this.walletClient.writeContract({
        address: this.address,
        functionName: "submit_check",
        args: [input.requestId, payload, Date.now()],
        value: 0n,
      });
      if (!isHash(submitted)) throw new Error("The wallet returned an invalid transaction hash.");
      const pending: Pending = {
        app: APP_ID,
        version: 1,
        requestId: input.requestId,
        hash: submitted,
        account: this.walletAddress,
        submittedAt: Date.now(),
      };
      this.savePending(pending);
      this.emit(onPhase, {
        phase: "submitted",
        requestId: input.requestId,
        txHash: submitted,
        explorerUrl: this.explorer(submitted),
        message: "Transaction submitted. It will not be resubmitted.",
      });
      return await this.confirmPending(pending, onPhase);
    } catch (error) {
      if (!this.loadPending()) {
        this.emit(onPhase, {
          phase: "failed",
          requestId: input.requestId,
          message: errorMessage(error),
        });
      }
      throw error;
    }
  }

  async recover(onPhase?: PhaseListener): Promise<SubmissionOutcome | null> {
    const pending = this.loadPending();
    if (!pending) return null;
    if (!this.walletAddress || this.walletAddress.toLowerCase() !== pending.account.toLowerCase()) {
      const account = await this.connectWallet();
      if (account.toLowerCase() !== pending.account.toLowerCase()) {
        throw new Error(`Switch to wallet ${pending.account} to recover this transaction.`);
      }
    }
    this.emit(onPhase, {
      phase: "submitted",
      requestId: pending.requestId,
      txHash: pending.hash,
      explorerUrl: this.explorer(pending.hash),
      message: "Recovered the stored transaction hash. No new write was sent.",
    });
    return this.confirmPending(pending, onPhase);
  }

  async getResult(requestId: string): Promise<BuildProofResult | null> {
    const value = await this.readWith<unknown>(this.resultClient(), "get_result", [requestId]);
    return normalizeResult(value);
  }

  async getResults(offset = 0, limit = 20): Promise<BuildProofResult[]> {
    const values = await this.readWith<unknown[]>(this.readClient, "get_results", [offset, limit]);
    return values.map(normalizeResult).filter((item): item is BuildProofResult => item !== null);
  }

  async getSummary(): Promise<BuildProofSummary> {
    const value = await this.readWith<Record<string, unknown>>(this.readClient, "get_summary");
    return {
      total: Number(value.total ?? 0),
      pass: Number(value.pass ?? 0),
      partial: Number(value.partial ?? 0),
      fail: Number(value.fail ?? 0),
    };
  }
}
