export type CORSOrigin = boolean | string | RegExp | (string | RegExp)[];
export type CORSOriginCallback = (origin: string | null) => CORSOrigin;

export type CORSOptions = {
  allowedHeaders?: string | string[];
  allowedMethods: string | string[];
  credentials: boolean;
  exposedHeaders?: string | string[];
  maxAge?: number;
  origin: CORSOrigin | CORSOriginCallback;
};

export type CORSOptionsCallback = (
  origin: string | null,
) => Partial<CORSOptions>;
