import { gsap } from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'

export type FnTickArgs = {
    time: number
    deltaTime: number
    rafDamp: number
}

export function useTicker(
    fn: (options: FnTickArgs) => unknown,
    { immediate = true, prioritize = false, fps = 60 } = {}
) {
    if (typeof fn !== 'function') {
        throw new Error('[useTicker] Tick function must be passed as a parameter')
    }

    const [active, setActive] = useState(!!immediate)
    const fnRef = useRef(fn)

    // Keep the function reference up to date
    useEffect(() => {
        fnRef.current = fn
    }, [fn])

    const onTick = useCallback((time: number, deltaTime: number) => {
        if (!active) return
        fnRef.current({ time, deltaTime, rafDamp: gsap.ticker.deltaRatio(fps) })
    }, [active, fps])

    const add = useCallback(() => {
        gsap.ticker.add(onTick, false, prioritize)
    }, [onTick, prioritize])

    const dispose = useCallback(() => {
        gsap.ticker.remove(onTick)
    }, [onTick])

    const toggle = useCallback((state?: boolean) => {
        setActive(prevActive => state !== undefined ? state : !prevActive)
    }, [])

    const activate = useCallback(() => toggle(true), [toggle])
    const deactivate = useCallback(() => toggle(false), [toggle])

    // Handle adding/removing ticker based on active state
    useEffect(() => {
        if (active) {
            add()
        } else {
            dispose()
        }

        return dispose
    }, [active, add, dispose])

    // Cleanup on unmount
    useEffect(() => {
        return dispose
    }, [dispose])

    return {
        active,
        activate,
        dispose: deactivate,
        toggle
    }
} 