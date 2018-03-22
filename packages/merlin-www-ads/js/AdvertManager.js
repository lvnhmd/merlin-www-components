'use strict';

import EventEmitter from 'eventemitter2';
import {
    assign,
    cloneArray,
    hasOwnProperty,
    not
} from '@cnbritain/merlin-www-js-utils/js/functions';
import {AD_CLS, AD_STATES} from './constants';
import {
    definePrototype,
    loadAdLibraries,
    isElementUninitialised
} from './utils';
import * as events from './events';
import {default as Advert, setAdvertState} from './Advert';

function createSizeMapping(sizemapAttrib){
    var sizemap = googletag.sizeMapping();
    sizemapAttrib.forEach(function eachRow(row){
        // Row[0] - dimensions
        // Row[1] - Ad sizes
        sizemap.addSize(row[0], row[1]);
    });
    return sizemap;
}

function registerGPT(advert){
    return new Promise(function(resolve){
        googletag.cmd.push(function(){
            // Create the slot
            var slot = googletag.defineSlot(
                advert.attributes.get('dfp'),
                advert.attributes.get('sizes'),
                advert.id
            );
            slot.addService(googletag.pubads());

            // Set sizemapping
            if(advert.attributes.get('sizemap')){
                slot.defineSizeMapping(
                    createSizeMapping(advert.attributes.get('sizemap')).build()
                );
            }

            // All the targeting bits - keyvalues, position, targets, etc
            if(advert.attributes.has('targeting')){
                var targeting = advert.attributes.get('targeting');

                for(var key in targeting){
                    if(hasOwnProperty(targeting, key)){
                        slot.setTargeting(key, targeting[key]);
                    }
                }
            }

            // // Prebid bits
            // if(PREBID_LOADED){
            //     pbjs.que.push(function() {
            //         pbjs.setTargetingForGPTAsync();
            //     });
            // }

            // Update slot information
            advert._slot = slot;
            setAdvertState(advert, AD_STATES.REGISTERED);

            // // Events
            // ad.emit('register', createEventTemplate('register', ad, {
            //     'slot': slot
            // }));
            // ad.manager.emit('register', createEventTemplate('register', ad.manager, {
            //     'ad': ad,
            //     'slot': slot
            // }));

            resolve(advert);
        });
    });
}


function AdvertManager(){
    EventEmitter.call(this);

    this._initialising = false;
    this._initialised = false;
    this._lazyloading = false;
    this._adverts = {};
    this._flushingRefresh = false;

    this._refreshing = false;
    this._refresh = [];
}

