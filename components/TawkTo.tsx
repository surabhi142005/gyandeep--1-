import { useEffect } from 'react';

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

const TAWK_TO_ID = '69e778e8fc10a61c3539d777';
const TAWK_TOWidget = '1jmo30jga';

export default function TawkTo() {
  useEffect(() => {
    // Add Tawk.to script dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://embed.tawk.to/${TAWK_TO_ID}/${TAWK_TOWidget}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    
    document.body.appendChild(script);

    // Initialize Tawk API
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    return () => {
      // Cleanup script on unmount
      document.body.removeChild(script);
    };
  }, []);

  return null;
}
