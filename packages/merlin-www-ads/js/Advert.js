'use strict';

import EventEmitter from 'eventemitter2';
import {
    hasOwnProperty,
    randomUUID,
    removeElement
} from '@cnbritain/merlin-www-js-utils/js/functions';
import {AD_TYPES, AD_STATES, AD_SIZES_MAP} from './constants';
import {
    definePrototype,
    isElementUninitialised,
    isElementInitialised,
    isElementRegistered,
    isElementRendered,
    isElementStopped,
    isElementDestroyed
} from './utils';
import AdvertPropertyMap from './AdvertPropertyMap';


export function setAdvertState(advert, state){
    if(advert.state === state) return;
    if(advert.state > state){
        throw new TypeError(
            'Adverts can not go back a state! ' + advert.state + ' -> ' +
            state
        );
    }
    switch(state){
    case AD_STATES.UNINITIALISED:
        advert.el.setAttribute('data-ad-uninitialised', true);
        break;
    case AD_STATES.INITIALISED:
        advert.el.setAttribute('data-ad-initialised', true);
        break;
    case AD_STATES.REGISTERED:
        advert.el.setAttribute('data-ad-registered', true);
        break;
    case AD_STATES.RENDERED:
        advert.el.setAttribute('data-ad-rendered', true);
        break;
    case AD_STATES.STOPPED:
        advert.el.setAttribute('data-ad-stopped', true);
        break;
    case AD_STATES.DESTROYED:
        advert.el.setAttribute('data-ad-destroyed', true);
        break;
    }
    advert._state = state;
}


var unEscapeMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x60;': '`'
};
var reEscapedHtml = /&(?:amp|lt|gt|quot|#x27|#x60);/g;
var hasEscaped = RegExp(reEscapedHtml.source);
var mapEscapeChar = function mapEscapeChar(char){ return unEscapeMap[char]; };
function unescape(str){
    if(hasEscaped.test(str)){
        return str.replace(reEscapedHtml, mapEscapeChar);
    } else {
        return str;
    }
}

function parseAdvertAttributeSettings(advertElement){
    if(!advertElement.hasAttribute('data-ad-settings')){
        throw new TypeError('Advert is missing settings!');
    }

    var rawSettings = unescape(advertElement.getAttribute('data-ad-settings'));
    var settings = null;
    try {
        settings = JSON.parse(rawSettings);
    } catch(err){
        throw new TypeError('Advert settings malformed!\n' + err.message);
    }

    // Add dfp url
    settings.dfp = settings.zone + '/' + settings.unit;

    return settings;
}

function getAdTypeBySize(width, height){
    var key = width + 'x' + height;
    if(hasOwnProperty(AD_SIZES_MAP, key)){
        return AD_SIZES_MAP[key];
    } else {
        return AD_TYPES.UNKNOWN;
    }
}

function isAdvertUninitialised(advert){
    return advert.state >= AD_STATES.UNINITIALISED &&
        isElementUninitialised(advert.el);
}

function isAdvertInitialised(advert){
    return advert.state >= AD_STATES.INITIALISED &&
        isElementInitialised(advert.el);
}

function isAdvertRegistered(advert){
    return advert.state >= AD_STATES.REGISTERED &&
        isElementRegistered(advert.el);
}

function isAdvertRendered(advert){
    return advert.state >= AD_STATES.RENDERED && isElementRendered(advert.el);
}

function isAdvertStopped(advert){
    return advert.state >= AD_STATES.STOPPED && isElementStopped(advert.el);
}

function isAdvertDestroyed(advert){
    return advert.state >= AD_STATES.DESTROYED &&
        isElementDestroyed(advert.el);
}

function Advert(el, manager){
    // Check if the advert element has already been created
    if(el.getAttribute('data-ad-uninitialised') === 'true'){
        throw new TypeError('Advert has already been defined');
    }

    EventEmitter.call(this);

    this._el = el;
    this._manager = manager;
    this._type = AD_TYPES.UNKNOWN;
    this._state = AD_STATES.UNINITIALISED;
    this._id = null;
    this._slot = null;
    this._group = null;
    this._attributes = null;
    this._renderedHeight = null;
    this._renderedWidth = null;
    this._init();
}

Advert.prototype = definePrototype(EventEmitter.prototype, {

    constructor: Advert,

    _init: function  _init(){
        // Assign id
        this._id = 'ad-' + randomUUID();
        this.el.setAttribute('id', this._id);
        // Set state
        setAdvertState(this, AD_STATES.INITIALISED);
        // Parse ad settings into attributes
        this._attributes = new AdvertPropertyMap(
            parseAdvertAttributeSettings(this.el));
        // Add to the manager
        this.manager._adverts[this.id] = this;
    },

    destroy: function destroy(){
        // Clear attributes
        this._attributes.destroy();
        this._attributes = null;

        // Remove from manager
        this._manager._adverts[this.id] = null;
        delete this._manager.adverts[this.id];
        this._manager = null;
        // Remove el from page
        removeElement(this.el);
        this._el = null;
        // Remove from group
        this.group = null;
        this._id = null;
        this._renderedHeight = null;
        this._renderedWidth = null;
        this._slot = null;
        this._state = null;
        this.emit('destroy', events.destroy(this));
        this.removeAllListeners();
    },

    forceSizeChange: function forceSizeChange(width, height){
        this._renderedWidth = width;
        this._renderedHeight = height;
        this._type = getAdTypeBySize(width, height);
    },

    register: function register(){
        this.manager.register(this);
    },

    render: function render(){
        this.manager.render(this);
    },

    refresh: function refresh(){
        this.manager.refresh(this);
    },

    el: {
        configurable: true,
        get: function getEl(){
            return this._el;
        }
    },

    id: {
        configurable: true,
        get: function getId(){
            return this._id;
        }
    },

    slot: {
        configurable: true,
        get: function getSlot(){
            return this._slot;
        }
    },

    manager: {
        configurable: true,
        get: function getManager(){
            return this._manager;
        }
    },

    type: {
        configurable: true,
        get: function getType(){
            return this._type;
        }
    },

    state: {
        configurable: true,
        get: function getState(){
            return this._state;
        }
    },

    group: {
        configurable: true,
        get: function getGroup(){
            return this._group;
        },
        set: function setGroup(group){
            // Same group
            if(this._group === group) return;
            // Already part of a group
            if(this._group !== null) this._group.remove(this);
            // New group to add to
            if(group !== null) group.add(this);
            // Set it to whatever we are setting it to
            this._group = group;
        }
    },

    attributes: {
        configurable: true,
        get: function getAttributes(){
            return this._attributes;
        }
    },

    renderedHeight: {
        configurable: true,
        get: function getRenderedHeight(){
            return this._renderedHeight;
        }
    },

    renderedWidth: {
        configurable: true,
        get: function getRenderedWidth(){
            return this._renderedWidth;
        }
    },

    renderedSize: {
        configurable: true,
        get: function getRenderedSize(){
            return [this._renderedWidth, this._renderedHeight];
        }
    },

    uninitialised: {
        configurable: true,
        get: function isUninitialised(){
            return isAdvertUninitialised(this);
        }
    },

    initialised: {
        configurable: true,
        get: function isInitialised(){
            return isAdvertInitialised(this);
        }
    },

    registering: {
        configurable: true,
        get: function isRegistering(){
            return this.state === AD_STATES.REGISTERING;
        }
    },

    registered: {
        configurable: true,
        get: function isRegistered(){
            return isAdvertRegistered(this);
        }
    },

    rendering: {
        configurable: true,
        get: function isRendering(){
            return this.state === AD_STATES.REGISTERED;
        }
    },

    rendered: {
        configurable: true,
        get: function isRendered(){
            return isAdvertRendered(this);
        }
    },

    stopped: {
        configurable: true,
        get: function isStopped(){
            return isAdvertStopped(this);
        }
    },

    destroyed: {
        configurable: true,
        get: function isDestroyed(){
            return isAdvertDestroyed(this);
        }
    }

});

export default Advert;
