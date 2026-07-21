Operator tooling for Cosmos SDK chains.

I build small, focused tools for the painful workflows in the lifecycle of a
Cosmos SDK chain — launching, coordination, faucet operation, genesis assembly.
All of them are Apache 2.0 and self-hostable. None of them require running a
third-party service or trusting an external infrastructure operator.

---

## Seedward

A suite for launching and coordinating Cosmos SDK chains without the usual
Discord-and-spreadsheet scramble: validate validator gentxs, run a multi-party
launch under an M-of-N committee, rehearse the genesis before going live, and
keep a tamper-evident record of every decision. Self-hostable end to end.

- [Documentation](https://ny4rl4th0t3p.github.io/seedward-suite)

### chaincoord — v1.0.0 release candidate

The coordination server. An M-of-N committee with VETO drives an explicit launch
lifecycle state machine, backed by a tamper-evident, offline-verifiable
hash-chained audit log. Validators and coordinators sign in with their existing
Cosmos wallets (ADR-036); the server never holds private key material. Ships
with a browser UI, in-browser gentx validation, and an optional pre-flight
rehearsal. Built to replace the Discord-and-spreadsheet pattern that coordinates
most Cosmos chain launches today.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-chaincoord)
- [Documentation](https://ny4rl4th0t3p.github.io/seedward-chaincoord)

### Web UI — v0.2.x (beta)

A browser front end for chaincoord. Connect a Cosmos wallet to create and govern
launches, review committee proposals, and submit or validate validator gentxs —
with gentx validation running client-side via WebAssembly. Ships as a single
container image.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-chaincoord-web)

### Rehearsal — v0.3.x (pre-release)

Optional pre-flight rehearsal for a launch. Assembles the candidate genesis from
the approved inputs, boots an ephemeral chain from it, runs an on-chain assertion
suite, and signs the pass/fail result back to chaincoord — so a launch can be
gated on a genesis that provably boots. Built; not yet released as a stable
version.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-rehearsal)

### gentool — v1.0.0

A CLI for generating production-ready genesis files for any Cosmos SDK chain.
Takes a baseline genesis, validator gentxs, and CSV inputs for accounts, claims,
grants, authz, and feegrant; produces a validated genesis.json with the supply
math checked explicitly. Makes genesis assembly deterministic and reproducible
from declarative inputs.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-gentool)

### gentxvalidate — v1.0.0

A Go library — with a WebAssembly build — that parses and validates Cosmos SDK
gentxs: every invariant (chain id, bond denom, self-delegation floor, commission
bounds, consensus pubkey) plus the ADR-036 signature. Runs server-side in
chaincoord and in the browser via WASM. Ships alongside `canonicaljson`, a
deterministic JSON encoder for signing. (`seedward-libs`)

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-libs)

### seedward CLI — experimental

A unified command-line entry point for the suite: genesis assembly and gentx
validation today, with launch and rehearsal commands in progress. Early and
subject to change.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-cli)

---

## pour

A pure-Go, multi-chain Cosmos faucet. Single static binary, no Node, no
cosmos-sdk dependency. Builds and broadcasts transactions via raw protobuf
over gRPC or REST, sources chain metadata from `cosmos/chain-registry`,
handles IBC drips, and ships with a priority-ordered abuse gate (API key →
signed wallet → proof-of-work → anonymous) and per-address rate limits keyed
on raw address bytes.

- [GitHub](https://github.com/ny4rl4th0t3p/pour)
- [Documentation](https://ny4rl4th0t3p.github.io/pour)
- [Design document](https://github.com/ny4rl4th0t3p/pour/blob/main/docs/DESIGN.md)

---

## chain-registry-sentinel

A GitHub Action that verifies `cosmos/chain-registry` entries against on-chain reality. Probes every RPC, REST, gRPC,
EVM, and WebSocket endpoint in a registry clone, tracks consecutive failures across runs in per-chain state files, and
opens a pull request to remove any endpoint that has failed consistently — with a failure table, first and last seen
evidences, and curl/grpcurl verification commands for each entry.
State persists on a dedicated branch between runs; every proposed change goes through a normal PR for maintainer review.

- [GitHub](https://github.com/ny4rl4th0t3p/chain-registry-sentinel)

---

## About

These tools come from operating in the Cosmos ecosystem and noticing the same
operational pain points being solved with Discord channels, spreadsheets, and
quick-and-dirty scripts at every chain launch and testnet. The point is to
turn those workflows into self-hostable software.

For questions or bug reports, open an issue on the relevant repo.
