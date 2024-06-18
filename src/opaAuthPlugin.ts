import type { FastifyInstance, FastifyPluginCallback } from 'fastify'
import type { PluginProps } from './types/pluginProps'
import fp from 'fastify-plugin'
import { OPAClient } from '@styra/opa'
import mercuriusAuth, { MercuriusAuthOptions } from 'mercurius-auth'
import mercurius from 'mercurius'

export const opaAuthPlugin: FastifyPluginCallback<PluginProps> = fp(
  async (app: FastifyInstance, props: PluginProps) => {
    const opa = new OPAClient(props.opaEndpoint, props.opaOptions)

    app.register<MercuriusAuthOptions>(mercuriusAuth, {
      /**
       * Build MercuriusAuthContext contained in context.auth
       */
      authContext: props.authContext,

      /**
       * Validate directive
       */
      async applyPolicy(ast, parent, args, context) {
        const path = ast.arguments.find(
          (argument) => argument?.name?.value === 'path'
        )?.value?.value as string

        const allowed = await opa
          .evaluate(path, {
            headers: context.reply.request.headers,
            parent,
            args,
          })
          .catch((err) => {
            app.log.error({ err }, 'Error while evaluating OPA policy')

            throw new mercurius.ErrorWithProps('Internal Server Error', {
              code: 'NOT_AUTHORIZED',
            })
          })

        if (!allowed) {
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
