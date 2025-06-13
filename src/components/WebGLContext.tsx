'use client';

import { useEffect, useRef } from 'react';
import { useWindowSize } from 'usehooks-ts';

import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { loadManifest } from '@99Stud/webgl/utils/manifest/assetsLoader';
import { manifest } from '@99Stud/webgl/utils/manifest/preloadManifest';
import WebGLApp from '@99Stud/webgl/WebGLApp';

interface WebGLContextProps {
  className?: string;
}

export const WebGLContext: React.FC<WebGLContextProps> = () => {
  const webglWrapperRef = useRef<HTMLDivElement>(null);
  const webglAppRef = useRef<WebGLApp | null>(null);
  const { width = 0, height = 0 } = useWindowSize();

  useEffect(() => {
    loadManifest(manifest)
      .then(() => {
        if (typeof window !== 'undefined' && webglWrapperRef.current) {
          try {
            webglAppRef.current = new WebGLApp();
            webglAppRef.current?.init?.(webglWrapperRef.current);
          } catch (error) {
            console.error('Failed to initialize WebGL:', error);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load manifest:', error);
      });

    return () => {
      webglAppRef.current = null;
    };
  }, []);

  // Resize watcher
  useEffect(() => {
    if (webglAppRef.current) {
      WebGLStore.onResize(width, height);

      webglAppRef.current.onResize();
    }
  }, [width, height]);

  return <div className="webgl-wrapper fixed w-full h-full inset-0 z-0 pointer-events-none touch-none overflow-hidden" ref={webglWrapperRef} />;
};
