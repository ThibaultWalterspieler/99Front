import { Plane, Raycaster, Vector2, Vector3 } from 'three';

import Camera from '@99Stud/webgl/components/Camera';
import Emitter from '@99Stud/webgl/events/Emitter';
import { debounce } from '@99Stud/webgl/utils/debounce';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/**
 * @typedef {Object} DragSettings
 * @property {boolean} [dragEnabled=true] - Whether dragging is enabled
 * @property {'x'|'y'|'xy'} [axis='xy'] - Axis constraints for dragging
 * @property {number} [speed=0.1] - Drag movement speed
 * @property {number} [dragFactor=0.01] - Factor applied to drag movement
 * @property {number} [damping=0.1] - Smoothing factor for drag movement (0 = no smoothing)
 * @property {Object} [bounds=null] - Bounds for constraining drag movement
 * @property {Vector3} [bounds.min] - Minimum bounds
 * @property {Vector3} [bounds.max] - Maximum bounds
 * @property {boolean} [usePlane=true] - Use 3D plane intersection vs screen space
 * @property {number} [debounceDelay=100] - Debounce delay for onDragStart in milliseconds
 * @property {boolean} [debounceLeading=true] - Execute onDragStart on leading edge
 * @property {number} [debounceEndDelay=50] - Debounce delay for onDragEnd in milliseconds
 * @property {boolean} [debounceEndLeading=true] - Execute onDragEnd on leading edge
 * @property {boolean} [momentum=true] - Whether momentum is enabled
 * @property {number} [momentumDecay=0.95] - Momentum decay rate
 * @property {number} [momentumThreshold=0.1] - Minimum momentum threshold
 * @property {number} [touchSensitivity=1.5] - Touch sensitivity multiplier
 * @property {boolean} [preventScroll=true] - Whether to prevent default scroll behavior
 * @property {number} [touchStartThreshold=5] - Minimum distance to start dragging
 */
const DEFAULT_SETTINGS = {
  dragEnabled: true,
  axis: 'xy',
  speed: 0.1,
  dragFactor: 0.01,
  damping: 0.1,
  bounds: null,
  usePlane: true,
  debounceDelay: isTouchDevice ? 100 : 300,
  debounceLeading: true,
  debounceEndDelay: isTouchDevice ? 20 : 50,
  debounceEndLeading: true,
  momentum: isTouchDevice,
  momentumDecay: 0.95,
  momentumThreshold: 0.1,
  touchSensitivity: 1.5,
  preventScroll: true,
  touchStartThreshold: 5,
};

/**
 * @readonly
 * @enum {string}
 */
const DIRECTION = {
  NONE: 'none',
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
};

/**
 * CustomDrag - A flexible drag handler for Three.js objects
 * Supports both 3D plane intersection and screen space dragging
 */
export class CustomDrag {
  /**
   * @param {Object3D} target - The Three.js object to make draggable
   * @param {Object} options - Configuration options
   * @param {string} [options.name] - Identifier for this drag instance
   * @param {DragSettings} [options.settings] - Drag behavior settings
   * @param {Function} [options.onDragStart] - Called when drag starts
   * @param {Function} [options.onDrag] - Called during drag
   * @param {Function} [options.onDragEnd] - Called when drag ends
   */
  constructor(target, options = {}) {
    this.name = options?.name ? `CustomDrag-${options.name}` : 'CustomDrag';
    this.settings = { ...DEFAULT_SETTINGS, ...options?.settings };
    this.target = target;

    this.state = {
      isDragging: false,
      startPos: new Vector2(),
      currentPos: new Vector2(),
      delta: new Vector2(),
      targetStartPos: new Vector3(),
      dragPlane: new Plane(new Vector3(0, 0, 1), 0),
      intersectionStart: new Vector3(),
      intersectionCurrent: new Vector3(),
      planeCenter: new Vector3(),
      dragDirection: {
        horizontal: DIRECTION.NONE,
        vertical: DIRECTION.NONE,
      },
      distance: { x: 0, y: 0 },
      momentum: new Vector2(),
      lastTouchTime: 0,
      touchStartTime: 0,
      touchStartPos: new Vector2(),
    };

    this.raycaster = new Raycaster();
    this.pointer = new Vector2();
    this._tempVector = new Vector3();

    // Store callbacks and create debounced versions
    const originalOnDragStart = options?.onDragStart || (() => { });
    const originalOnDragEnd = options?.onDragEnd || (() => { });

    this.callbacks = {
      onDragStart:
        this.settings.debounceDelay > 0
          ? debounce(originalOnDragStart, this.settings.debounceDelay, {
            leading: this.settings.debounceLeading,
            trailing: !this.settings.debounceLeading,
          })
          : originalOnDragStart,
      onDrag: options?.onDrag || (() => { }),
      onDragEnd:
        this.settings.debounceEndDelay > 0
          ? debounce(originalOnDragEnd, this.settings.debounceEndDelay, {
            leading: this.settings.debounceEndLeading,
            trailing: !this.settings.debounceEndLeading,
          })
          : originalOnDragEnd,
    };

    this.init();
  }

