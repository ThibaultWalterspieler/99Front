'use client';

import clsx from 'clsx';
import { FC, useEffect, useRef } from 'react';
import { useWindowSize } from 'usehooks-ts';

import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { loadManifest } from '@99Stud/webgl/utils/manifest/assetsLoader';
import { manifest } from '@99Stud/webgl/utils/manifest/preloadManifest';
import WebGLApp from '@99Stud/webgl/WebGLApp';

import styles from './internal/WebGLContext.module.scss';

interface Props {
  className?: string;
}

export const WebGLContext: FC<Props> = ({ className }) => {
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
            throw new Error(`Failed to initialize WebGL: ${error}`);
          }
        }
      })
      .catch((error) => {
        throw new Error(`Failed to load manifest: ${error}`);
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

  return (
    <div
      className={clsx(
        className,
        styles['webgl-wrapper'],
        'overflow-hidden',
        'pointer-events-none touch-none select-none',
      )}
      ref={webglWrapperRef}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none',
      }}
    />
  );
};
