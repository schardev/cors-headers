import { expect, describe, it } from "bun:test";
import { cors } from "../src";

const mockRequestGET = new Request("https://example.com", {
  headers: {
    Origin: "https://example.com",
  },
});

const mockRequestOPTIONS = new Request("https://example.com", {
  method: "OPTIONS",
  headers: {
    Origin: "https://example.com",
    "Access-Control-Request-Headers": "X-Header-1,X-Header-2",
  },
});

describe("cors", function () {
  it("does not alter `options` configuration object", () => {
    expect(() => {
      const options = Object.freeze({
        origin: "https://custom-origin.com",
      });
      cors(mockRequestGET, options);
    }).not.toThrow();
  });

  it("returns an object with default options", () => {
    const res = cors(mockRequestGET);

    const origin = res.headers.get("access-control-allow-origin");
    expect(origin).toBe("*");
  });

  it("includes Content-Length response header", () => {
    const res = cors(mockRequestOPTIONS);
    expect(res.headers.get("Content-Length")).toBe("0");
  });

  it("no options enables default CORS to all origins", () => {
    const res = cors(mockRequestGET);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toBe(null);
  });

  it("OPTION call with no options enables default CORS to all origins and methods", () => {
    const res = cors(mockRequestOPTIONS);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toBe(
      "GET,HEAD,PUT,PATCH,POST,DELETE",
    );
  });
});

