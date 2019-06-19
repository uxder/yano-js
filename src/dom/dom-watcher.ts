export interface DomWatcherConfig {
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
    // The default event listerner options including passive, once etc.
    eventOptions?: Object | undefined;

    /**
     * The element to Watch
     */
    element: HTMLElement | Window;

    /**
     * The name of the event to watch.
     */
    on: string;

    /**
     * The callback to execute.
     */
    callback: Function;

    /**
     * A condition in which the function should run.
     * For example, you may want to limit execution of the callback
     * to just mobile.
     */
    runWhen?: Function;

    /**
     * Pass an id to this lister
     */
    id?: string;

    /**
     * The actual listener that gets attached to the element.
     * This gets created by DomWatcher.
     */
    listener?: EventListenerOrEventListenerObject;

    /**
     * A function that removes the listener.  Generated by DomWatcher.
     */
    remover?: Function;
}


/**
 * A class that helps with DOM events.  The main usecase for this class is
 * to be able to watch the dom and then later remove a group of events
 * all at once.
 *
 * Basic Usage
 * ```ts
 * let new watcher = new DomWatcher();
 *
 * var scrollCallback = (event, done)=> {
 *   // on scroll events.
 * };
 * watcher.add({
 *   element: window,
 *   on: 'scroll',
 *   callback: scrollCallback,
 *   eventOptions: { passive: true }
 * })
 *
 * watcher.add({
 *   element: element,
 *   on: 'click',
 *   callback: ()=> {},
 * );
 *
 *
 * // Removes all watchers.
 * watcher.removeAll();
 * ```
 *
 *
 * Advanged Usage
 * ```ts
 * let new watcher = new DomWatcher();
 *
 * // Removes by Id
 * watcher.add({
 *   element: element,
 *   on: 'click',
 *   callback: ()=> {},
 *   id: 'abc'
 * );
 * watcher.removeById('abc');
 *
 *
 * // Ids actually don't need to be unique.
 * watcher.add({ element: element, on: 'click', callback: ()=> {}, id: 'group1');
 * watcher.add({ element: anotherElement, on: 'mousemove', callback: ()=> {}, id: 'group1');
 * watcher.removeById('group1');
 *
 * // Conditional execution
 * watcher.add({
 *    element: window
 *    callback: ()=> {
 *      console.log('called only on mobile');
 *    }
 *    eventOptions: { passive: true }
 *    on: 'scroll',
 *    runWhen: window.innerWidth < 600
 * });
 *
 *
 * watcher.add({
 *    element: submitElement
 *    callback: ()=> {
 *      console.log('submitted');
 *    }
 *    on: 'click',
 *    runWhen: ()=> { return this.validate()}
 * });
 *
 *
 * // Add debouncing.
 *     watcher.add({
 *         element: document.body,
 *         on: 'mousemove',
 *         callback: func.debounce((event) => {
 *             console.log('movemove!!');
 *         }, 500),
 *     });
 *
 * ```
 *
 */
export class DomWatcher {
    /**
     * All internal watcher configs.
     */
    private watcherConfigs: Array<DomWatcherConfig>;

    constructor() {
        this.watcherConfigs = [];
    }

    /**
     * Adds a watcher and immediately begins watching.
     * @param config
     */
    add(config: DomWatcherConfig) {
        const listener = (event: any) => {
            if (config.runWhen) {
                config.runWhen() && config.callback(event);
            } else {
                config.callback(event);
            }
        }

        config.listener = listener;

        // Add listening.
        config.element.addEventListener(
            config.on,
            listener,
            config.eventOptions || {}
        )

        // Generate the remover.
        config.remover = () => {
            config.element.removeEventListener(
                config.on,
                listener
            );
        }

        this.watcherConfigs.push(config);
    }

    /**
     * Removes a given watcher by id.
     * @param id The id of the watcher to remove.
     */
    removeById(id: string) {
        this.watcherConfigs = this.watcherConfigs.filter((config: DomWatcherConfig) => {
            if (config.id && config.id == id) {
                // Save as var to avoid typescript null error.
                const remover = config.remover;
                remover && remover();
            } else {
                return config;
            }
        });
    }


    /**
     * Removes all dom watchers.
     */
    removeAll() {
        this.watcherConfigs.forEach((config) => {
            const remover = config.remover;
            remover && remover();
        })
        this.watcherConfigs = [];
    }


    /**
     * Disposes of domWatcher.
     */
    dispose() {
        this.removeAll();
    }
}