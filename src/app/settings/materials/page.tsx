"use client";

import { CrudManager } from "@/components/CrudManager";
import type { Material } from "@/types";

export default function MaterialsPage() {
  return (
    <CrudManager<Material>
      title="Materials"
      description="Ceiling materials with their price and install time per square meter."
      path="/materials"
      rowLabel={(m) => m.name}
      columns={[
        { header: "Name", cell: (m) => m.name },
        { header: "Price / m²", cell: (m) => `${m.pricePerM2} ₾` },
        { header: "Time / m²", cell: (m) => `${m.timePerM2Minutes} min` },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        { name: "pricePerM2", label: "Price per m² (₾)", type: "number", step: "0.01" },
        { name: "timePerM2Minutes", label: "Time per m² (minutes)", type: "number", step: "0.01" },
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
