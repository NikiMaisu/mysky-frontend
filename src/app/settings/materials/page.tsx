"use client";

import { CrudManager } from "@/components/CrudManager";
import { useLang } from "@/lib/i18n";
import type { Material } from "@/types";

export default function MaterialsPage() {
  const { t } = useLang();
  return (
    <CrudManager<Material>
      title={t("mat.title")}
      description={t("mat.sub")}
      path="/materials"
      rowLabel={(m) => m.name}
      columns={[
        { header: t("set.name"), cell: (m) => m.name },
        { header: t("mat.pricePerM2"), cell: (m) => `${m.pricePerM2} ₾` },
        { header: t("mat.timePerM2"), cell: (m) => `${m.timePerM2Minutes} min` },
      ]}
      fields={[
        { name: "name", label: t("set.name"), type: "text" },
        { name: "pricePerM2", label: t("mat.priceField"), type: "number", step: "0.01" },
        { name: "timePerM2Minutes", label: t("mat.timeField"), type: "number", step: "1" },
      ]}
      emptyForm={{ name: "", pricePerM2: "", timePerM2Minutes: "" }}
      toForm={(m) => ({
        name: m.name,
        pricePerM2: String(m.pricePerM2),
        timePerM2Minutes: String(m.timePerM2Minutes),
      })}
    />
  );
}
