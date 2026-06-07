"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OrderForm } from "@/components/OrderForm";
import type { OrderStatus } from "@/types";

function NewOrderForm() {
  const params = useSearchParams();
  const statusParam = params.get("status");
  return (
    <OrderForm
      defaultStart={params.get("start") ?? undefined}
      defaultEnd={params.get("end") ?? undefined}
      defaultClient={params.get("client") ?? undefined}
      defaultTeamId={params.get("team") ?? undefined}
      defaultMaterialId={params.get("material") ?? undefined}
      defaultSquareMeters={params.get("sqm") ?? undefined}
      defaultStatus={(statusParam as OrderStatus | null) ?? undefined}
    />
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="ms-center">…</div>}>
      <NewOrderForm />
    </Suspense>
  );
}
