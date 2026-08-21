Operator tooling for Cosmos SDK chains.

I build small, focused tools for the painful workflows in the lifecycle of a Cosmos SDK chain — launching, coordination,
faucet operation, genesis assembly, offline state verification, and keeping the public registry honest about what's
still alive. All of them are Apache 2.0 and self-hostable. None of them require running a third-party service or trusting
an external infrastructure operator. One of them — `stateward`, the offline state reader — surfaced a bank-state
indexing gap on the Cosmos Hub ([cosmos/gaia#4122](https://github.com/cosmos/gaia/issues/4122)).

---

## chain-registry-sentinel — v0.8.3

A GitHub Action that verifies cosmos/chain-registry entries against on-chain reality and proposes corrections as pull
requests. Probes every declared RPC, REST, gRPC, gRPC-web, EVM JSON-RPC, and WebSocket endpoint; failures are classified
from live error values (DNS, TLS, syscall — never string matching) and tracked as per-run streaks on a dedicated state
branch. Consistently dead endpoints get a removal PR with per-endpoint evidence and copy-paste curl/grpcurl verification
commands. Chains that are dead as a whole — every core endpoint gone while their operators demonstrably serve other
chains, or every surviving node frozen past a block-age threshold — get a one-line status-flip PR (live → killed)
instead of dozens of deletions. IBC denom hashes are recomputed from their trace paths and fixed deterministically;
endpoints answering for the wrong chain are reported. Every finding is machine-gathered, capped per run, and lands as a
normal PR for maintainer review — the sentinel never closes PRs. Ships as a prebuilt GHCR image; also runs standalone
via docker run for a read-only measurement of any registry clone.

- [GitHub](https://github.com/ny4rl4th0t3p/chain-registry-sentinel)
- [Probe specification](https://github.com/ny4rl4th0t3p/chain-registry-sentinel/blob/main/PROBES.md)
- [Measurement & discussion with the registry maintainers — cosmos/chain-registry#7866](https://github.com/cosmos/chain-registry/issues/7866)

---

## stateward — v0.2.0

Offline, verified reading of a Cosmos SDK chain's on-disk state — no running node, no chain binary, no state replay. It
opens a node's `application.db` with hand-rolled, spec-pinned IAVL readers (legacy, v1, and hybrid trees; goleveldb and
pebbledb), recomputes a store's Merkle root and the application hash from the raw nodes, and checks them against the
store's own `CommitInfo` and, optionally, a validator-signed block header — a header match is cryptographic proof that
the snapshot *is* the state the network committed at that height, established locally from the data directory alone.
Three modes ride one verified walk: `verify` (the trust primitive), `census` (a bank balance / reverse-index /
value-encoding audit), and `raw` (the anchored `(key, value)` slice that keeps any downstream decoding auditable back to
the on-chain bytes). The readers are hostile-input parsers — no panics, bounded allocations, continuously fuzzed. Single
CGO-free binary, and a prebuilt GHCR image.

- [GitHub](https://github.com/ny4rl4th0t3p/stateward)
- [DenomOwners under-reports holders on cosmoshub-4 — cosmos/gaia#4122](https://github.com/cosmos/gaia/issues/4122)

---

## Seedward

A suite for launching and coordinating Cosmos SDK chains without the usual Discord-and-spreadsheet scramble: validate
validator gentxs, run a multi-party launch under an M-of-N committee, rehearse the genesis before going live, and keep a
tamper-evident record of every decision. Self-hostable end to end.

- [Documentation](https://ny4rl4th0t3p.github.io/seedward-suite)
- [Demo](https://ny4rl4th0t3p.github.io/seedward-suite/demo/) — `make dev-seed` spins up a populated stack: ten launches
  across every lifecycle state, browsable with an imported demo wallet.

### chaincoord — v1.0.0

The coordination server. An M-of-N committee with VETO drives an explicit launch lifecycle state machine, backed by a
tamper-evident, offline-verifiable hash-chained audit log. Validators and coordinators sign in with their existing
Cosmos wallets (ADR-036); the server never holds a validator's signing key. Ships with a browser UI, in-browser gentx
validation, and an optional pre-flight rehearsal. Built to replace the Discord-and-spreadsheet pattern that coordinates
most Cosmos chain launches today.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-chaincoord)
- [Documentation](https://ny4rl4th0t3p.github.io/seedward-chaincoord)

### Web UI — v0.3.x (beta)

A browser front end for chaincoord. Connect a Cosmos wallet to create and govern launches, review committee proposals,
and submit or validate validator gentxs — with gentx validation running client-side via WebAssembly. Ships as a single
container image.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-chaincoord-web)

### Rehearsal — v0.4.x (pre-release)

Optional pre-flight rehearsal for a launch. Assembles the candidate genesis from the approved inputs, boots an ephemeral
chain from it, runs an on-chain assertion suite, and signs the pass/fail result back to chaincoord — so a launch can be
gated on a genesis that provably boots. Built; not yet released as a stable version.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-rehearsal)

### gentool — v1.0.0

A CLI for generating production-ready genesis files for any Cosmos SDK chain. Takes a baseline genesis, validator
gentxs, and CSV inputs for accounts, claims, grants, authz, and feegrant; produces a validated genesis.json with the
supply math checked explicitly. Makes genesis assembly deterministic and reproducible from declarative inputs.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-gentool)

### gentxvalidate — v1.0.0

A Go library — with a WebAssembly build — that parses and validates Cosmos SDK gentxs: every invariant (chain id, bond
denom, self-delegation floor, commission bounds, consensus pubkey) plus the ADR-036 signature. Runs server-side in
chaincoord and in the browser via WASM. Ships alongside `canonicaljson`, a deterministic JSON encoder for signing.
(`seedward-libs`)

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-libs)

### seedward CLI — experimental

A unified command-line entry point for the suite: genesis assembly and gentx validation today, with launch and rehearsal
commands in progress. Early and subject to change.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-cli)

---

## pour — v0.9.x, pre-1.0

A pure-Go, multi-chain Cosmos faucet. Single static binary, no Node, no cosmos-sdk dependency. Builds and broadcasts
transactions via raw protobuf over gRPC or REST, sources chain metadata from `cosmos/chain-registry`, handles IBC drips,
and ships with a priority-ordered abuse gate (API key → signed wallet → proof-of-work → anonymous) and per-address rate
limits keyed on raw address bytes.

- [GitHub](https://github.com/ny4rl4th0t3p/pour)
- [Documentation](https://ny4rl4th0t3p.github.io/pour)
- [Design document](https://github.com/ny4rl4th0t3p/pour/blob/main/docs/DESIGN.md)

---

## About

These tools come from operating in the Cosmos ecosystem and noticing the same operational pain points being solved with
Discord channels, spreadsheets, and quick-and-dirty scripts at every chain launch and testnet. The point is to turn
those workflows into self-hostable software.

For questions, bug reports, or anything else — including collaboration or work inquiries — open an issue or discussion
on the relevant repo.
