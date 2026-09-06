---
date: 2026-08-25
categories:
  - Injective
  - stateward
authors:
  - ny4rl4th0t3p
hide:
  - navigation
---

# A module account at account_number 0, three chains deep

On `injective-1`, the `tokenfactory` module account holds `account_number: 0` — the same number as a user account.
It's the only duplicate among 2,144,872 accounts, it was created that way by the v1.8 upgrade in 2022, the code that
created it was fixed in 2024, and the account was never renumbered. The same fossil sits on Osmosis, where the module
was written, and on Juno, which vendored it too. Filed as
[InjectiveFoundation/injective-core#45](https://github.com/InjectiveFoundation/injective-core/issues/45).

<!-- more -->

## Reproduction — any public LCD, no tooling

```sh
LCD=https://sentry.lcd.injective.network

curl -s "$LCD/cosmos/auth/v1beta1/accounts/inj19ejy8n9qsectrf4semdp9cpknflld0j6hf2fle" \
  | jq -c '.account | {type:."@type", name, account_number:.base_account.account_number}'
# {"type":"/cosmos.auth.v1beta1.ModuleAccount","name":"tokenfactory","account_number":"0"}

curl -s "$LCD/cosmos/auth/v1beta1/accounts/inj1yqdrkyp37w46aant2u80v2rapuuz7eg35eqczv" \
  | jq -c '.account | {type:."@type", account_number:.base_account.account_number, sequence:.base_account.sequence}'
# {"type":"/injective.types.v1beta1.EthAccount","account_number":"0","sequence":"14"}

curl -s "$LCD/cosmos/auth/v1beta1/address_by_id/0?account_id=0" | jq -c
# {"account_address":"inj1yqdrkyp37w46aant2u80v2rapuuz7eg35eqczv"}
```

Two accounts at number 0; the by-number index serves the user one, so the module account has no id-based lookup.
(`account_id` is the supported query field — the `{id}` path segment is the
[deprecated `int64 id`](https://github.com/cosmos/cosmos-sdk/blob/release/v0.50.x/proto/cosmos/auth/v1beta1/query.proto#L199-L211)
and must be 0; the handler resolves `account_id` through the by-number unique index —
[`grpc_query.go` L31–L37](https://github.com/cosmos/cosmos-sdk/blob/release/v0.50.x/x/auth/keeper/grpc_query.go#L31-L37).)

## The full-store numbers

From a node's `application.db` at height **180,145,707**, walked offline with
[`stateward`](https://github.com/ny4rl4th0t3p/stateward); the app hash recomputed from its `CommitInfo`
(`8de46306…233e9f`) equals `Header.AppHash` of block 180,145,708 as served by the public LCD.

| `acc` store at 180,145,707               | count             |
|------------------------------------------|-------------------|
| accounts                                 | 2,144,872         |
| distinct account numbers (0 … 2,144,870) | 2,144,871         |
| global account-number sequence           | 2,144,871         |
| by-number index entries                  | 2,144,871         |
| **accounts sharing a number**            | **2** (both at 0) |

Numbering is otherwise dense and the index otherwise complete: one fossil, not a class.

## When, exactly — the tree says

IAVL creates a new leaf on every write, so a leaf's version is the block that last wrote that key. `stateward raw
--with-version` emits it:

```sh
NODE_HOME=/path/to/injective-node           # holds data/application.db (any snapshot, mounted read-only)
LCD=https://sentry.lcd.injective.network
IMG=ghcr.io/ny4rl4th0t3p/stateward:0.3.0

# the snapshot's commit version, then the next block's signed header (its app_hash is the state at V)
V=$(docker run --rm -v "$NODE_HOME":/data:ro $IMG verify --home /data --store evm --quiet | awk '/^version:/ {print $2}')
APP=$(curl -s "$LCD/cosmos/base/tendermint/v1beta1/blocks/$((V+1))" | jq -r .block.header.app_hash)

echo "version=$V app_hash=$APP"              # the LCD must still serve that height; else use an archive node

M=2e6443cca08670b1a6b0ceda12e0369a7ff6be5a   # inj19ejy8n9qsectrf4semdp9cpknflld0j6hf2fle decoded; the acc key is 0x01 ‖ address
docker run --rm -v "$NODE_HOME":/data:ro $IMG \
  raw --home /data --store acc --with-version --quiet --expect-app-hash "$APP" \
  | awk -F, -v k="01$M" '$1==k {print "module account last written at", $3}'
# module account last written at 19761600      (and HEADER MATCH on stderr)

curl -s "$LCD/cosmos/upgrade/v1beta1/applied_plan/v1.8" | jq -r .height
# 19761600
```

The module account's leaf version *is* the `v1.8` upgrade height: it was created by that upgrade's `InitGenesis`
and has not been written since — ~160M blocks. The user account was last written at 112,682,503, its 14th
transaction.

## Cause, as the code says it

Injective's `x/tokenfactory` is vendored from Osmosis. The module's first commit
(osmosis-labs/osmosis@6dda5ab66, [#1362](https://github.com/osmosis-labs/osmosis/pull/1362)) created its module
account as

```go
moduleAcc := authtypes.NewEmptyModuleAccount(types.ModuleName, authtypes.Minter, authtypes.Burner)
k.accountKeeper.SetModuleAccount(ctx, moduleAcc)
```

[`SetModuleAccount`](https://github.com/cosmos/cosmos-sdk/blob/release/v0.50.x/x/auth/keeper/keeper.go#L262-L265)
is just `SetAccount`; only `NewAccount` calls `NextAccountNumber`. The SDK's own module-account creation is the
three-step `NewEmptyModuleAccount` → `NewAccount` → `SetModuleAccount`
([`keeper.go` L247–L250](https://github.com/cosmos/cosmos-sdk/blob/release/v0.50.x/x/auth/keeper/keeper.go#L247-L250));
skipping the middle step stores the `BaseAccount` zero value, 0.

Osmosis fixed it in [#5534](https://github.com/osmosis-labs/osmosis/pull/5534) ("fix: fix the account number of
x/tokenfactory module account", 2023-06-21) — code and tests only, no migration. Injective picked up the module in
`v1.8` (2022-11-18, pre-fix form) and the corrected `CreateModuleAccount` in `v1.13.0` (2024-08-01). Between those
two releases the account was created with number 0; after them, nothing renumbered it. Osmosis and Juno
(`juno19ejy8n9qsectrf4semdp9cpknflld0j6tj7k2a` — the same 20 module-address bytes under another prefix) carry the
same account at the same number today.

## Why it isn't stable

The by-number lookup is a collections *unique* index. Its
[`Reference`](https://github.com/cosmos/cosmos-sdk/blob/collections/v0.4.0/collections/indexes/unique.go#L34-L63)
removes the entry for the *old* value's number before re-adding it, then checks for a conflict — so with two accounts
on one number, the conflict check can never fire and the entry belongs to whichever account was written last. Today
that is the user account. The first `SetAccount` on the module account — an upgrade step adjusting its permissions,
any `SetModuleAccount` — silently flips `address_by_id/0` to it; anything that later treats `number → address` as
one-to-one loses one of the two without an error.

Module accounts never sign transactions, so there is no `SignDoc` impact; the fix is a one-shot renumbering in an
upgrade handler.

## The pattern

Three chains, one vendored function, one fix that shipped as code only. The state doesn't know the code was fixed:
every API reads through the corrected keeper and reports a consistent-looking account, while the tree keeps the
number the old code wrote. That is the class of thing offline, verified reading is for.

Issues: [InjectiveFoundation/injective-core#45](https://github.com/InjectiveFoundation/injective-core/issues/45),
[osmosis-labs/osmosis#9736](https://github.com/osmosis-labs/osmosis/issues/9736).