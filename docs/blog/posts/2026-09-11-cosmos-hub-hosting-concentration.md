---
draft: true
date: 2026-09-11
categories:
  - Cosmos Hub
  - nodemap
authors:
  - ny4rl4th0t3p
hide:
  - navigation
---

# Half of the Cosmos Hub's peer connections land on three hosting providers

Of the roughly 500 `cosmoshub-4` nodes a public-RPC crawl can observe, about 28% sit in Hetzner's network and about
40% of the peer connections those nodes report terminate there. The top three providers — Hetzner, OVH, and Amazon —
hold 47% of the nodes and 50% of the connections. Measured hourly since 2026-09-04 from GitHub's network, and before
that from two other vantage points; the numbers move by a point or two between runs and the ranking does not move at
all. Live on the [map](https://ny4rl4th0t3p.github.io/nodemap-ui/), hosting concentration card.

<!-- more -->

## Reproduction — one binary, one seeds file, two free databases

```sh
go install github.com/ny4rl4th0t3p/nodemap@v0.3.0

# the instance's seed list (the chain-registry rpc entries for cosmoshub-4) and the DB-IP Lite databases (CC BY 4.0)
curl -fsSLO https://raw.githubusercontent.com/ny4rl4th0t3p/nodemap-ui/main/instance/seeds/cosmoshub.json
M=$(date -u +%Y-%m)
curl -fsSL "https://download.db-ip.com/free/dbip-country-lite-$M.mmdb.gz" | gunzip > country.mmdb
curl -fsSL "https://download.db-ip.com/free/dbip-asn-lite-$M.mmdb.gz"     | gunzip > asn.mmdb

nodemap -seeds cosmoshub.json -chain cosmoshub-4 -geo-country country.mmdb -geo-asn asn.mmdb -out out

jq -r '
  (.public_nodes + .non_public_nodes) as $n
  | "observed \($n) nodes, \(.public_nodes) answering RPC",
    (.asns[0:3][] | "\(.org): \(.nodes) nodes (\(.share * 100 | round)%), \(.connection_share * 100 | round)% of connections"),
    "top 3: \(([.asns[0:3][] | .share] | add) * 100 | round)% of nodes, \(([.asns[0:3][] | .connection_share] | add) * 100 | round)% of connections"
' out/current.json
```

About a minute and a half at the default 16 workers (a couple of minutes end to end on a GitHub runner, six on a
4-core VM at 4 workers), two or three requests per node, nothing but the RPC port each node advertises itself.

## The numbers

Eight runs, 2026-09-02 to 2026-09-04, three vantage points: a small VM, a workstation, GitHub Actions runners.

| Measure                                   | Range across runs        |
|-------------------------------------------|--------------------------|
| Observed nodes                            | 471 – 545                |
| Nodes answering RPC                       | 33 – 35                  |
| Hetzner, share of nodes                   | 27% – 30%                |
| Hetzner, share of reported connections    | 39% – 41%                |
| Top 3 providers, share of nodes           | 45% – 48%                |
| Top 3 providers, share of connections     | 49% – 52%                |
| Next provider after the top three         | Allnodes, ~3% of nodes   |

The connection share is the number that matters for the "what if" question: a provider hosting a quarter of the nodes
but carrying two fifths of the mesh's connections is where the well-connected nodes are, not merely where many nodes
are.

## How it is measured, and what "connection" means

The crawler dials each seed's `/status` and `/net_info`, then dials every peer a responder lists, on the RPC port that
peer advertises, once. Nodes that answer are counted with what they say about themselves; nodes that do not answer are
counted from the peer lists that name them. Every observed IP is mapped to a country and an autonomous system with the
DB-IP Lite databases.

A *reported connection* is one entry in one responder's peer list. Each entry is a mention for the responder and a
mention for the peer; a connection reported from both ends counts twice. A provider's connection share is the
mentions landing on nodes hosted there over all mentions. No edge is stored, in memory or on disk: mentions are folded
into per-node counters as they arrive, and the counters are summed by provider at the end. The
[field policy](https://github.com/ny4rl4th0t3p/nodemap#what-it-publishes) is enforced by tests; the crawler cannot
write a node id, a peer edge, a validator identity, or a per-node version.

## Limitations

- **Observed is not total.** The population is what 35 responders' peer lists reach: about 500 nodes. Nodes that no
  responder peers with are invisible. The shares are shares of that population.
- **93% of the population is peer-reported.** Their country and provider come from the IP a responder saw them at;
  their software is whatever the responder relayed. Nothing about them is verified by dialing them.
- **Connections are mentions, not sessions.** A node listed by many responders collects many mentions; the metric
  rewards being well-known to public nodes, which is the point, but it is not a byte count.
- **Geolocation is approximate.** DB-IP Lite places an IP in a country and an AS; a node behind a load balancer is
  placed where the balancer is unless it advertises its own listen address.
- **Vantage matters for connectivity, not for concentration.** The share of nodes in one connected mesh reads 99% from
  the VM and the workstation and 93% from GitHub's runners, consistently: one responder reachable only from GitHub
  brings a peer set that overlaps with nobody else's. The provider shares do not move with vantage.

## What it does and does not say

It says the Hub's node layer — full nodes, sentries, public RPC servers — leans on three companies, and on one of them
in particular, more by connectivity than by count. It says nothing about voting power: validators behind sentries are
invisible to this crawl by design, and a validator with an open RPC is counted but never listed. Whether the chain
keeps producing blocks when a provider goes dark depends on where stake sits, which this map does not know and will
not learn. What it can show, from now on, is whether the number moves.

Live: [nodemap · cosmoshub-4](https://ny4rl4th0t3p.github.io/nodemap-ui/). Crawler:
[ny4rl4th0t3p/nodemap](https://github.com/ny4rl4th0t3p/nodemap). Instance:
[ny4rl4th0t3p/nodemap-ui](https://github.com/ny4rl4th0t3p/nodemap-ui).