'use strict';

import {
    ArticleManager
} from '@cnbritain/merlin-www-article';
import {
    debounce
} from '@cnbritain/merlin-www-js-utils/js/functions';
import GATracker from '@cnbritain/merlin-www-js-gatracker';

var allowAllFocus = false;

export default function init() {
    ArticleManager.on('imagefocus', debounce(onArticleImageFocus, 300));
    ArticleManager.on('focus', onArticleFocus);
    ArticleManager.on('expand', onArticleExpand);
}


export function onArticleImageFocus(e) {
    sendGalleryImagePageview(e.target.parentArticle, e.imageIndex);
}

export function onArticleFocus(e) {
    var article = e.target;

    // Update the analytics to include ad block changes
    article.analytics[GATracker.getDimensionByIndex('AD_BLOCKER')] = String(!window.ads_not_blocked);

    // NOTE: first article to focus is super likely to be non infinite scroll
    // article so to avoid it, we dont send a pageview if its not infinite
    // and is the first time.
    if (allowAllFocus || (!allowAllFocus && article.isInfinite)) {
        allowAllFocus = true;
        sendPageview(article);
    }
}

export function onArticleExpand(e) {
    sendCustomEvent({
        'eventCategory': 'Infinite scroll',
        'eventAction': 'Expand gallery',
        'eventLabel': e.target.properties.title
    });
}

export function sendCustomEvent(trackerData) {
    GATracker.SendAll(GATracker.SEND_HITTYPES.EVENT, trackerData);
}

export function sendGalleryImagePageview(article, imageIndex) {
    var analytics = article.analytics;

    var CREDIT_DIMENSION = GATracker.getDimensionByIndex(
        'GALLERY_PHOTO_CREDIT');
    var POSITION_DIMENSION = GATracker.getDimensionByIndex(
        'GALLERY_POSITION');
    var BASE_URL = GATracker.getDimensionByIndex('BASE_URL');

    var image = article.gallery.imageElements[imageIndex];
    var imageUid = image.querySelector('.c-figure').getAttribute('id');
    var credit = image.querySelector('.c-figure__credit');
    if (credit) {
        analytics[CREDIT_DIMENSION] = credit.innerHTML;
        credit = null;
    }

    analytics[POSITION_DIMENSION] = String(imageIndex + 1);

    GATracker.SetAll(analytics);
    GATracker.SendAll(GATracker.SEND_HITTYPES.PAGEVIEW, {
        'page': analytics[BASE_URL] + '#' + imageUid,
        'title': article.el.querySelector('.a-header__title').innerHTML
    });

    analytics = null;
    image = null;
}

export function sendPageview(article) {
    // Reset all custom dimensions first to make sure we dont leak any previous
    // dimensions from older articles
    GATracker.ResetCustomDimensions();
    GATracker.SetAll(article.analytics);
    GATracker.SendAll(GATracker.SEND_HITTYPES.PAGEVIEW);
}