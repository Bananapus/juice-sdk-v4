export interface AsyncData<T> {
  isLoading: boolean;
  data: T | undefined | null;
}

const AsyncDataNone: AsyncData<any> = {
  isLoading: false,
  data: undefined,
};

export { AsyncDataNone };
