'use client'

import { useState } from 'react'
import WebGLCanvas from './components/organisms/WebGLCanvas'

export default function Home() {
  const [webglVisible, setWebglVisible] = useState(true)

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <WebGLCanvas
        visible={webglVisible}
        className="absolute inset-0"
      />

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-6xl font-bold text-white mb-8 text-center drop-shadow-lg">
            WebGL Experience
          </h1>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setWebglVisible(!webglVisible)}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 hover:bg-white/30 transition-all duration-200 font-medium"
            >
              {webglVisible ? 'Hide WebGL' : 'Show WebGL'}
            </button>

            <button
              onClick={() => {
                const isFullscreen = document.fullscreenElement
                if (isFullscreen) {
                  document.exitFullscreen()
                } else {
                  document.documentElement.requestFullscreen()
                }
              }}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 hover:bg-white/30 transition-all duration-200 font-medium"
            >
              Fullscreen
            </button>
          </div>

          <p className="text-white/80 text-center mt-6 max-w-md">
            Interactive WebGL experience powered by Three.js.
            Press &apos;P&apos; to toggle performance stats.
          </p>
        </div>
      </div>

      {/* Debug Info */}
      <div className="absolute top-4 left-4 z-20 text-white/60 text-sm font-mono">
        <div>WebGL: {webglVisible ? 'ON' : 'OFF'}</div>
        <div>FPS: Monitor in stats</div>
      </div>
    </div>
  )
}
