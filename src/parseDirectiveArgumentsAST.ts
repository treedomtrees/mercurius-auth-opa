/* eslint @typescript-eslint/no-explicit-any: 0 */

export const parseDirectiveArgumentsAST = (args: Array<any>) => {
  const result = {}

  args.forEach((arg: any) => {
    const { name, value } = arg
    result[name.value] = parseGraphQLValueAST(value)
  })

  return result
}

const parseGraphQLValueAST = (value: any) => {
  switch (value.kind) {
    case 'StringValue':
      return value.value
    case 'IntValue':
      return parseInt(value.value, 10)
    case 'FloatValue':
      return parseFloat(value.value)
    case 'BooleanValue':
      return value.value
    case 'NullValue':
      return null
    case 'ObjectValue': {
      const obj = {}
      value.fields.forEach((field: any) => {
        obj[field.name.value] = parseGraphQLValueAST(field.value)
      })
      return obj
    }
    case 'ListValue':
      return value.values.map(parseGraphQLValueAST)
    default:
      throw new Error(`Unsupported value kind: ${value.kind}`)
  }
}
