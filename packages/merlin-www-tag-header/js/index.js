'use strict';

import ShowItemCarousel from '@cnbritain/merlin-www-show-card-carousel';

import {
    addEventOnce,
    removeClass
} from '@cnbritain/merlin-www-js-utils/js/functions';

export default {
    'init': function() {
        var showCarouselEl = document.querySelector('.sh-item-carousel');
        if (showCarouselEl) {
            var showCarousel = new ShowItemCarousel(showCarouselEl);
            showCarousel._init();
        }

        var tgHeaderExpandBtn = document.querySelector('.js-tg-header__expand-btn');

        if (tgHeaderExpandBtn) {
            addEventOnce(
                tgHeaderExpandBtn,
                'click',
                this.expand.bind(this)
            );
        }
    },
    'expand': function() {
        removeClass(document.querySelector('.js-tg-header__description'), 'is-closed');
    }
};