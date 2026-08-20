interface FireAndForgetMutation<TValue> {
  mutate: (value: TValue) => void;
}

export function submitUserNoteMutation(mutation: FireAndForgetMutation<string>, body: string) {
  mutation.mutate(body);
}

export function submitUserActionMutation(mutation: FireAndForgetMutation<void>) {
  mutation.mutate();
}