  /**
   * Initialize the drag handler
   * @private
   */
  init() {
    if (!this.target) {
      console.warn(`${this.name}: No target provided`);
      return;
    }

    this.setupDragPlane();
    this.bindEvents();
  }

  /**
   * Set up the drag plane for 3D intersection
   * @private
   */
  setupDragPlane() {
    if (this.settings.usePlane) {
      const cameraDirection = new Vector3();
      Camera.getWorldDirection(cameraDirection);
      this.state.dragPlane.setFromNormalAndCoplanarPoint(
        cameraDirection.negate(),
        this.target.position,
      );
      this.state.planeCenter.copy(this.target.position);
    }
  }

  /**
   * Bind event listeners
   * @private
   */
  bindEvents() {
    Emitter.on('site:pointer:down', this.onPointerDown);
    Emitter.on('site:pointer:move', this.onPointerMove);
    Emitter.on('site:pointer:up', this.onPointerUp);
  }

  /**
   * Remove event listeners
   * @private
   */
  unbindEvents() {
    Emitter.off('site:pointer:down', this.onPointerDown);
    Emitter.off('site:pointer:move', this.onPointerMove);
    Emitter.off('site:pointer:up', this.onPointerUp);
  }

  /**
   * Handle pointer down event
   * @private
   */
  onPointerDown = ({ state }) => {
    if (!this.settings.dragEnabled) return;

    this.updatePointer(state.mappedPos);
    this.raycaster.setFromCamera(this.pointer, Camera);

    const intersects = this.raycaster.intersectObject(this.target, true);

    if (intersects.length > 0) {
      this.state.touchStartTime = Date.now();
      this.state.touchStartPos.copy(state.pos);

      if (this.settings.preventScroll && isTouchDevice) {
        state.event?.preventDefault();
      }

      this.startDrag(state.pos, intersects[0]);
    }
  };

  /**
   * Handle pointer move event
   * @private
   */
  onPointerMove = ({ state }) => {
    if (!this.state.isDragging) return;

    this.state.lastTouchTime = Date.now();

    this.updateDrag(state.pos, state.mappedPos);
  };

  /**
   * Handle pointer up event
   * @private
   */
  onPointerUp = ({ _state, _e }) => {
    if (this.state.isDragging) {
      // Calculate momentum if enabled
      if (this.settings.momentum && isTouchDevice) {
        const touchDuration = Date.now() - this.state.touchStartTime;
        // Use the current position from our state instead of the event state
        const touchDistance = new Vector2().subVectors(
          this.state.currentPos,
          this.state.touchStartPos
        );

        // Only apply momentum if the touch was quick enough and moved far enough
        if (touchDuration < 300 && touchDistance.length() > this.settings.touchStartThreshold) {
          this.state.momentum.copy(touchDistance).multiplyScalar(1 / touchDuration * this.settings.touchSensitivity);
        }
      }

      this.endDrag();
    }
  };

  /**
   * Update pointer position
   * @private
   */
  updatePointer(mappedPos) {
    this.pointer.x = mappedPos.x;
    this.pointer.y = -mappedPos.y;
  }

  /**
   * Start dragging
   * @private
   */
  startDrag(screenPos, intersection) {
    this.state.isDragging = true;
    this.state.startPos.copy(screenPos);
    this.state.currentPos.copy(screenPos);
    this.state.targetStartPos.copy(this.target.position);

    if (this.settings.usePlane) {
      this.state.intersectionStart.copy(intersection.point);
      this.setupDragPlane();
    }

    this.callbacks.onDragStart({
      target: this.target,
      intersection,
      startPos: this.state.startPos.clone(),
      targetStartPos: this.state.targetStartPos.clone(),
    });
  }

