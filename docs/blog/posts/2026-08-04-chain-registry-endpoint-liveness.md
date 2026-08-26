---
date: 2026-08-04
categories:
  - chain-registry
  - chain-registry-sentinel
authors:
  - ny4rl4th0t3p
hide:
  - navigation
---

# ~60% of the endpoints in cosmos/chain-registry fail liveness

A full probe of every endpoint the 214 live chains in `cosmos/chain-registry` declare — 3,855 RPC, REST, gRPC, gRPC-web,
EVM JSON-RPC and WebSocket entries at commit `e1c86c4`, probed 2026-08-01 from a GitHub-hosted runner — finds 2,314 of
them failing their liveness check, **60.0%**. The registry's own daily `test_endpoints` workflow put the figure at 61.5%
the day before. Three quarters of the failures are structural — the name gone from DNS, a certificate for another host,
a gateway with nothing behind it — and the dead decompose into three distinct problems with three different remedies,
two of them bulk. Filed as
[cosmos/chain-registry#7866](https://github.com/cosmos/chain-registry/issues/7866), with the datasets attached and a
script that recomputes every number in it.

<!-- more -->

## Reproduction — no tooling

The three strongest claims, one command each:

```sh
host rpc-agoric-01.stakeflow.io
# Host rpc-agoric-01.stakeflow.io not found: 3(NXDOMAIN)    — 28 registry entries on this domain

curl -s https://assetmantle-rpc.publicnode.com/status
# unsupported platform                                      — 71 PublicNode entries answer exactly this

curl -s -o /dev/null -w '%{http_code}\n' https://acrechain-mainnet-rpc.autostake.com/status
# 404                                                       — 154 AutoStake entries: server alive, nothing behind it
```

The whole measurement, read-only, with nothing but Docker — no state, no writes, no PRs possible:

```sh
git clone --depth 1 https://github.com/cosmos/chain-registry
docker run --rm --entrypoint /sentinel -v "$PWD/chain-registry:/registry:ro" \
  ghcr.io/ny4rl4th0t3p/chain-registry-sentinel:v0.8.3 --registry /registry
```

The numbers drift daily — the registry and the endpoints both change — but the shape of the findings does not.

## The measurement

[`chain-registry-sentinel`](https://github.com/ny4rl4th0t3p/chain-registry-sentinel) dials every declared endpoint with
the request its protocol expects (`GET /status` for RPC, `/cosmos/base/tendermint/v1beta1/node_info` for REST,
`GetNodeInfo` over gRPC and gRPC-web, `eth_chainId` for EVM, a WebSocket upgrade followed by a status request) and
classifies every failure from the live error value — the DNS response, the TLS alert, the HTTP status and body — never
from string matching. The exact request per probe and what counts as a pass are in
[PROBES.md](https://github.com/ny4rl4th0t3p/chain-registry-sentinel/blob/main/PROBES.md); every verdict reproduces with
`curl`, `grpcurl` or `wscat`.

| registry at `e1c86c4`, probed 2026-08-01                               | count                                      |
|------------------------------------------------------------------------|--------------------------------------------|
| live chains probed                                                     | 214                                        |
| endpoints declared (all six types)                                     | 3,855                                      |
| **failing liveness**                                                   | **2,314 (60.0%)**                          |
| of them structural (DNS / TLS / server says nothing is there)          | ~75%                                       |
| chains with no working RPC, REST or EVM endpoint at all                | **59 of 214 (28%)**                        |
| chains whose *first-listed* RPC fails                                  | 96 of 213 (45.1%), 70 of them structurally |
| operator domains at 0% live                                            | 237                                        |
| live endpoints answering with a *different chain ID*                   | 10                                         |
| live endpoints with `tx_index` off / still syncing / method-restricted | 85 / 11 / 24                               |

Structural means provably broken regardless of how the probe behaved: DNS answering that no address exists for the name
(the largest single class — often the operator's domain is alive while the service records were deliberately removed), a
certificate for the wrong host or expired, or the server itself answering that nothing is there (404s, gateways with no
backend, Cloudflare reporting the origin gone). Timeouts, rate limits and anything a badly-behaved prober could cause
itself are counted separately and claimed as nothing.

The first-listed number is the one that maps to user experience: many clients simply take the first RPC entry, and on
45% of chains that entry is dead.

## Three problems wearing one percentage

The 2,314 dead endpoints split three ways, and only one of the three is the per-endpoint decay that endpoint grooming
exists for:

| dead endpoints                                                   | count     | remedy                      |
|------------------------------------------------------------------|-----------|-----------------------------|
| on 59 chains with zero live core endpoints, still `status: live` | 473       | one `status` flip per chain |
| operator exits — entries of 0%-live operators on living chains   | 1,101     | operator-wide removal       |
| ordinary decay on living chains                                  | 740       | per-endpoint removal        |
| **total**                                                        | **2,314** |                             |

Apply the two bulk remedies and the registry keeps 2,281 entries — the 1,541 live plus those 740 — which is still
**32.4% dead**: the realistic steady state.

The data separates chain death from operator death mechanically. When a chain's dead endpoints belong to operators that
are alive and well on *other* chains, healthy operators deliberately withdrew — a withdrawal signature no single outage
produces. The best-corroborated case is Migaloo: the ping.pub explorer's last indexed block for it is 32,298,839, it is
absent from Mintscan, and all four of PublicNode's migaloo interfaces answer "unsupported platform"
(`curl -s https://migaloo-rpc.publicnode.com/status`). The largest is sge — 26 dead core endpoints, 9 of their operators
serving other chains. The same signature marks sidechain, rebus, quasar, kichain, self, qwoyn, rizon and meme.

The operator exits concentrate in a few dozen providers — stake-town.com (39 dead entries), stakeflow.io (28),
chainroot.io (23), mms.team (21), whispernode.com (11) — 237 domains at 0% live in total, each 100% dead across every
chain it served and sustained across measurements.

## The registry's own daily test agrees

The registry runs its own `test_endpoints` workflow daily: a 2-second timeout, pass on HTTP 200, RPC and REST only. Its
2026-07-31 run ([workflow run](https://github.com/cosmos/chain-registry/actions/runs/30593421752); archived copy
[attached to the v0.8.3 release](https://github.com/ny4rl4th0t3p/chain-registry-sentinel/releases/download/v0.8.3/0_test-endpoints.txt),
since Actions logs expire) is an independent implementation nobody involved wrote for this purpose:

| instrument                                                      | population                          | failed | rate      |
|-----------------------------------------------------------------|-------------------------------------|--------|-----------|
| registry's `test_endpoints` (2026-07-31, 2s timeout, HTTP 200)  | 2,990 RPC+REST tests                | 1,839  | **61.5%** |
| sentinel records replayed under *its* criteria (200 within 2s)  | 2,713 RPC+REST entries (2026-08-01) | 1,523  | **56.1%** |
| sentinel records under the sentinel's criteria, same population | 2,713                               | 1,529  | **56.4%** |

Two things follow. The criteria barely matter — 56.1% vs 56.4% on identical records — so the registry's state is what it
is under any reasonable definition of "responds". And the populations differ in identifiable ways, which is why the
replica rows are the honest comparison: the registry's harness reads every `chain.json` regardless of `status`, so its
2,990 tests include 181 on the fourteen chains marked killed in June–July (171 of them still failing), and it keys tests
by (chain, type, provider name), so a provider listing several entries on one chain collapses to a single test. Net of
the killed chains alone its rate is 1,668/2,809 = 59.4%, within a few points of the replica.

The failure composition matches too: in the registry's log, DNS resolution failures are the largest class at 40.3%,
dead-server responses 30.3%, TLS 14.5%, and 2-second timeouts only 10.1% — the same rank order as the sentinel's
taxonomy.

## Fourteen for fourteen

A measurement of the May 2026 registry state (commit `1e92f162`, same method, same vantage) found 69.1% dead across
~4,300 endpoints; handwritten cleanup since moved the rate nine points. Between June 3 and July 15, fourteen chains were
marked killed across five handwritten PRs, merged after maintainer review
([#7710](https://github.com/cosmos/chain-registry/pull/7710) Evmos,
[#7739](https://github.com/cosmos/chain-registry/pull/7739) Stargaze,
[#7744](https://github.com/cosmos/chain-registry/pull/7744) OmniFlix + seven others,
[#7745](https://github.com/cosmos/chain-registry/pull/7745) Nillion/Starname/Tgrade,
[#7813](https://github.com/cosmos/chain-registry/pull/7813) Umee). The May measurement was computed from the May 15
topology and the wire alone — and every one of the fourteen was already in its fully-dead set, zero live endpoints of
any type. Five of them additionally carried the operator-withdrawal signature. Not clairvoyance — by probe time the
networks were already post-mortem — but method and human judgment, computed from different inputs, selecting the same
chains.

## Why "delete what fails" is not a policy

The two largest failing operators are the same phenomenon — retired public endpoints behind lingering DNS — detected two
very different ways.

**AutoStake — 154 entries across 61 chains, every one failing, yet the infrastructure looks alive.** Zero DNS failures;
every host resolves, presents valid TLS, and answers with a plain 404 under Go and browser User-Agents alike.
AutoStake's website still advertises these exact URLs as per-network public services, so this is not the registry
holding stale addresses. But a CometBFT RPC node always serves an index at `/`, so a 404 there means the gateway is up
with *no backend behind it*: the endpoints appear to have been silently withdrawn while wildcard DNS and the marketing
pages linger. Retested from two vantages (2026-07-28 home network, 2026-07-31 GitHub runner): every verdict and failure
class byte-identical.

**PublicNode — 71 of 160 entries answer that the chain is no longer served.** The same situation minus the silence:
DNS records left behind, endpoints resolving and connecting, and the answer is HTTP 403 with the body `unsupported
platform`. The operator says so themselves; removal needs no further investigation. (A further two dozen of PublicNode's
gRPC endpoints turned out to be alive and freely usable — the gateway blocklists a few specific methods with an upsell,
one of which was the probe's liveness canary. Those were the sentinel's own false negatives, found by hand-testing its
numbers; it now falls back to a second query and records these as live-but-method-restricted.)

A DNS-level check would never catch either case. The failure *class* determines the remedy, and the remedy ranges from
"remove, the operator confirmed it" to "do not touch, the node is fine and the address needs one character fixed" —
which is the whole argument for classifying from the live error instead of counting red rows.

## Is the scanner the problem?

The question was asked of every finding. The self-inflicted failure modes found along the way were measured and
engineered out: probe concurrency melting the prober's own DNS resolver chain (which at one point *halved* the measured
live count until caught), missing IPv6 routes masquerading as dead endpoints, plaintext dials burning timeouts against
TLS-terminated gRPC ports, rate limiting (a 429 is "could not measure", never dead). Probing is gentle — 16 concurrent,
60-second timeouts, one request per endpoint, an identifying User-Agent, ~12 minutes for the full registry — and a run
whose failures are dominated by resolver or routing classes leads its own report with a warning that its numbers are
suspect. The vanished-operator findings reproduce across days and vantages with identical per-operator counts, survived
a full rewrite of the tool, and now agree with the registry's own test.

## What was filed

The issue asks three process questions and requests no action. The sentinel is built and demonstrated end to end on a
[fork](https://github.com/ny4rl4th0t3p/chain-registry/pulls) — endpoint-removal PRs after N consecutive failing runs with per-endpoint evidence and copy-paste verification
commands, one-line `status: live → killed` PRs for chains carrying the withdrawal signature, IBC denom-hash fixes — and
it only ever proposes: it never merges, never closes PRs, never writes to a default branch. Without a token it can only
measure and report, so "no automation — we'll use the numbers" is a complete answer.

Every number above is recomputed from the three attached artifacts by a script in the repo, arithmetic shown:

```sh
git clone https://github.com/ny4rl4th0t3p/chain-registry-sentinel && cd chain-registry-sentinel
curl -LO https://github.com/ny4rl4th0t3p/chain-registry-sentinel/releases/download/v0.8.3/20260801T172659Z-github-runner.jsonl
curl -LO https://github.com/ny4rl4th0t3p/chain-registry-sentinel/releases/download/v0.8.3/0_test-endpoints.txt
curl -LO https://github.com/ny4rl4th0t3p/chain-registry-sentinel/releases/download/v0.8.3/20260731T080445Z-github-runner.jsonl
sh scripts/report-audit.sh 20260801T172659Z-github-runner.jsonl 0_test-endpoints.txt 20260731T080445Z-github-runner.jsonl
```

A mismatch between the script's output and any claim here is a bug in the claim.

Issue: [cosmos/chain-registry#7866](https://github.com/cosmos/chain-registry/issues/7866).