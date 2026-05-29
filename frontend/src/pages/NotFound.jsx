import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

export const NotFound = () => (
  <Card className="text-center">
    <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Page not found</p>
    <h1 className="mt-3 text-4xl font-semibold text-slate-950">404</h1>
    <p className="mt-2 text-sm text-slate-600">The page you are looking for doesn't exist.</p>
    <Link to="/">
      <Button className="mt-6">Return home</Button>
    </Link>
  </Card>
);
