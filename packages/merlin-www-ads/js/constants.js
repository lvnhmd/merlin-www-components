'use strict';

/**
 * Ad sizes we only want to send to Rubicon
 * @type {Object}
 */
export var RUBICON_ALLOWED_SIZES = {
    '728x90': true,
    '300x600': true,
    '300x250': true,
    '970x250': true,
    '970x90': true
};

/**
 * Different ad sizes
 * @readonly
 * @enum {Number}
 */
export var AD_TYPES = {
    'UNKNOWN': -1,
    'NATIVE': 0,
    'MPU': 1,
    'DOUBLESKY': 2,
    'LEADERBOARD': 3,
    'SUPERLEADER': 4,
    'BILLBOARD': 5,
    'RESPONSIVE': 6,
    'GALLERY_INTERSTITIAL': 7,
    'INCONTENT': 8,
    'INREAD': 9,
    'TRACKING_PIXEL': 10
};

/**
 * Maps sizes to enums
 * @constant
 * @type {Object}
 */
export var AD_SIZES_MAP = {
    '1x1': 0,
    '300x250': 1,
    '300x600': 2,
    '728x90': 3,
    '970x90': 4,
    '970x250': 5,
    '1520x300': 6,
    '700x400': 7,
    '420x160': 8,
    '100x100': 9,
    '5x5': 10
};

/**
 * Different states for the advert
 * @readonly
 * @enum {Number}
 */
export var AD_STATES = {
    'UNINITIALISED': 0,
    'INITIALISED': 1,
    'REGISTERING': 2,
    'REGISTERED': 3,
    'RENDERING': 4,
    'RENDERED': 5,
    'STOPPED': 6,
    'DESTROYED': 7
};

export var AD_CLS = '.ad__container';
