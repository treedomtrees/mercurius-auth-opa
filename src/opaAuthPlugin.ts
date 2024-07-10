import type { FastifyInstance, FastifyPluginCallback } from 'fastify'
import type { Cache, PluginProps } from './types'
import fp from 'fastify-plugin'
import mercuriusAuth, { MercuriusAuthOptions } from 'mercurius-auth'
import mercurius from 'mercurius'
import { parseDirectiveArgumentsAST } from './parseDirectiveArgumentsAST'
import { OpenPolicyAgentClient } from './OpenPolicyAgentClient'

export const opaAuthPlugin: FastifyPluginCallback<PluginProps> = fp(
  async (app: FastifyInstance, props: PluginProps) => {
    const opa = new OpenPolicyAgentClient(props.opaOptions)

    app.decorate('opa', opa)

    app.register<MercuriusAuthOptions>(mercuriusAuth, {
      /**
       * Build MercuriusAuthContext contained in context.auth
       */
      authContext: props.authContext,

      /**
       * Validate directive
       */
      async applyPolicy(ast, parent, args, context) {
        const { path, options } = parseDirectiveArgumentsAST(ast.arguments) as {
          path: string
          options?: object
        }

        const allowed = await app.opa
          .query(path, {
            headers: context.reply.request.headers,
            parent,
            args,
            options,
          })
          .catch((err) => {
            app.log.error({ err }, 'Error while evaluating OPA policy')

            throw new mercurius.ErrorWithProps('Internal Server Error', {
              code: 'NOT_AUTHORIZED',
            })
          })

        if (!allowed.result) {
          throw new mercurius.ErrorWithProps('Not authorized', {
            code: 'NOT_AUTHORIZED',
          })
        }

        return true
      },
      authDirective: props?.authDirective ?? 'opa',
    })

    app.log.debug({}, 'OpaAuthPlugin loaded')
  },
  { name: 'opa-auth', dependencies: ['mercurius'] }
)

declare module 'fastify' {
  interface FastifyInstance {
    opa: OpenPolicyAgentClient<Cache>
  }
}
