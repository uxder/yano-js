

import { DomWatcher } from '../dom/dom-watcher';
import { dom } from '../dom/dom';
import { func } from '../func/func';
import { is } from '../is/is';
import { elementVisibility, ElementVisibilityObject } from '../dom/element-visibility';

export const LazyVideoEvents = {
    LOAD_START: 'LOAD_START',
}

/**
 * Vanilla Implementation of Lazy Video.
 * This is a port of directive-lazy-video to a native implementation.
 *
 *
 * Usage Example:
 *
 *
 * ```
 *  const lazyVideoElements: Array<HTMLElement> =
 *       Array.from(this.el.querySelectorAll('[lazy-video]'));
 *  lazyVideoElements.forEach((element:HTMLElement)=> {
 *      this.lazyVideos.push(
 *           new LazyVideo(element)
 *       );
 *  })
 *
 *
 * <video playsinline disableremoteplayback muted title="hello"
 *   <source type="video/mp4" lazy-video="{{url}}"></source>
 * <video>
 * ```
 *
 *
 *
 * When the element comes into view, it will render as and load.
 * ```
 * <video>
 *   <source type="video/mp4" lazy-video="{{url}}" src="..."></source>
 * <video>
 * ```
 *
 *
 * This class does display: none detection so will try to intelligently load
 * videos ONLY when they are visible on the page.
 *
 * This allows you to have conditional videos such as mobile only.
 *
 * ````
 * .only-mobile
 *   +md
 *     display: none
 *
 * <video class="only-mobile">
 *   <source type="video/mp4" lazy-video="{{url}}"></source>
 * <video>
 * ```
 *
 * # Forward Scalar
 * Adjust the forward scalar to higher values to load videos more aggressively.
 *   <source lazy-video="{{url}}" lazy-video-forward-scalar="3"></source>
 *
 *
 *
 * # Listen for events.
 * Events get fired on the video element.
 *
 * ```
 * import { lazyVideoDirective, lazyVideoEvents } from 'yano-js/lib/angular/directive-lazy-video';
 * document.getElementById("myvideo").addEventListener(lazyVideoEvents.LOAD_START, ()=. {
 *    // Loading started!
 * }, { once: true});
 *
 *
 * <video id="myvideo" class="only-mobile">
 *   <source type="video/mp4" lazy-video="{{url}}"></source>
 * <video>
 * ```
 *
 */
export class LazyVideo {
    /**
     * The root video element.
     */
    private el: HTMLElement;

    /**
     * The parent of the source element which  is the <video> element.
     */
    private parent: HTMLElement;

    /**
     * The url of the video to load.
     */
    private url: string;
    private setComplete: boolean;
    private ev: ElementVisibilityObject;
    private watcher: DomWatcher;

    // The amount of rootMargin offset to apply to lazyimage.
    // 1 would result in a forward load of 1 * window.innerHeight.
    // 0 would mean no forward load.
    // Defaults to 1.
    // Set to higher values if you want to load aggressively load video that are below
    // the current fold.
    private forwardLoadScalar: number;

    constructor(el: HTMLElement) {

        this.el = el;
        this.parent = this.el.parentElement;

        this.watcher = new DomWatcher();
        this.watcher.add({
            element: window,
            on: 'smartResize',
            callback: func.debounce(this.onResize.bind(this), 500)
        });

        const forwardScalar = this.el.getAttribute('lazy-video-forward-scalar');
        this.forwardLoadScalar =
            is.defined(forwardScalar) ? +forwardScalar : 1;

        /**
         * The Video source.
         */
        this.url = this.el.getAttribute('lazy-video');

        /**
         * Whether this directive has finished setting the video.
         */
        this.setComplete = false;

        this.ev = elementVisibility.inview(this.parent, {
            rootMargin: window.innerHeight * this.forwardLoadScalar + 'px'
        }, () => {
            this.paint();
        });

        // Immediately attempt to apint.
        this.ev.readyPromise.then(() => {
            this.paint();
        })
    }


    public onResize(): void {
        if (!this.setComplete) {
            this.paint();
        }
    }


    public paint(): void {
        if (this.isPainted() && !this.setComplete) {
            this.setComplete = true;
            this.el.setAttribute('src', this.url);

            // Tell the parent element (video) to load.
            this.parent['load']();

            // Fire an event.
            dom.event(this.parent, LazyVideoEvents.LOAD_START, {});

            // Once it's loaded, dispose of this module.
            this.dispose();
        }
    }


    /**
    * Determines whether this element was painted (displayed on the screen).
    * The basis of this is having a css class of display none.  Other methods
    * of hiding the element will return true.
    */
    isPainted() {
        return !dom.isDisplayNoneWithAncestors(this.parent) && this.ev.state().inview;
    }


    public dispose(): void {
        this.ev.dispose();
        this.watcher.dispose();
    }
}


/**
 * A utility class that helps quickly create and dispose lazy video elements on the page.
 */
export class LazyVideoManager {

    private lazyVideos: Array<LazyVideo> = [];

    constructor() {
        const lazyVideoElements: Array<HTMLElement> = Array.from(document.querySelectorAll('[lazy-video]'));
        lazyVideoElements.forEach((element:HTMLElement)=> {
            this.lazyVideos.push(
              new LazyVideo(element)
            )
        })
    }


    dispose() {
        this.lazyVideos && this.lazyVideos.forEach((lazyVideo)=> {
            lazyVideo.dispose();
        })
    }
}