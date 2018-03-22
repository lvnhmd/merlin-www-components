'use strict';

import {
    createEventTemplate
} from '@cnbritain/merlin-www-js-utils/js/functions';

export function initialised(target){
    return createEventTemplate('initialised', target);
};

export function register(target){
    return createEventTemplate('register', target);
}

export function render(){
    return createEventTemplate('render', target);
}
