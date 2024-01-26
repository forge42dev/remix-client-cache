import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { ClientLoaderFunctionArgs, useNavigate } from "@remix-run/react";

import {
  cacheClientLoader,
  useCachedLoaderData,
} from "~/hook/useCachedLoaderData";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${params.user}`
  );
  const user = await response.json();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return json({ user: { ...user, description: Math.random() } });
};

export const clientLoader = async (args: ClientLoaderFunctionArgs) =>
  cacheClientLoader(args, "swr");
clientLoader.hydrate = true;

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
      <button
        onClick={() => navigate("/user/" + Math.round(Math.random() * 10))}
      >
        to other user
      </button>
    </div>
  );
}
