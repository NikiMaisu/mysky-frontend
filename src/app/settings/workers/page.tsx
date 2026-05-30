"use client";

import { CrudManager } from "@/components/CrudManager";
import type { Worker } from "@/types";

export default function WorkersPage() {
  return (
    <CrudManager<Worker>
      title="Workers"
      description="Worker accounts. They sign in with their email and can be grouped into teams."
      path="/workers"
      rowLabel={(w) => w.name}
      columns={[
        { header: "Name", cell: (w) => w.name },
        { header: "Email", cell: (w) => w.email },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text" },
        { name: "email", label: "Email", type: "email" },
        {
          name: "password",
          label: "Password",
          type: "password",
          skipIfEmpty: true,
          hintOnEdit: "Leave blank to keep current",
        },
      ]}
      emptyForm={{ name: "", email: "", password: "" }}
      toForm={(w) => ({ name: w.name, email: w.email, password: "" })}
    />
  );
}
