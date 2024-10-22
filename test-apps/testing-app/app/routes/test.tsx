import type {
  ActionFunctionArgs,
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  type MetaFunction,
  isRouteErrorResponse,
  useLoaderData,
  useNavigate,
  useRouteError,
} from "react-router";
import type { ShouldRevalidateFunction } from "react-router";

export const links: LinksFunction = () => [
  // your links here
];

export const meta: MetaFunction = () => [
  // your meta here
];

export const handle = () => ({
  // your handler here
});

export const headers: HeadersFunction = () => ({
  // your headers here
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return null;
};

export default function RouteComponent() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  return (
    <div>
      <button onClick={() => navigate("/")}>Test</button>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return <div />;
  }
  return <div />;
}

export const shouldRevalidate: ShouldRevalidateFunction = () => {
  return true;
};
