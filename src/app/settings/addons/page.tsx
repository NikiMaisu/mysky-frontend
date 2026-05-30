"use client";

import { CrudManager } from "@/components/CrudManager";
import type { Addon } from "@/types";

const CATEGORY_LABEL: Record<string, string> = {
  BLINDS_RAILING: "Blinds railing",
  HVAC_CUTOUT: "HVAC cutout",
  OTHER: "Other",
};

export default function AddonsPage() {
  return (
    <CrudManager<Addon>
      title="Add-ons"
      description="Named add-on instances (blinds railing, HVAC cutout, etc.) picked when creating an order."
      path="/addons"
      rowLabel={(a) => a.name}
      columns={[
        { header: "Name", cell: (a) => a.name },
        { header: "Category", cell: (a) => CATEGORY_LABEL[a.category] ?? a.category },
        { header: "Cost", cell: (a) => `${a.cost} ₾` },
        { header: "Install time", cell: (a) => `${a.installTimeMinutes} min` },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        {
          name: "category",
          label: "Category",
          type: "select",
          options: [
            { value: "BLINDS_RAILING", label: "Blinds railing" },
            { value: "HVAC_CUTOUT", label: "HVAC cutout" },
            { value: "OTHER", label: "Other" },
          ],
        },
        { name: "cost", label: "Cost (₾)", type: "number", step: "0.01" },
        { name: "installTimeMinutes", label: "Install time (minutes)", type: "number", step: "1" },
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
