# `cors-headers`

[![NPM][npm-image]][npm-url]

A browser compatible package for providing a middleware-like function that can be used to get appropriate [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) headers with various options.

- [Installation](#installation)
- [Usage](#usage)
  - [Usage](#simple-usage-enable-all-cors-requests)
  - [Configuring CORS](#configuring-cors)
  - [Configuring CORS with Dynamic Origin](#configuring-cors-w-dynamic-origin)
  - [Enabling CORS Pre-Flight](#enabling-cors-pre-flight)
  - [Configuring CORS Asynchronously](#configuring-cors-asynchronously)
- [Configuration Options](#configuration-options)
- [License](#license)

## Installation

This module is available through the
[npm registry](https://www.npmjs.com/). Install it using your package manager:

```sh
$ pnpm add cors-headers
```

## Usage

The `cors()` function returns an object with headers key (which is a [`Headers`](https://developer.mozilla.org/en-US/docs/Web/API/Headers) instance) containing relevant CORS headers for the processed Request.

> [!NOTE]
> The code below shows the usage of this module inside of Cloudflare Workers, but using this in **any environment** should be fine as long as the environment supports browser compatible [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [`Headers`](https://developer.mozilla.org/en-US/docs/Web/API/Headers) API.

```ts
import { cors } from "cors-headers";

export default {
  async fetch(req: Request): Promise<Response> {
    const { headers } = cors(req);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // reuse the headers to return CORS enabled Responses
    return new Response("Hello World!", { status: 200, headers });
  },
};
```

### Configuring CORS

```ts
import { cors } from "cors-headers";

export default {
  async fetch(req: Request): Promise<Response> {
    const { headers } = cors(req, { origin: "https://example.com" });

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // ... some other logic
    return new Response("Hello example.com!", { status: 200, headers });
  },
};
```

### Configuring CORS with Dynamic Origin

This module supports validating the origin dynamically using a function provided
to the `origin` option. This function will receive a string that is the request origin
(or `null` if the request has no origin), with the signature
`callback(origin)`.

The `origin` callback should return any value allowed for the `origin`
option of the module, **except a function**. See the
[configuration options](#configuration-options) section for more information on all
the possible value types.

This function is designed to allow the dynamic loading of allowed origin(s) from any other source, like a database:

```ts
import { cors } from "cors-headers";

export default {
  async fetch(req: Request): Promise<Response> {
    // allowlist is an example data to get a list of origins from a your db
    const allowlist = ["http://example1.com", "http://example2.com"];

    const { headers } = cors(req, {
      origin: (reqOrigin) => {
        if (reqOrigin && allowlist.indexOf(reqOrigin) !== -1) {
          return true; // reflect (enable) the requested origin in the CORS response
        }
        return false; // else disable CORS
      },
    });

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // This response is CORS enabled for allowed domains
    return new Response("hello origin from db!", { status: 200, headers });
  },
};
```

### Enabling CORS Pre-Flight

Certain CORS requests are considered 'complex' and require an initial
`OPTIONS` request (called the "pre-flight request"). An example of a
'complex' CORS request is one that uses an HTTP verb other than
`GET`/`HEAD`/`POST` (such as `DELETE`) or that uses custom headers. To enable
pre-flighting, you must handle `OPTIONS` requests:

```ts
import { cors } from "cors-headers";

export default {
  async fetch(req: Request): Promise<Response> {
    const { headers } = cors(req, {
      allowedMethods: ["DELETE"],
    });

    // pre-flight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // ...
  },
};
```

### Configuring CORS Asynchronously

```ts
import { cors, type CORSOptionsCallback } from "cors-headers";

export default {
  async fetch(req: Request): Promise<Response> {
    const allowlist = ["http://example1.com", "http://example2.com"];

    const dynamicCORSOptions: CORSOptionsCallback = (origin) => {
      if (origin && allowlist.indexOf(origin) !== -1) {
        return { origin: true, maxAge: 123 }; // reflect (enable) the requested origin in the CORS response
      } else {
        return { origin: false }; // disable CORS for this request
      }
    };

    const { headers } = cors(req, dynamicCORSOptions);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // This response is CORS enabled for allowed domains
    return new Response("Hello dynamic origin opts!", { status: 200, headers });
  },
};
```

## Configuration Options

### `origin`

Configures the `Access-Control-Allow-Origin` CORS header. Possible values:

- `Boolean` - set `origin` to `true` to reflect the [request origin](http://tools.ietf.org/html/draft-abarth-origin-09), as defined by `req.headers.get('Origin')`, or set it to `false` to disable CORS.

- `String` - set `origin` to a specific origin. For example if you set it to `http://example.com` only requests from `http://example.com` will be allowed.

- `RegExp` - set `origin` to a regular expression pattern which will be used to test the request origin. If it's a match, the request origin will be reflected. For example the pattern `/example\.com$/` will reflect any request that is coming from an origin ending with `example.com`.

- `Array` - set `origin` to an array of valid origins. Each origin can be a `String` or a `RegExp`. For example `["http://example1.com", /\.example2\.com$/]` will accept any request from `http://example1.com` or from a subdomain of `example2.com`.

- `Function` - set `origin` to a function implementing some custom logic. The function takes the request origin as the first parameter and a callback (called as `callback(origin)`. It should return allowed values of `origin` option **except a function**.

### `allowedMethods`

Configures the `Access-Control-Allow-Methods` CORS header. Expects a comma-delimited string (ex: `'GET,PUT,POST'`) or an array (ex: `['GET', 'PUT', 'POST']`).

### `allowedHeaders`

Configures the `Access-Control-Allow-Headers` CORS header. Expects a comma-delimited string (ex: `'Content-Type,Authorization'`) or an array (ex: `['Content-Type', 'Authorization']`). If not specified, defaults to reflecting the headers specified in the request's `Access-Control-Request-Headers` header.

### `exposedHeaders`

Configures the `Access-Control-Expose-Headers` CORS header. Expects a comma-delimited string (ex: `'Content-Range,X-Content-Range'`) or an array (ex: `['Content-Range', 'X-Content-Range']`). If not specified, no custom headers are exposed.

### `credentials`

Configures the `Access-Control-Allow-Credentials` CORS header. Set to `true` to pass the header, otherwise it is omitted.

### `maxAge`

Configures the `Access-Control-Max-Age` CORS header. Set to an integer to pass the header, otherwise it is omitted.

The default configuration is:

```json
{
  "origin": "*",
  "allowedMethods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "credentials": false
}
```

For details on the effect of each CORS header, read [this](https://web.dev/cross-origin-resource-sharing/) article on web.dev.

## License

[MIT License](http://www.opensource.org/licenses/mit-license.php)

## Acknowledgement

The code is taken from Express' [`cors()`](https://github.com/expressjs/cors/tree/master) middleware and modified to use browser compatible [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [`Headers`](https://developer.mozilla.org/en-US/docs/Web/API/Headers) API. Credit goes to the original authors.

[npm-image]: https://img.shields.io/npm/v/cors-headers?logo=npm&labelColor=%2330363D&color=%235EC453
[npm-url]: https://npmjs.org/package/cors-headers
