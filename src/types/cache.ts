export type Cache = {
  get(key: string): any
  set(key: string, value: any): void
}
