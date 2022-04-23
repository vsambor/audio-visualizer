/**
 * Generates animated imagery based on a piece of music. 
 * 
 * The imagery is generated and rendered in real time synchronized with the music.
 * Creates an audio visualizer in DOM, based on Web Audio API.
 * Also can use different visualizer styles by preference.  
 ***/

import {
  VISUALIZER_STYLE_2D,
  VISUALIZER_STYLE_3D,
} from '../src/constants';


const NUMBER_OF_BARS = 40;
const BAR_UPDATE_FREQUENCY = 25; // In miliseconds => 0.025 seconds => 40Hz.
const DEFAULT_VOLUME = 0.5;


export default class Visualizer {

  /**
   * Creates an instance of Vizualizer class based on given parameters.
   *
   * @param {Object} options - visualizer customization required and optional parameters:
   *  required:
   *     @param {String} containerSelector - selector for visualizer DOM hook.
   *     @param {HTMLAudioElement} audioSource - the audio to be used by visualizer.
   *  optional:
   *     style,
   *     volume, 
   *     loopAudio,
   *     numberOfBars,   // Not yet implemented.
   *     bar colors etc. // Not yet implemented.
   */
  constructor(options = {}) {
    this._checkParameters(options);

    this._options = options;
    this._container = document.querySelector(this._options.containerSelector);
    this._audio = this._options.audioSource;

    this._useStyle();
    this._createAudioPipeline();
    this._generateBarsInDOM();

    // This function reference is called at each requestAnimationFrame. If we would bind it direclty, 
    // then at each call .bind creates a new function refference and we want to avoid that for performance reason.
    this._renderFrameBind = this._renderFrame.bind(this);
  }

  /**
   * Starts the visualizer and plays the audio source.
   */
  start() {
    this._audio.loop = this._options.loopAudio || false;
    this._audio.volume = this._options.volume || DEFAULT_VOLUME;
    this._audio.play();

    this._frequencies = new Uint8Array(this._analyzer.frequencyBinCount);
    this._renderFrame();
  }

  /**
   * Guard pattern - check if the require arguments are present. 
   * Throws an error if at least one of required arguments is not present.
   * 
   * @param {Object} options - constructor arguments.
   */
  _checkParameters(options) {
    const requiredList = [
      "containerSelector",
      "audioSource",
    ];

    for (const req of requiredList) {
      if (!(req in options)) {
        throw (`Please provide the required argument: <${req}>.`);
      }
    }
  }

  /**
   * Displays the right visualizer style.
   */
  _useStyle() {
    this._visualizerStyle = this._options.style || VISUALIZER_STYLE_2D;
    this._container.classList.add(this._visualizerStyle);
    this._container.classList.remove("d-none");
  }

  /**
   * Initializes the audio graph processing pipeline. 
   */
  _createAudioPipeline() {
    // Creates an audio context.
    this._audioContext = new AudioContext();

    // Creates an audio source.
    this._audioSource = this._audioContext.createMediaElementSource(this._audio);

    // Creates an audio analyzer.
    this._analyzer = this._audioContext.createAnalyser();

    // Connect source => analyzer => context's destination.
    this._audioSource.connect(this._analyzer);
    this._audioSource.connect(this._audioContext.destination);
  }

  /**
   * Generates bars represented by divs and appendeds them in the container.
   */
  _generateBarsInDOM() {
    // Keeps the bar nodes in memory to avoid querying DOM at each refresh (kind of virtual DOM). 
    this._bars = new Map();

    switch (this._visualizerStyle) {
      case VISUALIZER_STYLE_2D:
        this._generate2DBars();
        break;

      case VISUALIZER_STYLE_3D:
        this._generate3DBars();
        break;
    }
  }

  /**
   * Generates bar divs for 2D visualization style.
   */
  _generate2DBars() {
    for (let i = 0; i < NUMBER_OF_BARS; ++i) {
      const bar = document.createElement("div");
      bar.classList.add("visualizer__bar");

      this._bars.set(i, bar);
      this._container.append(bar);
    }
  }

  /**
   * Generates bar divs for 3D visualization style.
   */
  _generate3DBars() {
    const cilinder = document.createElement("div");
    cilinder.classList.add("visualizer__cilinder", "rotate");

    // Distribute bars per degree of a circle.
    const step = 360 / NUMBER_OF_BARS;

    for (let i = 0; i < NUMBER_OF_BARS; ++i) {
      const bar = document.createElement("div");
      bar.classList.add("visualizer__bar");
      bar.style.transform = `rotateY(${i * step}deg) translateZ(140px)`;
      this._bars.set(i, bar);
      cilinder.append(bar);
    }

    this._container.append(cilinder);
  }

  /**
   * Updates the bars with the new sound frequency values at a period BAR_UPDATE_FREQUENCY.
   */
  _renderFrame() {
    // The timestamps returned by performance.now() are not limited to one-millisecond resolution.
    // Instead, they represent times as floating-point numbers with up to microsecond precision.
    // Also unlike Date.now(), the values returned by performance.now() always increase at a constant rate, 
    // independent of the system clock (which might be adjusted manually or skewed by software).
    const now = performance.now();
    if (!this._lastRenderedTime) {
      this._lastRenderedTime = now;
    }

    const timePasedSinceLastCall = now - this._lastRenderedTime;
    if (timePasedSinceLastCall < BAR_UPDATE_FREQUENCY) {
      window.requestAnimationFrame(this._renderFrameBind);
      return;
    }

    // Updates the frequencies data.
    this._analyzer.getByteFrequencyData(this._frequencies);

    for (let i = 0; i < NUMBER_OF_BARS; ++i) {
      const freq = this._frequencies[i];
      const currBar = this._bars.get(i);
      const barHeight = this._getBarHeightForFrequency(freq);

      // TODO - use transform scale instead of height, in order to trigger the GPU.
      currBar.style.height = `${barHeight}px`;
    }

    this._lastRenderedTime = performance.now();

    // Executes _renderFrame at the most appropriate time for the browser, usually at the beginning of the frame.
    window.requestAnimationFrame(this._renderFrameBind);
  }

  /**
   * Calculates the div bar height based on current frequency.
   * 
   * @param {*} freq - current bar frequency datum.
   * @returns {} - bar height in pixels.
   */
  _getBarHeightForFrequency(freq) {
    // 1.6 is arbitrary to give more gain to the frequency so that it can go up to the end of visualizer.
    const freqValue = Math.abs(freq) * 1.6 || 0;

    // Removes 1 pixels from the container height, in order to keep the bar inside the container border.
    const maxContainerPx = this._container.offsetHeight - 1;
    const minHeightPX = 1;

    const maxHeight = Math.max(freqValue, minHeightPX);

    // Makes sure the bars will not go outside container.
    const barHeight = Math.min(maxHeight, maxContainerPx);

    return barHeight;
  }
}