AdvertManager.prototype = definePrototype(EventEmitter.prototype, {

    _onSlotRenderEnded: function _onSlotRenderEnded(ev){
        console.log('slotRenderEnded', ev);
    },

    constructor: AdvertManager,

    adverts: {
        configurable: true,
        get: function getAdverts(){
            return this._adverts;
        }
    },

    initialised: {
        configurable: true,
        get: function getInitialised(){
            return this._initialised;
        }
    },

    initialise: function initialise(){
        if(this._initialised || this._initialising) return;

        loadAdLibraries()
            .then(function(){
                this._initialising = false;
                this._initialised = true;

                this.emit('initialised', events.initialised(this));
            }.bind(this), function(err){
                console.error('Erroring loading ad libraries!');
                console.error(err);
                this._initialising = false;
                this._initialised = false;
            }.bind(this));

        googletag.cmd.push(function(){
            // Doing this means we have to fire a refresh event when we want an
            // ad. This allows us to do SRA but also roadblocks and single
            // request ads like in-reads
            googletag.pubads().disableInitialLoad();
            // Single page request to allow roadblocks
            googletag.pubads().enableSingleRequest();
            googletag.pubads().enableAsyncRendering();
            googletag.pubads().collapseEmptyDivs(true);
            googletag.enableServices();

            // Events
            googletag.pubads().addEventListener(
                'slotRenderEnded', this._onSlotRenderEnded.bind(this));
        }.bind(this));
    },

    getAdElements: function getAdElements(options){
        var settings = assign({
            'cls': AD_CLS,
            'el': document,
            'filter': null
        }, options);

        var elements = settings.el.querySelectorAll(settings.cls);
        if(elements.length === 0) return [];

        elements = cloneArray(elements);
        if(settings.filter && typeof settings.filter === 'function'){
            elements = elements.filter(settings.filter);
        }

        return elements;
    },

    create: function create(element){
        return new Advert(element, this);
    },

    createAll: function createAll(){
        var elements = this.getAdElements({
            filter: not(isElementUninitialised)
        });
        return elements.map(this.create.bind(this));
    },

    register: function register(advert){
        if(advert.state >= AD_STATES.REGISTERING){
            return Promise.resolve(advert);
        }

        setAdvertState(advert, AD_STATES.REGISTERING);
        // TODO: header bidding
        return registerGPT(advert)
            .then(function(){
                var e = events.register(advert);
                advert.emit('register', e);
                this.emit('register', e);
            }.bind(this), function(err){
                return Promise.reject(err);
            });
    },

    registerAll: function registerAll(){
        var adverts = Object.keys(this.adverts);
        adverts = adverts.map(function(key){
            return this.adverts[key];
        }.bind(this));
        adverts = adverts.filter(function(a){
            return !a.registering && !a.registered;
        });

        return Promise.all(adverts.map(this.register.bind(this)));
    },

    render: function render(advert){
        if(advert.state >= AD_STATES.RENDERING){
            return Promise.resolve(advert);
        }

        setAdvertState(advert, AD_STATES.RENDERING);

        return new Promise(function(resolve){
            googletag.cmd.push(function(){
                googletag.display(advert.id);
                setAdvertState(advert, AD_STATES.RENDERED);
                resolve(advert);
            });
        });
    },

    renderAll: function renderAll(advert){
        var adverts = Object.keys(this.adverts);
        adverts = adverts.map(function(key){
            return this.adverts[key];
        }.bind(this));
        adverts = adverts.filter(function(a){
            return a.registered;
        });

        return Promise.all(adverts.map(this.render.bind(this)));
    },

    _flushRefresh: function _flushRefresh(){
        if(this._refreshing || this._refresh.length === 0){
            console.log('Already flushing');
            return;
        }

        console.log('Called flush refresh');
        var startTime = (new Date()).getTime();
        this._refreshing = true;
        setTimeout(function(){
            console.log('Timer triggered');
            googletag.cmd.push(function(){
                var endTime = (new Date()).getTime();
                console.log('diff', endTime - startTime);
                console.log('Flushing refresh', this._refresh.length);

                var slots = new Array(this._refresh.length);
                var ads = new Array(this._refresh.length);
                var resolves = new Array(this._refresh.length);

                this._refresh.forEach(function(o, i){
                    slots[i] = o.advert.slot;
                    ads[i] = o.advert;
                    resolves[i] = o.resolve;
                });

                googletag.pubads().refresh(slots);
                console.log('done slots');

                this._refresh.length = 0;
                this._refreshing = false;

                resolves.forEach(function(resolve, i){
                    resolve(ads[i]);
                });
                slots = ads = resolves = null;
            }.bind(this));
        }.bind(this), 25);
        console.log('End called flush refresh');
    },

    refresh: function refresh(advert){
        // return new Promise(function(resolve){
        //     console.log('pushing refresh');
        //     this._refresh.push({
        //         advert: advert,
        //         resolve: resolve
        //     });
        //     this._flushRefresh();
        // }.bind(this));
        return new Promise(function(resolve){
            googletag.cmd.push(function(){
                googletag.pubads().refresh([advert.slot]);
                resolve(advert);
            });
        });
    },

    refreshAll: function refreshAll(){
        var adverts = Object.keys(this.adverts);
        adverts = adverts.map(function(key){
            return this.adverts[key];
        }.bind(this));
        adverts = adverts.filter(function(a){
            return a.rendered;
        });

        console.log('refreshing', adverts);
        return Promise.all(adverts.map(this.refresh.bind(this)));
    },

    lazyloading: {
        configurable: true,
        get: function getLazyloading(){
            return this._lazyloading;
        }
    },

    lazyload: function lazyload(){
        if(this.lazyloading) return;

        // Render any !lazyload ones
        // Bind scroll listeners
        // Bind resize listeners
        //
    }

});

export default new AdvertManager();
