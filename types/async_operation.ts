export interface AsyncOperationHandle<T> {
  accepted: true;
  reused: boolean;
  operationId: string;
  acceptedAt: number;
  settled: Promise<T>;
}
