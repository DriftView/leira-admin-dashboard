import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { request } from "./api";
import { demoList, demoOverview } from "./demo";
import type { Overview, Page } from "./types";
export function useList<T>(resource: string, params: URLSearchParams) {
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
    enabled: !!session,
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
