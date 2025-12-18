/**
 * ========================================
 * NOT FOUND PAGE (404)
 * ========================================
 * 
 * This page displays when a user navigates to a non-existent route.
 * It's the catch-all route in the React Router configuration.
 * 
 * FEATURES:
 * - Clear 404 message
 * - Link back to home page
 * - Logs attempted route to console for debugging
 * 
 * ROUTING:
 * This page is rendered by the "*" route in App.tsx, which catches
 * all routes that don't match defined paths.
 * 
 * WHEN THIS APPEARS:
 * - User manually types an invalid URL
 * - User clicks a broken link
 * - Old bookmark points to removed route
 * 
 * DEVELOPER NOTE:
 * If you add new routes, make sure to add them in App.tsx BEFORE
 * the catch-all "*" route, otherwise they'll never be reached.
 */

import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/**
 * NotFound Component
 * Displays 404 error page
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oops! Page not found</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
