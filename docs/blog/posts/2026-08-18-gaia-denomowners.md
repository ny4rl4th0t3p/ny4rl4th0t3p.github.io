---
date: 2026-08-18
categories:
  - Cosmos Hub
  - stateward
authors:
  - ny4rl4th0t3p
hide:
  - navigation
---

# DenomOwners under-reports holders on cosmoshub-4

On the Cosmos Hub, `x/bank`'s `DenomOwners` query silently returns an incomplete holder list for 1,248 denoms — 973 of
them come back empty, 275 partial, `uatom` itself missing 170,436 holding addresses — because the denom→address reverse
index it reads is missing ~1.96M balances that were never migrated to the modern encoding. Filed as
[cosmos/gaia#4122](https://github.com/cosmos/gaia/issues/4122). This is the long version: how it was found, how it was
dated from the tree alone, why it is the Hub's and not the SDK's, and what is actually hidden.

<!-- more -->

## The claim

`DenomOwners` / `DenomOwnersByQuery` paginate the bank store's denom→address reverse index
(`x/bank/keeper/grpc_query.go`). On `cosmoshub-4` that index is missing an entry for every balance still stored in the
legacy `Coin`-proto value encoding — entries not rewritten since before the current Int-string encoding and the index
existed. The query cannot tell "no holders" from "holders the index doesn't know about", so it serves the partial set as
if it were complete.

## Reproduction — any public Hub LCD, no tooling

A denom with on-chain holders and an **empty** owners list. Identical on two independent LCDs (Polkachu and easy2stake),
because the index is committed on-chain state:

```sh
LCD=https://cosmos-api.polkachu.com          # or: https://cosmos-lcd.easy2stake.com
DENOM=ibc%2FA63965DEF1B5459FD58F19C5B1938244B016B075DE7C813C51AE9278CA8AF5B9

curl -s "$LCD/cosmos/bank/v1beta1/denom_owners/$DENOM?pagination.limit=1000"
# {"denom_owners":[],"pagination":{"next_key":null,"total":"0"}}

curl -s "$LCD/cosmos/bank/v1beta1/balances/cosmos1dp6chezxk8zvpc0rl4xmrsam6wd6xfnw8ckrfp/by_denom?denom=$DENOM"
# {"balance":{"denom":"ibc/A63965...","amount":"80000"}}
```

The more insidious mode is the **partial** list — a mixed denom with 9 holders, 7 of them legacy-encoded, where the
query returns exactly the 2 modern ones and the response looks complete:

```sh
MIXED=ibc%2F04AA0759B8FF54DFEE563C6046050953D77079A7D212AF59E4C80FCBF98247CA
curl -s "$LCD/cosmos/bank/v1beta1/denom_owners/$MIXED?pagination.limit=100"
# {"denom_owners":[
#   {"address":"cosmos19p463jhn6he6a7d7pp6pqn932pw7vqneu2kdty","balance":{...,"amount":"27488000"}},
#   {"address":"cosmos12g3lgc6rx2getny35887sq4gdkvqd8wdvk7wan","balance":{...,"amount":"152000"}}
# ],"pagination":{"next_key":null,"total":"0"}}
```

Exactly 2. Now ask the same node, directly, about the holders it did not list:

```sh
for A in cosmos1zu668p3g4d97gwycvejkutqllug4vpcvqdjtc0 cosmos1d8754xqa9245pctlfcyv8eah468neqznjwmh3v \
         cosmos1wew52s06l3k3cz4r5ttjjaxya57sv8xk5e6tlu cosmos17svmv92kwaljn7rxh86f9fwnmnvc0a3ar4mjmh \
         cosmos1xpl2sx64ra5san4su0r0hj8z9eh5cf5dmlp576 cosmos1x54ltnyg88k0ejmk8ytwrhd3ltm84xehrnlslf \
         cosmos1zkdeaqkt48j4k3wgwqjvgz4wflx23jnj8k933c; do
  curl -s "$LCD/cosmos/bank/v1beta1/balances/$A/by_denom?denom=$MIXED" | jq -c '{addr:"'"$A"'", amount:.balance.amount}'
done
# {"addr":"cosmos1zu668…","amount":"4700000"}   … seven non-zero balances, none of them in the owners list
```

The full holder set for that denom, read from the verified bank tree (root recomputed, header-sealed) — nine holders,
and the column that decides visibility is the value encoding of each `(address, denom)` entry:

```
holders of ibc/04AA0759B8FF54DFEE563C6046050953D77079A7D212AF59E4C80FCBF98247CA (9):
  cosmos1zkdeaqkt48j4k3wgwqjvgz4wflx23jnj8k933c    3000        coin-proto
  cosmos1zu668p3g4d97gwycvejkutqllug4vpcvqdjtc0    4700000     coin-proto
  cosmos19p463jhn6he6a7d7pp6pqn932pw7vqneu2kdty    27488000    amount-string   ← returned
  cosmos1xpl2sx64ra5san4su0r0hj8z9eh5cf5dmlp576    500000      coin-proto
  cosmos1x54ltnyg88k0ejmk8ytwrhd3ltm84xehrnlslf    12756       coin-proto
  cosmos12g3lgc6rx2getny35887sq4gdkvqd8wdvk7wan    152000      amount-string   ← returned
  cosmos1d8754xqa9245pctlfcyv8eah468neqznjwmh3v    1000000     coin-proto
  cosmos1wew52s06l3k3cz4r5ttjjaxya57sv8xk5e6tlu    1000000     coin-proto
  cosmos17svmv92kwaljn7rxh86f9fwnmnvc0a3ar4mjmh    2000000     coin-proto
```

The two `amount-string` rows are exactly the two `DenomOwners` returned; the seven `coin-proto` rows are exactly the
ones it dropped, each confirmed live above with the same amount. (That denom is a fringe two-hop OSMO voucher, chosen
because nine holders fit on a screen — it is not canonical OSMO, which has ~23,667 holders; see the impact section.)

## How it was found: a census of the bank store, offline

The counts come from walking a node's `application.db` with [`stateward`](https://github.com/ny4rl4th0t3p/stateward)
(Apache-2.0) — no running node, no chain binary. It recomputes the bank store's IAVL root from the raw nodes and checks
it against the hash committed in the store's own `CommitInfo`, so every count below is a count of committed state, not
of a possibly-corrupt copy. The snapshot's identity is itself verified: the app hash recomputed from that
`CommitInfo` (`adba3064…450e7904`) equals `Header.AppHash` of block 32,417,378 — the validator-signed value, served
identically by independent public LCDs (`rbowZOv5…OeQQ=` on both) — so this is `cosmoshub-4` at height **32,417,377** by
signature, not by provider labeling.

```sh
NODE_HOME=/path/to/hub-node                 # holds data/application.db (any snapshot, mounted read-only)
LCD=https://cosmos-api.polkachu.com
IMG=ghcr.io/ny4rl4th0t3p/stateward:0.3.0

# 1. the snapshot's commit version — any store will do, a small one is quick
V=$(docker run --rm -v "$NODE_HOME":/data:ro $IMG verify --home /data --store gov --quiet | awk '/^version:/ {print $2}')

# 2. the validator-signed header of the NEXT block carries the app hash of state at V
APP=$(curl -s "$LCD/cosmos/base/tendermint/v1beta1/blocks/$((V+1))" | jq -r .block.header.app_hash)
echo "version=$V app_hash=$APP"              # the LCD must still serve that height; else use an archive node

# 3. the census, sealed against that header
docker run --rm -t --user "$(id -u):$(id -g)" -v "$NODE_HOME":/data:ro -v "$PWD/out":/out $IMG \
  census --home /data --cache-dir /out --expect-app-hash "$APP"
```

`HEADER MATCH` in the output means the counts are of the state the network signed at that height. (Or the binary:
`go install github.com/ny4rl4th0t3p/stateward/cmd/stateward@v0.3.0`, same arguments without the container paths.)

| bank store at 32,417,377                               | count         |
|--------------------------------------------------------|---------------|
| balance entries (`0x02` keys)                          | 15,754,083    |
| denom→address index entries (`0x03` keys)              | 13,789,940    |
| **missing index entries**                              | **1,964,143** |
| balance values still in the legacy Coin-proto encoding | **1,964,143** |

The two anomaly sets are the same size to the entry. Every balance stored as a bare Int string has an index entry; every
balance still stored as a Coin proto has none. Whether a holder is visible to `DenomOwners` is decided by the value
encoding of its `(address, denom)` entry — and that encoding is simply whether the entry was last written before or
after one point in the chain's history.

The same walk also re-runs x/bank's own `TotalSupply` invariant — Σ balances == stored supply, per denom, a check
production chains disable through the crisis module. Result on the same snapshot: **3,142 of 3,142 denoms match**. The
store's accounting is intact; only its reverse index is not. That result is also what makes the census trustworthy as a
decoder: a systematically wrong balance decode could not have summed to the independently stored supply for every denom.

## Dating it from the tree alone

IAVL writes a new leaf on every update, so each leaf's version is the block that last wrote that key. Bucketing the
1,964,143 legacy-encoded balances by last-write height gives a clean ceiling: **the last legacy entry was written at
19,639,593**. The Cosmos Hub's `v15` upgrade ran at height **19,639,600** — seven blocks later. Every balance touched
since carries the modern encoding and an index entry; every balance untouched since v15 is a Coin proto without one. The
oldest stratum of legacy entries sits at 8,695,000, the Vega upgrade. The live chain reports `bank: 4` in
`module_versions`, i.e. the migration sequence is recorded as complete.

The switchover was bracketed from the tree before consulting the upgrade history; the upgrade heights then landed on it.

## Cause, as the code says it

Gaia v15 ran on a pinned SDK fork (`cosmos-sdk => v0.47.10-ics-lsm`, per gaia v15's `go.mod`) whose
`x/bank/migrations/v3/store.go` ships the reverse-index build commented out
([`store.go` L21–L33 @ `v0.47.10-ics-lsm`](https://github.com/cosmos/cosmos-sdk/blob/v0.47.10-ics-lsm/x/bank/migrations/v3/store.go#L21-L33)):

```go
// x/bank/migrations/v3/store.go @ v0.47.10-ics-lsm
func MigrateStore(ctx sdk.Context, storeKey storetypes.StoreKey, cdc codec.BinaryCodec) error {
	store := ctx.KVStore(storeKey)
	// NOTE: deactivating this migration for now, as it is not required and executing it is expensive
	// err := addDenomReverseIndex(store, cdc, ctx.Logger())
	// ...
	return migrateDenomMetadata(store, ctx.Logger())
}
```

`addDenomReverseIndex` — the whole function, commented out from L32 on — held both halves of the balance migration:
the Coin→Int value re-encoding and the `0x03` index write. Nothing else is at fault along the path. The v15 upgrade
handler is a plain `RunMigrations` pass with the version map untouched
([`app/upgrades/v15/upgrades.go` L49 @ `v15.0.0`](https://github.com/cosmos/gaia/blob/v15.0.0/app/upgrades/v15/upgrades.go#L49));
it executed `Migrate2to3`, which ran its surviving half (`migrateDenomMetadata`), returned no error, and the version
map advanced legitimately. From then on the keeper's write path maintained the index on every `setBalance` — which is
why every balance touched after v15 is indexed and every balance untouched since is not. The 1.96M-entry deficit is
not a failure that happened; it is a migration that was declined and a write path that only repairs what it touches.

The skip is recorded in gaia's own changelog, and at the time it was a coherent trade-off — the same SDK change
disabled the only reader of the index:

> Skip running `addDenomReverseIndex` in `bank/v3` migration as it is prohibitively expensive to run on the Cosmos
> Hub. ([sdk-#19266](https://github.com/cosmos/cosmos-sdk/pull/19266))
> — [CHANGELOG.md L117 @ v15.1.0](https://github.com/cosmos/gaia/blob/v15.1.0/CHANGELOG.md#L117)

> Disable the `DenomOwners` query. ([sdk-#19266](https://github.com/cosmos/cosmos-sdk/pull/19266))
> — [CHANGELOG.md L39 @ v15.1.0](https://github.com/cosmos/gaia/blob/v15.1.0/CHANGELOG.md#L39)

With no reader, the index's incompleteness was unobservable and harmless. The defect is the later state: the Hub's
current SDK line no longer carries that patch — `DenomOwners` answers, as the reproduction above shows — against an
index that was never backfilled. Since then the query has quietly served every denom from an index missing every
balance nobody has moved since v15.

## Why it is the Hub's, not the SDK's

Three other chains were censused the same way, before the cause was found, to settle whether this was an ecosystem-wide
migration bug (which would have changed where and how it got reported):

| chain      | SDK line                                      | balances   | legacy-encoded / unindexed       |
|------------|-----------------------------------------------|------------|----------------------------------|
| Juno       | **stock** cosmos-sdk, same v0.45 → v0.47 jump | 685,974    | **0** (bank module at 4)         |
| Sentinel   | v0.47                                         | ~1.08M     | 0                                |
| Injective  | v0.50 fork                                    | ~3.22M     | 0                                |
| Cosmos Hub | v0.47.10-ics-lsm → v0.50                      | 15,754,083 | **1,964,143** (bank module at 4) |

Juno is the decisive control: stock SDK, the same migration path, the same version jump, zero legacy entries. The stock
`MigrateStore` runs `addDenomReverseIndex`; the fork's does not. The defect is local to the fork that the Hub ran at
v15, which is why the report went to `cosmos/gaia` and not upstream.

## What is actually hidden

Aggregate: 1,964,143 unindexed balances across 1,248 denoms — 973 with an entirely empty owners list, 275 with a
silently partial one — held by **439,949 distinct addresses** (one account carries 177 invisible denoms; it is an IBC
dust collector). All numbers at height 32,417,377; re-derivable from the census output.

By absolute count the leaders are the big pre-v15 airdrops: the Stride LST tokens (`channel-391`, ~900k holders each, ~
110–150k legacy each), Neutron's `untrn` (912,089 holders, 148,852 legacy), and `uatom` itself — 3,044,249 holders,
170,436 of them invisible (~5.6%).

By **proportion** hidden the picture inverts: the worst denoms are the early interchain — assets bridged over the lowest
IBC channels, received before v15 and dormant since:

| token   | chain                                             | invisible / total holders | `DenomOwners` shows | hidden |
|---------|---------------------------------------------------|---------------------------|---------------------|--------|
| ubtsg   | BitSong                                           | 84,563 / 84,625           | 62                  | 99.9%  |
| uiov    | Starname                                          | 1,938 / 1,943             | 5                   | 99.7%  |
| uregen  | Regen                                             | 2,876 / 2,888             | 12                  | 99.6%  |
| uiris   | IRISnet                                           | 3,661 / 3,687             | 26                  | 99.3%  |
| uxprt   | Persistence                                       | 4,307 / 4,353             | 46                  | 98.9%  |
| udvpn   | Sentinel                                          | 3,262 / 3,302             | 40                  | 98.8%  |
| uakt    | Akash                                             | 8,911 / 9,128             | 217                 | 97.6%  |
| basecro | Crypto.org                                        | 1,418 / 1,482             | 64                  | 95.7%  |
| aevmos  | Evmos                                             | 1,360 / 1,472             | 112                 | 92.4%  |
| uosmo   | Osmosis (canonical, `ibc/14F9BC3E…`, channel-141) | 20,511 / 23,667           | 3,156               | 86.7%  |
| aarch   | Archway                                           | 885 / 1,109               | 224                 | 79.8%  |
| adym    | Dymension                                         | 1,665 / 3,735             | 2,070               | 44.6%  |

"Who holds AKT on the Hub?" — the query says 217; the tree says 9,128. The gradient is dormancy, not age: the Stride
LSTs sit on an older channel than Archway or Dymension yet are only 14–16% hidden, because their holders kept touching
them past v15. Denoms created after v15 (`factory/…/ustars`, the newer `uusdc`, several Neutron cw20s) are 0% hidden —
every entry written after the migration is indexed, which confirms the v15 boundary from the modern side.

In volume, the invisible `uatom` balances add up to **221,360 ATOM** across 170,436 holders — ~1.3 ATOM each on
average, ~91% of them under 1 ATOM, 14,628 holding 1 ATOM or more, the largest single invisible balance 6,327 ATOM.
The other large invisible volumes are ~53,035 AKT, ~57,719 OSMO (canonical) and ~3.31M BTSG. Decimals verified
against `cosmos/chain-registry` (`basecro` = 8, `aevmos` and `aarch`/`adym` = 18, the rest 6).

## Impact

Airdrop snapshots, holder analytics and distribution tooling built on `DenomOwners` miss those holders and have no way
to know it: the response carries no signal that the index is incomplete, and a partial list is indistinguishable from a
small one. The legacy Coin-proto values may also surprise tooling that assumes every post-migration balance value is an
Int string.

Issue: [cosmos/gaia#4122](https://github.com/cosmos/gaia/issues/4122).