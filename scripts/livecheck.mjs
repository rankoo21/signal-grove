// Comprehensive live check against the deployed contract. Exercises the full
// lifecycle and the consensus + deterministic backstop behavior end to end.
//
//   node scripts/livecheck.mjs

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

// Decode helper: contract returns may be Maps.
const g = (o, k) => (o && typeof o.get === "function" ? o.get(k) : o?.[k]);

let passed = 0;
let failed = 0;
function check(label, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}  ${extra}`);
  }
}

async function main() {
  const env = { ...parseEnv(join(root, ".env.deploy")), ...parseEnv(join(root, ".env.local")) };
  const address = env.GROVE_CONTRACT_ADDRESS || env.NEXT_PUBLIC_GROVE_CONTRACT;
  const network = env.GENLAYER_NETWORK || env.NEXT_PUBLIC_GROVE_NETWORK || "studionet";
  if (!address) throw new Error("No contract address in env.");

  const chain = pickChain(network);
  const pk = env.GENLAYER_PRIVATE_KEY;
  const account = pk
    ? createAccount(pk.startsWith("0x") ? pk : `0x${pk}`)
    : createAccount(generatePrivateKey());
  const client = createClient({ chain, account });

  console.log(`Contract: ${address}`);
  console.log(`Network:  ${network}`);
  console.log(`Caller:   ${account.address}\n`);

  const wait = (hash) =>
    client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, interval: 6000, retries: 150 });
  const read = (fn, args = []) => client.readContract({ address, functionName: fn, args });
  const write = async (fn, args) => {
    // Bradbury occasionally reverts a tx at the consensus layer transiently.
    // Retry a couple of times before giving up.
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const h = await client.writeContract({ address, functionName: fn, args, value: 0n });
        return await wait(h);
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message ?? e);
        if (!/revert|timed out|temporarily|429/i.test(msg)) throw e;
        await new Promise((r) => setTimeout(r, 8000));
      }
    }
    throw lastErr;
  };

  // The contract assigns ids as seed_<n>/spore_<n> using a counter. Read the
  // current counts so we know the id the next plant/preserve will produce.
  const nextSeedId = async () => {
    const s = await read("get_summary", []);
    return `seed_${Number(g(s, "seeds"))}`;
  };

  // Page through all seeds (the view caps at 20 per page) and return the newest
  // one matching a name. Avoids missing seeds that fall off the first page.
  const findSeedByName = async (name) => {
    let offset = 0;
    let match = null;
    for (;;) {
      const page = await read("get_seeds", [offset, 20]);
      if (!page || page.length === 0) break;
      for (const s of page) if (g(s, "name") === name && !match) match = s;
      if (page.length < 20) break;
      offset += 20;
    }
    return match;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Bradbury applies state shortly after ACCEPTED; reads can lag. Poll a read
  // until a predicate holds or we give up.
  const readUntil = async (fn, args, pred, tries = 30, gap = 4000) => {
    let last;
    for (let i = 0; i < tries; i++) {
      last = await read(fn, args);
      if (pred(last)) return last;
      await sleep(gap);
    }
    return last;
  };

  const findSeedUntil = async (name, pred, tries = 30, gap = 4000) => {
    let last;
    for (let i = 0; i < tries; i++) {
      last = await findSeedByName(name);
      if (last && pred(last)) return last;
      await sleep(gap);
    }
    return last;
  };

  // --- Scenario A: strong signal -> bloom -> preserve -> spore --------------
  console.log("Scenario A: bloom and preserve");
  const seedAId = await nextSeedId();
  await write("plant_seed", [
    "Builder Watch A",
    "Wake when a builder opportunity or testnet task appears.",
    "hungry", "english", ["builder", "testnet", "ecosystem"], "permanent", Date.now(),
  ]);
  let seedA = await readUntil("get_seed", [seedAId], (s) => !!g(s, "id"));
  check("seed A planted, dormant", g(seedA, "state") === "dormant", `got ${g(seedA, "state")}`);

  await write("attach_root", [
    seedAId, "blog", "Update stream", "https://example.org/updates",
    "A new builder opportunity is open with a testnet task track and a bounty for ecosystem projects.",
    "primary source", Date.now(),
  ]);
  let sA = await readUntil("get_seed", [seedAId], (s) => g(s, "state") === "rooting");
  check("seed A rooting after root", g(sA, "state") === "rooting", `got ${g(sA, "state")}`);

  await write("pulse_seed", [seedAId, Date.now()]);
  sA = await readUntil("get_seed", [seedAId], (s) => g(s, "state") === "blooming");
  check("seed A bloomed on strong signal", g(sA, "state") === "blooming", `got ${g(sA, "state")}`);
  const bloomIds = g(sA, "bloomIds");
  const bloomAId = Array.isArray(bloomIds) ? bloomIds[0] : g(bloomIds, 0);
  check("seed A has a bloom", !!bloomAId, JSON.stringify(bloomIds));

  const bloom = await read("get_bloom", [bloomAId]);
  check("bloom has non-empty title", !!g(bloom, "title"), JSON.stringify(g(bloom, "title")));
  check("bloom not yet preserved", g(bloom, "preserved") === false);

  await write("preserve_bloom", [bloomAId, "0xlivecheck", Date.now()]);
  sA = await readUntil("get_seed", [seedAId], (s) => g(s, "state") === "archived");
  check("seed A archived after preserve", g(sA, "state") === "archived", `got ${g(sA, "state")}`);
  const spores = await readUntil("get_spores", [0, 20], (arr) => Array.isArray(arr) && arr.some((sp) => g(sp, "bloomId") === bloomAId));
  const spore = spores.find((sp) => g(sp, "bloomId") === bloomAId);
  check("spore created from bloom", !!spore);
  check("spore keeps categories", JSON.stringify(g(spore, "categories")) === JSON.stringify(["builder", "testnet", "ecosystem"]),
    JSON.stringify(g(spore, "categories")));

  // --- Scenario B: noise -> deterministic backstop blocks bloom ------------
  console.log("\nScenario B: noise does not bloom (deterministic backstop)");
  const seedBId = await nextSeedId();
  await write("plant_seed", [
    "Builder Watch B", "Wake only on builder opportunities.",
    "quiet", "english", ["builder"], "permanent", Date.now(),
  ]);
  await readUntil("get_seed", [seedBId], (s) => !!g(s, "id"));
  await write("attach_root", [
    seedBId, "social", "Noise", "https://example.org/social",
    "Just some unrelated chatter about the weather and lunch today.",
    "low signal", Date.now(),
  ]);
  await readUntil("get_seed", [seedBId], (s) => g(s, "state") === "rooting");
  await write("pulse_seed", [seedBId, Date.now()]);
  // After a pulse on noise the state should settle to rooting or stirring, never blooming.
  const sB = await readUntil("get_seed", [seedBId], (s) => g(s, "state") !== "dormant");
  check("seed B did NOT bloom on noise", g(sB, "state") !== "blooming", `got ${g(sB, "state")}`);

  // --- Scenario C: wither --------------------------------------------------
  console.log("\nScenario C: wither");
  const seedCId = await nextSeedId();
  await write("plant_seed", [
    "Builder Watch C", "watch", "balanced", "english", ["builder"], "30-days", Date.now(),
  ]);
  await readUntil("get_seed", [seedCId], (s) => !!g(s, "id"));
  await write("wither_seed", [seedCId]);
  const sC = await readUntil("get_seed", [seedCId], (s) => g(s, "state") === "withered");
  check("seed C withered", g(sC, "state") === "withered", `got ${g(sC, "state")}`);

  // --- Scenario D: guard - pulse a withered seed must not change state -----
  console.log("\nScenario D: guards");
  let reverted = false;
  try {
    const h = await client.writeContract({ address, functionName: "pulse_seed", args: [seedCId, Date.now()], value: 0n });
    await wait(h);
  } catch (e) {
    reverted = true;
  }
  // On some networks the guard rejects at submit time (throws); on others the
  // tx is accepted but execution reverts and state is unchanged. Either way the
  // withered seed must remain withered.
  const sCafter = await read("get_seed", [seedCId]);
  check("pulsing a withered seed leaves it withered", g(sCafter, "state") === "withered",
    `reverted=${reverted} state=${g(sCafter, "state")}`);

  // --- Summary -------------------------------------------------------------
  const summary = await read("get_summary", []);
  console.log("\nContract summary:", JSON.stringify(summary, (k, v) => (typeof v === "bigint" ? Number(v) : v)));

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error("LIVECHECK ERROR:", e?.message ?? e); process.exit(1); });
