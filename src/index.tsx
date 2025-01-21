import type { SerializeFrom } from "@remix-run/server-runtime";
import { useEffect, useState } from "react";
import React from "react";
import {
  Await,
  type ClientActionFunctionArgs,
  type ClientLoaderFunctionArgs,
  useLoaderData,
  useNavigate,
} from "react-router";

const map = new Map();

export interface CacheAdapter {
  getItem: (key: string) => any | Promise<any>;
  setItem: (key: string, value: any) => Promise<any> | any;
  removeItem: (key: string) => Promise<any> | any;
}

export let cache: CacheAdapter = {
  getItem: async (key) => map.get(key),
  setItem: async (key, val) => map.set(key, val),
  removeItem: async (key) => map.delete(key),
};

const augmentStorageAdapter = (storage: Storage) => {
  return {
    getItem: async (key: string) => {
      try {
        const item = JSON.parse(storage.getItem(key) || "");

        return item;
      } catch (e) {
        return storage.getItem(key);
      }
    },
    setItem: async (key: string, val: any) =>
      storage.setItem(key, JSON.stringify(val)),
    removeItem: async (key: string) => storage.removeItem(key),
  };
};

export const createCacheAdapter = (adapter: () => CacheAdapter) => {
  if (typeof document === "undefined") return { adapter: undefined };
  const adapterInstance = adapter();
  if (adapterInstance instanceof Storage) {
    return {
      adapter: augmentStorageAdapter(adapterInstance),
    };
  }
  return {
    adapter: adapter(),
  };
};

export const configureGlobalCache = (
  newCacheInstance: () => CacheAdapter | Storage,
) => {
  if (typeof document === "undefined") return;
  const newCache = newCacheInstance();
  if (newCache instanceof Storage) {
    cache = augmentStorageAdapter(newCache);
    return;
  }
  if (newCache) {
    cache = newCache;
  }
};

export const decacheClientLoader = async <T,>(
  { request, serverAction }: ClientActionFunctionArgs,
  {
    key = constructKey(request),
    adapter = cache,
  }: { key?: string; adapter?: CacheAdapter },
) => {
  const data = await serverAction<T>();
  await adapter.removeItem(key);
  return data;
};

type CacheClientLoaderArgs = {
  type?: "swr" | "normal";
  key?: string;
  adapter?: CacheAdapter;
};

export const cacheClientLoader = async <T,>(
  { request, serverLoader }: ClientLoaderFunctionArgs,
  {
    type = "swr",
    key = constructKey(request),
    adapter = cache,
  }: CacheClientLoaderArgs = {
    type: "swr",
    key: constructKey(request),
    adapter: cache,
  },
): Promise<
  SerializeFrom<T> & {
    serverData: SerializeFrom<T>;
    deferredServerData: Promise<SerializeFrom<T>> | undefined;
    key: string;
  }
> => {
  const existingData = await adapter.getItem(key);

  if (type === "normal" && existingData) {
    return {
      ...existingData,
      serverData: existingData as SerializeFrom<T>,
      deferredServerData: undefined,
      key,
    };
  }
  const data = existingData ? existingData : await serverLoader();

  await adapter.setItem(key, data);
  const deferredServerData = existingData ? serverLoader() : undefined;
  return {
    ...(data ?? existingData),
    serverData: data as SerializeFrom<T>,
    deferredServerData,
    key,
  };
};

export const createClientLoaderCache = (props?: CacheClientLoaderArgs) => {
  const clientLoader = (args: ClientLoaderFunctionArgs) =>
    cacheClientLoader(args, props);
  clientLoader.hydrate = true;
  return clientLoader;
};

export function useCachedLoaderData<T>(
  { adapter = cache }: { adapter?: CacheAdapter } = { adapter: cache },
) {
  const loaderData = useLoaderData() as any;
  const navigate = useNavigate();
  const [freshData, setFreshData] = useState<any>({
    ...("serverData" in loaderData ? loaderData.serverData : loaderData),
  });

  // Unpack deferred data from the server
  useEffect(() => {
    let isMounted = true;
    if (loaderData.deferredServerData) {
      loaderData.deferredServerData
        .then((newData: any) => {
          if (isMounted) {
            adapter.setItem(loaderData.key, newData);
            setFreshData(newData);
          }
        })
        .catch((e: any) => {
          const res = e instanceof Response ? e : undefined;
          if (res && res.status === 302) {
            const to = res.headers.get("Location");
            to && navigate(to);
          } else {
            throw e;
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [loaderData]);

  // Update the cache if the data changes
  useEffect(() => {
    if (
      loaderData.serverData &&
      JSON.stringify(loaderData.serverData) !== JSON.stringify(freshData)
    ) {
      setFreshData(loaderData.serverData);
    }
  }, [loaderData?.serverData]);

  return {
    ...loaderData,
    ...freshData,
    cacheKey: loaderData.key,
    invalidate: () => invalidateCache(loaderData.key),
  } as SerializeFrom<T> & {
    cacheKey?: string;
    invalidate: () => Promise<void>;
  };
}

const constructKey = (request: Request) => {
  const url = new URL(request.url);
  return url.pathname + url.search + url.hash;
};

export const invalidateCache = async (key: string | string[]) => {
  const keys = Array.isArray(key) ? key : [key];
  for (const k of keys) {
    await cache.removeItem(k);
  }
};

export const useCacheInvalidator = () => ({
  invalidateCache,
});

export function useSwrData<T>({
  serverData,
  deferredServerData,
  ...args
}: any) {
  return function SWR({
    children,
  }: {
    children: (data: SerializeFrom<T>) => React.ReactElement;
  }) {
    return (
      <>
        {deferredServerData ? (
          <React.Suspense fallback={children(serverData)}>
            <Await resolve={deferredServerData}>{children as any}</Await>
          </React.Suspense>
        ) : (
          children(serverData ?? (args as T))
        )}
      </>
    );
  };
}
