import { before, beforeEach, mock, test } from 'node:test'
import { deepStrictEqual } from 'node:assert'
import fastify from 'fastify'
import { testLogger } from './helpers/testLogger'
import { opaAuthPlugin } from '../src'
import mercurius from 'mercurius'
import { createMercuriusTestClient } from 'mercurius-integration-testing'
import fs from 'node:fs'
import path from 'node:path'
import { MockAgent, setGlobalDispatcher, fetch } from 'undici'

const mockAgent = new MockAgent()
mockAgent.disableNetConnect()
setGlobalDispatcher(mockAgent)

before(() => {
  // Replacing node builtin fetch with undici to be able to use undici's mock functionality
  mock.method(global, 'fetch', async ({ url, ...options }) => {
    /*
     * Styra's OPA client validates the response type with Zod, ensuring it is an instance of the node built-in Response
     * object.
     * However, undici's Response is not actually as an instance of the node built-in Response, which causes
     * Zod to raise an error. This workaround is implemented to satisfy Zod's requirements while still utilizing
     * undici's mock functionality in this test suite
     */
    return fetch(url, options).then(
      (response) =>
        new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })
    )
  })
})

beforeEach(() => {
  mockAgent.removeAllListeners()
})

test('unauthenticated query should succeed', async () => {
  const app = fastify({ logger: testLogger })

  const schema = `#graphql
${fs.readFileSync(path.join(__dirname, '../../../src/opaAuthDirective.gql'), 'utf-8')}
type Query {
ping(message: String!): String!
}`

  app.register(mercurius, {
    schema,
    resolvers: {
      Query: {
        ping: (source, args) => args.message,
      },
    },
  })

  app.register(opaAuthPlugin, {
    opaEndpoint: 'http://opa.test:3000',
  })

  const testClient = createMercuriusTestClient(app)
  const response = await testClient.query(`#graphql
query { ping(message: "pong") }
`)

  deepStrictEqual(response, { data: { ping: 'pong' } })
})

test('authenticated query should succeed', async () => {
  const app = fastify({ logger: testLogger })

  const schema = `#graphql
${fs.readFileSync(path.join(__dirname, '../../../src/opaAuthDirective.gql'), 'utf-8')}
type Query {
ping(message: String!): String! @opa(path: "query/ping")
}`

  app.register(mercurius, {
    schema,
    resolvers: {
      Query: {
        ping: (source, args) => args.message,
      },
    },
  })

  app.register(opaAuthPlugin, {
    opaEndpoint: 'http://opa.test:3000',
  })

  mockAgent
    .get('http://opa.test:3000')
    .intercept({
      path: '/v1/data/query/ping',
    })
    .reply(
      200,
      { result: true },
      { headers: { 'Content-Type': 'application/json' } }
    )

  const testClient = createMercuriusTestClient(app)
  const response = await testClient.query(`#graphql
query { ping(message: "pong") }
`)

  deepStrictEqual(response, { data: { ping: 'pong' } })
})

test('authenticated query should fail', async () => {
  const app = fastify({ logger: testLogger })

  const schema = `#graphql
${fs.readFileSync(path.join(__dirname, '../../../src/opaAuthDirective.gql'), 'utf-8')}
type Query {
ping(message: String!): String! @opa(path: "query/ping")
}`

  app.register(mercurius, {
    schema,
    resolvers: {
      Query: {
        ping: (source, args) => args.message,
      },
    },
  })

  app.register(opaAuthPlugin, {
    opaEndpoint: 'http://opa.test:3000',
  })

  mockAgent
    .get('http://opa.test:3000')
    .intercept({
      path: '/v1/data/query/ping',
    })
    .reply(
      200,
      { result: false },
      { headers: { 'Content-Type': 'application/json' } }
    )

  const testClient = createMercuriusTestClient(app)
  const response = await testClient.query(`#graphql
query { ping(message: "pong") }
`)

  deepStrictEqual(response, {
    data: null,
    errors: [
      {
        extensions: {
          code: 'NOT_AUTHORIZED',
        },
        locations: [
          {
            column: 9,
            line: 2,
          },
        ],
        message: 'Not authorized',
        path: ['ping'],
      },
    ],
  })
})
