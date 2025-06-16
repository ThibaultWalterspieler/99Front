import gsap from 'gsap';

import Emitter from './Emitter';
class Raf {
  private isPaused: boolean;

  constructor() {
    this.isPaused = false;

    this.init();
  }

  init() {
    gsap.ticker.add(this.onTick);
  }

  onTick = (time: number, deltaTime: number) => {
    if (!this.isPaused) {
      Emitter.emit('site:tick', {
        delta: deltaTime,
        time: time,
        rafDamp: gsap.ticker.deltaRatio(60),
      });
    }
  };
}

const raf = new Raf();

export default raf;
