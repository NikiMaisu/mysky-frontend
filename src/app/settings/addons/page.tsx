"use client";

import { CrudManager } from "@/components/CrudManager";
import { useLang } from "@/lib/i18n";
import type { Addon } from "@/types";

export default function AddonsPage() {
  const { t } = useLang();
  return (
    <CrudManager<Addon>
      title={t("add.title")}
      description={t("add.sub")}
      path="/addons"
      rowLabel={(a) => a.name}
      columns={[
        { header: t("set.name"), cell: (a) => a.name },
        { header: t("fix.cost"), cell: (a) => `${a.cost} ₾` },
        { header: t("fix.installTime"), cell: (a) => `${a.installTimeMinutes} min` },
      ]}
      fields={[
        { name: "name", label: t("set.name"), type: "text" },
        { name: "cost", label: t("fix.costField"), type: "number", step: "0.01" },
        { name: "installTimeMinutes", label: t("fix.timeField"), type: "number", step: "1" },
      ]}
      emptyForm={{ name: "", cost: "", installTimeMinutes: "" }}
      toForm={(a) => ({
        name: a.name,
        cost: String(a.cost),
        installTimeMinutes: String(a.installTimeMinutes),
      })}
    />
  );
}
