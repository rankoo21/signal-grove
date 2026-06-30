// Live smoke test against the deployed contract: plant a seed, attach a root,
// pulse it (the AI consensus path), and read everything back. Uses a fresh
// burner key so it is independent of the frontend identity.
//
//   node scripts/smoke.mjs

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet, testnetBradbury, localnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function parseEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function pickChain(name) {
  switch ((name ?? "studionet").toLowerCase()) {
    case "bradbury":
    case "testnet-bradbury":
      return testnetBradbury;
    case "localnet":
      return localnet;
    default:
      return studionet;
  }
}

const J = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? Number(x) : x));

async function main() {
  const env = { ...parseEnv(join(root, ".env.deploy")), ...parseEnv(join(root, ".env.local")) };
  const address = env.GROVE_CONTRACT_ADDRESS || env.NEXT_PUBLIC_GROVE_CONTRACT;
  const network = env.GENLAYER_NETWORK || env.NEXT_PUBLIC_GROVE_NETWORK || "studionet";
  if (!address) throw new Error("No contract address found in env files.");

  const chain = pickChain(network);
  // Use the funded deploy key for writes (Bradbury is not gasless). Falls back
  // to a fresh burner if no key is set (studionet is gasless).
  const pk = env.GENLAYER_PRIVATE_KEY;
  const account = pk
    ? createAccount(pk.startsWith("0x") ? pk : `0x${pk}`)
    : createAccount(generatePrivateKey());
  const client = createClient({ chain, account });
  console.log(`Contract: ${address}  Network: ${network}`);
  console.log(`Firefly:  ${account.address}`);

  const wait = (hash) =>
    client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, interval: 5000, retries: 60 });

  // 1. plant
  console.log("\n[1/4] plant_seed...");
  let h = await client.writeContract({
    address, functionName: "plant_seed",
    args: ["Builder Watch", "Wake when a builder opportunity or testnet task appears.",
      "hungry", "english", ["builder", "testnet", "ecosystem"], "permanent", Date.now()],
    value: 0n,
  });
  await wait(h);
  let seeds = await client.readContract({ address, functionName: "get_seeds", args: [0, 20] });
  const seed = seeds[seeds.length - 1];
  const seedId = seed.get ? seed.get("id") : seed.id;
  console.log("  seed:", seedId, " state:", seed.get ? seed.get("state") : seed.state);

  // 2. attach root
  console.log("\n[2/4] attach_root...");
  h = await client.writeContract({
    address, functionName: "attach_root",
    args: [seedId, "blog", "Update stream", "https://example.org/updates",
      "A new builder opportunity is open with a testnet task track and a bounty for ecosystem projects.",
      "primary source", Date.now()],
    value: 0n,
  });
  await wait(h);
  const roots = await client.readContract({ address, functionName: "get_roots", args: [seedId] });
  console.log("  roots:", J(roots));

  // 3. pulse (AI consensus)
  console.log("\n[3/4] pulse_seed (AI consensus, may take minutes)...");
  h = await client.writeContract({
    address, functionName: "pulse_seed", args: [seedId, Date.now()], value: 0n,
  });
  const receipt = await wait(h);
  console.log("  pulse tx accepted:", h);

  // 4. read back
  console.log("\n[4/4] read back...");
  const after = await client.readContract({ address, functionName: "get_seed", args: [seedId] });
  console.log("  seed after pulse:", J(after));
  const summary = await client.readContract({ address, functionName: "get_summary", args: [] });
  console.log("  summary:", J(summary));
  console.log("\nSmoke test complete.");
}

main().catch((e) => { console.error("SMOKE FAILED:", e?.message ?? e); process.exit(1); });
