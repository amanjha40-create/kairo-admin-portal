interface FireAndForgetMutation<TValue> {
  mutate: (value: TValue, options?: { onSettled?: () => void }) => void;
}

export interface UserActionSubmissionLock {
  current: boolean;
}

export function submitUserNoteMutation(mutation: FireAndForgetMutation<string>, body: string) {
  mutation.mutate(body);
}

export function submitUserActionMutation(
  mutation: FireAndForgetMutation<void>,
  lock: UserActionSubmissionLock,
) {
  if (lock.current) return false;
  lock.current = true;
  mutation.mutate(undefined, {
    onSettled: () => {
      lock.current = false;
    },
  });
  return true;
}
