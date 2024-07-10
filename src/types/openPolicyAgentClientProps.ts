import type { Cache } from './cache'

export type OpenPolicyAgentClientProps<TCache extends Cache> = {
  url: string
  opaVersion?: string
  method?: 'POST' | 'GET'
  cache?: TCache
}
