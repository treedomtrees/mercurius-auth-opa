import type { AuthContextHandler } from 'mercurius-auth'
import type { MercuriusContext } from 'mercurius'
import type { Options } from '@styra/opa'

export type PluginProps<TContext = MercuriusContext> = {
  opaEndpoint?: string
  opaOptions?: Options

  /**
   * @default opa
   */
  authDirective?: string

  authContext?: AuthContextHandler<TContext>
}
