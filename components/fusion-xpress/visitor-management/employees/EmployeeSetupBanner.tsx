import { EMPLOYEES_SETUP_MESSAGE } from "@/lib/employees/db-mapper";

export default function EmployeeSetupBanner() {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 space-y-2">
      <p className="font-bold">Database setup required</p>
      <p>{EMPLOYEES_SETUP_MESSAGE}</p>
      <ol className="list-decimal list-inside space-y-1 text-xs">
        <li>Open Supabase → SQL Editor</li>
        <li>
          Run{" "}
          <code className="font-mono bg-white/80 px-1 rounded">
            database/visitor_employees_patch_01.sql
          </code>
        </li>
        <li>Project Settings → API → reload schema (or wait ~1 minute)</li>
        <li>Refresh this page</li>
      </ol>
    </section>
  );
}
