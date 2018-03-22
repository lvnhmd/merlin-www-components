'use strict';

import {hasOwnProperty} from '@cnbritain/merlin-www-js-utils/js/functions';
import {definePrototype} from './utils';

function AdvertPropertyMap(values){
    this._ = {};
    this._length = 0;
    for(var key in values){
        if(hasOwnProperty(values, key)){
            this._[key] = values[key];
            this._length++;
        }
    }
}

AdvertPropertyMap.prototype = definePrototype({}, {

    constructor: AdvertPropertyMap,

    clear: function clear(){
        if(this._length === 0) return;
        this._ = {};
        this._length = 0;
    },

    destroy: function destroy(){
        this._ = null;
        this._length = 0;
    },

    has: function has(key){
        return this._.hasOwnProperty(key);
    },

    get: function get(key){
        return this._[key];
    },

    length: {
        configurable: true,
        get: function getLength(){
            return this._length;
        }
    }

});

export default AdvertPropertyMap;
