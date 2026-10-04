import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { request } from "./api";
import { demoClinicians, demoList, demoOverview } from "./demo";
import type { Clinician, Overview, Page } from "./types";
export function useList<T>(
  resource: string,
  params: URLSearchParams,
  enabled = true,
) {
  const { session } = useAuth();
  return useQuery({
    queryKey: [
      resource,
      params.toString(),
      session?.user._id,
      session?.user.role,
      session?.demo,
    ],
    queryFn: ({ signal }) =>
      session?.demo
        ? Promise.resolve(demoList<T>(resource, params))
        : request<Page<T>>(`/admin/${resource}?${params}`, session?.token, {
            signal,
          }),
    enabled: !!session && enabled,
  });
}
export function useOverview(days: number) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["overview", days, session?.user.role, session?.demo],
    queryFn: ({ signal }) =>
      session?.demo
        ? Promise.resolve(demoOverview(days, session.user.role === "support"))
        : request<Overview>(`/admin/overview?days=${days}`, session?.token, {
            signal,
          }),
    enabled: !!session,
  });
}
export function useSave(resource: string, id?: string) {
  const { session } = useAuth(),
    client = useQueryClient();
  return useMutation({
    mutationFn: async (
      values: unknown,
    ): Promise<{ preview: boolean; data?: unknown }> => {
      if (session?.demo) return { preview: true };
      const data = await request(
        `/admin/${resource}${id ? `/${id}` : ""}`,
        session?.token,
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(values),
        },
      );
      return { preview: false, data };
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [resource] });
      void client.invalidateQueries({ queryKey: ["overview"] });
      void client.invalidateQueries({ queryKey: ["audit"] });
      if (resource === "staff")
        void client.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
// The clinician directory is small and returned as a plain array, not a page.
export function useClinicians() {
  const { session } = useAuth();
  return useQuery({
    queryKey: [
      "care-team/clinicians",
      session?.user._id,
      session?.user.role,
      session?.demo,
    ],
    queryFn: ({ signal }) =>
      session?.demo
        ? Promise.resolve(demoClinicians)
        : request<Clinician[]>("/admin/care-team/clinicians", session?.token, {
            signal,
          }),
    enabled: !!session,
  });
}
// Approve, decline, assign and end don't fit useSave's POST/PATCH-by-id shape
// (they use sub-paths and DELETE), so they share this hook. Any of them can
// change both link lists and clinician patient counts, so all are refreshed.
export function useCareTeamAction() {
  const { session } = useAuth(),
    client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      path,
      method = "POST",
      body,
    }: {
      path: string;
      method?: "POST" | "DELETE";
      body?: unknown;
    }): Promise<{ preview: boolean }> => {
      if (session?.demo) return { preview: true };
      await request(`/admin/care-team/${path}`, session?.token, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { preview: false };
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["care-team/links"] });
      void client.invalidateQueries({ queryKey: ["care-team/clinicians"] });
      void client.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
