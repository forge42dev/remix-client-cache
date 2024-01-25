import type { SerializeFrom } from "@remix-run/server-runtime";
import { ClientLoaderFunctionArgs, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";

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

export const configureCache = (
  newCacheInstance: () => CacheAdapter | Storage,
) => {
  if (typeof document === "undefined") return;
  const newCache = newCacheInstance();
  if (newCache instanceof Storage) {
    cache = {
      getItem: async (key) => {
        try {
          const item = JSON.parse(newCache.getItem(key) || "");

          return item;
        } catch (e) {
          return newCache.getItem(key);
        }
      },
      setItem: async (key, val) => newCache.setItem(key, JSON.stringify(val)),
      removeItem: async (key) => newCache.removeItem(key),
    };
    return;
  }
  if (newCache) {
    cache = newCache;
  }
};

export function useCachedLoaderData<T extends any>() {
  const loaderData = useLoaderData<any>();
  const [freshData, setFreshData] = useState<any>({
    ...("data" in loaderData ? loaderData.data : loaderData),
  });
  // Unpack deferred data from the server
  useEffect(() => {
    let isMounted = true;
    if ("deferedData" in loaderData) {
      loaderData.deferedData.then((newData: any) => {
        if (
          isMounted &&
          JSON.stringify(newData) !== JSON.stringify(freshData)
        ) {
          cache.setItem(loaderData.key, newData).then(() => {
            setFreshData(newData);
          });
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
      loaderData.data &&
      JSON.stringify(loaderData.data) !== JSON.stringify(freshData)
    ) {
      setFreshData(loaderData.data);
    }
  }, [loaderData?.data]);
  return { ...freshData, cacheKey: loaderData.key } as SerializeFrom<T> & {
    cacheKey?: string;
  };
}

export const cacheClientLoader = async (
  { request, serverLoader }: ClientLoaderFunctionArgs,
  type: "swr" | "normal" = "swr",
  key = new URL(request.url).pathname +
    new URL(request.url).search +
    new URL(request.url).hash,
) => {
  const existingData = await cache.getItem(key);

  if (type === "normal" && existingData) {
    return existingData;
  }
  const data = existingData ? existingData : await serverLoader();
  await cache.setItem(key, data);
  const deferedData = serverLoader();
  return { data, deferedData, key };
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
