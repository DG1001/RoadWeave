import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function PWAManifest() {
  const location = useLocation();

  useEffect(() => {
    // Generate dynamic manifest based on current route
    const generateManifest = () => {
      const isTraverRoute = location.pathname.startsWith('/traveler/');
      const isPublicRoute = location.pathname.startsWith('/public/');
      
      let manifestData = {
        "short_name": "RoadWeave",
        "name": "RoadWeave - Collaborative Travel Blog",
        "icons": [
          {
            "src": "/logo.png",
            "sizes": "64x64 32x32 24x24 16x16",
            "type": "image/png"
          },
          {
            "src": "/logo192.png", 
            "type": "image/png",
            "sizes": "192x192"
          },
          {
            "src": "/logo512.png",
            "type": "image/png", 
            "sizes": "512x512"
          }
        ],
        "display": "standalone",
        "theme_color": "#5CBCCF",
        "background_color": "#ffffff",
        "orientation": "portrait-primary"
      };

      if (isTraverRoute) {
        manifestData.name = "RoadWeave - Travel Companion";
        manifestData.short_name = "RoadWeave";
        manifestData.start_url = location.pathname;
        manifestData.scope = location.pathname;
      } else if (isPublicRoute) {
        manifestData.name = "RoadWeave - Travel Blog";
        manifestData.short_name = "Travel Blog";
        manifestData.start_url = location.pathname;
        manifestData.scope = location.pathname;
      } else {
        manifestData.start_url = "/";
        manifestData.scope = "/";
      }

      return manifestData;
    };

    // Create and update manifest link
    const updateManifest = () => {
      const manifest = generateManifest();
      const manifestJSON = JSON.stringify(manifest);
      const blob = new Blob([manifestJSON], { type: 'application/json' });
      const manifestURL = URL.createObjectURL(blob);

      // Remove existing manifest link
      const existingLink = document.querySelector('link[rel="manifest"]');
      if (existingLink) {
        existingLink.remove();
      }

      // Add new manifest link
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestURL;
      document.head.appendChild(link);

      // Clean up old URL
      return () => {
        URL.revokeObjectURL(manifestURL);
      };
    };

    const cleanup = updateManifest();
    return cleanup;
  }, [location.pathname]);

  return null; // This component doesn't render anything
}

export default PWAManifest;