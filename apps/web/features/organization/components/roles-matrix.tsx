import { memberRoles, permissions } from "../mock-data";

export function RolesMatrix() {
  return (
    <section aria-label="Roles and permissions">
      <h2 className="mb-3 text-[22px] font-bold">Roles and permissions</h2>
      <table className="w-full border-t-2 border-ink text-left">
        <thead>
          <tr className="text-xs uppercase tracking-[0.12em] text-muted">
            <th className="py-2 font-bold">Action</th>
            {memberRoles.map((r) => (
              <th key={r} className="py-2 text-center font-bold">{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p.action} className="border-t border-line">
              <td className="py-3">{p.action}</td>
              {memberRoles.map((r) => (
                <td key={r} className="py-3 text-center">
                  {p.allowed.includes(r) ? <span className="font-bold text-blue">●<span className="sr-only">Allowed</span></span> : <span className="text-muted">—<span className="sr-only">Not allowed</span></span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
