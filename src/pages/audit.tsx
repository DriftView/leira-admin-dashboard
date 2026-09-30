import { useList } from "@/lib/queries";
import type { Audit } from "@/lib/types";
import { date, pretty } from "@/lib/utils";
import {
  Empty,
  ErrorBox,
  Heading,
  Loading,
  Pagination,
  Toolbar,
  useFilters,
} from "@/components/shared";
export function AuditPage() {
  const filters = useFilters(),
    query = useList<Audit>("audit", filters.query);
  return (
    <>
      <Heading
        title="A clear record of every change."
        description="Follow account, content, support, and permission changes made in this workspace."
      />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Audit log</h2>
            <p>
              Actor, action, and changed fields. Sensitive values are never
              recorded here.
            </p>
          </div>
        </div>
        <Toolbar
          filters={filters}
          placeholder="Search actor or action…"
          onRefresh={() => void query.refetch()}
        />
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorBox error={query.error} retry={() => void query.refetch()} />
        ) : query.data.items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Team member</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Changed fields</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((row) => (
                    <tr key={row._id}>
                      <td>
                        <strong>{row.actorName}</strong>
                      </td>
                      <td>{pretty(row.action.replace(".", " · "))}</td>
                      <td>
                        {pretty(row.resource)}
                        <small className="cell-subtitle">
                          {row.resourceId}
                        </small>
                      </td>
                      <td className="muted-cell">
                        {row.fields.join(", ") || "—"}
                      </td>
                      <td className="muted-cell">
                        {date(row.createdAt)}
                        <small className="cell-subtitle">
                          {new Date(row.createdAt).toLocaleTimeString()}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              {...query.data}
              onChange={(page) => filters.set({ page: String(page) })}
            />
          </>
        ) : (
          <Empty
            title="A fresh start."
            description="Changes made through the admin workspace will be recorded here."
          />
        )}
      </section>
    </>
  );
}
