<script>
import { useTicker } from '@monogrid/vue-boost';
import { usePlatform } from '@monogrid/vue-boost/core';
import { templateRef, useWindowSize } from '@vueuse/core';
import { defineComponent, watch } from 'vue';

import WebGLStore from '@/webgl/store/WebGLStore.js';
import { pointer } from '@/webgl/utils/events/Pointer';
import { WebGLApp } from '@/webgl/WebGLApp.js';

export default defineComponent({
  name: 'WebGLCanvas',
  components: {},
  props: {
    visible: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots, emit }) {
    const wrapper = templateRef('wrapper');
    const platform = usePlatform();
    const { width, height } = useWindowSize();
    const { toggle } = useTicker(onTick, { immediate: false });
    const webgl = new WebGLApp();

    function onTick({ time, deltaTime, rafDamp }) {
      webgl.onTick({ time, deltaTime, rafDamp });
      pointer.onTick({ rafDamp });
    }

    watch(
      () => props.visible,
      (visible) => {
        if (!visible) return;
        webgl.init(wrapper.value);
        WebGLStore.setDeviceSettings({
          tier: 3,
          isMobile: platform.mobile.value,
        });
        toggle();
      },
    );
    watch(
      [width, height, () => props.visible],
      ([w, h, visible]) => {
        if (!visible) return;
        WebGLStore.onResize(w, h);
        webgl.onResize();
      },
      { immediate: true },
    );

    return {};
  },
});
</script>

<template>
  <div ref="wrapper" class="canvas-wrapper fixed w-full h-full inset-0 z-0" />
</template>

<style lang="scss" scoped>
.canvas-wrapper {
  touch-action: none;
  user-select: none;

  & > canvas {
    -webkit-tap-highlight-color: transparent;
    touch-action: none;
    user-select: none;
  }
}
</style>
