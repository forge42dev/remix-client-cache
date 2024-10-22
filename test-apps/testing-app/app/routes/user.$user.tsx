import { type LoaderFunctionArgs, json } from "react-router";
import {
  type ClientLoaderFunctionArgs,
  Link,
  useLoaderData,
  useNavigate,
} from "react-router";

import {
  cacheClientLoader,
  createCacheAdapter,
  useCachedLoaderData,
  useSwrData,
} from "remix-client-cache";

const { adapter } = createCacheAdapter(() => localStorage);

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${params.user}`,
  );
  const user = await response.json();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return json({ user: { ...user, description: Math.random() } });
};

// Caches the loader data into memory
export const clientLoader = async (args: ClientLoaderFunctionArgs) =>
  cacheClientLoader<typeof loader>(args, {
    adapter,
  });

// make sure you turn this flag on
clientLoader.hydrate = true;

export default function Index() {
  // The data is automatically cached for you and hot swapped
  const loaderData = useCachedLoaderData<typeof clientLoader>();

  const { user, serverData, deferredServerData } = loaderData;
  const SWR = useSwrData<typeof clientLoader>(loaderData);
  const navigate = useNavigate();

  return (
    <div>
      <Link to="/">Home</Link>
      <SWR>
        {(data) => {
          return (
            <div>
              {data.user.name} <hr /> {data.user.email}
              <hr />
              {data.user.username}
              <hr />
              {data.user.website} <hr />
              {data.user.description}
              <button
                onClick={() =>
                  navigate(`/user/${Math.round(Math.random() * 10) + 1}`)
                }
              >
                Go to new user
              </button>
            </div>
          );
        }}
      </SWR>
      {user.name} <hr /> {user.email}
      <hr />
      {user.username}
      <hr />
      {user.website} <hr />
      {user.description}
      <button
        onClick={() => navigate(`/user/${Math.round(Math.random() * 10) + 1}`)}
      >
        Go to new user
      </button>
    </div>
  );
}
