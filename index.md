Operator tooling for Cosmos SDK chains.

I build small, focused tools for the painful workflows in the lifecycle of a
Cosmos SDK chain — launching, faucet operation, multi-party coordination. All
of them are Apache 2.0 and self-hostable. None of them require running a third-party
service or trusting an external infrastructure operator.

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

## gentool

A CLI for generating production-ready genesis files for any Cosmos SDK chain.
Takes a baseline genesis, validator gentxs, and CSV inputs for accounts,
claims, grants, authz, and feegrant; produces a validated genesis.json with
the supply math checked explicitly. Designed to make genesis assembly
deterministic and reproducible from declarative inputs.

- [GitHub](https://github.com/ny4rl4th0t3p/seedward-gentool)

---

## chaincoord

A self-hosted coordination system for Cosmos SDK chain launches. M-of-N
committee with VETO over an explicit launch lifecycle state machine, with a
tamper-evident, offline-verifiable audit log. Validators and coordinators
sign in with their existing Cosmos wallets; the server never holds private
key material. Built to replace the Discord-and-spreadsheet pattern that
currently coordinates most Cosmos chain launches.

- [GitHub](https://github.com/ny4rl4th0t3p/chaincoord)
- [Documentation](https://ny4rl4th0t3p.github.io/chaincoord)
- [Design document](https://github.com/ny4rl4th0t3p/chaincoord/blob/main/docs/DESIGN.md)

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
