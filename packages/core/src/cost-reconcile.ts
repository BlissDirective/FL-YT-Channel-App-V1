/**
 * Provenance-linked cost reconciliation (OpenMontage Remixed list2-#6).
 *
 * Reconciles the raw per-provider cost ledger against the asset manifest so
 * spend can be read as TRUE per-asset / per-provider cost, and any drift
 * between "what the ledger says we spent" and "what the assets account for" is
 * surfaced instead of hidden. Pure — the app feeds it ledger rows + assets.
 */

export type LedgerEntry = { provider: string; usd: number; videoId?: string | null };
export type ManifestAsset = { kind: string; provider?: string | null; costUsd?: number | null };

export type ProviderSpend = { provider: string; ledgerUsd: number; assetUsd: number; delta: number };

export type CostReconciliation = {
  ledgerTotal: number;
  assetTotal: number;
  /** ledgerTotal − assetTotal: >0 = spend the manifest doesn't account for. */
  unreconciledUsd: number;
  byProvider: ProviderSpend[];
  byAssetKind: { kind: string; usd: number; count: number }[];
};

const round = (n: number) => Math.round(n * 100) / 100;

/** Reconcile a video's (or project's) ledger against its asset manifest. */
export function reconcileCosts(
  ledger: LedgerEntry[],
  assets: ManifestAsset[],
): CostReconciliation {
  const ledgerByProvider = new Map<string, number>();
  let ledgerTotal = 0;
  for (const e of ledger) {
    const usd = Number(e.usd) || 0;
    ledgerTotal += usd;
    ledgerByProvider.set(e.provider, (ledgerByProvider.get(e.provider) ?? 0) + usd);
  }

  const assetByProvider = new Map<string, number>();
  const byKind = new Map<string, { usd: number; count: number }>();
  let assetTotal = 0;
  for (const a of assets) {
    const usd = Number(a.costUsd) || 0;
    assetTotal += usd;
    const prov = a.provider ?? "unknown";
    assetByProvider.set(prov, (assetByProvider.get(prov) ?? 0) + usd);
    const k = byKind.get(a.kind) ?? { usd: 0, count: 0 };
    k.usd += usd;
    k.count += 1;
    byKind.set(a.kind, k);
  }

  const providers = new Set([...ledgerByProvider.keys(), ...assetByProvider.keys()]);
  const byProvider: ProviderSpend[] = [...providers]
    .map((provider) => {
      const l = round(ledgerByProvider.get(provider) ?? 0);
      const a = round(assetByProvider.get(provider) ?? 0);
      return { provider, ledgerUsd: l, assetUsd: a, delta: round(l - a) };
    })
    .sort((x, y) => y.ledgerUsd - x.ledgerUsd);

  const byAssetKind = [...byKind.entries()]
    .map(([kind, v]) => ({ kind, usd: round(v.usd), count: v.count }))
    .sort((x, y) => y.usd - x.usd);

  return {
    ledgerTotal: round(ledgerTotal),
    assetTotal: round(assetTotal),
    unreconciledUsd: round(ledgerTotal - assetTotal),
    byProvider,
    byAssetKind,
  };
}
