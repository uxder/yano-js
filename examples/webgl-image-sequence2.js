

import {RafProgress, RAF_PROGRESS_EVENTS} from '../lib/raf/raf-progress';
import {WebGlImageSequence} from '../lib/dom/webgl-image-sequence';

import {EASE} from '../lib/ease/ease';
import {dom} from '../lib/dom/dom';
import {DomWatcher} from '../lib/dom/dom-watcher';


/**
 * This sample expands on canvas image sequence sample 1 and demonstrates
 * usage of multiinterpolate.
 */
export default class WebGlImageSequenceSample2 {
  constructor() {
    console.log('webgl image sequence2');
    this.domWatcher = new DomWatcher();

    this.canvasContainerElement = document.querySelector('.canvas-container');
    this.parentElement = document.getElementById('parent');

    // Instance of rafProgress.
    this.rafProgress = new RafProgress();

    // Update the progress value per scroll.
    this.domWatcher.add({
      element: window,
      on: 'scroll',
      callback: (event) => {
        this.progress =
                    dom.getElementScrolledPercent(this.parentElement);
        this.rafProgress.easeTo(this.progress, 0.25, EASE.Linear);
      },
      eventOptions: {passive: true},
    });

    // Update progress immediately on load.
    this.progress =
            dom.getElementScrolledPercent(this.parentElement);
    this.rafProgress.easeTo(this.progress, 1, EASE.Linear);
    this.rafProgress.watch(this.onProgressUpdate.bind(this));


    // Generate image sources.
    this.sources = [];
    for (let i = 1; i <= 153; i++) {
      let value = i + '';
      value = value.padStart(4, '0');
      this.sources.push('/public/frames/thumb' + value + '.jpg');
    }

    // Create Canvas Image Sequenece
    this.webglImageSequence = new WebGlImageSequence(
        this.canvasContainerElement,
        [{images: this.sources}]
    );

    let progressPoints = [
      {
        from: 0, to: 0.5, start: 0, end: 1,
      },
      {
        from: 0.5, to: 1, start: 1, end: 0,
      },
    ];
    this.webglImageSequence.setMultiInterpolation(progressPoints);

    // Load the iamges.
    this.webglImageSequence.load().then(() => {
      // When ready render whatever the current easedProgress value is.
      this.webglImageSequence.renderByProgress(
          this.rafProgress.currentProgress
      );
    });
  }

  onProgressUpdate(easedProgress, direction) {
    this.webglImageSequence.renderByProgress(easedProgress);
  }
}