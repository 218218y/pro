export interface AsyncOperationHandle<T> {
  accepted: true;
  reused: boolean;
  operationId: string;
  requestedAt: number;
  acceptedAt: number;
  settled: Promise<T>;
}
