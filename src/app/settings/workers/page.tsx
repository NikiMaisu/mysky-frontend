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
        { header: t("wrk.email"), cell: (w) => w.email },
      ]}
      fields={[
        { name: "name", label: t("set.name"), type: "text" },
        { name: "email", label: t("wrk.email"), type: "email" },
        {
          name: "password",
          label: t("wrk.password"),
          type: "password",
          skipIfEmpty: true,
          hintOnEdit: t("wrk.passwordKeep"),
        },
      ]}
      emptyForm={{ name: "", email: "", password: "" }}
      toForm={(w) => ({ name: w.name, email: w.email, password: "" })}
    />
  );
}
