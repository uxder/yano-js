
import { is } from '../is/is';

/**
 * A class the loads a given set of images.
 *
 *
 * TODO (uxder): Needs more work.  Needs error and fetch fail handling.
 *
 * ```ts
 *
 * const myImages = [
 *  'http://mydomain.com/dog.png',
 *  'http://mydomain.com/cat.png'
 *  'http://mydomain.com/cow.jpg'
 * ];
 * const myImageLoader = new ImageLoader(myImages);
 * // Optional - decodes the image as well.
 * myImageLoader.setDecodeAfterFetch(true);
 *
 *
 * // Loads images.
 * await results = myImageLoader.load();
 *
 * // The source of the image is the key.
 * results['http://mydomain.com/dog.png']; // DOG HTML Image element.
 * results['http://mydomain.com/cat.png']; // Cat HTML Image element.
 *
 * ```
 *
 *
 * You can alternatively fetch for just blobs.
 * ```ts
 * const myImages = [
 *  'http://mydomain.com/dog.png',
 *  'http://mydomain.com/cat.png'
 *  'http://mydomain.com/cow.jpg'
 * ];
 * const myImageLoader = new ImageLoader(myImages);
 *
 * await results = myImageLoader.loadBlobs();
 * results['http://mydomain.com/dog.png']; // DOG image blob.
 * ```
 */
export class ImageLoader {
    public imageSources: Array<string>;

    /**
     * An object with the key as the URL of the image or blob.
     */
    private images: Object;

    /**
     * The number of times to refetch an image if unsuccessful.
     */
    public maxRetries: number;

    /**
     * Whether to immediately image decode after a fetch (available to limited browsers).
     */
    private decodeAfterFetch: boolean;

    /**
     * An optional callback for each load event.
     */
    private onEachImageLoaded: Function | null;


    constructor(imageSources: Array<string>) {
        this.imageSources = imageSources;
        this.images = {};
        this.maxRetries = 3;
        this.decodeAfterFetch = false;
        this.onEachImageLoaded = null;
    }


    /**
     * Allows you to hook into each load event of image.
     * This should be called prior to calling load.
     *
     * ```
     * const myImages = [
     *  'http://mydomain.com/dog.png',
     *  'http://mydomain.com/cat.png'
     *  'http://mydomain.com/cow.jpg'
     * ];
     * const myImageLoader = new ImageLoader(myImages);
     *
     * myImageLoader.loadCallback((source, img)=> {
     *   console.log(source) // The image url that was just loaded.
     *   console.log(img); // The image itself.
     * })
     *
     * // Loads images.
     * await results = myImageLoader.load();
     *
     * ```
     * @param value
     */
    setLoadCallback(callback:Function) {
        this.onEachImageLoaded = callback;
    }


    /**
     * Gets the internal cached images.
     */
    getImages():Object {
        return this.images;
    }


    /**
     * Sets to decodeAfterFetching.  Setting true on firefox causes failures
     * so we test for firefox.
     * @param value
     */
    setDecodeAfterFetch(value: boolean) {
        this.decodeAfterFetch = is.firefox() ? false : value;
    }

    /**
     * Begins loading all images.
     */
    load(): Promise<Object> {
        return new Promise(resolve => {
            const promises = this.imageSources.map((source) => {
                return this.fetchImage(source);
            })

            Promise.all(promises).then(() => {
                resolve(this.images);
            })
        });
    }


    /**
     * Fetches and creates an image element when successful.
     * @param source The image source
     * @param retryCount The current retry count.
     */
    fetchImage(source: string, retryCount: number = 0): Promise<void> {
        return new Promise(resolve => {
            fetch(source)
                .then((response) => {
                    // If status was not okay retry.
                    if (!response.ok) {
                        retryCount++;
                        if (retryCount >= this.maxRetries) {
                            resolve();
                        } else {
                            this.fetchImage(source, retryCount);
                        }
                    }
                    return response.blob();
                })
                .then((response) => {
                    const blob = response;
                    const img = document.createElement('img');
                    if (this.decodeAfterFetch && 'decode' in img) {
                        img.src = URL.createObjectURL(blob);
                        img.decoding = 'async';
                        img.decode().then(() => {
                            this.images[source] = img;
                            this.onEachImageLoaded && this.onEachImageLoaded(source, img);
                            resolve();
                        }).catch((error) => {
                            // console.log('error', Error);
                            // throw new Error(error);
                            // Usually when there is an error thrown it's
                            // because this image couldn't be decoded
                            // in a regular manner so we fall back again
                            // to loading it normally.
                            img.onload = () => {
                                this.images[source] = img;
                                this.onEachImageLoaded && this.onEachImageLoaded(source, img);
                                resolve();
                            }
                            img.src = URL.createObjectURL(blob);
                        })
                    } else {
                        img.onload = () => {
                            this.images[source] = img;
                            this.onEachImageLoaded && this.onEachImageLoaded(source, img);
                            resolve();
                        }
                        img.src = URL.createObjectURL(blob);
                    }

                });


        })
    }


    /**
     * Begins loading imageBitMaps. Alternate to load method but ImageBitmap
     * has only partial support at the moment.
     */
    loadImageBitmaps() {
        return new Promise(resolve => {
            const promises = this.imageSources.map((source) => {
                return this.fetchImageBitmap(source);
            })

            Promise.all(promises).then(() => {
                resolve(this.images);
            })
        });
    }


    /**
     * Fetches image bitmap.   Image bitmaps are faster in rendering images on
     * canvas because they don't do image decoding on each draw.  However,
     * they are not fully supported across all browsers so use wisely.
     *
     * @see https://aerotwist.com/blog/the-hack-is-back/
     * @see https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap
     */
    fetchImageBitmap(source: string, retryCount: number = 0): Promise<void> {
        return new Promise(resolve => {
            fetch(source)
                .then((response) => {
                    // If status was not okay retry.
                    if (!response.ok) {
                        retryCount++;
                        if (retryCount >= this.maxRetries) {
                            resolve();
                        } else {
                            this.fetchImageBitmap(source, retryCount);
                        }
                    }
                    return response.blob();
                })
                .then(blobData => createImageBitmap(blobData))
                .then((response) => {
                    const blob = response;
                    this.images[source] = blob;
                    this.onEachImageLoaded && this.onEachImageLoaded(source, blob);
                    resolve();
                });
        })
    }


    /**
     * Loads bitmap or image.   If browser supports bitmaps, it will
     * load bitmaps instead of an image.
     */
    loadBitmapOrImage() {
        return is.supportingCreateImageBitmap() ?
            this.loadImageBitmaps() : this.load();
    }


    dispose() {
        for (var key in this.images) {
            let image = this.images[key];
            // If we loaded bitmaps and we can dispose.
            // https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close
            if (image.close) {
                image.close();
            } else {
                // Dispose url.
                URL.revokeObjectURL(image.src);
            }
        }
    }
}