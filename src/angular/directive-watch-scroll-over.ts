import { DomWatcher } from '../dom/dom-watcher';
import { mathf } from '../mathf/mathf';
import { INgDisposable } from './i-ng-disposable';
class WatchScrollOverController implements INgDisposable {
    private el: HTMLElement;
    private $scope: ng.IScope;
    private $attrs: ng.IAttributes;
    private cssClass: string;
    private targetElement: HTMLElement;
    private watcher: DomWatcher;

    static get $inject() {
        return ['$scope', '$element', '$attrs'];
    }

    constructor($scope: ng.IScope, $element: ng.IAngularStatic, $attrs: ng.IAttributes) {
        this.$scope = $scope;
        this.el = $element[0];
        this.$attrs = $attrs;
        this.cssClass = this.$attrs.watchScrollOverClass;

        let query = this.$attrs.watchScrollOverQuery;
        if(!!$attrs.watchScrollOverQueryEval) {
          query = $scope.$eval(query)[0][0];
        }

        window.setTimeout(()=> {
            this.targetElement = document.querySelectorAll(
                query
            )[0] as HTMLElement;

            this.watcher = new DomWatcher();
            this.watcher.add({
                element: window,
                on: 'scroll',
                callback: this.scroll.bind(this)
            });
            this.scroll();
        })
        $scope.$on('$destroy', () => {
            this.dispose();
        });
    }

    private scroll():void {
        const top = this.el.getBoundingClientRect().top + window.scrollY;
        const targetBox = this.targetElement.getBoundingClientRect()
        const targetTop = targetBox.top + window.scrollY;
        const targetBottom = targetTop + targetBox.height;
        if(mathf.isBetween(top, targetTop, targetBottom)) {
            this.el.classList.add(this.cssClass);
        } else {
            this.el.classList.remove(this.cssClass);
        }
    }

    public dispose():void {
        this.watcher.dispose();
    }
}


/**
 * On a large single page, let's say you have a fix header that is a bunch
 * of jump links.
 *
 * Options:
 *  - watch-scroll-over-query (string): query to find the target element.  If the query
 *      returns multiple elements the first element is selected. Example: #id, .class
 *  - watch-scroll-over-query-eval (bool): Whether to run an eval on the query.
 *  - watch-scroll-over-class (string): The class name to append when the current
 *      directive element resides over the target element.
 *
 * ```
 * <div class="header" style="position: fixed; top: 0">
 *
 *    <div class="nav"
 *          watch-scroll-over
 *          watch-scroll-over-query=".section-1"
 *          watch-scroll-over-class="active"> Section 1</div>
 *    <div class="nav"
 *          watch-scroll-over
 *          watch-scroll-over-query=".section-2"
 *          watch-scroll-over-class="active"> Section 2</div>
 *    <div class="nav"
 *          watch-scroll-over
            watch-scroll-over-query="[['.' + section.id]]"
            watch-scroll-over-query-eval="true"
 *          watch-scroll-over-class="active"> Section 3</div>
 * </div>
 *
 * <div class="content">
 *    <div class=".section-1">...</div>
 *    <div class=".section-2">...</div>
 *    <div class=".section-3">...</div>
 * </div>
 * ```
 *
 * Now as the user scrolls, when the header nav goes over the .section-1 div,
 * the first nav item will receive the class "active" which gets removed
 * when it goes out the section.
 *
 * TODO (uxder): More optimization around this.
 */
export const watchScrollOverDirective = () => {
    return {
        restrict: 'A',
        controller: WatchScrollOverController
    };
};