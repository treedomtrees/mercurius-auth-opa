import { beforeEach, test } from 'node:test'
import { deepStrictEqual } from 'node:assert'
import fastify from 'fastify'
import { testLogger } from './helpers/testLogger'
import { opaAuthPlugin } from '../src'
import mercurius from 'mercurius'
import { createMercuriusTestClient } from 'mercurius-integration-testing'
import fs from 'node:fs'
import path from 'node:path'
import { MockAgent, setGlobalDispatcher } from 'undici'
import sinon from 'sinon'
import { MockInterceptor } from 'undici-types/mock-interceptor'

const mockAgent = new MockAgent()
mockAgent.disableNetConnect()
setGlobalDispatcher(mockAgent)

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
    opaOptions: {
      url: 'http://opa.test:3000',
    },
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
ping(message: String!): String! @opa(path: "query/ping", options: { bar: "foo", baz: 123, qux: true, bing: { bong: "doo" }, fl: 1.34, n: null, arr: [{a: "b"}, {c: "d"}] })
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
    opaOptions: {
      url: 'http://opa.test:3000',
    },
  })

  const opaPolicyMock = sinon
    .stub<never, ReturnType<MockInterceptor.MockReplyOptionsCallback>>()
    .returns({
      statusCode: 200,
      data: { result: true },
      responseOptions: { headers: { 'Content-Type': 'application/json' } },
    })

  mockAgent
    .get('http://opa.test:3000')
    .intercept({
      path: '/v1/data/query/ping',
      method: 'POST',
    })
    .reply(opaPolicyMock)

  const testClient = createMercuriusTestClient(app)
  const response = await testClient.query(`#graphql
    query { ping(message: "pong") }
  `)

  deepStrictEqual(response, { data: { ping: 'pong' } })

  const body = JSON.parse(opaPolicyMock.firstCall?.firstArg?.body)

  deepStrictEqual(body?.input?.args, { message: 'pong' })
  deepStrictEqual(body?.input?.options, {
    bar: 'foo',
    baz: 123,
    qux: true,
    bing: { bong: 'doo' },
    fl: 1.34,
    n: null,
    arr: [{ a: 'b' }, { c: 'd' }],
  })
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
    opaOptions: {
      url: 'http://opa.test:3000',
    },
  })

  mockAgent
    .get('http://opa.test:3000')
    .intercept({
      path: '/v1/data/query/ping',
      method: 'POST',
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

test('authenticated query should succeed when opa path starts with slash', async () => {
  const app = fastify({ logger: testLogger })

  const schema = `#graphql
${fs.readFileSync(path.join(__dirname, '../../../src/opaAuthDirective.gql'), 'utf-8')}
type Query {
ping(message: String!): String! @opa(path: "/query/ping", options: { bar: "foo", baz: 123, qux: true, bing: { bong: "doo" }, fl: 1.34, n: null, arr: [{a: "b"}, {c: "d"}] })
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
    opaOptions: {
      url: 'http://opa.test:3000',
    },
  })

  const opaPolicyMock = sinon
    .stub<never, ReturnType<MockInterceptor.MockReplyOptionsCallback>>()
    .returns({
      statusCode: 200,
      data: { result: true },
      responseOptions: { headers: { 'Content-Type': 'application/json' } },
    })

  mockAgent
    .get('http://opa.test:3000')
    .intercept({
      path: '/v1/data/query/ping',
      method: 'POST',
    })
    .reply(opaPolicyMock)

  const testClient = createMercuriusTestClient(app)
  const response = await testClient.query(`#graphql
    query { ping(message: "pong") }
  `)

  deepStrictEqual(response, { data: { ping: 'pong' } })

  const body = JSON.parse(opaPolicyMock.firstCall?.firstArg?.body)

  deepStrictEqual(body?.input?.args, { message: 'pong' })
  deepStrictEqual(body?.input?.options, {
    bar: 'foo',
    baz: 123,
    qux: true,
    bing: { bong: 'doo' },
    fl: 1.34,
    n: null,
    arr: [{ a: 'b' }, { c: 'd' }],
  })
})