  /**
   * Calculate drag direction and distance
   * @private
   */
  calculateDragDirectionAndDistance(currentPos) {
    const distanceX = currentPos.x - this.state.targetStartPos.x;
    const distanceY = currentPos.y - this.state.targetStartPos.y;

    this.state.dragDirection.horizontal =
      distanceX > 0 ? DIRECTION.RIGHT : distanceX < 0 ? DIRECTION.LEFT : DIRECTION.NONE;
    this.state.dragDirection.vertical =
      distanceY > 0 ? DIRECTION.UP : distanceY < 0 ? DIRECTION.DOWN : DIRECTION.NONE;

    this.state.distance.x = distanceX;
    this.state.distance.y = distanceY;
  }

  /**
   * Update drag state and position
   * @private
   */
  updateDrag(screenPos, mappedPos) {
    this.state.currentPos.copy(screenPos);
    this.state.delta.subVectors(this.state.currentPos, this.state.startPos);

    const dragData = this.settings.usePlane
      ? this.calculatePlaneDrag(mappedPos)
      : this.calculateScreenDrag();

    this.calculateDragDirectionAndDistance(dragData.position);
    this.applyConstraints(dragData);
    this.updateTargetPosition(dragData);

    this.callbacks.onDrag({
      target: this.target,
      delta: this.state.delta.clone(),
      dragData: { ...dragData },
      screenDelta: this.state.delta.clone(),
      direction: { ...this.state.dragDirection },
      distance: { ...this.state.distance },
    });
  }

  /**
   * Calculate drag data using 3D plane intersection
   * @private
   */
  calculatePlaneDrag(mappedPos) {
    this.updatePointer(mappedPos);
    this.raycaster.setFromCamera(this.pointer, Camera);

    const intersection = new Vector3();
    this.raycaster.ray.intersectPlane(this.state.dragPlane, intersection);

    const dragDelta = new Vector3().subVectors(intersection, this.state.intersectionStart);
    const targetPos = new Vector3().addVectors(this.state.targetStartPos, dragDelta);

    return {
      position: targetPos,
      delta: dragDelta,
      worldDelta: dragDelta,
    };
  }

  /**
   * Calculate drag data using screen space
   * @private
   */
  calculateScreenDrag() {
    const scaledDelta = this.state.delta.clone().multiplyScalar(this.settings.dragFactor);

    const deltaX = this.settings.axis.includes('x') ? scaledDelta.x * this.settings.speed : 0;
    const deltaY = this.settings.axis.includes('y') ? -scaledDelta.y * this.settings.speed : 0;

    const worldDelta = new Vector3(deltaX, deltaY, 0);
    const targetPos = new Vector3().addVectors(this.state.targetStartPos, worldDelta);

    return {
      position: targetPos,
      delta: new Vector3(deltaX, deltaY, 0),
      worldDelta,
    };
  }

  /**
   * Apply position constraints
   * @private
   */
  applyConstraints(dragData) {
    if (this.settings.bounds) {
      const { min, max } = this.settings.bounds;
      dragData.position.clamp(min, max);
    }
  }

  /**
   * Update target object position
   * @private
   */
  updateTargetPosition(dragData) {
    if (this.settings.momentum && isTouchDevice && !this.state.isDragging) {
      if (this.state.momentum.length() > this.settings.momentumThreshold) {
        const momentumDelta = new Vector3(
          this.state.momentum.x * this.settings.speed,
          -this.state.momentum.y * this.settings.speed,
          0
        );

        dragData.position.add(momentumDelta);
        this.state.momentum.multiplyScalar(this.settings.momentumDecay);
      } else {
        this.state.momentum.set(0, 0);
      }
    }

    if (this.settings.damping > 0) {
      this.target.position.lerp(dragData.position, 1 - this.settings.damping);
    } else {
      this.target.position.copy(dragData.position);
    }
  }

  /**
   * End dragging
   * @private
   */
  endDrag() {
    this.state.isDragging = false;
    this.callbacks.onDragEnd({
      target: this.target,
      finalPosition: this.target.position.clone(),
      totalDelta: this.state.delta.clone(),
      direction: { ...this.state.dragDirection },
      distance: { ...this.state.distance },
    });

    this.state.delta.set(0, 0);
    this.state.distance = { x: 0, y: 0 };
    this.state.dragDirection = {
      horizontal: DIRECTION.NONE,
      vertical: DIRECTION.NONE,
    };
  }

