import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

// Staging only: PRODUCTION_URL is set on the staging server and not on the real one, so the real one shows nothing.
export default function EnvironmentBanner() {
  const [productionUrl, setProductionUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ data: { production_url: string | null } }>("/api/public-config")
      .then((response) => {
        if (active) setProductionUrl(response?.data?.production_url ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!productionUrl) return null;

  return (
    <p
      role="note"
      className="bg-[#8a6419] px-3 py-2 text-center text-xs font-semibold leading-5 text-white"
    >
      Ini versi uji coba Hub. Perubahan di sini tidak dipakai. Untuk pekerjaan
      sebenarnya, buka{" "}
      <a href={productionUrl} className="underline underline-offset-2">
        {productionUrl}
      </a>
    </p>
  );
}
