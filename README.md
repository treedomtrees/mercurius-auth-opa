# @treedom/mercurius-auth-opa

<a href="https://www.treedom.net/it/organization/treedom/event/treedom-open-source?utm_source=github"><img src="https://badges.treedom.net/badge/f/treedom-open-source?utm_source=github" alt="plant-a-tree" border="0" /></a>

Mercurius Auth OPA is a plugin for Mercurius that adds an Authentication and Authorization directive using Open Policy Agent

__Made with ❤️ at&nbsp;&nbsp;[<img src="https://assets.treedom.net/image/upload/manual_uploads/treedom-logo-contrib_gjrzt6.png" height="24" alt="Treedom" border="0" align="top" />](#-join-us-in-making-a-difference-)__, [join us in making a difference](#-join-us-in-making-a-difference-)!

## Usage

```typescript
import { opaAuthPlugin } from "@treedom/mercurius-auth-opa";
import { opaAuthDirective } from "@treedom/mercurius-auth-opa/opaAuthDirective";

const schema = `#graphql
  ${opaAuthDirective}

  type Query {
    ping(message: String!): String! @opa(path: "my/opa/policy", options: { ... })
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
  opaEndpoint: 'https://my.opa.endpoint',
})
```

## OPA policy input

This plugin queries OPA providing the following properties as `input`

- `headers` the Fastify headers object
- `parent` the Mercurius parent object of the field/object which got queried
- `args` the Mercurius args object of the field/object which got queried
- `options` static untyped properties defined in the directive arguments _(optional)_

### Example Rego Policy

Let's imagine a GraphQL server which accept requests authorized using JWTs containing the `role` property in their claims.
The following Rego uses a hypotetical `oidc.verify_token` that validates the JWT signature and returns the token claims
or false if the token is not valid.

```rego
package my.opa.policy

import rego.v1
import data.oidc

default allow := false

allow if {
    user := oidc.verify_token(input.headers.authorization)

    user
    user.role = "admin"
}
```

## Custom directive

The authorization directive can be customized registering a custom one in the schema and specifying its name in the plugin configuration

```graphql
scalar OpaOptions
directive @policy(path: String!, options: OpaOptions) on OBJECT | FIELD_DEFINITION
```

```typescript
app.register(opaAuthPlugin, {
  // ...
  authDirective: 'policy'
})
```

## OPA Options

This plugins uses Styra's `@styra/opa` SDK to perform queries to the OPA server. Its options can be changed via configuration.
See the [official documentation](https://styrainc.github.io/opa-typescript/)

```typescript
app.register(opaAuthPlugin, {
  // ...
  opaOptions: {
    // ...
  }
})
```

## Native Node.js fetch

This plugin relies on `@styra/opa` which internally relies on _native Node.js fetch_ which is available as an **experimental**
feature from _Node.js 16_ and as a **stable** feature in _Node.js 22_

## 🌳 Join Us in Making a Difference! 🌳

We invite all developers who use Treedom's open-source code to support our mission of sustainability by planting a tree with us. By contributing to reforestation efforts, you help create a healthier planet and give back to the environment. Visit our [Treedom Open Source Forest](https://www.treedom.net/en/organization/treedom/event/treedom-open-source) to plant your tree today and join our community of eco-conscious developers.

Additionally, you can integrate the Treedom GitHub badge into your repository to showcase the number of trees in your Treedom forest and encourage others to plant new ones. Check out our [integration guide](https://github.com/treedomtrees/.github/blob/main/TREEDOM_BADGE.md) to get started.

Together, we can make a lasting impact! 🌍💚

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.

## License

This project is licensed under the MIT License.