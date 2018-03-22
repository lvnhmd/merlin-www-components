'use strict';

import BRAND_CONFIG from '@cnbritain/merlin-www-common';
import {
    hasOwnProperty,
    isPlainObject,
    loadScript
} from '@cnbritain/merlin-www-js-utils/js/functions';

var PREBID_CONFIG = {
    LOADED: false,
    URL: null
};

var RUBICON_CONFIG = {
    LOADED: false,
    URL: null
};

var GPT_CONFIG = {
    LOADED: false,
    URL: '//www.googletagservices.com/tag/js/gpt.js'
};

var PAGE_AD_CONFIG = null;

export function getPropertyDefinition(propDef) {
    var configurable = propDef.configurable || false;
    var enumerable = propDef.enumerable || false;
    var writable = propDef.writable || false;
    if ((propDef.value || writable) && (propDef.get || propDef.set)) {
        throw new TypeError();
    }
    var def = {
        configurable: configurable,
        enumerable: enumerable
    };
    if (writable) def.writable = writable;
    if (propDef.value) def.value = propDef.value;
    if (propDef.get) def.get = propDef.get;
    if (propDef.set) def.set = propDef.set;
    return def;
}

export function definePrototype(src /* protoDef*/ ) {
    var proto = Object.create(src);
    var protoDef = null;
    var protoValue = null;
    var i = 1;
    var argLen = arguments.length;
    for (; i < argLen; i++) {
        protoDef = arguments[i];
        for (var protoKey in protoDef) {
            if (!hasOwnProperty(protoDef, protoKey)) continue;
            protoValue = protoDef[protoKey];
            if (typeof protoValue === 'function') {
                proto[protoKey] = protoValue;
            } else if (isPlainObject(protoValue)) {
                Object.defineProperty(
                    proto, protoKey, getPropertyDefinition(protoValue));
            }
        }
    }
    return proto;
}

/**
 * Creates a timeout wrapped in a promise
 * @param  {Number} ms amount of milliseconds
 * @return {Promise}
 */
export function promisifyTimeout(ms){
    return new Promise(function(resolve){
        setTimeout(resolve, ms);
    });
}

/**
 * Loads the specified prebid url. A timeout is set to ensure we don't wait
 * too long.
 * @return {Promise}
 */
export function loadPrebidLibrary(){

    if(PREBID_CONFIG.LOADED){
        console.info('Prebid library already loaded.');
        return Promise.resolve();
    }

    if(PREBID_CONFIG.URL === null){
        console.warn('Prebid library has no url specified to load. Ads will continue without Prebid');
        return Promise.resolve();
    }

    window.pbjs = window.pbjs || {};
    window.pbjs.que = window.pbjs.que || [];
    pbjs.que.push(function() {
        pbjs.setConfig({
            // debug: true,
            enableSendAllBids: true
        });
    });

    var prebidPromise = loadScript(PREBID_CONFIG.URL)
        .then(function(){
            PREBID_CONFIG.LOADED = true;
            return Promise.resolve();
        }, function(err){
            console.error('Error loading prebid library!');
            console.error(err);
            PREBID_CONFIG.LOADED = false;
            return Promise.resolve();
        });

    var timeoutPromise = promisifyTimeout(PREBID_TIMEOUT);

    return Promise.race([prebidPromise, timeoutPromise]);
}

export function loadRubiconLibrary(){

    if(RUBICON_CONFIG.LOADED){
        console.info('Rubicon library already loaded!');
        return Promise.resolve();
    }

    if(RUBICON_CONFIG.URL === null){
        console.warn('Rubicon library has no url specified to load. Ads will continue without Rubicon');
        return Promise.resolve();
    }

    window.rubicontag = window.rubicontag || {};
    window.rubicontag.cmd = window.rubicontag.cmd || [];

    return loadScript(RUBICON_CONFIG.URL)
        .then(function(){
            RUBICON_CONFIG.LOADED = true;
            return Promise.resolve();
        }, function(err){
            console.error('Error loading rubicon library!');
            console.error(err);

            RUBICON_CONFIG.LOADED = false;
            return Promise.resolve();
        });
}

export function loadGPTLibrary(){

    if(GPT_CONFIG.LOADED){
        console.info('GPT library already loaded!');
        return Promise.resolve();
    }

    if(GPT_CONFIG.URL === null){
        console.warn('GPT library has no url specified to load. Ads will continue without GPT');
        return Promise.resolve();
    }

    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];

    return loadScript(GPT_CONFIG.URL)
        .then(function(){
            GPT_CONFIG.LOADED = true;
            return Promise.resolve();
        }, function(err){
            console.error('Error loading GPT library!');
            console.error(err);

            GPT_CONFIG.LOADED = false;
            return Promise.resolve();
        });
}

export function loadAdLibraries(){
    // Setup the googletag bits so we can start queuing things
    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];

    return Promise.all([
        loadPrebidLibrary(),
        loadRubiconLibrary()
    ]).then(function(){
        return loadGPTLibrary();
    }, function(err){
        return Promise.reject(err);
    });
}

export function isElementUninitialised(el){
    return el.getAttribute('data-ad-uninitialised') === 'true';
}

export function isElementInitialised(el){
    return el.getAttribute('data-ad-initialised') === 'true';
}

export function isElementRegistered(el){
    return el.getAttribute('data-ad-registered') === 'true';
}

export function isElementRendered(el){
    return el.getAttribute('data-ad-rendered') === 'true';
}

export function isElementStopped(el){
    return el.getAttribute('data-ad-stopped') === 'true';
}

export function isElementDestroyed(el){
    return el.getAttribute('data-ad-destroyed') === 'true';
}

export function getPageAdConfig(refresh){
    if(PAGE_AD_CONFIG === null || refresh){
        PAGE_AD_CONFIG = window[key].Store.get(
            getNamespaceKey(BRAND_CONFIG.abbr) + '_ad_config');
    }
    return PAGE_AD_CONFIG;
}
