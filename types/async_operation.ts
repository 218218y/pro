export interface AsyncOperationHandle<T> {
  operationId: string;
  acceptedAt: number;
  settled: Promise<T>;
}