describe("passing static options", () => {
  it("overrides defaults", () => {
    const res = cors(mockRequestOPTIONS, {
      origin: "http://example.com",
      allowedMethods: ["FOO", "bar"],
      allowedHeaders: ["FIZZ", "buzz"],
      credentials: true,
      maxAge: 123,
    });

    expect(res.headers.get("access-control-allow-origin")).toBe(
      "http://example.com",
    );
    expect(res.headers.get("access-control-allow-methods")).toBe("FOO,bar");
    expect(res.headers.get("access-control-allow-headers")).toBe("FIZZ,buzz");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    expect(res.headers.get("access-control-max-age")).toBe("123");
  });

  it("matches request origin against regexp", () => {
    const res = cors(mockRequestGET, { origin: /:\/\/(.+\.)?example.com$/ });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      mockRequestGET.headers.get("origin"),
    );
    expect(res.headers.get("vary")).toBe("Origin");
  });

  it("matches request origin against array of origin checks", () => {
    const res = cors(mockRequestGET, {
      origin: [/foo\.com$/, "https://example.com"],
    });

    expect(res.headers.get("access-control-allow-origin")).toBe(
      mockRequestGET.headers.get("origin"),
    );
    expect(res.headers.get("vary")).toBe("Origin");
  });

  it("doesn't match request origin against array of invalid origin checks", () => {
    const res = cors(mockRequestGET, { origin: [/foo\.com$/, "bar.com"] });
    expect(res.headers.get("access-control-allow-origin")).toBe(null);
    expect(res.headers.get("vary")).toBe("Origin");
  });

  it("origin of false disables cors", () => {
    const res = cors(mockRequestGET, {
      origin: false,
      allowedMethods: ["FOO", "bar"],
      allowedHeaders: ["FIZZ", "buzz"],
      credentials: true,
      maxAge: 123,
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(null);
    expect(res.headers.get("access-control-allow-methods")).toBe(null);
    expect(res.headers.get("access-control-allow-headers")).toBe(null);
    expect(res.headers.get("access-control-allow-credentials")).toBe(null);
    expect(res.headers.get("access-control-max-age")).toBe(null);
  });

  it("can override origin", () => {
    const res = cors(mockRequestGET, { origin: "https://example-1.com" });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://example-1.com",
    );
  });

  it("can override origin", () => {
    const res = cors(mockRequestGET, { origin: "https://example-1.com" });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://example-1.com",
    );
  });

  it("includes Vary header for specific origins", () => {
    const res = cors(mockRequestGET, { origin: "https://example-1.com" });
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("appends to an existing Vary header", () => {
    const res = cors(mockRequestOPTIONS, {
      origin: "https://example-1.com",
      allowedHeaders: [],
    });
    expect(res.headers.get("Vary")).toBe(
      "Origin, Access-Control-Request-Headers",
    );
  });

  it("specifying true for origin reflects requesting origin", () => {
    const res = cors(mockRequestGET, { origin: true });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://example.com",
    );
  });

  it("should allow origin when callback returns true", () => {
    const res = cors(mockRequestGET, { origin: () => true });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://example.com",
    );
  });

  it("should not allow origin when callback returns false", () => {
    const res = cors(mockRequestGET, {
      origin: () => false,
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(null);
    expect(res.headers.get("access-control-allow-methods")).toBe(null);
    expect(res.headers.get("access-control-allow-headers")).toBe(null);
    expect(res.headers.get("access-control-allow-credentials")).toBe(null);
    expect(res.headers.get("access-control-max-age")).toBe(null);
  });

  it("should not allow origin when callback returns false", () => {
    const res = cors(mockRequestGET, {
      origin: (o) => o === "https://example.com",
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://example.com",
    );
    expect(res.headers.get("access-control-allow-methods")).toBe(null);
    expect(res.headers.get("access-control-allow-headers")).toBe(null);
    expect(res.headers.get("access-control-allow-credentials")).toBe(null);
    expect(res.headers.get("access-control-max-age")).toBe(null);
  });

  it("can override methods", () => {
    const res = cors(mockRequestOPTIONS, {
      allowedMethods: ["HEAD", "GET"],
    });
    expect(res.headers.get("access-control-allow-methods")).toBe("HEAD,GET");
  });

  it("methods defaults to GET, HEAD, PUT, PATCH, POST, DELETE", () => {
    const res = cors(mockRequestOPTIONS);
    expect(res.headers.get("access-control-allow-methods")).toBe(
      "GET,HEAD,PUT,PATCH,POST,DELETE",
    );
  });

  it("can specify allowed headers as string", () => {
    const res = cors(mockRequestOPTIONS, {
      allowedHeaders: "header1",
    });
    expect(res.headers.get("access-control-allow-headers")).toBe("header1");
  });

  it("can specify allowed headers as array", () => {
    const res = cors(mockRequestOPTIONS, {
      allowedHeaders: ["header1", "header2"],
    });
    expect(res.headers.get("access-control-allow-headers")).toBe(
      "header1,header2",
    );
  });

  it("specifying an empty list or string of allowed headers will result in no response header for allowed headers", () => {
    const res = cors(mockRequestGET, {
      allowedHeaders: [],
    });
    expect(res.headers.get("access-control-allow-headers")).toBe(null);
    expect(res.headers.get("vary")).toBe(null);
  });

  it("if no allowed headers are specified, defaults to requested allowed headers", () => {
    const res = cors(mockRequestOPTIONS);
    expect(res.headers.get("access-control-allow-headers")).toBe(
      "X-Header-1,X-Header-2",
    );
  });

  it("can specify exposed headers as string", () => {
    const res = cors(mockRequestGET, {
      exposedHeaders: "custom-header-1,custom-header-2",
    });
    expect(res.headers.get("access-control-expose-headers")).toBe(
      "custom-header-1,custom-header-2",
    );
  });

  it("can specify exposed headers as array", () => {
    const res = cors(mockRequestGET, {
      exposedHeaders: ["custom-header-1", "custom-header-2"],
    });
    expect(res.headers.get("access-control-expose-headers")).toBe(
      "custom-header-1,custom-header-2",
    );
  });

  it("specifying an empty list or string of exposed headers will result in no response header for exposed headers", () => {
    const res = cors(mockRequestGET, {
      exposedHeaders: [],
    });
    expect(res.headers.get("access-control-expose-headers")).toBe(null);
  });

  it("include credentials if explicitly enabled", () => {
    const res = cors(mockRequestOPTIONS, { credentials: true });
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("does not include credentials unless explicitly enabled", () => {
    const res = cors(mockRequestGET);
    expect(res.headers.get("access-control-allow-credentials")).toBe(null);
  });

  it("includes maxAge when specified", () => {
    const maxAge = 456;
    const res = cors(mockRequestOPTIONS, { maxAge });
    expect(res.headers.get("access-control-max-age")).toBe(String(maxAge));
  });

  it("includes maxAge when specified and equals to zero", () => {
    const maxAge = 0;
    const res = cors(mockRequestOPTIONS, { maxAge });
    expect(res.headers.get("access-control-max-age")).toBe("0");
  });

  it("does not include maxAge unless specified", () => {
    const res = cors(mockRequestGET);
    expect(res.headers.get("access-control-max-age")).toBe(null);
  });
});

describe("passing a function to build options", () => {
  it("handles options specified via callback", () => {
    const res = cors(mockRequestGET, { origin: () => "https://example-1.com" });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://example-1.com",
    );
  });

  it("handles options specified via callback for preflight", () => {
    const options = (origin: string | null) => ({
      origin:
        origin && origin.includes("example.com")
          ? "https://example-1.com"
          : "https://not-an-example.com",
      maxAge: origin && origin.includes(".com") ? 123 : 456,
    });

    const res = cors(mockRequestOPTIONS, options);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://example-1.com",
    );
    expect(res.headers.get("access-control-max-age")).toBe("123");

    const res2 = cors(
      new Request(mockRequestOPTIONS, {
        headers: { Origin: "https://not.an.origin" },
      }),
      options,
    );
    expect(res2.headers.get("access-control-allow-origin")).toBe(
      "https://not-an-example.com",
    );
    expect(res2.headers.get("access-control-max-age")).toBe("456");
  });
});
