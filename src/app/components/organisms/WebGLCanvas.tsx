'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import WebGLStore from '../../webgl/store/WebGLStore.js'
import { loadManifest } from '../../webgl/utils/manifest/assetsLoader.js'
import { manifest } from '../../webgl/utils/manifest/preloadManifest.js'

interface WebGLCanvasProps {
    visible?: boolean
    className?: string
}

interface WebGLAppInterface {
    init: () => void
    onResize: () => void
    onTick: (params: { time: number; delta: number; rafDamp: number }) => void
}

const useWindowSize = () => {
    const [size, setSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return

        const updateSize = () => {
            setSize({ width: window.innerWidth, height: window.innerHeight })
        }

        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [])

    return size
}

const useTicker = (callback: (params: { time: number; delta: number; rafDamp: number }) => void) => {
    const rafRef = useRef<number>(0)
    const lastTimeRef = useRef<number>(0)
    const isRunningRef = useRef(false)

    const tick = useCallback((time: number) => {
        if (!isRunningRef.current) return

        const delta = time - lastTimeRef.current
        const rafDamp = Math.min(delta / 16.67, 2)

        callback({ time, delta, rafDamp })

        lastTimeRef.current = time
        rafRef.current = requestAnimationFrame(tick)
    }, [callback])

    const toggle = useCallback(() => {
        if (isRunningRef.current) {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
            }
            isRunningRef.current = false
        } else {
            isRunningRef.current = true
            lastTimeRef.current = performance.now()
            rafRef.current = requestAnimationFrame(tick)
        }
    }, [tick])

    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
            }
            isRunningRef.current = false
        }
    }, [])

    return { toggle }
}

const WebGLCanvas = ({ visible = false, className = '' }: WebGLCanvasProps) => {
    const [isClient, setIsClient] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const webglRef = useRef<WebGLAppInterface | null>(null)
    const { width, height } = useWindowSize()

    // Ensure component only renders on client side
    useEffect(() => {
        setIsClient(true)
    }, [])

    const onTick = useCallback(({ time, delta, rafDamp }: { time: number; delta: number; rafDamp: number }) => {
        if (webglRef.current) {
            webglRef.current.onTick({ time, delta, rafDamp })
        }
    }, [])

    const { toggle } = useTicker(onTick)

    const loadAssets = useCallback(async () => {
        await loadManifest(manifest)
    }, [])

    useEffect(() => {
        if (!visible || !wrapperRef.current || !isClient) return

        wrapperRef.current.classList.add('webgl')

        const initWebGL = async () => {
            try {
                if (!webglRef.current) {
                    // Dynamically import WebGLApp only on client side
                    const { default: WebGLApp } = await import('../../webgl/WebGLApp.js')
                    webglRef.current = new WebGLApp()
                }

                // Load assets before initializing WebGL (now with empty manifest)
                await loadAssets()

                webglRef.current?.init?.()
                toggle()
            } catch (error) {
                console.error('WebGL initialization failed:', error)
                // Continue without WebGL for now
            }
        }

        initWebGL()

        return () => {
            toggle()

            if (wrapperRef.current) {
                wrapperRef.current.classList.remove('webgl')
            }
        }
    }, [visible, toggle, loadAssets, isClient])

    useEffect(() => {
        if (!visible || !isClient) return

        try {
            if (webglRef.current) {
                webglRef.current.onResize()
            }
            WebGLStore.onResize(width, height)
        } catch (error) {
            console.error('Resize error:', error)
        }
    }, [width, height, visible, isClient])

    useEffect(() => {
        return () => {
            if (webglRef.current) {
                webglRef.current = null
            }
        }
    }, [])

    // Show loading state on server side or while initializing
    if (!isClient) {
        return (
            <div
                className={`canvas-wrapper fixed w-full h-full inset-0 z-0 ${className}`}
                style={{
                    backgroundColor: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                }}
            >
                Loading WebGL...
            </div>
        )
    }

    return (
        <div
            ref={wrapperRef}
            className={`canvas-wrapper fixed w-full h-full inset-0 z-0 ${className}`}
            style={{
                touchAction: 'none',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
            }}
        />
    )
}

export default WebGLCanvas
