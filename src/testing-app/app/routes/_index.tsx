import type { MetaFunction } from "@remix-run/node";
import { ClientLoaderFunctionArgs, json, useNavigate } from "@remix-run/react";
import {
  cacheClientLoader,
  useCachedLoaderData,
} from "~/hook/useCachedLoaderData";
import { decacheClientLoader } from "remix-client-cache";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async () => {
  const response = await fetch("https://jsonplaceholder.typicode.com/users/2");
  const user = await response.json();
  return json({ user: { ...user, description: Math.random() } });
};

export const clientLoader = async (args: ClientLoaderFunctionArgs) =>
  cacheClientLoader(args, "swr");
clientLoader.hydrate = true;

export const clientAction = decacheClientLoader;

export default function Index() {
  const { user } = useCachedLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div>
      {user.name} <hr /> {user.email}
      <hr />
      {user.username}
      <hr />
      {user.website} <hr />
      {user.description}
      <button onClick={() => navigate("/test")}>Test</button>
    </div>
  );
}
