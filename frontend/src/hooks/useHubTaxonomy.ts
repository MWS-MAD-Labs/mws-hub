import { useEffect, useState } from "react";
import { hubApi } from "@/features/hub/api/hubApi";
import { HUB_CATEGORIES } from "@/data/hubCategories";
import type { HubTaxonomy } from "@/model/hub-model";

// Until Central has answered, or if it cannot, the original categories stand in and there are no scopes.
const FALLBACK: HubTaxonomy = {
  categories: HUB_CATEGORIES.map((category) => ({ key: category.id, name: category.label })),
  scopes: [],
};

export default function useHubTaxonomy(): HubTaxonomy {
  const [taxonomy, setTaxonomy] = useState<HubTaxonomy>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    hubApi
      .taxonomy()
      .then((value) => {
        if (!cancelled && value.categories.length > 0) setTaxonomy(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return taxonomy;
}
