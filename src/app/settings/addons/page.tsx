"use client";

import { CrudManager } from "@/components/CrudManager";
import { useLang } from "@/lib/i18n";
import type { Addon } from "@/types";

export default function AddonsPage() {
  const { t } = useLang();
  const catLabel = (c: string) =>
    c === "BLINDS_RAILING" ? t("add.cat.blinds") : c === "HVAC_CUTOUT" ? t("add.cat.hvac") : t("add.cat.other");
  return (
    <CrudManager<Addon>
      title={t("add.title")}
      description={t("add.sub")}
      path="/addons"
      rowLabel={(a) => a.name}
      columns={[
        { header: t("set.name"), cell: (a) => a.name },
        { header: t("add.category"), cell: (a) => catLabel(a.category) },
        { header: t("fix.cost"), cell: (a) => `${a.cost} ₾` },
        { header: t("fix.installTime"), cell: (a) => `${a.installTimeMinutes} min` },
      ]}
      fields={[
        { name: "name", label: t("set.name"), type: "text" },
        {
          name: "category",
          label: t("add.category"),
          type: "select",
          options: [
            { value: "BLINDS_RAILING", label: t("add.cat.blinds") },
            { value: "HVAC_CUTOUT", label: t("add.cat.hvac") },
            { value: "OTHER", label: t("add.cat.other") },
          ],
        },
        { name: "cost", label: t("fix.costField"), type: "number", step: "0.01" },
        { name: "installTimeMinutes", label: t("fix.timeField"), type: "number", step: "1" },
      ]}
      emptyForm={{ name: "", category: "OTHER", cost: "", installTimeMinutes: "" }}
      toForm={(a) => ({
        name: a.name,
        category: a.category,
        cost: String(a.cost),
        installTimeMinutes: String(a.installTimeMinutes),
      })}
    />
  );
}
