import { mathf } from '../mathf/mathf';
import { Raf } from './raf';
import { EASE } from '..';

/**
 * A class that runs Raf for a limited time while a given progress
 * (a value between 0-1) eases.  This class is useful because instead of
 * constanlty runnig raf, it will only run RAF when a progress value is unstable.
 *
 *
 * Consider the following example to understand what RafProgress does.
 * Here we are using an html range input to represent Progress but progresss could
 * be a window scroll, duration, mouse position etc.....a percentage amount:
 * ```ts
 * HTML
 *   <input id="range" type="range" name="points" step="0.01" min="0" max="1" style="width: 500px;">
 *
 * JS
 *  this.range = document.getElementById('range');
 *
 *  // Set the progress to the range value.
 *  this.progress = +this.range.value;
 *
 *  const raf = new Raf(() => {
 *     // Range is a value between 0 and 1.
 *     let progress = +this.range.value;
 *
 *    // Add some ease to the progress to smooth it out.
 *    this.progress = mathf.ease(this.progress, progress, 0.25, EASE.easeInOutQuad);
 *
 *   // Reduce the precision of progress.  We dont need to report progress differences
 *   // of 0.0000001.
 *    this.progress = mathf.round(this.progress, 3);
 *
 *   // Something with progress
 *   // Many manipulate the DOM here.
 *
 *
 *  }).start();
 * ```
 * Here you can see that on each RAF cycle, we check the value of the range and
 * get the progress.  We then apply an ease to that progress and then do
 * something within the RAF loop based on the current progress.
 *
 * This works but the problem is that RAF is constantly running and even if
 * the value of progress is the same as the last raf loop, we still are running
 * RAf and perhaps layout thrashing or performning unncessary calcs.
 *
 *
 * The abovce is simplied with this class.
 * ```ts
 *
 * this.range = document.getElementById('range');
 *
 * // Create an instance of raf progress.
 * let rafProgress = new RafProgress((easedProgress)=> {
 *   // DO something here like update the dom.
 *   // This is ONLY called when progress has changed in value.
 *   //..
 * })
 *
 * // Set the initial progress value.
 * rafProgress.setCurrentProgress(+this.range.value)
 *
 * // Optional, set the precision.
 * rafProgress.setPrecision(5);
 *
 * // Now listen to the range input 'input' event.  The input event is basically
 * // fired when the range changes.
 * this.range.addEventListener('input', ()=> {
 *   rafProgress.easeTo(+this.range.value, 0.25, EASE.easeInOutQuad)
 * })
 *
 *
 *
 * ```
 *
 */
export class RafProgress {
    private raf: Raf;
    private progressRafLoop: Function;
    private currentProgress: number;
    private targetProgress: number;
    private easeAmount: number;
    private easingFunction: Function;
    private precision: number;

    constructor(progressRafLoop: Function) {
        /**
         * The internally known current progress.
         */
        this.currentProgress = 0;

        /**
         * The callback to be executed when progress has changed in value.
         * @type {Function}
         */
        this.progressRafLoop = progressRafLoop;

        /**
         * The number of decimals to use when checking the equality of the
         * previous progress versus current.
         */
        this.precision = 5;

        /**
         * The amount of ease to apply.  This gets calculated as per RAF,
         * how much of the difference between the current value and target
         * should the current value be updated by.  Therefore, 1 would mean,
         * the current value would immediately update to the target value after
         * one RAF cycle.  Use 1 for no ease.
         */
        this.easeAmount = 1;

        this.targetProgress = this.currentProgress;
        this.easingFunction = EASE.linear;

        this.raf = new Raf(() => {
            this.rafLoop();
        });
    }

    /**
     * Sets the precision.  Precision is used to check how closely the current
     * progress is versus the previous progress per RAF cycle.
     * The lower the number, the less precise.
     *
     * Use a lower number if you want want to improve performance since it will
     * result in calling Raf fewer times.
     */
    setPrecision(value: number) {
        this.precision = value;
    }


    /**
     * Once raf is starated, updates on each raf cycle if raf is running.
     * Dirty check for progress and stops raf once the value has stabilized.
     */
    private rafLoop() {

        let previousProgress = this.currentProgress;

        // Reduce the precision of progress.  We dont need to report progress differences
        // of 0.0000001.
        this.currentProgress = mathf.round(this.currentProgress, this.precision);

        this.currentProgress =
            mathf.ease(this.currentProgress,
                this.targetProgress,
                this.easeAmount,
                this.easingFunction);

        // Call the callback.
        this.progressRafLoop(this.currentProgress);

        // Stop RAF if the value of progress has stabilized.
        if (previousProgress == this.currentProgress) {
            this.raf.stop();
        }
    }

    /**
     * Sets the current progress.
     */
    setCurrentProgress(progress: number) {
        this.currentProgress = mathf.clampAsProgress(progress);
    }

    /**
     * Eases the progress to a target value.  Until that value is reached,
     * the progressRafLoop is called.
     *
     * @param {number} targetProgress The progress to get to.
     * @param {number} easeAmount The amount to ease. This gets calculated as per
     *     RAF, how much of the difference between the current value and target
     *     should the current value be updated by.  Therefore, 1 would mean
     *     no ease. 0.1 would mean a lot of ease.
     * @param {Function} easingFunction An optional easing funciton.  Defaults to
     *     linear.
     */
    easeTo(targetProgress: number, easeAmount: number,
        easingFunction: Function = EASE.linear) {

        this.targetProgress = mathf.clampAsProgress(targetProgress);
        this.easeAmount = mathf.clampAsPercent(easeAmount);
        this.easingFunction = easingFunction;

        // Start up RAF to make updates and ease to the target progress.
        this.raf.start();
    }

}