  /**
   * Enable dragging
   * @public
   */
  enable() {
    this.settings.dragEnabled = true;
  }

  /**
   * Disable dragging
   * @public
   */
  disable() {
    this.settings.dragEnabled = false;
    if (this.state.isDragging) {
      this.endDrag();
    }
  }

  /**
   * Set drag axis constraint
   * @public
   * @param {'x'|'y'|'xy'} axis - The axis to constrain dragging to
   */
  setAxis(axis) {
    this.settings.axis = axis;
  }

  /**
   * Set drag bounds
   * @public
   * @param {Vector3} min - Minimum bounds
   * @param {Vector3} max - Maximum bounds
   */
  setBounds(min, max) {
    this.settings.bounds = { min, max };
  }

  /**
   * Update debounce settings for onDragStart
   * @public
   * @param {number} delay - Debounce delay in milliseconds (0 to disable)
   * @param {Object} [options] - Debounce options
   * @param {boolean} [options.leading=true] - Execute on leading edge
   * @param {Function} [options.callback] - New callback function (optional)
   */
  setDebounce(delay, options = {}) {
    const { leading = true, callback } = options;
    const originalOnDragStart = callback || this.callbacks.onDragStart;

    // Cancel existing debounced function if it exists
    if (typeof this.callbacks.onDragStart?.cancel === 'function') {
      this.callbacks.onDragStart.cancel();
    }

    this.settings.debounceDelay = delay;
    this.settings.debounceLeading = leading;

    // Create new debounced function or use original
    this.callbacks.onDragStart =
      delay > 0
        ? debounce(originalOnDragStart, delay, {
          leading,
          trailing: !leading,
        })
        : originalOnDragStart;
  }

  /**
   * Update debounce settings for onDragEnd
   * @public
   * @param {number} delay - Debounce delay in milliseconds (0 to disable)
   * @param {Object} [options] - Debounce options
   * @param {boolean} [options.leading=true] - Execute on leading edge
   * @param {Function} [options.callback] - New callback function (optional)
   */
  setDebounceEnd(delay, options = {}) {
    const { leading = true, callback } = options;
    const originalOnDragEnd = callback || this.callbacks.onDragEnd;

    // Cancel existing debounced function if it exists
    if (typeof this.callbacks.onDragEnd?.cancel === 'function') {
      this.callbacks.onDragEnd.cancel();
    }

    this.settings.debounceEndDelay = delay;
    this.settings.debounceEndLeading = leading;

    // Create new debounced function or use original
    this.callbacks.onDragEnd =
      delay > 0
        ? debounce(originalOnDragEnd, delay, {
          leading,
          trailing: !leading,
        })
        : originalOnDragEnd;
  }

  /**
   * Set momentum settings
   * @public
   * @param {boolean} enabled - Whether momentum is enabled
   * @param {Object} [options] - Momentum options
   * @param {number} [options.decay=0.95] - Momentum decay rate
   * @param {number} [options.threshold=0.1] - Minimum momentum threshold
   * @param {number} [options.sensitivity=1.5] - Touch sensitivity multiplier
   */
  setMomentum(enabled, options = {}) {
    this.settings.momentum = enabled;
    if (options.decay !== undefined) this.settings.momentumDecay = options.decay;
    if (options.threshold !== undefined) this.settings.momentumThreshold = options.threshold;
    if (options.sensitivity !== undefined) this.settings.touchSensitivity = options.sensitivity;
  }

  /**
   * Set touch-specific settings
   * @public
   * @param {Object} options - Touch settings
   * @param {boolean} [options.preventScroll=true] - Whether to prevent default scroll behavior
   * @param {number} [options.startThreshold=5] - Minimum distance to start dragging
   */
  setTouchSettings(options = {}) {
    if (options.preventScroll !== undefined) this.settings.preventScroll = options.preventScroll;
    if (options.startThreshold !== undefined) this.settings.touchStartThreshold = options.startThreshold;
  }

  /**
   * Clean up and remove event listeners
   * @public
   */
  destroy() {
    this.disable();
    this.unbindEvents();

    // Cancel any pending debounced calls
    if (typeof this.callbacks.onDragStart?.cancel === 'function') {
      this.callbacks.onDragStart.cancel();
    }
    if (typeof this.callbacks.onDragEnd?.cancel === 'function') {
      this.callbacks.onDragEnd.cancel();
    }
  }
}
