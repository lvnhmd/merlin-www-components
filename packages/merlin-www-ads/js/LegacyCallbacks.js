'use strict';
/* eslint no-console: 0 */

import {
    addClass,
    createEventTemplate,
    getIframeFromWindow,
    getParent
} from '@cnbritain/merlin-www-js-utils/js/functions';
import {
    setAdStateToStopped
} from './Utils';
import InreadAd from './InreadAd';
import InterstitialAd from './InterstitialAd';
import NativeAd from './NativeAd';
import AdManager from './AdManager';

/**
 * Blank slots
 * ============================================================================
 */
window.GptAdSlots = {
    /**
     * Sets a blank slot on the page thus removing it
     * @param  {Window} window
     */
    'setSlotWindowAsBlankAdvert': function(window) {

        var frame = null;
        var parentAd = null;

        // Find iframe element based on window
        frame = getIframeFromWindow(window);
        if (!frame) return;

        // Get parent until .ad-block that stores the slots id
        parentAd = getParent(frame, '.ad__container');
        if (!parentAd) return;

        // Destroy the ad
        addClass(parentAd.parentNode, 'is-hidden');

        // Set the ad to stopped. This is to prevent the slotRenderEnded
        // event that fires after from removing is-hidden class
        var ad = AdManager.slots[parentAd.getAttribute('id')];
        console.log('Blank ad', parentAd.getAttribute('id'), ad);
        setAdStateToStopped(ad);
        ad.emit('stop', createEventTemplate('stop', ad, {
            'originalEvent': null
        }));
        ad.manager.emit('stop', createEventTemplate('stop', ad.manager, {
            'ad': ad,
            'originalEvent': null
        }));
    }
};

/**
 * Native ads
 * ============================================================================
 */
window.PromotionButtons = {
    /**
     * Adds a promoted article to the page
     * @param  {Object} json Promotion data
     * @param  {Window} win
     */
    'add': function(json, win) {

        // Find the ad based on the window
        var elementFrame = getIframeFromWindow(win);
        var adElement = getParent(elementFrame, '.ad__container');

        // Check we have an ad block
        if (!adElement) return;

        var id = adElement.getAttribute('id');
        var nativeAd = AdManager.slots[id];

        // Convert the ad
        NativeAd.inheritFrom(nativeAd);

        // Render the advert
        NativeAd.render(nativeAd, json);

    }
};

/**
 * Teads
 * ============================================================================
 */
window.InreadSupport = {
    /**
     * Requests an inread (TEAD) advert
     * @param  {Object} json Ad configuration
     * @param  {Window} win
     */
    'requestAd': function(json, win) {
        // Find the ad based on the window
        var elementFrame = getIframeFromWindow(win);
        var adElement = getParent(elementFrame, '.ad__container');

        // Check we have an ad block
        if (!adElement) return;

        var id = adElement.getAttribute('id');
        var inread = AdManager.slots[id];

        // Render the advert
        InreadAd.render(inread, json);
    }
};

/**
 * Gallery interstitial
 * ============================================================================
 */
window.INTERSTITIAL_AD = {
    /**
     * Renders an interstitial advert
     * @param  {Object} json        Advert configuration
     * @param  {Object} gptSizeInfo Dunno
     * @param  {Window} win
     */
    'displayInterstitialAd': function(json, gptSizeInfo, win) {
        // Find the ad based on the window
        var elementFrame = getIframeFromWindow(win);
        var adElement = getParent(elementFrame, '.ad__container');

        // Check we have an ad block
        if (!adElement) return;

        var id = adElement.getAttribute('id');
        var interstitial = AdManager.slots[id];

        // Render the advert
        InterstitialAd.render(interstitial, json, gptSizeInfo);
    },
    /**
     * Some legacy thing
     * @param  {Object} e
     */
    'gptInterstitialRenderEndedCallback': function(e) {
        window.INTERSTITIAL_AD.displayInterstitialAd(null, e.sizeInfo);
    }
};

/**
 * Rubicon
 * ============================================================================
 */
/**
 * Rubicon can surprise change size. GPT will tell us a leaderboard but
 * Rubicon might give us a billboard. This is fired by Rubicon to let us
 * know the new size change.
 * @param  {String} elementId  The iframe id, NOT the .ad-block
 * @param  {String} sizeString
 */
window.cn_rubicon_resize = function(elementId, sizeString) {
    var adSize = sizeString.split('x');
    adSize[0] = parseInt(adSize[0], 10);
    adSize[1] = parseInt(adSize[1], 10);

    var adEl = getParent(document.getElementById(elementId),
        '.ad__container');
    if (!adEl) return;

    AdManager.slots[adEl.getAttribute('id')].forceSizeChange(adSize[0],
        adSize[1]);
};