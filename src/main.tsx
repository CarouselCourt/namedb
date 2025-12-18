/**
 * ========================================
 * APPLICATION ENTRY POINT
 * ========================================
 * 
 * This is the very first JavaScript/TypeScript file that runs when the
 * application loads in the browser. It's responsible for:
 * 
 * 1. **Finding the mount point**: Locates the root DOM element in index.html
 * 2. **Creating React root**: Initializes React's rendering system
 * 3. **Rendering the app**: Mounts the App component into the DOM
 * 4. **Loading styles**: Imports the global CSS
 * 
 * REACT 18 RENDERING:
 * This uses React 18's new createRoot API (instead of legacy ReactDOM.render).
 * Benefits include:
 * - Concurrent rendering features
 * - Automatic batching of state updates
 * - Better performance and user experience
 * 
 * EXECUTION FLOW:
 * 1. Browser loads index.html
 * 2. index.html loads this main.tsx file
 * 3. This file creates React root and renders <App />
 * 4. App component sets up providers and routing
 * 5. Routes render appropriate page components
 * 
 * NOTE: This file is very simple and rarely needs to be modified.
 * Most configuration happens in App.tsx instead.
 */

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Mount the React application
 * 
 * - Finds the #root element in index.html
 * - Creates a React root attached to that element
 * - Renders the App component
 * 
 * The "!" after getElementById tells TypeScript we're certain
 * the element exists (it's defined in index.html)
 */
createRoot(document.getElementById("root")!).render(<App />);
