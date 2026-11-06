// The landing page's content. Each area is a kind of problem; each project states what it covers. Detail belongs in the
// project's own repository or documentation, so each summary stays to a sentence or two.

export interface Link {
  label: string;
  href: string;
  note?: string;
}

// A finding is a post on the blog, and the issues it was filed as, if any.
export interface Finding {
  title: string;
  post: string;
  filed?: Link[];
}

export interface Part {
  name: string;
  href: string;
  version: string;
  summary: string;
}

export interface Project {
  name: string;
  href: string; // the repository, or the documentation for a suite
  version?: string;
  scope: string;
  summary: string;
  links?: Link[];
  findings?: Finding[];
  parts?: Part[];
}

export interface Area {
  id: string;
  title: string;
  summary: string;
  projects: Project[];
}

export const findingsUrl = '/blog/';

const post = (slug: string) => `${findingsUrl}${slug}/`;
const issue = (repo: string, number: number): Link => ({
  label: `${repo}#${number}`,
  href: `https://github.com/${repo}/issues/${number}`,
});

export const areas: Area[] = [
  {
    id: 'game-backends',
    title: 'Game backends',
    summary: 'Servers for multiplayer games that a small team can run on one cheap machine.',
    projects: [
      {
        name: 'playhold',
        href: 'https://github.com/ny4rl4th0t3p/playhold',
        version: 'v0.2.0, early development',
        scope: 'Turn-based web games first',
        summary:
          'A self-hosted game backend in Go, built from authoritative rooms and composable modules. Matches survive a restart, a crash and a deploy, and it needs very little: one CPU core and 1 GB of memory hold 500 games at once.',
      },
    ],
  },
  {
    id: 'measurement',
    title: 'Measurement and verification',
    summary: 'Checking what public registries and node networks declare against what is actually live.',
    projects: [
      {
        name: 'chain-registry-sentinel',
        href: 'https://github.com/ny4rl4th0t3p/chain-registry-sentinel',
        version: 'v0.8.3',
        scope: 'cosmos/chain-registry',
        summary:
          'A GitHub Action that checks every endpoint in cosmos/chain-registry against what is actually live, and opens pull requests with the evidence to fix what is not.',
        links: [
          { label: 'Probe specification', href: 'https://github.com/ny4rl4th0t3p/chain-registry-sentinel/blob/main/PROBES.md' },
        ],
        findings: [
          {
            title: '~60% of the endpoints in cosmos/chain-registry fail liveness',
            post: post('60-of-the-endpoints-in-cosmoschain-registry-fail-liveness'),
            filed: [issue('cosmos/chain-registry', 7866)],
          },
        ],
      },
      {
        name: 'nodemap',
        href: 'https://github.com/ny4rl4th0t3p/nodemap',
        version: 'v0.3.2',
        scope: 'CometBFT networks',
        summary:
          'A public, aggregate map of the nodes in a CometBFT network: where they are, who hosts them and which versions they run, private by construction.',
        links: [
          { label: 'Live map', href: 'https://ny4rl4th0t3p.github.io/nodemap-ui/' },
          { label: 'Instance', href: 'https://github.com/ny4rl4th0t3p/nodemap-ui' },
        ],
        findings: [
          {
            title: "Half of the Cosmos Hub's peer connections land on three hosting providers",
            post: post('half-of-the-cosmos-hubs-peer-connections-land-on-three-hosting-providers'),
          },
        ],
      },
      {
        name: 'stateward',
        href: 'https://github.com/ny4rl4th0t3p/stateward',
        version: 'v0.3.0',
        scope: 'Cosmos SDK application state',
        summary:
          "Reads a Cosmos SDK chain's on-disk state offline and proves it is the state the network committed, with no node, chain binary or replay.",
        findings: [
          {
            title: 'DenomOwners under-reports holders on cosmoshub-4',
            post: post('denomowners-under-reports-holders-on-cosmoshub-4'),
            filed: [issue('cosmos/gaia', 4122)],
          },
          {
            title: 'A module account at account_number 0, three chains deep',
            post: post('a-module-account-at-account_number-0-three-chains-deep'),
            filed: [issue('InjectiveFoundation/injective-core', 45), issue('osmosis-labs/osmosis', 9736)],
          },
          {
            title: 'TAC: what the exploit left in the tree',
            post: post('tac-what-the-exploit-left-in-the-tree'),
          },
        ],
      },
    ],
  },
  {
    id: 'operations',
    title: 'Chain launch and operations',
    summary: 'Turning launch coordination, genesis assembly and faucets into software you host yourself.',
    projects: [
      {
        name: 'Seedward',
        href: 'https://ny4rl4th0t3p.github.io/seedward-suite',
        scope: 'Cosmos SDK chain launches',
        summary:
          'A suite for launching chains under an M-of-N committee, with a rehearsed genesis and a tamper-evident record of every decision.',
        links: [{ label: 'Demo', href: 'https://ny4rl4th0t3p.github.io/seedward-suite/demo/' }],
        parts: [
          {
            name: 'chaincoord',
            href: 'https://github.com/ny4rl4th0t3p/seedward-chaincoord',
            version: 'v1.0.0',
            summary: 'The coordination server, with a hash-chained audit log.',
          },
          {
            name: 'Web UI',
            href: 'https://github.com/ny4rl4th0t3p/seedward-chaincoord-web',
            version: 'v0.3.x, beta',
            summary: 'The browser front end, validating gentxs client-side.',
          },
          {
            name: 'Rehearsal',
            href: 'https://github.com/ny4rl4th0t3p/seedward-rehearsal',
            version: 'v0.4.x, pre-release',
            summary: 'Boots the candidate genesis and checks it before launch.',
          },
          {
            name: 'gentool',
            href: 'https://github.com/ny4rl4th0t3p/seedward-gentool',
            version: 'v1.0.0',
            summary: 'Assembles a validated genesis from declarative inputs.',
          },
          {
            name: 'gentxvalidate',
            href: 'https://github.com/ny4rl4th0t3p/seedward-libs',
            version: 'v1.0.0',
            summary: 'Validates gentxs in Go and in the browser.',
          },
        ],
      },
      {
        name: 'pour',
        href: 'https://github.com/ny4rl4th0t3p/pour',
        version: 'v0.9.x, pre-1.0',
        scope: 'Cosmos SDK chains',
        summary:
          'A multi-chain faucet in a single static Go binary, with a layered abuse gate and per-address rate limits.',
        links: [
          { label: 'Documentation', href: 'https://ny4rl4th0t3p.github.io/pour' },
          { label: 'Design document', href: 'https://github.com/ny4rl4th0t3p/pour/blob/main/docs/DESIGN.md' },
        ],
      },
    ],
  },
];