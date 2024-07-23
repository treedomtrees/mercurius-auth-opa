import type { Cache } from './types'
import { request } from 'undici'
import { getCacheKey } from './getCacheKey'
import { OpenPolicyAgentClientProps } from './types/openPolicyAgentClientProps'

export class OpenPolicyAgentClient<TCache extends Cache> {
  public readonly cache: TCache | undefined
  private readonly url: string

  constructor(
    config: OpenPolicyAgentClientProps<TCache> | string,
    private readonly opaVersion = 'v1',
    private readonly method: 'POST' | 'GET' = 'POST'
  ) {
    /* istanbul ignore next */
    if (typeof config === 'object') {
      this.url = config.url

      if (config.opaVersion) {
        this.opaVersion = config.opaVersion
      }

      if (config.method) {
        this.method = config.method
      }

      if (config.cache) {
        this.cache = config.cache
      }
    } else {
      this.url = config
    }
  }

  /**
   * Query the requested OPA resource.
   *
   * @param resource Can be expressed both in dot notation or slash notation.
   * @param input OPA Query input.
   */
  public async query<TResponse = { result: boolean }>(
    resource: string,
    input?: unknown
  ): Promise<TResponse> {
    let resourcePath = resource.replace(/\./gi, '/')

    if (resourcePath.startsWith('/')) {
      resourcePath = resourcePath.substring(1, resourcePath.length)
    }

    const cacheKey = getCacheKey(resourcePath, input)
    const cached = this.cache?.get(cacheKey) as TResponse | undefined

    if (cached) {
      return cached
    }

    const res = await request(
      `${this.url}/${this.opaVersion}/data/${resourcePath}`,
      {
        method: this.method,
        body: input ? JSON.stringify({ input }) : undefined,
      }
    )

    const body = (await res.body.json()) as TResponse

    if (this.cache) {
      this.cache.set(cacheKey, body)
    }

    return body
  }
}
