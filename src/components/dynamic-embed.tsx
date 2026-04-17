
"use client";

import React, { useEffect, useRef } from 'react';

interface DynamicEmbedProps {
  code: string;
}

export const DynamicEmbed: React.FC<DynamicEmbedProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = ''; // Clear previous content

    // Use a temporary div to parse the HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = code;

    // Separate scripts from other HTML
    const scripts = Array.from(tempDiv.getElementsByTagName('script'));
    const nonScriptNodes = Array.from(tempDiv.childNodes).filter(
      node => node.nodeName.toLowerCase() !== 'script'
    );

    // Append non-script HTML content
    nonScriptNodes.forEach(node => {
      container.appendChild(node.cloneNode(true));
    });

    // Create and append script elements to make them executable
    scripts.forEach(script => {
      const newScript = document.createElement('script');
      // Copy attributes
      Array.from(script.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      // Copy inline script content
      if (script.innerHTML) {
        newScript.innerHTML = script.innerHTML;
      }
      container.appendChild(newScript);
    });
    
    // Cleanup function to remove scripts when component unmounts
    return () => {
        if(container) {
            const addedScripts = container.getElementsByTagName('script');
            while (addedScripts.length > 0) {
                addedScripts[0]?.parentNode?.removeChild(addedScripts[0]);
            }
        }
    };

  }, [code]);

  return <div ref={containerRef} />;
};
