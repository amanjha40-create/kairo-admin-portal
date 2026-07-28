import { listMockAdminCredentials } from "@/features/admin/auth/mock-accounts";

export async function loadDemoCredentials() {
  return listMockAdminCredentials();
}
