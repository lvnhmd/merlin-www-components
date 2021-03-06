'use strict';

/**
 * @module image
 */

window.lazySizesConfig = window.lazySizesConfig || {};
// Make sure we dont auto trigger lazySizes instantly
window.lazySizesConfig.init = false;
// Marker for the lazyload image
window.lazySizesConfig.lazyClass = 'c-image--lazyload';
// Marker for the images to be preloaded after load
window.lazySizesConfig.preloadClass = 'c-image--lazypreload';
// Class to be applied when loading
window.lazySizesConfig.loadingClass = 'c-image--lazyload-loading';
// Class to be applied when loaded
window.lazySizesConfig.loadedClass = 'c-image--lazyload-loaded';

import lazySizes from 'lazysizes';

//IE Polyfill for picture element
import 'lazysizes/plugins/respimg/ls.respimg.min.js';

export default {

    /**
     * Initialises the loading of images
     */
    'init': function() {
        lazySizes.init();
    }

};