import { sha1 } from 'object-hash'

export const getCacheKey = (resource: string, input?: unknown) => {
  return sha1({
    resource,
    input,
  })
}
