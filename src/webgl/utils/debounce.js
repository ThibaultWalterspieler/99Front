/**
 * Creates a debounced function that delays invoking the provided function until after
 * wait milliseconds have elapsed since the last time the debounced function was invoked.
 *
 * @param {Function} func
 * @param {number} wait
 * @param {Object} [options]
 * @param {boolean} [options.leading=false]
 * @param {boolean} [options.trailing=true]
 * @param {number} [options.maxWait]
 * @returns {Function}
 */
export function debounce(func, wait, options = {}) {
  const { leading = false, trailing = true, maxWait } = options;

  let timeoutId;
  let maxTimeoutId;
  let lastCallTime;
  let lastInvokeTime = 0;
  let lastArgs;
  let lastThis;
  let result;

  /**
   * Invoke the function
   */
  function invokeFunc(time) {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  /**
   * Check if we should invoke on the leading edge
   */
  function shouldInvokeLeading(time) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  /**
   * Start the timer for the trailing edge
   */
  function startTimer(pendingFunc, wait) {
    return setTimeout(pendingFunc, wait);
  }

  function cancelTimer(id) {
    clearTimeout(id);
  }

  /**
   * Handle the trailing edge invocation
   */
  function trailingEdge(time) {
    timeoutId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  /**
   * Handle the max wait timeout
   */
  function maxDelayed() {
    const time = Date.now();
    if (shouldInvokeLeading(time)) {
      return trailingEdge(time);
    }
    // Restart the timer
    maxTimeoutId = startTimer(maxDelayed, maxWait - (time - lastInvokeTime));
  }

  /**
   * Calculate remaining wait time
   */
  function remainingWait(time) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxWait === undefined
      ? timeWaiting
      : Math.min(timeWaiting, maxWait - timeSinceLastInvoke);
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvokeLeading(time)) {
      return trailingEdge(time);
    }
    // Restart the timer
    timeoutId = startTimer(timerExpired, remainingWait(time));
  }

  /**
   * The debounced function
   */
  function debounced(...args) {
    const time = Date.now();
    const isInvoking = shouldInvokeLeading(time);

    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === undefined) {
        // Leading edge
        lastInvokeTime = lastCallTime;
        timeoutId = startTimer(timerExpired, wait);
        return leading ? invokeFunc(lastCallTime) : result;
      }
      if (maxWait !== undefined) {
        // Handle maxWait
        maxTimeoutId = startTimer(maxDelayed, maxWait);
        timeoutId = startTimer(timerExpired, wait);
        return leading ? invokeFunc(lastCallTime) : result;
      }
    }

    if (timeoutId === undefined) {
      timeoutId = startTimer(timerExpired, wait);
    }

    return result;
  }

  debounced.cancel = function () {
    if (timeoutId !== undefined) {
      cancelTimer(timeoutId);
    }
    if (maxTimeoutId !== undefined) {
      cancelTimer(maxTimeoutId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timeoutId = maxTimeoutId = undefined;
  };

  debounced.flush = function () {
    return timeoutId === undefined ? result : trailingEdge(Date.now());
  };

  debounced.pending = function () {
    return timeoutId !== undefined;
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 *
 * @param {Function} func
 * @param {number} wait
 * @param {Object} [options]
 * @param {boolean} [options.leading=true]
 * @param {boolean} [options.trailing=true]
 * @returns {Function}
 */
export function throttle(func, wait, options = {}) {
  const { leading = true, trailing = true } = options;
  return debounce(func, wait, {
    leading,
    trailing,
    maxWait: wait,
  });
}
