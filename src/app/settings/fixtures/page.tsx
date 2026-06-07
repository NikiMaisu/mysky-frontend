"use client";

import { CrudManager } from "@/components/CrudManager";
import { useLang } from "@/lib/i18n";
import type { Fixture } from "@/types";

export default function FixturesPage() {
  const { t } = useLang();
  const unitLabel = (u: string) => (u === "PER_UNIT" ? t("fix.perUnit") : t("fix.perMeter"));
  return (
    <CrudManager<Fixture>
      title={t("fix.title")}
      description={t("fix.sub")}
      path="/fixtures"
      rowLabel={(f) => f.name}
      columns={[
        { header: t("set.name"), cell: (f) => f.name },
        { header: t("fix.unit"), cell: (f) => unitLabel(f.unit) },
        { header: t("fix.cost"), cell: (f) => `${f.cost} ₾` },
        { header: t("fix.installTime"), cell: (f) => `${f.installTimeMinutes} min` },
      ]}
      fields={[
        { name: "name", label: t("set.name"), type: "text" },
        {
          name: "unit",
          label: t("fix.unit"),
          type: "select",
          options: [
            { value: "PER_UNIT", label: t("fix.perUnit") },
            { value: "PER_METER", label: t("fix.perMeter") },
          ],
        },
        { name: "cost", label: t("fix.costField"), type: "number", step: "0.01" },
        { name: "installTimeMinutes", label: t("fix.timeField"), type: "number", step: "0.01" },
      ]}
      emptyForm={{ name: "", unit: "PER_UNIT", cost: "", installTimeMinutes: "" }}
      toForm={(f) => ({
        name: f.name,
        unit: f.unit,
        cost: String(f.cost),
        installTimeMinutes: String(f.installTimeMinutes),
      })}
    />
  );
}
