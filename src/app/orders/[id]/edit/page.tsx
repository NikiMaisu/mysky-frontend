"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderForm } from "@/components/OrderForm";
import { apiFetch, ApiError } from "@/lib/api";
import type { Order } from "@/types";

export default function EditOrderPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setOrder(await apiFetch<Order>(`/orders/${params.id}`));
      } catch (e) {
        setError(e instanceof ApiError && e.status === 404 ? "Order not found." : "Failed to load order.");
      }
    })();
  }, [params.id]);

  if (error) return <p className="ms-banner error">{error}</p>;
  if (!order) return <div className="ms-center">Loading…</div>;
  return <OrderForm initial={order} />;
}
