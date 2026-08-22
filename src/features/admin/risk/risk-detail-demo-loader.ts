import { notFound } from "@tanstack/react-router";
import { getInvestigation, type Investigation } from "@/features/admin/runtime/risk";

export interface DemoRiskDetailLoaderData {
  inv: Investigation;
}

export async function loadDemoRiskDetail(
  investigationId: string,
): Promise<DemoRiskDetailLoaderData> {
  const inv = getInvestigation(investigationId);
  if (!inv) {
    throw notFound();
  }

  return { inv };
}
