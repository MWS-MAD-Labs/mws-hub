// Which of the Hub's own catalog rows Central already covers. A row is covered when Central publishes the
// application it points at: the Central application id of the row, or the row id when it names none.
export type CatalogRowRef = { id: string; sso_central_entitlement_app_id: string | null };

export function rowsCoveredByCentral(rows: CatalogRowRef[], publishedIds: string[]): CatalogRowRef[] {
  const published = new Set(publishedIds);
  return rows.filter((row) => published.has(row.sso_central_entitlement_app_id || row.id));
}
