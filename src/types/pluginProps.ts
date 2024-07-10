import type { AuthContextHandler } from 'mercurius-auth'
import type { MercuriusContext } from 'mercurius'
import { OpenPolicyAgentClientProps } from './openPolicyAgentClientProps'
import { Cache } from './cache'

export type PluginProps<
  TContext = MercuriusContext,
  TCache extends Cache = Cache,
> = {
  opaOptions?: OpenPolicyAgentClientProps<TCache>

  /**
   * @default opa
   */
  authDirective?: string

  authContext?: AuthContextHandler<TContext>
}
