import type { ReactNode } from "react";
import {
  CONTROLLED_PILOT_UNAVAILABLE_MESSAGE,
  type ControlledPilotSection,
  getControlledPilotUnavailableDescription,
} from "@/features/admin/controlled-pilot";
import { EmptyState } from "./states";

export function ControlledPilotUnavailableState({
  section,
  action,
}: {
  section: ControlledPilotSection;
  action?: ReactNode;
}) {
  return (
    <EmptyState
      title={`${section} unavailable`}
      description={getControlledPilotUnavailableDescription(section)}
      action={action}
    />
  );
}

export { CONTROLLED_PILOT_UNAVAILABLE_MESSAGE };
