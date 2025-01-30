import {
  OAuth2PropertyValue,
  PieceAuthProperty,
  Property,
  StaticDropdownProperty,
  createAction,
  StaticPropsValue,
  InputPropertyMap,
} from '@activepieces/pieces-framework';
import {
  HttpError,
  HttpHeaders,
  HttpMethod,
  HttpRequest,
  QueryParams,
  httpClient,
} from '../http';
import { assertNotNullOrUndefined } from '@activepieces/shared';

export const getAccessTokenOrThrow = (
  auth: OAuth2PropertyValue | undefined
): string => {
  const accessToken = auth?.access_token;

  if (accessToken === undefined) {
    throw new Error('Invalid bearer token');
  }

  return accessToken;
};
const joinBaseUrlWithRelativePath = ({ baseUrl, relativePath }: { baseUrl: string, relativePath: string }) => {
  const baseUrlWithSlash = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const relativePathWithoutSlash = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  return `${baseUrlWithSlash}${relativePathWithoutSlash}`
 }
 
export function createCustomApiCallAction({
  auth,
  baseUrl,
  authMapping,
  description,
  displayName,
  name,
  props,
  extraProps,
}: {
  auth?: PieceAuthProperty;
  baseUrl: (auth?: unknown) => string;
  authMapping?: (
    auth: unknown,
    propsValue: StaticPropsValue<any>
  ) => Promise<HttpHeaders>;
  //   add description as a parameter that can be null
  description?: string | null;
  displayName?: string | null;
  name?: string | null;
  props?: {
    url?: Partial<ReturnType<typeof Property.ShortText>>;
    method?: Partial<StaticDropdownProperty<HttpMethod, boolean>>;
    headers?: Partial<ReturnType<typeof Property.Object>>;
    queryParams?: Partial<ReturnType<typeof Property.Object>>;
    body?: Partial<ReturnType<typeof Property.Json>>;
    failsafe?: Partial<ReturnType<typeof Property.Checkbox>>;
    timeout?: Partial<ReturnType<typeof Property.Number>>;
  };
  extraProps?: InputPropertyMap;
}) {
 
  return createAction({
    name: name ? name : 'custom_api_call',
    displayName: displayName ? displayName : 'Custom API Call',
    description: description
      ? description
      : 'Make a custom API call to a specific endpoint',
    auth: auth ? auth : undefined,
    requireAuth: auth ? true : false,
    props: {
      url: Property.DynamicProperties({
        displayName: '',
        required: true,
        refreshers: [],
        props: async ({ auth }) => {
          return {
            url: Property.ShortText({
              displayName: 'URL',
              description: `You can either use the full URL or the relative path to the base URL 
i.e https://api.example.com/api/v1/users or /api/v1/users`,
              required: true,
              defaultValue: baseUrl(auth),
              ...(props?.url ?? {}),
            }),
          };
        },
      }),
      method: Property.StaticDropdown({
        displayName: 'Method',
        required: true,
        options: {
          options: Object.values(HttpMethod).map((v) => {
            return {
              label: v,
              value: v,
            };
          }),
        },
        ...(props?.method ?? {}),
      }),
      headers: Property.Object({
        displayName: 'Headers',
        description:
          'Authorization headers are injected automatically from your connection.',
        required: true,
        ...(props?.headers ?? {}),
      }),
      queryParams: Property.Object({
        displayName: 'Query Parameters',
        required: true,
        ...(props?.queryParams ?? {}),
      }),
      body: Property.Json({
        displayName: 'Body',
        required: false,
        ...(props?.body ?? {}),
      }),
      failsafe: Property.Checkbox({
        displayName: 'No Error on Failure',
        required: false,
        ...(props?.failsafe ?? {}),
      }),
      timeout: Property.Number({
        displayName: 'Timeout (in seconds)',
        required: false,
        ...(props?.timeout ?? {}),
      }),
      ...extraProps,
    },

    run: async (context) => {
      const { method, url, headers, queryParams, body, failsafe, timeout } =
        context.propsValue;

      assertNotNullOrUndefined(method, 'Method');
      assertNotNullOrUndefined(url, 'URL');

      let headersValue = headers as HttpHeaders;
      if (authMapping) {
        const headers = await authMapping(context.auth, context.propsValue);
        if (headers) {
          headersValue = {
            ...headersValue,
            ...headers,
          };
        }
      }
      const urlValue = url['url'] as string;
      const fullUrl = urlValue.startsWith('http://') || urlValue.startsWith('https://') ? urlValue :
                     joinBaseUrlWithRelativePath({ baseUrl: baseUrl(context.auth), relativePath: urlValue})
                     console.log('fullurl ',fullUrl)
      const request: HttpRequest<Record<string, unknown>> = {
        method,
        url: fullUrl,
        headers: headersValue,
        queryParams: queryParams as QueryParams,
        timeout: timeout ? timeout * 1000 : 0,
      };

      if (body) {
        request.body = body;
      }

      try {
        return await httpClient.sendRequest(request);
      } catch (error) {
        if (failsafe) {
          return (error as HttpError).errorMessage();
        }
        throw error;
      }
    },
  });
}

