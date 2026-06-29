"use client";

import { CrudManager } from "@/components/CrudManager";
import { useLang } from "@/lib/i18n";
import type { Worker } from "@/types";

export default function WorkersPage() {
  const { t } = useLang();
  return (
    <CrudManager<Worker>
      title={t("wrk.title")}
      description={t("wrk.sub")}
      path="/workers"
      rowLabel={(w) => w.name}
      columns={[
        { header: t("set.name"), cell: (w) => w.name },
        { header: t("wrk.email"), cell: (w) => w.email || w.phone || "—" },
      ]}
      fields={[
        { name: "name", label: t("set.name"), type: "text" },
        { name: "email", label: t("wrk.email"), type: "email", required: false },
        { name: "phone", label: t("wrk.phone"), type: "text", required: false },
        {
          name: "password",
          label: t("wrk.password"),
          type: "password",
          skipIfEmpty: true,
          hintOnEdit: t("wrk.passwordKeep"),
        },
      ]}
      emptyForm={{ name: "", email: "", phone: "", password: "" }}
      toForm={(w) => ({ name: w.name, email: w.email ?? "", phone: w.phone ?? "", password: "" })}
    />
  );
}
