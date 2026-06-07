"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderForm } from "@/components/OrderForm";
import { apiFetch, ApiError } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import type { Order } from "@/types";

export default function EditOrderPage() {
  const params = useParams<{ id: string }>();
  const { t } = useLang();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setOrder(await apiFetch<Order>(`/orders/${params.id}`));
      } catch (e) {
        setError(e instanceof ApiError && e.status === 404 ? t("form.notFound") : t("form.loadFail"));
      }
    })();
  }, [params.id, t]);

  if (error) return <p className="ms-banner error">{error}</p>;
  if (!order) return <div className="ms-center">{t("common.loading")}</div>;
  return <OrderForm initial={order} />;
}
