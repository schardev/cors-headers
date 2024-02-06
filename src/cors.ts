import type { CORSOptions, CORSOptionsCallback, CORSOrigin } from "./types";

const defaults = {
  origin: "*",
  allowedMethods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: false,
} satisfies CORSOptions;

function isString(s: unknown): s is string {
  return typeof s === "string" || s instanceof String;
}

function isOriginAllowed(origin: string, allowedOrigin: CORSOrigin) {
  if (Array.isArray(allowedOrigin)) {
    for (let i = 0; i < allowedOrigin.length; i++) {
      if (isOriginAllowed(origin, allowedOrigin[i])) {
        return true;
      }
    }
    return false;
  } else if (isString(allowedOrigin)) {
    return origin === allowedOrigin;
  } else if (allowedOrigin instanceof RegExp) {
    return allowedOrigin.test(origin);
  } else {
    return !!allowedOrigin;
  }
}

function configureOrigin(options: CORSOptions, req: Request) {
  const requestOrigin = req.headers.get("origin");
  const optsOrigin = options.origin;
  const headers = [];

  if (!optsOrigin || optsOrigin === "*") {
    // allow any origin
    headers.push({ key: "Access-Control-Allow-Origin", value: "*" });
  } else if (isString(optsOrigin)) {
    // fixed origin
    headers.push({ key: "Access-Control-Allow-Origin", value: optsOrigin });
    headers.push({ key: "Vary", value: "Origin" });
  } else {
    const isAllowed = requestOrigin
      ? isOriginAllowed(requestOrigin, optsOrigin as CORSOrigin) // asserting because we already resolved origin callback
      : false;

    // reflect origin
    headers.push({
      key: "Access-Control-Allow-Origin",
      value: isAllowed ? requestOrigin : false,
    });
    headers.push({ key: "Vary", value: "Origin" });
  }

  return headers;
}

function configureMethods(options: CORSOptions) {
  let methods = options.allowedMethods;
  if (Array.isArray(methods)) {
    methods = methods.join(",");
  }
  if (methods) {
    return { key: "Access-Control-Allow-Methods", value: methods };
  }
}

function configureCredentials(options: CORSOptions) {
  if (options.credentials) {
    return { key: "Access-Control-Allow-Credentials", value: true };
  }
}

function configureAllowedHeaders(options: CORSOptions, req: Request) {
  let allowedHeaders = options.allowedHeaders;
  const headers = [];

  if (Array.isArray(allowedHeaders)) {
    allowedHeaders = allowedHeaders.join(",");
  }

  // headers wasn't specified, so reflect the request headers
  if (!allowedHeaders) {
    allowedHeaders = req.headers.get("access-control-request-headers")!;

    if (allowedHeaders) {
      headers.push({ key: "Vary", value: "Access-Control-Request-Headers" });
    }
  }

  if (allowedHeaders) {
    headers.push({
      key: "Access-Control-Allow-Headers",
      value: allowedHeaders,
    });
  }

  return headers;
}

function configureExposedHeaders(options: CORSOptions) {
  let exposeHeaders = options.exposedHeaders;

  if (Array.isArray(exposeHeaders)) {
    exposeHeaders = exposeHeaders.join(",");
  }

  if (exposeHeaders) {
    return { key: "Access-Control-Expose-Headers", value: exposeHeaders };
  }
}

function configureMaxAge(options: CORSOptions) {
  const maxAge =
    typeof options.maxAge === "number" ? String(options.maxAge) : null;
  if (maxAge) {
    return { key: "Access-Control-Max-Age", value: maxAge };
  }
}

type HeaderObj = { key: string; value: string | undefined | null | boolean };
function applyHeaders(
  headersArr: (undefined | HeaderObj | HeaderObj[])[],
  headers: Headers,
) {
  for (let i = 0; i < headersArr.length; i++) {
    let header = headersArr[i];
    if (header) {
      if (Array.isArray(header)) {
        applyHeaders(header, headers);
      } else if (header.key === "Vary" && header.value) {
        headers.append(header.key, String(header.value));
      } else if (header.value) {
        headers.set(header.key, String(header.value));
      }
    }
  }
  return headers;
}

export function cors(
  req: Request,
  options: Partial<CORSOptions> | CORSOptionsCallback = {},
): { headers: Headers } {
  const reqOrigin = req.headers.get("origin");
  const method = req.method.toUpperCase();
  const headersArr = [];
  let corsOptions: CORSOptions = { ...defaults };

  if (typeof options === "function") {
    const optionsCallbackResult = options(reqOrigin);
    corsOptions = { ...corsOptions, ...optionsCallbackResult };
  } else {
    corsOptions = { ...corsOptions, ...options };
  }

  if (typeof corsOptions.origin === "function") {
    const originCallbackResult = corsOptions.origin(reqOrigin);

    if (typeof originCallbackResult === "function") {
      throw new Error("Origin callback result cannot be a function.");
    }

    corsOptions.origin = originCallbackResult;
  }

  if (corsOptions.origin) {
    if (method === "OPTIONS") {
      // preflight
      headersArr.push(configureOrigin(corsOptions, req));
      headersArr.push(configureCredentials(corsOptions));
      headersArr.push(configureMethods(corsOptions));
      headersArr.push(configureAllowedHeaders(corsOptions, req));
      headersArr.push(configureMaxAge(corsOptions));
      headersArr.push(configureExposedHeaders(corsOptions));

      // Safari (and potentially other browsers) need content-length 0,
      // for 204 or they just hang waiting for a body
      headersArr.push({ key: "Content-Length", value: "0" });
    } else {
      // actual response
      headersArr.push(configureOrigin(corsOptions, req));
      headersArr.push(configureCredentials(corsOptions));
      headersArr.push(configureExposedHeaders(corsOptions));
    }
  }

  return {
    headers: applyHeaders(headersArr, new Headers()),
  };
}
