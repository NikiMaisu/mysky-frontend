"use client";

import { CrudManager } from "@/components/CrudManager";
import type { Fixture } from "@/types";

const UNIT_LABEL: Record<string, string> = {
  PER_UNIT: "per unit",
  PER_METER: "per meter",
};

export default function FixturesPage() {
  return (
    <CrudManager<Fixture>
      title="Lighting fixtures"
      description="Selectable fixtures priced per unit or per meter."
      path="/fixtures"
      rowLabel={(f) => f.name}
      columns={[
        { header: "Name", cell: (f) => f.name },
        { header: "Unit", cell: (f) => UNIT_LABEL[f.unit] ?? f.unit },
        { header: "Cost", cell: (f) => `${f.cost} ₾` },
        { header: "Install time", cell: (f) => `${f.installTimeMinutes} min` },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        {
          name: "unit",
          label: "Unit",
          type: "select",
          options: [
            { value: "PER_UNIT", label: "Per unit" },
            { value: "PER_METER", label: "Per meter" },
          ],
        },
        { name: "cost", label: "Cost (₾)", type: "number", step: "0.01" },
        { name: "installTimeMinutes", label: "Install time (minutes)", type: "number", step: "0.01" },
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
