import gsap from 'gsap';

import Emitter from '@99Stud/webgl/events/Emitter';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { damp } from '@99Stud/webgl/utils/math';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

class Pointer {
  constructor() {
    this.state = {
      current: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      normalized: { x: 0, y: 0 },
      mapped: { x: 0, y: 0 },
      ease: isTouchDevice ? 0.2 : 0.1, // Slightly higher ease for touch devices
      velocity: { x: 0, y: 0 },
      speed: 0,
      speedNormalized: 0,
      isPressing: false,
      // Touch-specific state
      touchStartTime: 0,
      touchStartPos: { x: 0, y: 0 },
      touchIdentifier: null,
      isTouch: false,
      preventScroll: false,
      isDragging: false,
    };

    this.init();
  }

  init() {
    // Use touch events for touch devices, pointer events for others
    if (isTouchDevice) {
      document.addEventListener('touchstart', this.onTouchStart, { passive: false });
      document.addEventListener('touchmove', this.onTouchMove, { passive: false });
      window.addEventListener('touchend', this.onTouchEnd);
      window.addEventListener('touchcancel', this.onTouchEnd);
    } else {
      document.addEventListener('pointerdown', this.onPointerDown);
      document.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointerleave', this.onPointerUp);
    }

    Emitter.on('site:tick', this.onTick);
  }

  onTouchStart = (e) => {
    const touch = e.touches[0];
    if (!touch) return;

    const { state } = this;
    state.isPressing = true;
    state.isTouch = true;
    state.touchIdentifier = touch.identifier;
    state.touchStartTime = Date.now();
    state.touchStartPos = {
      x: touch.clientX,
      y: touch.clientY,
    };

    // Check if the touch target is a link or button
    const target = e.target;
    const isInteractive =
      target.tagName === 'A' ||
      target.tagName === 'BUTTON' ||
      target.closest('a') ||
      target.closest('button');

    // Only prevent default if we're not touching an interactive element
    if (state.preventScroll && !isInteractive) {
      e.preventDefault();
    }

    // Update position immediately for touch start
    this.updatePosition(touch.clientX, touch.clientY);

    Emitter.emit('site:pointer:down', {
      e,
      state: {
        pos: this.state.target,
        normalizedPos: this.state.normalized,
        mappedPos: this.state.mapped,
        isTouch: true,
        touchStartTime: state.touchStartTime,
        touchStartPos: state.touchStartPos,
        isInteractive,
      },
    });
  };

  onTouchMove = (e) => {
    const touch = Array.from(e.touches).find((t) => t.identifier === this.state.touchIdentifier);
    if (!touch) return;

    // Update position
    this.updatePosition(touch.clientX, touch.clientY);

    // Calculate distance moved
    const dx = touch.clientX - this.state.touchStartPos.x;
    const dy = touch.clientY - this.state.touchStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only prevent default if we're dragging (moved more than 5px)
    if (this.state.preventScroll && distance > 5) {
      e.preventDefault();
      this.state.isDragging = true;
    }

    Emitter.emit('site:pointer:move', {
      e,
      state: {
        pos: this.state.target,
        normalizedPos: this.state.normalized,
        mappedPos: this.state.mapped,
        isTouch: true,
        isDragging: this.state.isDragging,
      },
    });
  };

  onTouchEnd = (e) => {
    const { state } = this;
    state.isPressing = false;
    state.isTouch = false;
    state.touchIdentifier = null;
    state.isDragging = false;

    Emitter.emit('site:pointer:up', {
      e,
      state: {
        isTouch: true,
        touchDuration: Date.now() - state.touchStartTime,
        wasDragging: state.isDragging,
      },
    });
  };

  onPointerDown = (e) => {
    const { state } = this;
    state.isPressing = true;
    state.isTouch = false;

    Emitter.emit('site:pointer:down', {
      e,
      state: {
        pos: this.state.target,
        normalizedPos: this.state.normalized,
        mappedPos: this.state.mapped,
        isTouch: false,
      },
    });
  };

  onPointerMove = (e) => {
    this.updatePosition(e.clientX, e.clientY);

    Emitter.emit('site:pointer:move', {
      e,
      state: {
        pos: this.state.target,
        normalizedPos: this.state.normalized,
        mappedPos: this.state.mapped,
        isTouch: false,
      },
    });
  };

  onPointerUp = (e) => {
    const { state } = this;
    state.isPressing = false;
    state.isTouch = false;

    Emitter.emit('site:pointer:up', {
      e,
      state: {
        isTouch: false,
      },
    });
  };

  updatePosition(clientX, clientY) {
    const { viewport } = WebGLStore;
    const { mapRange } = gsap.utils;
    const { target, normalized, mapped } = this.state;

    target.x = clientX;
    target.y = clientY;
    normalized.x = clientX / viewport.width || 0;
    normalized.y = clientY / viewport.height || 0;
    mapped.x = mapRange(0, viewport.width, -1, 1, clientX);
    mapped.y = mapRange(0, viewport.height, -1, 1, clientY);
  }

  onTick = ({ rafDamp }) => {
    const { viewport } = WebGLStore;
    const { clamp, mapRange } = gsap.utils;
    const { current, target, ease, velocity, isTouch } = this.state;

    // Adjust ease based on whether it's a touch device and if we're currently touching
    const currentEase = isTouch ? ease * 1.5 : ease;

    current.x = damp(current.x, target.x, currentEase, rafDamp);
    current.y = damp(current.y, target.y, currentEase, rafDamp);

    const velX = Math.round((target.x - current.x) * 100) / 100;
    const velY = Math.round((target.y - current.y) * 100) / 100;
    const mouseTravelX = Math.abs(velX);
    const mouseTravelY = Math.abs(velY);

    velocity.x = mapRange(-viewport.width / 2, viewport.width / 2, 1, -1, velX);
    velocity.y = mapRange(-viewport.height / 2, viewport.height / 2, -1, 1, velY);

    this.state.speed = Math.max(mouseTravelX, mouseTravelY);
    this.state.speedNormalized = clamp(0, 1, this.state.speed);

    if (this.state.speedNormalized > 0) {
      Emitter.emit('site:pointer:lerping', {
        state: {
          ...this.state,
          isTouch,
        },
      });
    }
  };

  /**
   * Set whether to prevent default scroll behavior on touch devices
   * @param {boolean} prevent - Whether to prevent default scroll
   */
  setPreventScroll(prevent) {
    this.state.preventScroll = prevent;
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    if (isTouchDevice) {
      document.removeEventListener('touchstart', this.onTouchStart);
      document.removeEventListener('touchmove', this.onTouchMove);
      window.removeEventListener('touchend', this.onTouchEnd);
      window.removeEventListener('touchcancel', this.onTouchEnd);
    } else {
      document.removeEventListener('pointerdown', this.onPointerDown);
      document.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('pointerleave', this.onPointerUp);
    }
    Emitter.off('site:tick', this.onTick);
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Pointer();
