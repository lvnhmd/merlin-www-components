'use strict';

import {
    addClass,
    addEvent,
    clamp,
    getBoundingClientRect,
    removeClass,
    throttle
} from '@cnbritain/merlin-www-js-utils/js/functions';
import {
    hasTouch
} from '@cnbritain/merlin-www-js-utils/js/detect';
import card from '@cnbritain/merlin-www-card';
import ElementScroll from '@cnbritain/merlin-www-js-elementscroll';


card.init();

/**
 * The scroll duration
 * @constant
 * @type {Number}
 */
var SCROLL_DURATION = 1000;

/**
 * The scroll throttle
 * @contant
 * @type {Number}
 */
var SCROLL_THROTTLE = 300;


/**
 * Show Item carousel
 * @class
 * @param {HTMLElement} el
 * @param {Object} _options
 */
function ShowItemCarousel(el, _options){
    var options = _options || {};

    this._btns = getNavButtons(el);
    this._elScroll = getElementScroll(el);
    this._scroller = null;
    this._scrollOffset = options.scrollOffset || 0;

    this.el = el;

    this._init();
}
ShowItemCarousel.prototype = {

    '_init': function(){
        // Show the nav buttons
        removeClass(getNavButtonsContainer(this.el), 'global__hidden');

        // Add no scrolling to the list
        if (!hasTouch) {
            addClass(this._elScroll, 'has-no-scroll');
        }

        // Scroll listener
        addEvent(
            this._elScroll, 'scroll', throttle(onScroll.bind(this),
                SCROLL_THROTTLE));

        // Arrow buttons
        if(this._btns.length > 0){
            addEvent(this._btns[0], 'click', this.previousItems.bind(this));
            addEvent(this._btns[1], 'click', this.nextItems.bind(this));
        }
    },

    'constructor': ShowItemCarousel,

    /**
     * Display the next items in the list
     */
    'nextItems': function(){
        // Get the scroll group size and scrollLeft
        var scrollRect = getBoundingClientRect(this._elScroll);

        // Get the stories position and sizes
        var elStories = getStoryElements(this._elScroll);
        var storyRects = elStories.map(getBoundingClientRect);
        storyRects = storyRects.map(normaliseToElement(scrollRect));

        // Find the first element that is offscreen or partially off
        var offscreenIndex = -1;
        var i = -1;
        var length = storyRects.length;
        while(++i < length){
            if( storyRects[i].right > scrollRect.width ){
                offscreenIndex = i;
                break;
            }
        }
        if( offscreenIndex === -1) return;

        this.scrollTo(storyRects[ offscreenIndex ].left + (window.innerWidth > scrollRect.width ? 0 : -this._scrollOffset));
    },

    /**
     * Displays the previous items in the list
     */
    'previousItems': function(){
        // Get the scroll group size and scrollLeft
        var scrollRect = getBoundingClientRect(this._elScroll);

        // Get the stories position and sizes
        var elStories = getStoryElements(this._elScroll);
        var storyRects = elStories.map(getBoundingClientRect);
        storyRects = storyRects.map(normaliseToElement(scrollRect));

        // Find the first element that is offscreen or partially off
        var offscreenIndex = -1;
        var length = storyRects.length;
        while(length--){
            if( storyRects[length].left < 0 ){
                offscreenIndex = length;
                break;
            }
        }
        if( offscreenIndex === -1) return;

        this.scrollTo(-scrollRect.width + storyRects[offscreenIndex].right + (window.innerWidth > scrollRect.width ? 0 : this._scrollOffset));
    },

    /**
     * Scrolls the element to x position
     * @param  {Number} x
     */
    'scrollTo': function(x){
        if( this._scroller !== null ){
            this._scroller.destroy();
            this._scroller = null;
        }

        // Clamp the scroll left
        var left = clamp(
            0, this._elScroll.scrollWidth - this._elScroll.offsetWidth,
            this._elScroll.scrollLeft + x);
        left -= this._elScroll.scrollLeft;

        this._scroller = new ElementScroll( this._elScroll );
        this._scroller.on('complete', onElementScrollFinish.bind(this));
        this._scroller.on('stop', onElementScrollFinish.bind(this));
        this._scroller.start({ 'x': left, 'y': 0 }, SCROLL_DURATION, {
            'stopOnUserInput': false
        });
    }

};

