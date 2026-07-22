import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Button from "../components/ui/Button";

const NotFoundPage: React.FC = () => (
  <>
    <Helmet>
      <title>404 – Lexora</title>
    </Helmet>
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-8xl font-extrabold text-primary-600">404</h1>
      <p className="text-2xl font-semibold text-gray-900 mt-4">
        Page Not Found
      </p>
      <p className="text-gray-500 mt-2 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="mt-8">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  </>
);

export default NotFoundPage;
