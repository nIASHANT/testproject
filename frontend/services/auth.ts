import api from "@/services/api";

export type CurrentUser = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "operator" | "reader";
  is_active: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get("/auth/me");
  return response.data;
}