/**
 * Disables a button
 * @param  {HTMLElement} el
 */
function disableButton(el){
    if( el.hasAttribute('disabled') ) return;
    el.setAttribute('disabled', true);
    addClass(el, 'btn-disabled');
}

/**
 * Enables a button
 * @param  {HTMLElement} el
 */
function enableButton(el){
    if( !el.hasAttribute('disabled') ) return;
    el.removeAttribute('disabled');
    removeClass(el, 'btn-disabled');
}

/**
 * Gets the navigation buttons
 * @param  {HTMLElement} el
 * @return {Array.<HTMLElement>}
 */
function getNavButtons(el){
    return toArray(el.querySelectorAll('.sh-item-carousel__nav__btn'));
}

/**
 * Gets the container the nav buttons are in
 * @param  {HTMLElement} el
 * @return {HTMLElement}
 */
function getNavButtonsContainer(el){
    return el.querySelector('.sh-item-carousel__nav');
}

/**
 * Gets the element that is going to scroll
 * @param  {HTMLElement} el
 * @return {HTMLElement}
 */
function getElementScroll(el){
    return el.querySelector('.sh-item-carousel__list');
}

/**
 * Gets the article cards
 * @param  {HTMLElement} el
 * @return {Array.<HTMLElement>}
 */
function getStoryElements(el){
    return toArray(el.querySelectorAll('.sh-item-carousel__list__item'));
}

/**
 * Checks if the element scrollLeft is at the end
 * @param  {HTMLElement}  el
 * @return {Boolean}
 */
function isScrollAtEnd(el){
    return el.scrollLeft === el.scrollWidth - el.offsetWidth;
}

/**
 * Checks if the element scrollLeft is at the start
 * @param  {HTMLElement}  el
 * @return {Boolean}
 */
function isScrollAtStart(el){
    return el.scrollLeft === 0;
}

/**
 * Callback for when an element has finished scrolling
 */
function onElementScrollFinish(){
    this._scroller.destroy();
    this._scroller = null;

    // Check the state of the buttons
    updateButtonStates(this._elScroll, this._btns);
}

/**
 * Normalises the position of an element with the other element
 * @param  {Object} elRect
 * @return {Object}
 */
function normaliseToElement( elRect ){
    return function normaliseToElement_inner( rect ){
        return {
            'bottom': rect.bottom - elRect.top,
            'height': rect.height,
            'left': rect.left - elRect.left,
            'right': rect.right - elRect.left,
            'top': rect.top - elRect.top,
            'width': rect.width
        };
    };
}

/**
 * Callback for scroll event
 */
function onScroll(){
    if (window.innerWidth > 1024) {
        updateButtonStates(this._elScroll, this._btns);
    }
}

/**
 * Converts a collection into an array
 * @param  {*} collection
 * @return {Array}
 */
function toArray(collection){
    var length = collection.length;
    var o = new Array(length);
    while(length--) o[length] = collection[length];
    return o;
}

/**
 * Updates the button states based on the scroll element scrollLeft
 * @param  {HTMLElement} scroll
 * @param  {Array.<HTMLElement>} btns
 */
function updateButtonStates(scroll, btns){
    if( isScrollAtStart( scroll ) ){
        disableButton( btns[0] );
        enableButton( btns[1] );
    } else if( isScrollAtEnd( scroll ) ){
        enableButton( btns[0] );
        disableButton( btns[1] );
    } else {
        enableButton( btns[0] );
        enableButton( btns[1] );
    }
}

export default ShowItemCarousel;