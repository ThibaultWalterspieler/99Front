import gsap from "gsap";

import Emitter from "./Emitter";
class Raf {
  constructor() {
    this.isPaused = false;

    this.init();
  }

  init() {
    gsap.ticker.add(this.onTick);
  }

  onTick = (time, deltaTime) => {
    if (!this.isPaused) {
      Emitter.emit("site:tick", { delta: deltaTime, time: time, rafDamp: gsap.ticker.deltaRatio(60) });
    }
  };
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Raf();
