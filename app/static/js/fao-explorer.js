/*!
 * Smooth Scroll - v1.4.13 - 2013-11-02
 * https://github.com/kswedberg/jquery-smooth-scroll
 * Copyright (c) 2013 Karl Swedberg
 * Licensed MIT (https://github.com/kswedberg/jquery-smooth-scroll/blob/master/LICENSE-MIT)
 */

(function($) {
var version = '1.4.13',
    optionOverrides = {},
    defaults = {
      exclude: [],
      excludeWithin:[],
      offset: 0,

      // one of 'top' or 'left'
      direction: 'top',

      // jQuery set of elements you wish to scroll (for $.smoothScroll).
      //  if null (default), $('html, body').firstScrollable() is used.
      scrollElement: null,

      // only use if you want to override default behavior
      scrollTarget: null,

      // fn(opts) function to be called before scrolling occurs.
      // `this` is the element(s) being scrolled
      beforeScroll: function() {},

      // fn(opts) function to be called after scrolling occurs.
      // `this` is the triggering element
      afterScroll: function() {},
      easing: 'swing',
      speed: 400,

      // coefficient for "auto" speed
      autoCoefficent: 2,

      // $.fn.smoothScroll only: whether to prevent the default click action
      preventDefault: true
    },

    getScrollable = function(opts) {
      var scrollable = [],
          scrolled = false,
          dir = opts.dir && opts.dir == 'left' ? 'scrollLeft' : 'scrollTop';

      this.each(function() {

        if (this == document || this == window) { return; }
        var el = $(this);
        if ( el[dir]() > 0 ) {
          scrollable.push(this);
        } else {
          // if scroll(Top|Left) === 0, nudge the element 1px and see if it moves
          el[dir](1);
          scrolled = el[dir]() > 0;
          if ( scrolled ) {
            scrollable.push(this);
          }
          // then put it back, of course
          el[dir](0);
        }
      });

      // If no scrollable elements, fall back to <body>,
      // if it's in the jQuery collection
      // (doing this because Safari sets scrollTop async,
      // so can't set it to 1 and immediately get the value.)
      if (!scrollable.length) {
        this.each(function(index) {
          if (this.nodeName === 'BODY') {
            scrollable = [this];
          }
        });
      }

      // Use the first scrollable element if we're calling firstScrollable()
      if ( opts.el === 'first' && scrollable.length > 1 ) {
        scrollable = [ scrollable[0] ];
      }

      return scrollable;
    },
    isTouch = 'ontouchend' in document;

$.fn.extend({
  scrollable: function(dir) {
    var scrl = getScrollable.call(this, {dir: dir});
    return this.pushStack(scrl);
  },
  firstScrollable: function(dir) {
    var scrl = getScrollable.call(this, {el: 'first', dir: dir});
    return this.pushStack(scrl);
  },

  smoothScroll: function(options, extra) {
    options = options || {};

    if ( options === 'options' ) {
      if ( !extra ) {
        return this.first().data('ssOpts');
      }
      return this.each(function() {
        var $this = $(this),
            opts = $.extend($this.data('ssOpts') || {}, extra);

        $(this).data('ssOpts', opts);
      });
    }

    var opts = $.extend({}, $.fn.smoothScroll.defaults, options),
        locationPath = $.smoothScroll.filterPath(location.pathname);

    this
    .unbind('click.smoothscroll')
    .bind('click.smoothscroll', function(event) {
      var link = this,
          $link = $(this),
          thisOpts = $.extend({}, opts, $link.data('ssOpts') || {}),
          exclude = opts.exclude,
          excludeWithin = thisOpts.excludeWithin,
          elCounter = 0, ewlCounter = 0,
          include = true,
          clickOpts = {},
          hostMatch = ((location.hostname === link.hostname) || !link.hostname),
          pathMatch = thisOpts.scrollTarget || ( $.smoothScroll.filterPath(link.pathname) || locationPath ) === locationPath,
          thisHash = escapeSelector(link.hash);

      if ( !thisOpts.scrollTarget && (!hostMatch || !pathMatch || !thisHash) ) {
        include = false;
      } else {
        while (include && elCounter < exclude.length) {
          if ($link.is(escapeSelector(exclude[elCounter++]))) {
            include = false;
          }
        }
        while ( include && ewlCounter < excludeWithin.length ) {
          if ($link.closest(excludeWithin[ewlCounter++]).length) {
            include = false;
          }
        }
      }

      if ( include ) {

        if ( thisOpts.preventDefault ) {
          event.preventDefault();
        }

        $.extend( clickOpts, thisOpts, {
          scrollTarget: thisOpts.scrollTarget || thisHash,
          link: link
        });
        $.smoothScroll( clickOpts );
      }
    });

    return this;
  }
});

$.smoothScroll = function(options, px) {
  if ( options === 'options' && typeof px === 'object' ) {
    return $.extend(optionOverrides, px);
  }
  var opts, $scroller, scrollTargetOffset, speed,
      scrollerOffset = 0,
      offPos = 'offset',
      scrollDir = 'scrollTop',
      aniProps = {},
      aniOpts = {},
      scrollprops = [];

  if (typeof options === 'number') {
    opts = $.extend({link: null}, $.fn.smoothScroll.defaults, optionOverrides);
    scrollTargetOffset = options;
  } else {
    opts = $.extend({link: null}, $.fn.smoothScroll.defaults, options || {}, optionOverrides);
    if (opts.scrollElement) {
      offPos = 'position';
      if (opts.scrollElement.css('position') == 'static') {
        opts.scrollElement.css('position', 'relative');
      }
    }
  }

  scrollDir = opts.direction == 'left' ? 'scrollLeft' : scrollDir;

  if ( opts.scrollElement ) {
    $scroller = opts.scrollElement;
    if ( !(/^(?:HTML|BODY)$/).test($scroller[0].nodeName) ) {
      scrollerOffset = $scroller[scrollDir]();
    }
  } else {
    $scroller = $('html, body').firstScrollable(opts.direction);
  }

  // beforeScroll callback function must fire before calculating offset
  opts.beforeScroll.call($scroller, opts);

  scrollTargetOffset = (typeof options === 'number') ? options :
                        px ||
                        ( $(opts.scrollTarget)[offPos]() &&
                        $(opts.scrollTarget)[offPos]()[opts.direction] ) ||
                        0;

  aniProps[scrollDir] = scrollTargetOffset + scrollerOffset + opts.offset;
  speed = opts.speed;

  // automatically calculate the speed of the scroll based on distance / coefficient
  if (speed === 'auto') {

    // if aniProps[scrollDir] == 0 then we'll use scrollTop() value instead
    speed = aniProps[scrollDir] || $scroller.scrollTop();

    // divide the speed by the coefficient
    speed = speed / opts.autoCoefficent;
  }

  aniOpts = {
    duration: speed,
    easing: opts.easing,
    complete: function() {
      opts.afterScroll.call(opts.link, opts);
    }
  };

  if (opts.step) {
    aniOpts.step = opts.step;
  }

  if ($scroller.length) {
    $scroller.stop().animate(aniProps, aniOpts);
  } else {
    opts.afterScroll.call(opts.link, opts);
  }
};

$.smoothScroll.version = version;
$.smoothScroll.filterPath = function(string) {
  return string
    .replace(/^\//,'')
    .replace(/(?:index|default).[a-zA-Z]{3,4}$/,'')
    .replace(/\/$/,'');
};

// default options
$.fn.smoothScroll.defaults = defaults;

function escapeSelector (str) {
  return str.replace(/(:|\.)/g,'\\$1');
}

})(jQuery);


/* **********************************************
     Begin transition.js
********************************************** */

/* ========================================================================
 * Bootstrap: transition.js v3.1.0
 * http://getbootstrap.com/javascript/#transitions
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // CSS TRANSITION SUPPORT (Shoutout: http://www.modernizr.com/)
  // ============================================================

  function transitionEnd() {
    var el = document.createElement('bootstrap')

    var transEndEventNames = {
      'WebkitTransition' : 'webkitTransitionEnd',
      'MozTransition'    : 'transitionend',
      'OTransition'      : 'oTransitionEnd otransitionend',
      'transition'       : 'transitionend'
    }

    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return { end: transEndEventNames[name] }
      }
    }

    return false // explicit for ie8 (  ._.)
  }

  // http://blog.alexmaccaw.com/css-transitions
  $.fn.emulateTransitionEnd = function (duration) {
    var called = false, $el = this
    $(this).one($.support.transition.end, function () { called = true })
    var callback = function () { if (!called) $($el).trigger($.support.transition.end) }
    setTimeout(callback, duration)
    return this
  }

  $(function () {
    $.support.transition = transitionEnd()
  })

}(jQuery);


/* **********************************************
     Begin scrollspy.js
********************************************** */

/* ========================================================================
 * Bootstrap: scrollspy.js v3.1.0
 * http://getbootstrap.com/javascript/#scrollspy
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // SCROLLSPY CLASS DEFINITION
  // ==========================

  function ScrollSpy(element, options) {
    var href
    var process  = $.proxy(this.process, this)

    this.$element       = $(element).is('body') ? $(window) : $(element)
    this.$body          = $('body')
    this.$scrollElement = this.$element.on('scroll.bs.scroll-spy.data-api', process)
    this.options        = $.extend({}, ScrollSpy.DEFAULTS, options)
    this.selector       = (this.options.target
      || ((href = $(element).attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
      || '') + ' .nav li > a'
    this.offsets        = $([])
    this.targets        = $([])
    this.activeTarget   = null

    this.refresh()
    this.process()
  }

  ScrollSpy.DEFAULTS = {
    offset: 10
  }

  ScrollSpy.prototype.refresh = function () {
    var offsetMethod = this.$element[0] == window ? 'offset' : 'position'

    this.offsets = $([])
    this.targets = $([])

    var self     = this
    var $targets = this.$body
      .find(this.selector)
      .map(function () {
        var $el   = $(this)
        var href  = $el.data('target') || $el.attr('href')
        var $href = /^#./.test(href) && $(href)

        return ($href
          && $href.length
          && $href.is(':visible')
          && [[ $href[offsetMethod]().top + (!$.isWindow(self.$scrollElement.get(0)) && self.$scrollElement.scrollTop()), href ]]) || null
      })
      .sort(function (a, b) { return a[0] - b[0] })
      .each(function () {
        self.offsets.push(this[0])
        self.targets.push(this[1])
      })
  }

  ScrollSpy.prototype.process = function () {
    var scrollTop    = this.$scrollElement.scrollTop() + this.options.offset
    var scrollHeight = this.$scrollElement[0].scrollHeight || this.$body[0].scrollHeight
    var maxScroll    = scrollHeight - this.$scrollElement.height()
    var offsets      = this.offsets
    var targets      = this.targets
    var activeTarget = this.activeTarget
    var i

    if (scrollTop >= maxScroll) {
      return activeTarget != (i = targets.last()[0]) && this.activate(i)
    }

    if (activeTarget && scrollTop <= offsets[0]) {
      return activeTarget != (i = targets[0]) && this.activate(i)
    }

    for (i = offsets.length; i--;) {
      activeTarget != targets[i]
        && scrollTop >= offsets[i]
        && (!offsets[i + 1] || scrollTop <= offsets[i + 1])
        && this.activate( targets[i] )
    }
  }

  ScrollSpy.prototype.activate = function (target) {
    this.activeTarget = target

    $(this.selector)
      .parentsUntil(this.options.target, '.active')
      .removeClass('active')

    var selector = this.selector +
        '[data-target="' + target + '"],' +
        this.selector + '[href="' + target + '"]'

    var active = $(selector)
      .parents('li')
      .addClass('active')

    if (active.parent('.dropdown-menu').length) {
      active = active
        .closest('li.dropdown')
        .addClass('active')
    }

    active.trigger('activate.bs.scrollspy')
  }


  // SCROLLSPY PLUGIN DEFINITION
  // ===========================

  var old = $.fn.scrollspy

  $.fn.scrollspy = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.scrollspy')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.scrollspy', (data = new ScrollSpy(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.scrollspy.Constructor = ScrollSpy


  // SCROLLSPY NO CONFLICT
  // =====================

  $.fn.scrollspy.noConflict = function () {
    $.fn.scrollspy = old
    return this
  }


  // SCROLLSPY DATA-API
  // ==================

  $(window).on('load', function () {
    $('[data-spy="scroll"]').each(function () {
      var $spy = $(this)
      $spy.scrollspy($spy.data())
    })
  })

}(jQuery);


/* **********************************************
     Begin tab.js
********************************************** */

/* ========================================================================
 * Bootstrap: tab.js v3.1.0
 * http://getbootstrap.com/javascript/#tabs
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // TAB CLASS DEFINITION
  // ====================

  var Tab = function (element) {
    this.element = $(element)
  }

  Tab.prototype.show = function () {
    var $this    = this.element
    var $ul      = $this.closest('ul:not(.dropdown-menu)')
    var selector = $this.data('target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
    }

    if ($this.parent('li').hasClass('active')) return

    var previous = $ul.find('.active:last a')[0]
    var e        = $.Event('show.bs.tab', {
      relatedTarget: previous
    })

    $this.trigger(e)

    if (e.isDefaultPrevented()) return

    var $target = $(selector)

    this.activate($this.parent('li'), $ul)
    this.activate($target, $target.parent(), function () {
      $this.trigger({
        type: 'shown.bs.tab',
        relatedTarget: previous
      })
    })
  }

  Tab.prototype.activate = function (element, container, callback) {
    var $active    = container.find('> .active')
    var transition = callback
      && $.support.transition
      && $active.hasClass('fade')

    function next() {
      $active
        .removeClass('active')
        .find('> .dropdown-menu > .active')
        .removeClass('active')

      element.addClass('active')

      if (transition) {
        element[0].offsetWidth // reflow for transition
        element.addClass('in')
      } else {
        element.removeClass('fade')
      }

      if (element.parent('.dropdown-menu')) {
        element.closest('li.dropdown').addClass('active')
      }

      callback && callback()
    }

    transition ?
      $active
        .one($.support.transition.end, next)
        .emulateTransitionEnd(150) :
      next()

    $active.removeClass('in')
  }


  // TAB PLUGIN DEFINITION
  // =====================

  var old = $.fn.tab

  $.fn.tab = function ( option ) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.tab')

      if (!data) $this.data('bs.tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.tab.Constructor = Tab


  // TAB NO CONFLICT
  // ===============

  $.fn.tab.noConflict = function () {
    $.fn.tab = old
    return this
  }


  // TAB DATA-API
  // ============

  $(document).on('click.bs.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function (e) {
    e.preventDefault()
    $(this).tab('show')
  })

}(jQuery);


/* **********************************************
     Begin tooltip.js
********************************************** */

/* ========================================================================
 * Bootstrap: tooltip.js v3.1.0
 * http://getbootstrap.com/javascript/#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================

  var Tooltip = function (element, options) {
    this.type       =
    this.options    =
    this.enabled    =
    this.timeout    =
    this.hoverState =
    this.$element   = null

    this.init('tooltip', element, options)
  }

  Tooltip.DEFAULTS = {
    animation: true,
    placement: 'top',
    selector: false,
    template: '<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    container: false
  }

  Tooltip.prototype.init = function (type, element, options) {
    this.enabled  = true
    this.type     = type
    this.$element = $(element)
    this.options  = this.getOptions(options)

    var triggers = this.options.trigger.split(' ')

    for (var i = triggers.length; i--;) {
      var trigger = triggers[i]

      if (trigger == 'click') {
        this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
      } else if (trigger != 'manual') {
        var eventIn  = trigger == 'hover' ? 'mouseenter' : 'focusin'
        var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout'

        this.$element.on(eventIn  + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
        this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
      }
    }

    this.options.selector ?
      (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
      this.fixTitle()
  }

  Tooltip.prototype.getDefaults = function () {
    return Tooltip.DEFAULTS
  }

  Tooltip.prototype.getOptions = function (options) {
    options = $.extend({}, this.getDefaults(), this.$element.data(), options)

    if (options.delay && typeof options.delay == 'number') {
      options.delay = {
        show: options.delay,
        hide: options.delay
      }
    }

    return options
  }

  Tooltip.prototype.getDelegateOptions = function () {
    var options  = {}
    var defaults = this.getDefaults()

    this._options && $.each(this._options, function (key, value) {
      if (defaults[key] != value) options[key] = value
    })

    return options
  }

  Tooltip.prototype.enter = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type)

    clearTimeout(self.timeout)

    self.hoverState = 'in'

    if (!self.options.delay || !self.options.delay.show) return self.show()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'in') self.show()
    }, self.options.delay.show)
  }

  Tooltip.prototype.leave = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type)

    clearTimeout(self.timeout)

    self.hoverState = 'out'

    if (!self.options.delay || !self.options.delay.hide) return self.hide()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'out') self.hide()
    }, self.options.delay.hide)
  }

  Tooltip.prototype.show = function () {
    var e = $.Event('show.bs.' + this.type)

    if (this.hasContent() && this.enabled) {
      this.$element.trigger(e)

      if (e.isDefaultPrevented()) return
      var that = this;

      var $tip = this.tip()

      this.setContent()

      if (this.options.animation) $tip.addClass('fade')

      var placement = typeof this.options.placement == 'function' ?
        this.options.placement.call(this, $tip[0], this.$element[0]) :
        this.options.placement

      var autoToken = /\s?auto?\s?/i
      var autoPlace = autoToken.test(placement)
      if (autoPlace) placement = placement.replace(autoToken, '') || 'top'

      $tip
        .detach()
        .css({ top: 0, left: 0, display: 'block' })
        .addClass(placement)

      this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element)

      var pos          = this.getPosition()
      var actualWidth  = $tip[0].offsetWidth
      var actualHeight = $tip[0].offsetHeight

      if (autoPlace) {
        var $parent = this.$element.parent()

        var orgPlacement = placement
        var docScroll    = document.documentElement.scrollTop || document.body.scrollTop
        var parentWidth  = this.options.container == 'body' ? window.innerWidth  : $parent.outerWidth()
        var parentHeight = this.options.container == 'body' ? window.innerHeight : $parent.outerHeight()
        var parentLeft   = this.options.container == 'body' ? 0 : $parent.offset().left

        placement = placement == 'bottom' && pos.top   + pos.height  + actualHeight - docScroll > parentHeight  ? 'top'    :
                    placement == 'top'    && pos.top   - docScroll   - actualHeight < 0                         ? 'bottom' :
                    placement == 'right'  && pos.right + actualWidth > parentWidth                              ? 'left'   :
                    placement == 'left'   && pos.left  - actualWidth < parentLeft                               ? 'right'  :
                    placement

        $tip
          .removeClass(orgPlacement)
          .addClass(placement)
      }

      var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)

      this.applyPlacement(calculatedOffset, placement)
      this.hoverState = null

      var complete = function() {
        that.$element.trigger('shown.bs.' + that.type)
      }

      $.support.transition && this.$tip.hasClass('fade') ?
        $tip
          .one($.support.transition.end, complete)
          .emulateTransitionEnd(150) :
        complete()
    }
  }

  Tooltip.prototype.applyPlacement = function (offset, placement) {
    var replace
    var $tip   = this.tip()
    var width  = $tip[0].offsetWidth
    var height = $tip[0].offsetHeight

    // manually read margins because getBoundingClientRect includes difference
    var marginTop = parseInt($tip.css('margin-top'), 10)
    var marginLeft = parseInt($tip.css('margin-left'), 10)

    // we must check for NaN for ie 8/9
    if (isNaN(marginTop))  marginTop  = 0
    if (isNaN(marginLeft)) marginLeft = 0

    offset.top  = offset.top  + marginTop
    offset.left = offset.left + marginLeft

    // $.fn.offset doesn't round pixel values
    // so we use setOffset directly with our own function B-0
    $.offset.setOffset($tip[0], $.extend({
      using: function (props) {
        $tip.css({
          top: Math.round(props.top),
          left: Math.round(props.left)
        })
      }
    }, offset), 0)

    $tip.addClass('in')

    // check to see if placing tip in new offset caused the tip to resize itself
    var actualWidth  = $tip[0].offsetWidth
    var actualHeight = $tip[0].offsetHeight

    if (placement == 'top' && actualHeight != height) {
      replace = true
      offset.top = offset.top + height - actualHeight
    }

    if (/bottom|top/.test(placement)) {
      var delta = 0

      if (offset.left < 0) {
        delta       = offset.left * -2
        offset.left = 0

        $tip.offset(offset)

        actualWidth  = $tip[0].offsetWidth
        actualHeight = $tip[0].offsetHeight
      }

      this.replaceArrow(delta - width + actualWidth, actualWidth, 'left')
    } else {
      this.replaceArrow(actualHeight - height, actualHeight, 'top')
    }

    if (replace) $tip.offset(offset)
  }

  Tooltip.prototype.replaceArrow = function (delta, dimension, position) {
    this.arrow().css(position, delta ? (50 * (1 - delta / dimension) + '%') : '')
  }

  Tooltip.prototype.setContent = function () {
    var $tip  = this.tip()
    var title = this.getTitle()

    $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
    $tip.removeClass('fade in top bottom left right')
  }

  Tooltip.prototype.hide = function () {
    var that = this
    var $tip = this.tip()
    var e    = $.Event('hide.bs.' + this.type)

    function complete() {
      if (that.hoverState != 'in') $tip.detach()
      that.$element.trigger('hidden.bs.' + that.type)
    }

    this.$element.trigger(e)

    if (e.isDefaultPrevented()) return

    $tip.removeClass('in')

    $.support.transition && this.$tip.hasClass('fade') ?
      $tip
        .one($.support.transition.end, complete)
        .emulateTransitionEnd(150) :
      complete()

    this.hoverState = null

    return this
  }

  Tooltip.prototype.fixTitle = function () {
    var $e = this.$element
    if ($e.attr('title') || typeof($e.attr('data-original-title')) != 'string') {
      $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
    }
  }

  Tooltip.prototype.hasContent = function () {
    return this.getTitle()
  }

  Tooltip.prototype.getPosition = function () {
    var el = this.$element[0]
    return $.extend({}, (typeof el.getBoundingClientRect == 'function') ? el.getBoundingClientRect() : {
      width: el.offsetWidth,
      height: el.offsetHeight
    }, this.$element.offset())
  }

  Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
    return placement == 'bottom' ? { top: pos.top + pos.height,   left: pos.left + pos.width / 2 - actualWidth / 2  } :
           placement == 'top'    ? { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2  } :
           placement == 'left'   ? { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth } :
        /* placement == 'right' */ { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width   }
  }

  Tooltip.prototype.getTitle = function () {
    var title
    var $e = this.$element
    var o  = this.options

    title = $e.attr('data-original-title')
      || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

    return title
  }

  Tooltip.prototype.tip = function () {
    return this.$tip = this.$tip || $(this.options.template)
  }

  Tooltip.prototype.arrow = function () {
    return this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow')
  }

  Tooltip.prototype.validate = function () {
    if (!this.$element[0].parentNode) {
      this.hide()
      this.$element = null
      this.options  = null
    }
  }

  Tooltip.prototype.enable = function () {
    this.enabled = true
  }

  Tooltip.prototype.disable = function () {
    this.enabled = false
  }

  Tooltip.prototype.toggleEnabled = function () {
    this.enabled = !this.enabled
  }

  Tooltip.prototype.toggle = function (e) {
    var self = e ? $(e.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type) : this
    self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
  }

  Tooltip.prototype.destroy = function () {
    clearTimeout(this.timeout)
    this.hide().$element.off('.' + this.type).removeData('bs.' + this.type)
  }


  // TOOLTIP PLUGIN DEFINITION
  // =========================

  var old = $.fn.tooltip

  $.fn.tooltip = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.tooltip')
      var options = typeof option == 'object' && option

      if (!data && option == 'destroy') return
      if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.tooltip.Constructor = Tooltip


  // TOOLTIP NO CONFLICT
  // ===================

  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old
    return this
  }

}(jQuery);


/* **********************************************
     Begin carousel.js
********************************************** */

/* ========================================================================
 * Bootstrap: carousel.js v3.1.0
 * http://getbootstrap.com/javascript/#carousel
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // CAROUSEL CLASS DEFINITION
  // =========================

  var Carousel = function (element, options) {
    this.$element    = $(element)
    this.$indicators = this.$element.find('.carousel-indicators')
    this.options     = options
    this.paused      =
    this.sliding     =
    this.interval    =
    this.$active     =
    this.$items      = null

    this.options.pause == 'hover' && this.$element
      .on('mouseenter', $.proxy(this.pause, this))
      .on('mouseleave', $.proxy(this.cycle, this))
  }

  Carousel.DEFAULTS = {
    interval: 5000,
    pause: 'hover',
    wrap: true
  }

  Carousel.prototype.cycle =  function (e) {
    e || (this.paused = false)

    this.interval && clearInterval(this.interval)

    this.options.interval
      && !this.paused
      && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))

    return this
  }

  Carousel.prototype.getActiveIndex = function () {
    this.$active = this.$element.find('.item.active')
    this.$items  = this.$active.parent().children()

    return this.$items.index(this.$active)
  }

  Carousel.prototype.to = function (pos) {
    var that        = this
    var activeIndex = this.getActiveIndex()

    if (pos > (this.$items.length - 1) || pos < 0) return

    if (this.sliding)       return this.$element.one('slid.bs.carousel', function () { that.to(pos) })
    if (activeIndex == pos) return this.pause().cycle()

    return this.slide(pos > activeIndex ? 'next' : 'prev', $(this.$items[pos]))
  }

  Carousel.prototype.pause = function (e) {
    e || (this.paused = true)

    if (this.$element.find('.next, .prev').length && $.support.transition) {
      this.$element.trigger($.support.transition.end)
      this.cycle(true)
    }

    this.interval = clearInterval(this.interval)

    return this
  }

  Carousel.prototype.next = function () {
    if (this.sliding) return
    return this.slide('next')
  }

  Carousel.prototype.prev = function () {
    if (this.sliding) return
    return this.slide('prev')
  }

  Carousel.prototype.slide = function (type, next) {
    var $active   = this.$element.find('.item.active')
    var $next     = next || $active[type]()
    var isCycling = this.interval
    var direction = type == 'next' ? 'left' : 'right'
    var fallback  = type == 'next' ? 'first' : 'last'
    var that      = this

    if (!$next.length) {
      if (!this.options.wrap) return
      $next = this.$element.find('.item')[fallback]()
    }

    if ($next.hasClass('active')) return this.sliding = false

    var e = $.Event('slide.bs.carousel', { relatedTarget: $next[0], direction: direction })
    this.$element.trigger(e)
    if (e.isDefaultPrevented()) return

    this.sliding = true

    isCycling && this.pause()

    if (this.$indicators.length) {
      this.$indicators.find('.active').removeClass('active')
      this.$element.one('slid.bs.carousel', function () {
        var $nextIndicator = $(that.$indicators.children()[that.getActiveIndex()])
        $nextIndicator && $nextIndicator.addClass('active')
      })
    }

    if ($.support.transition && this.$element.hasClass('slide')) {
      $next.addClass(type)
      $next[0].offsetWidth // force reflow
      $active.addClass(direction)
      $next.addClass(direction)
      $active
        .one($.support.transition.end, function () {
          $next.removeClass([type, direction].join(' ')).addClass('active')
          $active.removeClass(['active', direction].join(' '))
          that.sliding = false
          setTimeout(function () { that.$element.trigger('slid.bs.carousel') }, 0)
        })
        .emulateTransitionEnd($active.css('transition-duration').slice(0, -1) * 1000)
    } else {
      $active.removeClass('active')
      $next.addClass('active')
      this.sliding = false
      this.$element.trigger('slid.bs.carousel')
    }

    isCycling && this.cycle()

    return this
  }


  // CAROUSEL PLUGIN DEFINITION
  // ==========================

  var old = $.fn.carousel

  $.fn.carousel = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.carousel')
      var options = $.extend({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option)
      var action  = typeof option == 'string' ? option : options.slide

      if (!data) $this.data('bs.carousel', (data = new Carousel(this, options)))
      if (typeof option == 'number') data.to(option)
      else if (action) data[action]()
      else if (options.interval) data.pause().cycle()
    })
  }

  $.fn.carousel.Constructor = Carousel


  // CAROUSEL NO CONFLICT
  // ====================

  $.fn.carousel.noConflict = function () {
    $.fn.carousel = old
    return this
  }


  // CAROUSEL DATA-API
  // =================

  $(document).on('click.bs.carousel.data-api', '[data-slide], [data-slide-to]', function (e) {
    var $this   = $(this), href
    var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
    var options = $.extend({}, $target.data(), $this.data())
    var slideIndex = $this.attr('data-slide-to')
    if (slideIndex) options.interval = false

    $target.carousel(options)

    if (slideIndex = $this.attr('data-slide-to')) {
      $target.data('bs.carousel').to(slideIndex)
    }

    e.preventDefault()
  })

  $(window).on('load', function () {
    $('[data-ride="carousel"]').each(function () {
      var $carousel = $(this)
      $carousel.carousel($carousel.data())
    })
  })

}(jQuery);


/* **********************************************
     Begin collapse.js
********************************************** */

/* ========================================================================
 * Bootstrap: collapse.js v3.1.0
 * http://getbootstrap.com/javascript/#collapse
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // COLLAPSE PUBLIC CLASS DEFINITION
  // ================================

  var Collapse = function (element, options) {
    this.$element      = $(element)
    this.options       = $.extend({}, Collapse.DEFAULTS, options)
    this.transitioning = null

    if (this.options.parent) this.$parent = $(this.options.parent)
    if (this.options.toggle) this.toggle()
  }

  Collapse.DEFAULTS = {
    toggle: true
  }

  Collapse.prototype.dimension = function () {
    var hasWidth = this.$element.hasClass('width')
    return hasWidth ? 'width' : 'height'
  }

  Collapse.prototype.show = function () {
    if (this.transitioning || this.$element.hasClass('in')) return

    var startEvent = $.Event('show.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    var actives = this.$parent && this.$parent.find('> .panel > .in')

    if (actives && actives.length) {
      var hasData = actives.data('bs.collapse')
      if (hasData && hasData.transitioning) return
      actives.collapse('hide')
      hasData || actives.data('bs.collapse', null)
    }

    var dimension = this.dimension()

    this.$element
      .removeClass('collapse')
      .addClass('collapsing')
      [dimension](0)

    this.transitioning = 1

    var complete = function () {
      this.$element
        .removeClass('collapsing')
        .addClass('collapse in')
        [dimension]('auto')
      this.transitioning = 0
      this.$element.trigger('shown.bs.collapse')
    }

    if (!$.support.transition) return complete.call(this)

    var scrollSize = $.camelCase(['scroll', dimension].join('-'))

    this.$element
      .one($.support.transition.end, $.proxy(complete, this))
      .emulateTransitionEnd(350)
      [dimension](this.$element[0][scrollSize])
  }

  Collapse.prototype.hide = function () {
    if (this.transitioning || !this.$element.hasClass('in')) return

    var startEvent = $.Event('hide.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    var dimension = this.dimension()

    this.$element
      [dimension](this.$element[dimension]())
      [0].offsetHeight

    this.$element
      .addClass('collapsing')
      .removeClass('collapse')
      .removeClass('in')

    this.transitioning = 1

    var complete = function () {
      this.transitioning = 0
      this.$element
        .trigger('hidden.bs.collapse')
        .removeClass('collapsing')
        .addClass('collapse')
    }

    if (!$.support.transition) return complete.call(this)

    this.$element
      [dimension](0)
      .one($.support.transition.end, $.proxy(complete, this))
      .emulateTransitionEnd(350)
  }

  Collapse.prototype.toggle = function () {
    this[this.$element.hasClass('in') ? 'hide' : 'show']()
  }


  // COLLAPSE PLUGIN DEFINITION
  // ==========================

  var old = $.fn.collapse

  $.fn.collapse = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.collapse')
      var options = $.extend({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data && options.toggle && option == 'show') option = !option
      if (!data) $this.data('bs.collapse', (data = new Collapse(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.collapse.Constructor = Collapse


  // COLLAPSE NO CONFLICT
  // ====================

  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old
    return this
  }


  // COLLAPSE DATA-API
  // =================

  $(document).on('click.bs.collapse.data-api', '[data-toggle=collapse]', function (e) {
    var $this   = $(this), href
    var target  = $this.attr('data-target')
        || e.preventDefault()
        || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') //strip for ie7
    var $target = $(target)
    var data    = $target.data('bs.collapse')
    var option  = data ? 'toggle' : $this.data()
    var parent  = $this.attr('data-parent')
    var $parent = parent && $(parent)

    if (!data || !data.transitioning) {
      if ($parent) $parent.find('[data-toggle=collapse][data-parent="' + parent + '"]').not($this).addClass('collapsed')
      $this[$target.hasClass('in') ? 'addClass' : 'removeClass']('collapsed')
    }

    $target.collapse(option)
  })

}(jQuery);


/* **********************************************
     Begin modal.js
********************************************** */

/* ========================================================================
 * Bootstrap: modal.js v3.1.0
 * http://getbootstrap.com/javascript/#modals
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
    this.options   = options
    this.$element  = $(element)
    this.$backdrop =
    this.isShown   = null

    if (this.options.remote) {
      this.$element
        .find('.modal-content')
        .load(this.options.remote, $.proxy(function () {
          this.$element.trigger('loaded.bs.modal')
        }, this))
    }
  }

  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  }

  Modal.prototype.toggle = function (_relatedTarget) {
    return this[!this.isShown ? 'show' : 'hide'](_relatedTarget)
  }

  Modal.prototype.show = function (_relatedTarget) {
    var that = this
    var e    = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })

    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.isShown = true

    this.escape()

    this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade')

      if (!that.$element.parent().length) {
        that.$element.appendTo(document.body) // don't move modals dom position
      }

      that.$element
        .show()
        .scrollTop(0)

      if (transition) {
        that.$element[0].offsetWidth // force reflow
      }

      that.$element
        .addClass('in')
        .attr('aria-hidden', false)

      that.enforceFocus()

      var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })

      transition ?
        that.$element.find('.modal-dialog') // wait for modal to slide in
          .one($.support.transition.end, function () {
            that.$element.focus().trigger(e)
          })
          .emulateTransitionEnd(300) :
        that.$element.focus().trigger(e)
    })
  }

  Modal.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.bs.modal')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return

    this.isShown = false

    this.escape()

    $(document).off('focusin.bs.modal')

    this.$element
      .removeClass('in')
      .attr('aria-hidden', true)
      .off('click.dismiss.bs.modal')

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one($.support.transition.end, $.proxy(this.hideModal, this))
        .emulateTransitionEnd(300) :
      this.hideModal()
  }

  Modal.prototype.enforceFocus = function () {
    $(document)
      .off('focusin.bs.modal') // guard against infinite focus loop
      .on('focusin.bs.modal', $.proxy(function (e) {
        if (this.$element[0] !== e.target && !this.$element.has(e.target).length) {
          this.$element.focus()
        }
      }, this))
  }

  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keyup.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide()
      }, this))
    } else if (!this.isShown) {
      this.$element.off('keyup.dismiss.bs.modal')
    }
  }

  Modal.prototype.hideModal = function () {
    var that = this
    this.$element.hide()
    this.backdrop(function () {
      that.removeBackdrop()
      that.$element.trigger('hidden.bs.modal')
    })
  }

  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove()
    this.$backdrop = null
  }

  Modal.prototype.backdrop = function (callback) {
    var animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
        .appendTo(document.body)

      this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
        if (e.target !== e.currentTarget) return
        this.options.backdrop == 'static'
          ? this.$element[0].focus.call(this.$element[0])
          : this.hide.call(this)
      }, this))

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      if (!callback) return

      doAnimate ?
        this.$backdrop
          .one($.support.transition.end, callback)
          .emulateTransitionEnd(150) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      $.support.transition && this.$element.hasClass('fade') ?
        this.$backdrop
          .one($.support.transition.end, callback)
          .emulateTransitionEnd(150) :
        callback()

    } else if (callback) {
      callback()
    }
  }


  // MODAL PLUGIN DEFINITION
  // =======================

  var old = $.fn.modal

  $.fn.modal = function (option, _relatedTarget) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.modal')
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      else if (options.show) data.show(_relatedTarget)
    })
  }

  $.fn.modal.Constructor = Modal


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


  // MODAL DATA-API
  // ==============

  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this   = $(this)
    var href    = $this.attr('href')
    var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) //strip for ie7
    var option  = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    $target
      .modal(option, this)
      .one('hide', function () {
        $this.is(':visible') && $this.focus()
      })
  })

  $(document)
    .on('show.bs.modal', '.modal', function () { $(document.body).addClass('modal-open') })
    .on('hidden.bs.modal', '.modal', function () { $(document.body).removeClass('modal-open') })

}(jQuery);


/* **********************************************
     Begin dropdown.js
********************************************** */

/* ========================================================================
 * Bootstrap: dropdown.js v3.1.0
 * http://getbootstrap.com/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // DROPDOWN CLASS DEFINITION
  // =========================

  var backdrop = '.dropdown-backdrop'
  var toggle   = '[data-toggle=dropdown]'
  var Dropdown = function (element) {
    $(element).on('click.bs.dropdown', this.toggle)
  }

  Dropdown.prototype.toggle = function (e) {
    var $this = $(this)

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    clearMenus()

    if (!isActive) {
      if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
        // if mobile we use a backdrop because click events don't delegate
        $('<div class="dropdown-backdrop"/>').insertAfter($(this)).on('click', clearMenus)
      }

      var relatedTarget = { relatedTarget: this }
      $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget))

      if (e.isDefaultPrevented()) return

      $parent
        .toggleClass('open')
        .trigger('shown.bs.dropdown', relatedTarget)

      $this.focus()
    }

    return false
  }

  Dropdown.prototype.keydown = function (e) {
    if (!/(38|40|27)/.test(e.keyCode)) return

    var $this = $(this)

    e.preventDefault()
    e.stopPropagation()

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    if (!isActive || (isActive && e.keyCode == 27)) {
      if (e.which == 27) $parent.find(toggle).focus()
      return $this.click()
    }

    var desc = ' li:not(.divider):visible a'
    var $items = $parent.find('[role=menu]' + desc + ', [role=listbox]' + desc)

    if (!$items.length) return

    var index = $items.index($items.filter(':focus'))

    if (e.keyCode == 38 && index > 0)                 index--                        // up
    if (e.keyCode == 40 && index < $items.length - 1) index++                        // down
    if (!~index)                                      index = 0

    $items.eq(index).focus()
  }

  function clearMenus(e) {
    $(backdrop).remove()
    $(toggle).each(function () {
      var $parent = getParent($(this))
      var relatedTarget = { relatedTarget: this }
      if (!$parent.hasClass('open')) return
      $parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget))
      if (e.isDefaultPrevented()) return
      $parent.removeClass('open').trigger('hidden.bs.dropdown', relatedTarget)
    })
  }

  function getParent($this) {
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
    }

    var $parent = selector && $(selector)

    return $parent && $parent.length ? $parent : $this.parent()
  }


  // DROPDOWN PLUGIN DEFINITION
  // ==========================

  var old = $.fn.dropdown

  $.fn.dropdown = function (option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.dropdown')

      if (!data) $this.data('bs.dropdown', (data = new Dropdown(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  $.fn.dropdown.Constructor = Dropdown


  // DROPDOWN NO CONFLICT
  // ====================

  $.fn.dropdown.noConflict = function () {
    $.fn.dropdown = old
    return this
  }


  // APPLY TO STANDARD DROPDOWN ELEMENTS
  // ===================================

  $(document)
    .on('click.bs.dropdown.data-api', clearMenus)
    .on('click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
    .on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
    .on('keydown.bs.dropdown.data-api', toggle + ', [role=menu], [role=listbox]', Dropdown.prototype.keydown)

}(jQuery);


/* **********************************************
     Begin affix.js
********************************************** */

/* ========================================================================
 * Bootstrap: affix.js v3.1.0
 * http://getbootstrap.com/javascript/#affix
 * ========================================================================
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // AFFIX CLASS DEFINITION
  // ======================

  var Affix = function (element, options) {
    this.options = $.extend({}, Affix.DEFAULTS, options)
    this.$window = $(window)
      .on('scroll.bs.affix.data-api', $.proxy(this.checkPosition, this))
      .on('click.bs.affix.data-api',  $.proxy(this.checkPositionWithEventLoop, this))

    this.$element     = $(element)
    this.affixed      =
    this.unpin        =
    this.pinnedOffset = null

    this.checkPosition()
  }

  Affix.RESET = 'affix affix-top affix-bottom'

  Affix.DEFAULTS = {
    offset: 0
  }

  Affix.prototype.getPinnedOffset = function () {
    if (this.pinnedOffset) return this.pinnedOffset
    this.$element.removeClass(Affix.RESET).addClass('affix')
    var scrollTop = this.$window.scrollTop()
    var position  = this.$element.offset()
    return (this.pinnedOffset = position.top - scrollTop)
  }

  Affix.prototype.checkPositionWithEventLoop = function () {
    setTimeout($.proxy(this.checkPosition, this), 1)
  }

  Affix.prototype.checkPosition = function () {
    if (!this.$element.is(':visible')) return

    var scrollHeight = $(document).height()
    var scrollTop    = this.$window.scrollTop()
    var position     = this.$element.offset()
    var offset       = this.options.offset
    var offsetTop    = offset.top
    var offsetBottom = offset.bottom

    if (this.affixed == 'top') position.top += scrollTop

    if (typeof offset != 'object')         offsetBottom = offsetTop = offset
    if (typeof offsetTop == 'function')    offsetTop    = offset.top(this.$element)
    if (typeof offsetBottom == 'function') offsetBottom = offset.bottom(this.$element)

    var affix = this.unpin   != null && (scrollTop + this.unpin <= position.top) ? false :
                offsetBottom != null && (position.top + this.$element.height() >= scrollHeight - offsetBottom) ? 'bottom' :
                offsetTop    != null && (scrollTop <= offsetTop) ? 'top' : false

    if (this.affixed === affix) return
    if (this.unpin) this.$element.css('top', '')

    var affixType = 'affix' + (affix ? '-' + affix : '')
    var e         = $.Event(affixType + '.bs.affix')

    this.$element.trigger(e)

    if (e.isDefaultPrevented()) return

    this.affixed = affix
    this.unpin = affix == 'bottom' ? this.getPinnedOffset() : null

    this.$element
      .removeClass(Affix.RESET)
      .addClass(affixType)
      .trigger($.Event(affixType.replace('affix', 'affixed')))

    if (affix == 'bottom') {
      this.$element.offset({ top: scrollHeight - offsetBottom - this.$element.height() })
    }
  }


  // AFFIX PLUGIN DEFINITION
  // =======================

  var old = $.fn.affix

  $.fn.affix = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.affix')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.affix', (data = new Affix(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.affix.Constructor = Affix


  // AFFIX NO CONFLICT
  // =================

  $.fn.affix.noConflict = function () {
    $.fn.affix = old
    return this
  }


  // AFFIX DATA-API
  // ==============

  $(window).on('load', function () {
    $('[data-spy="affix"]').each(function () {
      var $spy = $(this)
      var data = $spy.data()

      data.offset = data.offset || {}

      if (data.offsetBottom) data.offset.bottom = data.offsetBottom
      if (data.offsetTop)    data.offset.top    = data.offsetTop

      $spy.affix(data)
    })
  })

}(jQuery);


/* **********************************************
     Begin waypoints.js
********************************************** */

// Generated by CoffeeScript 1.6.2
/*
jQuery Waypoints - v2.0.3
Copyright (c) 2011-2013 Caleb Troughton
Dual licensed under the MIT license and GPL license.
https://github.com/imakewebthings/jquery-waypoints/blob/master/licenses.txt
*/


(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  (function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      return define('waypoints', ['jquery'], function($) {
        return factory($, root);
      });
    } else {
      return factory(root.jQuery, root);
    }
  })(this, function($, window) {
    var $w, Context, Waypoint, allWaypoints, contextCounter, contextKey, contexts, isTouch, jQMethods, methods, resizeEvent, scrollEvent, waypointCounter, waypointKey, wp, wps;

    $w = $(window);
    isTouch = __indexOf.call(window, 'ontouchstart') >= 0;
    allWaypoints = {
      horizontal: {},
      vertical: {}
    };
    contextCounter = 1;
    contexts = {};
    contextKey = 'waypoints-context-id';
    resizeEvent = 'resize.waypoints';
    scrollEvent = 'scroll.waypoints';
    waypointCounter = 1;
    waypointKey = 'waypoints-waypoint-ids';
    wp = 'waypoint';
    wps = 'waypoints';
    Context = (function() {
      function Context($element) {
        var _this = this;

        this.$element = $element;
        this.element = $element[0];
        this.didResize = false;
        this.didScroll = false;
        this.id = 'context' + contextCounter++;
        this.oldScroll = {
          x: $element.scrollLeft(),
          y: $element.scrollTop()
        };
        this.waypoints = {
          horizontal: {},
          vertical: {}
        };
        $element.data(contextKey, this.id);
        contexts[this.id] = this;
        $element.bind(scrollEvent, function() {
          var scrollHandler;

          if (!(_this.didScroll || isTouch)) {
            _this.didScroll = true;
            scrollHandler = function() {
              _this.doScroll();
              return _this.didScroll = false;
            };
            return window.setTimeout(scrollHandler, $[wps].settings.scrollThrottle);
          }
        });
        $element.bind(resizeEvent, function() {
          var resizeHandler;

          if (!_this.didResize) {
            _this.didResize = true;
            resizeHandler = function() {
              $[wps]('refresh');
              return _this.didResize = false;
            };
            return window.setTimeout(resizeHandler, $[wps].settings.resizeThrottle);
          }
        });
      }

      Context.prototype.doScroll = function() {
        var axes,
          _this = this;

        axes = {
          horizontal: {
            newScroll: this.$element.scrollLeft(),
            oldScroll: this.oldScroll.x,
            forward: 'right',
            backward: 'left'
          },
          vertical: {
            newScroll: this.$element.scrollTop(),
            oldScroll: this.oldScroll.y,
            forward: 'down',
            backward: 'up'
          }
        };
        if (isTouch && (!axes.vertical.oldScroll || !axes.vertical.newScroll)) {
          $[wps]('refresh');
        }
        $.each(axes, function(aKey, axis) {
          var direction, isForward, triggered;

          triggered = [];
          isForward = axis.newScroll > axis.oldScroll;
          direction = isForward ? axis.forward : axis.backward;
          $.each(_this.waypoints[aKey], function(wKey, waypoint) {
            var _ref, _ref1;

            if ((axis.oldScroll < (_ref = waypoint.offset) && _ref <= axis.newScroll)) {
              return triggered.push(waypoint);
            } else if ((axis.newScroll < (_ref1 = waypoint.offset) && _ref1 <= axis.oldScroll)) {
              return triggered.push(waypoint);
            }
          });
          triggered.sort(function(a, b) {
            return a.offset - b.offset;
          });
          if (!isForward) {
            triggered.reverse();
          }
          return $.each(triggered, function(i, waypoint) {
            if (waypoint.options.continuous || i === triggered.length - 1) {
              return waypoint.trigger([direction]);
            }
          });
        });
        return this.oldScroll = {
          x: axes.horizontal.newScroll,
          y: axes.vertical.newScroll
        };
      };

      Context.prototype.refresh = function() {
        var axes, cOffset, isWin,
          _this = this;

        isWin = $.isWindow(this.element);
        cOffset = this.$element.offset();
        this.doScroll();
        axes = {
          horizontal: {
            contextOffset: isWin ? 0 : cOffset.left,
            contextScroll: isWin ? 0 : this.oldScroll.x,
            contextDimension: this.$element.width(),
            oldScroll: this.oldScroll.x,
            forward: 'right',
            backward: 'left',
            offsetProp: 'left'
          },
          vertical: {
            contextOffset: isWin ? 0 : cOffset.top,
            contextScroll: isWin ? 0 : this.oldScroll.y,
            contextDimension: isWin ? $[wps]('viewportHeight') : this.$element.height(),
            oldScroll: this.oldScroll.y,
            forward: 'down',
            backward: 'up',
            offsetProp: 'top'
          }
        };
        return $.each(axes, function(aKey, axis) {
          return $.each(_this.waypoints[aKey], function(i, waypoint) {
            var adjustment, elementOffset, oldOffset, _ref, _ref1;

            adjustment = waypoint.options.offset;
            oldOffset = waypoint.offset;
            elementOffset = $.isWindow(waypoint.element) ? 0 : waypoint.$element.offset()[axis.offsetProp];
            if ($.isFunction(adjustment)) {
              adjustment = adjustment.apply(waypoint.element);
            } else if (typeof adjustment === 'string') {
              adjustment = parseFloat(adjustment);
              if (waypoint.options.offset.indexOf('%') > -1) {
                adjustment = Math.ceil(axis.contextDimension * adjustment / 100);
              }
            }
            waypoint.offset = elementOffset - axis.contextOffset + axis.contextScroll - adjustment;
            if ((waypoint.options.onlyOnScroll && (oldOffset != null)) || !waypoint.enabled) {
              return;
            }
            if (oldOffset !== null && (oldOffset < (_ref = axis.oldScroll) && _ref <= waypoint.offset)) {
              return waypoint.trigger([axis.backward]);
            } else if (oldOffset !== null && (oldOffset > (_ref1 = axis.oldScroll) && _ref1 >= waypoint.offset)) {
              return waypoint.trigger([axis.forward]);
            } else if (oldOffset === null && axis.oldScroll >= waypoint.offset) {
              return waypoint.trigger([axis.forward]);
            }
          });
        });
      };

      Context.prototype.checkEmpty = function() {
        if ($.isEmptyObject(this.waypoints.horizontal) && $.isEmptyObject(this.waypoints.vertical)) {
          this.$element.unbind([resizeEvent, scrollEvent].join(' '));
          return delete contexts[this.id];
        }
      };

      return Context;

    })();
    Waypoint = (function() {
      function Waypoint($element, context, options) {
        var idList, _ref;

        options = $.extend({}, $.fn[wp].defaults, options);
        if (options.offset === 'bottom-in-view') {
          options.offset = function() {
            var contextHeight;

            contextHeight = $[wps]('viewportHeight');
            if (!$.isWindow(context.element)) {
              contextHeight = context.$element.height();
            }
            return contextHeight - $(this).outerHeight();
          };
        }
        this.$element = $element;
        this.element = $element[0];
        this.axis = options.horizontal ? 'horizontal' : 'vertical';
        this.callback = options.handler;
        this.context = context;
        this.enabled = options.enabled;
        this.id = 'waypoints' + waypointCounter++;
        this.offset = null;
        this.options = options;
        context.waypoints[this.axis][this.id] = this;
        allWaypoints[this.axis][this.id] = this;
        idList = (_ref = $element.data(waypointKey)) != null ? _ref : [];
        idList.push(this.id);
        $element.data(waypointKey, idList);
      }

      Waypoint.prototype.trigger = function(args) {
        if (!this.enabled) {
          return;
        }
        if (this.callback != null) {
          this.callback.apply(this.element, args);
        }
        if (this.options.triggerOnce) {
          return this.destroy();
        }
      };

      Waypoint.prototype.disable = function() {
        return this.enabled = false;
      };

      Waypoint.prototype.enable = function() {
        this.context.refresh();
        return this.enabled = true;
      };

      Waypoint.prototype.destroy = function() {
        delete allWaypoints[this.axis][this.id];
        delete this.context.waypoints[this.axis][this.id];
        return this.context.checkEmpty();
      };

      Waypoint.getWaypointsByElement = function(element) {
        var all, ids;

        ids = $(element).data(waypointKey);
        if (!ids) {
          return [];
        }
        all = $.extend({}, allWaypoints.horizontal, allWaypoints.vertical);
        return $.map(ids, function(id) {
          return all[id];
        });
      };

      return Waypoint;

    })();
    methods = {
      init: function(f, options) {
        var _ref;

        if (options == null) {
          options = {};
        }
        if ((_ref = options.handler) == null) {
          options.handler = f;
        }
        this.each(function() {
          var $this, context, contextElement, _ref1;

          $this = $(this);
          contextElement = (_ref1 = options.context) != null ? _ref1 : $.fn[wp].defaults.context;
          if (!$.isWindow(contextElement)) {
            contextElement = $this.closest(contextElement);
          }
          contextElement = $(contextElement);
          context = contexts[contextElement.data(contextKey)];
          if (!context) {
            context = new Context(contextElement);
          }
          return new Waypoint($this, context, options);
        });
        $[wps]('refresh');
        return this;
      },
      disable: function() {
        return methods._invoke(this, 'disable');
      },
      enable: function() {
        return methods._invoke(this, 'enable');
      },
      destroy: function() {
        return methods._invoke(this, 'destroy');
      },
      prev: function(axis, selector) {
        return methods._traverse.call(this, axis, selector, function(stack, index, waypoints) {
          if (index > 0) {
            return stack.push(waypoints[index - 1]);
          }
        });
      },
      next: function(axis, selector) {
        return methods._traverse.call(this, axis, selector, function(stack, index, waypoints) {
          if (index < waypoints.length - 1) {
            return stack.push(waypoints[index + 1]);
          }
        });
      },
      _traverse: function(axis, selector, push) {
        var stack, waypoints;

        if (axis == null) {
          axis = 'vertical';
        }
        if (selector == null) {
          selector = window;
        }
        waypoints = jQMethods.aggregate(selector);
        stack = [];
        this.each(function() {
          var index;

          index = $.inArray(this, waypoints[axis]);
          return push(stack, index, waypoints[axis]);
        });
        return this.pushStack(stack);
      },
      _invoke: function($elements, method) {
        $elements.each(function() {
          var waypoints;

          waypoints = Waypoint.getWaypointsByElement(this);
          return $.each(waypoints, function(i, waypoint) {
            waypoint[method]();
            return true;
          });
        });
        return this;
      }
    };
    $.fn[wp] = function() {
      var args, method;

      method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (methods[method]) {
        return methods[method].apply(this, args);
      } else if ($.isFunction(method)) {
        return methods.init.apply(this, arguments);
      } else if ($.isPlainObject(method)) {
        return methods.init.apply(this, [null, method]);
      } else if (!method) {
        return $.error("jQuery Waypoints needs a callback function or handler option.");
      } else {
        return $.error("The " + method + " method does not exist in jQuery Waypoints.");
      }
    };
    $.fn[wp].defaults = {
      context: window,
      continuous: true,
      enabled: true,
      horizontal: false,
      offset: 0,
      triggerOnce: false
    };
    jQMethods = {
      refresh: function() {
        return $.each(contexts, function(i, context) {
          return context.refresh();
        });
      },
      viewportHeight: function() {
        var _ref;

        return (_ref = window.innerHeight) != null ? _ref : $w.height();
      },
      aggregate: function(contextSelector) {
        var collection, waypoints, _ref;

        collection = allWaypoints;
        if (contextSelector) {
          collection = (_ref = contexts[$(contextSelector).data(contextKey)]) != null ? _ref.waypoints : void 0;
        }
        if (!collection) {
          return [];
        }
        waypoints = {
          horizontal: [],
          vertical: []
        };
        $.each(waypoints, function(axis, arr) {
          $.each(collection[axis], function(key, waypoint) {
            return arr.push(waypoint);
          });
          arr.sort(function(a, b) {
            return a.offset - b.offset;
          });
          waypoints[axis] = $.map(arr, function(waypoint) {
            return waypoint.element;
          });
          return waypoints[axis] = $.unique(waypoints[axis]);
        });
        return waypoints;
      },
      above: function(contextSelector) {
        if (contextSelector == null) {
          contextSelector = window;
        }
        return jQMethods._filter(contextSelector, 'vertical', function(context, waypoint) {
          return waypoint.offset <= context.oldScroll.y;
        });
      },
      below: function(contextSelector) {
        if (contextSelector == null) {
          contextSelector = window;
        }
        return jQMethods._filter(contextSelector, 'vertical', function(context, waypoint) {
          return waypoint.offset > context.oldScroll.y;
        });
      },
      left: function(contextSelector) {
        if (contextSelector == null) {
          contextSelector = window;
        }
        return jQMethods._filter(contextSelector, 'horizontal', function(context, waypoint) {
          return waypoint.offset <= context.oldScroll.x;
        });
      },
      right: function(contextSelector) {
        if (contextSelector == null) {
          contextSelector = window;
        }
        return jQMethods._filter(contextSelector, 'horizontal', function(context, waypoint) {
          return waypoint.offset > context.oldScroll.x;
        });
      },
      enable: function() {
        return jQMethods._invoke('enable');
      },
      disable: function() {
        return jQMethods._invoke('disable');
      },
      destroy: function() {
        return jQMethods._invoke('destroy');
      },
      extendFn: function(methodName, f) {
        return methods[methodName] = f;
      },
      _invoke: function(method) {
        var waypoints;

        waypoints = $.extend({}, allWaypoints.vertical, allWaypoints.horizontal);
        return $.each(waypoints, function(key, waypoint) {
          waypoint[method]();
          return true;
        });
      },
      _filter: function(selector, axis, test) {
        var context, waypoints;

        context = contexts[$(selector).data(contextKey)];
        if (!context) {
          return [];
        }
        waypoints = [];
        $.each(context.waypoints[axis], function(i, waypoint) {
          if (test(context, waypoint)) {
            return waypoints.push(waypoint);
          }
        });
        waypoints.sort(function(a, b) {
          return a.offset - b.offset;
        });
        return $.map(waypoints, function(waypoint) {
          return waypoint.element;
        });
      }
    };
    $[wps] = function() {
      var args, method;

      method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (jQMethods[method]) {
        return jQMethods[method].apply(null, args);
      } else {
        return jQMethods.aggregate.call(null, method);
      }
    };
    $[wps].settings = {
      resizeThrottle: 100,
      scrollThrottle: 30
    };
    return $w.load(function() {
      return $[wps]('refresh');
    });
  });

}).call(this);


/* **********************************************
     Begin waypoints.js
********************************************** */

// Generated by CoffeeScript 1.6.2
/*
jQuery Waypoints - v2.0.3
Copyright (c) 2011-2013 Caleb Troughton
Dual licensed under the MIT license and GPL license.
https://github.com/imakewebthings/jquery-waypoints/blob/master/licenses.txt
*/


(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  (function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      return define('waypoints', ['jquery'], function($) {
        return factory($, root);
      });
    } else {
      return factory(root.jQuery, root);
    }
  })(this, function($, window) {
    var $w, Context, Waypoint, allWaypoints, contextCounter, contextKey, contexts, isTouch, jQMethods, methods, resizeEvent, scrollEvent, waypointCounter, waypointKey, wp, wps;

    $w = $(window);
    isTouch = __indexOf.call(window, 'ontouchstart') >= 0;
    allWaypoints = {
      horizontal: {},
      vertical: {}
    };
    contextCounter = 1;
    contexts = {};
    contextKey = 'waypoints-context-id';
    resizeEvent = 'resize.waypoints';
    scrollEvent = 'scroll.waypoints';
    waypointCounter = 1;
    waypointKey = 'waypoints-waypoint-ids';
    wp = 'waypoint';
    wps = 'waypoints';
    Context = (function() {
      function Context($element) {
        var _this = this;

        this.$element = $element;
        this.element = $element[0];
        this.didResize = false;
        this.didScroll = false;
        this.id = 'context' + contextCounter++;
        this.oldScroll = {
          x: $element.scrollLeft(),
          y: $element.scrollTop()
        };
        this.waypoints = {
          horizontal: {},
          vertical: {}
        };
        $element.data(contextKey, this.id);
        contexts[this.id] = this;
        $element.bind(scrollEvent, function() {
          var scrollHandler;

          if (!(_this.didScroll || isTouch)) {
            _this.didScroll = true;
            scrollHandler = function() {
              _this.doScroll();
              return _this.didScroll = false;
            };
            return window.setTimeout(scrollHandler, $[wps].settings.scrollThrottle);
          }
        });
        $element.bind(resizeEvent, function() {
          var resizeHandler;

          if (!_this.didResize) {
            _this.didResize = true;
            resizeHandler = function() {
              $[wps]('refresh');
              return _this.didResize = false;
            };
            return window.setTimeout(resizeHandler, $[wps].settings.resizeThrottle);
          }
        });
      }

      Context.prototype.doScroll = function() {
        var axes,
          _this = this;

        axes = {
          horizontal: {
            newScroll: this.$element.scrollLeft(),
            oldScroll: this.oldScroll.x,
            forward: 'right',
            backward: 'left'
          },
          vertical: {
            newScroll: this.$element.scrollTop(),
            oldScroll: this.oldScroll.y,
            forward: 'down',
            backward: 'up'
          }
        };
        if (isTouch && (!axes.vertical.oldScroll || !axes.vertical.newScroll)) {
          $[wps]('refresh');
        }
        $.each(axes, function(aKey, axis) {
          var direction, isForward, triggered;

          triggered = [];
          isForward = axis.newScroll > axis.oldScroll;
          direction = isForward ? axis.forward : axis.backward;
          $.each(_this.waypoints[aKey], function(wKey, waypoint) {
            var _ref, _ref1;

            if ((axis.oldScroll < (_ref = waypoint.offset) && _ref <= axis.newScroll)) {
              return triggered.push(waypoint);
            } else if ((axis.newScroll < (_ref1 = waypoint.offset) && _ref1 <= axis.oldScroll)) {
              return triggered.push(waypoint);
            }
          });
          triggered.sort(function(a, b) {
            return a.offset - b.offset;
          });
          if (!isForward) {
            triggered.reverse();
          }
          return $.each(triggered, function(i, waypoint) {
            if (waypoint.options.continuous || i === triggered.length - 1) {
              return waypoint.trigger([direction]);
            }
          });
        });
        return this.oldScroll = {
          x: axes.horizontal.newScroll,
          y: axes.vertical.newScroll
        };
      };

      Context.prototype.refresh = function() {
        var axes, cOffset, isWin,
          _this = this;

        isWin = $.isWindow(this.element);
        cOffset = this.$element.offset();
        this.doScroll();
        axes = {
          horizontal: {
            contextOffset: isWin ? 0 : cOffset.left,
            contextScroll: isWin ? 0 : this.oldScroll.x,
            contextDimension: this.$element.width(),
            oldScroll: this.oldScroll.x,
            forward: 'right',
            backward: 'left',
            offsetProp: 'left'
          },
          vertical: {
            contextOffset: isWin ? 0 : cOffset.top,
            contextScroll: isWin ? 0 : this.oldScroll.y,
            contextDimension: isWin ? $[wps]('viewportHeight') : this.$element.height(),
            oldScroll: this.oldScroll.y,
            forward: 'down',
            backward: 'up',
            offsetProp: 'top'
          }
        };
        return $.each(axes, function(aKey, axis) {
          return $.each(_this.waypoints[aKey], function(i, waypoint) {
            var adjustment, elementOffset, oldOffset, _ref, _ref1;

            adjustment = waypoint.options.offset;
            oldOffset = waypoint.offset;
            elementOffset = $.isWindow(waypoint.element) ? 0 : waypoint.$element.offset()[axis.offsetProp];
            if ($.isFunction(adjustment)) {
              adjustment = adjustment.apply(waypoint.element);
            } else if (typeof adjustment === 'string') {
              adjustment = parseFloat(adjustment);
              if (waypoint.options.offset.indexOf('%') > -1) {
                adjustment = Math.ceil(axis.contextDimension * adjustment / 100);
              }
            }
            waypoint.offset = elementOffset - axis.contextOffset + axis.contextScroll - adjustment;
            if ((waypoint.options.onlyOnScroll && (oldOffset != null)) || !waypoint.enabled) {
              return;
            }
            if (oldOffset !== null && (oldOffset < (_ref = axis.oldScroll) && _ref <= waypoint.offset)) {
              return waypoint.trigger([axis.backward]);
            } else if (oldOffset !== null && (oldOffset > (_ref1 = axis.oldScroll) && _ref1 >= waypoint.offset)) {
              return waypoint.trigger([axis.forward]);
            } else if (oldOffset === null && axis.oldScroll >= waypoint.offset) {
              return waypoint.trigger([axis.forward]);
            }
          });
        });
      };

      Context.prototype.checkEmpty = function() {
        if ($.isEmptyObject(this.waypoints.horizontal) && $.isEmptyObject(this.waypoints.vertical)) {
          this.$element.unbind([resizeEvent, scrollEvent].join(' '));
          return delete contexts[this.id];
        }
      };

      return Context;

    })();
    Waypoint = (function() {
      function Waypoint($element, context, options) {
        var idList, _ref;

        options = $.extend({}, $.fn[wp].defaults, options);
        if (options.offset === 'bottom-in-view') {
          options.offset = function() {
            var contextHeight;

            contextHeight = $[wps]('viewportHeight');
            if (!$.isWindow(context.element)) {
              contextHeight = context.$element.height();
            }
            return contextHeight - $(this).outerHeight();
          };
        }
        this.$element = $element;
        this.element = $element[0];
        this.axis = options.horizontal ? 'horizontal' : 'vertical';
        this.callback = options.handler;
        this.context = context;
        this.enabled = options.enabled;
        this.id = 'waypoints' + waypointCounter++;
        this.offset = null;
        this.options = options;
        context.waypoints[this.axis][this.id] = this;
        allWaypoints[this.axis][this.id] = this;
        idList = (_ref = $element.data(waypointKey)) != null ? _ref : [];
        idList.push(this.id);
        $element.data(waypointKey, idList);
      }

      Waypoint.prototype.trigger = function(args) {
        if (!this.enabled) {
          return;
        }
        if (this.callback != null) {
          this.callback.apply(this.element, args);
        }
        if (this.options.triggerOnce) {
          return this.destroy();
        }
      };

      Waypoint.prototype.disable = function() {
        return this.enabled = false;
      };

      Waypoint.prototype.enable = function() {
        this.context.refresh();
        return this.enabled = true;
      };

      Waypoint.prototype.destroy = function() {
        delete allWaypoints[this.axis][this.id];
        delete this.context.waypoints[this.axis][this.id];
        return this.context.checkEmpty();
      };

      Waypoint.getWaypointsByElement = function(element) {
        var all, ids;

        ids = $(element).data(waypointKey);
        if (!ids) {
          return [];
        }
        all = $.extend({}, allWaypoints.horizontal, allWaypoints.vertical);
        return $.map(ids, function(id) {
          return all[id];
        });
      };

      return Waypoint;

    })();
    methods = {
      init: function(f, options) {
        var _ref;

        if (options == null) {
          options = {};
        }
        if ((_ref = options.handler) == null) {
          options.handler = f;
        }
        this.each(function() {
          var $this, context, contextElement, _ref1;

          $this = $(this);
          contextElement = (_ref1 = options.context) != null ? _ref1 : $.fn[wp].defaults.context;
          if (!$.isWindow(contextElement)) {
            contextElement = $this.closest(contextElement);
          }
          contextElement = $(contextElement);
          context = contexts[contextElement.data(contextKey)];
          if (!context) {
            context = new Context(contextElement);
          }
          return new Waypoint($this, context, options);
        });
        $[wps]('refresh');
        return this;
      },
      disable: function() {
        return methods._invoke(this, 'disable');
      },
      enable: function() {
        return methods._invoke(this, 'enable');
      },
      destroy: function() {
        return methods._invoke(this, 'destroy');
      },
      prev: function(axis, selector) {
        return methods._traverse.call(this, axis, selector, function(stack, index, waypoints) {
          if (index > 0) {
            return stack.push(waypoints[index - 1]);
          }
        });
      },
      next: function(axis, selector) {
        return methods._traverse.call(this, axis, selector, function(stack, index, waypoints) {
          if (index < waypoints.length - 1) {
            return stack.push(waypoints[index + 1]);
          }
        });
      },
      _traverse: function(axis, selector, push) {
        var stack, waypoints;

        if (axis == null) {
          axis = 'vertical';
        }
        if (selector == null) {
          selector = window;
        }
        waypoints = jQMethods.aggregate(selector);
        stack = [];
        this.each(function() {
          var index;

          index = $.inArray(this, waypoints[axis]);
          return push(stack, index, waypoints[axis]);
        });
        return this.pushStack(stack);
      },
      _invoke: function($elements, method) {
        $elements.each(function() {
          var waypoints;

          waypoints = Waypoint.getWaypointsByElement(this);
          return $.each(waypoints, function(i, waypoint) {
            waypoint[method]();
            return true;
          });
        });
        return this;
      }
    };
    $.fn[wp] = function() {
      var args, method;

      method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (methods[method]) {
        return methods[method].apply(this, args);
      } else if ($.isFunction(method)) {
        return methods.init.apply(this, arguments);
      } else if ($.isPlainObject(method)) {
        return methods.init.apply(this, [null, method]);
      } else if (!method) {
        return $.error("jQuery Waypoints needs a callback function or handler option.");
      } else {
        return $.error("The " + method + " method does not exist in jQuery Waypoints.");
      }
    };
    $.fn[wp].defaults = {
      context: window,
      continuous: true,
      enabled: true,
      horizontal: false,
      offset: 0,
      triggerOnce: false
    };
    jQMethods = {
      refresh: function() {
        return $.each(contexts, function(i, context) {
          return context.refresh();
        });
      },
      viewportHeight: function() {
        var _ref;

        return (_ref = window.innerHeight) != null ? _ref : $w.height();
      },
      aggregate: function(contextSelector) {
        var collection, waypoints, _ref;

        collection = allWaypoints;
        if (contextSelector) {
          collection = (_ref = contexts[$(contextSelector).data(contextKey)]) != null ? _ref.waypoints : void 0;
        }
        if (!collection) {
          return [];
        }
        waypoints = {
          horizontal: [],
          vertical: []
        };
        $.each(waypoints, function(axis, arr) {
          $.each(collection[axis], function(key, waypoint) {
            return arr.push(waypoint);
          });
          arr.sort(function(a, b) {
            return a.offset - b.offset;
          });
          waypoints[axis] = $.map(arr, function(waypoint) {
            return waypoint.element;
          });
          return waypoints[axis] = $.unique(waypoints[axis]);
        });
        return waypoints;
      },
      above: function(contextSelector) {
        if (contextSelector == null) {
          contextSelector = window;
        }
        return jQMethods._filter(contextSelector, 'vertical', function(context, waypoint) {
          return waypoint.offset <= context.oldScroll.y;
        });
      },
      below: function(contextSelector) {
        if (contextSelector == null) {
          contextSelector = window;
        }
        return jQMethods._filter(contextSelector, 'vertical', function(context, waypoint) {
          return waypoint.offset > context.oldScroll.y;
        });
      },
      left: function(contextSelector) {
        if (contextSelector == null) {
          contextSelector = window;
        }
        return jQMethods._filter(contextSelector, 'horizontal', function(context, waypoint) {
          return waypoint.offset <= context.oldScroll.x;
        });
      },
      right: function(contextSelector) {
        if (contextSelector == null) {
          contextSelector = window;
        }
        return jQMethods._filter(contextSelector, 'horizontal', function(context, waypoint) {
          return waypoint.offset > context.oldScroll.x;
        });
      },
      enable: function() {
        return jQMethods._invoke('enable');
      },
      disable: function() {
        return jQMethods._invoke('disable');
      },
      destroy: function() {
        return jQMethods._invoke('destroy');
      },
      extendFn: function(methodName, f) {
        return methods[methodName] = f;
      },
      _invoke: function(method) {
        var waypoints;

        waypoints = $.extend({}, allWaypoints.vertical, allWaypoints.horizontal);
        return $.each(waypoints, function(key, waypoint) {
          waypoint[method]();
          return true;
        });
      },
      _filter: function(selector, axis, test) {
        var context, waypoints;

        context = contexts[$(selector).data(contextKey)];
        if (!context) {
          return [];
        }
        waypoints = [];
        $.each(context.waypoints[axis], function(i, waypoint) {
          if (test(context, waypoint)) {
            return waypoints.push(waypoint);
          }
        });
        waypoints.sort(function(a, b) {
          return a.offset - b.offset;
        });
        return $.map(waypoints, function(waypoint) {
          return waypoint.element;
        });
      }
    };
    $[wps] = function() {
      var args, method;

      method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (jQMethods[method]) {
        return jQMethods[method].apply(null, args);
      } else {
        return jQMethods.aggregate.call(null, method);
      }
    };
    $[wps].settings = {
      resizeThrottle: 100,
      scrollThrottle: 30
    };
    return $w.load(function() {
      return $[wps]('refresh');
    });
  });

}).call(this);


/* **********************************************
     Begin waypoints-sticky.js
********************************************** */

// Generated by CoffeeScript 1.6.2
/*
Sticky Elements Shortcut for jQuery Waypoints - v2.0.3
Copyright (c) 2011-2013 Caleb Troughton
Dual licensed under the MIT license and GPL license.
https://github.com/imakewebthings/jquery-waypoints/blob/master/licenses.txt
*/


(function() {
  (function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      return define(['jquery', 'waypoints'], factory);
    } else {
      return factory(root.jQuery);
    }
  })(this, function($) {
    var defaults, wrap;

    defaults = {
      wrapper: '<div class="sticky-wrapper" />',
      stuckClass: 'stuck'
    };
    wrap = function($elements, options) {
      $elements.wrap(options.wrapper);
      return $elements.parent();
    };
    $.waypoints('extendFn', 'sticky', function(opt) {
      var $wrap, options, originalHandler;

      options = $.extend({}, $.fn.waypoint.defaults, defaults, opt);
      $wrap = wrap(this, options);
      originalHandler = options.handler;
      options.handler = function(direction) {
        var $sticky, shouldBeStuck;

        $sticky = $(this).children(':first');
        shouldBeStuck = direction === 'down' || direction === 'right';
        $sticky.toggleClass(options.stuckClass, shouldBeStuck);
        $wrap.height(shouldBeStuck ? $sticky.outerHeight() : '');
        if (originalHandler != null) {
          return originalHandler.call(this, direction);
        }
      };
      $wrap.waypoint(options);
      return this.data('stuckClass', options.stuckClass);
    });
    return $.waypoints('extendFn', 'unsticky', function() {
      this.parent().waypoint('destroy');
      this.unwrap();
      return this.removeClass(this.data('stuckClass'));
    });
  });

}).call(this);


/* **********************************************
     Begin waypoints-sticky.js
********************************************** */

// Generated by CoffeeScript 1.6.2
/*
Sticky Elements Shortcut for jQuery Waypoints - v2.0.3
Copyright (c) 2011-2013 Caleb Troughton
Dual licensed under the MIT license and GPL license.
https://github.com/imakewebthings/jquery-waypoints/blob/master/licenses.txt
*/


(function() {
  (function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      return define(['jquery', 'waypoints'], factory);
    } else {
      return factory(root.jQuery);
    }
  })(this, function($) {
    var defaults, wrap;

    defaults = {
      wrapper: '<div class="sticky-wrapper" />',
      stuckClass: 'stuck'
    };
    wrap = function($elements, options) {
      $elements.wrap(options.wrapper);
      return $elements.parent();
    };
    $.waypoints('extendFn', 'sticky', function(opt) {
      var $wrap, options, originalHandler;

      options = $.extend({}, $.fn.waypoint.defaults, defaults, opt);
      $wrap = wrap(this, options);
      originalHandler = options.handler;
      options.handler = function(direction) {
        var $sticky, shouldBeStuck;

        $sticky = $(this).children(':first');
        shouldBeStuck = direction === 'down' || direction === 'right';
        $sticky.toggleClass(options.stuckClass, shouldBeStuck);
        $wrap.height(shouldBeStuck ? $sticky.outerHeight() : '');
        if (originalHandler != null) {
          return originalHandler.call(this, direction);
        }
      };
      $wrap.waypoint(options);
      return this.data('stuckClass', options.stuckClass);
    });
    return $.waypoints('extendFn', 'unsticky', function() {
      this.parent().waypoint('destroy');
      this.unwrap();
      return this.removeClass(this.data('stuckClass'));
    });
  });

}).call(this);


/* **********************************************
     Begin china.js
********************************************** */

var china = [{"Year":1985,"type":"rural","value":814900,"color":"#16a085"},
{"Year":1986,"type":"rural","value":820396,"color":"#16a085"},
{"Year":1987,"type":"rural","value":825892,"color":"#16a085"},
{"Year":1988,"type":"rural","value":831387,"color":"#16a085"},
{"Year":1989,"type":"rural","value":836883,"color":"#16a085"},
{"Year":1990,"type":"rural","value":842379,"color":"#16a085"},
{"Year":1991,"type":"rural","value":841527,"color":"#16a085"},
{"Year":1992,"type":"rural","value":840675,"color":"#16a085"},
{"Year":1993,"type":"rural","value":839824,"color":"#16a085"},
{"Year":1994,"type":"rural","value":838972,"color":"#16a085"},
{"Year":1995,"type":"rural","value":838120,"color":"#16a085"},
{"Year":1996,"type":"rural","value":833254,"color":"#16a085"},
{"Year":1997,"type":"rural","value":828389,"color":"#16a085"},
{"Year":1998,"type":"rural","value":823523,"color":"#16a085"},
{"Year":1999,"type":"rural","value":818658,"color":"#16a085"},
{"Year":2000,"type":"rural","value":813792,"color":"#16a085"},
{"Year":2001,"type":"rural","value":801349,"color":"#16a085"},
{"Year":2002,"type":"rural","value":788906,"color":"#16a085"},
{"Year":2003,"type":"rural","value":776462,"color":"#16a085"},
{"Year":2004,"type":"rural","value":764019,"color":"#16a085"},
{"Year":2005,"type":"rural","value":751576,"color":"#16a085"},
{"Year":2006,"type":"rural","value":737471,"color":"#16a085"},
{"Year":2007,"type":"rural","value":723365,"color":"#16a085"},
{"Year":2008,"type":"rural","value":709260,"color":"#16a085"},
{"Year":2009,"type":"rural","value":695154,"color":"#16a085"},
{"Year":2010,"type":"rural","value":681049,"color":"#16a085"},
{"Year":1985,"type":"urban","value":241679,"color":"#9b59b6"},
{"Year":1986,"type":"urban","value":253907,"color":"#9b59b6"},
{"Year":1987,"type":"urban","value":266134,"color":"#9b59b6"},
{"Year":1988,"type":"urban","value":278362,"color":"#9b59b6"},
{"Year":1989,"type":"urban","value":290589,"color":"#9b59b6"},
{"Year":1990,"type":"urban","value":302817,"color":"#9b59b6"},
{"Year":1991,"type":"urban","value":317427,"color":"#9b59b6"},
{"Year":1992,"type":"urban","value":332037,"color":"#9b59b6"},
{"Year":1993,"type":"urban","value":346646,"color":"#9b59b6"},
{"Year":1994,"type":"urban","value":361256,"color":"#9b59b6"},
{"Year":1995,"type":"urban","value":375866,"color":"#9b59b6"},
{"Year":1996,"type":"urban","value":391758,"color":"#9b59b6"},
{"Year":1997,"type":"urban","value":407650,"color":"#9b59b6"},
{"Year":1998,"type":"urban","value":423541,"color":"#9b59b6"},
{"Year":1999,"type":"urban","value":439433,"color":"#9b59b6"},
{"Year":2000,"type":"urban","value":455325,"color":"#9b59b6"},
{"Year":2001,"type":"urban","value":475463,"color":"#9b59b6"},
{"Year":2002,"type":"urban","value":495602,"color":"#9b59b6"},
{"Year":2003,"type":"urban","value":515740,"color":"#9b59b6"},
{"Year":2004,"type":"urban","value":535879,"color":"#9b59b6"},
{"Year":2005,"type":"urban","value":556017,"color":"#9b59b6"},
{"Year":2006,"type":"urban","value":576871,"color":"#9b59b6"},
{"Year":2007,"type":"urban","value":597725,"color":"#9b59b6"},
{"Year":2008,"type":"urban","value":618578,"color":"#9b59b6"},
{"Year":2009,"type":"urban","value":639432,"color":"#9b59b6"},
{"Year":2010,"type":"urban","value":660286,"color":"#9b59b6"}]

/* **********************************************
     Begin india.js
********************************************** */

var india = [{"Year":1985,"type":"rural","color":"#16a085","value":593481},
{"Year":1986,"type":"rural","color":"#16a085","value":604896},
{"Year":1987,"type":"rural","color":"#16a085","value":616311},
{"Year":1988,"type":"rural","color":"#16a085","value":627726},
{"Year":1989,"type":"rural","color":"#16a085","value":639141},
{"Year":1990,"type":"rural","color":"#16a085","value":650556},
{"Year":1991,"type":"rural","color":"#16a085","value":662017},
{"Year":1992,"type":"rural","color":"#16a085","value":673478},
{"Year":1993,"type":"rural","color":"#16a085","value":684940},
{"Year":1994,"type":"rural","color":"#16a085","value":696401},
{"Year":1995,"type":"rural","color":"#16a085","value":707862},
{"Year":1996,"type":"rural","color":"#16a085","value":718752},
{"Year":1997,"type":"rural","color":"#16a085","value":729642},
{"Year":1998,"type":"rural","color":"#16a085","value":740533},
{"Year":1999,"type":"rural","color":"#16a085","value":751423},
{"Year":2000,"type":"rural","color":"#16a085","value":762313},
{"Year":2001,"type":"rural","color":"#16a085","value":771201},
{"Year":2002,"type":"rural","color":"#16a085","value":780090},
{"Year":2003,"type":"rural","color":"#16a085","value":788978},
{"Year":2004,"type":"rural","color":"#16a085","value":797867},
{"Year":2005,"type":"rural","color":"#16a085","value":806755},
{"Year":2006,"type":"rural","color":"#16a085","value":814572},
{"Year":2007,"type":"rural","color":"#16a085","value":822389},
{"Year":2008,"type":"rural","color":"#16a085","value":830205},
{"Year":2009,"type":"rural","color":"#16a085","value":838022},
{"Year":2010,"type":"rural","color":"#16a085","value":845839},
{"Year":1985,"type":"urban","color":"#9b59b6","value":191009},
{"Year":1986,"type":"urban","color":"#9b59b6","value":197453},
{"Year":1987,"type":"urban","color":"#9b59b6","value":203897},
{"Year":1988,"type":"urban","color":"#9b59b6","value":210342},
{"Year":1989,"type":"urban","color":"#9b59b6","value":216786},
{"Year":1990,"type":"urban","color":"#9b59b6","value":223230},
{"Year":1991,"type":"urban","color":"#9b59b6","value":229909},
{"Year":1992,"type":"urban","color":"#9b59b6","value":236588},
{"Year":1993,"type":"urban","color":"#9b59b6","value":243266},
{"Year":1994,"type":"urban","color":"#9b59b6","value":249945},
{"Year":1995,"type":"urban","color":"#9b59b6","value":256624},
{"Year":1996,"type":"urban","color":"#9b59b6","value":263616},
{"Year":1997,"type":"urban","color":"#9b59b6","value":270608},
{"Year":1998,"type":"urban","color":"#9b59b6","value":277601},
{"Year":1999,"type":"urban","color":"#9b59b6","value":284593},
{"Year":2000,"type":"urban","color":"#9b59b6","value":291585},
{"Year":2001,"type":"urban","color":"#9b59b6","value":299926},
{"Year":2002,"type":"urban","color":"#9b59b6","value":308266},
{"Year":2003,"type":"urban","color":"#9b59b6","value":316607},
{"Year":2004,"type":"urban","color":"#9b59b6","value":324947},
{"Year":2005,"type":"urban","color":"#9b59b6","value":333288},
{"Year":2006,"type":"urban","color":"#9b59b6","value":342385},
{"Year":2007,"type":"urban","color":"#9b59b6","value":351483},
{"Year":2008,"type":"urban","color":"#9b59b6","value":360580},
{"Year":2009,"type":"urban","color":"#9b59b6","value":369678},
{"Year":2010,"type":"urban","color":"#9b59b6","value":378775}]

/* **********************************************
     Begin d3.js
********************************************** */

!function() {
  var d3 = {
    version: "3.4.6"
  };
  if (!Date.now) Date.now = function() {
    return +new Date();
  };
  var d3_arraySlice = [].slice, d3_array = function(list) {
    return d3_arraySlice.call(list);
  };
  var d3_document = document, d3_documentElement = d3_document.documentElement, d3_window = window;
  try {
    d3_array(d3_documentElement.childNodes)[0].nodeType;
  } catch (e) {
    d3_array = function(list) {
      var i = list.length, array = new Array(i);
      while (i--) array[i] = list[i];
      return array;
    };
  }
  try {
    d3_document.createElement("div").style.setProperty("opacity", 0, "");
  } catch (error) {
    var d3_element_prototype = d3_window.Element.prototype, d3_element_setAttribute = d3_element_prototype.setAttribute, d3_element_setAttributeNS = d3_element_prototype.setAttributeNS, d3_style_prototype = d3_window.CSSStyleDeclaration.prototype, d3_style_setProperty = d3_style_prototype.setProperty;
    d3_element_prototype.setAttribute = function(name, value) {
      d3_element_setAttribute.call(this, name, value + "");
    };
    d3_element_prototype.setAttributeNS = function(space, local, value) {
      d3_element_setAttributeNS.call(this, space, local, value + "");
    };
    d3_style_prototype.setProperty = function(name, value, priority) {
      d3_style_setProperty.call(this, name, value + "", priority);
    };
  }
  d3.ascending = d3_ascending;
  function d3_ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }
  d3.descending = function(a, b) {
    return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
  };
  d3.min = function(array, f) {
    var i = -1, n = array.length, a, b;
    if (arguments.length === 1) {
      while (++i < n && !((a = array[i]) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = array[i]) != null && a > b) a = b;
    } else {
      while (++i < n && !((a = f.call(array, array[i], i)) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && a > b) a = b;
    }
    return a;
  };
  d3.max = function(array, f) {
    var i = -1, n = array.length, a, b;
    if (arguments.length === 1) {
      while (++i < n && !((a = array[i]) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = array[i]) != null && b > a) a = b;
    } else {
      while (++i < n && !((a = f.call(array, array[i], i)) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && b > a) a = b;
    }
    return a;
  };
  d3.extent = function(array, f) {
    var i = -1, n = array.length, a, b, c;
    if (arguments.length === 1) {
      while (++i < n && !((a = c = array[i]) != null && a <= a)) a = c = undefined;
      while (++i < n) if ((b = array[i]) != null) {
        if (a > b) a = b;
        if (c < b) c = b;
      }
    } else {
      while (++i < n && !((a = c = f.call(array, array[i], i)) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = f.call(array, array[i], i)) != null) {
        if (a > b) a = b;
        if (c < b) c = b;
      }
    }
    return [ a, c ];
  };
  d3.sum = function(array, f) {
    var s = 0, n = array.length, a, i = -1;
    if (arguments.length === 1) {
      while (++i < n) if (!isNaN(a = +array[i])) s += a;
    } else {
      while (++i < n) if (!isNaN(a = +f.call(array, array[i], i))) s += a;
    }
    return s;
  };
  function d3_number(x) {
    return x != null && !isNaN(x);
  }
  d3.mean = function(array, f) {
    var s = 0, n = array.length, a, i = -1, j = n;
    if (arguments.length === 1) {
      while (++i < n) if (d3_number(a = array[i])) s += a; else --j;
    } else {
      while (++i < n) if (d3_number(a = f.call(array, array[i], i))) s += a; else --j;
    }
    return j ? s / j : undefined;
  };
  d3.quantile = function(values, p) {
    var H = (values.length - 1) * p + 1, h = Math.floor(H), v = +values[h - 1], e = H - h;
    return e ? v + e * (values[h] - v) : v;
  };
  d3.median = function(array, f) {
    if (arguments.length > 1) array = array.map(f);
    array = array.filter(d3_number);
    return array.length ? d3.quantile(array.sort(d3_ascending), .5) : undefined;
  };
  function d3_bisector(compare) {
    return {
      left: function(a, x, lo, hi) {
        if (arguments.length < 3) lo = 0;
        if (arguments.length < 4) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) < 0) lo = mid + 1; else hi = mid;
        }
        return lo;
      },
      right: function(a, x, lo, hi) {
        if (arguments.length < 3) lo = 0;
        if (arguments.length < 4) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) > 0) hi = mid; else lo = mid + 1;
        }
        return lo;
      }
    };
  }
  var d3_bisect = d3_bisector(d3_ascending);
  d3.bisectLeft = d3_bisect.left;
  d3.bisect = d3.bisectRight = d3_bisect.right;
  d3.bisector = function(f) {
    return d3_bisector(f.length === 1 ? function(d, x) {
      return d3_ascending(f(d), x);
    } : f);
  };
  d3.shuffle = function(array) {
    var m = array.length, t, i;
    while (m) {
      i = Math.random() * m-- | 0;
      t = array[m], array[m] = array[i], array[i] = t;
    }
    return array;
  };
  d3.permute = function(array, indexes) {
    var i = indexes.length, permutes = new Array(i);
    while (i--) permutes[i] = array[indexes[i]];
    return permutes;
  };
  d3.pairs = function(array) {
    var i = 0, n = array.length - 1, p0, p1 = array[0], pairs = new Array(n < 0 ? 0 : n);
    while (i < n) pairs[i] = [ p0 = p1, p1 = array[++i] ];
    return pairs;
  };
  d3.zip = function() {
    if (!(n = arguments.length)) return [];
    for (var i = -1, m = d3.min(arguments, d3_zipLength), zips = new Array(m); ++i < m; ) {
      for (var j = -1, n, zip = zips[i] = new Array(n); ++j < n; ) {
        zip[j] = arguments[j][i];
      }
    }
    return zips;
  };
  function d3_zipLength(d) {
    return d.length;
  }
  d3.transpose = function(matrix) {
    return d3.zip.apply(d3, matrix);
  };
  d3.keys = function(map) {
    var keys = [];
    for (var key in map) keys.push(key);
    return keys;
  };
  d3.values = function(map) {
    var values = [];
    for (var key in map) values.push(map[key]);
    return values;
  };
  d3.entries = function(map) {
    var entries = [];
    for (var key in map) entries.push({
      key: key,
      value: map[key]
    });
    return entries;
  };
  d3.merge = function(arrays) {
    var n = arrays.length, m, i = -1, j = 0, merged, array;
    while (++i < n) j += arrays[i].length;
    merged = new Array(j);
    while (--n >= 0) {
      array = arrays[n];
      m = array.length;
      while (--m >= 0) {
        merged[--j] = array[m];
      }
    }
    return merged;
  };
  var abs = Math.abs;
  d3.range = function(start, stop, step) {
    if (arguments.length < 3) {
      step = 1;
      if (arguments.length < 2) {
        stop = start;
        start = 0;
      }
    }
    if ((stop - start) / step === Infinity) throw new Error("infinite range");
    var range = [], k = d3_range_integerScale(abs(step)), i = -1, j;
    start *= k, stop *= k, step *= k;
    if (step < 0) while ((j = start + step * ++i) > stop) range.push(j / k); else while ((j = start + step * ++i) < stop) range.push(j / k);
    return range;
  };
  function d3_range_integerScale(x) {
    var k = 1;
    while (x * k % 1) k *= 10;
    return k;
  }
  function d3_class(ctor, properties) {
    try {
      for (var key in properties) {
        Object.defineProperty(ctor.prototype, key, {
          value: properties[key],
          enumerable: false
        });
      }
    } catch (e) {
      ctor.prototype = properties;
    }
  }
  d3.map = function(object) {
    var map = new d3_Map();
    if (object instanceof d3_Map) object.forEach(function(key, value) {
      map.set(key, value);
    }); else for (var key in object) map.set(key, object[key]);
    return map;
  };
  function d3_Map() {}
  d3_class(d3_Map, {
    has: d3_map_has,
    get: function(key) {
      return this[d3_map_prefix + key];
    },
    set: function(key, value) {
      return this[d3_map_prefix + key] = value;
    },
    remove: d3_map_remove,
    keys: d3_map_keys,
    values: function() {
      var values = [];
      this.forEach(function(key, value) {
        values.push(value);
      });
      return values;
    },
    entries: function() {
      var entries = [];
      this.forEach(function(key, value) {
        entries.push({
          key: key,
          value: value
        });
      });
      return entries;
    },
    size: d3_map_size,
    empty: d3_map_empty,
    forEach: function(f) {
      for (var key in this) if (key.charCodeAt(0) === d3_map_prefixCode) f.call(this, key.substring(1), this[key]);
    }
  });
  var d3_map_prefix = "\x00", d3_map_prefixCode = d3_map_prefix.charCodeAt(0);
  function d3_map_has(key) {
    return d3_map_prefix + key in this;
  }
  function d3_map_remove(key) {
    key = d3_map_prefix + key;
    return key in this && delete this[key];
  }
  function d3_map_keys() {
    var keys = [];
    this.forEach(function(key) {
      keys.push(key);
    });
    return keys;
  }
  function d3_map_size() {
    var size = 0;
    for (var key in this) if (key.charCodeAt(0) === d3_map_prefixCode) ++size;
    return size;
  }
  function d3_map_empty() {
    for (var key in this) if (key.charCodeAt(0) === d3_map_prefixCode) return false;
    return true;
  }
  d3.nest = function() {
    var nest = {}, keys = [], sortKeys = [], sortValues, rollup;
    function map(mapType, array, depth) {
      if (depth >= keys.length) return rollup ? rollup.call(nest, array) : sortValues ? array.sort(sortValues) : array;
      var i = -1, n = array.length, key = keys[depth++], keyValue, object, setter, valuesByKey = new d3_Map(), values;
      while (++i < n) {
        if (values = valuesByKey.get(keyValue = key(object = array[i]))) {
          values.push(object);
        } else {
          valuesByKey.set(keyValue, [ object ]);
        }
      }
      if (mapType) {
        object = mapType();
        setter = function(keyValue, values) {
          object.set(keyValue, map(mapType, values, depth));
        };
      } else {
        object = {};
        setter = function(keyValue, values) {
          object[keyValue] = map(mapType, values, depth);
        };
      }
      valuesByKey.forEach(setter);
      return object;
    }
    function entries(map, depth) {
      if (depth >= keys.length) return map;
      var array = [], sortKey = sortKeys[depth++];
      map.forEach(function(key, keyMap) {
        array.push({
          key: key,
          values: entries(keyMap, depth)
        });
      });
      return sortKey ? array.sort(function(a, b) {
        return sortKey(a.key, b.key);
      }) : array;
    }
    nest.map = function(array, mapType) {
      return map(mapType, array, 0);
    };
    nest.entries = function(array) {
      return entries(map(d3.map, array, 0), 0);
    };
    nest.key = function(d) {
      keys.push(d);
      return nest;
    };
    nest.sortKeys = function(order) {
      sortKeys[keys.length - 1] = order;
      return nest;
    };
    nest.sortValues = function(order) {
      sortValues = order;
      return nest;
    };
    nest.rollup = function(f) {
      rollup = f;
      return nest;
    };
    return nest;
  };
  d3.set = function(array) {
    var set = new d3_Set();
    if (array) for (var i = 0, n = array.length; i < n; ++i) set.add(array[i]);
    return set;
  };
  function d3_Set() {}
  d3_class(d3_Set, {
    has: d3_map_has,
    add: function(value) {
      this[d3_map_prefix + value] = true;
      return value;
    },
    remove: function(value) {
      value = d3_map_prefix + value;
      return value in this && delete this[value];
    },
    values: d3_map_keys,
    size: d3_map_size,
    empty: d3_map_empty,
    forEach: function(f) {
      for (var value in this) if (value.charCodeAt(0) === d3_map_prefixCode) f.call(this, value.substring(1));
    }
  });
  d3.behavior = {};
  d3.rebind = function(target, source) {
    var i = 1, n = arguments.length, method;
    while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method]);
    return target;
  };
  function d3_rebind(target, source, method) {
    return function() {
      var value = method.apply(source, arguments);
      return value === source ? target : value;
    };
  }
  function d3_vendorSymbol(object, name) {
    if (name in object) return name;
    name = name.charAt(0).toUpperCase() + name.substring(1);
    for (var i = 0, n = d3_vendorPrefixes.length; i < n; ++i) {
      var prefixName = d3_vendorPrefixes[i] + name;
      if (prefixName in object) return prefixName;
    }
  }
  var d3_vendorPrefixes = [ "webkit", "ms", "moz", "Moz", "o", "O" ];
  function d3_noop() {}
  d3.dispatch = function() {
    var dispatch = new d3_dispatch(), i = -1, n = arguments.length;
    while (++i < n) dispatch[arguments[i]] = d3_dispatch_event(dispatch);
    return dispatch;
  };
  function d3_dispatch() {}
  d3_dispatch.prototype.on = function(type, listener) {
    var i = type.indexOf("."), name = "";
    if (i >= 0) {
      name = type.substring(i + 1);
      type = type.substring(0, i);
    }
    if (type) return arguments.length < 2 ? this[type].on(name) : this[type].on(name, listener);
    if (arguments.length === 2) {
      if (listener == null) for (type in this) {
        if (this.hasOwnProperty(type)) this[type].on(name, null);
      }
      return this;
    }
  };
  function d3_dispatch_event(dispatch) {
    var listeners = [], listenerByName = new d3_Map();
    function event() {
      var z = listeners, i = -1, n = z.length, l;
      while (++i < n) if (l = z[i].on) l.apply(this, arguments);
      return dispatch;
    }
    event.on = function(name, listener) {
      var l = listenerByName.get(name), i;
      if (arguments.length < 2) return l && l.on;
      if (l) {
        l.on = null;
        listeners = listeners.slice(0, i = listeners.indexOf(l)).concat(listeners.slice(i + 1));
        listenerByName.remove(name);
      }
      if (listener) listeners.push(listenerByName.set(name, {
        on: listener
      }));
      return dispatch;
    };
    return event;
  }
  d3.event = null;
  function d3_eventPreventDefault() {
    d3.event.preventDefault();
  }
  function d3_eventSource() {
    var e = d3.event, s;
    while (s = e.sourceEvent) e = s;
    return e;
  }
  function d3_eventDispatch(target) {
    var dispatch = new d3_dispatch(), i = 0, n = arguments.length;
    while (++i < n) dispatch[arguments[i]] = d3_dispatch_event(dispatch);
    dispatch.of = function(thiz, argumentz) {
      return function(e1) {
        try {
          var e0 = e1.sourceEvent = d3.event;
          e1.target = target;
          d3.event = e1;
          dispatch[e1.type].apply(thiz, argumentz);
        } finally {
          d3.event = e0;
        }
      };
    };
    return dispatch;
  }
  d3.requote = function(s) {
    return s.replace(d3_requote_re, "\\$&");
  };
  var d3_requote_re = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;
  var d3_subclass = {}.__proto__ ? function(object, prototype) {
    object.__proto__ = prototype;
  } : function(object, prototype) {
    for (var property in prototype) object[property] = prototype[property];
  };
  function d3_selection(groups) {
    d3_subclass(groups, d3_selectionPrototype);
    return groups;
  }
  var d3_select = function(s, n) {
    return n.querySelector(s);
  }, d3_selectAll = function(s, n) {
    return n.querySelectorAll(s);
  }, d3_selectMatcher = d3_documentElement[d3_vendorSymbol(d3_documentElement, "matchesSelector")], d3_selectMatches = function(n, s) {
    return d3_selectMatcher.call(n, s);
  };
  if (typeof Sizzle === "function") {
    d3_select = function(s, n) {
      return Sizzle(s, n)[0] || null;
    };
    d3_selectAll = Sizzle;
    d3_selectMatches = Sizzle.matchesSelector;
  }
  d3.selection = function() {
    return d3_selectionRoot;
  };
  var d3_selectionPrototype = d3.selection.prototype = [];
  d3_selectionPrototype.select = function(selector) {
    var subgroups = [], subgroup, subnode, group, node;
    selector = d3_selection_selector(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      subgroup.parentNode = (group = this[j]).parentNode;
      for (var i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroup.push(subnode = selector.call(node, node.__data__, i, j));
          if (subnode && "__data__" in node) subnode.__data__ = node.__data__;
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_selector(selector) {
    return typeof selector === "function" ? selector : function() {
      return d3_select(selector, this);
    };
  }
  d3_selectionPrototype.selectAll = function(selector) {
    var subgroups = [], subgroup, node;
    selector = d3_selection_selectorAll(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroups.push(subgroup = d3_array(selector.call(node, node.__data__, i, j)));
          subgroup.parentNode = node;
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_selectorAll(selector) {
    return typeof selector === "function" ? selector : function() {
      return d3_selectAll(selector, this);
    };
  }
  var d3_nsPrefix = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: "http://www.w3.org/1999/xhtml",
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };
  d3.ns = {
    prefix: d3_nsPrefix,
    qualify: function(name) {
      var i = name.indexOf(":"), prefix = name;
      if (i >= 0) {
        prefix = name.substring(0, i);
        name = name.substring(i + 1);
      }
      return d3_nsPrefix.hasOwnProperty(prefix) ? {
        space: d3_nsPrefix[prefix],
        local: name
      } : name;
    }
  };
  d3_selectionPrototype.attr = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") {
        var node = this.node();
        name = d3.ns.qualify(name);
        return name.local ? node.getAttributeNS(name.space, name.local) : node.getAttribute(name);
      }
      for (value in name) this.each(d3_selection_attr(value, name[value]));
      return this;
    }
    return this.each(d3_selection_attr(name, value));
  };
  function d3_selection_attr(name, value) {
    name = d3.ns.qualify(name);
    function attrNull() {
      this.removeAttribute(name);
    }
    function attrNullNS() {
      this.removeAttributeNS(name.space, name.local);
    }
    function attrConstant() {
      this.setAttribute(name, value);
    }
    function attrConstantNS() {
      this.setAttributeNS(name.space, name.local, value);
    }
    function attrFunction() {
      var x = value.apply(this, arguments);
      if (x == null) this.removeAttribute(name); else this.setAttribute(name, x);
    }
    function attrFunctionNS() {
      var x = value.apply(this, arguments);
      if (x == null) this.removeAttributeNS(name.space, name.local); else this.setAttributeNS(name.space, name.local, x);
    }
    return value == null ? name.local ? attrNullNS : attrNull : typeof value === "function" ? name.local ? attrFunctionNS : attrFunction : name.local ? attrConstantNS : attrConstant;
  }
  function d3_collapse(s) {
    return s.trim().replace(/\s+/g, " ");
  }
  d3_selectionPrototype.classed = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") {
        var node = this.node(), n = (name = d3_selection_classes(name)).length, i = -1;
        if (value = node.classList) {
          while (++i < n) if (!value.contains(name[i])) return false;
        } else {
          value = node.getAttribute("class");
          while (++i < n) if (!d3_selection_classedRe(name[i]).test(value)) return false;
        }
        return true;
      }
      for (value in name) this.each(d3_selection_classed(value, name[value]));
      return this;
    }
    return this.each(d3_selection_classed(name, value));
  };
  function d3_selection_classedRe(name) {
    return new RegExp("(?:^|\\s+)" + d3.requote(name) + "(?:\\s+|$)", "g");
  }
  function d3_selection_classes(name) {
    return name.trim().split(/^|\s+/);
  }
  function d3_selection_classed(name, value) {
    name = d3_selection_classes(name).map(d3_selection_classedName);
    var n = name.length;
    function classedConstant() {
      var i = -1;
      while (++i < n) name[i](this, value);
    }
    function classedFunction() {
      var i = -1, x = value.apply(this, arguments);
      while (++i < n) name[i](this, x);
    }
    return typeof value === "function" ? classedFunction : classedConstant;
  }
  function d3_selection_classedName(name) {
    var re = d3_selection_classedRe(name);
    return function(node, value) {
      if (c = node.classList) return value ? c.add(name) : c.remove(name);
      var c = node.getAttribute("class") || "";
      if (value) {
        re.lastIndex = 0;
        if (!re.test(c)) node.setAttribute("class", d3_collapse(c + " " + name));
      } else {
        node.setAttribute("class", d3_collapse(c.replace(re, " ")));
      }
    };
  }
  d3_selectionPrototype.style = function(name, value, priority) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof name !== "string") {
        if (n < 2) value = "";
        for (priority in name) this.each(d3_selection_style(priority, name[priority], value));
        return this;
      }
      if (n < 2) return d3_window.getComputedStyle(this.node(), null).getPropertyValue(name);
      priority = "";
    }
    return this.each(d3_selection_style(name, value, priority));
  };
  function d3_selection_style(name, value, priority) {
    function styleNull() {
      this.style.removeProperty(name);
    }
    function styleConstant() {
      this.style.setProperty(name, value, priority);
    }
    function styleFunction() {
      var x = value.apply(this, arguments);
      if (x == null) this.style.removeProperty(name); else this.style.setProperty(name, x, priority);
    }
    return value == null ? styleNull : typeof value === "function" ? styleFunction : styleConstant;
  }
  d3_selectionPrototype.property = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") return this.node()[name];
      for (value in name) this.each(d3_selection_property(value, name[value]));
      return this;
    }
    return this.each(d3_selection_property(name, value));
  };
  function d3_selection_property(name, value) {
    function propertyNull() {
      delete this[name];
    }
    function propertyConstant() {
      this[name] = value;
    }
    function propertyFunction() {
      var x = value.apply(this, arguments);
      if (x == null) delete this[name]; else this[name] = x;
    }
    return value == null ? propertyNull : typeof value === "function" ? propertyFunction : propertyConstant;
  }
  d3_selectionPrototype.text = function(value) {
    return arguments.length ? this.each(typeof value === "function" ? function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    } : value == null ? function() {
      this.textContent = "";
    } : function() {
      this.textContent = value;
    }) : this.node().textContent;
  };
  d3_selectionPrototype.html = function(value) {
    return arguments.length ? this.each(typeof value === "function" ? function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    } : value == null ? function() {
      this.innerHTML = "";
    } : function() {
      this.innerHTML = value;
    }) : this.node().innerHTML;
  };
  d3_selectionPrototype.append = function(name) {
    name = d3_selection_creator(name);
    return this.select(function() {
      return this.appendChild(name.apply(this, arguments));
    });
  };
  function d3_selection_creator(name) {
    return typeof name === "function" ? name : (name = d3.ns.qualify(name)).local ? function() {
      return this.ownerDocument.createElementNS(name.space, name.local);
    } : function() {
      return this.ownerDocument.createElementNS(this.namespaceURI, name);
    };
  }
  d3_selectionPrototype.insert = function(name, before) {
    name = d3_selection_creator(name);
    before = d3_selection_selector(before);
    return this.select(function() {
      return this.insertBefore(name.apply(this, arguments), before.apply(this, arguments) || null);
    });
  };
  d3_selectionPrototype.remove = function() {
    return this.each(function() {
      var parent = this.parentNode;
      if (parent) parent.removeChild(this);
    });
  };
  d3_selectionPrototype.data = function(value, key) {
    var i = -1, n = this.length, group, node;
    if (!arguments.length) {
      value = new Array(n = (group = this[0]).length);
      while (++i < n) {
        if (node = group[i]) {
          value[i] = node.__data__;
        }
      }
      return value;
    }
    function bind(group, groupData) {
      var i, n = group.length, m = groupData.length, n0 = Math.min(n, m), updateNodes = new Array(m), enterNodes = new Array(m), exitNodes = new Array(n), node, nodeData;
      if (key) {
        var nodeByKeyValue = new d3_Map(), dataByKeyValue = new d3_Map(), keyValues = [], keyValue;
        for (i = -1; ++i < n; ) {
          keyValue = key.call(node = group[i], node.__data__, i);
          if (nodeByKeyValue.has(keyValue)) {
            exitNodes[i] = node;
          } else {
            nodeByKeyValue.set(keyValue, node);
          }
          keyValues.push(keyValue);
        }
        for (i = -1; ++i < m; ) {
          keyValue = key.call(groupData, nodeData = groupData[i], i);
          if (node = nodeByKeyValue.get(keyValue)) {
            updateNodes[i] = node;
            node.__data__ = nodeData;
          } else if (!dataByKeyValue.has(keyValue)) {
            enterNodes[i] = d3_selection_dataNode(nodeData);
          }
          dataByKeyValue.set(keyValue, nodeData);
          nodeByKeyValue.remove(keyValue);
        }
        for (i = -1; ++i < n; ) {
          if (nodeByKeyValue.has(keyValues[i])) {
            exitNodes[i] = group[i];
          }
        }
      } else {
        for (i = -1; ++i < n0; ) {
          node = group[i];
          nodeData = groupData[i];
          if (node) {
            node.__data__ = nodeData;
            updateNodes[i] = node;
          } else {
            enterNodes[i] = d3_selection_dataNode(nodeData);
          }
        }
        for (;i < m; ++i) {
          enterNodes[i] = d3_selection_dataNode(groupData[i]);
        }
        for (;i < n; ++i) {
          exitNodes[i] = group[i];
        }
      }
      enterNodes.update = updateNodes;
      enterNodes.parentNode = updateNodes.parentNode = exitNodes.parentNode = group.parentNode;
      enter.push(enterNodes);
      update.push(updateNodes);
      exit.push(exitNodes);
    }
    var enter = d3_selection_enter([]), update = d3_selection([]), exit = d3_selection([]);
    if (typeof value === "function") {
      while (++i < n) {
        bind(group = this[i], value.call(group, group.parentNode.__data__, i));
      }
    } else {
      while (++i < n) {
        bind(group = this[i], value);
      }
    }
    update.enter = function() {
      return enter;
    };
    update.exit = function() {
      return exit;
    };
    return update;
  };
  function d3_selection_dataNode(data) {
    return {
      __data__: data
    };
  }
  d3_selectionPrototype.datum = function(value) {
    return arguments.length ? this.property("__data__", value) : this.property("__data__");
  };
  d3_selectionPrototype.filter = function(filter) {
    var subgroups = [], subgroup, group, node;
    if (typeof filter !== "function") filter = d3_selection_filter(filter);
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      subgroup.parentNode = (group = this[j]).parentNode;
      for (var i = 0, n = group.length; i < n; i++) {
        if ((node = group[i]) && filter.call(node, node.__data__, i, j)) {
          subgroup.push(node);
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_filter(selector) {
    return function() {
      return d3_selectMatches(this, selector);
    };
  }
  d3_selectionPrototype.order = function() {
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
        if (node = group[i]) {
          if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
    return this;
  };
  d3_selectionPrototype.sort = function(comparator) {
    comparator = d3_selection_sortComparator.apply(this, arguments);
    for (var j = -1, m = this.length; ++j < m; ) this[j].sort(comparator);
    return this.order();
  };
  function d3_selection_sortComparator(comparator) {
    if (!arguments.length) comparator = d3_ascending;
    return function(a, b) {
      return a && b ? comparator(a.__data__, b.__data__) : !a - !b;
    };
  }
  d3_selectionPrototype.each = function(callback) {
    return d3_selection_each(this, function(node, i, j) {
      callback.call(node, node.__data__, i, j);
    });
  };
  function d3_selection_each(groups, callback) {
    for (var j = 0, m = groups.length; j < m; j++) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; i++) {
        if (node = group[i]) callback(node, i, j);
      }
    }
    return groups;
  }
  d3_selectionPrototype.call = function(callback) {
    var args = d3_array(arguments);
    callback.apply(args[0] = this, args);
    return this;
  };
  d3_selectionPrototype.empty = function() {
    return !this.node();
  };
  d3_selectionPrototype.node = function() {
    for (var j = 0, m = this.length; j < m; j++) {
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        var node = group[i];
        if (node) return node;
      }
    }
    return null;
  };
  d3_selectionPrototype.size = function() {
    var n = 0;
    this.each(function() {
      ++n;
    });
    return n;
  };
  function d3_selection_enter(selection) {
    d3_subclass(selection, d3_selection_enterPrototype);
    return selection;
  }
  var d3_selection_enterPrototype = [];
  d3.selection.enter = d3_selection_enter;
  d3.selection.enter.prototype = d3_selection_enterPrototype;
  d3_selection_enterPrototype.append = d3_selectionPrototype.append;
  d3_selection_enterPrototype.empty = d3_selectionPrototype.empty;
  d3_selection_enterPrototype.node = d3_selectionPrototype.node;
  d3_selection_enterPrototype.call = d3_selectionPrototype.call;
  d3_selection_enterPrototype.size = d3_selectionPrototype.size;
  d3_selection_enterPrototype.select = function(selector) {
    var subgroups = [], subgroup, subnode, upgroup, group, node;
    for (var j = -1, m = this.length; ++j < m; ) {
      upgroup = (group = this[j]).update;
      subgroups.push(subgroup = []);
      subgroup.parentNode = group.parentNode;
      for (var i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroup.push(upgroup[i] = subnode = selector.call(group.parentNode, node.__data__, i, j));
          subnode.__data__ = node.__data__;
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_selection(subgroups);
  };
  d3_selection_enterPrototype.insert = function(name, before) {
    if (arguments.length < 2) before = d3_selection_enterInsertBefore(this);
    return d3_selectionPrototype.insert.call(this, name, before);
  };
  function d3_selection_enterInsertBefore(enter) {
    var i0, j0;
    return function(d, i, j) {
      var group = enter[j].update, n = group.length, node;
      if (j != j0) j0 = j, i0 = 0;
      if (i >= i0) i0 = i + 1;
      while (!(node = group[i0]) && ++i0 < n) ;
      return node;
    };
  }
  d3_selectionPrototype.transition = function() {
    var id = d3_transitionInheritId || ++d3_transitionId, subgroups = [], subgroup, node, transition = d3_transitionInherit || {
      time: Date.now(),
      ease: d3_ease_cubicInOut,
      delay: 0,
      duration: 250
    };
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) d3_transitionNode(node, i, id, transition);
        subgroup.push(node);
      }
    }
    return d3_transition(subgroups, id);
  };
  d3_selectionPrototype.interrupt = function() {
    return this.each(d3_selection_interrupt);
  };
  function d3_selection_interrupt() {
    var lock = this.__transition__;
    if (lock) ++lock.active;
  }
  d3.select = function(node) {
    var group = [ typeof node === "string" ? d3_select(node, d3_document) : node ];
    group.parentNode = d3_documentElement;
    return d3_selection([ group ]);
  };
  d3.selectAll = function(nodes) {
    var group = d3_array(typeof nodes === "string" ? d3_selectAll(nodes, d3_document) : nodes);
    group.parentNode = d3_documentElement;
    return d3_selection([ group ]);
  };
  var d3_selectionRoot = d3.select(d3_documentElement);
  d3_selectionPrototype.on = function(type, listener, capture) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof type !== "string") {
        if (n < 2) listener = false;
        for (capture in type) this.each(d3_selection_on(capture, type[capture], listener));
        return this;
      }
      if (n < 2) return (n = this.node()["__on" + type]) && n._;
      capture = false;
    }
    return this.each(d3_selection_on(type, listener, capture));
  };
  function d3_selection_on(type, listener, capture) {
    var name = "__on" + type, i = type.indexOf("."), wrap = d3_selection_onListener;
    if (i > 0) type = type.substring(0, i);
    var filter = d3_selection_onFilters.get(type);
    if (filter) type = filter, wrap = d3_selection_onFilter;
    function onRemove() {
      var l = this[name];
      if (l) {
        this.removeEventListener(type, l, l.$);
        delete this[name];
      }
    }
    function onAdd() {
      var l = wrap(listener, d3_array(arguments));
      onRemove.call(this);
      this.addEventListener(type, this[name] = l, l.$ = capture);
      l._ = listener;
    }
    function removeAll() {
      var re = new RegExp("^__on([^.]+)" + d3.requote(type) + "$"), match;
      for (var name in this) {
        if (match = name.match(re)) {
          var l = this[name];
          this.removeEventListener(match[1], l, l.$);
          delete this[name];
        }
      }
    }
    return i ? listener ? onAdd : onRemove : listener ? d3_noop : removeAll;
  }
  var d3_selection_onFilters = d3.map({
    mouseenter: "mouseover",
    mouseleave: "mouseout"
  });
  d3_selection_onFilters.forEach(function(k) {
    if ("on" + k in d3_document) d3_selection_onFilters.remove(k);
  });
  function d3_selection_onListener(listener, argumentz) {
    return function(e) {
      var o = d3.event;
      d3.event = e;
      argumentz[0] = this.__data__;
      try {
        listener.apply(this, argumentz);
      } finally {
        d3.event = o;
      }
    };
  }
  function d3_selection_onFilter(listener, argumentz) {
    var l = d3_selection_onListener(listener, argumentz);
    return function(e) {
      var target = this, related = e.relatedTarget;
      if (!related || related !== target && !(related.compareDocumentPosition(target) & 8)) {
        l.call(target, e);
      }
    };
  }
  var d3_event_dragSelect = "onselectstart" in d3_document ? null : d3_vendorSymbol(d3_documentElement.style, "userSelect"), d3_event_dragId = 0;
  function d3_event_dragSuppress() {
    var name = ".dragsuppress-" + ++d3_event_dragId, click = "click" + name, w = d3.select(d3_window).on("touchmove" + name, d3_eventPreventDefault).on("dragstart" + name, d3_eventPreventDefault).on("selectstart" + name, d3_eventPreventDefault);
    if (d3_event_dragSelect) {
      var style = d3_documentElement.style, select = style[d3_event_dragSelect];
      style[d3_event_dragSelect] = "none";
    }
    return function(suppressClick) {
      w.on(name, null);
      if (d3_event_dragSelect) style[d3_event_dragSelect] = select;
      if (suppressClick) {
        function off() {
          w.on(click, null);
        }
        w.on(click, function() {
          d3_eventPreventDefault();
          off();
        }, true);
        setTimeout(off, 0);
      }
    };
  }
  d3.mouse = function(container) {
    return d3_mousePoint(container, d3_eventSource());
  };
  function d3_mousePoint(container, e) {
    if (e.changedTouches) e = e.changedTouches[0];
    var svg = container.ownerSVGElement || container;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = e.clientX, point.y = e.clientY;
      point = point.matrixTransform(container.getScreenCTM().inverse());
      return [ point.x, point.y ];
    }
    var rect = container.getBoundingClientRect();
    return [ e.clientX - rect.left - container.clientLeft, e.clientY - rect.top - container.clientTop ];
  }
  d3.touches = function(container, touches) {
    if (arguments.length < 2) touches = d3_eventSource().touches;
    return touches ? d3_array(touches).map(function(touch) {
      var point = d3_mousePoint(container, touch);
      point.identifier = touch.identifier;
      return point;
    }) : [];
  };
  d3.behavior.drag = function() {
    var event = d3_eventDispatch(drag, "drag", "dragstart", "dragend"), origin = null, mousedown = dragstart(d3_noop, d3.mouse, d3_behavior_dragMouseSubject, "mousemove", "mouseup"), touchstart = dragstart(d3_behavior_dragTouchId, d3.touch, d3_behavior_dragTouchSubject, "touchmove", "touchend");
    function drag() {
      this.on("mousedown.drag", mousedown).on("touchstart.drag", touchstart);
    }
    function dragstart(id, position, subject, move, end) {
      return function() {
        var that = this, target = d3.event.target, parent = that.parentNode, dispatch = event.of(that, arguments), dragged = 0, dragId = id(), dragName = ".drag" + (dragId == null ? "" : "-" + dragId), dragOffset, dragSubject = d3.select(subject()).on(move + dragName, moved).on(end + dragName, ended), dragRestore = d3_event_dragSuppress(), position0 = position(parent, dragId);
        if (origin) {
          dragOffset = origin.apply(that, arguments);
          dragOffset = [ dragOffset.x - position0[0], dragOffset.y - position0[1] ];
        } else {
          dragOffset = [ 0, 0 ];
        }
        dispatch({
          type: "dragstart"
        });
        function moved() {
          var position1 = position(parent, dragId), dx, dy;
          if (!position1) return;
          dx = position1[0] - position0[0];
          dy = position1[1] - position0[1];
          dragged |= dx | dy;
          position0 = position1;
          dispatch({
            type: "drag",
            x: position1[0] + dragOffset[0],
            y: position1[1] + dragOffset[1],
            dx: dx,
            dy: dy
          });
        }
        function ended() {
          if (!position(parent, dragId)) return;
          dragSubject.on(move + dragName, null).on(end + dragName, null);
          dragRestore(dragged && d3.event.target === target);
          dispatch({
            type: "dragend"
          });
        }
      };
    }
    drag.origin = function(x) {
      if (!arguments.length) return origin;
      origin = x;
      return drag;
    };
    return d3.rebind(drag, event, "on");
  };
  function d3_behavior_dragTouchId() {
    return d3.event.changedTouches[0].identifier;
  }
  function d3_behavior_dragTouchSubject() {
    return d3.event.target;
  }
  function d3_behavior_dragMouseSubject() {
    return d3_window;
  }
  var π = Math.PI, τ = 2 * π, halfπ = π / 2, ε = 1e-6, ε2 = ε * ε, d3_radians = π / 180, d3_degrees = 180 / π;
  function d3_sgn(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  }
  function d3_cross2d(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }
  function d3_acos(x) {
    return x > 1 ? 0 : x < -1 ? π : Math.acos(x);
  }
  function d3_asin(x) {
    return x > 1 ? halfπ : x < -1 ? -halfπ : Math.asin(x);
  }
  function d3_sinh(x) {
    return ((x = Math.exp(x)) - 1 / x) / 2;
  }
  function d3_cosh(x) {
    return ((x = Math.exp(x)) + 1 / x) / 2;
  }
  function d3_tanh(x) {
    return ((x = Math.exp(2 * x)) - 1) / (x + 1);
  }
  function d3_haversin(x) {
    return (x = Math.sin(x / 2)) * x;
  }
  var ρ = Math.SQRT2, ρ2 = 2, ρ4 = 4;
  d3.interpolateZoom = function(p0, p1) {
    var ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2];
    var dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + ρ4 * d2) / (2 * w0 * ρ2 * d1), b1 = (w1 * w1 - w0 * w0 - ρ4 * d2) / (2 * w1 * ρ2 * d1), r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1), dr = r1 - r0, S = (dr || Math.log(w1 / w0)) / ρ;
    function interpolate(t) {
      var s = t * S;
      if (dr) {
        var coshr0 = d3_cosh(r0), u = w0 / (ρ2 * d1) * (coshr0 * d3_tanh(ρ * s + r0) - d3_sinh(r0));
        return [ ux0 + u * dx, uy0 + u * dy, w0 * coshr0 / d3_cosh(ρ * s + r0) ];
      }
      return [ ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(ρ * s) ];
    }
    interpolate.duration = S * 1e3;
    return interpolate;
  };
  d3.behavior.zoom = function() {
    var view = {
      x: 0,
      y: 0,
      k: 1
    }, translate0, center, size = [ 960, 500 ], scaleExtent = d3_behavior_zoomInfinity, mousedown = "mousedown.zoom", mousemove = "mousemove.zoom", mouseup = "mouseup.zoom", mousewheelTimer, touchstart = "touchstart.zoom", touchtime, event = d3_eventDispatch(zoom, "zoomstart", "zoom", "zoomend"), x0, x1, y0, y1;
    function zoom(g) {
      g.on(mousedown, mousedowned).on(d3_behavior_zoomWheel + ".zoom", mousewheeled).on(mousemove, mousewheelreset).on("dblclick.zoom", dblclicked).on(touchstart, touchstarted);
    }
    zoom.event = function(g) {
      g.each(function() {
        var dispatch = event.of(this, arguments), view1 = view;
        if (d3_transitionInheritId) {
          d3.select(this).transition().each("start.zoom", function() {
            view = this.__chart__ || {
              x: 0,
              y: 0,
              k: 1
            };
            zoomstarted(dispatch);
          }).tween("zoom:zoom", function() {
            var dx = size[0], dy = size[1], cx = dx / 2, cy = dy / 2, i = d3.interpolateZoom([ (cx - view.x) / view.k, (cy - view.y) / view.k, dx / view.k ], [ (cx - view1.x) / view1.k, (cy - view1.y) / view1.k, dx / view1.k ]);
            return function(t) {
              var l = i(t), k = dx / l[2];
              this.__chart__ = view = {
                x: cx - l[0] * k,
                y: cy - l[1] * k,
                k: k
              };
              zoomed(dispatch);
            };
          }).each("end.zoom", function() {
            zoomended(dispatch);
          });
        } else {
          this.__chart__ = view;
          zoomstarted(dispatch);
          zoomed(dispatch);
          zoomended(dispatch);
        }
      });
    };
    zoom.translate = function(_) {
      if (!arguments.length) return [ view.x, view.y ];
      view = {
        x: +_[0],
        y: +_[1],
        k: view.k
      };
      rescale();
      return zoom;
    };
    zoom.scale = function(_) {
      if (!arguments.length) return view.k;
      view = {
        x: view.x,
        y: view.y,
        k: +_
      };
      rescale();
      return zoom;
    };
    zoom.scaleExtent = function(_) {
      if (!arguments.length) return scaleExtent;
      scaleExtent = _ == null ? d3_behavior_zoomInfinity : [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.center = function(_) {
      if (!arguments.length) return center;
      center = _ && [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.size = function(_) {
      if (!arguments.length) return size;
      size = _ && [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.x = function(z) {
      if (!arguments.length) return x1;
      x1 = z;
      x0 = z.copy();
      view = {
        x: 0,
        y: 0,
        k: 1
      };
      return zoom;
    };
    zoom.y = function(z) {
      if (!arguments.length) return y1;
      y1 = z;
      y0 = z.copy();
      view = {
        x: 0,
        y: 0,
        k: 1
      };
      return zoom;
    };
    function location(p) {
      return [ (p[0] - view.x) / view.k, (p[1] - view.y) / view.k ];
    }
    function point(l) {
      return [ l[0] * view.k + view.x, l[1] * view.k + view.y ];
    }
    function scaleTo(s) {
      view.k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], s));
    }
    function translateTo(p, l) {
      l = point(l);
      view.x += p[0] - l[0];
      view.y += p[1] - l[1];
    }
    function rescale() {
      if (x1) x1.domain(x0.range().map(function(x) {
        return (x - view.x) / view.k;
      }).map(x0.invert));
      if (y1) y1.domain(y0.range().map(function(y) {
        return (y - view.y) / view.k;
      }).map(y0.invert));
    }
    function zoomstarted(dispatch) {
      dispatch({
        type: "zoomstart"
      });
    }
    function zoomed(dispatch) {
      rescale();
      dispatch({
        type: "zoom",
        scale: view.k,
        translate: [ view.x, view.y ]
      });
    }
    function zoomended(dispatch) {
      dispatch({
        type: "zoomend"
      });
    }
    function mousedowned() {
      var that = this, target = d3.event.target, dispatch = event.of(that, arguments), dragged = 0, subject = d3.select(d3_window).on(mousemove, moved).on(mouseup, ended), location0 = location(d3.mouse(that)), dragRestore = d3_event_dragSuppress();
      d3_selection_interrupt.call(that);
      zoomstarted(dispatch);
      function moved() {
        dragged = 1;
        translateTo(d3.mouse(that), location0);
        zoomed(dispatch);
      }
      function ended() {
        subject.on(mousemove, d3_window === that ? mousewheelreset : null).on(mouseup, null);
        dragRestore(dragged && d3.event.target === target);
        zoomended(dispatch);
      }
    }
    function touchstarted() {
      var that = this, dispatch = event.of(that, arguments), locations0 = {}, distance0 = 0, scale0, zoomName = ".zoom-" + d3.event.changedTouches[0].identifier, touchmove = "touchmove" + zoomName, touchend = "touchend" + zoomName, target = d3.select(d3.event.target).on(touchmove, moved).on(touchend, ended), subject = d3.select(that).on(mousedown, null).on(touchstart, started), dragRestore = d3_event_dragSuppress();
      d3_selection_interrupt.call(that);
      started();
      zoomstarted(dispatch);
      function relocate() {
        var touches = d3.touches(that);
        scale0 = view.k;
        touches.forEach(function(t) {
          if (t.identifier in locations0) locations0[t.identifier] = location(t);
        });
        return touches;
      }
      function started() {
        var changed = d3.event.changedTouches;
        for (var i = 0, n = changed.length; i < n; ++i) {
          locations0[changed[i].identifier] = null;
        }
        var touches = relocate(), now = Date.now();
        if (touches.length === 1) {
          if (now - touchtime < 500) {
            var p = touches[0], l = locations0[p.identifier];
            scaleTo(view.k * 2);
            translateTo(p, l);
            d3_eventPreventDefault();
            zoomed(dispatch);
          }
          touchtime = now;
        } else if (touches.length > 1) {
          var p = touches[0], q = touches[1], dx = p[0] - q[0], dy = p[1] - q[1];
          distance0 = dx * dx + dy * dy;
        }
      }
      function moved() {
        var touches = d3.touches(that), p0, l0, p1, l1;
        for (var i = 0, n = touches.length; i < n; ++i, l1 = null) {
          p1 = touches[i];
          if (l1 = locations0[p1.identifier]) {
            if (l0) break;
            p0 = p1, l0 = l1;
          }
        }
        if (l1) {
          var distance1 = (distance1 = p1[0] - p0[0]) * distance1 + (distance1 = p1[1] - p0[1]) * distance1, scale1 = distance0 && Math.sqrt(distance1 / distance0);
          p0 = [ (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 ];
          l0 = [ (l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2 ];
          scaleTo(scale1 * scale0);
        }
        touchtime = null;
        translateTo(p0, l0);
        zoomed(dispatch);
      }
      function ended() {
        if (d3.event.touches.length) {
          var changed = d3.event.changedTouches;
          for (var i = 0, n = changed.length; i < n; ++i) {
            delete locations0[changed[i].identifier];
          }
          for (var identifier in locations0) {
            return void relocate();
          }
        }
        target.on(zoomName, null);
        subject.on(mousedown, mousedowned).on(touchstart, touchstarted);
        dragRestore();
        zoomended(dispatch);
      }
    }
    function mousewheeled() {
      var dispatch = event.of(this, arguments);
      if (mousewheelTimer) clearTimeout(mousewheelTimer); else d3_selection_interrupt.call(this), 
      zoomstarted(dispatch);
      mousewheelTimer = setTimeout(function() {
        mousewheelTimer = null;
        zoomended(dispatch);
      }, 50);
      d3_eventPreventDefault();
      var point = center || d3.mouse(this);
      if (!translate0) translate0 = location(point);
      scaleTo(Math.pow(2, d3_behavior_zoomDelta() * .002) * view.k);
      translateTo(point, translate0);
      zoomed(dispatch);
    }
    function mousewheelreset() {
      translate0 = null;
    }
    function dblclicked() {
      var dispatch = event.of(this, arguments), p = d3.mouse(this), l = location(p), k = Math.log(view.k) / Math.LN2;
      zoomstarted(dispatch);
      scaleTo(Math.pow(2, d3.event.shiftKey ? Math.ceil(k) - 1 : Math.floor(k) + 1));
      translateTo(p, l);
      zoomed(dispatch);
      zoomended(dispatch);
    }
    return d3.rebind(zoom, event, "on");
  };
  var d3_behavior_zoomInfinity = [ 0, Infinity ];
  var d3_behavior_zoomDelta, d3_behavior_zoomWheel = "onwheel" in d3_document ? (d3_behavior_zoomDelta = function() {
    return -d3.event.deltaY * (d3.event.deltaMode ? 120 : 1);
  }, "wheel") : "onmousewheel" in d3_document ? (d3_behavior_zoomDelta = function() {
    return d3.event.wheelDelta;
  }, "mousewheel") : (d3_behavior_zoomDelta = function() {
    return -d3.event.detail;
  }, "MozMousePixelScroll");
  function d3_Color() {}
  d3_Color.prototype.toString = function() {
    return this.rgb() + "";
  };
  d3.hsl = function(h, s, l) {
    return arguments.length === 1 ? h instanceof d3_Hsl ? d3_hsl(h.h, h.s, h.l) : d3_rgb_parse("" + h, d3_rgb_hsl, d3_hsl) : d3_hsl(+h, +s, +l);
  };
  function d3_hsl(h, s, l) {
    return new d3_Hsl(h, s, l);
  }
  function d3_Hsl(h, s, l) {
    this.h = h;
    this.s = s;
    this.l = l;
  }
  var d3_hslPrototype = d3_Hsl.prototype = new d3_Color();
  d3_hslPrototype.brighter = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return d3_hsl(this.h, this.s, this.l / k);
  };
  d3_hslPrototype.darker = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return d3_hsl(this.h, this.s, k * this.l);
  };
  d3_hslPrototype.rgb = function() {
    return d3_hsl_rgb(this.h, this.s, this.l);
  };
  function d3_hsl_rgb(h, s, l) {
    var m1, m2;
    h = isNaN(h) ? 0 : (h %= 360) < 0 ? h + 360 : h;
    s = isNaN(s) ? 0 : s < 0 ? 0 : s > 1 ? 1 : s;
    l = l < 0 ? 0 : l > 1 ? 1 : l;
    m2 = l <= .5 ? l * (1 + s) : l + s - l * s;
    m1 = 2 * l - m2;
    function v(h) {
      if (h > 360) h -= 360; else if (h < 0) h += 360;
      if (h < 60) return m1 + (m2 - m1) * h / 60;
      if (h < 180) return m2;
      if (h < 240) return m1 + (m2 - m1) * (240 - h) / 60;
      return m1;
    }
    function vv(h) {
      return Math.round(v(h) * 255);
    }
    return d3_rgb(vv(h + 120), vv(h), vv(h - 120));
  }
  d3.hcl = function(h, c, l) {
    return arguments.length === 1 ? h instanceof d3_Hcl ? d3_hcl(h.h, h.c, h.l) : h instanceof d3_Lab ? d3_lab_hcl(h.l, h.a, h.b) : d3_lab_hcl((h = d3_rgb_lab((h = d3.rgb(h)).r, h.g, h.b)).l, h.a, h.b) : d3_hcl(+h, +c, +l);
  };
  function d3_hcl(h, c, l) {
    return new d3_Hcl(h, c, l);
  }
  function d3_Hcl(h, c, l) {
    this.h = h;
    this.c = c;
    this.l = l;
  }
  var d3_hclPrototype = d3_Hcl.prototype = new d3_Color();
  d3_hclPrototype.brighter = function(k) {
    return d3_hcl(this.h, this.c, Math.min(100, this.l + d3_lab_K * (arguments.length ? k : 1)));
  };
  d3_hclPrototype.darker = function(k) {
    return d3_hcl(this.h, this.c, Math.max(0, this.l - d3_lab_K * (arguments.length ? k : 1)));
  };
  d3_hclPrototype.rgb = function() {
    return d3_hcl_lab(this.h, this.c, this.l).rgb();
  };
  function d3_hcl_lab(h, c, l) {
    if (isNaN(h)) h = 0;
    if (isNaN(c)) c = 0;
    return d3_lab(l, Math.cos(h *= d3_radians) * c, Math.sin(h) * c);
  }
  d3.lab = function(l, a, b) {
    return arguments.length === 1 ? l instanceof d3_Lab ? d3_lab(l.l, l.a, l.b) : l instanceof d3_Hcl ? d3_hcl_lab(l.l, l.c, l.h) : d3_rgb_lab((l = d3.rgb(l)).r, l.g, l.b) : d3_lab(+l, +a, +b);
  };
  function d3_lab(l, a, b) {
    return new d3_Lab(l, a, b);
  }
  function d3_Lab(l, a, b) {
    this.l = l;
    this.a = a;
    this.b = b;
  }
  var d3_lab_K = 18;
  var d3_lab_X = .95047, d3_lab_Y = 1, d3_lab_Z = 1.08883;
  var d3_labPrototype = d3_Lab.prototype = new d3_Color();
  d3_labPrototype.brighter = function(k) {
    return d3_lab(Math.min(100, this.l + d3_lab_K * (arguments.length ? k : 1)), this.a, this.b);
  };
  d3_labPrototype.darker = function(k) {
    return d3_lab(Math.max(0, this.l - d3_lab_K * (arguments.length ? k : 1)), this.a, this.b);
  };
  d3_labPrototype.rgb = function() {
    return d3_lab_rgb(this.l, this.a, this.b);
  };
  function d3_lab_rgb(l, a, b) {
    var y = (l + 16) / 116, x = y + a / 500, z = y - b / 200;
    x = d3_lab_xyz(x) * d3_lab_X;
    y = d3_lab_xyz(y) * d3_lab_Y;
    z = d3_lab_xyz(z) * d3_lab_Z;
    return d3_rgb(d3_xyz_rgb(3.2404542 * x - 1.5371385 * y - .4985314 * z), d3_xyz_rgb(-.969266 * x + 1.8760108 * y + .041556 * z), d3_xyz_rgb(.0556434 * x - .2040259 * y + 1.0572252 * z));
  }
  function d3_lab_hcl(l, a, b) {
    return l > 0 ? d3_hcl(Math.atan2(b, a) * d3_degrees, Math.sqrt(a * a + b * b), l) : d3_hcl(NaN, NaN, l);
  }
  function d3_lab_xyz(x) {
    return x > .206893034 ? x * x * x : (x - 4 / 29) / 7.787037;
  }
  function d3_xyz_lab(x) {
    return x > .008856 ? Math.pow(x, 1 / 3) : 7.787037 * x + 4 / 29;
  }
  function d3_xyz_rgb(r) {
    return Math.round(255 * (r <= .00304 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - .055));
  }
  d3.rgb = function(r, g, b) {
    return arguments.length === 1 ? r instanceof d3_Rgb ? d3_rgb(r.r, r.g, r.b) : d3_rgb_parse("" + r, d3_rgb, d3_hsl_rgb) : d3_rgb(~~r, ~~g, ~~b);
  };
  function d3_rgbNumber(value) {
    return d3_rgb(value >> 16, value >> 8 & 255, value & 255);
  }
  function d3_rgbString(value) {
    return d3_rgbNumber(value) + "";
  }
  function d3_rgb(r, g, b) {
    return new d3_Rgb(r, g, b);
  }
  function d3_Rgb(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
  var d3_rgbPrototype = d3_Rgb.prototype = new d3_Color();
  d3_rgbPrototype.brighter = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    var r = this.r, g = this.g, b = this.b, i = 30;
    if (!r && !g && !b) return d3_rgb(i, i, i);
    if (r && r < i) r = i;
    if (g && g < i) g = i;
    if (b && b < i) b = i;
    return d3_rgb(Math.min(255, ~~(r / k)), Math.min(255, ~~(g / k)), Math.min(255, ~~(b / k)));
  };
  d3_rgbPrototype.darker = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return d3_rgb(~~(k * this.r), ~~(k * this.g), ~~(k * this.b));
  };
  d3_rgbPrototype.hsl = function() {
    return d3_rgb_hsl(this.r, this.g, this.b);
  };
  d3_rgbPrototype.toString = function() {
    return "#" + d3_rgb_hex(this.r) + d3_rgb_hex(this.g) + d3_rgb_hex(this.b);
  };
  function d3_rgb_hex(v) {
    return v < 16 ? "0" + Math.max(0, v).toString(16) : Math.min(255, v).toString(16);
  }
  function d3_rgb_parse(format, rgb, hsl) {
    var r = 0, g = 0, b = 0, m1, m2, color;
    m1 = /([a-z]+)\((.*)\)/i.exec(format);
    if (m1) {
      m2 = m1[2].split(",");
      switch (m1[1]) {
       case "hsl":
        {
          return hsl(parseFloat(m2[0]), parseFloat(m2[1]) / 100, parseFloat(m2[2]) / 100);
        }

       case "rgb":
        {
          return rgb(d3_rgb_parseNumber(m2[0]), d3_rgb_parseNumber(m2[1]), d3_rgb_parseNumber(m2[2]));
        }
      }
    }
    if (color = d3_rgb_names.get(format)) return rgb(color.r, color.g, color.b);
    if (format != null && format.charAt(0) === "#" && !isNaN(color = parseInt(format.substring(1), 16))) {
      if (format.length === 4) {
        r = (color & 3840) >> 4;
        r = r >> 4 | r;
        g = color & 240;
        g = g >> 4 | g;
        b = color & 15;
        b = b << 4 | b;
      } else if (format.length === 7) {
        r = (color & 16711680) >> 16;
        g = (color & 65280) >> 8;
        b = color & 255;
      }
    }
    return rgb(r, g, b);
  }
  function d3_rgb_hsl(r, g, b) {
    var min = Math.min(r /= 255, g /= 255, b /= 255), max = Math.max(r, g, b), d = max - min, h, s, l = (max + min) / 2;
    if (d) {
      s = l < .5 ? d / (max + min) : d / (2 - max - min);
      if (r == max) h = (g - b) / d + (g < b ? 6 : 0); else if (g == max) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60;
    } else {
      h = NaN;
      s = l > 0 && l < 1 ? 0 : h;
    }
    return d3_hsl(h, s, l);
  }
  function d3_rgb_lab(r, g, b) {
    r = d3_rgb_xyz(r);
    g = d3_rgb_xyz(g);
    b = d3_rgb_xyz(b);
    var x = d3_xyz_lab((.4124564 * r + .3575761 * g + .1804375 * b) / d3_lab_X), y = d3_xyz_lab((.2126729 * r + .7151522 * g + .072175 * b) / d3_lab_Y), z = d3_xyz_lab((.0193339 * r + .119192 * g + .9503041 * b) / d3_lab_Z);
    return d3_lab(116 * y - 16, 500 * (x - y), 200 * (y - z));
  }
  function d3_rgb_xyz(r) {
    return (r /= 255) <= .04045 ? r / 12.92 : Math.pow((r + .055) / 1.055, 2.4);
  }
  function d3_rgb_parseNumber(c) {
    var f = parseFloat(c);
    return c.charAt(c.length - 1) === "%" ? Math.round(f * 2.55) : f;
  }
  var d3_rgb_names = d3.map({
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  });
  d3_rgb_names.forEach(function(key, value) {
    d3_rgb_names.set(key, d3_rgbNumber(value));
  });
  function d3_functor(v) {
    return typeof v === "function" ? v : function() {
      return v;
    };
  }
  d3.functor = d3_functor;
  function d3_identity(d) {
    return d;
  }
  d3.xhr = d3_xhrType(d3_identity);
  function d3_xhrType(response) {
    return function(url, mimeType, callback) {
      if (arguments.length === 2 && typeof mimeType === "function") callback = mimeType, 
      mimeType = null;
      return d3_xhr(url, mimeType, response, callback);
    };
  }
  function d3_xhr(url, mimeType, response, callback) {
    var xhr = {}, dispatch = d3.dispatch("beforesend", "progress", "load", "error"), headers = {}, request = new XMLHttpRequest(), responseType = null;
    if (d3_window.XDomainRequest && !("withCredentials" in request) && /^(http(s)?:)?\/\//.test(url)) request = new XDomainRequest();
    "onload" in request ? request.onload = request.onerror = respond : request.onreadystatechange = function() {
      request.readyState > 3 && respond();
    };
    function respond() {
      var status = request.status, result;
      if (!status && request.responseText || status >= 200 && status < 300 || status === 304) {
        try {
          result = response.call(xhr, request);
        } catch (e) {
          dispatch.error.call(xhr, e);
          return;
        }
        dispatch.load.call(xhr, result);
      } else {
        dispatch.error.call(xhr, request);
      }
    }
    request.onprogress = function(event) {
      var o = d3.event;
      d3.event = event;
      try {
        dispatch.progress.call(xhr, request);
      } finally {
        d3.event = o;
      }
    };
    xhr.header = function(name, value) {
      name = (name + "").toLowerCase();
      if (arguments.length < 2) return headers[name];
      if (value == null) delete headers[name]; else headers[name] = value + "";
      return xhr;
    };
    xhr.mimeType = function(value) {
      if (!arguments.length) return mimeType;
      mimeType = value == null ? null : value + "";
      return xhr;
    };
    xhr.responseType = function(value) {
      if (!arguments.length) return responseType;
      responseType = value;
      return xhr;
    };
    xhr.response = function(value) {
      response = value;
      return xhr;
    };
    [ "get", "post" ].forEach(function(method) {
      xhr[method] = function() {
        return xhr.send.apply(xhr, [ method ].concat(d3_array(arguments)));
      };
    });
    xhr.send = function(method, data, callback) {
      if (arguments.length === 2 && typeof data === "function") callback = data, data = null;
      request.open(method, url, true);
      if (mimeType != null && !("accept" in headers)) headers["accept"] = mimeType + ",*/*";
      if (request.setRequestHeader) for (var name in headers) request.setRequestHeader(name, headers[name]);
      if (mimeType != null && request.overrideMimeType) request.overrideMimeType(mimeType);
      if (responseType != null) request.responseType = responseType;
      if (callback != null) xhr.on("error", callback).on("load", function(request) {
        callback(null, request);
      });
      dispatch.beforesend.call(xhr, request);
      request.send(data == null ? null : data);
      return xhr;
    };
    xhr.abort = function() {
      request.abort();
      return xhr;
    };
    d3.rebind(xhr, dispatch, "on");
    return callback == null ? xhr : xhr.get(d3_xhr_fixCallback(callback));
  }
  function d3_xhr_fixCallback(callback) {
    return callback.length === 1 ? function(error, request) {
      callback(error == null ? request : null);
    } : callback;
  }
  d3.dsv = function(delimiter, mimeType) {
    var reFormat = new RegExp('["' + delimiter + "\n]"), delimiterCode = delimiter.charCodeAt(0);
    function dsv(url, row, callback) {
      if (arguments.length < 3) callback = row, row = null;
      var xhr = d3_xhr(url, mimeType, row == null ? response : typedResponse(row), callback);
      xhr.row = function(_) {
        return arguments.length ? xhr.response((row = _) == null ? response : typedResponse(_)) : row;
      };
      return xhr;
    }
    function response(request) {
      return dsv.parse(request.responseText);
    }
    function typedResponse(f) {
      return function(request) {
        return dsv.parse(request.responseText, f);
      };
    }
    dsv.parse = function(text, f) {
      var o;
      return dsv.parseRows(text, function(row, i) {
        if (o) return o(row, i - 1);
        var a = new Function("d", "return {" + row.map(function(name, i) {
          return JSON.stringify(name) + ": d[" + i + "]";
        }).join(",") + "}");
        o = f ? function(row, i) {
          return f(a(row), i);
        } : a;
      });
    };
    dsv.parseRows = function(text, f) {
      var EOL = {}, EOF = {}, rows = [], N = text.length, I = 0, n = 0, t, eol;
      function token() {
        if (I >= N) return EOF;
        if (eol) return eol = false, EOL;
        var j = I;
        if (text.charCodeAt(j) === 34) {
          var i = j;
          while (i++ < N) {
            if (text.charCodeAt(i) === 34) {
              if (text.charCodeAt(i + 1) !== 34) break;
              ++i;
            }
          }
          I = i + 2;
          var c = text.charCodeAt(i + 1);
          if (c === 13) {
            eol = true;
            if (text.charCodeAt(i + 2) === 10) ++I;
          } else if (c === 10) {
            eol = true;
          }
          return text.substring(j + 1, i).replace(/""/g, '"');
        }
        while (I < N) {
          var c = text.charCodeAt(I++), k = 1;
          if (c === 10) eol = true; else if (c === 13) {
            eol = true;
            if (text.charCodeAt(I) === 10) ++I, ++k;
          } else if (c !== delimiterCode) continue;
          return text.substring(j, I - k);
        }
        return text.substring(j);
      }
      while ((t = token()) !== EOF) {
        var a = [];
        while (t !== EOL && t !== EOF) {
          a.push(t);
          t = token();
        }
        if (f && !(a = f(a, n++))) continue;
        rows.push(a);
      }
      return rows;
    };
    dsv.format = function(rows) {
      if (Array.isArray(rows[0])) return dsv.formatRows(rows);
      var fieldSet = new d3_Set(), fields = [];
      rows.forEach(function(row) {
        for (var field in row) {
          if (!fieldSet.has(field)) {
            fields.push(fieldSet.add(field));
          }
        }
      });
      return [ fields.map(formatValue).join(delimiter) ].concat(rows.map(function(row) {
        return fields.map(function(field) {
          return formatValue(row[field]);
        }).join(delimiter);
      })).join("\n");
    };
    dsv.formatRows = function(rows) {
      return rows.map(formatRow).join("\n");
    };
    function formatRow(row) {
      return row.map(formatValue).join(delimiter);
    }
    function formatValue(text) {
      return reFormat.test(text) ? '"' + text.replace(/\"/g, '""') + '"' : text;
    }
    return dsv;
  };
  d3.csv = d3.dsv(",", "text/csv");
  d3.tsv = d3.dsv("	", "text/tab-separated-values");
  d3.touch = function(container, touches, identifier) {
    if (arguments.length < 3) identifier = touches, touches = d3_eventSource().changedTouches;
    if (touches) for (var i = 0, n = touches.length, touch; i < n; ++i) {
      if ((touch = touches[i]).identifier === identifier) {
        return d3_mousePoint(container, touch);
      }
    }
  };
  var d3_timer_queueHead, d3_timer_queueTail, d3_timer_interval, d3_timer_timeout, d3_timer_active, d3_timer_frame = d3_window[d3_vendorSymbol(d3_window, "requestAnimationFrame")] || function(callback) {
    setTimeout(callback, 17);
  };
  d3.timer = function(callback, delay, then) {
    var n = arguments.length;
    if (n < 2) delay = 0;
    if (n < 3) then = Date.now();
    var time = then + delay, timer = {
      c: callback,
      t: time,
      f: false,
      n: null
    };
    if (d3_timer_queueTail) d3_timer_queueTail.n = timer; else d3_timer_queueHead = timer;
    d3_timer_queueTail = timer;
    if (!d3_timer_interval) {
      d3_timer_timeout = clearTimeout(d3_timer_timeout);
      d3_timer_interval = 1;
      d3_timer_frame(d3_timer_step);
    }
  };
  function d3_timer_step() {
    var now = d3_timer_mark(), delay = d3_timer_sweep() - now;
    if (delay > 24) {
      if (isFinite(delay)) {
        clearTimeout(d3_timer_timeout);
        d3_timer_timeout = setTimeout(d3_timer_step, delay);
      }
      d3_timer_interval = 0;
    } else {
      d3_timer_interval = 1;
      d3_timer_frame(d3_timer_step);
    }
  }
  d3.timer.flush = function() {
    d3_timer_mark();
    d3_timer_sweep();
  };
  function d3_timer_mark() {
    var now = Date.now();
    d3_timer_active = d3_timer_queueHead;
    while (d3_timer_active) {
      if (now >= d3_timer_active.t) d3_timer_active.f = d3_timer_active.c(now - d3_timer_active.t);
      d3_timer_active = d3_timer_active.n;
    }
    return now;
  }
  function d3_timer_sweep() {
    var t0, t1 = d3_timer_queueHead, time = Infinity;
    while (t1) {
      if (t1.f) {
        t1 = t0 ? t0.n = t1.n : d3_timer_queueHead = t1.n;
      } else {
        if (t1.t < time) time = t1.t;
        t1 = (t0 = t1).n;
      }
    }
    d3_timer_queueTail = t0;
    return time;
  }
  function d3_format_precision(x, p) {
    return p - (x ? Math.ceil(Math.log(x) / Math.LN10) : 1);
  }
  d3.round = function(x, n) {
    return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x);
  };
  var d3_formatPrefixes = [ "y", "z", "a", "f", "p", "n", "µ", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y" ].map(d3_formatPrefix);
  d3.formatPrefix = function(value, precision) {
    var i = 0;
    if (value) {
      if (value < 0) value *= -1;
      if (precision) value = d3.round(value, d3_format_precision(value, precision));
      i = 1 + Math.floor(1e-12 + Math.log(value) / Math.LN10);
      i = Math.max(-24, Math.min(24, Math.floor((i - 1) / 3) * 3));
    }
    return d3_formatPrefixes[8 + i / 3];
  };
  function d3_formatPrefix(d, i) {
    var k = Math.pow(10, abs(8 - i) * 3);
    return {
      scale: i > 8 ? function(d) {
        return d / k;
      } : function(d) {
        return d * k;
      },
      symbol: d
    };
  }
  function d3_locale_numberFormat(locale) {
    var locale_decimal = locale.decimal, locale_thousands = locale.thousands, locale_grouping = locale.grouping, locale_currency = locale.currency, formatGroup = locale_grouping ? function(value) {
      var i = value.length, t = [], j = 0, g = locale_grouping[0];
      while (i > 0 && g > 0) {
        t.push(value.substring(i -= g, i + g));
        g = locale_grouping[j = (j + 1) % locale_grouping.length];
      }
      return t.reverse().join(locale_thousands);
    } : d3_identity;
    return function(specifier) {
      var match = d3_format_re.exec(specifier), fill = match[1] || " ", align = match[2] || ">", sign = match[3] || "", symbol = match[4] || "", zfill = match[5], width = +match[6], comma = match[7], precision = match[8], type = match[9], scale = 1, prefix = "", suffix = "", integer = false;
      if (precision) precision = +precision.substring(1);
      if (zfill || fill === "0" && align === "=") {
        zfill = fill = "0";
        align = "=";
        if (comma) width -= Math.floor((width - 1) / 4);
      }
      switch (type) {
       case "n":
        comma = true;
        type = "g";
        break;

       case "%":
        scale = 100;
        suffix = "%";
        type = "f";
        break;

       case "p":
        scale = 100;
        suffix = "%";
        type = "r";
        break;

       case "b":
       case "o":
       case "x":
       case "X":
        if (symbol === "#") prefix = "0" + type.toLowerCase();

       case "c":
       case "d":
        integer = true;
        precision = 0;
        break;

       case "s":
        scale = -1;
        type = "r";
        break;
      }
      if (symbol === "$") prefix = locale_currency[0], suffix = locale_currency[1];
      if (type == "r" && !precision) type = "g";
      if (precision != null) {
        if (type == "g") precision = Math.max(1, Math.min(21, precision)); else if (type == "e" || type == "f") precision = Math.max(0, Math.min(20, precision));
      }
      type = d3_format_types.get(type) || d3_format_typeDefault;
      var zcomma = zfill && comma;
      return function(value) {
        var fullSuffix = suffix;
        if (integer && value % 1) return "";
        var negative = value < 0 || value === 0 && 1 / value < 0 ? (value = -value, "-") : sign;
        if (scale < 0) {
          var unit = d3.formatPrefix(value, precision);
          value = unit.scale(value);
          fullSuffix = unit.symbol + suffix;
        } else {
          value *= scale;
        }
        value = type(value, precision);
        var i = value.lastIndexOf("."), before = i < 0 ? value : value.substring(0, i), after = i < 0 ? "" : locale_decimal + value.substring(i + 1);
        if (!zfill && comma) before = formatGroup(before);
        var length = prefix.length + before.length + after.length + (zcomma ? 0 : negative.length), padding = length < width ? new Array(length = width - length + 1).join(fill) : "";
        if (zcomma) before = formatGroup(padding + before);
        negative += prefix;
        value = before + after;
        return (align === "<" ? negative + value + padding : align === ">" ? padding + negative + value : align === "^" ? padding.substring(0, length >>= 1) + negative + value + padding.substring(length) : negative + (zcomma ? value : padding + value)) + fullSuffix;
      };
    };
  }
  var d3_format_re = /(?:([^{])?([<>=^]))?([+\- ])?([$#])?(0)?(\d+)?(,)?(\.-?\d+)?([a-z%])?/i;
  var d3_format_types = d3.map({
    b: function(x) {
      return x.toString(2);
    },
    c: function(x) {
      return String.fromCharCode(x);
    },
    o: function(x) {
      return x.toString(8);
    },
    x: function(x) {
      return x.toString(16);
    },
    X: function(x) {
      return x.toString(16).toUpperCase();
    },
    g: function(x, p) {
      return x.toPrecision(p);
    },
    e: function(x, p) {
      return x.toExponential(p);
    },
    f: function(x, p) {
      return x.toFixed(p);
    },
    r: function(x, p) {
      return (x = d3.round(x, d3_format_precision(x, p))).toFixed(Math.max(0, Math.min(20, d3_format_precision(x * (1 + 1e-15), p))));
    }
  });
  function d3_format_typeDefault(x) {
    return x + "";
  }
  var d3_time = d3.time = {}, d3_date = Date;
  function d3_date_utc() {
    this._ = new Date(arguments.length > 1 ? Date.UTC.apply(this, arguments) : arguments[0]);
  }
  d3_date_utc.prototype = {
    getDate: function() {
      return this._.getUTCDate();
    },
    getDay: function() {
      return this._.getUTCDay();
    },
    getFullYear: function() {
      return this._.getUTCFullYear();
    },
    getHours: function() {
      return this._.getUTCHours();
    },
    getMilliseconds: function() {
      return this._.getUTCMilliseconds();
    },
    getMinutes: function() {
      return this._.getUTCMinutes();
    },
    getMonth: function() {
      return this._.getUTCMonth();
    },
    getSeconds: function() {
      return this._.getUTCSeconds();
    },
    getTime: function() {
      return this._.getTime();
    },
    getTimezoneOffset: function() {
      return 0;
    },
    valueOf: function() {
      return this._.valueOf();
    },
    setDate: function() {
      d3_time_prototype.setUTCDate.apply(this._, arguments);
    },
    setDay: function() {
      d3_time_prototype.setUTCDay.apply(this._, arguments);
    },
    setFullYear: function() {
      d3_time_prototype.setUTCFullYear.apply(this._, arguments);
    },
    setHours: function() {
      d3_time_prototype.setUTCHours.apply(this._, arguments);
    },
    setMilliseconds: function() {
      d3_time_prototype.setUTCMilliseconds.apply(this._, arguments);
    },
    setMinutes: function() {
      d3_time_prototype.setUTCMinutes.apply(this._, arguments);
    },
    setMonth: function() {
      d3_time_prototype.setUTCMonth.apply(this._, arguments);
    },
    setSeconds: function() {
      d3_time_prototype.setUTCSeconds.apply(this._, arguments);
    },
    setTime: function() {
      d3_time_prototype.setTime.apply(this._, arguments);
    }
  };
  var d3_time_prototype = Date.prototype;
  function d3_time_interval(local, step, number) {
    function round(date) {
      var d0 = local(date), d1 = offset(d0, 1);
      return date - d0 < d1 - date ? d0 : d1;
    }
    function ceil(date) {
      step(date = local(new d3_date(date - 1)), 1);
      return date;
    }
    function offset(date, k) {
      step(date = new d3_date(+date), k);
      return date;
    }
    function range(t0, t1, dt) {
      var time = ceil(t0), times = [];
      if (dt > 1) {
        while (time < t1) {
          if (!(number(time) % dt)) times.push(new Date(+time));
          step(time, 1);
        }
      } else {
        while (time < t1) times.push(new Date(+time)), step(time, 1);
      }
      return times;
    }
    function range_utc(t0, t1, dt) {
      try {
        d3_date = d3_date_utc;
        var utc = new d3_date_utc();
        utc._ = t0;
        return range(utc, t1, dt);
      } finally {
        d3_date = Date;
      }
    }
    local.floor = local;
    local.round = round;
    local.ceil = ceil;
    local.offset = offset;
    local.range = range;
    var utc = local.utc = d3_time_interval_utc(local);
    utc.floor = utc;
    utc.round = d3_time_interval_utc(round);
    utc.ceil = d3_time_interval_utc(ceil);
    utc.offset = d3_time_interval_utc(offset);
    utc.range = range_utc;
    return local;
  }
  function d3_time_interval_utc(method) {
    return function(date, k) {
      try {
        d3_date = d3_date_utc;
        var utc = new d3_date_utc();
        utc._ = date;
        return method(utc, k)._;
      } finally {
        d3_date = Date;
      }
    };
  }
  d3_time.year = d3_time_interval(function(date) {
    date = d3_time.day(date);
    date.setMonth(0, 1);
    return date;
  }, function(date, offset) {
    date.setFullYear(date.getFullYear() + offset);
  }, function(date) {
    return date.getFullYear();
  });
  d3_time.years = d3_time.year.range;
  d3_time.years.utc = d3_time.year.utc.range;
  d3_time.day = d3_time_interval(function(date) {
    var day = new d3_date(2e3, 0);
    day.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    return day;
  }, function(date, offset) {
    date.setDate(date.getDate() + offset);
  }, function(date) {
    return date.getDate() - 1;
  });
  d3_time.days = d3_time.day.range;
  d3_time.days.utc = d3_time.day.utc.range;
  d3_time.dayOfYear = function(date) {
    var year = d3_time.year(date);
    return Math.floor((date - year - (date.getTimezoneOffset() - year.getTimezoneOffset()) * 6e4) / 864e5);
  };
  [ "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday" ].forEach(function(day, i) {
    i = 7 - i;
    var interval = d3_time[day] = d3_time_interval(function(date) {
      (date = d3_time.day(date)).setDate(date.getDate() - (date.getDay() + i) % 7);
      return date;
    }, function(date, offset) {
      date.setDate(date.getDate() + Math.floor(offset) * 7);
    }, function(date) {
      var day = d3_time.year(date).getDay();
      return Math.floor((d3_time.dayOfYear(date) + (day + i) % 7) / 7) - (day !== i);
    });
    d3_time[day + "s"] = interval.range;
    d3_time[day + "s"].utc = interval.utc.range;
    d3_time[day + "OfYear"] = function(date) {
      var day = d3_time.year(date).getDay();
      return Math.floor((d3_time.dayOfYear(date) + (day + i) % 7) / 7);
    };
  });
  d3_time.week = d3_time.sunday;
  d3_time.weeks = d3_time.sunday.range;
  d3_time.weeks.utc = d3_time.sunday.utc.range;
  d3_time.weekOfYear = d3_time.sundayOfYear;
  function d3_locale_timeFormat(locale) {
    var locale_dateTime = locale.dateTime, locale_date = locale.date, locale_time = locale.time, locale_periods = locale.periods, locale_days = locale.days, locale_shortDays = locale.shortDays, locale_months = locale.months, locale_shortMonths = locale.shortMonths;
    function d3_time_format(template) {
      var n = template.length;
      function format(date) {
        var string = [], i = -1, j = 0, c, p, f;
        while (++i < n) {
          if (template.charCodeAt(i) === 37) {
            string.push(template.substring(j, i));
            if ((p = d3_time_formatPads[c = template.charAt(++i)]) != null) c = template.charAt(++i);
            if (f = d3_time_formats[c]) c = f(date, p == null ? c === "e" ? " " : "0" : p);
            string.push(c);
            j = i + 1;
          }
        }
        string.push(template.substring(j, i));
        return string.join("");
      }
      format.parse = function(string) {
        var d = {
          y: 1900,
          m: 0,
          d: 1,
          H: 0,
          M: 0,
          S: 0,
          L: 0,
          Z: null
        }, i = d3_time_parse(d, template, string, 0);
        if (i != string.length) return null;
        if ("p" in d) d.H = d.H % 12 + d.p * 12;
        var localZ = d.Z != null && d3_date !== d3_date_utc, date = new (localZ ? d3_date_utc : d3_date)();
        if ("j" in d) date.setFullYear(d.y, 0, d.j); else if ("w" in d && ("W" in d || "U" in d)) {
          date.setFullYear(d.y, 0, 1);
          date.setFullYear(d.y, 0, "W" in d ? (d.w + 6) % 7 + d.W * 7 - (date.getDay() + 5) % 7 : d.w + d.U * 7 - (date.getDay() + 6) % 7);
        } else date.setFullYear(d.y, d.m, d.d);
        date.setHours(d.H + Math.floor(d.Z / 100), d.M + d.Z % 100, d.S, d.L);
        return localZ ? date._ : date;
      };
      format.toString = function() {
        return template;
      };
      return format;
    }
    function d3_time_parse(date, template, string, j) {
      var c, p, t, i = 0, n = template.length, m = string.length;
      while (i < n) {
        if (j >= m) return -1;
        c = template.charCodeAt(i++);
        if (c === 37) {
          t = template.charAt(i++);
          p = d3_time_parsers[t in d3_time_formatPads ? template.charAt(i++) : t];
          if (!p || (j = p(date, string, j)) < 0) return -1;
        } else if (c != string.charCodeAt(j++)) {
          return -1;
        }
      }
      return j;
    }
    d3_time_format.utc = function(template) {
      var local = d3_time_format(template);
      function format(date) {
        try {
          d3_date = d3_date_utc;
          var utc = new d3_date();
          utc._ = date;
          return local(utc);
        } finally {
          d3_date = Date;
        }
      }
      format.parse = function(string) {
        try {
          d3_date = d3_date_utc;
          var date = local.parse(string);
          return date && date._;
        } finally {
          d3_date = Date;
        }
      };
      format.toString = local.toString;
      return format;
    };
    d3_time_format.multi = d3_time_format.utc.multi = d3_time_formatMulti;
    var d3_time_periodLookup = d3.map(), d3_time_dayRe = d3_time_formatRe(locale_days), d3_time_dayLookup = d3_time_formatLookup(locale_days), d3_time_dayAbbrevRe = d3_time_formatRe(locale_shortDays), d3_time_dayAbbrevLookup = d3_time_formatLookup(locale_shortDays), d3_time_monthRe = d3_time_formatRe(locale_months), d3_time_monthLookup = d3_time_formatLookup(locale_months), d3_time_monthAbbrevRe = d3_time_formatRe(locale_shortMonths), d3_time_monthAbbrevLookup = d3_time_formatLookup(locale_shortMonths);
    locale_periods.forEach(function(p, i) {
      d3_time_periodLookup.set(p.toLowerCase(), i);
    });
    var d3_time_formats = {
      a: function(d) {
        return locale_shortDays[d.getDay()];
      },
      A: function(d) {
        return locale_days[d.getDay()];
      },
      b: function(d) {
        return locale_shortMonths[d.getMonth()];
      },
      B: function(d) {
        return locale_months[d.getMonth()];
      },
      c: d3_time_format(locale_dateTime),
      d: function(d, p) {
        return d3_time_formatPad(d.getDate(), p, 2);
      },
      e: function(d, p) {
        return d3_time_formatPad(d.getDate(), p, 2);
      },
      H: function(d, p) {
        return d3_time_formatPad(d.getHours(), p, 2);
      },
      I: function(d, p) {
        return d3_time_formatPad(d.getHours() % 12 || 12, p, 2);
      },
      j: function(d, p) {
        return d3_time_formatPad(1 + d3_time.dayOfYear(d), p, 3);
      },
      L: function(d, p) {
        return d3_time_formatPad(d.getMilliseconds(), p, 3);
      },
      m: function(d, p) {
        return d3_time_formatPad(d.getMonth() + 1, p, 2);
      },
      M: function(d, p) {
        return d3_time_formatPad(d.getMinutes(), p, 2);
      },
      p: function(d) {
        return locale_periods[+(d.getHours() >= 12)];
      },
      S: function(d, p) {
        return d3_time_formatPad(d.getSeconds(), p, 2);
      },
      U: function(d, p) {
        return d3_time_formatPad(d3_time.sundayOfYear(d), p, 2);
      },
      w: function(d) {
        return d.getDay();
      },
      W: function(d, p) {
        return d3_time_formatPad(d3_time.mondayOfYear(d), p, 2);
      },
      x: d3_time_format(locale_date),
      X: d3_time_format(locale_time),
      y: function(d, p) {
        return d3_time_formatPad(d.getFullYear() % 100, p, 2);
      },
      Y: function(d, p) {
        return d3_time_formatPad(d.getFullYear() % 1e4, p, 4);
      },
      Z: d3_time_zone,
      "%": function() {
        return "%";
      }
    };
    var d3_time_parsers = {
      a: d3_time_parseWeekdayAbbrev,
      A: d3_time_parseWeekday,
      b: d3_time_parseMonthAbbrev,
      B: d3_time_parseMonth,
      c: d3_time_parseLocaleFull,
      d: d3_time_parseDay,
      e: d3_time_parseDay,
      H: d3_time_parseHour24,
      I: d3_time_parseHour24,
      j: d3_time_parseDayOfYear,
      L: d3_time_parseMilliseconds,
      m: d3_time_parseMonthNumber,
      M: d3_time_parseMinutes,
      p: d3_time_parseAmPm,
      S: d3_time_parseSeconds,
      U: d3_time_parseWeekNumberSunday,
      w: d3_time_parseWeekdayNumber,
      W: d3_time_parseWeekNumberMonday,
      x: d3_time_parseLocaleDate,
      X: d3_time_parseLocaleTime,
      y: d3_time_parseYear,
      Y: d3_time_parseFullYear,
      Z: d3_time_parseZone,
      "%": d3_time_parseLiteralPercent
    };
    function d3_time_parseWeekdayAbbrev(date, string, i) {
      d3_time_dayAbbrevRe.lastIndex = 0;
      var n = d3_time_dayAbbrevRe.exec(string.substring(i));
      return n ? (date.w = d3_time_dayAbbrevLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseWeekday(date, string, i) {
      d3_time_dayRe.lastIndex = 0;
      var n = d3_time_dayRe.exec(string.substring(i));
      return n ? (date.w = d3_time_dayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseMonthAbbrev(date, string, i) {
      d3_time_monthAbbrevRe.lastIndex = 0;
      var n = d3_time_monthAbbrevRe.exec(string.substring(i));
      return n ? (date.m = d3_time_monthAbbrevLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseMonth(date, string, i) {
      d3_time_monthRe.lastIndex = 0;
      var n = d3_time_monthRe.exec(string.substring(i));
      return n ? (date.m = d3_time_monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseLocaleFull(date, string, i) {
      return d3_time_parse(date, d3_time_formats.c.toString(), string, i);
    }
    function d3_time_parseLocaleDate(date, string, i) {
      return d3_time_parse(date, d3_time_formats.x.toString(), string, i);
    }
    function d3_time_parseLocaleTime(date, string, i) {
      return d3_time_parse(date, d3_time_formats.X.toString(), string, i);
    }
    function d3_time_parseAmPm(date, string, i) {
      var n = d3_time_periodLookup.get(string.substring(i, i += 2).toLowerCase());
      return n == null ? -1 : (date.p = n, i);
    }
    return d3_time_format;
  }
  var d3_time_formatPads = {
    "-": "",
    _: " ",
    "0": "0"
  }, d3_time_numberRe = /^\s*\d+/, d3_time_percentRe = /^%/;
  function d3_time_formatPad(value, fill, width) {
    var sign = value < 0 ? "-" : "", string = (sign ? -value : value) + "", length = string.length;
    return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
  }
  function d3_time_formatRe(names) {
    return new RegExp("^(?:" + names.map(d3.requote).join("|") + ")", "i");
  }
  function d3_time_formatLookup(names) {
    var map = new d3_Map(), i = -1, n = names.length;
    while (++i < n) map.set(names[i].toLowerCase(), i);
    return map;
  }
  function d3_time_parseWeekdayNumber(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 1));
    return n ? (date.w = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseWeekNumberSunday(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i));
    return n ? (date.U = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseWeekNumberMonday(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i));
    return n ? (date.W = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseFullYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 4));
    return n ? (date.y = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.y = d3_time_expandYear(+n[0]), i + n[0].length) : -1;
  }
  function d3_time_parseZone(date, string, i) {
    return /^[+-]\d{4}$/.test(string = string.substring(i, i + 5)) ? (date.Z = -string, 
    i + 5) : -1;
  }
  function d3_time_expandYear(d) {
    return d + (d > 68 ? 1900 : 2e3);
  }
  function d3_time_parseMonthNumber(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.m = n[0] - 1, i + n[0].length) : -1;
  }
  function d3_time_parseDay(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.d = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseDayOfYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 3));
    return n ? (date.j = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseHour24(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.H = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseMinutes(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.M = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseSeconds(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.S = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseMilliseconds(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 3));
    return n ? (date.L = +n[0], i + n[0].length) : -1;
  }
  function d3_time_zone(d) {
    var z = d.getTimezoneOffset(), zs = z > 0 ? "-" : "+", zh = ~~(abs(z) / 60), zm = abs(z) % 60;
    return zs + d3_time_formatPad(zh, "0", 2) + d3_time_formatPad(zm, "0", 2);
  }
  function d3_time_parseLiteralPercent(date, string, i) {
    d3_time_percentRe.lastIndex = 0;
    var n = d3_time_percentRe.exec(string.substring(i, i + 1));
    return n ? i + n[0].length : -1;
  }
  function d3_time_formatMulti(formats) {
    var n = formats.length, i = -1;
    while (++i < n) formats[i][0] = this(formats[i][0]);
    return function(date) {
      var i = 0, f = formats[i];
      while (!f[1](date)) f = formats[++i];
      return f[0](date);
    };
  }
  d3.locale = function(locale) {
    return {
      numberFormat: d3_locale_numberFormat(locale),
      timeFormat: d3_locale_timeFormat(locale)
    };
  };
  var d3_locale_enUS = d3.locale({
    decimal: ".",
    thousands: ",",
    grouping: [ 3 ],
    currency: [ "$", "" ],
    dateTime: "%a %b %e %X %Y",
    date: "%m/%d/%Y",
    time: "%H:%M:%S",
    periods: [ "AM", "PM" ],
    days: [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
    shortDays: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
    months: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
    shortMonths: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ]
  });
  d3.format = d3_locale_enUS.numberFormat;
  d3.geo = {};
  function d3_adder() {}
  d3_adder.prototype = {
    s: 0,
    t: 0,
    add: function(y) {
      d3_adderSum(y, this.t, d3_adderTemp);
      d3_adderSum(d3_adderTemp.s, this.s, this);
      if (this.s) this.t += d3_adderTemp.t; else this.s = d3_adderTemp.t;
    },
    reset: function() {
      this.s = this.t = 0;
    },
    valueOf: function() {
      return this.s;
    }
  };
  var d3_adderTemp = new d3_adder();
  function d3_adderSum(a, b, o) {
    var x = o.s = a + b, bv = x - a, av = x - bv;
    o.t = a - av + (b - bv);
  }
  d3.geo.stream = function(object, listener) {
    if (object && d3_geo_streamObjectType.hasOwnProperty(object.type)) {
      d3_geo_streamObjectType[object.type](object, listener);
    } else {
      d3_geo_streamGeometry(object, listener);
    }
  };
  function d3_geo_streamGeometry(geometry, listener) {
    if (geometry && d3_geo_streamGeometryType.hasOwnProperty(geometry.type)) {
      d3_geo_streamGeometryType[geometry.type](geometry, listener);
    }
  }
  var d3_geo_streamObjectType = {
    Feature: function(feature, listener) {
      d3_geo_streamGeometry(feature.geometry, listener);
    },
    FeatureCollection: function(object, listener) {
      var features = object.features, i = -1, n = features.length;
      while (++i < n) d3_geo_streamGeometry(features[i].geometry, listener);
    }
  };
  var d3_geo_streamGeometryType = {
    Sphere: function(object, listener) {
      listener.sphere();
    },
    Point: function(object, listener) {
      object = object.coordinates;
      listener.point(object[0], object[1], object[2]);
    },
    MultiPoint: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) object = coordinates[i], listener.point(object[0], object[1], object[2]);
    },
    LineString: function(object, listener) {
      d3_geo_streamLine(object.coordinates, listener, 0);
    },
    MultiLineString: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) d3_geo_streamLine(coordinates[i], listener, 0);
    },
    Polygon: function(object, listener) {
      d3_geo_streamPolygon(object.coordinates, listener);
    },
    MultiPolygon: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) d3_geo_streamPolygon(coordinates[i], listener);
    },
    GeometryCollection: function(object, listener) {
      var geometries = object.geometries, i = -1, n = geometries.length;
      while (++i < n) d3_geo_streamGeometry(geometries[i], listener);
    }
  };
  function d3_geo_streamLine(coordinates, listener, closed) {
    var i = -1, n = coordinates.length - closed, coordinate;
    listener.lineStart();
    while (++i < n) coordinate = coordinates[i], listener.point(coordinate[0], coordinate[1], coordinate[2]);
    listener.lineEnd();
  }
  function d3_geo_streamPolygon(coordinates, listener) {
    var i = -1, n = coordinates.length;
    listener.polygonStart();
    while (++i < n) d3_geo_streamLine(coordinates[i], listener, 1);
    listener.polygonEnd();
  }
  d3.geo.area = function(object) {
    d3_geo_areaSum = 0;
    d3.geo.stream(object, d3_geo_area);
    return d3_geo_areaSum;
  };
  var d3_geo_areaSum, d3_geo_areaRingSum = new d3_adder();
  var d3_geo_area = {
    sphere: function() {
      d3_geo_areaSum += 4 * π;
    },
    point: d3_noop,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: function() {
      d3_geo_areaRingSum.reset();
      d3_geo_area.lineStart = d3_geo_areaRingStart;
    },
    polygonEnd: function() {
      var area = 2 * d3_geo_areaRingSum;
      d3_geo_areaSum += area < 0 ? 4 * π + area : area;
      d3_geo_area.lineStart = d3_geo_area.lineEnd = d3_geo_area.point = d3_noop;
    }
  };
  function d3_geo_areaRingStart() {
    var λ00, φ00, λ0, cosφ0, sinφ0;
    d3_geo_area.point = function(λ, φ) {
      d3_geo_area.point = nextPoint;
      λ0 = (λ00 = λ) * d3_radians, cosφ0 = Math.cos(φ = (φ00 = φ) * d3_radians / 2 + π / 4), 
      sinφ0 = Math.sin(φ);
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      φ = φ * d3_radians / 2 + π / 4;
      var dλ = λ - λ0, sdλ = dλ >= 0 ? 1 : -1, adλ = sdλ * dλ, cosφ = Math.cos(φ), sinφ = Math.sin(φ), k = sinφ0 * sinφ, u = cosφ0 * cosφ + k * Math.cos(adλ), v = k * sdλ * Math.sin(adλ);
      d3_geo_areaRingSum.add(Math.atan2(v, u));
      λ0 = λ, cosφ0 = cosφ, sinφ0 = sinφ;
    }
    d3_geo_area.lineEnd = function() {
      nextPoint(λ00, φ00);
    };
  }
  function d3_geo_cartesian(spherical) {
    var λ = spherical[0], φ = spherical[1], cosφ = Math.cos(φ);
    return [ cosφ * Math.cos(λ), cosφ * Math.sin(λ), Math.sin(φ) ];
  }
  function d3_geo_cartesianDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function d3_geo_cartesianCross(a, b) {
    return [ a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0] ];
  }
  function d3_geo_cartesianAdd(a, b) {
    a[0] += b[0];
    a[1] += b[1];
    a[2] += b[2];
  }
  function d3_geo_cartesianScale(vector, k) {
    return [ vector[0] * k, vector[1] * k, vector[2] * k ];
  }
  function d3_geo_cartesianNormalize(d) {
    var l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
    d[0] /= l;
    d[1] /= l;
    d[2] /= l;
  }
  function d3_geo_spherical(cartesian) {
    return [ Math.atan2(cartesian[1], cartesian[0]), d3_asin(cartesian[2]) ];
  }
  function d3_geo_sphericalEqual(a, b) {
    return abs(a[0] - b[0]) < ε && abs(a[1] - b[1]) < ε;
  }
  d3.geo.bounds = function() {
    var λ0, φ0, λ1, φ1, λ_, λ__, φ__, p0, dλSum, ranges, range;
    var bound = {
      point: point,
      lineStart: lineStart,
      lineEnd: lineEnd,
      polygonStart: function() {
        bound.point = ringPoint;
        bound.lineStart = ringStart;
        bound.lineEnd = ringEnd;
        dλSum = 0;
        d3_geo_area.polygonStart();
      },
      polygonEnd: function() {
        d3_geo_area.polygonEnd();
        bound.point = point;
        bound.lineStart = lineStart;
        bound.lineEnd = lineEnd;
        if (d3_geo_areaRingSum < 0) λ0 = -(λ1 = 180), φ0 = -(φ1 = 90); else if (dλSum > ε) φ1 = 90; else if (dλSum < -ε) φ0 = -90;
        range[0] = λ0, range[1] = λ1;
      }
    };
    function point(λ, φ) {
      ranges.push(range = [ λ0 = λ, λ1 = λ ]);
      if (φ < φ0) φ0 = φ;
      if (φ > φ1) φ1 = φ;
    }
    function linePoint(λ, φ) {
      var p = d3_geo_cartesian([ λ * d3_radians, φ * d3_radians ]);
      if (p0) {
        var normal = d3_geo_cartesianCross(p0, p), equatorial = [ normal[1], -normal[0], 0 ], inflection = d3_geo_cartesianCross(equatorial, normal);
        d3_geo_cartesianNormalize(inflection);
        inflection = d3_geo_spherical(inflection);
        var dλ = λ - λ_, s = dλ > 0 ? 1 : -1, λi = inflection[0] * d3_degrees * s, antimeridian = abs(dλ) > 180;
        if (antimeridian ^ (s * λ_ < λi && λi < s * λ)) {
          var φi = inflection[1] * d3_degrees;
          if (φi > φ1) φ1 = φi;
        } else if (λi = (λi + 360) % 360 - 180, antimeridian ^ (s * λ_ < λi && λi < s * λ)) {
          var φi = -inflection[1] * d3_degrees;
          if (φi < φ0) φ0 = φi;
        } else {
          if (φ < φ0) φ0 = φ;
          if (φ > φ1) φ1 = φ;
        }
        if (antimeridian) {
          if (λ < λ_) {
            if (angle(λ0, λ) > angle(λ0, λ1)) λ1 = λ;
          } else {
            if (angle(λ, λ1) > angle(λ0, λ1)) λ0 = λ;
          }
        } else {
          if (λ1 >= λ0) {
            if (λ < λ0) λ0 = λ;
            if (λ > λ1) λ1 = λ;
          } else {
            if (λ > λ_) {
              if (angle(λ0, λ) > angle(λ0, λ1)) λ1 = λ;
            } else {
              if (angle(λ, λ1) > angle(λ0, λ1)) λ0 = λ;
            }
          }
        }
      } else {
        point(λ, φ);
      }
      p0 = p, λ_ = λ;
    }
    function lineStart() {
      bound.point = linePoint;
    }
    function lineEnd() {
      range[0] = λ0, range[1] = λ1;
      bound.point = point;
      p0 = null;
    }
    function ringPoint(λ, φ) {
      if (p0) {
        var dλ = λ - λ_;
        dλSum += abs(dλ) > 180 ? dλ + (dλ > 0 ? 360 : -360) : dλ;
      } else λ__ = λ, φ__ = φ;
      d3_geo_area.point(λ, φ);
      linePoint(λ, φ);
    }
    function ringStart() {
      d3_geo_area.lineStart();
    }
    function ringEnd() {
      ringPoint(λ__, φ__);
      d3_geo_area.lineEnd();
      if (abs(dλSum) > ε) λ0 = -(λ1 = 180);
      range[0] = λ0, range[1] = λ1;
      p0 = null;
    }
    function angle(λ0, λ1) {
      return (λ1 -= λ0) < 0 ? λ1 + 360 : λ1;
    }
    function compareRanges(a, b) {
      return a[0] - b[0];
    }
    function withinRange(x, range) {
      return range[0] <= range[1] ? range[0] <= x && x <= range[1] : x < range[0] || range[1] < x;
    }
    return function(feature) {
      φ1 = λ1 = -(λ0 = φ0 = Infinity);
      ranges = [];
      d3.geo.stream(feature, bound);
      var n = ranges.length;
      if (n) {
        ranges.sort(compareRanges);
        for (var i = 1, a = ranges[0], b, merged = [ a ]; i < n; ++i) {
          b = ranges[i];
          if (withinRange(b[0], a) || withinRange(b[1], a)) {
            if (angle(a[0], b[1]) > angle(a[0], a[1])) a[1] = b[1];
            if (angle(b[0], a[1]) > angle(a[0], a[1])) a[0] = b[0];
          } else {
            merged.push(a = b);
          }
        }
        var best = -Infinity, dλ;
        for (var n = merged.length - 1, i = 0, a = merged[n], b; i <= n; a = b, ++i) {
          b = merged[i];
          if ((dλ = angle(a[1], b[0])) > best) best = dλ, λ0 = b[0], λ1 = a[1];
        }
      }
      ranges = range = null;
      return λ0 === Infinity || φ0 === Infinity ? [ [ NaN, NaN ], [ NaN, NaN ] ] : [ [ λ0, φ0 ], [ λ1, φ1 ] ];
    };
  }();
  d3.geo.centroid = function(object) {
    d3_geo_centroidW0 = d3_geo_centroidW1 = d3_geo_centroidX0 = d3_geo_centroidY0 = d3_geo_centroidZ0 = d3_geo_centroidX1 = d3_geo_centroidY1 = d3_geo_centroidZ1 = d3_geo_centroidX2 = d3_geo_centroidY2 = d3_geo_centroidZ2 = 0;
    d3.geo.stream(object, d3_geo_centroid);
    var x = d3_geo_centroidX2, y = d3_geo_centroidY2, z = d3_geo_centroidZ2, m = x * x + y * y + z * z;
    if (m < ε2) {
      x = d3_geo_centroidX1, y = d3_geo_centroidY1, z = d3_geo_centroidZ1;
      if (d3_geo_centroidW1 < ε) x = d3_geo_centroidX0, y = d3_geo_centroidY0, z = d3_geo_centroidZ0;
      m = x * x + y * y + z * z;
      if (m < ε2) return [ NaN, NaN ];
    }
    return [ Math.atan2(y, x) * d3_degrees, d3_asin(z / Math.sqrt(m)) * d3_degrees ];
  };
  var d3_geo_centroidW0, d3_geo_centroidW1, d3_geo_centroidX0, d3_geo_centroidY0, d3_geo_centroidZ0, d3_geo_centroidX1, d3_geo_centroidY1, d3_geo_centroidZ1, d3_geo_centroidX2, d3_geo_centroidY2, d3_geo_centroidZ2;
  var d3_geo_centroid = {
    sphere: d3_noop,
    point: d3_geo_centroidPoint,
    lineStart: d3_geo_centroidLineStart,
    lineEnd: d3_geo_centroidLineEnd,
    polygonStart: function() {
      d3_geo_centroid.lineStart = d3_geo_centroidRingStart;
    },
    polygonEnd: function() {
      d3_geo_centroid.lineStart = d3_geo_centroidLineStart;
    }
  };
  function d3_geo_centroidPoint(λ, φ) {
    λ *= d3_radians;
    var cosφ = Math.cos(φ *= d3_radians);
    d3_geo_centroidPointXYZ(cosφ * Math.cos(λ), cosφ * Math.sin(λ), Math.sin(φ));
  }
  function d3_geo_centroidPointXYZ(x, y, z) {
    ++d3_geo_centroidW0;
    d3_geo_centroidX0 += (x - d3_geo_centroidX0) / d3_geo_centroidW0;
    d3_geo_centroidY0 += (y - d3_geo_centroidY0) / d3_geo_centroidW0;
    d3_geo_centroidZ0 += (z - d3_geo_centroidZ0) / d3_geo_centroidW0;
  }
  function d3_geo_centroidLineStart() {
    var x0, y0, z0;
    d3_geo_centroid.point = function(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians);
      x0 = cosφ * Math.cos(λ);
      y0 = cosφ * Math.sin(λ);
      z0 = Math.sin(φ);
      d3_geo_centroid.point = nextPoint;
      d3_geo_centroidPointXYZ(x0, y0, z0);
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians), x = cosφ * Math.cos(λ), y = cosφ * Math.sin(λ), z = Math.sin(φ), w = Math.atan2(Math.sqrt((w = y0 * z - z0 * y) * w + (w = z0 * x - x0 * z) * w + (w = x0 * y - y0 * x) * w), x0 * x + y0 * y + z0 * z);
      d3_geo_centroidW1 += w;
      d3_geo_centroidX1 += w * (x0 + (x0 = x));
      d3_geo_centroidY1 += w * (y0 + (y0 = y));
      d3_geo_centroidZ1 += w * (z0 + (z0 = z));
      d3_geo_centroidPointXYZ(x0, y0, z0);
    }
  }
  function d3_geo_centroidLineEnd() {
    d3_geo_centroid.point = d3_geo_centroidPoint;
  }
  function d3_geo_centroidRingStart() {
    var λ00, φ00, x0, y0, z0;
    d3_geo_centroid.point = function(λ, φ) {
      λ00 = λ, φ00 = φ;
      d3_geo_centroid.point = nextPoint;
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians);
      x0 = cosφ * Math.cos(λ);
      y0 = cosφ * Math.sin(λ);
      z0 = Math.sin(φ);
      d3_geo_centroidPointXYZ(x0, y0, z0);
    };
    d3_geo_centroid.lineEnd = function() {
      nextPoint(λ00, φ00);
      d3_geo_centroid.lineEnd = d3_geo_centroidLineEnd;
      d3_geo_centroid.point = d3_geo_centroidPoint;
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians), x = cosφ * Math.cos(λ), y = cosφ * Math.sin(λ), z = Math.sin(φ), cx = y0 * z - z0 * y, cy = z0 * x - x0 * z, cz = x0 * y - y0 * x, m = Math.sqrt(cx * cx + cy * cy + cz * cz), u = x0 * x + y0 * y + z0 * z, v = m && -d3_acos(u) / m, w = Math.atan2(m, u);
      d3_geo_centroidX2 += v * cx;
      d3_geo_centroidY2 += v * cy;
      d3_geo_centroidZ2 += v * cz;
      d3_geo_centroidW1 += w;
      d3_geo_centroidX1 += w * (x0 + (x0 = x));
      d3_geo_centroidY1 += w * (y0 + (y0 = y));
      d3_geo_centroidZ1 += w * (z0 + (z0 = z));
      d3_geo_centroidPointXYZ(x0, y0, z0);
    }
  }
  function d3_true() {
    return true;
  }
  function d3_geo_clipPolygon(segments, compare, clipStartInside, interpolate, listener) {
    var subject = [], clip = [];
    segments.forEach(function(segment) {
      if ((n = segment.length - 1) <= 0) return;
      var n, p0 = segment[0], p1 = segment[n];
      if (d3_geo_sphericalEqual(p0, p1)) {
        listener.lineStart();
        for (var i = 0; i < n; ++i) listener.point((p0 = segment[i])[0], p0[1]);
        listener.lineEnd();
        return;
      }
      var a = new d3_geo_clipPolygonIntersection(p0, segment, null, true), b = new d3_geo_clipPolygonIntersection(p0, null, a, false);
      a.o = b;
      subject.push(a);
      clip.push(b);
      a = new d3_geo_clipPolygonIntersection(p1, segment, null, false);
      b = new d3_geo_clipPolygonIntersection(p1, null, a, true);
      a.o = b;
      subject.push(a);
      clip.push(b);
    });
    clip.sort(compare);
    d3_geo_clipPolygonLinkCircular(subject);
    d3_geo_clipPolygonLinkCircular(clip);
    if (!subject.length) return;
    for (var i = 0, entry = clipStartInside, n = clip.length; i < n; ++i) {
      clip[i].e = entry = !entry;
    }
    var start = subject[0], points, point;
    while (1) {
      var current = start, isSubject = true;
      while (current.v) if ((current = current.n) === start) return;
      points = current.z;
      listener.lineStart();
      do {
        current.v = current.o.v = true;
        if (current.e) {
          if (isSubject) {
            for (var i = 0, n = points.length; i < n; ++i) listener.point((point = points[i])[0], point[1]);
          } else {
            interpolate(current.x, current.n.x, 1, listener);
          }
          current = current.n;
        } else {
          if (isSubject) {
            points = current.p.z;
            for (var i = points.length - 1; i >= 0; --i) listener.point((point = points[i])[0], point[1]);
          } else {
            interpolate(current.x, current.p.x, -1, listener);
          }
          current = current.p;
        }
        current = current.o;
        points = current.z;
        isSubject = !isSubject;
      } while (!current.v);
      listener.lineEnd();
    }
  }
  function d3_geo_clipPolygonLinkCircular(array) {
    if (!(n = array.length)) return;
    var n, i = 0, a = array[0], b;
    while (++i < n) {
      a.n = b = array[i];
      b.p = a;
      a = b;
    }
    a.n = b = array[0];
    b.p = a;
  }
  function d3_geo_clipPolygonIntersection(point, points, other, entry) {
    this.x = point;
    this.z = points;
    this.o = other;
    this.e = entry;
    this.v = false;
    this.n = this.p = null;
  }
  function d3_geo_clip(pointVisible, clipLine, interpolate, clipStart) {
    return function(rotate, listener) {
      var line = clipLine(listener), rotatedClipStart = rotate.invert(clipStart[0], clipStart[1]);
      var clip = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          clip.point = pointRing;
          clip.lineStart = ringStart;
          clip.lineEnd = ringEnd;
          segments = [];
          polygon = [];
        },
        polygonEnd: function() {
          clip.point = point;
          clip.lineStart = lineStart;
          clip.lineEnd = lineEnd;
          segments = d3.merge(segments);
          var clipStartInside = d3_geo_pointInPolygon(rotatedClipStart, polygon);
          if (segments.length) {
            if (!polygonStarted) listener.polygonStart(), polygonStarted = true;
            d3_geo_clipPolygon(segments, d3_geo_clipSort, clipStartInside, interpolate, listener);
          } else if (clipStartInside) {
            if (!polygonStarted) listener.polygonStart(), polygonStarted = true;
            listener.lineStart();
            interpolate(null, null, 1, listener);
            listener.lineEnd();
          }
          if (polygonStarted) listener.polygonEnd(), polygonStarted = false;
          segments = polygon = null;
        },
        sphere: function() {
          listener.polygonStart();
          listener.lineStart();
          interpolate(null, null, 1, listener);
          listener.lineEnd();
          listener.polygonEnd();
        }
      };
      function point(λ, φ) {
        var point = rotate(λ, φ);
        if (pointVisible(λ = point[0], φ = point[1])) listener.point(λ, φ);
      }
      function pointLine(λ, φ) {
        var point = rotate(λ, φ);
        line.point(point[0], point[1]);
      }
      function lineStart() {
        clip.point = pointLine;
        line.lineStart();
      }
      function lineEnd() {
        clip.point = point;
        line.lineEnd();
      }
      var segments;
      var buffer = d3_geo_clipBufferListener(), ringListener = clipLine(buffer), polygonStarted = false, polygon, ring;
      function pointRing(λ, φ) {
        ring.push([ λ, φ ]);
        var point = rotate(λ, φ);
        ringListener.point(point[0], point[1]);
      }
      function ringStart() {
        ringListener.lineStart();
        ring = [];
      }
      function ringEnd() {
        pointRing(ring[0][0], ring[0][1]);
        ringListener.lineEnd();
        var clean = ringListener.clean(), ringSegments = buffer.buffer(), segment, n = ringSegments.length;
        ring.pop();
        polygon.push(ring);
        ring = null;
        if (!n) return;
        if (clean & 1) {
          segment = ringSegments[0];
          var n = segment.length - 1, i = -1, point;
          if (n > 0) {
            if (!polygonStarted) listener.polygonStart(), polygonStarted = true;
            listener.lineStart();
            while (++i < n) listener.point((point = segment[i])[0], point[1]);
            listener.lineEnd();
          }
          return;
        }
        if (n > 1 && clean & 2) ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));
        segments.push(ringSegments.filter(d3_geo_clipSegmentLength1));
      }
      return clip;
    };
  }
  function d3_geo_clipSegmentLength1(segment) {
    return segment.length > 1;
  }
  function d3_geo_clipBufferListener() {
    var lines = [], line;
    return {
      lineStart: function() {
        lines.push(line = []);
      },
      point: function(λ, φ) {
        line.push([ λ, φ ]);
      },
      lineEnd: d3_noop,
      buffer: function() {
        var buffer = lines;
        lines = [];
        line = null;
        return buffer;
      },
      rejoin: function() {
        if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
      }
    };
  }
  function d3_geo_clipSort(a, b) {
    return ((a = a.x)[0] < 0 ? a[1] - halfπ - ε : halfπ - a[1]) - ((b = b.x)[0] < 0 ? b[1] - halfπ - ε : halfπ - b[1]);
  }
  function d3_geo_pointInPolygon(point, polygon) {
    var meridian = point[0], parallel = point[1], meridianNormal = [ Math.sin(meridian), -Math.cos(meridian), 0 ], polarAngle = 0, winding = 0;
    d3_geo_areaRingSum.reset();
    for (var i = 0, n = polygon.length; i < n; ++i) {
      var ring = polygon[i], m = ring.length;
      if (!m) continue;
      var point0 = ring[0], λ0 = point0[0], φ0 = point0[1] / 2 + π / 4, sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), j = 1;
      while (true) {
        if (j === m) j = 0;
        point = ring[j];
        var λ = point[0], φ = point[1] / 2 + π / 4, sinφ = Math.sin(φ), cosφ = Math.cos(φ), dλ = λ - λ0, sdλ = dλ >= 0 ? 1 : -1, adλ = sdλ * dλ, antimeridian = adλ > π, k = sinφ0 * sinφ;
        d3_geo_areaRingSum.add(Math.atan2(k * sdλ * Math.sin(adλ), cosφ0 * cosφ + k * Math.cos(adλ)));
        polarAngle += antimeridian ? dλ + sdλ * τ : dλ;
        if (antimeridian ^ λ0 >= meridian ^ λ >= meridian) {
          var arc = d3_geo_cartesianCross(d3_geo_cartesian(point0), d3_geo_cartesian(point));
          d3_geo_cartesianNormalize(arc);
          var intersection = d3_geo_cartesianCross(meridianNormal, arc);
          d3_geo_cartesianNormalize(intersection);
          var φarc = (antimeridian ^ dλ >= 0 ? -1 : 1) * d3_asin(intersection[2]);
          if (parallel > φarc || parallel === φarc && (arc[0] || arc[1])) {
            winding += antimeridian ^ dλ >= 0 ? 1 : -1;
          }
        }
        if (!j++) break;
        λ0 = λ, sinφ0 = sinφ, cosφ0 = cosφ, point0 = point;
      }
    }
    return (polarAngle < -ε || polarAngle < ε && d3_geo_areaRingSum < 0) ^ winding & 1;
  }
  var d3_geo_clipAntimeridian = d3_geo_clip(d3_true, d3_geo_clipAntimeridianLine, d3_geo_clipAntimeridianInterpolate, [ -π, -π / 2 ]);
  function d3_geo_clipAntimeridianLine(listener) {
    var λ0 = NaN, φ0 = NaN, sλ0 = NaN, clean;
    return {
      lineStart: function() {
        listener.lineStart();
        clean = 1;
      },
      point: function(λ1, φ1) {
        var sλ1 = λ1 > 0 ? π : -π, dλ = abs(λ1 - λ0);
        if (abs(dλ - π) < ε) {
          listener.point(λ0, φ0 = (φ0 + φ1) / 2 > 0 ? halfπ : -halfπ);
          listener.point(sλ0, φ0);
          listener.lineEnd();
          listener.lineStart();
          listener.point(sλ1, φ0);
          listener.point(λ1, φ0);
          clean = 0;
        } else if (sλ0 !== sλ1 && dλ >= π) {
          if (abs(λ0 - sλ0) < ε) λ0 -= sλ0 * ε;
          if (abs(λ1 - sλ1) < ε) λ1 -= sλ1 * ε;
          φ0 = d3_geo_clipAntimeridianIntersect(λ0, φ0, λ1, φ1);
          listener.point(sλ0, φ0);
          listener.lineEnd();
          listener.lineStart();
          listener.point(sλ1, φ0);
          clean = 0;
        }
        listener.point(λ0 = λ1, φ0 = φ1);
        sλ0 = sλ1;
      },
      lineEnd: function() {
        listener.lineEnd();
        λ0 = φ0 = NaN;
      },
      clean: function() {
        return 2 - clean;
      }
    };
  }
  function d3_geo_clipAntimeridianIntersect(λ0, φ0, λ1, φ1) {
    var cosφ0, cosφ1, sinλ0_λ1 = Math.sin(λ0 - λ1);
    return abs(sinλ0_λ1) > ε ? Math.atan((Math.sin(φ0) * (cosφ1 = Math.cos(φ1)) * Math.sin(λ1) - Math.sin(φ1) * (cosφ0 = Math.cos(φ0)) * Math.sin(λ0)) / (cosφ0 * cosφ1 * sinλ0_λ1)) : (φ0 + φ1) / 2;
  }
  function d3_geo_clipAntimeridianInterpolate(from, to, direction, listener) {
    var φ;
    if (from == null) {
      φ = direction * halfπ;
      listener.point(-π, φ);
      listener.point(0, φ);
      listener.point(π, φ);
      listener.point(π, 0);
      listener.point(π, -φ);
      listener.point(0, -φ);
      listener.point(-π, -φ);
      listener.point(-π, 0);
      listener.point(-π, φ);
    } else if (abs(from[0] - to[0]) > ε) {
      var s = from[0] < to[0] ? π : -π;
      φ = direction * s / 2;
      listener.point(-s, φ);
      listener.point(0, φ);
      listener.point(s, φ);
    } else {
      listener.point(to[0], to[1]);
    }
  }
  function d3_geo_clipCircle(radius) {
    var cr = Math.cos(radius), smallRadius = cr > 0, notHemisphere = abs(cr) > ε, interpolate = d3_geo_circleInterpolate(radius, 6 * d3_radians);
    return d3_geo_clip(visible, clipLine, interpolate, smallRadius ? [ 0, -radius ] : [ -π, radius - π ]);
    function visible(λ, φ) {
      return Math.cos(λ) * Math.cos(φ) > cr;
    }
    function clipLine(listener) {
      var point0, c0, v0, v00, clean;
      return {
        lineStart: function() {
          v00 = v0 = false;
          clean = 1;
        },
        point: function(λ, φ) {
          var point1 = [ λ, φ ], point2, v = visible(λ, φ), c = smallRadius ? v ? 0 : code(λ, φ) : v ? code(λ + (λ < 0 ? π : -π), φ) : 0;
          if (!point0 && (v00 = v0 = v)) listener.lineStart();
          if (v !== v0) {
            point2 = intersect(point0, point1);
            if (d3_geo_sphericalEqual(point0, point2) || d3_geo_sphericalEqual(point1, point2)) {
              point1[0] += ε;
              point1[1] += ε;
              v = visible(point1[0], point1[1]);
            }
          }
          if (v !== v0) {
            clean = 0;
            if (v) {
              listener.lineStart();
              point2 = intersect(point1, point0);
              listener.point(point2[0], point2[1]);
            } else {
              point2 = intersect(point0, point1);
              listener.point(point2[0], point2[1]);
              listener.lineEnd();
            }
            point0 = point2;
          } else if (notHemisphere && point0 && smallRadius ^ v) {
            var t;
            if (!(c & c0) && (t = intersect(point1, point0, true))) {
              clean = 0;
              if (smallRadius) {
                listener.lineStart();
                listener.point(t[0][0], t[0][1]);
                listener.point(t[1][0], t[1][1]);
                listener.lineEnd();
              } else {
                listener.point(t[1][0], t[1][1]);
                listener.lineEnd();
                listener.lineStart();
                listener.point(t[0][0], t[0][1]);
              }
            }
          }
          if (v && (!point0 || !d3_geo_sphericalEqual(point0, point1))) {
            listener.point(point1[0], point1[1]);
          }
          point0 = point1, v0 = v, c0 = c;
        },
        lineEnd: function() {
          if (v0) listener.lineEnd();
          point0 = null;
        },
        clean: function() {
          return clean | (v00 && v0) << 1;
        }
      };
    }
    function intersect(a, b, two) {
      var pa = d3_geo_cartesian(a), pb = d3_geo_cartesian(b);
      var n1 = [ 1, 0, 0 ], n2 = d3_geo_cartesianCross(pa, pb), n2n2 = d3_geo_cartesianDot(n2, n2), n1n2 = n2[0], determinant = n2n2 - n1n2 * n1n2;
      if (!determinant) return !two && a;
      var c1 = cr * n2n2 / determinant, c2 = -cr * n1n2 / determinant, n1xn2 = d3_geo_cartesianCross(n1, n2), A = d3_geo_cartesianScale(n1, c1), B = d3_geo_cartesianScale(n2, c2);
      d3_geo_cartesianAdd(A, B);
      var u = n1xn2, w = d3_geo_cartesianDot(A, u), uu = d3_geo_cartesianDot(u, u), t2 = w * w - uu * (d3_geo_cartesianDot(A, A) - 1);
      if (t2 < 0) return;
      var t = Math.sqrt(t2), q = d3_geo_cartesianScale(u, (-w - t) / uu);
      d3_geo_cartesianAdd(q, A);
      q = d3_geo_spherical(q);
      if (!two) return q;
      var λ0 = a[0], λ1 = b[0], φ0 = a[1], φ1 = b[1], z;
      if (λ1 < λ0) z = λ0, λ0 = λ1, λ1 = z;
      var δλ = λ1 - λ0, polar = abs(δλ - π) < ε, meridian = polar || δλ < ε;
      if (!polar && φ1 < φ0) z = φ0, φ0 = φ1, φ1 = z;
      if (meridian ? polar ? φ0 + φ1 > 0 ^ q[1] < (abs(q[0] - λ0) < ε ? φ0 : φ1) : φ0 <= q[1] && q[1] <= φ1 : δλ > π ^ (λ0 <= q[0] && q[0] <= λ1)) {
        var q1 = d3_geo_cartesianScale(u, (-w + t) / uu);
        d3_geo_cartesianAdd(q1, A);
        return [ q, d3_geo_spherical(q1) ];
      }
    }
    function code(λ, φ) {
      var r = smallRadius ? radius : π - radius, code = 0;
      if (λ < -r) code |= 1; else if (λ > r) code |= 2;
      if (φ < -r) code |= 4; else if (φ > r) code |= 8;
      return code;
    }
  }
  function d3_geom_clipLine(x0, y0, x1, y1) {
    return function(line) {
      var a = line.a, b = line.b, ax = a.x, ay = a.y, bx = b.x, by = b.y, t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay, r;
      r = x0 - ax;
      if (!dx && r > 0) return;
      r /= dx;
      if (dx < 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      } else if (dx > 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      }
      r = x1 - ax;
      if (!dx && r < 0) return;
      r /= dx;
      if (dx < 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      } else if (dx > 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      }
      r = y0 - ay;
      if (!dy && r > 0) return;
      r /= dy;
      if (dy < 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      } else if (dy > 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      }
      r = y1 - ay;
      if (!dy && r < 0) return;
      r /= dy;
      if (dy < 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      } else if (dy > 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      }
      if (t0 > 0) line.a = {
        x: ax + t0 * dx,
        y: ay + t0 * dy
      };
      if (t1 < 1) line.b = {
        x: ax + t1 * dx,
        y: ay + t1 * dy
      };
      return line;
    };
  }
  var d3_geo_clipExtentMAX = 1e9;
  d3.geo.clipExtent = function() {
    var x0, y0, x1, y1, stream, clip, clipExtent = {
      stream: function(output) {
        if (stream) stream.valid = false;
        stream = clip(output);
        stream.valid = true;
        return stream;
      },
      extent: function(_) {
        if (!arguments.length) return [ [ x0, y0 ], [ x1, y1 ] ];
        clip = d3_geo_clipExtent(x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1]);
        if (stream) stream.valid = false, stream = null;
        return clipExtent;
      }
    };
    return clipExtent.extent([ [ 0, 0 ], [ 960, 500 ] ]);
  };
  function d3_geo_clipExtent(x0, y0, x1, y1) {
    return function(listener) {
      var listener_ = listener, bufferListener = d3_geo_clipBufferListener(), clipLine = d3_geom_clipLine(x0, y0, x1, y1), segments, polygon, ring;
      var clip = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          listener = bufferListener;
          segments = [];
          polygon = [];
          clean = true;
        },
        polygonEnd: function() {
          listener = listener_;
          segments = d3.merge(segments);
          var clipStartInside = insidePolygon([ x0, y1 ]), inside = clean && clipStartInside, visible = segments.length;
          if (inside || visible) {
            listener.polygonStart();
            if (inside) {
              listener.lineStart();
              interpolate(null, null, 1, listener);
              listener.lineEnd();
            }
            if (visible) {
              d3_geo_clipPolygon(segments, compare, clipStartInside, interpolate, listener);
            }
            listener.polygonEnd();
          }
          segments = polygon = ring = null;
        }
      };
      function insidePolygon(p) {
        var wn = 0, n = polygon.length, y = p[1];
        for (var i = 0; i < n; ++i) {
          for (var j = 1, v = polygon[i], m = v.length, a = v[0], b; j < m; ++j) {
            b = v[j];
            if (a[1] <= y) {
              if (b[1] > y && d3_cross2d(a, b, p) > 0) ++wn;
            } else {
              if (b[1] <= y && d3_cross2d(a, b, p) < 0) --wn;
            }
            a = b;
          }
        }
        return wn !== 0;
      }
      function interpolate(from, to, direction, listener) {
        var a = 0, a1 = 0;
        if (from == null || (a = corner(from, direction)) !== (a1 = corner(to, direction)) || comparePoints(from, to) < 0 ^ direction > 0) {
          do {
            listener.point(a === 0 || a === 3 ? x0 : x1, a > 1 ? y1 : y0);
          } while ((a = (a + direction + 4) % 4) !== a1);
        } else {
          listener.point(to[0], to[1]);
        }
      }
      function pointVisible(x, y) {
        return x0 <= x && x <= x1 && y0 <= y && y <= y1;
      }
      function point(x, y) {
        if (pointVisible(x, y)) listener.point(x, y);
      }
      var x__, y__, v__, x_, y_, v_, first, clean;
      function lineStart() {
        clip.point = linePoint;
        if (polygon) polygon.push(ring = []);
        first = true;
        v_ = false;
        x_ = y_ = NaN;
      }
      function lineEnd() {
        if (segments) {
          linePoint(x__, y__);
          if (v__ && v_) bufferListener.rejoin();
          segments.push(bufferListener.buffer());
        }
        clip.point = point;
        if (v_) listener.lineEnd();
      }
      function linePoint(x, y) {
        x = Math.max(-d3_geo_clipExtentMAX, Math.min(d3_geo_clipExtentMAX, x));
        y = Math.max(-d3_geo_clipExtentMAX, Math.min(d3_geo_clipExtentMAX, y));
        var v = pointVisible(x, y);
        if (polygon) ring.push([ x, y ]);
        if (first) {
          x__ = x, y__ = y, v__ = v;
          first = false;
          if (v) {
            listener.lineStart();
            listener.point(x, y);
          }
        } else {
          if (v && v_) listener.point(x, y); else {
            var l = {
              a: {
                x: x_,
                y: y_
              },
              b: {
                x: x,
                y: y
              }
            };
            if (clipLine(l)) {
              if (!v_) {
                listener.lineStart();
                listener.point(l.a.x, l.a.y);
              }
              listener.point(l.b.x, l.b.y);
              if (!v) listener.lineEnd();
              clean = false;
            } else if (v) {
              listener.lineStart();
              listener.point(x, y);
              clean = false;
            }
          }
        }
        x_ = x, y_ = y, v_ = v;
      }
      return clip;
    };
    function corner(p, direction) {
      return abs(p[0] - x0) < ε ? direction > 0 ? 0 : 3 : abs(p[0] - x1) < ε ? direction > 0 ? 2 : 1 : abs(p[1] - y0) < ε ? direction > 0 ? 1 : 0 : direction > 0 ? 3 : 2;
    }
    function compare(a, b) {
      return comparePoints(a.x, b.x);
    }
    function comparePoints(a, b) {
      var ca = corner(a, 1), cb = corner(b, 1);
      return ca !== cb ? ca - cb : ca === 0 ? b[1] - a[1] : ca === 1 ? a[0] - b[0] : ca === 2 ? a[1] - b[1] : b[0] - a[0];
    }
  }
  function d3_geo_compose(a, b) {
    function compose(x, y) {
      return x = a(x, y), b(x[0], x[1]);
    }
    if (a.invert && b.invert) compose.invert = function(x, y) {
      return x = b.invert(x, y), x && a.invert(x[0], x[1]);
    };
    return compose;
  }
  function d3_geo_conic(projectAt) {
    var φ0 = 0, φ1 = π / 3, m = d3_geo_projectionMutator(projectAt), p = m(φ0, φ1);
    p.parallels = function(_) {
      if (!arguments.length) return [ φ0 / π * 180, φ1 / π * 180 ];
      return m(φ0 = _[0] * π / 180, φ1 = _[1] * π / 180);
    };
    return p;
  }
  function d3_geo_conicEqualArea(φ0, φ1) {
    var sinφ0 = Math.sin(φ0), n = (sinφ0 + Math.sin(φ1)) / 2, C = 1 + sinφ0 * (2 * n - sinφ0), ρ0 = Math.sqrt(C) / n;
    function forward(λ, φ) {
      var ρ = Math.sqrt(C - 2 * n * Math.sin(φ)) / n;
      return [ ρ * Math.sin(λ *= n), ρ0 - ρ * Math.cos(λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = ρ0 - y;
      return [ Math.atan2(x, ρ0_y) / n, d3_asin((C - (x * x + ρ0_y * ρ0_y) * n * n) / (2 * n)) ];
    };
    return forward;
  }
  (d3.geo.conicEqualArea = function() {
    return d3_geo_conic(d3_geo_conicEqualArea);
  }).raw = d3_geo_conicEqualArea;
  d3.geo.albers = function() {
    return d3.geo.conicEqualArea().rotate([ 96, 0 ]).center([ -.6, 38.7 ]).parallels([ 29.5, 45.5 ]).scale(1070);
  };
  d3.geo.albersUsa = function() {
    var lower48 = d3.geo.albers();
    var alaska = d3.geo.conicEqualArea().rotate([ 154, 0 ]).center([ -2, 58.5 ]).parallels([ 55, 65 ]);
    var hawaii = d3.geo.conicEqualArea().rotate([ 157, 0 ]).center([ -3, 19.9 ]).parallels([ 8, 18 ]);
    var point, pointStream = {
      point: function(x, y) {
        point = [ x, y ];
      }
    }, lower48Point, alaskaPoint, hawaiiPoint;
    function albersUsa(coordinates) {
      var x = coordinates[0], y = coordinates[1];
      point = null;
      (lower48Point(x, y), point) || (alaskaPoint(x, y), point) || hawaiiPoint(x, y);
      return point;
    }
    albersUsa.invert = function(coordinates) {
      var k = lower48.scale(), t = lower48.translate(), x = (coordinates[0] - t[0]) / k, y = (coordinates[1] - t[1]) / k;
      return (y >= .12 && y < .234 && x >= -.425 && x < -.214 ? alaska : y >= .166 && y < .234 && x >= -.214 && x < -.115 ? hawaii : lower48).invert(coordinates);
    };
    albersUsa.stream = function(stream) {
      var lower48Stream = lower48.stream(stream), alaskaStream = alaska.stream(stream), hawaiiStream = hawaii.stream(stream);
      return {
        point: function(x, y) {
          lower48Stream.point(x, y);
          alaskaStream.point(x, y);
          hawaiiStream.point(x, y);
        },
        sphere: function() {
          lower48Stream.sphere();
          alaskaStream.sphere();
          hawaiiStream.sphere();
        },
        lineStart: function() {
          lower48Stream.lineStart();
          alaskaStream.lineStart();
          hawaiiStream.lineStart();
        },
        lineEnd: function() {
          lower48Stream.lineEnd();
          alaskaStream.lineEnd();
          hawaiiStream.lineEnd();
        },
        polygonStart: function() {
          lower48Stream.polygonStart();
          alaskaStream.polygonStart();
          hawaiiStream.polygonStart();
        },
        polygonEnd: function() {
          lower48Stream.polygonEnd();
          alaskaStream.polygonEnd();
          hawaiiStream.polygonEnd();
        }
      };
    };
    albersUsa.precision = function(_) {
      if (!arguments.length) return lower48.precision();
      lower48.precision(_);
      alaska.precision(_);
      hawaii.precision(_);
      return albersUsa;
    };
    albersUsa.scale = function(_) {
      if (!arguments.length) return lower48.scale();
      lower48.scale(_);
      alaska.scale(_ * .35);
      hawaii.scale(_);
      return albersUsa.translate(lower48.translate());
    };
    albersUsa.translate = function(_) {
      if (!arguments.length) return lower48.translate();
      var k = lower48.scale(), x = +_[0], y = +_[1];
      lower48Point = lower48.translate(_).clipExtent([ [ x - .455 * k, y - .238 * k ], [ x + .455 * k, y + .238 * k ] ]).stream(pointStream).point;
      alaskaPoint = alaska.translate([ x - .307 * k, y + .201 * k ]).clipExtent([ [ x - .425 * k + ε, y + .12 * k + ε ], [ x - .214 * k - ε, y + .234 * k - ε ] ]).stream(pointStream).point;
      hawaiiPoint = hawaii.translate([ x - .205 * k, y + .212 * k ]).clipExtent([ [ x - .214 * k + ε, y + .166 * k + ε ], [ x - .115 * k - ε, y + .234 * k - ε ] ]).stream(pointStream).point;
      return albersUsa;
    };
    return albersUsa.scale(1070);
  };
  var d3_geo_pathAreaSum, d3_geo_pathAreaPolygon, d3_geo_pathArea = {
    point: d3_noop,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: function() {
      d3_geo_pathAreaPolygon = 0;
      d3_geo_pathArea.lineStart = d3_geo_pathAreaRingStart;
    },
    polygonEnd: function() {
      d3_geo_pathArea.lineStart = d3_geo_pathArea.lineEnd = d3_geo_pathArea.point = d3_noop;
      d3_geo_pathAreaSum += abs(d3_geo_pathAreaPolygon / 2);
    }
  };
  function d3_geo_pathAreaRingStart() {
    var x00, y00, x0, y0;
    d3_geo_pathArea.point = function(x, y) {
      d3_geo_pathArea.point = nextPoint;
      x00 = x0 = x, y00 = y0 = y;
    };
    function nextPoint(x, y) {
      d3_geo_pathAreaPolygon += y0 * x - x0 * y;
      x0 = x, y0 = y;
    }
    d3_geo_pathArea.lineEnd = function() {
      nextPoint(x00, y00);
    };
  }
  var d3_geo_pathBoundsX0, d3_geo_pathBoundsY0, d3_geo_pathBoundsX1, d3_geo_pathBoundsY1;
  var d3_geo_pathBounds = {
    point: d3_geo_pathBoundsPoint,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: d3_noop,
    polygonEnd: d3_noop
  };
  function d3_geo_pathBoundsPoint(x, y) {
    if (x < d3_geo_pathBoundsX0) d3_geo_pathBoundsX0 = x;
    if (x > d3_geo_pathBoundsX1) d3_geo_pathBoundsX1 = x;
    if (y < d3_geo_pathBoundsY0) d3_geo_pathBoundsY0 = y;
    if (y > d3_geo_pathBoundsY1) d3_geo_pathBoundsY1 = y;
  }
  function d3_geo_pathBuffer() {
    var pointCircle = d3_geo_pathBufferCircle(4.5), buffer = [];
    var stream = {
      point: point,
      lineStart: function() {
        stream.point = pointLineStart;
      },
      lineEnd: lineEnd,
      polygonStart: function() {
        stream.lineEnd = lineEndPolygon;
      },
      polygonEnd: function() {
        stream.lineEnd = lineEnd;
        stream.point = point;
      },
      pointRadius: function(_) {
        pointCircle = d3_geo_pathBufferCircle(_);
        return stream;
      },
      result: function() {
        if (buffer.length) {
          var result = buffer.join("");
          buffer = [];
          return result;
        }
      }
    };
    function point(x, y) {
      buffer.push("M", x, ",", y, pointCircle);
    }
    function pointLineStart(x, y) {
      buffer.push("M", x, ",", y);
      stream.point = pointLine;
    }
    function pointLine(x, y) {
      buffer.push("L", x, ",", y);
    }
    function lineEnd() {
      stream.point = point;
    }
    function lineEndPolygon() {
      buffer.push("Z");
    }
    return stream;
  }
  function d3_geo_pathBufferCircle(radius) {
    return "m0," + radius + "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius + "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius + "z";
  }
  var d3_geo_pathCentroid = {
    point: d3_geo_pathCentroidPoint,
    lineStart: d3_geo_pathCentroidLineStart,
    lineEnd: d3_geo_pathCentroidLineEnd,
    polygonStart: function() {
      d3_geo_pathCentroid.lineStart = d3_geo_pathCentroidRingStart;
    },
    polygonEnd: function() {
      d3_geo_pathCentroid.point = d3_geo_pathCentroidPoint;
      d3_geo_pathCentroid.lineStart = d3_geo_pathCentroidLineStart;
      d3_geo_pathCentroid.lineEnd = d3_geo_pathCentroidLineEnd;
    }
  };
  function d3_geo_pathCentroidPoint(x, y) {
    d3_geo_centroidX0 += x;
    d3_geo_centroidY0 += y;
    ++d3_geo_centroidZ0;
  }
  function d3_geo_pathCentroidLineStart() {
    var x0, y0;
    d3_geo_pathCentroid.point = function(x, y) {
      d3_geo_pathCentroid.point = nextPoint;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    };
    function nextPoint(x, y) {
      var dx = x - x0, dy = y - y0, z = Math.sqrt(dx * dx + dy * dy);
      d3_geo_centroidX1 += z * (x0 + x) / 2;
      d3_geo_centroidY1 += z * (y0 + y) / 2;
      d3_geo_centroidZ1 += z;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    }
  }
  function d3_geo_pathCentroidLineEnd() {
    d3_geo_pathCentroid.point = d3_geo_pathCentroidPoint;
  }
  function d3_geo_pathCentroidRingStart() {
    var x00, y00, x0, y0;
    d3_geo_pathCentroid.point = function(x, y) {
      d3_geo_pathCentroid.point = nextPoint;
      d3_geo_pathCentroidPoint(x00 = x0 = x, y00 = y0 = y);
    };
    function nextPoint(x, y) {
      var dx = x - x0, dy = y - y0, z = Math.sqrt(dx * dx + dy * dy);
      d3_geo_centroidX1 += z * (x0 + x) / 2;
      d3_geo_centroidY1 += z * (y0 + y) / 2;
      d3_geo_centroidZ1 += z;
      z = y0 * x - x0 * y;
      d3_geo_centroidX2 += z * (x0 + x);
      d3_geo_centroidY2 += z * (y0 + y);
      d3_geo_centroidZ2 += z * 3;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    }
    d3_geo_pathCentroid.lineEnd = function() {
      nextPoint(x00, y00);
    };
  }
  function d3_geo_pathContext(context) {
    var pointRadius = 4.5;
    var stream = {
      point: point,
      lineStart: function() {
        stream.point = pointLineStart;
      },
      lineEnd: lineEnd,
      polygonStart: function() {
        stream.lineEnd = lineEndPolygon;
      },
      polygonEnd: function() {
        stream.lineEnd = lineEnd;
        stream.point = point;
      },
      pointRadius: function(_) {
        pointRadius = _;
        return stream;
      },
      result: d3_noop
    };
    function point(x, y) {
      context.moveTo(x, y);
      context.arc(x, y, pointRadius, 0, τ);
    }
    function pointLineStart(x, y) {
      context.moveTo(x, y);
      stream.point = pointLine;
    }
    function pointLine(x, y) {
      context.lineTo(x, y);
    }
    function lineEnd() {
      stream.point = point;
    }
    function lineEndPolygon() {
      context.closePath();
    }
    return stream;
  }
  function d3_geo_resample(project) {
    var δ2 = .5, cosMinDistance = Math.cos(30 * d3_radians), maxDepth = 16;
    function resample(stream) {
      return (maxDepth ? resampleRecursive : resampleNone)(stream);
    }
    function resampleNone(stream) {
      return d3_geo_transformPoint(stream, function(x, y) {
        x = project(x, y);
        stream.point(x[0], x[1]);
      });
    }
    function resampleRecursive(stream) {
      var λ00, φ00, x00, y00, a00, b00, c00, λ0, x0, y0, a0, b0, c0;
      var resample = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          stream.polygonStart();
          resample.lineStart = ringStart;
        },
        polygonEnd: function() {
          stream.polygonEnd();
          resample.lineStart = lineStart;
        }
      };
      function point(x, y) {
        x = project(x, y);
        stream.point(x[0], x[1]);
      }
      function lineStart() {
        x0 = NaN;
        resample.point = linePoint;
        stream.lineStart();
      }
      function linePoint(λ, φ) {
        var c = d3_geo_cartesian([ λ, φ ]), p = project(λ, φ);
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x0 = p[0], y0 = p[1], λ0 = λ, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
        stream.point(x0, y0);
      }
      function lineEnd() {
        resample.point = point;
        stream.lineEnd();
      }
      function ringStart() {
        lineStart();
        resample.point = ringPoint;
        resample.lineEnd = ringEnd;
      }
      function ringPoint(λ, φ) {
        linePoint(λ00 = λ, φ00 = φ), x00 = x0, y00 = y0, a00 = a0, b00 = b0, c00 = c0;
        resample.point = linePoint;
      }
      function ringEnd() {
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x00, y00, λ00, a00, b00, c00, maxDepth, stream);
        resample.lineEnd = lineEnd;
        lineEnd();
      }
      return resample;
    }
    function resampleLineTo(x0, y0, λ0, a0, b0, c0, x1, y1, λ1, a1, b1, c1, depth, stream) {
      var dx = x1 - x0, dy = y1 - y0, d2 = dx * dx + dy * dy;
      if (d2 > 4 * δ2 && depth--) {
        var a = a0 + a1, b = b0 + b1, c = c0 + c1, m = Math.sqrt(a * a + b * b + c * c), φ2 = Math.asin(c /= m), λ2 = abs(abs(c) - 1) < ε || abs(λ0 - λ1) < ε ? (λ0 + λ1) / 2 : Math.atan2(b, a), p = project(λ2, φ2), x2 = p[0], y2 = p[1], dx2 = x2 - x0, dy2 = y2 - y0, dz = dy * dx2 - dx * dy2;
        if (dz * dz / d2 > δ2 || abs((dx * dx2 + dy * dy2) / d2 - .5) > .3 || a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) {
          resampleLineTo(x0, y0, λ0, a0, b0, c0, x2, y2, λ2, a /= m, b /= m, c, depth, stream);
          stream.point(x2, y2);
          resampleLineTo(x2, y2, λ2, a, b, c, x1, y1, λ1, a1, b1, c1, depth, stream);
        }
      }
    }
    resample.precision = function(_) {
      if (!arguments.length) return Math.sqrt(δ2);
      maxDepth = (δ2 = _ * _) > 0 && 16;
      return resample;
    };
    return resample;
  }
  d3.geo.path = function() {
    var pointRadius = 4.5, projection, context, projectStream, contextStream, cacheStream;
    function path(object) {
      if (object) {
        if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
        if (!cacheStream || !cacheStream.valid) cacheStream = projectStream(contextStream);
        d3.geo.stream(object, cacheStream);
      }
      return contextStream.result();
    }
    path.area = function(object) {
      d3_geo_pathAreaSum = 0;
      d3.geo.stream(object, projectStream(d3_geo_pathArea));
      return d3_geo_pathAreaSum;
    };
    path.centroid = function(object) {
      d3_geo_centroidX0 = d3_geo_centroidY0 = d3_geo_centroidZ0 = d3_geo_centroidX1 = d3_geo_centroidY1 = d3_geo_centroidZ1 = d3_geo_centroidX2 = d3_geo_centroidY2 = d3_geo_centroidZ2 = 0;
      d3.geo.stream(object, projectStream(d3_geo_pathCentroid));
      return d3_geo_centroidZ2 ? [ d3_geo_centroidX2 / d3_geo_centroidZ2, d3_geo_centroidY2 / d3_geo_centroidZ2 ] : d3_geo_centroidZ1 ? [ d3_geo_centroidX1 / d3_geo_centroidZ1, d3_geo_centroidY1 / d3_geo_centroidZ1 ] : d3_geo_centroidZ0 ? [ d3_geo_centroidX0 / d3_geo_centroidZ0, d3_geo_centroidY0 / d3_geo_centroidZ0 ] : [ NaN, NaN ];
    };
    path.bounds = function(object) {
      d3_geo_pathBoundsX1 = d3_geo_pathBoundsY1 = -(d3_geo_pathBoundsX0 = d3_geo_pathBoundsY0 = Infinity);
      d3.geo.stream(object, projectStream(d3_geo_pathBounds));
      return [ [ d3_geo_pathBoundsX0, d3_geo_pathBoundsY0 ], [ d3_geo_pathBoundsX1, d3_geo_pathBoundsY1 ] ];
    };
    path.projection = function(_) {
      if (!arguments.length) return projection;
      projectStream = (projection = _) ? _.stream || d3_geo_pathProjectStream(_) : d3_identity;
      return reset();
    };
    path.context = function(_) {
      if (!arguments.length) return context;
      contextStream = (context = _) == null ? new d3_geo_pathBuffer() : new d3_geo_pathContext(_);
      if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
      return reset();
    };
    path.pointRadius = function(_) {
      if (!arguments.length) return pointRadius;
      pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
      return path;
    };
    function reset() {
      cacheStream = null;
      return path;
    }
    return path.projection(d3.geo.albersUsa()).context(null);
  };
  function d3_geo_pathProjectStream(project) {
    var resample = d3_geo_resample(function(x, y) {
      return project([ x * d3_degrees, y * d3_degrees ]);
    });
    return function(stream) {
      return d3_geo_projectionRadians(resample(stream));
    };
  }
  d3.geo.transform = function(methods) {
    return {
      stream: function(stream) {
        var transform = new d3_geo_transform(stream);
        for (var k in methods) transform[k] = methods[k];
        return transform;
      }
    };
  };
  function d3_geo_transform(stream) {
    this.stream = stream;
  }
  d3_geo_transform.prototype = {
    point: function(x, y) {
      this.stream.point(x, y);
    },
    sphere: function() {
      this.stream.sphere();
    },
    lineStart: function() {
      this.stream.lineStart();
    },
    lineEnd: function() {
      this.stream.lineEnd();
    },
    polygonStart: function() {
      this.stream.polygonStart();
    },
    polygonEnd: function() {
      this.stream.polygonEnd();
    }
  };
  function d3_geo_transformPoint(stream, point) {
    return {
      point: point,
      sphere: function() {
        stream.sphere();
      },
      lineStart: function() {
        stream.lineStart();
      },
      lineEnd: function() {
        stream.lineEnd();
      },
      polygonStart: function() {
        stream.polygonStart();
      },
      polygonEnd: function() {
        stream.polygonEnd();
      }
    };
  }
  d3.geo.projection = d3_geo_projection;
  d3.geo.projectionMutator = d3_geo_projectionMutator;
  function d3_geo_projection(project) {
    return d3_geo_projectionMutator(function() {
      return project;
    })();
  }
  function d3_geo_projectionMutator(projectAt) {
    var project, rotate, projectRotate, projectResample = d3_geo_resample(function(x, y) {
      x = project(x, y);
      return [ x[0] * k + δx, δy - x[1] * k ];
    }), k = 150, x = 480, y = 250, λ = 0, φ = 0, δλ = 0, δφ = 0, δγ = 0, δx, δy, preclip = d3_geo_clipAntimeridian, postclip = d3_identity, clipAngle = null, clipExtent = null, stream;
    function projection(point) {
      point = projectRotate(point[0] * d3_radians, point[1] * d3_radians);
      return [ point[0] * k + δx, δy - point[1] * k ];
    }
    function invert(point) {
      point = projectRotate.invert((point[0] - δx) / k, (δy - point[1]) / k);
      return point && [ point[0] * d3_degrees, point[1] * d3_degrees ];
    }
    projection.stream = function(output) {
      if (stream) stream.valid = false;
      stream = d3_geo_projectionRadians(preclip(rotate, projectResample(postclip(output))));
      stream.valid = true;
      return stream;
    };
    projection.clipAngle = function(_) {
      if (!arguments.length) return clipAngle;
      preclip = _ == null ? (clipAngle = _, d3_geo_clipAntimeridian) : d3_geo_clipCircle((clipAngle = +_) * d3_radians);
      return invalidate();
    };
    projection.clipExtent = function(_) {
      if (!arguments.length) return clipExtent;
      clipExtent = _;
      postclip = _ ? d3_geo_clipExtent(_[0][0], _[0][1], _[1][0], _[1][1]) : d3_identity;
      return invalidate();
    };
    projection.scale = function(_) {
      if (!arguments.length) return k;
      k = +_;
      return reset();
    };
    projection.translate = function(_) {
      if (!arguments.length) return [ x, y ];
      x = +_[0];
      y = +_[1];
      return reset();
    };
    projection.center = function(_) {
      if (!arguments.length) return [ λ * d3_degrees, φ * d3_degrees ];
      λ = _[0] % 360 * d3_radians;
      φ = _[1] % 360 * d3_radians;
      return reset();
    };
    projection.rotate = function(_) {
      if (!arguments.length) return [ δλ * d3_degrees, δφ * d3_degrees, δγ * d3_degrees ];
      δλ = _[0] % 360 * d3_radians;
      δφ = _[1] % 360 * d3_radians;
      δγ = _.length > 2 ? _[2] % 360 * d3_radians : 0;
      return reset();
    };
    d3.rebind(projection, projectResample, "precision");
    function reset() {
      projectRotate = d3_geo_compose(rotate = d3_geo_rotation(δλ, δφ, δγ), project);
      var center = project(λ, φ);
      δx = x - center[0] * k;
      δy = y + center[1] * k;
      return invalidate();
    }
    function invalidate() {
      if (stream) stream.valid = false, stream = null;
      return projection;
    }
    return function() {
      project = projectAt.apply(this, arguments);
      projection.invert = project.invert && invert;
      return reset();
    };
  }
  function d3_geo_projectionRadians(stream) {
    return d3_geo_transformPoint(stream, function(x, y) {
      stream.point(x * d3_radians, y * d3_radians);
    });
  }
  function d3_geo_equirectangular(λ, φ) {
    return [ λ, φ ];
  }
  (d3.geo.equirectangular = function() {
    return d3_geo_projection(d3_geo_equirectangular);
  }).raw = d3_geo_equirectangular.invert = d3_geo_equirectangular;
  d3.geo.rotation = function(rotate) {
    rotate = d3_geo_rotation(rotate[0] % 360 * d3_radians, rotate[1] * d3_radians, rotate.length > 2 ? rotate[2] * d3_radians : 0);
    function forward(coordinates) {
      coordinates = rotate(coordinates[0] * d3_radians, coordinates[1] * d3_radians);
      return coordinates[0] *= d3_degrees, coordinates[1] *= d3_degrees, coordinates;
    }
    forward.invert = function(coordinates) {
      coordinates = rotate.invert(coordinates[0] * d3_radians, coordinates[1] * d3_radians);
      return coordinates[0] *= d3_degrees, coordinates[1] *= d3_degrees, coordinates;
    };
    return forward;
  };
  function d3_geo_identityRotation(λ, φ) {
    return [ λ > π ? λ - τ : λ < -π ? λ + τ : λ, φ ];
  }
  d3_geo_identityRotation.invert = d3_geo_equirectangular;
  function d3_geo_rotation(δλ, δφ, δγ) {
    return δλ ? δφ || δγ ? d3_geo_compose(d3_geo_rotationλ(δλ), d3_geo_rotationφγ(δφ, δγ)) : d3_geo_rotationλ(δλ) : δφ || δγ ? d3_geo_rotationφγ(δφ, δγ) : d3_geo_identityRotation;
  }
  function d3_geo_forwardRotationλ(δλ) {
    return function(λ, φ) {
      return λ += δλ, [ λ > π ? λ - τ : λ < -π ? λ + τ : λ, φ ];
    };
  }
  function d3_geo_rotationλ(δλ) {
    var rotation = d3_geo_forwardRotationλ(δλ);
    rotation.invert = d3_geo_forwardRotationλ(-δλ);
    return rotation;
  }
  function d3_geo_rotationφγ(δφ, δγ) {
    var cosδφ = Math.cos(δφ), sinδφ = Math.sin(δφ), cosδγ = Math.cos(δγ), sinδγ = Math.sin(δγ);
    function rotation(λ, φ) {
      var cosφ = Math.cos(φ), x = Math.cos(λ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ), k = z * cosδφ + x * sinδφ;
      return [ Math.atan2(y * cosδγ - k * sinδγ, x * cosδφ - z * sinδφ), d3_asin(k * cosδγ + y * sinδγ) ];
    }
    rotation.invert = function(λ, φ) {
      var cosφ = Math.cos(φ), x = Math.cos(λ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ), k = z * cosδγ - y * sinδγ;
      return [ Math.atan2(y * cosδγ + z * sinδγ, x * cosδφ + k * sinδφ), d3_asin(k * cosδφ - x * sinδφ) ];
    };
    return rotation;
  }
  d3.geo.circle = function() {
    var origin = [ 0, 0 ], angle, precision = 6, interpolate;
    function circle() {
      var center = typeof origin === "function" ? origin.apply(this, arguments) : origin, rotate = d3_geo_rotation(-center[0] * d3_radians, -center[1] * d3_radians, 0).invert, ring = [];
      interpolate(null, null, 1, {
        point: function(x, y) {
          ring.push(x = rotate(x, y));
          x[0] *= d3_degrees, x[1] *= d3_degrees;
        }
      });
      return {
        type: "Polygon",
        coordinates: [ ring ]
      };
    }
    circle.origin = function(x) {
      if (!arguments.length) return origin;
      origin = x;
      return circle;
    };
    circle.angle = function(x) {
      if (!arguments.length) return angle;
      interpolate = d3_geo_circleInterpolate((angle = +x) * d3_radians, precision * d3_radians);
      return circle;
    };
    circle.precision = function(_) {
      if (!arguments.length) return precision;
      interpolate = d3_geo_circleInterpolate(angle * d3_radians, (precision = +_) * d3_radians);
      return circle;
    };
    return circle.angle(90);
  };
  function d3_geo_circleInterpolate(radius, precision) {
    var cr = Math.cos(radius), sr = Math.sin(radius);
    return function(from, to, direction, listener) {
      var step = direction * precision;
      if (from != null) {
        from = d3_geo_circleAngle(cr, from);
        to = d3_geo_circleAngle(cr, to);
        if (direction > 0 ? from < to : from > to) from += direction * τ;
      } else {
        from = radius + direction * τ;
        to = radius - .5 * step;
      }
      for (var point, t = from; direction > 0 ? t > to : t < to; t -= step) {
        listener.point((point = d3_geo_spherical([ cr, -sr * Math.cos(t), -sr * Math.sin(t) ]))[0], point[1]);
      }
    };
  }
  function d3_geo_circleAngle(cr, point) {
    var a = d3_geo_cartesian(point);
    a[0] -= cr;
    d3_geo_cartesianNormalize(a);
    var angle = d3_acos(-a[1]);
    return ((-a[2] < 0 ? -angle : angle) + 2 * Math.PI - ε) % (2 * Math.PI);
  }
  d3.geo.distance = function(a, b) {
    var Δλ = (b[0] - a[0]) * d3_radians, φ0 = a[1] * d3_radians, φ1 = b[1] * d3_radians, sinΔλ = Math.sin(Δλ), cosΔλ = Math.cos(Δλ), sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1), t;
    return Math.atan2(Math.sqrt((t = cosφ1 * sinΔλ) * t + (t = cosφ0 * sinφ1 - sinφ0 * cosφ1 * cosΔλ) * t), sinφ0 * sinφ1 + cosφ0 * cosφ1 * cosΔλ);
  };
  d3.geo.graticule = function() {
    var x1, x0, X1, X0, y1, y0, Y1, Y0, dx = 10, dy = dx, DX = 90, DY = 360, x, y, X, Y, precision = 2.5;
    function graticule() {
      return {
        type: "MultiLineString",
        coordinates: lines()
      };
    }
    function lines() {
      return d3.range(Math.ceil(X0 / DX) * DX, X1, DX).map(X).concat(d3.range(Math.ceil(Y0 / DY) * DY, Y1, DY).map(Y)).concat(d3.range(Math.ceil(x0 / dx) * dx, x1, dx).filter(function(x) {
        return abs(x % DX) > ε;
      }).map(x)).concat(d3.range(Math.ceil(y0 / dy) * dy, y1, dy).filter(function(y) {
        return abs(y % DY) > ε;
      }).map(y));
    }
    graticule.lines = function() {
      return lines().map(function(coordinates) {
        return {
          type: "LineString",
          coordinates: coordinates
        };
      });
    };
    graticule.outline = function() {
      return {
        type: "Polygon",
        coordinates: [ X(X0).concat(Y(Y1).slice(1), X(X1).reverse().slice(1), Y(Y0).reverse().slice(1)) ]
      };
    };
    graticule.extent = function(_) {
      if (!arguments.length) return graticule.minorExtent();
      return graticule.majorExtent(_).minorExtent(_);
    };
    graticule.majorExtent = function(_) {
      if (!arguments.length) return [ [ X0, Y0 ], [ X1, Y1 ] ];
      X0 = +_[0][0], X1 = +_[1][0];
      Y0 = +_[0][1], Y1 = +_[1][1];
      if (X0 > X1) _ = X0, X0 = X1, X1 = _;
      if (Y0 > Y1) _ = Y0, Y0 = Y1, Y1 = _;
      return graticule.precision(precision);
    };
    graticule.minorExtent = function(_) {
      if (!arguments.length) return [ [ x0, y0 ], [ x1, y1 ] ];
      x0 = +_[0][0], x1 = +_[1][0];
      y0 = +_[0][1], y1 = +_[1][1];
      if (x0 > x1) _ = x0, x0 = x1, x1 = _;
      if (y0 > y1) _ = y0, y0 = y1, y1 = _;
      return graticule.precision(precision);
    };
    graticule.step = function(_) {
      if (!arguments.length) return graticule.minorStep();
      return graticule.majorStep(_).minorStep(_);
    };
    graticule.majorStep = function(_) {
      if (!arguments.length) return [ DX, DY ];
      DX = +_[0], DY = +_[1];
      return graticule;
    };
    graticule.minorStep = function(_) {
      if (!arguments.length) return [ dx, dy ];
      dx = +_[0], dy = +_[1];
      return graticule;
    };
    graticule.precision = function(_) {
      if (!arguments.length) return precision;
      precision = +_;
      x = d3_geo_graticuleX(y0, y1, 90);
      y = d3_geo_graticuleY(x0, x1, precision);
      X = d3_geo_graticuleX(Y0, Y1, 90);
      Y = d3_geo_graticuleY(X0, X1, precision);
      return graticule;
    };
    return graticule.majorExtent([ [ -180, -90 + ε ], [ 180, 90 - ε ] ]).minorExtent([ [ -180, -80 - ε ], [ 180, 80 + ε ] ]);
  };
  function d3_geo_graticuleX(y0, y1, dy) {
    var y = d3.range(y0, y1 - ε, dy).concat(y1);
    return function(x) {
      return y.map(function(y) {
        return [ x, y ];
      });
    };
  }
  function d3_geo_graticuleY(x0, x1, dx) {
    var x = d3.range(x0, x1 - ε, dx).concat(x1);
    return function(y) {
      return x.map(function(x) {
        return [ x, y ];
      });
    };
  }
  function d3_source(d) {
    return d.source;
  }
  function d3_target(d) {
    return d.target;
  }
  d3.geo.greatArc = function() {
    var source = d3_source, source_, target = d3_target, target_;
    function greatArc() {
      return {
        type: "LineString",
        coordinates: [ source_ || source.apply(this, arguments), target_ || target.apply(this, arguments) ]
      };
    }
    greatArc.distance = function() {
      return d3.geo.distance(source_ || source.apply(this, arguments), target_ || target.apply(this, arguments));
    };
    greatArc.source = function(_) {
      if (!arguments.length) return source;
      source = _, source_ = typeof _ === "function" ? null : _;
      return greatArc;
    };
    greatArc.target = function(_) {
      if (!arguments.length) return target;
      target = _, target_ = typeof _ === "function" ? null : _;
      return greatArc;
    };
    greatArc.precision = function() {
      return arguments.length ? greatArc : 0;
    };
    return greatArc;
  };
  d3.geo.interpolate = function(source, target) {
    return d3_geo_interpolate(source[0] * d3_radians, source[1] * d3_radians, target[0] * d3_radians, target[1] * d3_radians);
  };
  function d3_geo_interpolate(x0, y0, x1, y1) {
    var cy0 = Math.cos(y0), sy0 = Math.sin(y0), cy1 = Math.cos(y1), sy1 = Math.sin(y1), kx0 = cy0 * Math.cos(x0), ky0 = cy0 * Math.sin(x0), kx1 = cy1 * Math.cos(x1), ky1 = cy1 * Math.sin(x1), d = 2 * Math.asin(Math.sqrt(d3_haversin(y1 - y0) + cy0 * cy1 * d3_haversin(x1 - x0))), k = 1 / Math.sin(d);
    var interpolate = d ? function(t) {
      var B = Math.sin(t *= d) * k, A = Math.sin(d - t) * k, x = A * kx0 + B * kx1, y = A * ky0 + B * ky1, z = A * sy0 + B * sy1;
      return [ Math.atan2(y, x) * d3_degrees, Math.atan2(z, Math.sqrt(x * x + y * y)) * d3_degrees ];
    } : function() {
      return [ x0 * d3_degrees, y0 * d3_degrees ];
    };
    interpolate.distance = d;
    return interpolate;
  }
  d3.geo.length = function(object) {
    d3_geo_lengthSum = 0;
    d3.geo.stream(object, d3_geo_length);
    return d3_geo_lengthSum;
  };
  var d3_geo_lengthSum;
  var d3_geo_length = {
    sphere: d3_noop,
    point: d3_noop,
    lineStart: d3_geo_lengthLineStart,
    lineEnd: d3_noop,
    polygonStart: d3_noop,
    polygonEnd: d3_noop
  };
  function d3_geo_lengthLineStart() {
    var λ0, sinφ0, cosφ0;
    d3_geo_length.point = function(λ, φ) {
      λ0 = λ * d3_radians, sinφ0 = Math.sin(φ *= d3_radians), cosφ0 = Math.cos(φ);
      d3_geo_length.point = nextPoint;
    };
    d3_geo_length.lineEnd = function() {
      d3_geo_length.point = d3_geo_length.lineEnd = d3_noop;
    };
    function nextPoint(λ, φ) {
      var sinφ = Math.sin(φ *= d3_radians), cosφ = Math.cos(φ), t = abs((λ *= d3_radians) - λ0), cosΔλ = Math.cos(t);
      d3_geo_lengthSum += Math.atan2(Math.sqrt((t = cosφ * Math.sin(t)) * t + (t = cosφ0 * sinφ - sinφ0 * cosφ * cosΔλ) * t), sinφ0 * sinφ + cosφ0 * cosφ * cosΔλ);
      λ0 = λ, sinφ0 = sinφ, cosφ0 = cosφ;
    }
  }
  function d3_geo_azimuthal(scale, angle) {
    function azimuthal(λ, φ) {
      var cosλ = Math.cos(λ), cosφ = Math.cos(φ), k = scale(cosλ * cosφ);
      return [ k * cosφ * Math.sin(λ), k * Math.sin(φ) ];
    }
    azimuthal.invert = function(x, y) {
      var ρ = Math.sqrt(x * x + y * y), c = angle(ρ), sinc = Math.sin(c), cosc = Math.cos(c);
      return [ Math.atan2(x * sinc, ρ * cosc), Math.asin(ρ && y * sinc / ρ) ];
    };
    return azimuthal;
  }
  var d3_geo_azimuthalEqualArea = d3_geo_azimuthal(function(cosλcosφ) {
    return Math.sqrt(2 / (1 + cosλcosφ));
  }, function(ρ) {
    return 2 * Math.asin(ρ / 2);
  });
  (d3.geo.azimuthalEqualArea = function() {
    return d3_geo_projection(d3_geo_azimuthalEqualArea);
  }).raw = d3_geo_azimuthalEqualArea;
  var d3_geo_azimuthalEquidistant = d3_geo_azimuthal(function(cosλcosφ) {
    var c = Math.acos(cosλcosφ);
    return c && c / Math.sin(c);
  }, d3_identity);
  (d3.geo.azimuthalEquidistant = function() {
    return d3_geo_projection(d3_geo_azimuthalEquidistant);
  }).raw = d3_geo_azimuthalEquidistant;
  function d3_geo_conicConformal(φ0, φ1) {
    var cosφ0 = Math.cos(φ0), t = function(φ) {
      return Math.tan(π / 4 + φ / 2);
    }, n = φ0 === φ1 ? Math.sin(φ0) : Math.log(cosφ0 / Math.cos(φ1)) / Math.log(t(φ1) / t(φ0)), F = cosφ0 * Math.pow(t(φ0), n) / n;
    if (!n) return d3_geo_mercator;
    function forward(λ, φ) {
      if (F > 0) {
        if (φ < -halfπ + ε) φ = -halfπ + ε;
      } else {
        if (φ > halfπ - ε) φ = halfπ - ε;
      }
      var ρ = F / Math.pow(t(φ), n);
      return [ ρ * Math.sin(n * λ), F - ρ * Math.cos(n * λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = F - y, ρ = d3_sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y);
      return [ Math.atan2(x, ρ0_y) / n, 2 * Math.atan(Math.pow(F / ρ, 1 / n)) - halfπ ];
    };
    return forward;
  }
  (d3.geo.conicConformal = function() {
    return d3_geo_conic(d3_geo_conicConformal);
  }).raw = d3_geo_conicConformal;
  function d3_geo_conicEquidistant(φ0, φ1) {
    var cosφ0 = Math.cos(φ0), n = φ0 === φ1 ? Math.sin(φ0) : (cosφ0 - Math.cos(φ1)) / (φ1 - φ0), G = cosφ0 / n + φ0;
    if (abs(n) < ε) return d3_geo_equirectangular;
    function forward(λ, φ) {
      var ρ = G - φ;
      return [ ρ * Math.sin(n * λ), G - ρ * Math.cos(n * λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = G - y;
      return [ Math.atan2(x, ρ0_y) / n, G - d3_sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y) ];
    };
    return forward;
  }
  (d3.geo.conicEquidistant = function() {
    return d3_geo_conic(d3_geo_conicEquidistant);
  }).raw = d3_geo_conicEquidistant;
  var d3_geo_gnomonic = d3_geo_azimuthal(function(cosλcosφ) {
    return 1 / cosλcosφ;
  }, Math.atan);
  (d3.geo.gnomonic = function() {
    return d3_geo_projection(d3_geo_gnomonic);
  }).raw = d3_geo_gnomonic;
  function d3_geo_mercator(λ, φ) {
    return [ λ, Math.log(Math.tan(π / 4 + φ / 2)) ];
  }
  d3_geo_mercator.invert = function(x, y) {
    return [ x, 2 * Math.atan(Math.exp(y)) - halfπ ];
  };
  function d3_geo_mercatorProjection(project) {
    var m = d3_geo_projection(project), scale = m.scale, translate = m.translate, clipExtent = m.clipExtent, clipAuto;
    m.scale = function() {
      var v = scale.apply(m, arguments);
      return v === m ? clipAuto ? m.clipExtent(null) : m : v;
    };
    m.translate = function() {
      var v = translate.apply(m, arguments);
      return v === m ? clipAuto ? m.clipExtent(null) : m : v;
    };
    m.clipExtent = function(_) {
      var v = clipExtent.apply(m, arguments);
      if (v === m) {
        if (clipAuto = _ == null) {
          var k = π * scale(), t = translate();
          clipExtent([ [ t[0] - k, t[1] - k ], [ t[0] + k, t[1] + k ] ]);
        }
      } else if (clipAuto) {
        v = null;
      }
      return v;
    };
    return m.clipExtent(null);
  }
  (d3.geo.mercator = function() {
    return d3_geo_mercatorProjection(d3_geo_mercator);
  }).raw = d3_geo_mercator;
  var d3_geo_orthographic = d3_geo_azimuthal(function() {
    return 1;
  }, Math.asin);
  (d3.geo.orthographic = function() {
    return d3_geo_projection(d3_geo_orthographic);
  }).raw = d3_geo_orthographic;
  var d3_geo_stereographic = d3_geo_azimuthal(function(cosλcosφ) {
    return 1 / (1 + cosλcosφ);
  }, function(ρ) {
    return 2 * Math.atan(ρ);
  });
  (d3.geo.stereographic = function() {
    return d3_geo_projection(d3_geo_stereographic);
  }).raw = d3_geo_stereographic;
  function d3_geo_transverseMercator(λ, φ) {
    return [ Math.log(Math.tan(π / 4 + φ / 2)), -λ ];
  }
  d3_geo_transverseMercator.invert = function(x, y) {
    return [ -y, 2 * Math.atan(Math.exp(x)) - halfπ ];
  };
  (d3.geo.transverseMercator = function() {
    var projection = d3_geo_mercatorProjection(d3_geo_transverseMercator), center = projection.center, rotate = projection.rotate;
    projection.center = function(_) {
      return _ ? center([ -_[1], _[0] ]) : (_ = center(), [ -_[1], _[0] ]);
    };
    projection.rotate = function(_) {
      return _ ? rotate([ _[0], _[1], _.length > 2 ? _[2] + 90 : 90 ]) : (_ = rotate(), 
      [ _[0], _[1], _[2] - 90 ]);
    };
    return projection.rotate([ 0, 0 ]);
  }).raw = d3_geo_transverseMercator;
  d3.geom = {};
  function d3_geom_pointX(d) {
    return d[0];
  }
  function d3_geom_pointY(d) {
    return d[1];
  }
  d3.geom.hull = function(vertices) {
    var x = d3_geom_pointX, y = d3_geom_pointY;
    if (arguments.length) return hull(vertices);
    function hull(data) {
      if (data.length < 3) return [];
      var fx = d3_functor(x), fy = d3_functor(y), i, n = data.length, points = [], flippedPoints = [];
      for (i = 0; i < n; i++) {
        points.push([ +fx.call(this, data[i], i), +fy.call(this, data[i], i), i ]);
      }
      points.sort(d3_geom_hullOrder);
      for (i = 0; i < n; i++) flippedPoints.push([ points[i][0], -points[i][1] ]);
      var upper = d3_geom_hullUpper(points), lower = d3_geom_hullUpper(flippedPoints);
      var skipLeft = lower[0] === upper[0], skipRight = lower[lower.length - 1] === upper[upper.length - 1], polygon = [];
      for (i = upper.length - 1; i >= 0; --i) polygon.push(data[points[upper[i]][2]]);
      for (i = +skipLeft; i < lower.length - skipRight; ++i) polygon.push(data[points[lower[i]][2]]);
      return polygon;
    }
    hull.x = function(_) {
      return arguments.length ? (x = _, hull) : x;
    };
    hull.y = function(_) {
      return arguments.length ? (y = _, hull) : y;
    };
    return hull;
  };
  function d3_geom_hullUpper(points) {
    var n = points.length, hull = [ 0, 1 ], hs = 2;
    for (var i = 2; i < n; i++) {
      while (hs > 1 && d3_cross2d(points[hull[hs - 2]], points[hull[hs - 1]], points[i]) <= 0) --hs;
      hull[hs++] = i;
    }
    return hull.slice(0, hs);
  }
  function d3_geom_hullOrder(a, b) {
    return a[0] - b[0] || a[1] - b[1];
  }
  d3.geom.polygon = function(coordinates) {
    d3_subclass(coordinates, d3_geom_polygonPrototype);
    return coordinates;
  };
  var d3_geom_polygonPrototype = d3.geom.polygon.prototype = [];
  d3_geom_polygonPrototype.area = function() {
    var i = -1, n = this.length, a, b = this[n - 1], area = 0;
    while (++i < n) {
      a = b;
      b = this[i];
      area += a[1] * b[0] - a[0] * b[1];
    }
    return area * .5;
  };
  d3_geom_polygonPrototype.centroid = function(k) {
    var i = -1, n = this.length, x = 0, y = 0, a, b = this[n - 1], c;
    if (!arguments.length) k = -1 / (6 * this.area());
    while (++i < n) {
      a = b;
      b = this[i];
      c = a[0] * b[1] - b[0] * a[1];
      x += (a[0] + b[0]) * c;
      y += (a[1] + b[1]) * c;
    }
    return [ x * k, y * k ];
  };
  d3_geom_polygonPrototype.clip = function(subject) {
    var input, closed = d3_geom_polygonClosed(subject), i = -1, n = this.length - d3_geom_polygonClosed(this), j, m, a = this[n - 1], b, c, d;
    while (++i < n) {
      input = subject.slice();
      subject.length = 0;
      b = this[i];
      c = input[(m = input.length - closed) - 1];
      j = -1;
      while (++j < m) {
        d = input[j];
        if (d3_geom_polygonInside(d, a, b)) {
          if (!d3_geom_polygonInside(c, a, b)) {
            subject.push(d3_geom_polygonIntersect(c, d, a, b));
          }
          subject.push(d);
        } else if (d3_geom_polygonInside(c, a, b)) {
          subject.push(d3_geom_polygonIntersect(c, d, a, b));
        }
        c = d;
      }
      if (closed) subject.push(subject[0]);
      a = b;
    }
    return subject;
  };
  function d3_geom_polygonInside(p, a, b) {
    return (b[0] - a[0]) * (p[1] - a[1]) < (b[1] - a[1]) * (p[0] - a[0]);
  }
  function d3_geom_polygonIntersect(c, d, a, b) {
    var x1 = c[0], x3 = a[0], x21 = d[0] - x1, x43 = b[0] - x3, y1 = c[1], y3 = a[1], y21 = d[1] - y1, y43 = b[1] - y3, ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
    return [ x1 + ua * x21, y1 + ua * y21 ];
  }
  function d3_geom_polygonClosed(coordinates) {
    var a = coordinates[0], b = coordinates[coordinates.length - 1];
    return !(a[0] - b[0] || a[1] - b[1]);
  }
  var d3_geom_voronoiEdges, d3_geom_voronoiCells, d3_geom_voronoiBeaches, d3_geom_voronoiBeachPool = [], d3_geom_voronoiFirstCircle, d3_geom_voronoiCircles, d3_geom_voronoiCirclePool = [];
  function d3_geom_voronoiBeach() {
    d3_geom_voronoiRedBlackNode(this);
    this.edge = this.site = this.circle = null;
  }
  function d3_geom_voronoiCreateBeach(site) {
    var beach = d3_geom_voronoiBeachPool.pop() || new d3_geom_voronoiBeach();
    beach.site = site;
    return beach;
  }
  function d3_geom_voronoiDetachBeach(beach) {
    d3_geom_voronoiDetachCircle(beach);
    d3_geom_voronoiBeaches.remove(beach);
    d3_geom_voronoiBeachPool.push(beach);
    d3_geom_voronoiRedBlackNode(beach);
  }
  function d3_geom_voronoiRemoveBeach(beach) {
    var circle = beach.circle, x = circle.x, y = circle.cy, vertex = {
      x: x,
      y: y
    }, previous = beach.P, next = beach.N, disappearing = [ beach ];
    d3_geom_voronoiDetachBeach(beach);
    var lArc = previous;
    while (lArc.circle && abs(x - lArc.circle.x) < ε && abs(y - lArc.circle.cy) < ε) {
      previous = lArc.P;
      disappearing.unshift(lArc);
      d3_geom_voronoiDetachBeach(lArc);
      lArc = previous;
    }
    disappearing.unshift(lArc);
    d3_geom_voronoiDetachCircle(lArc);
    var rArc = next;
    while (rArc.circle && abs(x - rArc.circle.x) < ε && abs(y - rArc.circle.cy) < ε) {
      next = rArc.N;
      disappearing.push(rArc);
      d3_geom_voronoiDetachBeach(rArc);
      rArc = next;
    }
    disappearing.push(rArc);
    d3_geom_voronoiDetachCircle(rArc);
    var nArcs = disappearing.length, iArc;
    for (iArc = 1; iArc < nArcs; ++iArc) {
      rArc = disappearing[iArc];
      lArc = disappearing[iArc - 1];
      d3_geom_voronoiSetEdgeEnd(rArc.edge, lArc.site, rArc.site, vertex);
    }
    lArc = disappearing[0];
    rArc = disappearing[nArcs - 1];
    rArc.edge = d3_geom_voronoiCreateEdge(lArc.site, rArc.site, null, vertex);
    d3_geom_voronoiAttachCircle(lArc);
    d3_geom_voronoiAttachCircle(rArc);
  }
  function d3_geom_voronoiAddBeach(site) {
    var x = site.x, directrix = site.y, lArc, rArc, dxl, dxr, node = d3_geom_voronoiBeaches._;
    while (node) {
      dxl = d3_geom_voronoiLeftBreakPoint(node, directrix) - x;
      if (dxl > ε) node = node.L; else {
        dxr = x - d3_geom_voronoiRightBreakPoint(node, directrix);
        if (dxr > ε) {
          if (!node.R) {
            lArc = node;
            break;
          }
          node = node.R;
        } else {
          if (dxl > -ε) {
            lArc = node.P;
            rArc = node;
          } else if (dxr > -ε) {
            lArc = node;
            rArc = node.N;
          } else {
            lArc = rArc = node;
          }
          break;
        }
      }
    }
    var newArc = d3_geom_voronoiCreateBeach(site);
    d3_geom_voronoiBeaches.insert(lArc, newArc);
    if (!lArc && !rArc) return;
    if (lArc === rArc) {
      d3_geom_voronoiDetachCircle(lArc);
      rArc = d3_geom_voronoiCreateBeach(lArc.site);
      d3_geom_voronoiBeaches.insert(newArc, rArc);
      newArc.edge = rArc.edge = d3_geom_voronoiCreateEdge(lArc.site, newArc.site);
      d3_geom_voronoiAttachCircle(lArc);
      d3_geom_voronoiAttachCircle(rArc);
      return;
    }
    if (!rArc) {
      newArc.edge = d3_geom_voronoiCreateEdge(lArc.site, newArc.site);
      return;
    }
    d3_geom_voronoiDetachCircle(lArc);
    d3_geom_voronoiDetachCircle(rArc);
    var lSite = lArc.site, ax = lSite.x, ay = lSite.y, bx = site.x - ax, by = site.y - ay, rSite = rArc.site, cx = rSite.x - ax, cy = rSite.y - ay, d = 2 * (bx * cy - by * cx), hb = bx * bx + by * by, hc = cx * cx + cy * cy, vertex = {
      x: (cy * hb - by * hc) / d + ax,
      y: (bx * hc - cx * hb) / d + ay
    };
    d3_geom_voronoiSetEdgeEnd(rArc.edge, lSite, rSite, vertex);
    newArc.edge = d3_geom_voronoiCreateEdge(lSite, site, null, vertex);
    rArc.edge = d3_geom_voronoiCreateEdge(site, rSite, null, vertex);
    d3_geom_voronoiAttachCircle(lArc);
    d3_geom_voronoiAttachCircle(rArc);
  }
  function d3_geom_voronoiLeftBreakPoint(arc, directrix) {
    var site = arc.site, rfocx = site.x, rfocy = site.y, pby2 = rfocy - directrix;
    if (!pby2) return rfocx;
    var lArc = arc.P;
    if (!lArc) return -Infinity;
    site = lArc.site;
    var lfocx = site.x, lfocy = site.y, plby2 = lfocy - directrix;
    if (!plby2) return lfocx;
    var hl = lfocx - rfocx, aby2 = 1 / pby2 - 1 / plby2, b = hl / plby2;
    if (aby2) return (-b + Math.sqrt(b * b - 2 * aby2 * (hl * hl / (-2 * plby2) - lfocy + plby2 / 2 + rfocy - pby2 / 2))) / aby2 + rfocx;
    return (rfocx + lfocx) / 2;
  }
  function d3_geom_voronoiRightBreakPoint(arc, directrix) {
    var rArc = arc.N;
    if (rArc) return d3_geom_voronoiLeftBreakPoint(rArc, directrix);
    var site = arc.site;
    return site.y === directrix ? site.x : Infinity;
  }
  function d3_geom_voronoiCell(site) {
    this.site = site;
    this.edges = [];
  }
  d3_geom_voronoiCell.prototype.prepare = function() {
    var halfEdges = this.edges, iHalfEdge = halfEdges.length, edge;
    while (iHalfEdge--) {
      edge = halfEdges[iHalfEdge].edge;
      if (!edge.b || !edge.a) halfEdges.splice(iHalfEdge, 1);
    }
    halfEdges.sort(d3_geom_voronoiHalfEdgeOrder);
    return halfEdges.length;
  };
  function d3_geom_voronoiCloseCells(extent) {
    var x0 = extent[0][0], x1 = extent[1][0], y0 = extent[0][1], y1 = extent[1][1], x2, y2, x3, y3, cells = d3_geom_voronoiCells, iCell = cells.length, cell, iHalfEdge, halfEdges, nHalfEdges, start, end;
    while (iCell--) {
      cell = cells[iCell];
      if (!cell || !cell.prepare()) continue;
      halfEdges = cell.edges;
      nHalfEdges = halfEdges.length;
      iHalfEdge = 0;
      while (iHalfEdge < nHalfEdges) {
        end = halfEdges[iHalfEdge].end(), x3 = end.x, y3 = end.y;
        start = halfEdges[++iHalfEdge % nHalfEdges].start(), x2 = start.x, y2 = start.y;
        if (abs(x3 - x2) > ε || abs(y3 - y2) > ε) {
          halfEdges.splice(iHalfEdge, 0, new d3_geom_voronoiHalfEdge(d3_geom_voronoiCreateBorderEdge(cell.site, end, abs(x3 - x0) < ε && y1 - y3 > ε ? {
            x: x0,
            y: abs(x2 - x0) < ε ? y2 : y1
          } : abs(y3 - y1) < ε && x1 - x3 > ε ? {
            x: abs(y2 - y1) < ε ? x2 : x1,
            y: y1
          } : abs(x3 - x1) < ε && y3 - y0 > ε ? {
            x: x1,
            y: abs(x2 - x1) < ε ? y2 : y0
          } : abs(y3 - y0) < ε && x3 - x0 > ε ? {
            x: abs(y2 - y0) < ε ? x2 : x0,
            y: y0
          } : null), cell.site, null));
          ++nHalfEdges;
        }
      }
    }
  }
  function d3_geom_voronoiHalfEdgeOrder(a, b) {
    return b.angle - a.angle;
  }
  function d3_geom_voronoiCircle() {
    d3_geom_voronoiRedBlackNode(this);
    this.x = this.y = this.arc = this.site = this.cy = null;
  }
  function d3_geom_voronoiAttachCircle(arc) {
    var lArc = arc.P, rArc = arc.N;
    if (!lArc || !rArc) return;
    var lSite = lArc.site, cSite = arc.site, rSite = rArc.site;
    if (lSite === rSite) return;
    var bx = cSite.x, by = cSite.y, ax = lSite.x - bx, ay = lSite.y - by, cx = rSite.x - bx, cy = rSite.y - by;
    var d = 2 * (ax * cy - ay * cx);
    if (d >= -ε2) return;
    var ha = ax * ax + ay * ay, hc = cx * cx + cy * cy, x = (cy * ha - ay * hc) / d, y = (ax * hc - cx * ha) / d, cy = y + by;
    var circle = d3_geom_voronoiCirclePool.pop() || new d3_geom_voronoiCircle();
    circle.arc = arc;
    circle.site = cSite;
    circle.x = x + bx;
    circle.y = cy + Math.sqrt(x * x + y * y);
    circle.cy = cy;
    arc.circle = circle;
    var before = null, node = d3_geom_voronoiCircles._;
    while (node) {
      if (circle.y < node.y || circle.y === node.y && circle.x <= node.x) {
        if (node.L) node = node.L; else {
          before = node.P;
          break;
        }
      } else {
        if (node.R) node = node.R; else {
          before = node;
          break;
        }
      }
    }
    d3_geom_voronoiCircles.insert(before, circle);
    if (!before) d3_geom_voronoiFirstCircle = circle;
  }
  function d3_geom_voronoiDetachCircle(arc) {
    var circle = arc.circle;
    if (circle) {
      if (!circle.P) d3_geom_voronoiFirstCircle = circle.N;
      d3_geom_voronoiCircles.remove(circle);
      d3_geom_voronoiCirclePool.push(circle);
      d3_geom_voronoiRedBlackNode(circle);
      arc.circle = null;
    }
  }
  function d3_geom_voronoiClipEdges(extent) {
    var edges = d3_geom_voronoiEdges, clip = d3_geom_clipLine(extent[0][0], extent[0][1], extent[1][0], extent[1][1]), i = edges.length, e;
    while (i--) {
      e = edges[i];
      if (!d3_geom_voronoiConnectEdge(e, extent) || !clip(e) || abs(e.a.x - e.b.x) < ε && abs(e.a.y - e.b.y) < ε) {
        e.a = e.b = null;
        edges.splice(i, 1);
      }
    }
  }
  function d3_geom_voronoiConnectEdge(edge, extent) {
    var vb = edge.b;
    if (vb) return true;
    var va = edge.a, x0 = extent[0][0], x1 = extent[1][0], y0 = extent[0][1], y1 = extent[1][1], lSite = edge.l, rSite = edge.r, lx = lSite.x, ly = lSite.y, rx = rSite.x, ry = rSite.y, fx = (lx + rx) / 2, fy = (ly + ry) / 2, fm, fb;
    if (ry === ly) {
      if (fx < x0 || fx >= x1) return;
      if (lx > rx) {
        if (!va) va = {
          x: fx,
          y: y0
        }; else if (va.y >= y1) return;
        vb = {
          x: fx,
          y: y1
        };
      } else {
        if (!va) va = {
          x: fx,
          y: y1
        }; else if (va.y < y0) return;
        vb = {
          x: fx,
          y: y0
        };
      }
    } else {
      fm = (lx - rx) / (ry - ly);
      fb = fy - fm * fx;
      if (fm < -1 || fm > 1) {
        if (lx > rx) {
          if (!va) va = {
            x: (y0 - fb) / fm,
            y: y0
          }; else if (va.y >= y1) return;
          vb = {
            x: (y1 - fb) / fm,
            y: y1
          };
        } else {
          if (!va) va = {
            x: (y1 - fb) / fm,
            y: y1
          }; else if (va.y < y0) return;
          vb = {
            x: (y0 - fb) / fm,
            y: y0
          };
        }
      } else {
        if (ly < ry) {
          if (!va) va = {
            x: x0,
            y: fm * x0 + fb
          }; else if (va.x >= x1) return;
          vb = {
            x: x1,
            y: fm * x1 + fb
          };
        } else {
          if (!va) va = {
            x: x1,
            y: fm * x1 + fb
          }; else if (va.x < x0) return;
          vb = {
            x: x0,
            y: fm * x0 + fb
          };
        }
      }
    }
    edge.a = va;
    edge.b = vb;
    return true;
  }
  function d3_geom_voronoiEdge(lSite, rSite) {
    this.l = lSite;
    this.r = rSite;
    this.a = this.b = null;
  }
  function d3_geom_voronoiCreateEdge(lSite, rSite, va, vb) {
    var edge = new d3_geom_voronoiEdge(lSite, rSite);
    d3_geom_voronoiEdges.push(edge);
    if (va) d3_geom_voronoiSetEdgeEnd(edge, lSite, rSite, va);
    if (vb) d3_geom_voronoiSetEdgeEnd(edge, rSite, lSite, vb);
    d3_geom_voronoiCells[lSite.i].edges.push(new d3_geom_voronoiHalfEdge(edge, lSite, rSite));
    d3_geom_voronoiCells[rSite.i].edges.push(new d3_geom_voronoiHalfEdge(edge, rSite, lSite));
    return edge;
  }
  function d3_geom_voronoiCreateBorderEdge(lSite, va, vb) {
    var edge = new d3_geom_voronoiEdge(lSite, null);
    edge.a = va;
    edge.b = vb;
    d3_geom_voronoiEdges.push(edge);
    return edge;
  }
  function d3_geom_voronoiSetEdgeEnd(edge, lSite, rSite, vertex) {
    if (!edge.a && !edge.b) {
      edge.a = vertex;
      edge.l = lSite;
      edge.r = rSite;
    } else if (edge.l === rSite) {
      edge.b = vertex;
    } else {
      edge.a = vertex;
    }
  }
  function d3_geom_voronoiHalfEdge(edge, lSite, rSite) {
    var va = edge.a, vb = edge.b;
    this.edge = edge;
    this.site = lSite;
    this.angle = rSite ? Math.atan2(rSite.y - lSite.y, rSite.x - lSite.x) : edge.l === lSite ? Math.atan2(vb.x - va.x, va.y - vb.y) : Math.atan2(va.x - vb.x, vb.y - va.y);
  }
  d3_geom_voronoiHalfEdge.prototype = {
    start: function() {
      return this.edge.l === this.site ? this.edge.a : this.edge.b;
    },
    end: function() {
      return this.edge.l === this.site ? this.edge.b : this.edge.a;
    }
  };
  function d3_geom_voronoiRedBlackTree() {
    this._ = null;
  }
  function d3_geom_voronoiRedBlackNode(node) {
    node.U = node.C = node.L = node.R = node.P = node.N = null;
  }
  d3_geom_voronoiRedBlackTree.prototype = {
    insert: function(after, node) {
      var parent, grandpa, uncle;
      if (after) {
        node.P = after;
        node.N = after.N;
        if (after.N) after.N.P = node;
        after.N = node;
        if (after.R) {
          after = after.R;
          while (after.L) after = after.L;
          after.L = node;
        } else {
          after.R = node;
        }
        parent = after;
      } else if (this._) {
        after = d3_geom_voronoiRedBlackFirst(this._);
        node.P = null;
        node.N = after;
        after.P = after.L = node;
        parent = after;
      } else {
        node.P = node.N = null;
        this._ = node;
        parent = null;
      }
      node.L = node.R = null;
      node.U = parent;
      node.C = true;
      after = node;
      while (parent && parent.C) {
        grandpa = parent.U;
        if (parent === grandpa.L) {
          uncle = grandpa.R;
          if (uncle && uncle.C) {
            parent.C = uncle.C = false;
            grandpa.C = true;
            after = grandpa;
          } else {
            if (after === parent.R) {
              d3_geom_voronoiRedBlackRotateLeft(this, parent);
              after = parent;
              parent = after.U;
            }
            parent.C = false;
            grandpa.C = true;
            d3_geom_voronoiRedBlackRotateRight(this, grandpa);
          }
        } else {
          uncle = grandpa.L;
          if (uncle && uncle.C) {
            parent.C = uncle.C = false;
            grandpa.C = true;
            after = grandpa;
          } else {
            if (after === parent.L) {
              d3_geom_voronoiRedBlackRotateRight(this, parent);
              after = parent;
              parent = after.U;
            }
            parent.C = false;
            grandpa.C = true;
            d3_geom_voronoiRedBlackRotateLeft(this, grandpa);
          }
        }
        parent = after.U;
      }
      this._.C = false;
    },
    remove: function(node) {
      if (node.N) node.N.P = node.P;
      if (node.P) node.P.N = node.N;
      node.N = node.P = null;
      var parent = node.U, sibling, left = node.L, right = node.R, next, red;
      if (!left) next = right; else if (!right) next = left; else next = d3_geom_voronoiRedBlackFirst(right);
      if (parent) {
        if (parent.L === node) parent.L = next; else parent.R = next;
      } else {
        this._ = next;
      }
      if (left && right) {
        red = next.C;
        next.C = node.C;
        next.L = left;
        left.U = next;
        if (next !== right) {
          parent = next.U;
          next.U = node.U;
          node = next.R;
          parent.L = node;
          next.R = right;
          right.U = next;
        } else {
          next.U = parent;
          parent = next;
          node = next.R;
        }
      } else {
        red = node.C;
        node = next;
      }
      if (node) node.U = parent;
      if (red) return;
      if (node && node.C) {
        node.C = false;
        return;
      }
      do {
        if (node === this._) break;
        if (node === parent.L) {
          sibling = parent.R;
          if (sibling.C) {
            sibling.C = false;
            parent.C = true;
            d3_geom_voronoiRedBlackRotateLeft(this, parent);
            sibling = parent.R;
          }
          if (sibling.L && sibling.L.C || sibling.R && sibling.R.C) {
            if (!sibling.R || !sibling.R.C) {
              sibling.L.C = false;
              sibling.C = true;
              d3_geom_voronoiRedBlackRotateRight(this, sibling);
              sibling = parent.R;
            }
            sibling.C = parent.C;
            parent.C = sibling.R.C = false;
            d3_geom_voronoiRedBlackRotateLeft(this, parent);
            node = this._;
            break;
          }
        } else {
          sibling = parent.L;
          if (sibling.C) {
            sibling.C = false;
            parent.C = true;
            d3_geom_voronoiRedBlackRotateRight(this, parent);
            sibling = parent.L;
          }
          if (sibling.L && sibling.L.C || sibling.R && sibling.R.C) {
            if (!sibling.L || !sibling.L.C) {
              sibling.R.C = false;
              sibling.C = true;
              d3_geom_voronoiRedBlackRotateLeft(this, sibling);
              sibling = parent.L;
            }
            sibling.C = parent.C;
            parent.C = sibling.L.C = false;
            d3_geom_voronoiRedBlackRotateRight(this, parent);
            node = this._;
            break;
          }
        }
        sibling.C = true;
        node = parent;
        parent = parent.U;
      } while (!node.C);
      if (node) node.C = false;
    }
  };
  function d3_geom_voronoiRedBlackRotateLeft(tree, node) {
    var p = node, q = node.R, parent = p.U;
    if (parent) {
      if (parent.L === p) parent.L = q; else parent.R = q;
    } else {
      tree._ = q;
    }
    q.U = parent;
    p.U = q;
    p.R = q.L;
    if (p.R) p.R.U = p;
    q.L = p;
  }
  function d3_geom_voronoiRedBlackRotateRight(tree, node) {
    var p = node, q = node.L, parent = p.U;
    if (parent) {
      if (parent.L === p) parent.L = q; else parent.R = q;
    } else {
      tree._ = q;
    }
    q.U = parent;
    p.U = q;
    p.L = q.R;
    if (p.L) p.L.U = p;
    q.R = p;
  }
  function d3_geom_voronoiRedBlackFirst(node) {
    while (node.L) node = node.L;
    return node;
  }
  function d3_geom_voronoi(sites, bbox) {
    var site = sites.sort(d3_geom_voronoiVertexOrder).pop(), x0, y0, circle;
    d3_geom_voronoiEdges = [];
    d3_geom_voronoiCells = new Array(sites.length);
    d3_geom_voronoiBeaches = new d3_geom_voronoiRedBlackTree();
    d3_geom_voronoiCircles = new d3_geom_voronoiRedBlackTree();
    while (true) {
      circle = d3_geom_voronoiFirstCircle;
      if (site && (!circle || site.y < circle.y || site.y === circle.y && site.x < circle.x)) {
        if (site.x !== x0 || site.y !== y0) {
          d3_geom_voronoiCells[site.i] = new d3_geom_voronoiCell(site);
          d3_geom_voronoiAddBeach(site);
          x0 = site.x, y0 = site.y;
        }
        site = sites.pop();
      } else if (circle) {
        d3_geom_voronoiRemoveBeach(circle.arc);
      } else {
        break;
      }
    }
    if (bbox) d3_geom_voronoiClipEdges(bbox), d3_geom_voronoiCloseCells(bbox);
    var diagram = {
      cells: d3_geom_voronoiCells,
      edges: d3_geom_voronoiEdges
    };
    d3_geom_voronoiBeaches = d3_geom_voronoiCircles = d3_geom_voronoiEdges = d3_geom_voronoiCells = null;
    return diagram;
  }
  function d3_geom_voronoiVertexOrder(a, b) {
    return b.y - a.y || b.x - a.x;
  }
  d3.geom.voronoi = function(points) {
    var x = d3_geom_pointX, y = d3_geom_pointY, fx = x, fy = y, clipExtent = d3_geom_voronoiClipExtent;
    if (points) return voronoi(points);
    function voronoi(data) {
      var polygons = new Array(data.length), x0 = clipExtent[0][0], y0 = clipExtent[0][1], x1 = clipExtent[1][0], y1 = clipExtent[1][1];
      d3_geom_voronoi(sites(data), clipExtent).cells.forEach(function(cell, i) {
        var edges = cell.edges, site = cell.site, polygon = polygons[i] = edges.length ? edges.map(function(e) {
          var s = e.start();
          return [ s.x, s.y ];
        }) : site.x >= x0 && site.x <= x1 && site.y >= y0 && site.y <= y1 ? [ [ x0, y1 ], [ x1, y1 ], [ x1, y0 ], [ x0, y0 ] ] : [];
        polygon.point = data[i];
      });
      return polygons;
    }
    function sites(data) {
      return data.map(function(d, i) {
        return {
          x: Math.round(fx(d, i) / ε) * ε,
          y: Math.round(fy(d, i) / ε) * ε,
          i: i
        };
      });
    }
    voronoi.links = function(data) {
      return d3_geom_voronoi(sites(data)).edges.filter(function(edge) {
        return edge.l && edge.r;
      }).map(function(edge) {
        return {
          source: data[edge.l.i],
          target: data[edge.r.i]
        };
      });
    };
    voronoi.triangles = function(data) {
      var triangles = [];
      d3_geom_voronoi(sites(data)).cells.forEach(function(cell, i) {
        var site = cell.site, edges = cell.edges.sort(d3_geom_voronoiHalfEdgeOrder), j = -1, m = edges.length, e0, s0, e1 = edges[m - 1].edge, s1 = e1.l === site ? e1.r : e1.l;
        while (++j < m) {
          e0 = e1;
          s0 = s1;
          e1 = edges[j].edge;
          s1 = e1.l === site ? e1.r : e1.l;
          if (i < s0.i && i < s1.i && d3_geom_voronoiTriangleArea(site, s0, s1) < 0) {
            triangles.push([ data[i], data[s0.i], data[s1.i] ]);
          }
        }
      });
      return triangles;
    };
    voronoi.x = function(_) {
      return arguments.length ? (fx = d3_functor(x = _), voronoi) : x;
    };
    voronoi.y = function(_) {
      return arguments.length ? (fy = d3_functor(y = _), voronoi) : y;
    };
    voronoi.clipExtent = function(_) {
      if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent;
      clipExtent = _ == null ? d3_geom_voronoiClipExtent : _;
      return voronoi;
    };
    voronoi.size = function(_) {
      if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent && clipExtent[1];
      return voronoi.clipExtent(_ && [ [ 0, 0 ], _ ]);
    };
    return voronoi;
  };
  var d3_geom_voronoiClipExtent = [ [ -1e6, -1e6 ], [ 1e6, 1e6 ] ];
  function d3_geom_voronoiTriangleArea(a, b, c) {
    return (a.x - c.x) * (b.y - a.y) - (a.x - b.x) * (c.y - a.y);
  }
  d3.geom.delaunay = function(vertices) {
    return d3.geom.voronoi().triangles(vertices);
  };
  d3.geom.quadtree = function(points, x1, y1, x2, y2) {
    var x = d3_geom_pointX, y = d3_geom_pointY, compat;
    if (compat = arguments.length) {
      x = d3_geom_quadtreeCompatX;
      y = d3_geom_quadtreeCompatY;
      if (compat === 3) {
        y2 = y1;
        x2 = x1;
        y1 = x1 = 0;
      }
      return quadtree(points);
    }
    function quadtree(data) {
      var d, fx = d3_functor(x), fy = d3_functor(y), xs, ys, i, n, x1_, y1_, x2_, y2_;
      if (x1 != null) {
        x1_ = x1, y1_ = y1, x2_ = x2, y2_ = y2;
      } else {
        x2_ = y2_ = -(x1_ = y1_ = Infinity);
        xs = [], ys = [];
        n = data.length;
        if (compat) for (i = 0; i < n; ++i) {
          d = data[i];
          if (d.x < x1_) x1_ = d.x;
          if (d.y < y1_) y1_ = d.y;
          if (d.x > x2_) x2_ = d.x;
          if (d.y > y2_) y2_ = d.y;
          xs.push(d.x);
          ys.push(d.y);
        } else for (i = 0; i < n; ++i) {
          var x_ = +fx(d = data[i], i), y_ = +fy(d, i);
          if (x_ < x1_) x1_ = x_;
          if (y_ < y1_) y1_ = y_;
          if (x_ > x2_) x2_ = x_;
          if (y_ > y2_) y2_ = y_;
          xs.push(x_);
          ys.push(y_);
        }
      }
      var dx = x2_ - x1_, dy = y2_ - y1_;
      if (dx > dy) y2_ = y1_ + dx; else x2_ = x1_ + dy;
      function insert(n, d, x, y, x1, y1, x2, y2) {
        if (isNaN(x) || isNaN(y)) return;
        if (n.leaf) {
          var nx = n.x, ny = n.y;
          if (nx != null) {
            if (abs(nx - x) + abs(ny - y) < .01) {
              insertChild(n, d, x, y, x1, y1, x2, y2);
            } else {
              var nPoint = n.point;
              n.x = n.y = n.point = null;
              insertChild(n, nPoint, nx, ny, x1, y1, x2, y2);
              insertChild(n, d, x, y, x1, y1, x2, y2);
            }
          } else {
            n.x = x, n.y = y, n.point = d;
          }
        } else {
          insertChild(n, d, x, y, x1, y1, x2, y2);
        }
      }
      function insertChild(n, d, x, y, x1, y1, x2, y2) {
        var sx = (x1 + x2) * .5, sy = (y1 + y2) * .5, right = x >= sx, bottom = y >= sy, i = (bottom << 1) + right;
        n.leaf = false;
        n = n.nodes[i] || (n.nodes[i] = d3_geom_quadtreeNode());
        if (right) x1 = sx; else x2 = sx;
        if (bottom) y1 = sy; else y2 = sy;
        insert(n, d, x, y, x1, y1, x2, y2);
      }
      var root = d3_geom_quadtreeNode();
      root.add = function(d) {
        insert(root, d, +fx(d, ++i), +fy(d, i), x1_, y1_, x2_, y2_);
      };
      root.visit = function(f) {
        d3_geom_quadtreeVisit(f, root, x1_, y1_, x2_, y2_);
      };
      i = -1;
      if (x1 == null) {
        while (++i < n) {
          insert(root, data[i], xs[i], ys[i], x1_, y1_, x2_, y2_);
        }
        --i;
      } else data.forEach(root.add);
      xs = ys = data = d = null;
      return root;
    }
    quadtree.x = function(_) {
      return arguments.length ? (x = _, quadtree) : x;
    };
    quadtree.y = function(_) {
      return arguments.length ? (y = _, quadtree) : y;
    };
    quadtree.extent = function(_) {
      if (!arguments.length) return x1 == null ? null : [ [ x1, y1 ], [ x2, y2 ] ];
      if (_ == null) x1 = y1 = x2 = y2 = null; else x1 = +_[0][0], y1 = +_[0][1], x2 = +_[1][0], 
      y2 = +_[1][1];
      return quadtree;
    };
    quadtree.size = function(_) {
      if (!arguments.length) return x1 == null ? null : [ x2 - x1, y2 - y1 ];
      if (_ == null) x1 = y1 = x2 = y2 = null; else x1 = y1 = 0, x2 = +_[0], y2 = +_[1];
      return quadtree;
    };
    return quadtree;
  };
  function d3_geom_quadtreeCompatX(d) {
    return d.x;
  }
  function d3_geom_quadtreeCompatY(d) {
    return d.y;
  }
  function d3_geom_quadtreeNode() {
    return {
      leaf: true,
      nodes: [],
      point: null,
      x: null,
      y: null
    };
  }
  function d3_geom_quadtreeVisit(f, node, x1, y1, x2, y2) {
    if (!f(node, x1, y1, x2, y2)) {
      var sx = (x1 + x2) * .5, sy = (y1 + y2) * .5, children = node.nodes;
      if (children[0]) d3_geom_quadtreeVisit(f, children[0], x1, y1, sx, sy);
      if (children[1]) d3_geom_quadtreeVisit(f, children[1], sx, y1, x2, sy);
      if (children[2]) d3_geom_quadtreeVisit(f, children[2], x1, sy, sx, y2);
      if (children[3]) d3_geom_quadtreeVisit(f, children[3], sx, sy, x2, y2);
    }
  }
  d3.interpolateRgb = d3_interpolateRgb;
  function d3_interpolateRgb(a, b) {
    a = d3.rgb(a);
    b = d3.rgb(b);
    var ar = a.r, ag = a.g, ab = a.b, br = b.r - ar, bg = b.g - ag, bb = b.b - ab;
    return function(t) {
      return "#" + d3_rgb_hex(Math.round(ar + br * t)) + d3_rgb_hex(Math.round(ag + bg * t)) + d3_rgb_hex(Math.round(ab + bb * t));
    };
  }
  d3.interpolateObject = d3_interpolateObject;
  function d3_interpolateObject(a, b) {
    var i = {}, c = {}, k;
    for (k in a) {
      if (k in b) {
        i[k] = d3_interpolate(a[k], b[k]);
      } else {
        c[k] = a[k];
      }
    }
    for (k in b) {
      if (!(k in a)) {
        c[k] = b[k];
      }
    }
    return function(t) {
      for (k in i) c[k] = i[k](t);
      return c;
    };
  }
  d3.interpolateNumber = d3_interpolateNumber;
  function d3_interpolateNumber(a, b) {
    b -= a = +a;
    return function(t) {
      return a + b * t;
    };
  }
  d3.interpolateString = d3_interpolateString;
  function d3_interpolateString(a, b) {
    var bi = d3_interpolate_numberA.lastIndex = d3_interpolate_numberB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
    a = a + "", b = b + "";
    while ((am = d3_interpolate_numberA.exec(a)) && (bm = d3_interpolate_numberB.exec(b))) {
      if ((bs = bm.index) > bi) {
        bs = b.substring(bi, bs);
        if (s[i]) s[i] += bs; else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) {
        if (s[i]) s[i] += bm; else s[++i] = bm;
      } else {
        s[++i] = null;
        q.push({
          i: i,
          x: d3_interpolateNumber(am, bm)
        });
      }
      bi = d3_interpolate_numberB.lastIndex;
    }
    if (bi < b.length) {
      bs = b.substring(bi);
      if (s[i]) s[i] += bs; else s[++i] = bs;
    }
    return s.length < 2 ? q[0] ? (b = q[0].x, function(t) {
      return b(t) + "";
    }) : function() {
      return b;
    } : (b = q.length, function(t) {
      for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    });
  }
  var d3_interpolate_numberA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, d3_interpolate_numberB = new RegExp(d3_interpolate_numberA.source, "g");
  d3.interpolate = d3_interpolate;
  function d3_interpolate(a, b) {
    var i = d3.interpolators.length, f;
    while (--i >= 0 && !(f = d3.interpolators[i](a, b))) ;
    return f;
  }
  d3.interpolators = [ function(a, b) {
    var t = typeof b;
    return (t === "string" ? d3_rgb_names.has(b) || /^(#|rgb\(|hsl\()/.test(b) ? d3_interpolateRgb : d3_interpolateString : b instanceof d3_Color ? d3_interpolateRgb : Array.isArray(b) ? d3_interpolateArray : t === "object" && isNaN(b) ? d3_interpolateObject : d3_interpolateNumber)(a, b);
  } ];
  d3.interpolateArray = d3_interpolateArray;
  function d3_interpolateArray(a, b) {
    var x = [], c = [], na = a.length, nb = b.length, n0 = Math.min(a.length, b.length), i;
    for (i = 0; i < n0; ++i) x.push(d3_interpolate(a[i], b[i]));
    for (;i < na; ++i) c[i] = a[i];
    for (;i < nb; ++i) c[i] = b[i];
    return function(t) {
      for (i = 0; i < n0; ++i) c[i] = x[i](t);
      return c;
    };
  }
  var d3_ease_default = function() {
    return d3_identity;
  };
  var d3_ease = d3.map({
    linear: d3_ease_default,
    poly: d3_ease_poly,
    quad: function() {
      return d3_ease_quad;
    },
    cubic: function() {
      return d3_ease_cubic;
    },
    sin: function() {
      return d3_ease_sin;
    },
    exp: function() {
      return d3_ease_exp;
    },
    circle: function() {
      return d3_ease_circle;
    },
    elastic: d3_ease_elastic,
    back: d3_ease_back,
    bounce: function() {
      return d3_ease_bounce;
    }
  });
  var d3_ease_mode = d3.map({
    "in": d3_identity,
    out: d3_ease_reverse,
    "in-out": d3_ease_reflect,
    "out-in": function(f) {
      return d3_ease_reflect(d3_ease_reverse(f));
    }
  });
  d3.ease = function(name) {
    var i = name.indexOf("-"), t = i >= 0 ? name.substring(0, i) : name, m = i >= 0 ? name.substring(i + 1) : "in";
    t = d3_ease.get(t) || d3_ease_default;
    m = d3_ease_mode.get(m) || d3_identity;
    return d3_ease_clamp(m(t.apply(null, d3_arraySlice.call(arguments, 1))));
  };
  function d3_ease_clamp(f) {
    return function(t) {
      return t <= 0 ? 0 : t >= 1 ? 1 : f(t);
    };
  }
  function d3_ease_reverse(f) {
    return function(t) {
      return 1 - f(1 - t);
    };
  }
  function d3_ease_reflect(f) {
    return function(t) {
      return .5 * (t < .5 ? f(2 * t) : 2 - f(2 - 2 * t));
    };
  }
  function d3_ease_quad(t) {
    return t * t;
  }
  function d3_ease_cubic(t) {
    return t * t * t;
  }
  function d3_ease_cubicInOut(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    var t2 = t * t, t3 = t2 * t;
    return 4 * (t < .5 ? t3 : 3 * (t - t2) + t3 - .75);
  }
  function d3_ease_poly(e) {
    return function(t) {
      return Math.pow(t, e);
    };
  }
  function d3_ease_sin(t) {
    return 1 - Math.cos(t * halfπ);
  }
  function d3_ease_exp(t) {
    return Math.pow(2, 10 * (t - 1));
  }
  function d3_ease_circle(t) {
    return 1 - Math.sqrt(1 - t * t);
  }
  function d3_ease_elastic(a, p) {
    var s;
    if (arguments.length < 2) p = .45;
    if (arguments.length) s = p / τ * Math.asin(1 / a); else a = 1, s = p / 4;
    return function(t) {
      return 1 + a * Math.pow(2, -10 * t) * Math.sin((t - s) * τ / p);
    };
  }
  function d3_ease_back(s) {
    if (!s) s = 1.70158;
    return function(t) {
      return t * t * ((s + 1) * t - s);
    };
  }
  function d3_ease_bounce(t) {
    return t < 1 / 2.75 ? 7.5625 * t * t : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + .75 : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + .9375 : 7.5625 * (t -= 2.625 / 2.75) * t + .984375;
  }
  d3.interpolateHcl = d3_interpolateHcl;
  function d3_interpolateHcl(a, b) {
    a = d3.hcl(a);
    b = d3.hcl(b);
    var ah = a.h, ac = a.c, al = a.l, bh = b.h - ah, bc = b.c - ac, bl = b.l - al;
    if (isNaN(bc)) bc = 0, ac = isNaN(ac) ? b.c : ac;
    if (isNaN(bh)) bh = 0, ah = isNaN(ah) ? b.h : ah; else if (bh > 180) bh -= 360; else if (bh < -180) bh += 360;
    return function(t) {
      return d3_hcl_lab(ah + bh * t, ac + bc * t, al + bl * t) + "";
    };
  }
  d3.interpolateHsl = d3_interpolateHsl;
  function d3_interpolateHsl(a, b) {
    a = d3.hsl(a);
    b = d3.hsl(b);
    var ah = a.h, as = a.s, al = a.l, bh = b.h - ah, bs = b.s - as, bl = b.l - al;
    if (isNaN(bs)) bs = 0, as = isNaN(as) ? b.s : as;
    if (isNaN(bh)) bh = 0, ah = isNaN(ah) ? b.h : ah; else if (bh > 180) bh -= 360; else if (bh < -180) bh += 360;
    return function(t) {
      return d3_hsl_rgb(ah + bh * t, as + bs * t, al + bl * t) + "";
    };
  }
  d3.interpolateLab = d3_interpolateLab;
  function d3_interpolateLab(a, b) {
    a = d3.lab(a);
    b = d3.lab(b);
    var al = a.l, aa = a.a, ab = a.b, bl = b.l - al, ba = b.a - aa, bb = b.b - ab;
    return function(t) {
      return d3_lab_rgb(al + bl * t, aa + ba * t, ab + bb * t) + "";
    };
  }
  d3.interpolateRound = d3_interpolateRound;
  function d3_interpolateRound(a, b) {
    b -= a;
    return function(t) {
      return Math.round(a + b * t);
    };
  }
  d3.transform = function(string) {
    var g = d3_document.createElementNS(d3.ns.prefix.svg, "g");
    return (d3.transform = function(string) {
      if (string != null) {
        g.setAttribute("transform", string);
        var t = g.transform.baseVal.consolidate();
      }
      return new d3_transform(t ? t.matrix : d3_transformIdentity);
    })(string);
  };
  function d3_transform(m) {
    var r0 = [ m.a, m.b ], r1 = [ m.c, m.d ], kx = d3_transformNormalize(r0), kz = d3_transformDot(r0, r1), ky = d3_transformNormalize(d3_transformCombine(r1, r0, -kz)) || 0;
    if (r0[0] * r1[1] < r1[0] * r0[1]) {
      r0[0] *= -1;
      r0[1] *= -1;
      kx *= -1;
      kz *= -1;
    }
    this.rotate = (kx ? Math.atan2(r0[1], r0[0]) : Math.atan2(-r1[0], r1[1])) * d3_degrees;
    this.translate = [ m.e, m.f ];
    this.scale = [ kx, ky ];
    this.skew = ky ? Math.atan2(kz, ky) * d3_degrees : 0;
  }
  d3_transform.prototype.toString = function() {
    return "translate(" + this.translate + ")rotate(" + this.rotate + ")skewX(" + this.skew + ")scale(" + this.scale + ")";
  };
  function d3_transformDot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  }
  function d3_transformNormalize(a) {
    var k = Math.sqrt(d3_transformDot(a, a));
    if (k) {
      a[0] /= k;
      a[1] /= k;
    }
    return k;
  }
  function d3_transformCombine(a, b, k) {
    a[0] += k * b[0];
    a[1] += k * b[1];
    return a;
  }
  var d3_transformIdentity = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0
  };
  d3.interpolateTransform = d3_interpolateTransform;
  function d3_interpolateTransform(a, b) {
    var s = [], q = [], n, A = d3.transform(a), B = d3.transform(b), ta = A.translate, tb = B.translate, ra = A.rotate, rb = B.rotate, wa = A.skew, wb = B.skew, ka = A.scale, kb = B.scale;
    if (ta[0] != tb[0] || ta[1] != tb[1]) {
      s.push("translate(", null, ",", null, ")");
      q.push({
        i: 1,
        x: d3_interpolateNumber(ta[0], tb[0])
      }, {
        i: 3,
        x: d3_interpolateNumber(ta[1], tb[1])
      });
    } else if (tb[0] || tb[1]) {
      s.push("translate(" + tb + ")");
    } else {
      s.push("");
    }
    if (ra != rb) {
      if (ra - rb > 180) rb += 360; else if (rb - ra > 180) ra += 360;
      q.push({
        i: s.push(s.pop() + "rotate(", null, ")") - 2,
        x: d3_interpolateNumber(ra, rb)
      });
    } else if (rb) {
      s.push(s.pop() + "rotate(" + rb + ")");
    }
    if (wa != wb) {
      q.push({
        i: s.push(s.pop() + "skewX(", null, ")") - 2,
        x: d3_interpolateNumber(wa, wb)
      });
    } else if (wb) {
      s.push(s.pop() + "skewX(" + wb + ")");
    }
    if (ka[0] != kb[0] || ka[1] != kb[1]) {
      n = s.push(s.pop() + "scale(", null, ",", null, ")");
      q.push({
        i: n - 4,
        x: d3_interpolateNumber(ka[0], kb[0])
      }, {
        i: n - 2,
        x: d3_interpolateNumber(ka[1], kb[1])
      });
    } else if (kb[0] != 1 || kb[1] != 1) {
      s.push(s.pop() + "scale(" + kb + ")");
    }
    n = q.length;
    return function(t) {
      var i = -1, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  }
  function d3_uninterpolateNumber(a, b) {
    b = b - (a = +a) ? 1 / (b - a) : 0;
    return function(x) {
      return (x - a) * b;
    };
  }
  function d3_uninterpolateClamp(a, b) {
    b = b - (a = +a) ? 1 / (b - a) : 0;
    return function(x) {
      return Math.max(0, Math.min(1, (x - a) * b));
    };
  }
  d3.layout = {};
  d3.layout.bundle = function() {
    return function(links) {
      var paths = [], i = -1, n = links.length;
      while (++i < n) paths.push(d3_layout_bundlePath(links[i]));
      return paths;
    };
  };
  function d3_layout_bundlePath(link) {
    var start = link.source, end = link.target, lca = d3_layout_bundleLeastCommonAncestor(start, end), points = [ start ];
    while (start !== lca) {
      start = start.parent;
      points.push(start);
    }
    var k = points.length;
    while (end !== lca) {
      points.splice(k, 0, end);
      end = end.parent;
    }
    return points;
  }
  function d3_layout_bundleAncestors(node) {
    var ancestors = [], parent = node.parent;
    while (parent != null) {
      ancestors.push(node);
      node = parent;
      parent = parent.parent;
    }
    ancestors.push(node);
    return ancestors;
  }
  function d3_layout_bundleLeastCommonAncestor(a, b) {
    if (a === b) return a;
    var aNodes = d3_layout_bundleAncestors(a), bNodes = d3_layout_bundleAncestors(b), aNode = aNodes.pop(), bNode = bNodes.pop(), sharedNode = null;
    while (aNode === bNode) {
      sharedNode = aNode;
      aNode = aNodes.pop();
      bNode = bNodes.pop();
    }
    return sharedNode;
  }
  d3.layout.chord = function() {
    var chord = {}, chords, groups, matrix, n, padding = 0, sortGroups, sortSubgroups, sortChords;
    function relayout() {
      var subgroups = {}, groupSums = [], groupIndex = d3.range(n), subgroupIndex = [], k, x, x0, i, j;
      chords = [];
      groups = [];
      k = 0, i = -1;
      while (++i < n) {
        x = 0, j = -1;
        while (++j < n) {
          x += matrix[i][j];
        }
        groupSums.push(x);
        subgroupIndex.push(d3.range(n));
        k += x;
      }
      if (sortGroups) {
        groupIndex.sort(function(a, b) {
          return sortGroups(groupSums[a], groupSums[b]);
        });
      }
      if (sortSubgroups) {
        subgroupIndex.forEach(function(d, i) {
          d.sort(function(a, b) {
            return sortSubgroups(matrix[i][a], matrix[i][b]);
          });
        });
      }
      k = (τ - padding * n) / k;
      x = 0, i = -1;
      while (++i < n) {
        x0 = x, j = -1;
        while (++j < n) {
          var di = groupIndex[i], dj = subgroupIndex[di][j], v = matrix[di][dj], a0 = x, a1 = x += v * k;
          subgroups[di + "-" + dj] = {
            index: di,
            subindex: dj,
            startAngle: a0,
            endAngle: a1,
            value: v
          };
        }
        groups[di] = {
          index: di,
          startAngle: x0,
          endAngle: x,
          value: (x - x0) / k
        };
        x += padding;
      }
      i = -1;
      while (++i < n) {
        j = i - 1;
        while (++j < n) {
          var source = subgroups[i + "-" + j], target = subgroups[j + "-" + i];
          if (source.value || target.value) {
            chords.push(source.value < target.value ? {
              source: target,
              target: source
            } : {
              source: source,
              target: target
            });
          }
        }
      }
      if (sortChords) resort();
    }
    function resort() {
      chords.sort(function(a, b) {
        return sortChords((a.source.value + a.target.value) / 2, (b.source.value + b.target.value) / 2);
      });
    }
    chord.matrix = function(x) {
      if (!arguments.length) return matrix;
      n = (matrix = x) && matrix.length;
      chords = groups = null;
      return chord;
    };
    chord.padding = function(x) {
      if (!arguments.length) return padding;
      padding = x;
      chords = groups = null;
      return chord;
    };
    chord.sortGroups = function(x) {
      if (!arguments.length) return sortGroups;
      sortGroups = x;
      chords = groups = null;
      return chord;
    };
    chord.sortSubgroups = function(x) {
      if (!arguments.length) return sortSubgroups;
      sortSubgroups = x;
      chords = null;
      return chord;
    };
    chord.sortChords = function(x) {
      if (!arguments.length) return sortChords;
      sortChords = x;
      if (chords) resort();
      return chord;
    };
    chord.chords = function() {
      if (!chords) relayout();
      return chords;
    };
    chord.groups = function() {
      if (!groups) relayout();
      return groups;
    };
    return chord;
  };
  d3.layout.force = function() {
    var force = {}, event = d3.dispatch("start", "tick", "end"), size = [ 1, 1 ], drag, alpha, friction = .9, linkDistance = d3_layout_forceLinkDistance, linkStrength = d3_layout_forceLinkStrength, charge = -30, chargeDistance2 = d3_layout_forceChargeDistance2, gravity = .1, theta2 = .64, nodes = [], links = [], distances, strengths, charges;
    function repulse(node) {
      return function(quad, x1, _, x2) {
        if (quad.point !== node) {
          var dx = quad.cx - node.x, dy = quad.cy - node.y, dw = x2 - x1, dn = dx * dx + dy * dy;
          if (dw * dw / theta2 < dn) {
            if (dn < chargeDistance2) {
              var k = quad.charge / dn;
              node.px -= dx * k;
              node.py -= dy * k;
            }
            return true;
          }
          if (quad.point && dn && dn < chargeDistance2) {
            var k = quad.pointCharge / dn;
            node.px -= dx * k;
            node.py -= dy * k;
          }
        }
        return !quad.charge;
      };
    }
    force.tick = function() {
      if ((alpha *= .99) < .005) {
        event.end({
          type: "end",
          alpha: alpha = 0
        });
        return true;
      }
      var n = nodes.length, m = links.length, q, i, o, s, t, l, k, x, y;
      for (i = 0; i < m; ++i) {
        o = links[i];
        s = o.source;
        t = o.target;
        x = t.x - s.x;
        y = t.y - s.y;
        if (l = x * x + y * y) {
          l = alpha * strengths[i] * ((l = Math.sqrt(l)) - distances[i]) / l;
          x *= l;
          y *= l;
          t.x -= x * (k = s.weight / (t.weight + s.weight));
          t.y -= y * k;
          s.x += x * (k = 1 - k);
          s.y += y * k;
        }
      }
      if (k = alpha * gravity) {
        x = size[0] / 2;
        y = size[1] / 2;
        i = -1;
        if (k) while (++i < n) {
          o = nodes[i];
          o.x += (x - o.x) * k;
          o.y += (y - o.y) * k;
        }
      }
      if (charge) {
        d3_layout_forceAccumulate(q = d3.geom.quadtree(nodes), alpha, charges);
        i = -1;
        while (++i < n) {
          if (!(o = nodes[i]).fixed) {
            q.visit(repulse(o));
          }
        }
      }
      i = -1;
      while (++i < n) {
        o = nodes[i];
        if (o.fixed) {
          o.x = o.px;
          o.y = o.py;
        } else {
          o.x -= (o.px - (o.px = o.x)) * friction;
          o.y -= (o.py - (o.py = o.y)) * friction;
        }
      }
      event.tick({
        type: "tick",
        alpha: alpha
      });
    };
    force.nodes = function(x) {
      if (!arguments.length) return nodes;
      nodes = x;
      return force;
    };
    force.links = function(x) {
      if (!arguments.length) return links;
      links = x;
      return force;
    };
    force.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return force;
    };
    force.linkDistance = function(x) {
      if (!arguments.length) return linkDistance;
      linkDistance = typeof x === "function" ? x : +x;
      return force;
    };
    force.distance = force.linkDistance;
    force.linkStrength = function(x) {
      if (!arguments.length) return linkStrength;
      linkStrength = typeof x === "function" ? x : +x;
      return force;
    };
    force.friction = function(x) {
      if (!arguments.length) return friction;
      friction = +x;
      return force;
    };
    force.charge = function(x) {
      if (!arguments.length) return charge;
      charge = typeof x === "function" ? x : +x;
      return force;
    };
    force.chargeDistance = function(x) {
      if (!arguments.length) return Math.sqrt(chargeDistance2);
      chargeDistance2 = x * x;
      return force;
    };
    force.gravity = function(x) {
      if (!arguments.length) return gravity;
      gravity = +x;
      return force;
    };
    force.theta = function(x) {
      if (!arguments.length) return Math.sqrt(theta2);
      theta2 = x * x;
      return force;
    };
    force.alpha = function(x) {
      if (!arguments.length) return alpha;
      x = +x;
      if (alpha) {
        if (x > 0) alpha = x; else alpha = 0;
      } else if (x > 0) {
        event.start({
          type: "start",
          alpha: alpha = x
        });
        d3.timer(force.tick);
      }
      return force;
    };
    force.start = function() {
      var i, n = nodes.length, m = links.length, w = size[0], h = size[1], neighbors, o;
      for (i = 0; i < n; ++i) {
        (o = nodes[i]).index = i;
        o.weight = 0;
      }
      for (i = 0; i < m; ++i) {
        o = links[i];
        if (typeof o.source == "number") o.source = nodes[o.source];
        if (typeof o.target == "number") o.target = nodes[o.target];
        ++o.source.weight;
        ++o.target.weight;
      }
      for (i = 0; i < n; ++i) {
        o = nodes[i];
        if (isNaN(o.x)) o.x = position("x", w);
        if (isNaN(o.y)) o.y = position("y", h);
        if (isNaN(o.px)) o.px = o.x;
        if (isNaN(o.py)) o.py = o.y;
      }
      distances = [];
      if (typeof linkDistance === "function") for (i = 0; i < m; ++i) distances[i] = +linkDistance.call(this, links[i], i); else for (i = 0; i < m; ++i) distances[i] = linkDistance;
      strengths = [];
      if (typeof linkStrength === "function") for (i = 0; i < m; ++i) strengths[i] = +linkStrength.call(this, links[i], i); else for (i = 0; i < m; ++i) strengths[i] = linkStrength;
      charges = [];
      if (typeof charge === "function") for (i = 0; i < n; ++i) charges[i] = +charge.call(this, nodes[i], i); else for (i = 0; i < n; ++i) charges[i] = charge;
      function position(dimension, size) {
        if (!neighbors) {
          neighbors = new Array(n);
          for (j = 0; j < n; ++j) {
            neighbors[j] = [];
          }
          for (j = 0; j < m; ++j) {
            var o = links[j];
            neighbors[o.source.index].push(o.target);
            neighbors[o.target.index].push(o.source);
          }
        }
        var candidates = neighbors[i], j = -1, m = candidates.length, x;
        while (++j < m) if (!isNaN(x = candidates[j][dimension])) return x;
        return Math.random() * size;
      }
      return force.resume();
    };
    force.resume = function() {
      return force.alpha(.1);
    };
    force.stop = function() {
      return force.alpha(0);
    };
    force.drag = function() {
      if (!drag) drag = d3.behavior.drag().origin(d3_identity).on("dragstart.force", d3_layout_forceDragstart).on("drag.force", dragmove).on("dragend.force", d3_layout_forceDragend);
      if (!arguments.length) return drag;
      this.on("mouseover.force", d3_layout_forceMouseover).on("mouseout.force", d3_layout_forceMouseout).call(drag);
    };
    function dragmove(d) {
      d.px = d3.event.x, d.py = d3.event.y;
      force.resume();
    }
    return d3.rebind(force, event, "on");
  };
  function d3_layout_forceDragstart(d) {
    d.fixed |= 2;
  }
  function d3_layout_forceDragend(d) {
    d.fixed &= ~6;
  }
  function d3_layout_forceMouseover(d) {
    d.fixed |= 4;
    d.px = d.x, d.py = d.y;
  }
  function d3_layout_forceMouseout(d) {
    d.fixed &= ~4;
  }
  function d3_layout_forceAccumulate(quad, alpha, charges) {
    var cx = 0, cy = 0;
    quad.charge = 0;
    if (!quad.leaf) {
      var nodes = quad.nodes, n = nodes.length, i = -1, c;
      while (++i < n) {
        c = nodes[i];
        if (c == null) continue;
        d3_layout_forceAccumulate(c, alpha, charges);
        quad.charge += c.charge;
        cx += c.charge * c.cx;
        cy += c.charge * c.cy;
      }
    }
    if (quad.point) {
      if (!quad.leaf) {
        quad.point.x += Math.random() - .5;
        quad.point.y += Math.random() - .5;
      }
      var k = alpha * charges[quad.point.index];
      quad.charge += quad.pointCharge = k;
      cx += k * quad.point.x;
      cy += k * quad.point.y;
    }
    quad.cx = cx / quad.charge;
    quad.cy = cy / quad.charge;
  }
  var d3_layout_forceLinkDistance = 20, d3_layout_forceLinkStrength = 1, d3_layout_forceChargeDistance2 = Infinity;
  d3.layout.hierarchy = function() {
    var sort = d3_layout_hierarchySort, children = d3_layout_hierarchyChildren, value = d3_layout_hierarchyValue;
    function recurse(node, depth, nodes) {
      var childs = children.call(hierarchy, node, depth);
      node.depth = depth;
      nodes.push(node);
      if (childs && (n = childs.length)) {
        var i = -1, n, c = node.children = new Array(n), v = 0, j = depth + 1, d;
        while (++i < n) {
          d = c[i] = recurse(childs[i], j, nodes);
          d.parent = node;
          v += d.value;
        }
        if (sort) c.sort(sort);
        if (value) node.value = v;
      } else {
        delete node.children;
        if (value) {
          node.value = +value.call(hierarchy, node, depth) || 0;
        }
      }
      return node;
    }
    function revalue(node, depth) {
      var children = node.children, v = 0;
      if (children && (n = children.length)) {
        var i = -1, n, j = depth + 1;
        while (++i < n) v += revalue(children[i], j);
      } else if (value) {
        v = +value.call(hierarchy, node, depth) || 0;
      }
      if (value) node.value = v;
      return v;
    }
    function hierarchy(d) {
      var nodes = [];
      recurse(d, 0, nodes);
      return nodes;
    }
    hierarchy.sort = function(x) {
      if (!arguments.length) return sort;
      sort = x;
      return hierarchy;
    };
    hierarchy.children = function(x) {
      if (!arguments.length) return children;
      children = x;
      return hierarchy;
    };
    hierarchy.value = function(x) {
      if (!arguments.length) return value;
      value = x;
      return hierarchy;
    };
    hierarchy.revalue = function(root) {
      revalue(root, 0);
      return root;
    };
    return hierarchy;
  };
  function d3_layout_hierarchyRebind(object, hierarchy) {
    d3.rebind(object, hierarchy, "sort", "children", "value");
    object.nodes = object;
    object.links = d3_layout_hierarchyLinks;
    return object;
  }
  function d3_layout_hierarchyChildren(d) {
    return d.children;
  }
  function d3_layout_hierarchyValue(d) {
    return d.value;
  }
  function d3_layout_hierarchySort(a, b) {
    return b.value - a.value;
  }
  function d3_layout_hierarchyLinks(nodes) {
    return d3.merge(nodes.map(function(parent) {
      return (parent.children || []).map(function(child) {
        return {
          source: parent,
          target: child
        };
      });
    }));
  }
  d3.layout.partition = function() {
    var hierarchy = d3.layout.hierarchy(), size = [ 1, 1 ];
    function position(node, x, dx, dy) {
      var children = node.children;
      node.x = x;
      node.y = node.depth * dy;
      node.dx = dx;
      node.dy = dy;
      if (children && (n = children.length)) {
        var i = -1, n, c, d;
        dx = node.value ? dx / node.value : 0;
        while (++i < n) {
          position(c = children[i], x, d = c.value * dx, dy);
          x += d;
        }
      }
    }
    function depth(node) {
      var children = node.children, d = 0;
      if (children && (n = children.length)) {
        var i = -1, n;
        while (++i < n) d = Math.max(d, depth(children[i]));
      }
      return 1 + d;
    }
    function partition(d, i) {
      var nodes = hierarchy.call(this, d, i);
      position(nodes[0], 0, size[0], size[1] / depth(nodes[0]));
      return nodes;
    }
    partition.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return partition;
    };
    return d3_layout_hierarchyRebind(partition, hierarchy);
  };
  d3.layout.pie = function() {
    var value = Number, sort = d3_layout_pieSortByValue, startAngle = 0, endAngle = τ;
    function pie(data) {
      var values = data.map(function(d, i) {
        return +value.call(pie, d, i);
      });
      var a = +(typeof startAngle === "function" ? startAngle.apply(this, arguments) : startAngle);
      var k = ((typeof endAngle === "function" ? endAngle.apply(this, arguments) : endAngle) - a) / d3.sum(values);
      var index = d3.range(data.length);
      if (sort != null) index.sort(sort === d3_layout_pieSortByValue ? function(i, j) {
        return values[j] - values[i];
      } : function(i, j) {
        return sort(data[i], data[j]);
      });
      var arcs = [];
      index.forEach(function(i) {
        var d;
        arcs[i] = {
          data: data[i],
          value: d = values[i],
          startAngle: a,
          endAngle: a += d * k
        };
      });
      return arcs;
    }
    pie.value = function(x) {
      if (!arguments.length) return value;
      value = x;
      return pie;
    };
    pie.sort = function(x) {
      if (!arguments.length) return sort;
      sort = x;
      return pie;
    };
    pie.startAngle = function(x) {
      if (!arguments.length) return startAngle;
      startAngle = x;
      return pie;
    };
    pie.endAngle = function(x) {
      if (!arguments.length) return endAngle;
      endAngle = x;
      return pie;
    };
    return pie;
  };
  var d3_layout_pieSortByValue = {};
  d3.layout.stack = function() {
    var values = d3_identity, order = d3_layout_stackOrderDefault, offset = d3_layout_stackOffsetZero, out = d3_layout_stackOut, x = d3_layout_stackX, y = d3_layout_stackY;
    function stack(data, index) {
      var series = data.map(function(d, i) {
        return values.call(stack, d, i);
      });
      var points = series.map(function(d) {
        return d.map(function(v, i) {
          return [ x.call(stack, v, i), y.call(stack, v, i) ];
        });
      });
      var orders = order.call(stack, points, index);
      series = d3.permute(series, orders);
      points = d3.permute(points, orders);
      var offsets = offset.call(stack, points, index);
      var n = series.length, m = series[0].length, i, j, o;
      for (j = 0; j < m; ++j) {
        out.call(stack, series[0][j], o = offsets[j], points[0][j][1]);
        for (i = 1; i < n; ++i) {
          out.call(stack, series[i][j], o += points[i - 1][j][1], points[i][j][1]);
        }
      }
      return data;
    }
    stack.values = function(x) {
      if (!arguments.length) return values;
      values = x;
      return stack;
    };
    stack.order = function(x) {
      if (!arguments.length) return order;
      order = typeof x === "function" ? x : d3_layout_stackOrders.get(x) || d3_layout_stackOrderDefault;
      return stack;
    };
    stack.offset = function(x) {
      if (!arguments.length) return offset;
      offset = typeof x === "function" ? x : d3_layout_stackOffsets.get(x) || d3_layout_stackOffsetZero;
      return stack;
    };
    stack.x = function(z) {
      if (!arguments.length) return x;
      x = z;
      return stack;
    };
    stack.y = function(z) {
      if (!arguments.length) return y;
      y = z;
      return stack;
    };
    stack.out = function(z) {
      if (!arguments.length) return out;
      out = z;
      return stack;
    };
    return stack;
  };
  function d3_layout_stackX(d) {
    return d.x;
  }
  function d3_layout_stackY(d) {
    return d.y;
  }
  function d3_layout_stackOut(d, y0, y) {
    d.y0 = y0;
    d.y = y;
  }
  var d3_layout_stackOrders = d3.map({
    "inside-out": function(data) {
      var n = data.length, i, j, max = data.map(d3_layout_stackMaxIndex), sums = data.map(d3_layout_stackReduceSum), index = d3.range(n).sort(function(a, b) {
        return max[a] - max[b];
      }), top = 0, bottom = 0, tops = [], bottoms = [];
      for (i = 0; i < n; ++i) {
        j = index[i];
        if (top < bottom) {
          top += sums[j];
          tops.push(j);
        } else {
          bottom += sums[j];
          bottoms.push(j);
        }
      }
      return bottoms.reverse().concat(tops);
    },
    reverse: function(data) {
      return d3.range(data.length).reverse();
    },
    "default": d3_layout_stackOrderDefault
  });
  var d3_layout_stackOffsets = d3.map({
    silhouette: function(data) {
      var n = data.length, m = data[0].length, sums = [], max = 0, i, j, o, y0 = [];
      for (j = 0; j < m; ++j) {
        for (i = 0, o = 0; i < n; i++) o += data[i][j][1];
        if (o > max) max = o;
        sums.push(o);
      }
      for (j = 0; j < m; ++j) {
        y0[j] = (max - sums[j]) / 2;
      }
      return y0;
    },
    wiggle: function(data) {
      var n = data.length, x = data[0], m = x.length, i, j, k, s1, s2, s3, dx, o, o0, y0 = [];
      y0[0] = o = o0 = 0;
      for (j = 1; j < m; ++j) {
        for (i = 0, s1 = 0; i < n; ++i) s1 += data[i][j][1];
        for (i = 0, s2 = 0, dx = x[j][0] - x[j - 1][0]; i < n; ++i) {
          for (k = 0, s3 = (data[i][j][1] - data[i][j - 1][1]) / (2 * dx); k < i; ++k) {
            s3 += (data[k][j][1] - data[k][j - 1][1]) / dx;
          }
          s2 += s3 * data[i][j][1];
        }
        y0[j] = o -= s1 ? s2 / s1 * dx : 0;
        if (o < o0) o0 = o;
      }
      for (j = 0; j < m; ++j) y0[j] -= o0;
      return y0;
    },
    expand: function(data) {
      var n = data.length, m = data[0].length, k = 1 / n, i, j, o, y0 = [];
      for (j = 0; j < m; ++j) {
        for (i = 0, o = 0; i < n; i++) o += data[i][j][1];
        if (o) for (i = 0; i < n; i++) data[i][j][1] /= o; else for (i = 0; i < n; i++) data[i][j][1] = k;
      }
      for (j = 0; j < m; ++j) y0[j] = 0;
      return y0;
    },
    zero: d3_layout_stackOffsetZero
  });
  function d3_layout_stackOrderDefault(data) {
    return d3.range(data.length);
  }
  function d3_layout_stackOffsetZero(data) {
    var j = -1, m = data[0].length, y0 = [];
    while (++j < m) y0[j] = 0;
    return y0;
  }
  function d3_layout_stackMaxIndex(array) {
    var i = 1, j = 0, v = array[0][1], k, n = array.length;
    for (;i < n; ++i) {
      if ((k = array[i][1]) > v) {
        j = i;
        v = k;
      }
    }
    return j;
  }
  function d3_layout_stackReduceSum(d) {
    return d.reduce(d3_layout_stackSum, 0);
  }
  function d3_layout_stackSum(p, d) {
    return p + d[1];
  }
  d3.layout.histogram = function() {
    var frequency = true, valuer = Number, ranger = d3_layout_histogramRange, binner = d3_layout_histogramBinSturges;
    function histogram(data, i) {
      var bins = [], values = data.map(valuer, this), range = ranger.call(this, values, i), thresholds = binner.call(this, range, values, i), bin, i = -1, n = values.length, m = thresholds.length - 1, k = frequency ? 1 : 1 / n, x;
      while (++i < m) {
        bin = bins[i] = [];
        bin.dx = thresholds[i + 1] - (bin.x = thresholds[i]);
        bin.y = 0;
      }
      if (m > 0) {
        i = -1;
        while (++i < n) {
          x = values[i];
          if (x >= range[0] && x <= range[1]) {
            bin = bins[d3.bisect(thresholds, x, 1, m) - 1];
            bin.y += k;
            bin.push(data[i]);
          }
        }
      }
      return bins;
    }
    histogram.value = function(x) {
      if (!arguments.length) return valuer;
      valuer = x;
      return histogram;
    };
    histogram.range = function(x) {
      if (!arguments.length) return ranger;
      ranger = d3_functor(x);
      return histogram;
    };
    histogram.bins = function(x) {
      if (!arguments.length) return binner;
      binner = typeof x === "number" ? function(range) {
        return d3_layout_histogramBinFixed(range, x);
      } : d3_functor(x);
      return histogram;
    };
    histogram.frequency = function(x) {
      if (!arguments.length) return frequency;
      frequency = !!x;
      return histogram;
    };
    return histogram;
  };
  function d3_layout_histogramBinSturges(range, values) {
    return d3_layout_histogramBinFixed(range, Math.ceil(Math.log(values.length) / Math.LN2 + 1));
  }
  function d3_layout_histogramBinFixed(range, n) {
    var x = -1, b = +range[0], m = (range[1] - b) / n, f = [];
    while (++x <= n) f[x] = m * x + b;
    return f;
  }
  function d3_layout_histogramRange(values) {
    return [ d3.min(values), d3.max(values) ];
  }
  d3.layout.tree = function() {
    var hierarchy = d3.layout.hierarchy().sort(null).value(null), separation = d3_layout_treeSeparation, size = [ 1, 1 ], nodeSize = false;
    function tree(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0];
      function firstWalk(node, previousSibling) {
        var children = node.children, layout = node._tree;
        if (children && (n = children.length)) {
          var n, firstChild = children[0], previousChild, ancestor = firstChild, child, i = -1;
          while (++i < n) {
            child = children[i];
            firstWalk(child, previousChild);
            ancestor = apportion(child, previousChild, ancestor);
            previousChild = child;
          }
          d3_layout_treeShift(node);
          var midpoint = .5 * (firstChild._tree.prelim + child._tree.prelim);
          if (previousSibling) {
            layout.prelim = previousSibling._tree.prelim + separation(node, previousSibling);
            layout.mod = layout.prelim - midpoint;
          } else {
            layout.prelim = midpoint;
          }
        } else {
          if (previousSibling) {
            layout.prelim = previousSibling._tree.prelim + separation(node, previousSibling);
          }
        }
      }
      function secondWalk(node, x) {
        node.x = node._tree.prelim + x;
        var children = node.children;
        if (children && (n = children.length)) {
          var i = -1, n;
          x += node._tree.mod;
          while (++i < n) {
            secondWalk(children[i], x);
          }
        }
      }
      function apportion(node, previousSibling, ancestor) {
        if (previousSibling) {
          var vip = node, vop = node, vim = previousSibling, vom = node.parent.children[0], sip = vip._tree.mod, sop = vop._tree.mod, sim = vim._tree.mod, som = vom._tree.mod, shift;
          while (vim = d3_layout_treeRight(vim), vip = d3_layout_treeLeft(vip), vim && vip) {
            vom = d3_layout_treeLeft(vom);
            vop = d3_layout_treeRight(vop);
            vop._tree.ancestor = node;
            shift = vim._tree.prelim + sim - vip._tree.prelim - sip + separation(vim, vip);
            if (shift > 0) {
              d3_layout_treeMove(d3_layout_treeAncestor(vim, node, ancestor), node, shift);
              sip += shift;
              sop += shift;
            }
            sim += vim._tree.mod;
            sip += vip._tree.mod;
            som += vom._tree.mod;
            sop += vop._tree.mod;
          }
          if (vim && !d3_layout_treeRight(vop)) {
            vop._tree.thread = vim;
            vop._tree.mod += sim - sop;
          }
          if (vip && !d3_layout_treeLeft(vom)) {
            vom._tree.thread = vip;
            vom._tree.mod += sip - som;
            ancestor = node;
          }
        }
        return ancestor;
      }
      d3_layout_treeVisitAfter(root, function(node, previousSibling) {
        node._tree = {
          ancestor: node,
          prelim: 0,
          mod: 0,
          change: 0,
          shift: 0,
          number: previousSibling ? previousSibling._tree.number + 1 : 0
        };
      });
      firstWalk(root);
      secondWalk(root, -root._tree.prelim);
      var left = d3_layout_treeSearch(root, d3_layout_treeLeftmost), right = d3_layout_treeSearch(root, d3_layout_treeRightmost), deep = d3_layout_treeSearch(root, d3_layout_treeDeepest), x0 = left.x - separation(left, right) / 2, x1 = right.x + separation(right, left) / 2, y1 = deep.depth || 1;
      d3_layout_treeVisitAfter(root, nodeSize ? function(node) {
        node.x *= size[0];
        node.y = node.depth * size[1];
        delete node._tree;
      } : function(node) {
        node.x = (node.x - x0) / (x1 - x0) * size[0];
        node.y = node.depth / y1 * size[1];
        delete node._tree;
      });
      return nodes;
    }
    tree.separation = function(x) {
      if (!arguments.length) return separation;
      separation = x;
      return tree;
    };
    tree.size = function(x) {
      if (!arguments.length) return nodeSize ? null : size;
      nodeSize = (size = x) == null;
      return tree;
    };
    tree.nodeSize = function(x) {
      if (!arguments.length) return nodeSize ? size : null;
      nodeSize = (size = x) != null;
      return tree;
    };
    return d3_layout_hierarchyRebind(tree, hierarchy);
  };
  function d3_layout_treeSeparation(a, b) {
    return a.parent == b.parent ? 1 : 2;
  }
  function d3_layout_treeLeft(node) {
    var children = node.children;
    return children && children.length ? children[0] : node._tree.thread;
  }
  function d3_layout_treeRight(node) {
    var children = node.children, n;
    return children && (n = children.length) ? children[n - 1] : node._tree.thread;
  }
  function d3_layout_treeSearch(node, compare) {
    var children = node.children;
    if (children && (n = children.length)) {
      var child, n, i = -1;
      while (++i < n) {
        if (compare(child = d3_layout_treeSearch(children[i], compare), node) > 0) {
          node = child;
        }
      }
    }
    return node;
  }
  function d3_layout_treeRightmost(a, b) {
    return a.x - b.x;
  }
  function d3_layout_treeLeftmost(a, b) {
    return b.x - a.x;
  }
  function d3_layout_treeDeepest(a, b) {
    return a.depth - b.depth;
  }
  function d3_layout_treeVisitAfter(node, callback) {
    function visit(node, previousSibling) {
      var children = node.children;
      if (children && (n = children.length)) {
        var child, previousChild = null, i = -1, n;
        while (++i < n) {
          child = children[i];
          visit(child, previousChild);
          previousChild = child;
        }
      }
      callback(node, previousSibling);
    }
    visit(node, null);
  }
  function d3_layout_treeShift(node) {
    var shift = 0, change = 0, children = node.children, i = children.length, child;
    while (--i >= 0) {
      child = children[i]._tree;
      child.prelim += shift;
      child.mod += shift;
      shift += child.shift + (change += child.change);
    }
  }
  function d3_layout_treeMove(ancestor, node, shift) {
    ancestor = ancestor._tree;
    node = node._tree;
    var change = shift / (node.number - ancestor.number);
    ancestor.change += change;
    node.change -= change;
    node.shift += shift;
    node.prelim += shift;
    node.mod += shift;
  }
  function d3_layout_treeAncestor(vim, node, ancestor) {
    return vim._tree.ancestor.parent == node.parent ? vim._tree.ancestor : ancestor;
  }
  d3.layout.pack = function() {
    var hierarchy = d3.layout.hierarchy().sort(d3_layout_packSort), padding = 0, size = [ 1, 1 ], radius;
    function pack(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0], w = size[0], h = size[1], r = radius == null ? Math.sqrt : typeof radius === "function" ? radius : function() {
        return radius;
      };
      root.x = root.y = 0;
      d3_layout_treeVisitAfter(root, function(d) {
        d.r = +r(d.value);
      });
      d3_layout_treeVisitAfter(root, d3_layout_packSiblings);
      if (padding) {
        var dr = padding * (radius ? 1 : Math.max(2 * root.r / w, 2 * root.r / h)) / 2;
        d3_layout_treeVisitAfter(root, function(d) {
          d.r += dr;
        });
        d3_layout_treeVisitAfter(root, d3_layout_packSiblings);
        d3_layout_treeVisitAfter(root, function(d) {
          d.r -= dr;
        });
      }
      d3_layout_packTransform(root, w / 2, h / 2, radius ? 1 : 1 / Math.max(2 * root.r / w, 2 * root.r / h));
      return nodes;
    }
    pack.size = function(_) {
      if (!arguments.length) return size;
      size = _;
      return pack;
    };
    pack.radius = function(_) {
      if (!arguments.length) return radius;
      radius = _ == null || typeof _ === "function" ? _ : +_;
      return pack;
    };
    pack.padding = function(_) {
      if (!arguments.length) return padding;
      padding = +_;
      return pack;
    };
    return d3_layout_hierarchyRebind(pack, hierarchy);
  };
  function d3_layout_packSort(a, b) {
    return a.value - b.value;
  }
  function d3_layout_packInsert(a, b) {
    var c = a._pack_next;
    a._pack_next = b;
    b._pack_prev = a;
    b._pack_next = c;
    c._pack_prev = b;
  }
  function d3_layout_packSplice(a, b) {
    a._pack_next = b;
    b._pack_prev = a;
  }
  function d3_layout_packIntersects(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, dr = a.r + b.r;
    return .999 * dr * dr > dx * dx + dy * dy;
  }
  function d3_layout_packSiblings(node) {
    if (!(nodes = node.children) || !(n = nodes.length)) return;
    var nodes, xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, a, b, c, i, j, k, n;
    function bound(node) {
      xMin = Math.min(node.x - node.r, xMin);
      xMax = Math.max(node.x + node.r, xMax);
      yMin = Math.min(node.y - node.r, yMin);
      yMax = Math.max(node.y + node.r, yMax);
    }
    nodes.forEach(d3_layout_packLink);
    a = nodes[0];
    a.x = -a.r;
    a.y = 0;
    bound(a);
    if (n > 1) {
      b = nodes[1];
      b.x = b.r;
      b.y = 0;
      bound(b);
      if (n > 2) {
        c = nodes[2];
        d3_layout_packPlace(a, b, c);
        bound(c);
        d3_layout_packInsert(a, c);
        a._pack_prev = c;
        d3_layout_packInsert(c, b);
        b = a._pack_next;
        for (i = 3; i < n; i++) {
          d3_layout_packPlace(a, b, c = nodes[i]);
          var isect = 0, s1 = 1, s2 = 1;
          for (j = b._pack_next; j !== b; j = j._pack_next, s1++) {
            if (d3_layout_packIntersects(j, c)) {
              isect = 1;
              break;
            }
          }
          if (isect == 1) {
            for (k = a._pack_prev; k !== j._pack_prev; k = k._pack_prev, s2++) {
              if (d3_layout_packIntersects(k, c)) {
                break;
              }
            }
          }
          if (isect) {
            if (s1 < s2 || s1 == s2 && b.r < a.r) d3_layout_packSplice(a, b = j); else d3_layout_packSplice(a = k, b);
            i--;
          } else {
            d3_layout_packInsert(a, c);
            b = c;
            bound(c);
          }
        }
      }
    }
    var cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2, cr = 0;
    for (i = 0; i < n; i++) {
      c = nodes[i];
      c.x -= cx;
      c.y -= cy;
      cr = Math.max(cr, c.r + Math.sqrt(c.x * c.x + c.y * c.y));
    }
    node.r = cr;
    nodes.forEach(d3_layout_packUnlink);
  }
  function d3_layout_packLink(node) {
    node._pack_next = node._pack_prev = node;
  }
  function d3_layout_packUnlink(node) {
    delete node._pack_next;
    delete node._pack_prev;
  }
  function d3_layout_packTransform(node, x, y, k) {
    var children = node.children;
    node.x = x += k * node.x;
    node.y = y += k * node.y;
    node.r *= k;
    if (children) {
      var i = -1, n = children.length;
      while (++i < n) d3_layout_packTransform(children[i], x, y, k);
    }
  }
  function d3_layout_packPlace(a, b, c) {
    var db = a.r + c.r, dx = b.x - a.x, dy = b.y - a.y;
    if (db && (dx || dy)) {
      var da = b.r + c.r, dc = dx * dx + dy * dy;
      da *= da;
      db *= db;
      var x = .5 + (db - da) / (2 * dc), y = Math.sqrt(Math.max(0, 2 * da * (db + dc) - (db -= dc) * db - da * da)) / (2 * dc);
      c.x = a.x + x * dx + y * dy;
      c.y = a.y + x * dy - y * dx;
    } else {
      c.x = a.x + db;
      c.y = a.y;
    }
  }
  d3.layout.cluster = function() {
    var hierarchy = d3.layout.hierarchy().sort(null).value(null), separation = d3_layout_treeSeparation, size = [ 1, 1 ], nodeSize = false;
    function cluster(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0], previousNode, x = 0;
      d3_layout_treeVisitAfter(root, function(node) {
        var children = node.children;
        if (children && children.length) {
          node.x = d3_layout_clusterX(children);
          node.y = d3_layout_clusterY(children);
        } else {
          node.x = previousNode ? x += separation(node, previousNode) : 0;
          node.y = 0;
          previousNode = node;
        }
      });
      var left = d3_layout_clusterLeft(root), right = d3_layout_clusterRight(root), x0 = left.x - separation(left, right) / 2, x1 = right.x + separation(right, left) / 2;
      d3_layout_treeVisitAfter(root, nodeSize ? function(node) {
        node.x = (node.x - root.x) * size[0];
        node.y = (root.y - node.y) * size[1];
      } : function(node) {
        node.x = (node.x - x0) / (x1 - x0) * size[0];
        node.y = (1 - (root.y ? node.y / root.y : 1)) * size[1];
      });
      return nodes;
    }
    cluster.separation = function(x) {
      if (!arguments.length) return separation;
      separation = x;
      return cluster;
    };
    cluster.size = function(x) {
      if (!arguments.length) return nodeSize ? null : size;
      nodeSize = (size = x) == null;
      return cluster;
    };
    cluster.nodeSize = function(x) {
      if (!arguments.length) return nodeSize ? size : null;
      nodeSize = (size = x) != null;
      return cluster;
    };
    return d3_layout_hierarchyRebind(cluster, hierarchy);
  };
  function d3_layout_clusterY(children) {
    return 1 + d3.max(children, function(child) {
      return child.y;
    });
  }
  function d3_layout_clusterX(children) {
    return children.reduce(function(x, child) {
      return x + child.x;
    }, 0) / children.length;
  }
  function d3_layout_clusterLeft(node) {
    var children = node.children;
    return children && children.length ? d3_layout_clusterLeft(children[0]) : node;
  }
  function d3_layout_clusterRight(node) {
    var children = node.children, n;
    return children && (n = children.length) ? d3_layout_clusterRight(children[n - 1]) : node;
  }
  d3.layout.treemap = function() {
    var hierarchy = d3.layout.hierarchy(), round = Math.round, size = [ 1, 1 ], padding = null, pad = d3_layout_treemapPadNull, sticky = false, stickies, mode = "squarify", ratio = .5 * (1 + Math.sqrt(5));
    function scale(children, k) {
      var i = -1, n = children.length, child, area;
      while (++i < n) {
        area = (child = children[i]).value * (k < 0 ? 0 : k);
        child.area = isNaN(area) || area <= 0 ? 0 : area;
      }
    }
    function squarify(node) {
      var children = node.children;
      if (children && children.length) {
        var rect = pad(node), row = [], remaining = children.slice(), child, best = Infinity, score, u = mode === "slice" ? rect.dx : mode === "dice" ? rect.dy : mode === "slice-dice" ? node.depth & 1 ? rect.dy : rect.dx : Math.min(rect.dx, rect.dy), n;
        scale(remaining, rect.dx * rect.dy / node.value);
        row.area = 0;
        while ((n = remaining.length) > 0) {
          row.push(child = remaining[n - 1]);
          row.area += child.area;
          if (mode !== "squarify" || (score = worst(row, u)) <= best) {
            remaining.pop();
            best = score;
          } else {
            row.area -= row.pop().area;
            position(row, u, rect, false);
            u = Math.min(rect.dx, rect.dy);
            row.length = row.area = 0;
            best = Infinity;
          }
        }
        if (row.length) {
          position(row, u, rect, true);
          row.length = row.area = 0;
        }
        children.forEach(squarify);
      }
    }
    function stickify(node) {
      var children = node.children;
      if (children && children.length) {
        var rect = pad(node), remaining = children.slice(), child, row = [];
        scale(remaining, rect.dx * rect.dy / node.value);
        row.area = 0;
        while (child = remaining.pop()) {
          row.push(child);
          row.area += child.area;
          if (child.z != null) {
            position(row, child.z ? rect.dx : rect.dy, rect, !remaining.length);
            row.length = row.area = 0;
          }
        }
        children.forEach(stickify);
      }
    }
    function worst(row, u) {
      var s = row.area, r, rmax = 0, rmin = Infinity, i = -1, n = row.length;
      while (++i < n) {
        if (!(r = row[i].area)) continue;
        if (r < rmin) rmin = r;
        if (r > rmax) rmax = r;
      }
      s *= s;
      u *= u;
      return s ? Math.max(u * rmax * ratio / s, s / (u * rmin * ratio)) : Infinity;
    }
    function position(row, u, rect, flush) {
      var i = -1, n = row.length, x = rect.x, y = rect.y, v = u ? round(row.area / u) : 0, o;
      if (u == rect.dx) {
        if (flush || v > rect.dy) v = rect.dy;
        while (++i < n) {
          o = row[i];
          o.x = x;
          o.y = y;
          o.dy = v;
          x += o.dx = Math.min(rect.x + rect.dx - x, v ? round(o.area / v) : 0);
        }
        o.z = true;
        o.dx += rect.x + rect.dx - x;
        rect.y += v;
        rect.dy -= v;
      } else {
        if (flush || v > rect.dx) v = rect.dx;
        while (++i < n) {
          o = row[i];
          o.x = x;
          o.y = y;
          o.dx = v;
          y += o.dy = Math.min(rect.y + rect.dy - y, v ? round(o.area / v) : 0);
        }
        o.z = false;
        o.dy += rect.y + rect.dy - y;
        rect.x += v;
        rect.dx -= v;
      }
    }
    function treemap(d) {
      var nodes = stickies || hierarchy(d), root = nodes[0];
      root.x = 0;
      root.y = 0;
      root.dx = size[0];
      root.dy = size[1];
      if (stickies) hierarchy.revalue(root);
      scale([ root ], root.dx * root.dy / root.value);
      (stickies ? stickify : squarify)(root);
      if (sticky) stickies = nodes;
      return nodes;
    }
    treemap.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return treemap;
    };
    treemap.padding = function(x) {
      if (!arguments.length) return padding;
      function padFunction(node) {
        var p = x.call(treemap, node, node.depth);
        return p == null ? d3_layout_treemapPadNull(node) : d3_layout_treemapPad(node, typeof p === "number" ? [ p, p, p, p ] : p);
      }
      function padConstant(node) {
        return d3_layout_treemapPad(node, x);
      }
      var type;
      pad = (padding = x) == null ? d3_layout_treemapPadNull : (type = typeof x) === "function" ? padFunction : type === "number" ? (x = [ x, x, x, x ], 
      padConstant) : padConstant;
      return treemap;
    };
    treemap.round = function(x) {
      if (!arguments.length) return round != Number;
      round = x ? Math.round : Number;
      return treemap;
    };
    treemap.sticky = function(x) {
      if (!arguments.length) return sticky;
      sticky = x;
      stickies = null;
      return treemap;
    };
    treemap.ratio = function(x) {
      if (!arguments.length) return ratio;
      ratio = x;
      return treemap;
    };
    treemap.mode = function(x) {
      if (!arguments.length) return mode;
      mode = x + "";
      return treemap;
    };
    return d3_layout_hierarchyRebind(treemap, hierarchy);
  };
  function d3_layout_treemapPadNull(node) {
    return {
      x: node.x,
      y: node.y,
      dx: node.dx,
      dy: node.dy
    };
  }
  function d3_layout_treemapPad(node, padding) {
    var x = node.x + padding[3], y = node.y + padding[0], dx = node.dx - padding[1] - padding[3], dy = node.dy - padding[0] - padding[2];
    if (dx < 0) {
      x += dx / 2;
      dx = 0;
    }
    if (dy < 0) {
      y += dy / 2;
      dy = 0;
    }
    return {
      x: x,
      y: y,
      dx: dx,
      dy: dy
    };
  }
  d3.random = {
    normal: function(µ, σ) {
      var n = arguments.length;
      if (n < 2) σ = 1;
      if (n < 1) µ = 0;
      return function() {
        var x, y, r;
        do {
          x = Math.random() * 2 - 1;
          y = Math.random() * 2 - 1;
          r = x * x + y * y;
        } while (!r || r > 1);
        return µ + σ * x * Math.sqrt(-2 * Math.log(r) / r);
      };
    },
    logNormal: function() {
      var random = d3.random.normal.apply(d3, arguments);
      return function() {
        return Math.exp(random());
      };
    },
    bates: function(m) {
      var random = d3.random.irwinHall(m);
      return function() {
        return random() / m;
      };
    },
    irwinHall: function(m) {
      return function() {
        for (var s = 0, j = 0; j < m; j++) s += Math.random();
        return s;
      };
    }
  };
  d3.scale = {};
  function d3_scaleExtent(domain) {
    var start = domain[0], stop = domain[domain.length - 1];
    return start < stop ? [ start, stop ] : [ stop, start ];
  }
  function d3_scaleRange(scale) {
    return scale.rangeExtent ? scale.rangeExtent() : d3_scaleExtent(scale.range());
  }
  function d3_scale_bilinear(domain, range, uninterpolate, interpolate) {
    var u = uninterpolate(domain[0], domain[1]), i = interpolate(range[0], range[1]);
    return function(x) {
      return i(u(x));
    };
  }
  function d3_scale_nice(domain, nice) {
    var i0 = 0, i1 = domain.length - 1, x0 = domain[i0], x1 = domain[i1], dx;
    if (x1 < x0) {
      dx = i0, i0 = i1, i1 = dx;
      dx = x0, x0 = x1, x1 = dx;
    }
    domain[i0] = nice.floor(x0);
    domain[i1] = nice.ceil(x1);
    return domain;
  }
  function d3_scale_niceStep(step) {
    return step ? {
      floor: function(x) {
        return Math.floor(x / step) * step;
      },
      ceil: function(x) {
        return Math.ceil(x / step) * step;
      }
    } : d3_scale_niceIdentity;
  }
  var d3_scale_niceIdentity = {
    floor: d3_identity,
    ceil: d3_identity
  };
  function d3_scale_polylinear(domain, range, uninterpolate, interpolate) {
    var u = [], i = [], j = 0, k = Math.min(domain.length, range.length) - 1;
    if (domain[k] < domain[0]) {
      domain = domain.slice().reverse();
      range = range.slice().reverse();
    }
    while (++j <= k) {
      u.push(uninterpolate(domain[j - 1], domain[j]));
      i.push(interpolate(range[j - 1], range[j]));
    }
    return function(x) {
      var j = d3.bisect(domain, x, 1, k) - 1;
      return i[j](u[j](x));
    };
  }
  d3.scale.linear = function() {
    return d3_scale_linear([ 0, 1 ], [ 0, 1 ], d3_interpolate, false);
  };
  function d3_scale_linear(domain, range, interpolate, clamp) {
    var output, input;
    function rescale() {
      var linear = Math.min(domain.length, range.length) > 2 ? d3_scale_polylinear : d3_scale_bilinear, uninterpolate = clamp ? d3_uninterpolateClamp : d3_uninterpolateNumber;
      output = linear(domain, range, uninterpolate, interpolate);
      input = linear(range, domain, uninterpolate, d3_interpolate);
      return scale;
    }
    function scale(x) {
      return output(x);
    }
    scale.invert = function(y) {
      return input(y);
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = x.map(Number);
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.rangeRound = function(x) {
      return scale.range(x).interpolate(d3_interpolateRound);
    };
    scale.clamp = function(x) {
      if (!arguments.length) return clamp;
      clamp = x;
      return rescale();
    };
    scale.interpolate = function(x) {
      if (!arguments.length) return interpolate;
      interpolate = x;
      return rescale();
    };
    scale.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    scale.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    scale.nice = function(m) {
      d3_scale_linearNice(domain, m);
      return rescale();
    };
    scale.copy = function() {
      return d3_scale_linear(domain, range, interpolate, clamp);
    };
    return rescale();
  }
  function d3_scale_linearRebind(scale, linear) {
    return d3.rebind(scale, linear, "range", "rangeRound", "interpolate", "clamp");
  }
  function d3_scale_linearNice(domain, m) {
    return d3_scale_nice(domain, d3_scale_niceStep(d3_scale_linearTickRange(domain, m)[2]));
  }
  function d3_scale_linearTickRange(domain, m) {
    if (m == null) m = 10;
    var extent = d3_scaleExtent(domain), span = extent[1] - extent[0], step = Math.pow(10, Math.floor(Math.log(span / m) / Math.LN10)), err = m / span * step;
    if (err <= .15) step *= 10; else if (err <= .35) step *= 5; else if (err <= .75) step *= 2;
    extent[0] = Math.ceil(extent[0] / step) * step;
    extent[1] = Math.floor(extent[1] / step) * step + step * .5;
    extent[2] = step;
    return extent;
  }
  function d3_scale_linearTicks(domain, m) {
    return d3.range.apply(d3, d3_scale_linearTickRange(domain, m));
  }
  function d3_scale_linearTickFormat(domain, m, format) {
    var range = d3_scale_linearTickRange(domain, m);
    if (format) {
      var match = d3_format_re.exec(format);
      match.shift();
      if (match[8] === "s") {
        var prefix = d3.formatPrefix(Math.max(abs(range[0]), abs(range[1])));
        if (!match[7]) match[7] = "." + d3_scale_linearPrecision(prefix.scale(range[2]));
        match[8] = "f";
        format = d3.format(match.join(""));
        return function(d) {
          return format(prefix.scale(d)) + prefix.symbol;
        };
      }
      if (!match[7]) match[7] = "." + d3_scale_linearFormatPrecision(match[8], range);
      format = match.join("");
    } else {
      format = ",." + d3_scale_linearPrecision(range[2]) + "f";
    }
    return d3.format(format);
  }
  var d3_scale_linearFormatSignificant = {
    s: 1,
    g: 1,
    p: 1,
    r: 1,
    e: 1
  };
  function d3_scale_linearPrecision(value) {
    return -Math.floor(Math.log(value) / Math.LN10 + .01);
  }
  function d3_scale_linearFormatPrecision(type, range) {
    var p = d3_scale_linearPrecision(range[2]);
    return type in d3_scale_linearFormatSignificant ? Math.abs(p - d3_scale_linearPrecision(Math.max(abs(range[0]), abs(range[1])))) + +(type !== "e") : p - (type === "%") * 2;
  }
  d3.scale.log = function() {
    return d3_scale_log(d3.scale.linear().domain([ 0, 1 ]), 10, true, [ 1, 10 ]);
  };
  function d3_scale_log(linear, base, positive, domain) {
    function log(x) {
      return (positive ? Math.log(x < 0 ? 0 : x) : -Math.log(x > 0 ? 0 : -x)) / Math.log(base);
    }
    function pow(x) {
      return positive ? Math.pow(base, x) : -Math.pow(base, -x);
    }
    function scale(x) {
      return linear(log(x));
    }
    scale.invert = function(x) {
      return pow(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      positive = x[0] >= 0;
      linear.domain((domain = x.map(Number)).map(log));
      return scale;
    };
    scale.base = function(_) {
      if (!arguments.length) return base;
      base = +_;
      linear.domain(domain.map(log));
      return scale;
    };
    scale.nice = function() {
      var niced = d3_scale_nice(domain.map(log), positive ? Math : d3_scale_logNiceNegative);
      linear.domain(niced);
      domain = niced.map(pow);
      return scale;
    };
    scale.ticks = function() {
      var extent = d3_scaleExtent(domain), ticks = [], u = extent[0], v = extent[1], i = Math.floor(log(u)), j = Math.ceil(log(v)), n = base % 1 ? 2 : base;
      if (isFinite(j - i)) {
        if (positive) {
          for (;i < j; i++) for (var k = 1; k < n; k++) ticks.push(pow(i) * k);
          ticks.push(pow(i));
        } else {
          ticks.push(pow(i));
          for (;i++ < j; ) for (var k = n - 1; k > 0; k--) ticks.push(pow(i) * k);
        }
        for (i = 0; ticks[i] < u; i++) {}
        for (j = ticks.length; ticks[j - 1] > v; j--) {}
        ticks = ticks.slice(i, j);
      }
      return ticks;
    };
    scale.tickFormat = function(n, format) {
      if (!arguments.length) return d3_scale_logFormat;
      if (arguments.length < 2) format = d3_scale_logFormat; else if (typeof format !== "function") format = d3.format(format);
      var k = Math.max(.1, n / scale.ticks().length), f = positive ? (e = 1e-12, Math.ceil) : (e = -1e-12, 
      Math.floor), e;
      return function(d) {
        return d / pow(f(log(d) + e)) <= k ? format(d) : "";
      };
    };
    scale.copy = function() {
      return d3_scale_log(linear.copy(), base, positive, domain);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  var d3_scale_logFormat = d3.format(".0e"), d3_scale_logNiceNegative = {
    floor: function(x) {
      return -Math.ceil(-x);
    },
    ceil: function(x) {
      return -Math.floor(-x);
    }
  };
  d3.scale.pow = function() {
    return d3_scale_pow(d3.scale.linear(), 1, [ 0, 1 ]);
  };
  function d3_scale_pow(linear, exponent, domain) {
    var powp = d3_scale_powPow(exponent), powb = d3_scale_powPow(1 / exponent);
    function scale(x) {
      return linear(powp(x));
    }
    scale.invert = function(x) {
      return powb(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      linear.domain((domain = x.map(Number)).map(powp));
      return scale;
    };
    scale.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    scale.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    scale.nice = function(m) {
      return scale.domain(d3_scale_linearNice(domain, m));
    };
    scale.exponent = function(x) {
      if (!arguments.length) return exponent;
      powp = d3_scale_powPow(exponent = x);
      powb = d3_scale_powPow(1 / exponent);
      linear.domain(domain.map(powp));
      return scale;
    };
    scale.copy = function() {
      return d3_scale_pow(linear.copy(), exponent, domain);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  function d3_scale_powPow(e) {
    return function(x) {
      return x < 0 ? -Math.pow(-x, e) : Math.pow(x, e);
    };
  }
  d3.scale.sqrt = function() {
    return d3.scale.pow().exponent(.5);
  };
  d3.scale.ordinal = function() {
    return d3_scale_ordinal([], {
      t: "range",
      a: [ [] ]
    });
  };
  function d3_scale_ordinal(domain, ranger) {
    var index, range, rangeBand;
    function scale(x) {
      return range[((index.get(x) || (ranger.t === "range" ? index.set(x, domain.push(x)) : NaN)) - 1) % range.length];
    }
    function steps(start, step) {
      return d3.range(domain.length).map(function(i) {
        return start + step * i;
      });
    }
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = [];
      index = new d3_Map();
      var i = -1, n = x.length, xi;
      while (++i < n) if (!index.has(xi = x[i])) index.set(xi, domain.push(xi));
      return scale[ranger.t].apply(scale, ranger.a);
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      rangeBand = 0;
      ranger = {
        t: "range",
        a: arguments
      };
      return scale;
    };
    scale.rangePoints = function(x, padding) {
      if (arguments.length < 2) padding = 0;
      var start = x[0], stop = x[1], step = (stop - start) / (Math.max(1, domain.length - 1) + padding);
      range = steps(domain.length < 2 ? (start + stop) / 2 : start + step * padding / 2, step);
      rangeBand = 0;
      ranger = {
        t: "rangePoints",
        a: arguments
      };
      return scale;
    };
    scale.rangeBands = function(x, padding, outerPadding) {
      if (arguments.length < 2) padding = 0;
      if (arguments.length < 3) outerPadding = padding;
      var reverse = x[1] < x[0], start = x[reverse - 0], stop = x[1 - reverse], step = (stop - start) / (domain.length - padding + 2 * outerPadding);
      range = steps(start + step * outerPadding, step);
      if (reverse) range.reverse();
      rangeBand = step * (1 - padding);
      ranger = {
        t: "rangeBands",
        a: arguments
      };
      return scale;
    };
    scale.rangeRoundBands = function(x, padding, outerPadding) {
      if (arguments.length < 2) padding = 0;
      if (arguments.length < 3) outerPadding = padding;
      var reverse = x[1] < x[0], start = x[reverse - 0], stop = x[1 - reverse], step = Math.floor((stop - start) / (domain.length - padding + 2 * outerPadding)), error = stop - start - (domain.length - padding) * step;
      range = steps(start + Math.round(error / 2), step);
      if (reverse) range.reverse();
      rangeBand = Math.round(step * (1 - padding));
      ranger = {
        t: "rangeRoundBands",
        a: arguments
      };
      return scale;
    };
    scale.rangeBand = function() {
      return rangeBand;
    };
    scale.rangeExtent = function() {
      return d3_scaleExtent(ranger.a[0]);
    };
    scale.copy = function() {
      return d3_scale_ordinal(domain, ranger);
    };
    return scale.domain(domain);
  }
  d3.scale.category10 = function() {
    return d3.scale.ordinal().range(d3_category10);
  };
  d3.scale.category20 = function() {
    return d3.scale.ordinal().range(d3_category20);
  };
  d3.scale.category20b = function() {
    return d3.scale.ordinal().range(d3_category20b);
  };
  d3.scale.category20c = function() {
    return d3.scale.ordinal().range(d3_category20c);
  };
  var d3_category10 = [ 2062260, 16744206, 2924588, 14034728, 9725885, 9197131, 14907330, 8355711, 12369186, 1556175 ].map(d3_rgbString);
  var d3_category20 = [ 2062260, 11454440, 16744206, 16759672, 2924588, 10018698, 14034728, 16750742, 9725885, 12955861, 9197131, 12885140, 14907330, 16234194, 8355711, 13092807, 12369186, 14408589, 1556175, 10410725 ].map(d3_rgbString);
  var d3_category20b = [ 3750777, 5395619, 7040719, 10264286, 6519097, 9216594, 11915115, 13556636, 9202993, 12426809, 15186514, 15190932, 8666169, 11356490, 14049643, 15177372, 8077683, 10834324, 13528509, 14589654 ].map(d3_rgbString);
  var d3_category20c = [ 3244733, 7057110, 10406625, 13032431, 15095053, 16616764, 16625259, 16634018, 3253076, 7652470, 10607003, 13101504, 7695281, 10394312, 12369372, 14342891, 6513507, 9868950, 12434877, 14277081 ].map(d3_rgbString);
  d3.scale.quantile = function() {
    return d3_scale_quantile([], []);
  };
  function d3_scale_quantile(domain, range) {
    var thresholds;
    function rescale() {
      var k = 0, q = range.length;
      thresholds = [];
      while (++k < q) thresholds[k - 1] = d3.quantile(domain, k / q);
      return scale;
    }
    function scale(x) {
      if (!isNaN(x = +x)) return range[d3.bisect(thresholds, x)];
    }
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = x.filter(d3_number).sort(d3_ascending);
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.quantiles = function() {
      return thresholds;
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      return y < 0 ? [ NaN, NaN ] : [ y > 0 ? thresholds[y - 1] : domain[0], y < thresholds.length ? thresholds[y] : domain[domain.length - 1] ];
    };
    scale.copy = function() {
      return d3_scale_quantile(domain, range);
    };
    return rescale();
  }
  d3.scale.quantize = function() {
    return d3_scale_quantize(0, 1, [ 0, 1 ]);
  };
  function d3_scale_quantize(x0, x1, range) {
    var kx, i;
    function scale(x) {
      return range[Math.max(0, Math.min(i, Math.floor(kx * (x - x0))))];
    }
    function rescale() {
      kx = range.length / (x1 - x0);
      i = range.length - 1;
      return scale;
    }
    scale.domain = function(x) {
      if (!arguments.length) return [ x0, x1 ];
      x0 = +x[0];
      x1 = +x[x.length - 1];
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      y = y < 0 ? NaN : y / kx + x0;
      return [ y, y + 1 / kx ];
    };
    scale.copy = function() {
      return d3_scale_quantize(x0, x1, range);
    };
    return rescale();
  }
  d3.scale.threshold = function() {
    return d3_scale_threshold([ .5 ], [ 0, 1 ]);
  };
  function d3_scale_threshold(domain, range) {
    function scale(x) {
      if (x <= x) return range[d3.bisect(domain, x)];
    }
    scale.domain = function(_) {
      if (!arguments.length) return domain;
      domain = _;
      return scale;
    };
    scale.range = function(_) {
      if (!arguments.length) return range;
      range = _;
      return scale;
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      return [ domain[y - 1], domain[y] ];
    };
    scale.copy = function() {
      return d3_scale_threshold(domain, range);
    };
    return scale;
  }
  d3.scale.identity = function() {
    return d3_scale_identity([ 0, 1 ]);
  };
  function d3_scale_identity(domain) {
    function identity(x) {
      return +x;
    }
    identity.invert = identity;
    identity.domain = identity.range = function(x) {
      if (!arguments.length) return domain;
      domain = x.map(identity);
      return identity;
    };
    identity.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    identity.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    identity.copy = function() {
      return d3_scale_identity(domain);
    };
    return identity;
  }
  d3.svg = {};
  d3.svg.arc = function() {
    var innerRadius = d3_svg_arcInnerRadius, outerRadius = d3_svg_arcOuterRadius, startAngle = d3_svg_arcStartAngle, endAngle = d3_svg_arcEndAngle;
    function arc() {
      var r0 = innerRadius.apply(this, arguments), r1 = outerRadius.apply(this, arguments), a0 = startAngle.apply(this, arguments) + d3_svg_arcOffset, a1 = endAngle.apply(this, arguments) + d3_svg_arcOffset, da = (a1 < a0 && (da = a0, 
      a0 = a1, a1 = da), a1 - a0), df = da < π ? "0" : "1", c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      return da >= d3_svg_arcMax ? r0 ? "M0," + r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + -r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + r1 + "M0," + r0 + "A" + r0 + "," + r0 + " 0 1,0 0," + -r0 + "A" + r0 + "," + r0 + " 0 1,0 0," + r0 + "Z" : "M0," + r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + -r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + r1 + "Z" : r0 ? "M" + r1 * c0 + "," + r1 * s0 + "A" + r1 + "," + r1 + " 0 " + df + ",1 " + r1 * c1 + "," + r1 * s1 + "L" + r0 * c1 + "," + r0 * s1 + "A" + r0 + "," + r0 + " 0 " + df + ",0 " + r0 * c0 + "," + r0 * s0 + "Z" : "M" + r1 * c0 + "," + r1 * s0 + "A" + r1 + "," + r1 + " 0 " + df + ",1 " + r1 * c1 + "," + r1 * s1 + "L0,0" + "Z";
    }
    arc.innerRadius = function(v) {
      if (!arguments.length) return innerRadius;
      innerRadius = d3_functor(v);
      return arc;
    };
    arc.outerRadius = function(v) {
      if (!arguments.length) return outerRadius;
      outerRadius = d3_functor(v);
      return arc;
    };
    arc.startAngle = function(v) {
      if (!arguments.length) return startAngle;
      startAngle = d3_functor(v);
      return arc;
    };
    arc.endAngle = function(v) {
      if (!arguments.length) return endAngle;
      endAngle = d3_functor(v);
      return arc;
    };
    arc.centroid = function() {
      var r = (innerRadius.apply(this, arguments) + outerRadius.apply(this, arguments)) / 2, a = (startAngle.apply(this, arguments) + endAngle.apply(this, arguments)) / 2 + d3_svg_arcOffset;
      return [ Math.cos(a) * r, Math.sin(a) * r ];
    };
    return arc;
  };
  var d3_svg_arcOffset = -halfπ, d3_svg_arcMax = τ - ε;
  function d3_svg_arcInnerRadius(d) {
    return d.innerRadius;
  }
  function d3_svg_arcOuterRadius(d) {
    return d.outerRadius;
  }
  function d3_svg_arcStartAngle(d) {
    return d.startAngle;
  }
  function d3_svg_arcEndAngle(d) {
    return d.endAngle;
  }
  function d3_svg_line(projection) {
    var x = d3_geom_pointX, y = d3_geom_pointY, defined = d3_true, interpolate = d3_svg_lineLinear, interpolateKey = interpolate.key, tension = .7;
    function line(data) {
      var segments = [], points = [], i = -1, n = data.length, d, fx = d3_functor(x), fy = d3_functor(y);
      function segment() {
        segments.push("M", interpolate(projection(points), tension));
      }
      while (++i < n) {
        if (defined.call(this, d = data[i], i)) {
          points.push([ +fx.call(this, d, i), +fy.call(this, d, i) ]);
        } else if (points.length) {
          segment();
          points = [];
        }
      }
      if (points.length) segment();
      return segments.length ? segments.join("") : null;
    }
    line.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      return line;
    };
    line.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return line;
    };
    line.defined = function(_) {
      if (!arguments.length) return defined;
      defined = _;
      return line;
    };
    line.interpolate = function(_) {
      if (!arguments.length) return interpolateKey;
      if (typeof _ === "function") interpolateKey = interpolate = _; else interpolateKey = (interpolate = d3_svg_lineInterpolators.get(_) || d3_svg_lineLinear).key;
      return line;
    };
    line.tension = function(_) {
      if (!arguments.length) return tension;
      tension = _;
      return line;
    };
    return line;
  }
  d3.svg.line = function() {
    return d3_svg_line(d3_identity);
  };
  var d3_svg_lineInterpolators = d3.map({
    linear: d3_svg_lineLinear,
    "linear-closed": d3_svg_lineLinearClosed,
    step: d3_svg_lineStep,
    "step-before": d3_svg_lineStepBefore,
    "step-after": d3_svg_lineStepAfter,
    basis: d3_svg_lineBasis,
    "basis-open": d3_svg_lineBasisOpen,
    "basis-closed": d3_svg_lineBasisClosed,
    bundle: d3_svg_lineBundle,
    cardinal: d3_svg_lineCardinal,
    "cardinal-open": d3_svg_lineCardinalOpen,
    "cardinal-closed": d3_svg_lineCardinalClosed,
    monotone: d3_svg_lineMonotone
  });
  d3_svg_lineInterpolators.forEach(function(key, value) {
    value.key = key;
    value.closed = /-closed$/.test(key);
  });
  function d3_svg_lineLinear(points) {
    return points.join("L");
  }
  function d3_svg_lineLinearClosed(points) {
    return d3_svg_lineLinear(points) + "Z";
  }
  function d3_svg_lineStep(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("H", (p[0] + (p = points[i])[0]) / 2, "V", p[1]);
    if (n > 1) path.push("H", p[0]);
    return path.join("");
  }
  function d3_svg_lineStepBefore(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("V", (p = points[i])[1], "H", p[0]);
    return path.join("");
  }
  function d3_svg_lineStepAfter(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("H", (p = points[i])[0], "V", p[1]);
    return path.join("");
  }
  function d3_svg_lineCardinalOpen(points, tension) {
    return points.length < 4 ? d3_svg_lineLinear(points) : points[1] + d3_svg_lineHermite(points.slice(1, points.length - 1), d3_svg_lineCardinalTangents(points, tension));
  }
  function d3_svg_lineCardinalClosed(points, tension) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite((points.push(points[0]), 
    points), d3_svg_lineCardinalTangents([ points[points.length - 2] ].concat(points, [ points[1] ]), tension));
  }
  function d3_svg_lineCardinal(points, tension) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite(points, d3_svg_lineCardinalTangents(points, tension));
  }
  function d3_svg_lineHermite(points, tangents) {
    if (tangents.length < 1 || points.length != tangents.length && points.length != tangents.length + 2) {
      return d3_svg_lineLinear(points);
    }
    var quad = points.length != tangents.length, path = "", p0 = points[0], p = points[1], t0 = tangents[0], t = t0, pi = 1;
    if (quad) {
      path += "Q" + (p[0] - t0[0] * 2 / 3) + "," + (p[1] - t0[1] * 2 / 3) + "," + p[0] + "," + p[1];
      p0 = points[1];
      pi = 2;
    }
    if (tangents.length > 1) {
      t = tangents[1];
      p = points[pi];
      pi++;
      path += "C" + (p0[0] + t0[0]) + "," + (p0[1] + t0[1]) + "," + (p[0] - t[0]) + "," + (p[1] - t[1]) + "," + p[0] + "," + p[1];
      for (var i = 2; i < tangents.length; i++, pi++) {
        p = points[pi];
        t = tangents[i];
        path += "S" + (p[0] - t[0]) + "," + (p[1] - t[1]) + "," + p[0] + "," + p[1];
      }
    }
    if (quad) {
      var lp = points[pi];
      path += "Q" + (p[0] + t[0] * 2 / 3) + "," + (p[1] + t[1] * 2 / 3) + "," + lp[0] + "," + lp[1];
    }
    return path;
  }
  function d3_svg_lineCardinalTangents(points, tension) {
    var tangents = [], a = (1 - tension) / 2, p0, p1 = points[0], p2 = points[1], i = 1, n = points.length;
    while (++i < n) {
      p0 = p1;
      p1 = p2;
      p2 = points[i];
      tangents.push([ a * (p2[0] - p0[0]), a * (p2[1] - p0[1]) ]);
    }
    return tangents;
  }
  function d3_svg_lineBasis(points) {
    if (points.length < 3) return d3_svg_lineLinear(points);
    var i = 1, n = points.length, pi = points[0], x0 = pi[0], y0 = pi[1], px = [ x0, x0, x0, (pi = points[1])[0] ], py = [ y0, y0, y0, pi[1] ], path = [ x0, ",", y0, "L", d3_svg_lineDot4(d3_svg_lineBasisBezier3, px), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, py) ];
    points.push(points[n - 1]);
    while (++i <= n) {
      pi = points[i];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    points.pop();
    path.push("L", pi);
    return path.join("");
  }
  function d3_svg_lineBasisOpen(points) {
    if (points.length < 4) return d3_svg_lineLinear(points);
    var path = [], i = -1, n = points.length, pi, px = [ 0 ], py = [ 0 ];
    while (++i < 3) {
      pi = points[i];
      px.push(pi[0]);
      py.push(pi[1]);
    }
    path.push(d3_svg_lineDot4(d3_svg_lineBasisBezier3, px) + "," + d3_svg_lineDot4(d3_svg_lineBasisBezier3, py));
    --i;
    while (++i < n) {
      pi = points[i];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    return path.join("");
  }
  function d3_svg_lineBasisClosed(points) {
    var path, i = -1, n = points.length, m = n + 4, pi, px = [], py = [];
    while (++i < 4) {
      pi = points[i % n];
      px.push(pi[0]);
      py.push(pi[1]);
    }
    path = [ d3_svg_lineDot4(d3_svg_lineBasisBezier3, px), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, py) ];
    --i;
    while (++i < m) {
      pi = points[i % n];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    return path.join("");
  }
  function d3_svg_lineBundle(points, tension) {
    var n = points.length - 1;
    if (n) {
      var x0 = points[0][0], y0 = points[0][1], dx = points[n][0] - x0, dy = points[n][1] - y0, i = -1, p, t;
      while (++i <= n) {
        p = points[i];
        t = i / n;
        p[0] = tension * p[0] + (1 - tension) * (x0 + t * dx);
        p[1] = tension * p[1] + (1 - tension) * (y0 + t * dy);
      }
    }
    return d3_svg_lineBasis(points);
  }
  function d3_svg_lineDot4(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  var d3_svg_lineBasisBezier1 = [ 0, 2 / 3, 1 / 3, 0 ], d3_svg_lineBasisBezier2 = [ 0, 1 / 3, 2 / 3, 0 ], d3_svg_lineBasisBezier3 = [ 0, 1 / 6, 2 / 3, 1 / 6 ];
  function d3_svg_lineBasisBezier(path, x, y) {
    path.push("C", d3_svg_lineDot4(d3_svg_lineBasisBezier1, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier1, y), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier2, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier2, y), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, y));
  }
  function d3_svg_lineSlope(p0, p1) {
    return (p1[1] - p0[1]) / (p1[0] - p0[0]);
  }
  function d3_svg_lineFiniteDifferences(points) {
    var i = 0, j = points.length - 1, m = [], p0 = points[0], p1 = points[1], d = m[0] = d3_svg_lineSlope(p0, p1);
    while (++i < j) {
      m[i] = (d + (d = d3_svg_lineSlope(p0 = p1, p1 = points[i + 1]))) / 2;
    }
    m[i] = d;
    return m;
  }
  function d3_svg_lineMonotoneTangents(points) {
    var tangents = [], d, a, b, s, m = d3_svg_lineFiniteDifferences(points), i = -1, j = points.length - 1;
    while (++i < j) {
      d = d3_svg_lineSlope(points[i], points[i + 1]);
      if (abs(d) < ε) {
        m[i] = m[i + 1] = 0;
      } else {
        a = m[i] / d;
        b = m[i + 1] / d;
        s = a * a + b * b;
        if (s > 9) {
          s = d * 3 / Math.sqrt(s);
          m[i] = s * a;
          m[i + 1] = s * b;
        }
      }
    }
    i = -1;
    while (++i <= j) {
      s = (points[Math.min(j, i + 1)][0] - points[Math.max(0, i - 1)][0]) / (6 * (1 + m[i] * m[i]));
      tangents.push([ s || 0, m[i] * s || 0 ]);
    }
    return tangents;
  }
  function d3_svg_lineMonotone(points) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite(points, d3_svg_lineMonotoneTangents(points));
  }
  d3.svg.line.radial = function() {
    var line = d3_svg_line(d3_svg_lineRadial);
    line.radius = line.x, delete line.x;
    line.angle = line.y, delete line.y;
    return line;
  };
  function d3_svg_lineRadial(points) {
    var point, i = -1, n = points.length, r, a;
    while (++i < n) {
      point = points[i];
      r = point[0];
      a = point[1] + d3_svg_arcOffset;
      point[0] = r * Math.cos(a);
      point[1] = r * Math.sin(a);
    }
    return points;
  }
  function d3_svg_area(projection) {
    var x0 = d3_geom_pointX, x1 = d3_geom_pointX, y0 = 0, y1 = d3_geom_pointY, defined = d3_true, interpolate = d3_svg_lineLinear, interpolateKey = interpolate.key, interpolateReverse = interpolate, L = "L", tension = .7;
    function area(data) {
      var segments = [], points0 = [], points1 = [], i = -1, n = data.length, d, fx0 = d3_functor(x0), fy0 = d3_functor(y0), fx1 = x0 === x1 ? function() {
        return x;
      } : d3_functor(x1), fy1 = y0 === y1 ? function() {
        return y;
      } : d3_functor(y1), x, y;
      function segment() {
        segments.push("M", interpolate(projection(points1), tension), L, interpolateReverse(projection(points0.reverse()), tension), "Z");
      }
      while (++i < n) {
        if (defined.call(this, d = data[i], i)) {
          points0.push([ x = +fx0.call(this, d, i), y = +fy0.call(this, d, i) ]);
          points1.push([ +fx1.call(this, d, i), +fy1.call(this, d, i) ]);
        } else if (points0.length) {
          segment();
          points0 = [];
          points1 = [];
        }
      }
      if (points0.length) segment();
      return segments.length ? segments.join("") : null;
    }
    area.x = function(_) {
      if (!arguments.length) return x1;
      x0 = x1 = _;
      return area;
    };
    area.x0 = function(_) {
      if (!arguments.length) return x0;
      x0 = _;
      return area;
    };
    area.x1 = function(_) {
      if (!arguments.length) return x1;
      x1 = _;
      return area;
    };
    area.y = function(_) {
      if (!arguments.length) return y1;
      y0 = y1 = _;
      return area;
    };
    area.y0 = function(_) {
      if (!arguments.length) return y0;
      y0 = _;
      return area;
    };
    area.y1 = function(_) {
      if (!arguments.length) return y1;
      y1 = _;
      return area;
    };
    area.defined = function(_) {
      if (!arguments.length) return defined;
      defined = _;
      return area;
    };
    area.interpolate = function(_) {
      if (!arguments.length) return interpolateKey;
      if (typeof _ === "function") interpolateKey = interpolate = _; else interpolateKey = (interpolate = d3_svg_lineInterpolators.get(_) || d3_svg_lineLinear).key;
      interpolateReverse = interpolate.reverse || interpolate;
      L = interpolate.closed ? "M" : "L";
      return area;
    };
    area.tension = function(_) {
      if (!arguments.length) return tension;
      tension = _;
      return area;
    };
    return area;
  }
  d3_svg_lineStepBefore.reverse = d3_svg_lineStepAfter;
  d3_svg_lineStepAfter.reverse = d3_svg_lineStepBefore;
  d3.svg.area = function() {
    return d3_svg_area(d3_identity);
  };
  d3.svg.area.radial = function() {
    var area = d3_svg_area(d3_svg_lineRadial);
    area.radius = area.x, delete area.x;
    area.innerRadius = area.x0, delete area.x0;
    area.outerRadius = area.x1, delete area.x1;
    area.angle = area.y, delete area.y;
    area.startAngle = area.y0, delete area.y0;
    area.endAngle = area.y1, delete area.y1;
    return area;
  };
  d3.svg.chord = function() {
    var source = d3_source, target = d3_target, radius = d3_svg_chordRadius, startAngle = d3_svg_arcStartAngle, endAngle = d3_svg_arcEndAngle;
    function chord(d, i) {
      var s = subgroup(this, source, d, i), t = subgroup(this, target, d, i);
      return "M" + s.p0 + arc(s.r, s.p1, s.a1 - s.a0) + (equals(s, t) ? curve(s.r, s.p1, s.r, s.p0) : curve(s.r, s.p1, t.r, t.p0) + arc(t.r, t.p1, t.a1 - t.a0) + curve(t.r, t.p1, s.r, s.p0)) + "Z";
    }
    function subgroup(self, f, d, i) {
      var subgroup = f.call(self, d, i), r = radius.call(self, subgroup, i), a0 = startAngle.call(self, subgroup, i) + d3_svg_arcOffset, a1 = endAngle.call(self, subgroup, i) + d3_svg_arcOffset;
      return {
        r: r,
        a0: a0,
        a1: a1,
        p0: [ r * Math.cos(a0), r * Math.sin(a0) ],
        p1: [ r * Math.cos(a1), r * Math.sin(a1) ]
      };
    }
    function equals(a, b) {
      return a.a0 == b.a0 && a.a1 == b.a1;
    }
    function arc(r, p, a) {
      return "A" + r + "," + r + " 0 " + +(a > π) + ",1 " + p;
    }
    function curve(r0, p0, r1, p1) {
      return "Q 0,0 " + p1;
    }
    chord.radius = function(v) {
      if (!arguments.length) return radius;
      radius = d3_functor(v);
      return chord;
    };
    chord.source = function(v) {
      if (!arguments.length) return source;
      source = d3_functor(v);
      return chord;
    };
    chord.target = function(v) {
      if (!arguments.length) return target;
      target = d3_functor(v);
      return chord;
    };
    chord.startAngle = function(v) {
      if (!arguments.length) return startAngle;
      startAngle = d3_functor(v);
      return chord;
    };
    chord.endAngle = function(v) {
      if (!arguments.length) return endAngle;
      endAngle = d3_functor(v);
      return chord;
    };
    return chord;
  };
  function d3_svg_chordRadius(d) {
    return d.radius;
  }
  d3.svg.diagonal = function() {
    var source = d3_source, target = d3_target, projection = d3_svg_diagonalProjection;
    function diagonal(d, i) {
      var p0 = source.call(this, d, i), p3 = target.call(this, d, i), m = (p0.y + p3.y) / 2, p = [ p0, {
        x: p0.x,
        y: m
      }, {
        x: p3.x,
        y: m
      }, p3 ];
      p = p.map(projection);
      return "M" + p[0] + "C" + p[1] + " " + p[2] + " " + p[3];
    }
    diagonal.source = function(x) {
      if (!arguments.length) return source;
      source = d3_functor(x);
      return diagonal;
    };
    diagonal.target = function(x) {
      if (!arguments.length) return target;
      target = d3_functor(x);
      return diagonal;
    };
    diagonal.projection = function(x) {
      if (!arguments.length) return projection;
      projection = x;
      return diagonal;
    };
    return diagonal;
  };
  function d3_svg_diagonalProjection(d) {
    return [ d.x, d.y ];
  }
  d3.svg.diagonal.radial = function() {
    var diagonal = d3.svg.diagonal(), projection = d3_svg_diagonalProjection, projection_ = diagonal.projection;
    diagonal.projection = function(x) {
      return arguments.length ? projection_(d3_svg_diagonalRadialProjection(projection = x)) : projection;
    };
    return diagonal;
  };
  function d3_svg_diagonalRadialProjection(projection) {
    return function() {
      var d = projection.apply(this, arguments), r = d[0], a = d[1] + d3_svg_arcOffset;
      return [ r * Math.cos(a), r * Math.sin(a) ];
    };
  }
  d3.svg.symbol = function() {
    var type = d3_svg_symbolType, size = d3_svg_symbolSize;
    function symbol(d, i) {
      return (d3_svg_symbols.get(type.call(this, d, i)) || d3_svg_symbolCircle)(size.call(this, d, i));
    }
    symbol.type = function(x) {
      if (!arguments.length) return type;
      type = d3_functor(x);
      return symbol;
    };
    symbol.size = function(x) {
      if (!arguments.length) return size;
      size = d3_functor(x);
      return symbol;
    };
    return symbol;
  };
  function d3_svg_symbolSize() {
    return 64;
  }
  function d3_svg_symbolType() {
    return "circle";
  }
  function d3_svg_symbolCircle(size) {
    var r = Math.sqrt(size / π);
    return "M0," + r + "A" + r + "," + r + " 0 1,1 0," + -r + "A" + r + "," + r + " 0 1,1 0," + r + "Z";
  }
  var d3_svg_symbols = d3.map({
    circle: d3_svg_symbolCircle,
    cross: function(size) {
      var r = Math.sqrt(size / 5) / 2;
      return "M" + -3 * r + "," + -r + "H" + -r + "V" + -3 * r + "H" + r + "V" + -r + "H" + 3 * r + "V" + r + "H" + r + "V" + 3 * r + "H" + -r + "V" + r + "H" + -3 * r + "Z";
    },
    diamond: function(size) {
      var ry = Math.sqrt(size / (2 * d3_svg_symbolTan30)), rx = ry * d3_svg_symbolTan30;
      return "M0," + -ry + "L" + rx + ",0" + " 0," + ry + " " + -rx + ",0" + "Z";
    },
    square: function(size) {
      var r = Math.sqrt(size) / 2;
      return "M" + -r + "," + -r + "L" + r + "," + -r + " " + r + "," + r + " " + -r + "," + r + "Z";
    },
    "triangle-down": function(size) {
      var rx = Math.sqrt(size / d3_svg_symbolSqrt3), ry = rx * d3_svg_symbolSqrt3 / 2;
      return "M0," + ry + "L" + rx + "," + -ry + " " + -rx + "," + -ry + "Z";
    },
    "triangle-up": function(size) {
      var rx = Math.sqrt(size / d3_svg_symbolSqrt3), ry = rx * d3_svg_symbolSqrt3 / 2;
      return "M0," + -ry + "L" + rx + "," + ry + " " + -rx + "," + ry + "Z";
    }
  });
  d3.svg.symbolTypes = d3_svg_symbols.keys();
  var d3_svg_symbolSqrt3 = Math.sqrt(3), d3_svg_symbolTan30 = Math.tan(30 * d3_radians);
  function d3_transition(groups, id) {
    d3_subclass(groups, d3_transitionPrototype);
    groups.id = id;
    return groups;
  }
  var d3_transitionPrototype = [], d3_transitionId = 0, d3_transitionInheritId, d3_transitionInherit;
  d3_transitionPrototype.call = d3_selectionPrototype.call;
  d3_transitionPrototype.empty = d3_selectionPrototype.empty;
  d3_transitionPrototype.node = d3_selectionPrototype.node;
  d3_transitionPrototype.size = d3_selectionPrototype.size;
  d3.transition = function(selection) {
    return arguments.length ? d3_transitionInheritId ? selection.transition() : selection : d3_selectionRoot.transition();
  };
  d3.transition.prototype = d3_transitionPrototype;
  d3_transitionPrototype.select = function(selector) {
    var id = this.id, subgroups = [], subgroup, subnode, node;
    selector = d3_selection_selector(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if ((node = group[i]) && (subnode = selector.call(node, node.__data__, i, j))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          d3_transitionNode(subnode, i, id, node.__transition__[id]);
          subgroup.push(subnode);
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_transition(subgroups, id);
  };
  d3_transitionPrototype.selectAll = function(selector) {
    var id = this.id, subgroups = [], subgroup, subnodes, node, subnode, transition;
    selector = d3_selection_selectorAll(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          transition = node.__transition__[id];
          subnodes = selector.call(node, node.__data__, i, j);
          subgroups.push(subgroup = []);
          for (var k = -1, o = subnodes.length; ++k < o; ) {
            if (subnode = subnodes[k]) d3_transitionNode(subnode, k, id, transition);
            subgroup.push(subnode);
          }
        }
      }
    }
    return d3_transition(subgroups, id);
  };
  d3_transitionPrototype.filter = function(filter) {
    var subgroups = [], subgroup, group, node;
    if (typeof filter !== "function") filter = d3_selection_filter(filter);
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        if ((node = group[i]) && filter.call(node, node.__data__, i, j)) {
          subgroup.push(node);
        }
      }
    }
    return d3_transition(subgroups, this.id);
  };
  d3_transitionPrototype.tween = function(name, tween) {
    var id = this.id;
    if (arguments.length < 2) return this.node().__transition__[id].tween.get(name);
    return d3_selection_each(this, tween == null ? function(node) {
      node.__transition__[id].tween.remove(name);
    } : function(node) {
      node.__transition__[id].tween.set(name, tween);
    });
  };
  function d3_transition_tween(groups, name, value, tween) {
    var id = groups.id;
    return d3_selection_each(groups, typeof value === "function" ? function(node, i, j) {
      node.__transition__[id].tween.set(name, tween(value.call(node, node.__data__, i, j)));
    } : (value = tween(value), function(node) {
      node.__transition__[id].tween.set(name, value);
    }));
  }
  d3_transitionPrototype.attr = function(nameNS, value) {
    if (arguments.length < 2) {
      for (value in nameNS) this.attr(value, nameNS[value]);
      return this;
    }
    var interpolate = nameNS == "transform" ? d3_interpolateTransform : d3_interpolate, name = d3.ns.qualify(nameNS);
    function attrNull() {
      this.removeAttribute(name);
    }
    function attrNullNS() {
      this.removeAttributeNS(name.space, name.local);
    }
    function attrTween(b) {
      return b == null ? attrNull : (b += "", function() {
        var a = this.getAttribute(name), i;
        return a !== b && (i = interpolate(a, b), function(t) {
          this.setAttribute(name, i(t));
        });
      });
    }
    function attrTweenNS(b) {
      return b == null ? attrNullNS : (b += "", function() {
        var a = this.getAttributeNS(name.space, name.local), i;
        return a !== b && (i = interpolate(a, b), function(t) {
          this.setAttributeNS(name.space, name.local, i(t));
        });
      });
    }
    return d3_transition_tween(this, "attr." + nameNS, value, name.local ? attrTweenNS : attrTween);
  };
  d3_transitionPrototype.attrTween = function(nameNS, tween) {
    var name = d3.ns.qualify(nameNS);
    function attrTween(d, i) {
      var f = tween.call(this, d, i, this.getAttribute(name));
      return f && function(t) {
        this.setAttribute(name, f(t));
      };
    }
    function attrTweenNS(d, i) {
      var f = tween.call(this, d, i, this.getAttributeNS(name.space, name.local));
      return f && function(t) {
        this.setAttributeNS(name.space, name.local, f(t));
      };
    }
    return this.tween("attr." + nameNS, name.local ? attrTweenNS : attrTween);
  };
  d3_transitionPrototype.style = function(name, value, priority) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof name !== "string") {
        if (n < 2) value = "";
        for (priority in name) this.style(priority, name[priority], value);
        return this;
      }
      priority = "";
    }
    function styleNull() {
      this.style.removeProperty(name);
    }
    function styleString(b) {
      return b == null ? styleNull : (b += "", function() {
        var a = d3_window.getComputedStyle(this, null).getPropertyValue(name), i;
        return a !== b && (i = d3_interpolate(a, b), function(t) {
          this.style.setProperty(name, i(t), priority);
        });
      });
    }
    return d3_transition_tween(this, "style." + name, value, styleString);
  };
  d3_transitionPrototype.styleTween = function(name, tween, priority) {
    if (arguments.length < 3) priority = "";
    function styleTween(d, i) {
      var f = tween.call(this, d, i, d3_window.getComputedStyle(this, null).getPropertyValue(name));
      return f && function(t) {
        this.style.setProperty(name, f(t), priority);
      };
    }
    return this.tween("style." + name, styleTween);
  };
  d3_transitionPrototype.text = function(value) {
    return d3_transition_tween(this, "text", value, d3_transition_text);
  };
  function d3_transition_text(b) {
    if (b == null) b = "";
    return function() {
      this.textContent = b;
    };
  }
  d3_transitionPrototype.remove = function() {
    return this.each("end.transition", function() {
      var p;
      if (this.__transition__.count < 2 && (p = this.parentNode)) p.removeChild(this);
    });
  };
  d3_transitionPrototype.ease = function(value) {
    var id = this.id;
    if (arguments.length < 1) return this.node().__transition__[id].ease;
    if (typeof value !== "function") value = d3.ease.apply(d3, arguments);
    return d3_selection_each(this, function(node) {
      node.__transition__[id].ease = value;
    });
  };
  d3_transitionPrototype.delay = function(value) {
    var id = this.id;
    if (arguments.length < 1) return this.node().__transition__[id].delay;
    return d3_selection_each(this, typeof value === "function" ? function(node, i, j) {
      node.__transition__[id].delay = +value.call(node, node.__data__, i, j);
    } : (value = +value, function(node) {
      node.__transition__[id].delay = value;
    }));
  };
  d3_transitionPrototype.duration = function(value) {
    var id = this.id;
    if (arguments.length < 1) return this.node().__transition__[id].duration;
    return d3_selection_each(this, typeof value === "function" ? function(node, i, j) {
      node.__transition__[id].duration = Math.max(1, value.call(node, node.__data__, i, j));
    } : (value = Math.max(1, value), function(node) {
      node.__transition__[id].duration = value;
    }));
  };
  d3_transitionPrototype.each = function(type, listener) {
    var id = this.id;
    if (arguments.length < 2) {
      var inherit = d3_transitionInherit, inheritId = d3_transitionInheritId;
      d3_transitionInheritId = id;
      d3_selection_each(this, function(node, i, j) {
        d3_transitionInherit = node.__transition__[id];
        type.call(node, node.__data__, i, j);
      });
      d3_transitionInherit = inherit;
      d3_transitionInheritId = inheritId;
    } else {
      d3_selection_each(this, function(node) {
        var transition = node.__transition__[id];
        (transition.event || (transition.event = d3.dispatch("start", "end"))).on(type, listener);
      });
    }
    return this;
  };
  d3_transitionPrototype.transition = function() {
    var id0 = this.id, id1 = ++d3_transitionId, subgroups = [], subgroup, group, node, transition;
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        if (node = group[i]) {
          transition = Object.create(node.__transition__[id0]);
          transition.delay += transition.duration;
          d3_transitionNode(node, i, id1, transition);
        }
        subgroup.push(node);
      }
    }
    return d3_transition(subgroups, id1);
  };
  function d3_transitionNode(node, i, id, inherit) {
    var lock = node.__transition__ || (node.__transition__ = {
      active: 0,
      count: 0
    }), transition = lock[id];
    if (!transition) {
      var time = inherit.time;
      transition = lock[id] = {
        tween: new d3_Map(),
        time: time,
        ease: inherit.ease,
        delay: inherit.delay,
        duration: inherit.duration
      };
      ++lock.count;
      d3.timer(function(elapsed) {
        var d = node.__data__, ease = transition.ease, delay = transition.delay, duration = transition.duration, timer = d3_timer_active, tweened = [];
        timer.t = delay + time;
        if (delay <= elapsed) return start(elapsed - delay);
        timer.c = start;
        function start(elapsed) {
          if (lock.active > id) return stop();
          lock.active = id;
          transition.event && transition.event.start.call(node, d, i);
          transition.tween.forEach(function(key, value) {
            if (value = value.call(node, d, i)) {
              tweened.push(value);
            }
          });
          d3.timer(function() {
            timer.c = tick(elapsed || 1) ? d3_true : tick;
            return 1;
          }, 0, time);
        }
        function tick(elapsed) {
          if (lock.active !== id) return stop();
          var t = elapsed / duration, e = ease(t), n = tweened.length;
          while (n > 0) {
            tweened[--n].call(node, e);
          }
          if (t >= 1) {
            transition.event && transition.event.end.call(node, d, i);
            return stop();
          }
        }
        function stop() {
          if (--lock.count) delete lock[id]; else delete node.__transition__;
          return 1;
        }
      }, 0, time);
    }
  }
  d3.svg.axis = function() {
    var scale = d3.scale.linear(), orient = d3_svg_axisDefaultOrient, innerTickSize = 6, outerTickSize = 6, tickPadding = 3, tickArguments_ = [ 10 ], tickValues = null, tickFormat_;
    function axis(g) {
      g.each(function() {
        var g = d3.select(this);
        var scale0 = this.__chart__ || scale, scale1 = this.__chart__ = scale.copy();
        var ticks = tickValues == null ? scale1.ticks ? scale1.ticks.apply(scale1, tickArguments_) : scale1.domain() : tickValues, tickFormat = tickFormat_ == null ? scale1.tickFormat ? scale1.tickFormat.apply(scale1, tickArguments_) : d3_identity : tickFormat_, tick = g.selectAll(".tick").data(ticks, scale1), tickEnter = tick.enter().insert("g", ".domain").attr("class", "tick").style("opacity", ε), tickExit = d3.transition(tick.exit()).style("opacity", ε).remove(), tickUpdate = d3.transition(tick.order()).style("opacity", 1), tickTransform;
        var range = d3_scaleRange(scale1), path = g.selectAll(".domain").data([ 0 ]), pathUpdate = (path.enter().append("path").attr("class", "domain"), 
        d3.transition(path));
        tickEnter.append("line");
        tickEnter.append("text");
        var lineEnter = tickEnter.select("line"), lineUpdate = tickUpdate.select("line"), text = tick.select("text").text(tickFormat), textEnter = tickEnter.select("text"), textUpdate = tickUpdate.select("text");
        switch (orient) {
         case "bottom":
          {
            tickTransform = d3_svg_axisX;
            lineEnter.attr("y2", innerTickSize);
            textEnter.attr("y", Math.max(innerTickSize, 0) + tickPadding);
            lineUpdate.attr("x2", 0).attr("y2", innerTickSize);
            textUpdate.attr("x", 0).attr("y", Math.max(innerTickSize, 0) + tickPadding);
            text.attr("dy", ".71em").style("text-anchor", "middle");
            pathUpdate.attr("d", "M" + range[0] + "," + outerTickSize + "V0H" + range[1] + "V" + outerTickSize);
            break;
          }

         case "top":
          {
            tickTransform = d3_svg_axisX;
            lineEnter.attr("y2", -innerTickSize);
            textEnter.attr("y", -(Math.max(innerTickSize, 0) + tickPadding));
            lineUpdate.attr("x2", 0).attr("y2", -innerTickSize);
            textUpdate.attr("x", 0).attr("y", -(Math.max(innerTickSize, 0) + tickPadding));
            text.attr("dy", "0em").style("text-anchor", "middle");
            pathUpdate.attr("d", "M" + range[0] + "," + -outerTickSize + "V0H" + range[1] + "V" + -outerTickSize);
            break;
          }

         case "left":
          {
            tickTransform = d3_svg_axisY;
            lineEnter.attr("x2", -innerTickSize);
            textEnter.attr("x", -(Math.max(innerTickSize, 0) + tickPadding));
            lineUpdate.attr("x2", -innerTickSize).attr("y2", 0);
            textUpdate.attr("x", -(Math.max(innerTickSize, 0) + tickPadding)).attr("y", 0);
            text.attr("dy", ".32em").style("text-anchor", "end");
            pathUpdate.attr("d", "M" + -outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + -outerTickSize);
            break;
          }

         case "right":
          {
            tickTransform = d3_svg_axisY;
            lineEnter.attr("x2", innerTickSize);
            textEnter.attr("x", Math.max(innerTickSize, 0) + tickPadding);
            lineUpdate.attr("x2", innerTickSize).attr("y2", 0);
            textUpdate.attr("x", Math.max(innerTickSize, 0) + tickPadding).attr("y", 0);
            text.attr("dy", ".32em").style("text-anchor", "start");
            pathUpdate.attr("d", "M" + outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + outerTickSize);
            break;
          }
        }
        if (scale1.rangeBand) {
          var x = scale1, dx = x.rangeBand() / 2;
          scale0 = scale1 = function(d) {
            return x(d) + dx;
          };
        } else if (scale0.rangeBand) {
          scale0 = scale1;
        } else {
          tickExit.call(tickTransform, scale1);
        }
        tickEnter.call(tickTransform, scale0);
        tickUpdate.call(tickTransform, scale1);
      });
    }
    axis.scale = function(x) {
      if (!arguments.length) return scale;
      scale = x;
      return axis;
    };
    axis.orient = function(x) {
      if (!arguments.length) return orient;
      orient = x in d3_svg_axisOrients ? x + "" : d3_svg_axisDefaultOrient;
      return axis;
    };
    axis.ticks = function() {
      if (!arguments.length) return tickArguments_;
      tickArguments_ = arguments;
      return axis;
    };
    axis.tickValues = function(x) {
      if (!arguments.length) return tickValues;
      tickValues = x;
      return axis;
    };
    axis.tickFormat = function(x) {
      if (!arguments.length) return tickFormat_;
      tickFormat_ = x;
      return axis;
    };
    axis.tickSize = function(x) {
      var n = arguments.length;
      if (!n) return innerTickSize;
      innerTickSize = +x;
      outerTickSize = +arguments[n - 1];
      return axis;
    };
    axis.innerTickSize = function(x) {
      if (!arguments.length) return innerTickSize;
      innerTickSize = +x;
      return axis;
    };
    axis.outerTickSize = function(x) {
      if (!arguments.length) return outerTickSize;
      outerTickSize = +x;
      return axis;
    };
    axis.tickPadding = function(x) {
      if (!arguments.length) return tickPadding;
      tickPadding = +x;
      return axis;
    };
    axis.tickSubdivide = function() {
      return arguments.length && axis;
    };
    return axis;
  };
  var d3_svg_axisDefaultOrient = "bottom", d3_svg_axisOrients = {
    top: 1,
    right: 1,
    bottom: 1,
    left: 1
  };
  function d3_svg_axisX(selection, x) {
    selection.attr("transform", function(d) {
      return "translate(" + x(d) + ",0)";
    });
  }
  function d3_svg_axisY(selection, y) {
    selection.attr("transform", function(d) {
      return "translate(0," + y(d) + ")";
    });
  }
  d3.svg.brush = function() {
    var event = d3_eventDispatch(brush, "brushstart", "brush", "brushend"), x = null, y = null, xExtent = [ 0, 0 ], yExtent = [ 0, 0 ], xExtentDomain, yExtentDomain, xClamp = true, yClamp = true, resizes = d3_svg_brushResizes[0];
    function brush(g) {
      g.each(function() {
        var g = d3.select(this).style("pointer-events", "all").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)").on("mousedown.brush", brushstart).on("touchstart.brush", brushstart);
        var background = g.selectAll(".background").data([ 0 ]);
        background.enter().append("rect").attr("class", "background").style("visibility", "hidden").style("cursor", "crosshair");
        g.selectAll(".extent").data([ 0 ]).enter().append("rect").attr("class", "extent").style("cursor", "move");
        var resize = g.selectAll(".resize").data(resizes, d3_identity);
        resize.exit().remove();
        resize.enter().append("g").attr("class", function(d) {
          return "resize " + d;
        }).style("cursor", function(d) {
          return d3_svg_brushCursor[d];
        }).append("rect").attr("x", function(d) {
          return /[ew]$/.test(d) ? -3 : null;
        }).attr("y", function(d) {
          return /^[ns]/.test(d) ? -3 : null;
        }).attr("width", 6).attr("height", 6).style("visibility", "hidden");
        resize.style("display", brush.empty() ? "none" : null);
        var gUpdate = d3.transition(g), backgroundUpdate = d3.transition(background), range;
        if (x) {
          range = d3_scaleRange(x);
          backgroundUpdate.attr("x", range[0]).attr("width", range[1] - range[0]);
          redrawX(gUpdate);
        }
        if (y) {
          range = d3_scaleRange(y);
          backgroundUpdate.attr("y", range[0]).attr("height", range[1] - range[0]);
          redrawY(gUpdate);
        }
        redraw(gUpdate);
      });
    }
    brush.event = function(g) {
      g.each(function() {
        var event_ = event.of(this, arguments), extent1 = {
          x: xExtent,
          y: yExtent,
          i: xExtentDomain,
          j: yExtentDomain
        }, extent0 = this.__chart__ || extent1;
        this.__chart__ = extent1;
        if (d3_transitionInheritId) {
          d3.select(this).transition().each("start.brush", function() {
            xExtentDomain = extent0.i;
            yExtentDomain = extent0.j;
            xExtent = extent0.x;
            yExtent = extent0.y;
            event_({
              type: "brushstart"
            });
          }).tween("brush:brush", function() {
            var xi = d3_interpolateArray(xExtent, extent1.x), yi = d3_interpolateArray(yExtent, extent1.y);
            xExtentDomain = yExtentDomain = null;
            return function(t) {
              xExtent = extent1.x = xi(t);
              yExtent = extent1.y = yi(t);
              event_({
                type: "brush",
                mode: "resize"
              });
            };
          }).each("end.brush", function() {
            xExtentDomain = extent1.i;
            yExtentDomain = extent1.j;
            event_({
              type: "brush",
              mode: "resize"
            });
            event_({
              type: "brushend"
            });
          });
        } else {
          event_({
            type: "brushstart"
          });
          event_({
            type: "brush",
            mode: "resize"
          });
          event_({
            type: "brushend"
          });
        }
      });
    };
    function redraw(g) {
      g.selectAll(".resize").attr("transform", function(d) {
        return "translate(" + xExtent[+/e$/.test(d)] + "," + yExtent[+/^s/.test(d)] + ")";
      });
    }
    function redrawX(g) {
      g.select(".extent").attr("x", xExtent[0]);
      g.selectAll(".extent,.n>rect,.s>rect").attr("width", xExtent[1] - xExtent[0]);
    }
    function redrawY(g) {
      g.select(".extent").attr("y", yExtent[0]);
      g.selectAll(".extent,.e>rect,.w>rect").attr("height", yExtent[1] - yExtent[0]);
    }
    function brushstart() {
      var target = this, eventTarget = d3.select(d3.event.target), event_ = event.of(target, arguments), g = d3.select(target), resizing = eventTarget.datum(), resizingX = !/^(n|s)$/.test(resizing) && x, resizingY = !/^(e|w)$/.test(resizing) && y, dragging = eventTarget.classed("extent"), dragRestore = d3_event_dragSuppress(), center, origin = d3.mouse(target), offset;
      var w = d3.select(d3_window).on("keydown.brush", keydown).on("keyup.brush", keyup);
      if (d3.event.changedTouches) {
        w.on("touchmove.brush", brushmove).on("touchend.brush", brushend);
      } else {
        w.on("mousemove.brush", brushmove).on("mouseup.brush", brushend);
      }
      g.interrupt().selectAll("*").interrupt();
      if (dragging) {
        origin[0] = xExtent[0] - origin[0];
        origin[1] = yExtent[0] - origin[1];
      } else if (resizing) {
        var ex = +/w$/.test(resizing), ey = +/^n/.test(resizing);
        offset = [ xExtent[1 - ex] - origin[0], yExtent[1 - ey] - origin[1] ];
        origin[0] = xExtent[ex];
        origin[1] = yExtent[ey];
      } else if (d3.event.altKey) center = origin.slice();
      g.style("pointer-events", "none").selectAll(".resize").style("display", null);
      d3.select("body").style("cursor", eventTarget.style("cursor"));
      event_({
        type: "brushstart"
      });
      brushmove();
      function keydown() {
        if (d3.event.keyCode == 32) {
          if (!dragging) {
            center = null;
            origin[0] -= xExtent[1];
            origin[1] -= yExtent[1];
            dragging = 2;
          }
          d3_eventPreventDefault();
        }
      }
      function keyup() {
        if (d3.event.keyCode == 32 && dragging == 2) {
          origin[0] += xExtent[1];
          origin[1] += yExtent[1];
          dragging = 0;
          d3_eventPreventDefault();
        }
      }
      function brushmove() {
        var point = d3.mouse(target), moved = false;
        if (offset) {
          point[0] += offset[0];
          point[1] += offset[1];
        }
        if (!dragging) {
          if (d3.event.altKey) {
            if (!center) center = [ (xExtent[0] + xExtent[1]) / 2, (yExtent[0] + yExtent[1]) / 2 ];
            origin[0] = xExtent[+(point[0] < center[0])];
            origin[1] = yExtent[+(point[1] < center[1])];
          } else center = null;
        }
        if (resizingX && move1(point, x, 0)) {
          redrawX(g);
          moved = true;
        }
        if (resizingY && move1(point, y, 1)) {
          redrawY(g);
          moved = true;
        }
        if (moved) {
          redraw(g);
          event_({
            type: "brush",
            mode: dragging ? "move" : "resize"
          });
        }
      }
      function move1(point, scale, i) {
        var range = d3_scaleRange(scale), r0 = range[0], r1 = range[1], position = origin[i], extent = i ? yExtent : xExtent, size = extent[1] - extent[0], min, max;
        if (dragging) {
          r0 -= position;
          r1 -= size + position;
        }
        min = (i ? yClamp : xClamp) ? Math.max(r0, Math.min(r1, point[i])) : point[i];
        if (dragging) {
          max = (min += position) + size;
        } else {
          if (center) position = Math.max(r0, Math.min(r1, 2 * center[i] - min));
          if (position < min) {
            max = min;
            min = position;
          } else {
            max = position;
          }
        }
        if (extent[0] != min || extent[1] != max) {
          if (i) yExtentDomain = null; else xExtentDomain = null;
          extent[0] = min;
          extent[1] = max;
          return true;
        }
      }
      function brushend() {
        brushmove();
        g.style("pointer-events", "all").selectAll(".resize").style("display", brush.empty() ? "none" : null);
        d3.select("body").style("cursor", null);
        w.on("mousemove.brush", null).on("mouseup.brush", null).on("touchmove.brush", null).on("touchend.brush", null).on("keydown.brush", null).on("keyup.brush", null);
        dragRestore();
        event_({
          type: "brushend"
        });
      }
    }
    brush.x = function(z) {
      if (!arguments.length) return x;
      x = z;
      resizes = d3_svg_brushResizes[!x << 1 | !y];
      return brush;
    };
    brush.y = function(z) {
      if (!arguments.length) return y;
      y = z;
      resizes = d3_svg_brushResizes[!x << 1 | !y];
      return brush;
    };
    brush.clamp = function(z) {
      if (!arguments.length) return x && y ? [ xClamp, yClamp ] : x ? xClamp : y ? yClamp : null;
      if (x && y) xClamp = !!z[0], yClamp = !!z[1]; else if (x) xClamp = !!z; else if (y) yClamp = !!z;
      return brush;
    };
    brush.extent = function(z) {
      var x0, x1, y0, y1, t;
      if (!arguments.length) {
        if (x) {
          if (xExtentDomain) {
            x0 = xExtentDomain[0], x1 = xExtentDomain[1];
          } else {
            x0 = xExtent[0], x1 = xExtent[1];
            if (x.invert) x0 = x.invert(x0), x1 = x.invert(x1);
            if (x1 < x0) t = x0, x0 = x1, x1 = t;
          }
        }
        if (y) {
          if (yExtentDomain) {
            y0 = yExtentDomain[0], y1 = yExtentDomain[1];
          } else {
            y0 = yExtent[0], y1 = yExtent[1];
            if (y.invert) y0 = y.invert(y0), y1 = y.invert(y1);
            if (y1 < y0) t = y0, y0 = y1, y1 = t;
          }
        }
        return x && y ? [ [ x0, y0 ], [ x1, y1 ] ] : x ? [ x0, x1 ] : y && [ y0, y1 ];
      }
      if (x) {
        x0 = z[0], x1 = z[1];
        if (y) x0 = x0[0], x1 = x1[0];
        xExtentDomain = [ x0, x1 ];
        if (x.invert) x0 = x(x0), x1 = x(x1);
        if (x1 < x0) t = x0, x0 = x1, x1 = t;
        if (x0 != xExtent[0] || x1 != xExtent[1]) xExtent = [ x0, x1 ];
      }
      if (y) {
        y0 = z[0], y1 = z[1];
        if (x) y0 = y0[1], y1 = y1[1];
        yExtentDomain = [ y0, y1 ];
        if (y.invert) y0 = y(y0), y1 = y(y1);
        if (y1 < y0) t = y0, y0 = y1, y1 = t;
        if (y0 != yExtent[0] || y1 != yExtent[1]) yExtent = [ y0, y1 ];
      }
      return brush;
    };
    brush.clear = function() {
      if (!brush.empty()) {
        xExtent = [ 0, 0 ], yExtent = [ 0, 0 ];
        xExtentDomain = yExtentDomain = null;
      }
      return brush;
    };
    brush.empty = function() {
      return !!x && xExtent[0] == xExtent[1] || !!y && yExtent[0] == yExtent[1];
    };
    return d3.rebind(brush, event, "on");
  };
  var d3_svg_brushCursor = {
    n: "ns-resize",
    e: "ew-resize",
    s: "ns-resize",
    w: "ew-resize",
    nw: "nwse-resize",
    ne: "nesw-resize",
    se: "nwse-resize",
    sw: "nesw-resize"
  };
  var d3_svg_brushResizes = [ [ "n", "e", "s", "w", "nw", "ne", "se", "sw" ], [ "e", "w" ], [ "n", "s" ], [] ];
  var d3_time_format = d3_time.format = d3_locale_enUS.timeFormat;
  var d3_time_formatUtc = d3_time_format.utc;
  var d3_time_formatIso = d3_time_formatUtc("%Y-%m-%dT%H:%M:%S.%LZ");
  d3_time_format.iso = Date.prototype.toISOString && +new Date("2000-01-01T00:00:00.000Z") ? d3_time_formatIsoNative : d3_time_formatIso;
  function d3_time_formatIsoNative(date) {
    return date.toISOString();
  }
  d3_time_formatIsoNative.parse = function(string) {
    var date = new Date(string);
    return isNaN(date) ? null : date;
  };
  d3_time_formatIsoNative.toString = d3_time_formatIso.toString;
  d3_time.second = d3_time_interval(function(date) {
    return new d3_date(Math.floor(date / 1e3) * 1e3);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 1e3);
  }, function(date) {
    return date.getSeconds();
  });
  d3_time.seconds = d3_time.second.range;
  d3_time.seconds.utc = d3_time.second.utc.range;
  d3_time.minute = d3_time_interval(function(date) {
    return new d3_date(Math.floor(date / 6e4) * 6e4);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 6e4);
  }, function(date) {
    return date.getMinutes();
  });
  d3_time.minutes = d3_time.minute.range;
  d3_time.minutes.utc = d3_time.minute.utc.range;
  d3_time.hour = d3_time_interval(function(date) {
    var timezone = date.getTimezoneOffset() / 60;
    return new d3_date((Math.floor(date / 36e5 - timezone) + timezone) * 36e5);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 36e5);
  }, function(date) {
    return date.getHours();
  });
  d3_time.hours = d3_time.hour.range;
  d3_time.hours.utc = d3_time.hour.utc.range;
  d3_time.month = d3_time_interval(function(date) {
    date = d3_time.day(date);
    date.setDate(1);
    return date;
  }, function(date, offset) {
    date.setMonth(date.getMonth() + offset);
  }, function(date) {
    return date.getMonth();
  });
  d3_time.months = d3_time.month.range;
  d3_time.months.utc = d3_time.month.utc.range;
  function d3_time_scale(linear, methods, format) {
    function scale(x) {
      return linear(x);
    }
    scale.invert = function(x) {
      return d3_time_scaleDate(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return linear.domain().map(d3_time_scaleDate);
      linear.domain(x);
      return scale;
    };
    function tickMethod(extent, count) {
      var span = extent[1] - extent[0], target = span / count, i = d3.bisect(d3_time_scaleSteps, target);
      return i == d3_time_scaleSteps.length ? [ methods.year, d3_scale_linearTickRange(extent.map(function(d) {
        return d / 31536e6;
      }), count)[2] ] : !i ? [ d3_time_scaleMilliseconds, d3_scale_linearTickRange(extent, count)[2] ] : methods[target / d3_time_scaleSteps[i - 1] < d3_time_scaleSteps[i] / target ? i - 1 : i];
    }
    scale.nice = function(interval, skip) {
      var domain = scale.domain(), extent = d3_scaleExtent(domain), method = interval == null ? tickMethod(extent, 10) : typeof interval === "number" && tickMethod(extent, interval);
      if (method) interval = method[0], skip = method[1];
      function skipped(date) {
        return !isNaN(date) && !interval.range(date, d3_time_scaleDate(+date + 1), skip).length;
      }
      return scale.domain(d3_scale_nice(domain, skip > 1 ? {
        floor: function(date) {
          while (skipped(date = interval.floor(date))) date = d3_time_scaleDate(date - 1);
          return date;
        },
        ceil: function(date) {
          while (skipped(date = interval.ceil(date))) date = d3_time_scaleDate(+date + 1);
          return date;
        }
      } : interval));
    };
    scale.ticks = function(interval, skip) {
      var extent = d3_scaleExtent(scale.domain()), method = interval == null ? tickMethod(extent, 10) : typeof interval === "number" ? tickMethod(extent, interval) : !interval.range && [ {
        range: interval
      }, skip ];
      if (method) interval = method[0], skip = method[1];
      return interval.range(extent[0], d3_time_scaleDate(+extent[1] + 1), skip < 1 ? 1 : skip);
    };
    scale.tickFormat = function() {
      return format;
    };
    scale.copy = function() {
      return d3_time_scale(linear.copy(), methods, format);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  function d3_time_scaleDate(t) {
    return new Date(t);
  }
  var d3_time_scaleSteps = [ 1e3, 5e3, 15e3, 3e4, 6e4, 3e5, 9e5, 18e5, 36e5, 108e5, 216e5, 432e5, 864e5, 1728e5, 6048e5, 2592e6, 7776e6, 31536e6 ];
  var d3_time_scaleLocalMethods = [ [ d3_time.second, 1 ], [ d3_time.second, 5 ], [ d3_time.second, 15 ], [ d3_time.second, 30 ], [ d3_time.minute, 1 ], [ d3_time.minute, 5 ], [ d3_time.minute, 15 ], [ d3_time.minute, 30 ], [ d3_time.hour, 1 ], [ d3_time.hour, 3 ], [ d3_time.hour, 6 ], [ d3_time.hour, 12 ], [ d3_time.day, 1 ], [ d3_time.day, 2 ], [ d3_time.week, 1 ], [ d3_time.month, 1 ], [ d3_time.month, 3 ], [ d3_time.year, 1 ] ];
  var d3_time_scaleLocalFormat = d3_time_format.multi([ [ ".%L", function(d) {
    return d.getMilliseconds();
  } ], [ ":%S", function(d) {
    return d.getSeconds();
  } ], [ "%I:%M", function(d) {
    return d.getMinutes();
  } ], [ "%I %p", function(d) {
    return d.getHours();
  } ], [ "%a %d", function(d) {
    return d.getDay() && d.getDate() != 1;
  } ], [ "%b %d", function(d) {
    return d.getDate() != 1;
  } ], [ "%B", function(d) {
    return d.getMonth();
  } ], [ "%Y", d3_true ] ]);
  var d3_time_scaleMilliseconds = {
    range: function(start, stop, step) {
      return d3.range(Math.ceil(start / step) * step, +stop, step).map(d3_time_scaleDate);
    },
    floor: d3_identity,
    ceil: d3_identity
  };
  d3_time_scaleLocalMethods.year = d3_time.year;
  d3_time.scale = function() {
    return d3_time_scale(d3.scale.linear(), d3_time_scaleLocalMethods, d3_time_scaleLocalFormat);
  };
  var d3_time_scaleUtcMethods = d3_time_scaleLocalMethods.map(function(m) {
    return [ m[0].utc, m[1] ];
  });
  var d3_time_scaleUtcFormat = d3_time_formatUtc.multi([ [ ".%L", function(d) {
    return d.getUTCMilliseconds();
  } ], [ ":%S", function(d) {
    return d.getUTCSeconds();
  } ], [ "%I:%M", function(d) {
    return d.getUTCMinutes();
  } ], [ "%I %p", function(d) {
    return d.getUTCHours();
  } ], [ "%a %d", function(d) {
    return d.getUTCDay() && d.getUTCDate() != 1;
  } ], [ "%b %d", function(d) {
    return d.getUTCDate() != 1;
  } ], [ "%B", function(d) {
    return d.getUTCMonth();
  } ], [ "%Y", d3_true ] ]);
  d3_time_scaleUtcMethods.year = d3_time.year.utc;
  d3_time.scale.utc = function() {
    return d3_time_scale(d3.scale.linear(), d3_time_scaleUtcMethods, d3_time_scaleUtcFormat);
  };
  d3.text = d3_xhrType(function(request) {
    return request.responseText;
  });
  d3.json = function(url, callback) {
    return d3_xhr(url, "application/json", d3_json, callback);
  };
  function d3_json(request) {
    return JSON.parse(request.responseText);
  }
  d3.html = function(url, callback) {
    return d3_xhr(url, "text/html", d3_html, callback);
  };
  function d3_html(request) {
    var range = d3_document.createRange();
    range.selectNode(d3_document.body);
    return range.createContextualFragment(request.responseText);
  }
  d3.xml = d3_xhrType(function(request) {
    return request.responseXML;
  });
  if (typeof define === "function" && define.amd) {
    define(d3);
  } else if (typeof module === "object" && module.exports) {
    module.exports = d3;
  } else {
    this.d3 = d3;
  }
}();

/* **********************************************
     Begin d3plus.js
********************************************** */

(function(){

var d3plus = window.d3plus || {};
window.d3plus = d3plus;

d3plus.version = "1.2.4 - Royal";

d3plus.ie = /*@cc_on!@*/false;

d3plus.rtl = d3.select("html").attr("dir") == "rtl"

d3plus.prefix = function() {

  if ("-webkit-transform" in document.body.style) {
    var val = "-webkit-"
  }
  else if ("-moz-transform" in document.body.style) {
    var val = "-moz-"
  }
  else if ("-ms-transform" in document.body.style) {
    var val = "-ms-"
  }
  else if ("-o-transform" in document.body.style) {
    var val = "-o-"
  }
  else {
    var val = ""
  }

  d3plus.prefix = function(){
    return val
  }

  return val;

}

d3plus.scrollbar = function() {

  var inner = document.createElement("p");
  inner.style.width = "100%";
  inner.style.height = "200px";

  var outer = document.createElement("div");
  outer.style.position = "absolute";
  outer.style.top = "0px";
  outer.style.left = "0px";
  outer.style.visibility = "hidden";
  outer.style.width = "200px";
  outer.style.height = "150px";
  outer.style.overflow = "hidden";
  outer.appendChild(inner);

  document.body.appendChild(outer);
  var w1 = inner.offsetWidth;
  outer.style.overflow = "scroll";
  var w2 = inner.offsetWidth;
  if (w1 == w2) w2 = outer.clientWidth;

  document.body.removeChild(outer);

  var val = (w1 - w2)

  d3plus.scrollbar = function(){
    return val
  }

  return val;

}

d3.select(window).on("load.d3plus_scrollbar",function(){
  d3plus.prefix()
  d3plus.scrollbar()
})

d3plus.evt = {}; // stores all mouse events that could occur

// Modernizr touch events
d3plus.touch = window.Modernizr && Modernizr.touch
if (d3plus.touch) {
  d3plus.evt.click = "click"
  d3plus.evt.down = "touchstart"
  d3plus.evt.up = "touchend"
  d3plus.evt.over = "touchstart"
  d3plus.evt.out = "touchend"
  d3plus.evt.move = "touchmove"
} else {
  d3plus.evt.click = "click"
  d3plus.evt.down = "mousedown"
  d3plus.evt.up = "mouseup"
  if (d3plus.ie) {
    d3plus.evt.over = "mouseenter"
    d3plus.evt.out = "mouseleave"
  }
  else {
    d3plus.evt.over = "mouseover"
    d3plus.evt.out = "mouseout"
  }
  d3plus.evt.move = "mousemove"
}

d3plus.apps = {};
d3plus.color = {};
d3plus.data = {};
d3plus.draw = {};
d3plus.font = {};
d3plus.forms = {};
d3plus.ui = {};
d3plus.shape = {};
d3plus.styles = {};
d3plus.tooltip = {};
d3plus.util = {};
d3plus.variable = {};
d3plus.zoom = {};

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Custom styling and behavior for browser console statements.
//------------------------------------------------------------------------------
d3plus.console = {};

d3plus.console.print = function(type,message,style) {
  if (d3plus.ie) console.log("[d3plus] "+message)
  else console[type]("%c[d3plus]%c "+message,"font-weight:bold;",style)
}
d3plus.console.log = function(message,style) {
  if (!style) var style = "font-weight:bold;"
  d3plus.console.print("log",message,style)
}
d3plus.console.group = function(message,style) {
  if (!style) var style = "font-weight:bold;"
  d3plus.console.print("group",message,style)
}
d3plus.console.warning = function(message,style) {
  if (!style) var style = "font-weight:bold;color:red;"
  message = "WARNING: "+message
  d3plus.console.print("log",message,style)
}
d3plus.console.groupEnd = function() {
  if (!d3plus.ie) console.groupEnd()
}
d3plus.console.time = function(message) {
  if (!d3plus.ie) console.time(message)
}
d3plus.console.timeEnd = function(message) {
  if (!d3plus.ie) console.timeEnd(message)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Form Element shell
//------------------------------------------------------------------------------
d3plus.forms = function(passed) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Create global ui variable object
  //----------------------------------------------------------------------------
  var vars = {
    "before": null,
    "callback": false,
    "data": [],
    "dev": false,
    "enabled": false,
    "filter": "",
    "flipped": false,
    "format": d3plus.public.text_format.value,
    "highlight": false,
    "hover": false,
    "id": "default",
    "init": false,
    "large": 200,
    "max-height": 600,
    "max-width": 600,
    "parent": d3.select("body"),
    "previous": false,
    "propagation": true,
    "selected": false,
    "text": "text",
    "timing": 200,
    "update": true
  }

  var styles = {
    "align": "left",
    "border": "all",
    "color": "#ffffff",
    "corners": 0,
    "display": "inline-block",
    "drop": {},
    "font-family": "'Helvetica Neue', 'HelveticaNeue', 'Helvetica', 'Arial', 'sans-serif'",
    "font-size": 12,
    "font-spacing": 0,
    "font-weight": 200,
    "height": false,
    "margin": 0,
    "padding": 4,
    "secondary": d3plus.color.darker("#ffffff",0.05),
    "shadow": 5,
    "stroke": 1,
    "width": false
  }

  styles["font-align"] = d3plus.rtl ? "right" : "left"

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Set default icon based on whether or not font-awesome is present
  //----------------------------------------------------------------------------
  styles.icon = d3plus.font.awesome ? "fa-angle-down" : "&#x27A4;"

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Overwrite vars if vars have been passed
  //----------------------------------------------------------------------------
  if (passed) {
    styles = d3plus.util.merge(styles,passed)
  }
  vars.forms = function(selection,timing) {

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Set timing to 0 if it's the first time running this function or if the
    // data length is longer than the "large" limit
    //--------------------------------------------------------------------------
    var large = vars.data.array instanceof Array && vars.data.array.length > vars.large
    var timing = !vars.init || large || d3plus.ie ? 0 : vars.timing

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // If it data is an array, format it
    //--------------------------------------------------------------------------
    if (vars.data instanceof Array && typeof vars.data.select != "function") {
      vars.data = {
        "array": vars.data
      }
    }
    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // If it data is an object, format it
    //--------------------------------------------------------------------------
    else if (typeof vars.data == "object" && !vars.data.array && !(vars.data instanceof Array)) {

      if (!vars.data.array) {
        vars.data.array = []
      }

      if (vars.element) {
        d3plus.forms.element(vars)
      }

      d3plus.forms.data(vars)

      var focus = vars.data.array.filter(function(d){
        return d.value == vars.focus
      })[0]

      if (!focus) {
        vars.data.array[0].selected = true
        vars.focus = vars.data.array[0].value
      }

      vars.data.changed

    }
    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // If it data is not an object, extract data from the element associated with it
    //--------------------------------------------------------------------------
    else if (vars.data && !vars.data.array) {

      if (typeof vars.data == "string" && !d3.select(vars.data).empty()) {
        vars.element = d3.selectAll(vars.data)
        if (vars.data.charAt(0) == "#") {
          vars.before = vars.data
        }
      }
      else if (d3plus.util.d3selection(vars.data)) {
        vars.element = vars.data
        if (vars.data.node().id) {
          vars.before = "#"+vars.data.node().id
        }
      }

      vars.data = {
        "array": []
      }

    }

    if (vars.data.array.length == 0 && vars.element) {

      vars.parent = d3.select(vars.element.node().parentNode)
      d3plus.forms.element(vars)

    }

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // If there is no data, throw error message
    //--------------------------------------------------------------------------
    if (typeof vars.data.array == "string") {
      d3plus.console.warning("Cannot create UI element for \""+vars.data.array+"\", no data found.")
    }
    else if (!(vars.data.array instanceof Array)) {
      d3plus.console.warning("Cannot create UI element, no data found.")
    }
    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Else, create/update the UI element
    //--------------------------------------------------------------------------
    else {

      if (!vars.focus) {
        vars.data.array[0].selected = true
        vars.focus = vars.data.array[0].value
        if (vars.dev) d3plus.console.log("\"value\" set to \""+vars.focus+"\"")
      }

      if (vars.data.array.length > 10 && !("search" in vars)) {
        vars.search = true
        if (vars.dev) d3plus.console.log("search enabled")
      }

      if (vars.element) {

        vars.element
          .style("position","absolute")
          .style("overflow","hidden")
          .style("clip","rect(0 0 0 0)")
          .style("width","1px")
          .style("height","1px")
          .style("margin","-1px")
          .style("padding","0")
          .style("border","0")

        if (vars.data.changed && vars.type == "drop") {

          options = vars.element.selectAll("option")
            .data(vars.data.array,function(d){
              return d ? d.value : false
            })

          options.enter().append("option")
            .each(function(d){

              for (k in d) {
                if (["alt","value","text","selected"].indexOf(k) >= 0) {
                  d3.select(this).attr(k,d[k])
                }
                else {
                  d3.select(this).attr("data-"+k,d[k])
                }
              }

              if (d.value == vars.focus) {
                this.selected = true
              }
              else {
                this.selected = false
              }

            })

          options.exit().remove()

        }

      }

      if (!vars.init) {

        //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        // Select container DIV for UI element
        //----------------------------------------------------------------------
        vars.container = vars.parent.selectAll("div#d3plus_"+vars.type+"_"+vars.id)
          .data(["container"])

        //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        // Create container DIV for UI element
        //----------------------------------------------------------------------
        vars.container.enter()
          .insert("div",vars.before)
          .attr("id","d3plus_"+vars.type+"_"+vars.id)
          .style("display",styles.display)
          .style("position","relative")
          .style("overflow","visible")
          .style("vertical-align","top")

        vars.tester = d3plus.font.tester()

      }

      if (timing) {

        vars.container.transition().duration(timing)
          .each("start",function(){
            if (vars.type == "drop" && vars.enabled) {
              d3.select(this).style("z-index",9999)
            }
          })
          .style("margin",styles.margin+"px")
          .each("end",function(){
            if (vars.type == "drop" && !vars.enabled) {
              d3.select(this).style("z-index","auto")
            }
          })

      }
      else {

        vars.container
          .style("margin",styles.margin+"px")
          .style("z-index",function(){
            if (vars.type == "drop" && vars.enabled) {
              return 9999
            }
            else {
              return "auto"
            }
          })

      }

      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Call specific UI element type
      //------------------------------------------------------------------------
      if (vars.dev) d3plus.console.group("drawing \""+vars.type+"\"")
      d3plus.forms[vars.type](vars,styles,timing)
      if (vars.dev) d3plus.console.groupEnd()

      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Initialization complete
      //------------------------------------------------------------------------
      vars.init = true
      vars.update = true
      vars.data.changed = false

    }

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // List of simple set/retrieve methods
  //----------------------------------------------------------------------------
  var variables = [
    "callback",
    "data",
    "dev",
    "element",
    "highlight",
    "hover",
    "hover_previous",
    "id",
    "large",
    "parent",
    "previous",
    "propagation",
    "search",
    "selected",
    "timing",
    "text",
    "type",
    "update"
  ]

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Create simple set/retrieve methods
  //----------------------------------------------------------------------------
  variables.forEach(function(v){

    vars.forms[v] = (function(key) {

      return function(value) {

        if (vars.dev) {

          var text = value === undefined ? "" : value.toString()
          if (text.length > 50 || value === undefined) {
            var text = ""
          }
          else {
            var text = " to \""+text+"\""
          }

        }

        if (key == "hover") {
          vars.hover_previous = vars.hover
        }

        if (!arguments.length) return vars[key]

        if (["element","parent"].indexOf(key) >= 0) {
          if (typeof value == "string" && !d3.select(value).empty()) {
            if (vars.dev) d3plus.console.log("\""+key+"\" set"+text)
            vars[key] = d3.selectAll(value)
          }
          else if (d3plus.util.d3selection(value)) {
            if (vars.dev) d3plus.console.log("\""+key+"\" set"+text)
            vars[key] = value
          }
          else {
            d3plus.console.warning("Cannot set \""+key+"\" as \""+value.toString()+"\"")
          }

          if (vars[key] && key == "element") {
            if (vars[key].node().id) {
              vars.before = "#"+vars[key].node().id
            }
            vars.parent = d3.select(vars[key].node().parentNode)
          }

        }
        else {
          if (vars.dev) d3plus.console.log("\""+key+"\" set"+text)
          vars[key] = value
        }

        return vars.forms

      }

    })(v)

  })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // List of simple style methods
  //----------------------------------------------------------------------------
  var style_variables = [
    "align",
    "icon",
    "border",
    "color",
    "corners",
    "display",
    "font",
    "margin",
    "padding",
    "shadows"
  ]

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Create simple style methods
  //----------------------------------------------------------------------------
  style_variables.forEach(function(v){

    vars.forms[v] = (function(key) {

      return function(value) {

        if (!arguments.length) {
          if (key == "font") return styles
          return styles[key]
        }

        if (vars.dev) {

          var text = value.toString()
          if (text.length > 50) {
            var text = ""
          }
          else {
            var text = " to \""+text+"\""
          }

        }

        if (key == "font") {

          function set_font(obj,thing) {

            if (typeof thing == "string") {
              if (vars.dev) d3plus.console.log("\"font-family\" set"+text)
              obj["font-family"] = thing
            }
            if (typeof thing == "number") {
              if (vars.dev) d3plus.console.log("\"font-size\" set"+text)
              obj["font-size"] = thing
            }
            else if (typeof thing == "object") {
              for (style in thing) {

                if (style == "drop") {
                  set_font(obj.drop,thing[style])
                }
                else {

                  if (style == "align" && d3plus.rtl) {
                    if (thing[style] == "left") {
                      thing[style] = "right"
                    }
                    else if (thing[style] == "right") {
                      thing[style] = "left"
                    }
                  }
                  if (vars.dev) {

                    var text = thing[style].toString()
                    if (text.length > 50) {
                      var text = ""
                    }
                    else {
                      var text = " to \""+text+"\""
                    }

                    d3plus.console.log("\"font-"+style+"\" set"+text)
                  }
                  obj["font-"+style] = thing[style]

                }
              }
            }

          }

          set_font(styles,value)

        }
        else {
          if (key == "color" && styles.secondary == d3plus.color.darker(styles.color,0.05)) {
            styles.secondary = d3plus.color.darker(value,0.05)
          }
          if (vars.dev) d3plus.console.log("\""+key+"\" set"+text)
          styles[key] = value
        }

        return vars.forms

      }

    })(v)

  })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Disables the UI element
  //----------------------------------------------------------------------------
  vars.forms.disable = function() {
    if (vars.dev) d3plus.console.log("disable")
    vars.enabled = false
    if (vars.init) {
      vars.parent.call(vars.forms)
    }
    return vars.forms
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Enables the UI element
  //----------------------------------------------------------------------------
  vars.forms.enable = function() {
    if (vars.dev) d3plus.console.log("enable")
    vars.enabled = true

    if (vars.data.fetch && (!vars.data.loaded || vars.data.continuous)) {
      d3plus.forms.json(vars)
    }

    if (vars.init) {
      vars.parent.call(vars.forms)
    }
    return vars.forms
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Draws the UI element
  //----------------------------------------------------------------------------
  vars.forms.draw = function(timing) {
    vars.parent.call(vars.forms,timing)
    return vars.forms
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Returns UI element's current height
  //----------------------------------------------------------------------------
  vars.forms.height = function(value) {

    if (!arguments.length) return vars.container[0][0].offsetHeight

    if (vars.dev) d3plus.console.log("\"height\" set to \""+value+"\"")
    styles.height = value

    return vars.forms
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Destroys UI element
  //----------------------------------------------------------------------------
  vars.forms.remove = function(x) {
    vars.container.remove()
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Selects something inside of the container
  //----------------------------------------------------------------------------
  vars.forms.select = function(selection) {
    return vars.container.select(selection)
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Sets value of the UI element
  //----------------------------------------------------------------------------
  vars.forms.value = function(value) {

    if (!arguments.length) return vars.focus

    if (typeof value == "string") {
      value = vars.data.array.filter(function(d){
        return d.value == value
      })[0]
    }

    if (value.value != vars.focus) {

      if (vars.tag == "select") {

        vars.element.selectAll("option").each(function(d,i){
          if (this.value == value.value) {
            vars.element.node().selectedIndex = i
          }
        })

      }
      else if (vars.tag == "input" && vars.element.attr("type") == "radio") {
        vars.element
          .each(function(){
            if (this.value == value.value) {
              this.checked = true
            }
            else {
              this.checked = false
            }
          })
      }

      if (vars.callback) {
        vars.callback(value.value)
      }

      if (vars.dev) d3plus.console.log("\"value\" set to \""+value.value+"\"")

      vars.previous = vars.focus
      vars.focus = value.value

    }

    vars.enabled = false
    vars.highlight = false

    if (vars.init) {
      vars.parent.call(vars.forms)
    }

    return vars.forms
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Toggles the UI element menu open/close
  //----------------------------------------------------------------------------
  vars.forms.toggle = function() {

    if (vars.dev) d3plus.console.log("toggle")
    vars.update = false

    if (vars.enabled) {
      vars.forms.disable()
    }
    else {
      vars.forms.enable()
    }

    return vars.forms

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Returns UI element's current width
  //----------------------------------------------------------------------------
  vars.forms.width = function(value) {
    if (!arguments.length) {
      var vals = []
      vars.container.selectAll("div.d3plus_node").each(function(o){
        vals.push(this.offsetWidth)
      })
      if (vals.length > 1) {
        return vals.sort()
      }
      else if (vals.length == 1) {
        return vals[0]
      }
      else {
        return vars.container.node().offsetWidth
      }
    }
    if (vars.dev) d3plus.console.log("\"width\" set to \""+value+"\"")
    styles.width = value
    return vars.forms
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Finally, return the main UI function to the user
  //----------------------------------------------------------------------------
  return vars.forms

}

d3plus.viz = function() {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Public Variables with Default Settings
  //-------------------------------------------------------------------

  var vars = {
    "back": function() {

      if (vars.history.states.length > 0) {

        var func = vars.history.states.pop()
        if (typeof func === "function") {
          func()
        }

      }

    },
    "connected": function(edge) {
      var focus = vars.focus.value
      if (focus) {
        var source = edge[vars.edges.source][vars.id.key],
            target = edge[vars.edges.target][vars.id.key]
        if (source == focus || target == focus) {
          return true
        }
      }
      return false
    },
    "connections": function(focus,objects) {

      if (!vars.edges.value) {
        return []
      }

      var edges = vars.edges.restricted || vars.edges.value,
          targets = []

      if (!focus) {
        return edges
      }

      var connections = edges.filter(function(edge){

        var match = false

        if (edge[vars.edges.source][vars.id.key] == focus) {
          match = true
          if (objects) {
            targets.push(edge[vars.edges.target])
          }
        }
        else if (edge[vars.edges.target][vars.id.key] == focus) {
          match = true
          if (objects) {
            targets.push(edge[vars.edges.source])
          }
        }

        return match

      })

      return objects ? targets : connections

    },
    "filtered": false,
    "fonts": {},
    "format": function(value,key) {

      if (typeof value === "number") {
        return vars.number_format.value(value,key,vars)
      }
      if (typeof value === "string") {
        return vars.text_format.value(value,key,vars)
      }
      else {
        return JSON.stringify(value)
      }

    },
    "frozen": false,
    "g": {"apps":{}},
    "init": false,
    "margin": {"top": 0, "right": 0, "bottom": 0, "left": 0},
    "mute": [],
    "solo": [],
    "style": d3plus.styles.default,
    "timing": d3plus.styles.default.timing.transitions,
    "touchEvent": function(){
      var zoomed = vars.zoom.scale > vars.zoom_behavior.scaleExtent()[0]
        , enabled = d3plus.apps[vars.type.value].zoom
                  && vars.zoom.value && vars.zoom.scroll.value
        , zoomable = d3.event.touches.length > 1 && enabled
      if (!zoomable && !zoomed) {
        d3.event.stopPropagation()
      }
    },
    "update": true,
    "zoom_behavior": d3.behavior.zoom().scaleExtent([1,1]),
    "zoom_direction": function() {

      var max_depth = vars.id.nesting.length-1,
          current_depth = vars.depth.value,
          restricted = d3plus.apps[vars.type.value].nesting === false

      if (restricted) {
        return 0
      }
      else if (current_depth < max_depth) {
        return 1
      }
      else if (current_depth == max_depth && (vars.small || !vars.html.value)) {
        return -1
      }

      return 0

    }
  }

  function validate_fonts(obj) {
    for (key in obj) {
      if (obj[key] !== null && typeof obj[key] == "object" && !(obj[key] instanceof Array)) {

        if ("family" in obj[key]) {
          if (obj[key].family in vars.fonts) {
            obj[key].family = vars.fonts[obj[key].family]
          }
          else {
            var old = obj[key].family
            obj[key].family = d3plus.font.validate(obj[key].family)
            vars.fonts[old] = obj[key].family
          }
        }

        validate_fonts(obj[key])

      }
    }
  }
  validate_fonts(vars.style)

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Main drawing function
  //----------------------------------------------------------------------------
  vars.viz = function(selection) {
    selection.each(function() {

      vars.frozen = true
      vars.internal_error = null
      d3plus.draw.container(vars)

      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Determine if in "small" mode
      //------------------------------------------------------------------------
      var small_width = vars.width.value <= vars.width.small,
          small_height = vars.height.value <= vars.height.small
      vars.small = small_width || small_height

      if (vars.error.value) {
        vars.messages.style = "large"
        var message = vars.error.value === true ? "Error" : vars.error.value
        if (vars.dev.value) d3plus.console.warning(message)
        d3plus.ui.message(vars,message)
      }
      else {

        var steps = d3plus.draw.steps(vars)

        vars.parent.style("cursor","wait")
        vars.messages.style = vars.data.app ? "small" : "large"
        function check_next() {

          if (steps.length) {
            run_steps()
          }
          else {
            if (vars.dev.value) d3plus.console.groupEnd()
            vars.parent.style("cursor","auto")
          }

        }

        function run_steps() {

          var step = steps.shift(),
              same = vars.g.message && vars.g.message.text() == step.message,
              run = "check" in step ? step.check(vars) : true

          if (run) {
            
            if (!same && vars.update && (!vars.timing || !vars.init)) {

              if (vars.dev.value) {
                d3plus.console.groupEnd()
                d3plus.console.group(step.message)
              }
              var message = typeof vars.messages.value == "string"
                          ? vars.messages.value : step.message

              d3plus.ui.message(vars,message)

              setTimeout(function(){

                if (step.function instanceof Array) {
                  step.function.forEach(function(f){
                    f(vars,check_next)
                  })
                }
                else if (typeof step.function == "function") {
                  step.function(vars,check_next)
                }

                if (!step.wait) {
                  check_next()
                }

              },10)

            }
            else {

              if (step.function instanceof Array) {
                step.function.forEach(function(f){
                  f(vars,check_next)
                })
              }
              else if (typeof step.function == "function") {
                step.function(vars,check_next)
              }

              if (!step.wait) {
                check_next()
              }

            }

          }
          else {

            if ("otherwise" in step) {
              step.otherwise(vars)
            }

            check_next()
          }

        }
        run_steps()

      }

    });

    return vars.viz;
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Expose Public Variables
  //-------------------------------------------------------------------

  vars.viz.csv = function(x) {

    if (x instanceof Array) var columns = x

    var csv_to_return = [],
        titles = [],
        title = vars.title.value || "My D3plus App Data"

    title = d3plus.util.strip(title)

    if (!columns) {
      var columns = [vars.id.key]
      if (vars.time.key) columns.push(vars.time.key)
      if (vars.size.key) columns.push(vars.size.key)
      if (vars.text.key) columns.push(vars.text.key)
    }

    columns.forEach(function(c){
      titles.push(vars.format(c))
    })

    csv_to_return.push(titles);

    vars.returned.nodes.forEach(function(n){
      var arr = []
      columns.forEach(function(c){
        arr.push(d3plus.variable.value(vars,n,c))
      })
      csv_to_return.push(arr)
    })

    var csv_data = "data:text/csv;charset=utf-8,"
    csv_to_return.forEach(function(c,i){
      dataString = c.join(",");
      csv_data += i < csv_to_return.length ? dataString + "\n" : dataString;
    })

    if (d3plus.ie) {
      var blob = new Blob([csv_data],{
        type: "text/csv;charset=utf-8;",
      })
      navigator.msSaveBlob(blob,title+".csv")
    }
    else {
      var encodedUri = encodeURI(csv_data);
      var link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download",title+".csv");
      link.click();
    }

    return csv_to_return;

  };

  vars.viz.draw = function(x) {

    if (!vars.container.value) {
      d3plus.console.warning("Please define a container div using .container()")
    }
    else if (d3.select(vars.container.value).empty()) {
      d3plus.console.warning("Cannot find <div> on page matching: \""+vars.container+"\"")
    }
    else {
      d3.select(vars.container.value).call(vars.viz)
    }

    return vars.viz;
  }

  vars.viz.style = function(x) {
    if (!arguments.length) return vars.style;

    function check_depth(object,property,depth) {
      if (typeof depth == "object" && !(depth instanceof Array)) {
        for (d in depth) {
          if (object[property] === undefined) {
            d3plus.console.warning("\""+property+"\" cannot be set");
          }
          else {
            check_depth(object[property],d,depth[d]);
          }
        }
      }
      else {
        if (object[property] === undefined) {
          d3plus.console.warning("\""+property+"\" cannot be set");
        }
        else {
          if (property == "family") {
            if (depth in vars.fonts) {
              depth = vars.fonts[depth]
            }
            else {
              depth = d3plus.font.validate(depth)
            }
          }
          object[property] = depth;
        }
      }
    }

    if (typeof x == "object") {
      if ("font" in x) {
        var obj = d3plus.util.copy(x.font)
        obj = {"font": obj}
        function check_font(o,s) {
          for (s in o) {

            if (o[s] !== null && typeof o[s] == "object") {
              if ("font" in o[s]) {
                check_depth(o,s,obj)
              }
              check_font(o[s])
            }

          }
        }
        check_font(vars.style)
      }
      check_depth(vars,"style",x)
    }
    else if (typeof x == "string") {
      if (d3plus.styles[x]) {
        vars.style = plus.styles[x]
      }
      else {
        d3plus.console.warning("Style \""+x+"\" does not exist. Installed styles are: \""+Object.keys(d3plus.styles).join("\", \"")+"\"");
      }
    }
    else {
      d3plus.console.warning(".style() only accepts strings or keyed objects.");
    }

    return vars.viz;
  };

  Object.keys(d3plus.public).forEach(function(p){

    // give default values to this .viz()
    vars[p] = d3plus.util.copy(d3plus.public[p])

    // detect available app types
    if (p == "type") {
      vars[p].accepted = Object.keys(d3plus.apps)
    }

    // create error messages for deprecated methods
    if (vars[p]) {
      function deprecate(obj) {
        for (o in obj) {
          if (o == "deprecates") {
            obj[o].forEach(function(d){
              vars.viz[d] = (function(dep,n) {
                return function(x) {
                  d3plus.console.warning("\."+dep+"() method has been deprecated, please use the new \."+n+"() method.")
                  return vars.viz;
                }
              })(d,p)
            })
          }
          else if (typeof obj[o] == "object") {
            deprecate(obj[o])
          }
        }
      }
      deprecate(vars[p])
    }

    // create method for variable

    vars.viz[p] = (function(key) {
      return function(user,callback) {

        if (!arguments.length) return vars[key];

        if (vars[key].reset) {
          vars[key].reset.forEach(function(r){
            vars[r] = null
          })
        }

        if (callback) {
          vars[key].callback = callback
        }

        // determine default key type, if available
        if (vars[key].key !== undefined) var key_type = "key"
        else if (vars[key].value !== undefined) var key_type = "value"
        else var key_type = null

        if ( ( typeof user == "object" && user !== null && key_type
                && !user[key_type] && !(Object.keys(user)[0] in vars[key]) )
             || typeof user != "object" || user === null) {
          set_value(vars[key],key_type,user)
        }
        else if (typeof user == "object") {
          check_object(vars,key,user)
        }
        else {
          d3plus.console.warning("Incompatible format for ."+key+"() method.")
        }

        function check_object(object,property,depth) {

          if (object[property] === undefined) {
            d3plus.console.warning("\""+property+"\" cannot be set.");
          }
          else {
            if (typeof depth == "object" && !(depth instanceof Array)) {

              if (typeof object[property] == "object" && object[property] !== null) {
                if (object[property].key !== undefined) var key_type = "key"
                else if (object[property].value !== undefined) var key_type = "value"
                else var key_type = null
              }
              else var key_type = null

              if (property == key_type) {
                set_value(object,key_type,depth)
              }
              else if (["key","value"].indexOf(property) >= 0) {
                set_value(object,property,depth)
              }
              else if (typeof object[property] == "object" && object[property] !== null && object[property].object === true) {
                set_value(object[property],key_type,depth)
              }
              else {

                for (d in depth) {
                  check_object(object[property],d,depth[d]);
                }

              }
            }
            else {
              set_value(object,property,depth);
            }
          }
        }

        function update_array(arr,x) {
          // if the user has passed an array, use that
          if(x instanceof Array){
            arr = x;
          }
          // otherwise add/remove it from the array
          else if(arr.indexOf(x) >= 0){
            arr.splice(arr.indexOf(x), 1)
          }
          // element not in current filter so add it
          else {
            arr.push(x)
          }

          return arr

        }

        function set_value(a,b,c) {

          if (key == "type") {
            if (!a.accepted) {
              a.accepted = Object.keys(d3plus.apps)
            }

            if (a.accepted.indexOf(c) < 0) {
              for (app in d3plus.apps) {
                if (d3plus.apps[app].deprecates && d3plus.apps[app].deprecates.indexOf(c) >= 0) {
                  d3plus.console.warning(JSON.stringify(c)+" has been deprecated by "+JSON.stringify(app)+", please update your code.")
                  c = app
                }
              }
            }

          }

          if (b == "value" || b == "key" || !b) {
            var text = "\."+key+"()"
          }
          else {
            var text = "\""+b+"\" of \."+key+"()"
          }

          if ((b == "value" || b == "key") && a.accepted) {
            var accepted = a.accepted
          }
          else if (typeof a[b] == "object" && a[b] !== null && a[b].accepted) {
            var accepted = a[b].accepted
          }
          else {
            var accepted = false
          }

          var allowed = true
          if (accepted) {
            if (typeof accepted[0] == "string") {
              var allowed = accepted.indexOf(c) >= 0,
                  recs = accepted
            }
            else {
              var allowed = accepted.indexOf(c.constructor) >= 0
                , recs = []
              accepted.forEach(function(f){
                var n = f.toString().split("()")[0].substring(9)
                recs.push(n)
              })
            }
          }

          if (accepted && !allowed) {
            d3plus.console.warning(""+JSON.stringify(c)+" is not an accepted value for "+text+", please use one of the following: \""+recs.join("\", \"")+"\"")
          }
          else if (!(a[b] instanceof Array) && a[b] == c || (a[b] && (a[b].key === c || a[b].value === c))) {
            if (vars.dev.value) d3plus.console.log(text+" was not updated because it did not change.")
          }
          else {
            if (b == "solo" || b == "mute") {

              a[b].value = update_array(a[b].value,c)
              a[b].changed = true
              var arr = a[b].value

              if (["time","coords"].indexOf(key) < 0) {
                if (arr.length && vars[b].indexOf(key) < 0) {
                  vars[b].push(key)
                }
                else if (!arr.length && vars[b].indexOf(key) >= 0) {
                  vars[b].splice(vars[b].indexOf(key), 1)
                }
              }

            }
            else if (key == "id" && b == "key") {

              if (c instanceof Array) {
                vars.id.nesting = c
                if (vars.depth.value < c.length) vars.id.key = c[vars.depth.value]
                else {
                  vars.id.key = c[0]
                  vars.depth.value = 0
                }
              }
              else {
                vars.id.key = c
                vars.id.nesting = [c]
                vars.depth.value = 0
              }
              a.changed = true

            }
            else if (key == "text" && b == "key") {

              if (!vars.text.array) vars.text.array = {}
              if (typeof c == "string") {
                vars.text.array[vars.id.key] = [c]
              }
              else if (c instanceof Array) {
                vars.text.array[vars.id.key] = c
              }
              else {
                vars.text.array = c
                var n = c[vars.id.key] ? c[vars.id.key] : c[Object.keys(c)[0]]
                vars.text.array[vars.id.key] = typeof n == "string" ? [n] : n
              }
              vars.text.key = vars.text.array[vars.id.key][0]
              a.changed = true

            }
            else if (key == "depth") {
              // Set appropriate depth and id
              if (c >= vars.id.nesting.length) vars.depth.value = vars.id.nesting.length-1
              else if (c < 0) vars.depth.value = 0
              else vars.depth.value = c;
              vars.id.key = vars.id.nesting[vars.depth.value]

              if (vars.text.array) {

                // Set appropriate name_array and text
                var n = vars.text.array[vars.id.key]
                if (n) {
                  vars.text.array[vars.id.key] = typeof n == "string" ? [n] : n
                  vars.text.key = vars.text.array[vars.id.key][0]
                }

              }

              a.changed = true
            }
            else if (key == "aggs") {
              for (agg in c) {
                if (a[b][agg] && a[b][agg] == c[agg]) {
                  if (vars.dev.value) d3plus.console.log("Aggregation for \""+agg+"\" is already set to \""+c[agg]+"\"")
                }
                else {
                  a[b][agg] = c[agg]
                  a.changed = true
                }
              }
            }
            else {
              if (typeof a[b] == "object" && a[b] != null && (a[b].key !== undefined || a[b].value !== undefined)) {
                var k = a[b].key !== undefined ? "key" : "value";
                a = a[b]
                b = k
              }
              a.previous = a[b]
              a[b] = c
              a.changed = true
            }

            if ((vars.dev.value || key == "dev") && (a.changed || ["solo","mute"].indexOf(b) >= 0)) {
              if (typeof a[b] != "function" && JSON.stringify(a[b]).length < 260) {
                d3plus.console.log(text+" has been set to "+JSON.stringify(a[b])+".")
              }
              else {
                d3plus.console.log(text+" has been set.")
              }
            }
          }

        }

        return vars.viz

      }
    })(p)
  })

  return vars.viz;
};

d3plus.public = {}

d3plus.public.active = {
  "key": null,
  "mute": {
    "value": []
  },
  "solo": {
    "value": []
  },
  "spotlight": {
    "accepted": [Boolean],
    "value": false,
    "deprecates": ["spotlight"]
  }
}

d3plus.public.aggs = {
  "deprecated": ["nesting_aggs"],
  "value": {}
}

d3plus.public.axes = {
  "mirror": {
    "accepted": [Boolean],
    "deprecates": ["mirror_axis","mirror_axes"],
    "value": false
  },
  "values": ["x","y"]
}

d3plus.public.attrs = {
  "value": {}
}

d3plus.public.color = {
  "deprecates": ["color_var"],
  "key": null,
  "mute": {
    "value": []
  },
  "solo": {
    "value": []
  }
}

d3plus.public.container = {
  "value": null
}

d3plus.public.coords = {
  "center": [0,0],
  "fit": {
    "accepted": ["auto","height","width"],
    "value": "auto"
  },
  "mute": {
    "value": []
  },
  "padding": 20,
  "projection": {
    "accepted": ["mercator","equirectangular"],
    "value": "mercator"
  },
  "solo": {
    "value": []
  },
  "threshold": 0.1,
  "value": null
}

d3plus.public.data = {
  "large": 400,
  "value": []
}

d3plus.public.depth = {
  "value": 0
}

d3plus.public.descs = {
  "value": {}
}

d3plus.public.dev = {
  "accepted": [Boolean],
  "value": false
}

d3plus.public.edges = {
  "arrows": {
    "accepted": [Boolean],
    "direction": {
      "accepted": ["source","target"],
      "value": "target"
    },
    "value": false
  },
  "deprecates": ["edges"],
  "label": false,
  "large": 100,
  "limit": false,
  "size": false,
  "source": "source",
  "target": "target",
  "value": null
}

d3plus.public.error = {
  "value": false
}

d3plus.public.focus = {
  "deprecates": ["highlight"],
  "tooltip": {
    "accepted": [Boolean],
    "value": true
  },
  "value": null
}

d3plus.public.footer = {
  "link": null,
  "value": false
}

d3plus.public.height = {
  "small": 300,
  "value": null
}

d3plus.public.history = {
  "accepted": [Boolean],
  "states": [],
  "value": true
}

d3plus.public.html = {
  "deprecates": ["click_function"],
  "value": null
}

d3plus.public.icon = {
  "deprecates": ["icon_var"],
  "key": "icon",
  "style": {
    "deprecates": ["icon_style"],
    "object": true,
    "value": "default"
  }
}

d3plus.public.id = {
  "data_filter": true,
  "deprecates": ["id_var","nesting"],
  "key": "id",
  "mute": {
    "value": [],
    "deprecates": ["filter"]
  },
  "nesting": ["id"],
  "solo": {
    "value": [],
    "deprecates": ["solo"]
  }
}

d3plus.public.labels = {
  "accepted": [Boolean],
  "resize": {
    "accepted": [Boolean],
    "value": true
  },
  "value": true
}

d3plus.public.legend = {
  "accepted": [Boolean],
  "label": null,
  "order": {
    "accepted": ["color","id","size","text"],
    "sort": {
      "accepted": ["asc","desc"],
      "value": "asc"
    },
    "value": "color"
  },
  "value": true
}

d3plus.public.messages = {
  "accepted": [Boolean,String],
  "value": true
}

d3plus.public.nodes = {
  "value": null
}

d3plus.public.number_format = {
  "value": function(number,key,vars) {

    var time = vars && vars.time.key ? [vars.time.key] : ["year","date"]

    if (key && time.indexOf(key.toLowerCase()) >= 0) {
      return number
    }
    else if (number < 10 && number > -10) {
      return d3.round(number,2)
    }
    else if (number.toString().split(".")[0].length > 4) {
      var symbol = d3.formatPrefix(number).symbol
      symbol = symbol.replace("G", "B") // d3 uses G for giga

      // Format number to precision level using proper scale
      number = d3.formatPrefix(number).scale(number)
      number = parseFloat(d3.format(".3g")(number))
      return number + symbol;
    }
    else if (key == "share") {
      return d3.format(".2f")(number)
    }
    else {
      return d3.format(",f")(number)
    }

  }
}

d3plus.public.order = {
  "key": null,
  "sort": {
    "accepted": ["asc","desc"],
    "value": "asc",
    "deprecates": ["sort"]
  }
}

d3plus.public.shape = {
  "accepted": ["circle","donut","line","square","area","coordinates"],
  "interpolate": {
    "accepted": ["linear","step","step-before","step-after","basis","basis-open","cardinal","cardinal-open","monotone"],
    "value": "linear",
    "deprecates": ["stack_type"]
  },
  "value": null
}

d3plus.public.size = {
  "data_filter": true,
  "deprecates": ["value"],
  "key": null,
  "mute": {
    "value": []
  },
  "scale": {
    "accepted": ["sqrt","linear","log"],
    "deprecates": ["size_scale"],
    "value": "sqrt"
  },
  "solo": {
    "value": []
  },
  "threshold": true
}

d3plus.public.temp = {
  "deprecates": ["else_var","else"],
  "key": null,
  "mute": {
    "value": []
  },
  "solo": {
    "value": []
  }
}

d3plus.public.text = {
  "deprecates": ["name_array","text_var"],
  "key": null,
  "mute": {
    "value": []
  },
  "solo": {
    "value": []
  }
}

d3plus.public.text_format = {
  "value": function(text,key,vars) {
    if (!text) return "";
    var smalls = ["a","and","of","to"]
    return text.replace(/\w\S*/g, function(txt,i){
      if (smalls.indexOf(txt) >= 0 && i != 0) return txt
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
}

d3plus.public.time = {
  "data_filter": true,
  "deprecates": ["year","year_var"],
  "fixed": {
    "accepted": [Boolean],
    "value": true,
    "deprecates": ["static_axis","static_axes"]
  },
  "key": null,
  "mute": {
    "value": []
  },
  "solo": {
    "value": []
  }
}

d3plus.public.timeline = {
  "accepted": [Boolean],
  "handles": {
    "accepted": [Boolean],
    "value": true
  },
  "label": null,
  "value": true
}

d3plus.public.title = {
  "link": null,
  "sub": {
    "link": null,
    "value": null,
    "deprecates": ["sub_title"]
  },
  "total": {
    "link": null,
    "value": false,
    "deprecates": ["total_bar"],
    "object": true
  },
  "value": null
}

d3plus.public.tooltip = {
  "deprecates": ["tooltip_info"],
  "object": true,
  "value": []
}

d3plus.public.total = {
  "deprecates": ["total_var"],
  "key": null,
  "mute": {
    "value": []
  },
  "solo": {
    "value": []
  }
}

d3plus.public.type = {
  "mode": {
    "accepted": ["squarify","slice","dice","slice-dice"],
    "value": "squarify"
  },
  "value": "tree_map"
}

d3plus.public.width = {
  "small": 400,
  "value": null
}

d3plus.public.x = {
  "data_filter": true,
  "deprecates": ["xaxis","xaxis_val","xaxis_var"],
  "domain": null,
  "key": null,
  "lines": [],
  "mute": {
    "value": []
  },
  "reset": ["x_range"],
  "scale": {
    "accepted": ["linear","log","continuous","share"],
    "value": "linear",
    "deprecates": ["layout","unique_axis","xaxis_scale"]
  },
  "solo": {
    "value": []
  },
  "stacked": {
    "accepted": [Boolean],
    "value": false
  },
  "zerofill": {
    "accepted": [Boolean],
    "value": false
  }
}

d3plus.public.y = {
  "data_filter": true,
  "deprecates": ["yaxis","yaxis_val","yaxis_var"],
  "domain": null,
  "key": null,
  "lines": [],
  "mute": {
    "value": []
  },
  "reset": ["y_range"],
  "scale": {
    "accepted": ["linear","log","continuous","share"],
    "value": "linear",
    "deprecates": ["layout","unique_axis","yaxis_scale"]
  },
  "solo": {
    "value": []
  },
  "stacked": {
    "accepted": [Boolean],
    "value": false
  },
  "zerofill": {
    "accepted": [Boolean],
    "value": false
  }
}

d3plus.public.zoom = {
  "accepted": [Boolean],
  "click": {
    "accepted": [Boolean],
    "value": true
  },
  "pan": {
    "accepted": [Boolean],
    "value": true
  },
  "scroll": {
    "accepted": [Boolean],
    "value": true,
    "deprecates": ["scroll_zoom"]
  },
  "value": true
}


})();

d3plus.apps.bubbles = {}
d3plus.apps.bubbles.fill = true;
d3plus.apps.bubbles.requirements = ["data"];
d3plus.apps.bubbles.tooltip = "static"
d3plus.apps.bubbles.shapes = ["circle","donut"];
d3plus.apps.bubbles.scale = 1.05

d3plus.apps.bubbles.draw = function(vars) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Test for labels
  //-------------------------------------------------------------------
  var label_height = vars.labels.value && !vars.small ? 50 : 0

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Sort Data
  //-------------------------------------------------------------------
  var order = vars.order.key || vars.size.key
  vars.data.app.sort(function(a,b){
    var a_value = d3plus.variable.value(vars,a,order)
    var b_value = d3plus.variable.value(vars,b,order)
    return vars.order.sort.value == "asc" ? a_value-b_value : b_value-a_value
  })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Calculate rows and columns
  //-------------------------------------------------------------------
  if(vars.data.app.length == 1) {
    var columns = 1,
        rows = 1;
  }
  else if (vars.data.app.length < 4) {
    var columns = vars.data.app.length,
        rows = 1;
  }
  else {
    var rows = Math.ceil(Math.sqrt(vars.data.app.length/(vars.app_width/vars.app_height))),
        columns = Math.ceil(Math.sqrt(vars.data.app.length*(vars.app_width/vars.app_height)));
  }

  if (vars.data.app.length > 0) {
    while ((rows-1)*columns >= vars.data.app.length) rows--
  }

  var column_width = vars.app_width/columns,
      column_height = vars.app_height/rows

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Define size scale
  //-------------------------------------------------------------------
  if (!vars.data.app) vars.data.app = []

  var domain_min = d3.min(vars.data.app, function(d){
    if (!vars.size.key) return 0
    return d3plus.variable.value(vars,d,vars.size.key,null,"min")
  })

  var domain_max = d3.max(vars.data.app, function(d){
    if (!vars.size.key) return 0
    return d3plus.variable.value(vars,d,vars.size.key)
  })

  var padding = 5

  var size_min = 20
  var size_max = (d3.min([column_width,column_height])/2)-(padding*2)
  size_max -= label_height

  var size = d3.scale[vars.size.scale.value]()
    .domain([domain_min,domain_max])
    .rangeRound([size_min,size_max])

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Calculate bubble packing
  //-------------------------------------------------------------------
  var pack = d3.layout.pack()
    .size([column_width-padding*2,column_height-padding*2-label_height])
    .value(function(d) {
      if (!vars.size.key) return 0
      return d3plus.variable.value(vars,d,vars.size.key)
    })
    .padding(padding)
    .radius(function(d){
      return size(d)
    })

  var data = []

  var row = 0
  vars.data.app.forEach(function(d,i){

    var temp = pack.nodes(d)

    var xoffset = (column_width*i) % vars.app_width,
        yoffset = column_height*row

    temp.forEach(function(t){
      if (!t.d3plus) t.d3plus = {}
      if (!t.d3plus.depth) t.d3plus.depth = t.depth
      t.xoffset = xoffset
      t.yoffset = yoffset+label_height
      if (t.depth < vars.depth.value) {
        t.d3plus.static = true
      }
      else {
        t.d3plus.static = false
      }
      if (temp.length == 1) {
        t.d3plus.label = false
      }
      else {
        t.d3plus.label = true
      }
    })

    data = data.concat(temp)

    if ((i+1) % columns == 0) {
      row++
    }

  })

  var downscale = size_max/d3.max(data,function(d){ return d.r })

  data.forEach(function(d){
    d.x = ((d.x-column_width/2)*downscale)+column_width/2
    d.d3plus.x = d.x+d.xoffset
    d.y = ((d.y-column_height/2)*downscale)+column_height/2
    d.d3plus.y = d.y+d.yoffset
    d.r = d.r*downscale
    d.d3plus.r = d.r
  })

  data.sort(function(a,b){
    return a.depth-b.depth
  })

  var label_data = data.filter(function(d){
    return d.depth == 0
  })

  var labels = vars.group.selectAll("text.d3plus_bubble_label")
    .data(label_data,function(d){
      if (!d.d3plus.label_height) d.d3plus.label_height = 0
      return d[vars.id.nesting[d.depth]]
    })

  function label_style(l) {
    l
      .attr("x",function(d){
        return d.d3plus.x
      })
      .attr("y",function(d){
        return d.d3plus.y-d.r-d.d3plus.label_height-padding
      })
      .attr("text-anchor","middle")
      .attr("font-weight",vars.style.font.weight)
      .attr("font-family",vars.style.font.family)
      .attr("font-size","12px")
      .style("fill",function(d){
        var color = d3plus.variable.color(vars,d)
        return d3plus.color.legible(color)
      })
      .each(function(d){
        if (d.r > 10 && label_height > 10) {
          var names = d3plus.variable.text(vars,d,d.depth)
          d3plus.util.wordwrap({
            "text": names,
            "parent": this,
            "width": column_width-padding*2,
            "height": label_height
          })
        }
      })
      .attr("y",function(d){
        d.d3plus.label_height = d3.select(this).node().getBBox().height
        return d.d3plus.y-d.r-d.d3plus.label_height-padding
      })
      .selectAll("tspan")
        .attr("x",function(d){
          return d.d3plus.x
        })
  }

  labels.enter().append("text")
    .attr("class","d3plus_bubble_label")
    .call(label_style)
    .attr("opacity",0)

  labels.transition().duration(vars.style.timing.transitions)
    .call(label_style)
    .attr("opacity",1)

  labels.exit()
    .attr("opacity",0)
    .remove()

  return data

};

d3plus.apps.chart = {}
d3plus.apps.chart.fill = true;
d3plus.apps.chart.requirements = ["data","x","y"];
d3plus.apps.chart.tooltip = "static";
d3plus.apps.chart.shapes = ["circle","donut","line","square","area"];
d3plus.apps.chart.scale = {
    "circle": 1.1,
    "donut": 1.1,
    "square": 1.1
  };

d3plus.apps.chart.draw = function(vars) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Calculate size and position of graph
  //-------------------------------------------------------------------
  if (vars.small) {
    var graph = {"margin": {"top": 0, "right": 0, "bottom": 0, "left": 0}}
  }
  else {
    var graph = {"margin": {"top": 10, "right": 10, "bottom": 40, "left": 40}}
  }
  graph.width = vars.app_width-graph.margin.left-graph.margin.right
  graph.height = vars.app_height-graph.margin.top-graph.margin.bottom

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // If there is data, run the needed calculations
  //-------------------------------------------------------------------
  if (vars.data.app.length) {

    if (!vars.tickValues) vars.tickValues = {}

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Determine X and Y axis
    //-------------------------------------------------------------------
    vars.continuous_axis = null
    vars.opp_axis = null
    vars.stacked_axis = null

    vars.axes.values.forEach(function(axis){

      if (vars[axis].stacked.value) {
        vars.stacked_axis = axis
      }
      if (!vars.continuous_axis && vars[axis].scale.value == "continuous") {
        vars.continuous_axis = axis
        vars.opp_axis = axis == "x" ? "y" : "x"
      }

      if (vars.data.changed || vars.depth.changed || !vars[axis+"_range"] || vars.time.fixed.value) {

        if (vars.dev.value) d3plus.console.time("determining "+axis+"-axis")
        if (vars[axis].scale.value == "share") {
          vars[axis+"_range"] = [0,1]
          vars.tickValues[axis] = d3plus.util.buckets([0,1],11)
          vars.stacked_axis = axis
        }
        else if (vars[axis].stacked.value) {
          if (vars.time.fixed.value) {
            var range_data = vars.data.app
          }
          else {
            var range_data = vars.data.restricted.all
          }
          var xaxis_sums = d3.nest()
            .key(function(d){return d[vars.x.key] })
            .rollup(function(leaves){
              return d3.sum(leaves, function(d){
                return parseFloat(d3plus.variable.value(vars,d,vars[axis].key))
              })
            })
            .entries(range_data)

          vars[axis+"_range"] = [0,d3.max(xaxis_sums, function(d){ return d.values; })]
        }
        else if (vars[axis].domain instanceof Array) {
          vars[axis+"_range"] = vars[axis].domain
          vars.tickValues[axis] = d3plus.util.uniques(vars.data.app,vars[axis].key)
          vars.tickValues[axis] = vars.tickValues[axis].filter(function(t){
            return t >= vars[axis+"_range"][0] && t <= vars[axis+"_range"][1]
          })
        }
        else if (vars.time.fixed.value) {
          vars[axis+"_range"] = d3.extent(vars.data.app,function(d){
            return parseFloat(d3plus.variable.value(vars,d,vars[axis].key))
          })
          vars.tickValues[axis] = d3plus.util.uniques(vars.data.app,vars[axis].key)
        }
        else {
          var all_depths = []
          for (id in vars.id.nesting) {
            all_depths = all_depths.concat(vars.data.grouped[vars.id.nesting[id]].all)
          }
          vars[axis+"_range"] = d3.extent(all_depths,function(d){
            return parseFloat(d3plus.variable.value(vars,d,vars[axis].key))
          })
          vars.tickValues[axis] = d3plus.util.uniques(vars.data.restricted.all,vars[axis].key)
        }

        // add padding to axis if there is only 1 value
        if (vars[axis+"_range"][0] == vars[axis+"_range"][1]) {
          vars[axis+"_range"][0] -= 1
          vars[axis+"_range"][1] += 1
        }

        // reverse Y axis
        if (axis == "y") vars.y_range = vars.y_range.reverse()

        if (vars.dev.value) d3plus.console.timeEnd("determining "+axis+"-axis")
      }
      else if (!vars[axis+"_range"]) {
        vars[axis+"_range"] = [-1,1]
      }

    })

    //===================================================================

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Mirror axes, if applicable
    //-------------------------------------------------------------------
    if (vars.axes.mirror.value) {
      var domains = vars.y_range.concat(vars.x_range)
      vars.x_range = d3.extent(domains)
      vars.y_range = d3.extent(domains).reverse()
    }

    //===================================================================

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Filter data to only include values within the axes
    //-------------------------------------------------------------------
    if (vars.dev.value) d3plus.console.time("removing data outside of axes")
    var old_length = vars.data.app.length
    if (vars.y.scale.value == "share") {
      var data = vars.data.app
    }
    else {
      var data = vars.data.app.filter(function(d){
        var val = parseFloat(d3plus.variable.value(vars,d,vars.y.key))
        var y_include = val != null && val <= vars.y_range[0] && val >= vars.y_range[1]
        if (y_include) {
          var val = parseFloat(d3plus.variable.value(vars,d,vars.x.key))
          return val != null && val >= vars.x_range[0] && val <= vars.x_range[1]
        }
        else return false
      })
    }

    if (vars.dev.value) d3plus.console.timeEnd("removing data outside of axes")
    var removed = old_length - data.length
    if (removed && vars.dev.value) console.log("removed "+removed+" nodes")

    //===================================================================

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Determine size of nodes
    //-------------------------------------------------------------------

    if (data) {

      if (vars.dev.value) d3plus.console.time("determining size scale")
      if (vars.size.key) {
        if (vars.time.fixed.value) {
          var size_domain = d3.extent(vars.data.app,function(d){
            var val = d3plus.variable.value(vars,d,vars.size.key)
            return val == 0 ? null : val
          })
        }
        else {
          var all_depths = []
          for (id in vars.id.nesting) {
            all_depths = all_depths.concat(vars.data.grouped[vars.id.nesting[id]].all)
          }
          var size_domain = d3.extent(all_depths,function(d){
            var val = d3plus.variable.value(vars,d,vars.size.key)
            return val == 0 ? null : val
          })
        }
        if (!size_domain[0] || !size_domain[1]) size_domain = [0,0]
      }
      else {
        var size_domain = [0,0]
      }

      var max_size = Math.floor(d3.max([d3.min([graph.width,graph.height])/15,10])),
          min_size = 10

      if (size_domain[0] == size_domain[1]) var min_size = max_size

      var size_range = [min_size,max_size]

      var radius = d3.scale[vars.size.scale.value]()
        .domain(size_domain)
        .rangeRound(size_range)

      if (vars.dev.value) d3plus.console.timeEnd("determining size scale")

    }

    //===================================================================

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Create axis scales and add buffer if necessary
    //-------------------------------------------------------------------

    vars.axes.values.forEach(function(axis){

      // Create Axes
      var range_max = axis == "x" ? graph.width : graph.height

      if (["continuous","share"].indexOf(vars[axis].scale.value) >= 0) {
        var s = "linear"
      }
      else {
        var s = vars[axis].scale.value
      }

      vars[axis+"_scale"] = d3.scale[s]()
        .domain(vars[axis+"_range"])
        .rangeRound([0,range_max])

      // set buffer room (take into account largest size var)
      if (["square","circle","donut"].indexOf(vars.shape.value) >= 0 &&
          ["share"].indexOf(vars[axis].scale.value) < 0) {

        var scale = vars[axis+"_scale"]
          , largest_size = radius.range()[1]*2
          , domainHigh = scale.invert(-largest_size)
          , domainLow= scale.invert(range_max+largest_size)

        vars[axis+"_scale"].domain([domainHigh,domainLow])

      }

      var orient = axis == "x" ? "bottom" : "left"

      vars[axis+"_axis"] = d3.svg.axis()
        .tickSize(vars.style.ticks.size)
        .tickPadding(5)
        .orient(orient)
        .scale(vars[axis+"_scale"])
        .tickFormat(function(d, i) {

          var visible = true
          if (vars[axis].key == vars.time.key && d % 1 != 0) {
            visible = false
          }

          if (((vars[axis].scale.value == "log" && d.toString().charAt(0) == "1")
              || vars[axis].scale.value != "log") && visible) {

            if (vars[axis].scale.value == "share") {
              var text = d*100+"%"
            }
            else {
              var text = vars.format(d,vars[axis].key);
            }

            d3.select(this)
              .style("font-size",vars.style.ticks.font.size)
              .style("fill",vars.style.ticks.font.color)
              .attr("font-family",vars.style.font.family)
              .attr("font-weight",vars.style.font.weight)
              .text(text)

            if (axis == "x") {
              var w = this.getBBox().width,
                  h = this.getBBox().height
              d3.select(this).attr("transform","translate(18,8)rotate(70)");
              var height = Math.ceil((Math.cos(25)*w)+5);
              if (height > graph.yoffset && !vars.small) {
                graph.yoffset = height;
              }
              var width = Math.ceil((Math.cos(25)*h)+5);
              if (width > graph.rightoffset && !vars.small) {
                graph.rightoffset = width;
              }
            }
            else {
              var width = this.getBBox().width;
              if (width > graph.offset && !vars.small) {
                graph.offset = width;
              }
            }

          }
          else {
            var text = null
          }

          return text;

        });

      if (vars[axis].scale.value == "continuous" && vars.tickValues[axis]) {
        var ticks = d3.extent(vars.tickValues[axis])
        vars.tickValues[axis] = d3.range(ticks[0],ticks[1])
        vars.tickValues[axis].push(ticks[1])
        vars[axis+"_axis"].tickValues(vars.tickValues[axis])
      }

    })

  }

  if (!data) {
    var data = []
  }

  // Function for Tick Styling
  function tick_style(t,axis) {
    t
      .attr("stroke",vars.style.ticks.color)
      .attr("stroke-width",vars.style.ticks.width)
      .attr("shape-rendering",vars.style.rendering)
      .style("opacity",function(d){
        var lighter = vars[axis].scale.value == "log" && d.toString().charAt(0) != "1"
        return lighter ? 0.25 : 1
      })
  }

  // Function for Tick Styling
  function tick_position(t,axis) {
    t
      .attr("x1",function(d){
        return axis == "x" ? vars.x_scale(d) : 0
      })
      .attr("x2",function(d){
        return axis == "x" ? vars.x_scale(d) : graph.width
      })
      .attr("y1",function(d){
        return axis == "y" ? vars.y_scale(d) : 0
      })
      .attr("y2",function(d){
        return axis == "y" ? vars.y_scale(d) : graph.height
      })
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Enter SVG Elements
  //-------------------------------------------------------------------

  // Enter Background Plane
  var plane = vars.group.selectAll("g#plane").data(["plane"])
  plane.enter().append("g")
    .attr("id","plane")
    .attr("transform", "translate(" + graph.margin.left + "," + graph.margin.top + ")")

  // Enter Background Rectangle
  var bg = plane.selectAll("rect#background").data(["background"])
  bg.enter().append("rect")
    .attr("id","background")
    .attr("x",0)
    .attr("y",0)
    .attr("width", graph.width)
    .attr("height", graph.height)
    .attr("stroke-width",1)
    .attr("stroke","#ccc")
      .attr("shape-rendering",vars.style.rendering)
    .style("fill","#fafafa")

  // Enter Background Mirror
  var mirror = plane.selectAll("path#mirror").data(["mirror"])
  mirror.enter().append("path")
    .attr("id","mirror")
    .attr("fill","#000")
    .attr("fill-opacity",0.03)
    .attr("stroke-width",1)
    .attr("stroke","#ccc")
    .attr("stroke-dasharray","10,10")
    .attr("opacity",0)

  // Enter Axes
  var axes = vars.group.selectAll("g#axes").data(["axes"])
  axes.enter().append("g")
    .attr("id","axes")

  // Enter X Axis Grid
  var xgrid = plane.selectAll("g#xgrid").data(["xgrid"])
  xgrid.enter().append("g")
    .attr("id","xgrid")

  // Enter Y Axis Grid
  var ygrid = plane.selectAll("g#ygrid").data(["ygrid"])
  ygrid.enter().append("g")
    .attr("id","ygrid")

  // Enter X Axis Scale
  var xaxis = plane.selectAll("g#xaxis").data(["xaxis"])
  xaxis.enter().append("g")
    .attr("id","xaxis")
    .attr("transform", "translate(0," + graph.height + ")")

  // Enter Y Axis Scale
  var yaxis = plane.selectAll("g#yaxis").data(["yaxis"])
  yaxis.enter().append("g")
    .attr("id","yaxis")

  // Enter X Axis Label
  var xlabel = axes.selectAll("text#xlabel").data(["xlabel"])
  xlabel.enter().append("text")
    .attr("id", "xlabel")
    .attr("x", vars.app_width/2)
    .attr("y", vars.app_height-10)
    .text(vars.format(vars.x.key))
    .attr("font-family",vars.style.font.family)
    .attr("font-weight",vars.style.font.weight)
    .attr("font-size",vars.style.labels.size)
    .attr("fill",vars.style.labels.color)
    .attr("text-anchor",vars.style.labels.align)

  // Enter Y Axis Label
  var ylabel = axes.selectAll("text#ylabel").data(["ylabel"])
  ylabel.enter().append("text")
    .attr("id", "ylabel")
    .attr("y", 15)
    .attr("x", -(graph.height/2+graph.margin.top))
    .text(vars.format(vars.y.key))
    .attr("transform","rotate(-90)")
    .attr("font-family",vars.style.font.family)
    .attr("font-weight",vars.style.font.weight)
    .attr("font-size",vars.style.labels.size)
    .attr("fill",vars.style.labels.color)
    .attr("text-anchor",vars.style.labels.align)

  // Enter Mouse Event Group
  var mouseevents = vars.group.selectAll("g#mouseevents").data(["mouseevents"])
  mouseevents.enter().append("g")
    .attr("id","mouseevents")

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Calculate Spacing Needed for Axes Labels
  //-------------------------------------------------------------------
  graph.offset = 0
  yaxis.call(vars.y_axis)
    .selectAll("line")
    .call(tick_style,"y")

  graph.margin.left += graph.offset
  graph.width -= graph.offset
  vars.x_scale.rangeRound([0,graph.width])

  graph.yoffset = 0
  graph.rightoffset = 0
  xaxis.call(vars.x_axis)
    .selectAll("line")
    .call(tick_style,"x")

  graph.height -= graph.yoffset
  graph.width -= graph.rightoffset
  vars.x_scale.rangeRound([0,graph.width])
  vars.y_scale.rangeRound([0,graph.height])
  yaxis.call(vars.y_axis)
  xaxis.call(vars.x_axis)

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Update SVG Elements
  //-------------------------------------------------------------------

  // Update Plane Group
  plane.transition().duration(vars.style.timing.transitions)
    .attr("transform", "translate(" + graph.margin.left + "," + graph.margin.top + ")")

  // Update Plane Background
  bg.attr("width", graph.width)
    .attr("height", graph.height)

  // Update Mirror Triangle
  mirror.transition().duration(vars.style.timing.transitions)
    .attr("opacity",function(){
      return vars.axes.mirror.value ? 1 : 0
    })
    .attr("d",function(){
      var w = graph.width, h = graph.height
      return "M "+w+" "+h+" L 0 "+h+" L "+w+" 0 Z"
    })

  // Update Y Axis
  yaxis.transition().duration(vars.style.timing.transitions)
    .call(vars.y_axis.scale(vars.y_scale))

  yaxis.selectAll("line").transition().duration(vars.style.timing.transitions)
      .call(tick_style,"y")

  yaxis.selectAll("path").style("fill","none")

  // Update X Axis
  xaxis.transition().duration(vars.style.timing.transitions)
    .attr("transform", "translate(0," + graph.height + ")")
    .call(vars.x_axis.scale(vars.x_scale))
    .selectAll("g.tick").select("text")
      .style("text-anchor","start")

  xaxis.selectAll("line").transition().duration(vars.style.timing.transitions)
      .call(tick_style,"x")

  xaxis.selectAll("path").style("fill","none")

  // Update Y Grid
  var yData = vars.y.scale.value == "continuous"
            ? vars.y_scale.ticks(vars.tickValues.y.length)
            : vars.y_scale.ticks()
  var ylines = ygrid.selectAll("line")
    .data(yData)

  ylines.enter().append("line")
    .style("opacity",0)
    .call(tick_position,"y")
    .call(tick_style,"y")

  ylines.transition().duration(vars.style.timing.transitions)
    .style("opacity",1)
    .call(tick_position,"y")
    .call(tick_style,"y")

  ylines.exit().transition().duration(vars.style.timing.transitions)
    .style("opacity",0)
    .remove()

  // Update X Grid
  var xData = vars.x.scale.value == "continuous"
            ? vars.x_scale.ticks(vars.tickValues.x.length)
            : vars.x_scale.ticks()
  var xlines = xgrid.selectAll("line")
    .data(xData)

  xlines.enter().append("line")
    .style("opacity",0)
    .call(tick_position,"x")
    .call(tick_style,"x")

  xlines.transition().duration(vars.style.timing.transitions)
    .style("opacity",1)
    .call(tick_position,"x")
    .call(tick_style,"x")

  xlines.exit().transition().duration(vars.style.timing.transitions)
    .style("opacity",0)
    .remove()

  // Update X Axis Label
  xlabel.text(vars.format(vars.x.key))
    .attr("x", vars.app_width/2)
    .attr("y", vars.app_height-10)
    .attr("opacity",function(){
      if (vars.data.app.length == 0) return 0
      else return 1
    })

  // Update Y Axis Label
  ylabel.text(vars.format(vars.y.key))
    .attr("y", 15)
    .attr("x", -(graph.height/2+graph.margin.top))
    .attr("opacity",function(){
      if (vars.data.app.length == 0) return 0
      else return 1
    })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Enter/Update User-Defined Axis Lines
  //-------------------------------------------------------------------

  function get_name(d) {
    if (typeof d == "number" || typeof d == "string") {
      return null;
    }
    else {
      return Object.keys(d)[0]
    }
  }

  function get_val(d) {
    if (typeof d == "number") {
      return d;
    }
    else if (typeof d == "string") {
      return parseFloat(d);
    }
    else {
      var v = d[Object.keys(d)[0]]
      if (typeof v == "string") {
        return parseFloat(v);
      }
      else {
        return v;
      }
    }
  }

  vars.axes.values.forEach(function(axis){

    var lines = plane.selectAll("g.d3plus_"+axis+"line")
      .data(vars[axis].lines,function(l){
        if (typeof l == "number" || typeof l == "string") {
          return l
        }
        else {
          return Object.keys(l)[0]
        }
      })

    var enter = lines.enter().append("g")
      .attr("class","d3plus_"+axis+"line")

    var max = axis == "x" ? "height" : "width",
        pos = axis == "x" ? (graph.height-8)+"px" : "10px",
        padding = axis == "x" ? 10 : 20

    enter.append("line")
      .attr(axis+"1",0)
      .attr(axis+"2",graph[max])
      .attr("stroke","#ccc")
      .attr("stroke-width",3)
      .attr("stroke-dasharray","10,10")

    enter.append("text")
      .style("font-size",vars.style.ticks.font.size)
      .style("fill",vars.style.ticks.font.color)
      .attr("text-align","start")
      .attr(axis,pos)

    lines.selectAll("line").transition().duration(vars.style.timing.transitions)
      .attr(axis+"1",function(d){
        return get_val(d) ? vars[axis+"_scale"](get_val(d)) : 0
      })
      .attr(axis+"2",function(d){
        return get_val(d) ? vars[axis+"_scale"](get_val(d)) : 0
      })
      .attr("opacity",function(d){
        var yes = get_val(d) > vars[axis+"_scale"].domain()[1] && get_val(d) < vars[axis+"_scale"].domain()[0]
        return get_val(d) != null && yes ? 1 : 0
      })

    lines.selectAll("text").transition().duration(vars.style.timing.transitions)
      .text(function(){
        if (get_val(d) != null) {
          var v = vars.format(get_val(d),y_name)
          return get_name(d) ? vars.format(get_name(d)) + ": " + v : v
        }
        else return null
      })
      .attr(axis,function(d){
        return (vars[axis+"_scale"](get_val(d))+padding)+"px"
      })

  })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Format Data for Plotting
  //-------------------------------------------------------------------

  if (["line","area"].indexOf(vars.shape.value) >= 0) {
    radius.rangeRound([2,2])
  }

  vars.axis_offset = {
    "x": graph.margin.left,
    "y": graph.margin.top
  }

  data.forEach(function(d){
    d.d3plus.x = vars.x_scale(d3plus.variable.value(vars,d,vars.x.key))
    d.d3plus.x += vars.axis_offset.x

    d.d3plus.r = radius(d3plus.variable.value(vars,d,vars.size.key))

    if (!vars.stacked_axis) {

      d.d3plus.y = vars.y_scale(d3plus.variable.value(vars,d,vars.y.key))
      d.d3plus.y += vars.axis_offset.y

      if (vars.shape.value == "area") {
        d.d3plus[vars.opp_axis+"0"] = vars[vars.opp_axis+"_scale"].range()[1]
        d.d3plus[vars.opp_axis+"0"] += vars.axis_offset[vars.opp_axis]
      }

    }

  })

  if (["line","area"].indexOf(vars.shape.value) >= 0) {

    data = d3.nest()
      .key(function(d){
        var id = d3plus.variable.value(vars,d,vars.id.key),
            depth = d.d3plus.depth ? d.d3plus.depth : 0
        return d3plus.util.strip(id)+"_"+depth+"_"+vars.shape.value
      })
      .rollup(function(leaves){

        var availables = d3plus.util.uniques(leaves,vars[vars.continuous_axis].key),
            previousMissing = false

        vars.tickValues[vars.continuous_axis].forEach(function(v,i,arr){

          if(availables.indexOf(v) < 0){
            var obj = {}
            obj[vars[vars.continuous_axis].key] = v
            obj[vars.id.key] = leaves[0][vars.id.key]
            obj[vars[vars.opp_axis].key] = vars[vars.opp_axis+"_scale"].domain()[1]
            obj.d3plus = {}
            obj.d3plus.r = radius(radius.domain()[0])
            obj.d3plus[vars.continuous_axis] += vars.axis_offset[vars.continuous_axis]

            if (!vars.stacked_axis) {
              obj.d3plus[vars.opp_axis] = vars[vars.opp_axis+"_scale"].range()[1]
              obj.d3plus[vars.opp_axis] += vars.axis_offset[vars.opp_axis]
              obj.d3plus[vars.opp_axis+"0"] = obj.d3plus[vars.opp_axis]
            }

            if (vars[vars.continuous_axis].zerofill.value || vars[vars.opp_axis].stacked.value) {
              var position = vars[vars.continuous_axis+"_scale"](v)
              position += vars.axis_offset[vars.continuous_axis]
              obj.d3plus[vars.continuous_axis] = position
              leaves.push(obj)
            }
            else if (vars.shape.value != "line") {
              if (!previousMissing && i > 0) {
                var position = vars[vars.continuous_axis+"_scale"](arr[i-1])
                position += vars.axis_offset[vars.continuous_axis]
                obj.d3plus[vars.continuous_axis] = position
                leaves.push(obj)
              }
              if (i < arr.length-1) {
                var position = vars[vars.continuous_axis+"_scale"](arr[i+1])
                position += vars.axis_offset[vars.continuous_axis]
                var obj2 = d3plus.util.copy(obj)
                obj2.d3plus[vars.continuous_axis] = position
                leaves.push(obj2)
              }
            }
            previousMissing = true

          }
          else {
            previousMissing = false
          }
        })

        leaves.sort(function(a,b){
          var xsort = a.d3plus[vars.continuous_axis] - b.d3plus[vars.continuous_axis]
          if (xsort) return xsort
          var ksort = a[vars[vars.continuous_axis].key] - b[vars[vars.continuous_axis].key]
          return ksort
        })

        return leaves
      })
      .entries(data)

    data.forEach(function(d,i){
      vars.id.nesting.forEach(function(n,i){
        if (i <= vars.depth.value && !d[n]) {
          d[n] = d3plus.util.uniques(d.values,n).filter(function(unique){
            return unique && unique != "undefined"
          })[0]
        }
      })
    })

  }

  var sort = null
  if (vars.order.key) {
    sort = vars.order.key
  }
  else if (vars.continuous_axis) {
    sort = vars[vars.opp_axis].key
  }
  else if (vars.size.key) {
    sort = vars.size.key
  }

  if (sort) {

    data.sort(function(a,b){

      if (a.values instanceof Array) {
        a_value = 0
        a.values.forEach(function(v){
          var val = d3plus.variable.value(vars,v,sort)
          if (val) {
            if (typeof val == "number") {
              a_value += val
            }
            else {
              a_value = val
            }
          }
        })
      }
      else {
        a_value = d3plus.variable.value(vars,a,sort)
      }

      if (b.values instanceof Array) {
        b_value = 0
        b.values.forEach(function(v){
          var val = d3plus.variable.value(vars,v,sort)
          if (val) {
            if (typeof val == "number") {
              b_value += val
            }
            else {
              b_value = val
            }
          }
        })
      }
      else {
        b_value = d3plus.variable.value(vars,b,sort)
      }

      if (vars.color.key && sort == vars.color.key) {

        a_value = d3plus.variable.color(vars,a)
        b_value = d3plus.variable.color(vars,b)

        a_value = d3.rgb(a_value).hsl()
        b_value = d3.rgb(b_value).hsl()

        if (a_value.s == 0) a_value = 361
        else a_value = a_value.h
        if (b_value.s == 0) b_value = 361
        else b_value = b_value.h

      }

      if(a_value<b_value) return vars.order.sort.value == "desc" ? -1 : 1;
      if(a_value>b_value) return vars.order.sort.value == "desc" ? 1 : -1;

      return 0;

    });
  }

  if (vars.stacked_axis) {

    var stack = d3.layout.stack()
      .values(function(d) { return d.values; })
      .x(function(d) { return d.d3plus.x; })
      .x(function(d) { return d.d3plus.y; })
      .y(function(d) {
        var flip = graph.height,
            val = d3plus.variable.value(vars,d,vars.y.key)
        return flip-vars.y_scale(val);
      })
      .out(function(d,y0,y){
        var flip = graph.height

        if (vars[vars.stacked_axis].scale.value == "share") {
          d.d3plus.y0 = (1-y0)*flip
          d.d3plus.y = d.d3plus.y0-(y*flip)
        }
        else {
          d.d3plus.y0 = flip-y0
          d.d3plus.y = d.d3plus.y0-y
        }
        d.d3plus.y += graph.margin.top
        d.d3plus.y0 += graph.margin.top
      })

    var offset = vars[vars.stacked_axis].scale.value == "share" ? "expand" : "zero";

    var data = stack.offset(offset)(data)

  }
  else if (["area","line"].indexOf(vars.shape.value) < 0) {

    function data_tick(l,axis) {
      l
        .attr("x1",function(d){
          return axis == "y" ? 0 : d.d3plus.x-graph.margin.left
        })
        .attr("x2",function(d){
          return axis == "y" ? -5 : d.d3plus.x-graph.margin.left
        })
        .attr("y1",function(d){
          return axis == "x" ? graph.height : d.d3plus.y-graph.margin.top
        })
        .attr("y2",function(d){
          return axis == "x" ? graph.height+5 : d.d3plus.y-graph.margin.top
        })
        .style("stroke",function(d){
          return d3plus.color.legible(d3plus.variable.color(vars,d));
        })
        .style("stroke-width",vars.style.data.stroke.width)
        .attr("shape-rendering",vars.style.rendering)
    }

    var data_ticks = plane.selectAll("g.d3plus_data_ticks")
      .data(data,function(d){
        return d[vars.id.key]+"_"+d.d3plus.depth
      })

    var tick_enter = data_ticks.enter().append("g")
      .attr("class","d3plus_data_ticks")
      .attr("opacity",0)

    tick_enter.append("line")
      .attr("class","d3plus_data_y")
      .call(data_tick,"y")

    data_ticks.selectAll("line.d3plus_data_y")
      .call(data_tick,"y")

    tick_enter.append("line")
      .attr("class","d3plus_data_x")
      .call(data_tick,"x")

    data_ticks.selectAll("line.d3plus_data_x")
      .call(data_tick,"x")

    data_ticks.transition().duration(vars.style.timing.transitions)
      .attr("opacity",1)

    data_ticks.exit().transition().duration(vars.style.timing.transitions)
      .attr("opacity",0)
      .remove()

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Plot data on chart!
  //-------------------------------------------------------------------

  function axis_lines(node) {

    var click_remove = d3.event.type == d3plus.evt.click && (vars.tooltip.value.long || vars.html.value),
        create = [d3plus.evt.over,d3plus.evt.move].indexOf(d3.event.type) >= 0

    if (!click_remove && create && vars.shape.value != "area") {

      if (node.data) var node = node.data

      var line_data = [
        d3plus.util.copy(node.d3plus),
        d3plus.util.copy(node.d3plus)
      ]
      line_data[0].axis = "x"
      line_data[1].axis = "y"

    }
    else {
      var line_data = []
    }

    function line_init(l) {
      l
        .attr("x2",function(d){
          var ret = d.axis == "x" ? d.x : d.x-d.r
          return ret
        })
        .attr("y2",function(d){
          var ret = d.axis == "y" ? d.y : d.y+d.r
          return ret
        })
        .style("stroke-width",0)
        .attr("opacity",0)
    }

    var lines = mouseevents.selectAll("line.d3plus_axis_label")
      .data(line_data,function(d){
        return d.axis+"_"+d.id
      })

    lines.enter().append("line")
      .attr("class","d3plus_axis_label")
      .call(line_init)
      .attr("x1",function(d){
        return d.axis == "x" ? d.x : d.x-d.r
      })
      .attr("y1",function(d){
        return d.axis == "y" ? d.y : d.y+d.r
      })
      .style("stroke",function(d){
        return d3plus.variable.color(vars,node)
      })
      .attr("shape-rendering",vars.style.rendering)

    lines.transition().duration(vars.style.timing.mouseevents)
      .attr("class","d3plus_axis_label")
      .attr("x2",function(d){
        return d.axis == "x" ? d.x : graph.margin.left-vars.style.ticks.size
      })
      .attr("y2",function(d){
        return d.axis == "y" ? d.y : graph.height+graph.margin.top+vars.style.ticks.size
      })
      .style("stroke",function(d){
        return d3plus.color.legible(d3plus.variable.color(vars,node));
      })
      .style("stroke-width",vars.style.data.stroke.width)
      .attr("opacity",1)

    lines.exit().transition().duration(vars.style.timing.mouseevents)
      .call(line_init)
      .remove()

    var texts = mouseevents.selectAll("text.d3plus_axis_label")
      .data(line_data,function(d){
        return d.axis+"_"+d.id
      })

    texts.enter().append("text")
      .attr("class","d3plus_axis_label")
      .attr("id",function(d){
        return d.axis+"_"+d.id
      })
      .text(function(d){
        var val = d3plus.variable.value(vars,node,vars[d.axis].key)
        return vars.format(val,vars[d.axis].key)
      })
      .attr("x",function(d){
        return d.axis == "x" ? d.x : graph.margin.left-5-vars.style.ticks.size
      })
      .attr("y",function(d){
        return d.axis == "y" ? d.y : graph.height+graph.margin.top+5+vars.style.ticks.size
      })
      .attr("dy",function(d){
        return d.axis == "y" ? (vars.style.ticks.font.size*.35) : vars.style.ticks.font.size
      })
      .attr("text-anchor",function(d){
        return d.axis == "y" ? "end": "middle"
      })
      .style("fill",function(d){
        return d3plus.color.legible(d3plus.variable.color(vars,node));
      })
      .style("font-size",vars.style.ticks.font.size)
      .attr("font-family",vars.style.font.family)
      .attr("font-weight",vars.style.font.weight)
      .attr("opacity",0)

    texts.transition().duration(vars.style.timing.mouseevents)
      .delay(vars.style.timing.mouseevents)
      .attr("opacity",1)

    texts.exit().transition().duration(vars.style.timing.mouseevents)
      .attr("opacity",0)
      .remove()

    var rects = mouseevents.selectAll("rect.d3plus_axis_label")
      .data(line_data,function(d){
        return d.axis+"_"+d.id
      })

    rects.enter().insert("rect","text")
      .attr("class","d3plus_axis_label")
      .attr("x",function(d){
        var width = d3.select("text#"+d.axis+"_"+d.id).node().getBBox().width
        var ret = d.axis == "x" ? d.x : graph.margin.left-vars.style.ticks.size
        return d.axis == "x" ? ret-width/2-5 : ret-width-10
      })
      .attr("y",function(d){
        var height = d3.select("text#"+d.axis+"_"+d.id).node().getBBox().height
        var ret = d.axis == "y" ? d.y : graph.height+graph.margin.top
        return d.axis == "x" ? ret+vars.style.ticks.size : ret-height/2-5
      })
      .attr("width",function(d){
        var text = d3.select("text#"+d.axis+"_"+d.id).node().getBBox()
        return text.width + 10
      })
      .attr("height",function(d){
        var text = d3.select("text#"+d.axis+"_"+d.id).node().getBBox()
        return text.height + 10
      })
      .style("stroke",function(d){
        return d3plus.color.legible(d3plus.variable.color(vars,node));
      })
      .style("fill","white")
      .style("stroke-width",vars.style.data.stroke.width)
      .attr("shape-rendering",vars.style.rendering)
      .attr("opacity",0)

    rects.transition().duration(vars.style.timing.mouseevents)
      .delay(vars.style.timing.mouseevents)
      .attr("opacity",1)

    rects.exit().transition().duration(vars.style.timing.mouseevents)
      .attr("opacity",0)
      .remove()

  }

  vars.mouse = axis_lines

  return data

};

d3plus.apps.geo_map = {}
d3plus.apps.geo_map.libs = ["topojson"];
d3plus.apps.geo_map.requirements = ["color","coords"];
d3plus.apps.geo_map.tooltip = "follow"
d3plus.apps.geo_map.shapes = ["coordinates"];
d3plus.apps.geo_map.scale = 1
d3plus.apps.geo_map.nesting = false
d3plus.apps.geo_map.zoom = true

d3plus.apps.geo_map.draw = function(vars) {

  topojson.presimplify(vars.coords.value)

  var coords = vars.coords.value,
      key = Object.keys(coords.objects)[0]
      topo = topojson.feature(coords, coords.objects[key]),
      features = topo.features

  var features = features.filter(function(f){
    f[vars.id.key] = f.id
    if (vars.coords.solo.value.length) {
      return vars.coords.solo.value.indexOf(f.id) >= 0
    }
    else if (vars.coords.mute.value.length) {
      return vars.coords.mute.value.indexOf(f.id) < 0
    }
    return true
  })

  return features

};

d3plus.apps.line = {}
d3plus.apps.line.requirements = ["data","x","y"];
d3plus.apps.line.tooltip = "static";
d3plus.apps.line.shapes = ["line"];

d3plus.apps.line.setup = function(vars) {

  vars.x.scale.value = "continuous"

}

d3plus.apps.line.draw = function(vars) {

  return d3plus.apps.chart.draw(vars)

}

d3plus.apps.network = {}
d3plus.apps.network.requirements = ["nodes","edges"];
d3plus.apps.network.tooltip = "static"
d3plus.apps.network.shapes = ["circle","square","donut"];
d3plus.apps.network.scale = 1.05
d3plus.apps.network.nesting = false
d3plus.apps.network.zoom = true

d3plus.apps.network.draw = function(vars) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Use filtered lists if they are available
  //-------------------------------------------------------------------
  var nodes = vars.nodes.restricted || vars.nodes.value,
      edges = vars.edges.restricted || vars.edges.value

  var x_range = d3.extent(nodes,function(n){return n.x}),
      y_range = d3.extent(nodes,function(n){return n.y})

  var val_range = d3.extent(nodes, function(d){
    var val = d3plus.variable.value(vars,d,vars.size.key)
    return val == 0 ? null : val
  });

  if (typeof val_range[0] == "undefined") val_range = [1,1]

  var max_size = d3.min(d3plus.util.distances(nodes))

  if (vars.edges.arrows.value) {
    max_size = max_size*0.45
  }
  else {
    max_size = max_size*0.6
  }

  if (val_range[0] == val_range[1]) {
    var min_size = max_size
  }
  else {

    var width = (x_range[1]+max_size*1.1)-(x_range[0]-max_size*1.1),
        height = (y_range[1]+max_size*1.1)-(y_range[0]-max_size*1.1)
        aspect = width/height,
        app = vars.app_width/vars.app_height

    if (app > aspect) {
      var scale = vars.app_height/height
    }
    else {
      var scale = vars.app_width/width
    }
    var min_size = max_size*0.25
    if (min_size*scale < 3) {
      min_size = 3/scale
    }

  }

  // Create size scale
  var radius = d3.scale[vars.size.scale.value]()
    .domain(val_range)
    .rangeRound([min_size, max_size])

  vars.zoom.bounds = [[x_range[0]-max_size*1.1,y_range[0]-max_size*1.1],[x_range[1]+max_size*1.1,y_range[1]+max_size*1.1]]

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Match nodes to data
  //-------------------------------------------------------------------
  var data = [], lookup = {}
  nodes.forEach(function(n){

    var d = vars.data.app.filter(function(a){
      return a[vars.id.key] == n[vars.id.key]
    })[0]

    if (d) {
      var obj = d3plus.util.merge(n,d)
    }
    else {
      var obj = d3plus.util.copy(n)
    }

    obj.d3plus = {}
    obj.d3plus.x = n.x
    obj.d3plus.y = n.y
    var val = d3plus.variable.value(vars,obj,vars.size.key)
    obj.d3plus.r = val ? radius(val) : radius.range()[0]
    lookup[obj[vars.id.key]] = {
      "x": obj.d3plus.x,
      "y": obj.d3plus.y,
      "r": obj.d3plus.r
    }
    data.push(obj)
  })

  data.sort(function(a,b){
    return b.d3plus.r - a.d3plus.r
  })

  edges.forEach(function(l,i){

    l[vars.edges.source] = d3plus.util.copy(l[vars.edges.source])
    l[vars.edges.source].d3plus = {}

    var source = lookup[l[vars.edges.source][vars.id.key]]
    l[vars.edges.source].d3plus.r = source.r
    l[vars.edges.source].d3plus.x = source.x
    l[vars.edges.source].d3plus.y = source.y

    l[vars.edges.target] = d3plus.util.copy(l[vars.edges.target])
    l[vars.edges.target].d3plus = {}

    var target = lookup[l[vars.edges.target][vars.id.key]]
    l[vars.edges.target].d3plus.r = target.r
    l[vars.edges.target].d3plus.x = target.x
    l[vars.edges.target].d3plus.y = target.y

  })

  return {"nodes": data, "edges": edges}

}

d3plus.apps.rings = {}
d3plus.apps.rings.requirements = ["edges","focus"];
d3plus.apps.rings.tooltip = "static"
d3plus.apps.rings.shapes = ["circle","square","donut"];
d3plus.apps.rings.scale = 1
d3plus.apps.rings.nesting = false
d3plus.apps.rings.filter = function(vars,data) {

  var primaries = vars.connections(vars.focus.value,true)
    , secondaries = []

  primaries.forEach(function(p){
    secondaries = secondaries.concat(vars.connections(p[vars.id.key],true))
  })

  var connections = primaries.concat(secondaries)
    , ids = d3plus.util.uniques(connections,vars.id.key)

  if (data === undefined) {
    return ids
  }

  return data.filter(function(d){

    return ids.indexOf(d[vars.id.key]) >= 0

  })

}

d3plus.apps.rings.draw = function(vars) {

  var radius = d3.min([vars.app_height,vars.app_width])/2
    , ring_width = vars.small || !vars.labels.value
                 ? (radius-vars.style.labels.padding*2)/2 : radius/3
    , primaryRing = vars.small || !vars.labels.value
                  ? ring_width*1.4 : ring_width
    , secondaryRing = ring_width*2
    , edges = []
    , nodes = []

  var center = vars.data.app.filter(function(d){
    return d[vars.id.key] == vars.focus.value
  })[0]

  if (!center) {
    center = {"d3plus": {}}
    center[vars.id.key] = vars.focus.value
  }
  center.d3plus.x = vars.app_width/2
  center.d3plus.y = vars.app_height/2
  center.d3plus.r = primaryRing*.65

  var primaries = [], claimed = [vars.focus.value]
  vars.connections(vars.focus.value).forEach(function(edge){

    var c = edge[vars.edges.source][vars.id.key] == vars.focus.value ? edge[vars.edges.target] : edge[vars.edges.source]
    var n = vars.data.app.filter(function(d){
      return d[vars.id.key] == c[vars.id.key]
    })[0]
    if (!n) {
      n = {"d3plus": {}}
      n[vars.id.key] = c[vars.id.key]
    }
    n.d3plus.edges = vars.connections(n[vars.id.key]).filter(function(c){
      return c[vars.edges.source][vars.id.key] != vars.focus.value && c[vars.edges.target][vars.id.key] != vars.focus.value
    })
    n.d3plus.edge = edge
    claimed.push(n[vars.id.key])
    primaries.push(n)

  })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Sort primary nodes by children (smallest to largest) and then by sort
  // order.
  //--------------------------------------------------------------------------
  var sort = null
  if (vars.order.key) {
    sort = vars.order.key
  }
  else if (vars.color.key) {
    sort = vars.color.key
  }
  else if (vars.size.key) {
    sort = vars.size.key
  }
  else {
    sort = vars.id.key
  }

  function sort_function(a,b){

    a_value = d3plus.variable.value(vars,a,sort)
    b_value = d3plus.variable.value(vars,b,sort)

    if (vars.color.key && sort == vars.color.key) {

      a_value = d3plus.variable.color(vars,a)
      b_value = d3plus.variable.color(vars,b)

      a_value = d3.rgb(a_value).hsl()
      b_value = d3.rgb(b_value).hsl()

      if (a_value.s == 0) a_value = 361
      else a_value = a_value.h
      if (b_value.s == 0) b_value = 361
      else b_value = b_value.h

    }
    else {
      a_value = d3plus.variable.value(vars,a,sort)
      b_value = d3plus.variable.value(vars,b,sort)
    }

    if(a_value<b_value) return vars.order.sort.value == "desc" ? -1 : 1;
    if(a_value>b_value) return vars.order.sort.value == "desc" ? 1 : -1;

  }

  primaries.sort(function(a,b){

    var lengthdiff = a.d3plus.edges.length - b.d3plus.edges.length

    if (lengthdiff) {

      return lengthdiff

    }
    else {

      return sort_function(a,b)

    }

  })

  if (typeof vars.edges.limit == "number") {
    primaries = primaries.slice(0,vars.edges.limit)
  }
  else if (typeof vars.edges.limit == "function") {
    primaries = vars.edges.limit(primaries)
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Check for similar children and give preference to nodes with less
  // overall children.
  //----------------------------------------------------------------------------
  var secondaries = [], total = 0
  primaries.forEach(function(p){

    var primaryId = p[vars.id.key]

    p.d3plus.edges = p.d3plus.edges.filter(function(c){

      var source = c[vars.edges.source][vars.id.key]
        , target = c[vars.edges.target][vars.id.key]
      return (claimed.indexOf(source) < 0 && target == primaryId)
          || (claimed.indexOf(target) < 0 && source == primaryId)

    })

    total += p.d3plus.edges.length || 1

    p.d3plus.edges.forEach(function(c){

      var source = c[vars.edges.source]
        , target = c[vars.edges.target]
      var claim = target[vars.id.key] == primaryId ? source : target
      claimed.push(claim[vars.id.key])

    })
  })

  primaries.sort(sort_function)

  var offset = 0,
      radian = Math.PI*2,
      start = 0

  primaries.forEach(function(p,i){

    var children = p.d3plus.edges.length || 1,
        space = (radian/total)*children

    if (i == 0) {
      start = angle
      offset -= space/2
    }

    var angle = offset+(space/2)
    angle -= radian/4

    p.d3plus.radians = angle
    p.d3plus.x = vars.app_width/2 + (primaryRing * Math.cos(angle))
    p.d3plus.y = vars.app_height/2 + (primaryRing * Math.sin(angle))

    offset += space
    p.d3plus.edges.sort(function(a,b){

      var a = a[vars.edges.source][vars.id.key] == p[vars.id.key]
            ? a[vars.edges.target] : a[vars.edges.source]
        , b = b[vars.edges.source][vars.id.key] == p[vars.id.key]
            ? b[vars.edges.target] : b[vars.edges.source]

      return sort_function(a,b)

    })

    p.d3plus.edges.forEach(function(edge,i){

      var c = edge[vars.edges.source][vars.id.key] == p[vars.id.key]
          ? edge[vars.edges.target] : edge[vars.edges.source]
        , s = radian/total

      var d = vars.data.app.filter(function(a){
        return a[vars.id.key] == c[vars.id.key]
      })[0]

      if (!d) {
        d = {"d3plus": {}}
        d[vars.id.key] = c[vars.id.key]
      }

      a = (angle-(s*children/2)+(s/2))+((s)*i)
      d.d3plus.radians = a
      d.d3plus.x = vars.app_width/2 + ((secondaryRing) * Math.cos(a))
      d.d3plus.y = vars.app_height/2 + ((secondaryRing) * Math.sin(a))
      secondaries.push(d)
    })

  })

  var primaryDistance = d3.min(d3plus.util.distances(primaries,function(n){
        return [n.d3plus.x,n.d3plus.y]
      }))
    , secondaryDistance = d3.min(d3plus.util.distances(secondaries,function(n){
        return [n.d3plus.x,n.d3plus.y]
      }))

  if (!primaryDistance) {
    primaryDistance = ring_width/2
  }

  if (!secondaryDistance) {
    secondaryDistance = ring_width/4
  }

  if (primaryDistance/2 - 4 < 8) {
    var primaryMax = d3.min([primaryDistance/2,8])
  }
  else {
    var primaryMax = primaryDistance/2 - 4
  }

  if (secondaryDistance/2 - 4 < 4) {
    var secondaryMax = d3.min([secondaryDistance/2,4])
  }
  else {
    var secondaryMax = secondaryDistance/2 - 4
  }

  if (secondaryMax > ring_width/10) {
    secondaryMax = ring_width/10
  }

  if (primaryMax > secondaryMax*1.5) {
    primaryMax = secondaryMax*1.5
  }

  primaryMax = Math.floor(primaryMax)
  secondaryMax = Math.floor(secondaryMax)

  var ids = d3plus.util.uniques(primaries,vars.id.key)
  ids = ids.concat(d3plus.util.uniques(secondaries,vars.id.key))
  ids.push(vars.focus.value)

  var data = vars.data.app.filter(function(d){
    return ids.indexOf(d[vars.id.key]) >= 0
  })

  if (vars.size.key) {

    var domain = d3.extent(data,function(d){
      return d3plus.variable.value(vars,d,vars.size.key)
    })

    if (domain[0] == domain[1]) {
      domain[0] = 0
    }

    var radius = d3.scale.linear()
      .domain(domain)
      .rangeRound([3,d3.min([primaryMax,secondaryMax])])

    var val = d3plus.variable.value(vars,center,vars.size.key)
    center.d3plus.r = radius(val)

  }
  else {

    var radius = d3.scale.linear()
      .domain([1,2])
      .rangeRound([primaryMax,secondaryMax])


    if (vars.edges.label) {
      center.d3plus.r = radius(1)*1.5
    }

  }

  secondaries.forEach(function(s){
    s.d3plus.ring = 2
    var val = vars.size.key ? d3plus.variable.value(vars,s,vars.size.key) : 2
    s.d3plus.r = radius(val)
  })

  primaries.forEach(function(p,i){

    p.d3plus.ring = 1
    var val = vars.size.key ? d3plus.variable.value(vars,p,vars.size.key) : 1
    p.d3plus.r = radius(val)

    var check = [vars.edges.source,vars.edges.target]

    check.forEach(function(node){
      if (p.d3plus.edge[node][vars.id.key] == center[vars.id.key]) {

        p.d3plus.edge[node].d3plus = {
          "x": center.d3plus.x,
          "y": center.d3plus.y,
          "r": center.d3plus.r
        }

      }
      else {

        p.d3plus.edge[node].d3plus = {
          "x": p.d3plus.x,
          "y": p.d3plus.y,
          "r": p.d3plus.r
        }

      }
    })

    delete p.d3plus.edge.d3plus
    edges.push(p.d3plus.edge)

    vars.connections(p[vars.id.key]).forEach(function(edge){

      var c = edge[vars.edges.source][vars.id.key] == p[vars.id.key]
            ? edge[vars.edges.target] : edge[vars.edges.source]

      if (c[vars.id.key] != center[vars.id.key]) {

        var target = secondaries.filter(function(s){
          return s[vars.id.key] == c[vars.id.key]
        })[0]

        if (!target) {
          var r = primaryRing
          target = primaries.filter(function(s){
            return s[vars.id.key] == c[vars.id.key]
          })[0]
        }
        else {
          var r = secondaryRing
        }

        if (target) {

          edge.d3plus = {
            "spline": true,
            "translate": {
              "x": vars.app_width/2,
              "y": vars.app_height/2
            }
          }

          var check = [vars.edges.source,vars.edges.target]

          check.forEach(function(node){
            if (edge[node][vars.id.key] == p[vars.id.key]) {

              edge[node].d3plus = {
                "a": p.d3plus.radians,
                "r": primaryRing+p.d3plus.r,
                "depth": 1
              }

            }
            else {

              edge[node].d3plus = {
                "a": target.d3plus.radians,
                "r": r-target.d3plus.r,
                "depth": 2
              }

            }
          })

          edges.push(edge)

        }

      }

    })

  })

  nodes = [center].concat(primaries).concat(secondaries)

  nodes.forEach(function(n) {

    if (!vars.small && vars.labels.value) {

      if (n[vars.id.key] != vars.focus.value) {

        n.d3plus.rotate = n.d3plus.radians*(180/Math.PI)

        var angle = n.d3plus.rotate,
            width = ring_width-(vars.style.labels.padding*3)-n.d3plus.r

        if (angle < -90 || angle > 90) {
          angle = angle-180
          var buffer = -(n.d3plus.r+width/2+vars.style.labels.padding),
              anchor = "end"
        }
        else {
          var buffer = n.d3plus.r+width/2+vars.style.labels.padding,
              anchor = "start"
        }

        var background = primaries.indexOf(n) >= 0 ? true : false

        var height = n.d3plus.ring == 1 ? primaryDistance : secondaryDistance
        height += vars.style.labels.padding*2

        n.d3plus.label = {
          "x": buffer,
          "y": 0,
          "w": width,
          "h": height,
          "angle": angle,
          "anchor": anchor,
          "valign": "center",
          "color": d3plus.color.legible(d3plus.variable.color(vars,n[vars.id.key])),
          "resize": [8,vars.style.labels.font.size],
          "background": background,
          "mouse": true
        }

      }
      else if (vars.size.key || vars.edges.label) {

        var height = primaryRing-n.d3plus.r*2-vars.style.labels.padding*2

        n.d3plus.label = {
          "x": 0,
          "y": n.d3plus.r+height/2,
          "w": primaryRing,
          "h": height,
          "color": d3plus.color.legible(d3plus.variable.color(vars,n[vars.id.key])),
          "resize": [10,40],
          "background": true,
          "mouse": true
        }

      }
      else {
        delete n.d3plus.rotate
        delete n.d3plus.label
      }

    }
    else {
      delete n.d3plus.rotate
      delete n.d3plus.label
    }

  })

  vars.mouse[d3plus.evt.click] = function(d) {
    if (d[vars.id.key] != vars.focus.value) {
      d3plus.tooltip.remove(vars.type.value)
      vars.viz.focus(d[vars.id.key]).draw()
    }
  }

  return {"edges": edges, "nodes": nodes, "data": data}

};

d3plus.apps.scatter = {}
d3plus.apps.chart.fill = true;
d3plus.apps.chart.deprecates = ["pie_scatter"];
d3plus.apps.scatter.requirements = ["data","x","y"];
d3plus.apps.scatter.tooltip = "static";
d3plus.apps.scatter.shapes = ["circle","square","donut"];
d3plus.apps.scatter.scale = d3plus.apps.chart.scale;

d3plus.apps.scatter.draw = function(vars) {

  return d3plus.apps.chart.draw(vars)

}

d3plus.apps.stacked = {}
d3plus.apps.stacked.requirements = ["data","x","y"];
d3plus.apps.stacked.tooltip = "static";
d3plus.apps.stacked.shapes = ["area"];
d3plus.apps.stacked.threshold = 0.03;

d3plus.apps.stacked.setup = function(vars) {

  if (vars.dev.value) d3plus.console.time("setting local variables")
  vars.x.scale.value = "continuous"
  if (vars.dev.value) console.log("\"x\" scale set to \"continuous\"")
  vars.x.zerofill.value = true
  if (vars.dev.value) console.log("\"x\" zerofill set to \"true\"")
  vars.y.stacked.value = true
  if ((!vars.y.key && vars.size.key) || (vars.size.changed && vars.size.previous == vars.y.key)) {
    vars.y.key = vars.size.key
    vars.y.changed = true
  }
  else if ((!vars.size.key && vars.y.key) || (vars.y.changed && vars.y.previous == vars.size.key)) {
    vars.size.key = vars.y.key
    vars.size.changed = true
  }
  if (vars.dev.value) console.log("\"y\" stacked set to \"true\"")
  if (vars.dev.value) d3plus.console.timeEnd("setting local variables")

}

d3plus.apps.stacked.draw = function(vars) {

  d3plus.data.threshold(vars,vars.x.key)

  return d3plus.apps.chart.draw(vars)

}

d3plus.apps.tree_map = {}
d3plus.apps.tree_map.modes = ["squarify","slice","dice","slice-dice"];
d3plus.apps.tree_map.requirements = ["data","size"];
d3plus.apps.tree_map.tooltip = "follow"
d3plus.apps.tree_map.shapes = ["square"];
d3plus.apps.tree_map.threshold = 0.0005;

d3plus.apps.tree_map.draw = function(vars) {

  d3plus.data.threshold(vars)

  var grouped_data = d3.nest()

  vars.id.nesting.forEach(function(n,i){
    if (i < vars.depth.value) {
      grouped_data.key(function(d){return d[n]})
    }
  })

  grouped_data = grouped_data.entries(vars.data.app)

  var data = d3.layout.treemap()
    .mode(vars.type.mode.value)
    .round(true)
    .size([vars.app_width, vars.app_height])
    .children(function(d) { return d.values; })
    .padding(1)
    .sort(function(a, b) { return a.value - b.value; })
    .value(function(d) { return d3plus.variable.value(vars,d,vars.size.key); })
    .nodes({"name":"root", "values": grouped_data})
    .filter(function(d) {
      return !d.values && d.area;
    })

  if (data.length) {

    var root = data[0]
    while (root.parent) {
      root = root.parent
    }

    data.forEach(function(d){
      d.d3plus.x = d.x+d.dx/2
      d.d3plus.y = d.y+d.dy/2
      d.d3plus.width = d.dx
      d.d3plus.height = d.dy
      d.d3plus.share = d.value/root.value
    })

  }

  return data

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Darkens a color
//------------------------------------------------------------------------------
d3plus.color.darker = function(color,increment) {
  var c = d3.hsl(color);

  if (!increment) {
    var increment = 0.2
  }

  c.l -= increment
  if (c.l < 0.1) {
    c.l = 0.1
  }

  return c.toString();
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Darkens a color if it's too light to appear on white
//------------------------------------------------------------------------------
d3plus.color.legible = function(color) {
  var hsl = d3.hsl(color)
  if (hsl.s > .9) hsl.s = .9
  if (hsl.l > .4) hsl.l = .4
  return hsl.toString();
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Lightens a color
//------------------------------------------------------------------------------
d3plus.color.lighter = function(color,increment) {
  var c = d3.hsl(color);

  if (!increment) {
    var increment = 0.1
  }

  c.l += increment
  c.s -= increment/2
  if (c.l > .95) {
    c.l = .95
  }
  if (c.s < .05) {
    c.s = .05
  }

  return c.toString();
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Mixes 2 hexidecimal colors
//------------------------------------------------------------------------------
d3plus.color.mix = function(c1,c2,o1,o2) {

  if (!o1) var o1 = 1
  if (!o2) var o2 = 1

  c1 = d3.rgb(c1)
  c2 = d3.rgb(c2)

  var r = (o1*c1.r + o2*c2.r - o1*o2*c2.r)/(o1+o2-o1*o2),
      g = (o1*c1.g + o2*c2.g - o1*o2*c2.g)/(o1+o2-o1*o2),
      b = (o1*c1.b + o2*c2.b - o1*o2*c2.b)/(o1+o2-o1*o2)

  return d3.rgb(r,g,b).toString()

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Random color generator
//------------------------------------------------------------------------------
d3plus.color.random = function(x) {
  var rand_int = x || Math.floor(Math.random()*20)
  return d3plus.color.scale.default(rand_int)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Usable Color Scales
//------------------------------------------------------------------------------
d3plus.color.scale = {}
d3plus.color.scale.default = d3.scale.ordinal().range([
  "#b35c1e",
  "#C9853A",
  "#E4BA79",
  "#F5DD9E",
  "#F3D261",
  "#C4B346",
  "#94B153",
  "#254322",
  "#4F6456",
  "#759E80",
  "#9ED3E3",
  "#27366C",
  "#7B91D3",
  "#C6CBF7",
  "#D59DC2",
  "#E5B3BB",
  "#E06363",
  "#AF3500",
  "#D74B03",
  "#843012",
  "#9A4400",
])

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Returns appropriate text color based off of a given color
//------------------------------------------------------------------------------
d3plus.color.text = function(color) {

  var hsl = d3.hsl(color)
    , light = "#f7f7f7"
    , dark = "#444444"

  return hsl.l > 0.65 ? dark
       : hsl.l < 0.49 ? light
       : hsl.h > 35 && hsl.s >= 0.3 ? dark
       : light

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Analyzes, organizes, and filters data and attributes
//------------------------------------------------------------------------------
d3plus.data.analyze = function(vars) {

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Sets color range of data, if applicable
//-------------------------------------------------------------------
d3plus.data.color = function(vars) {

  if (vars.dev.value) d3plus.console.time("get data range")

  var data_range = []
  vars.data.pool.forEach(function(d){
    var val = parseFloat(d3plus.variable.value(vars,d,vars.color.key))
    if (typeof val == "number" && !isNaN(val) && data_range.indexOf(val) < 0) data_range.push(val)
  })

  if (vars.dev.value) d3plus.console.timeEnd("get data range")

  if (data_range.length > 1) {

    var data_domain = null

    if (vars.dev.value) d3plus.console.time("create color scale")

    data_range = d3.extent(data_range)

    if (data_range[0] < 0 && data_range[1] > 0) {
      var color_range = vars.style.color.range
      if (color_range.length == 3) {
        data_range.push(data_range[1])
        data_range[1] = 0
      }
    }
    else if (data_range[1] > 0 && data_range[0] >= 0) {
      var color_range = vars.style.color.heatmap
      data_range = d3plus.util.buckets(data_range,color_range.length)
    }
    else {
      var color_range = vars.style.color.range.slice(0)
      if (data_range[0] < 0) {
        color_range.pop()
      }
      else {
        color_range.shift()
      }
    }

    vars.color.scale = d3.scale.sqrt()
      .domain(data_range)
      .range(color_range)
      .interpolate(d3.interpolateRgb)

    if (vars.dev.value) d3plus.console.timeEnd("create color scale")

  }
  else {
    vars.color.scale = null
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Cleans edges list and populates nodes list if needed
//-------------------------------------------------------------------
d3plus.data.edges = function(vars) {

  var node_req = d3plus.apps[vars.type.value].requirements.indexOf("nodes") >= 0,
      node_create = node_req && !vars.nodes.value

  if (node_create) {
    vars.nodes.value = []
    var placed = []
    vars.nodes.changed = true
  }
  
  vars.edges.value.forEach(function(e){

    if (typeof e[vars.edges.source] != "object") {
      var obj = {}
      obj[vars.id.key] = e[vars.edges.source]
      e[vars.edges.source] = obj
    }
    if (typeof e[vars.edges.target] != "object") {
      var obj = {}
      obj[vars.id.key] = e[vars.edges.target]
      e[vars.edges.target] = obj
    }

    if (!("keys" in vars.data)) {
      vars.data.keys = {}
    }

    if (!(vars.id.key in vars.data.keys)) {
      vars.data.keys[vars.id.key] = typeof e[vars.edges.source][vars.id.key]
    }

    if (node_create) {
      if (placed.indexOf(e[vars.edges.source][vars.id.key]) < 0) {
        placed.push(e[vars.edges.source][vars.id.key])
        vars.nodes.value.push(e[vars.edges.source])
      }
      if (placed.indexOf(e[vars.edges.target][vars.id.key]) < 0) {
        placed.push(e[vars.edges.target][vars.id.key])
        vars.nodes.value.push(e[vars.edges.target])
      }
    }

  })

  vars.edges.linked = true

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Fetches specific years of data
//-------------------------------------------------------------------

d3plus.data.fetch = function(vars,format,years) {

  var return_data = [];

  if (vars.dev.value) d3plus.console.group("Fetching \""+format+"\" data")

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // If "years" have not been requested, determine the years using .time()
  // solo and mute
  //----------------------------------------------------------------------------
  if (!years) {

    if (vars.time.solo.value.length) {
      var years = []
      vars.time.solo.value.forEach(function(y){
        if (typeof y == "function") {
          vars.data.time.forEach(function(t){
            if (y(t)) {
              years.push(t)
            }
          })
        }
        else {
          years.push(y)
        }
      })
    }
    else if (vars.time.mute.value.length) {
      var muted = []
      vars.time.mute.value.forEach(function(y){
        if (typeof y == "function") {
          vars.data.time.forEach(function(t){
            if (y(t)) {
              muted.push(t)
            }
          })
        }
        else {
          muted.push(y)
        }
      })
      var years = vars.data.time.filter(function(t){
        return muted.indexOf(t) < 0
      })
    }
    else {
      var years = ["all"]
    }

  }

  if (vars.dev.value) console.log("years: "+years.join(","))

  if (format == "restricted") {
    var data = vars.data.restricted
  }
  else {
    var data = vars.data[format][vars.id.nesting[vars.depth.value]]
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // If there is only 1 year needed, just grab it!
  //----------------------------------------------------------------------------
  if (years.length == 1) {
    return_data = data[years[0]]
  }
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Otherwise, we need to grab each year individually
  //----------------------------------------------------------------------------
  else {

    var missing = []

    years.forEach(function(y){

      if (data[y]) {

        return_data = return_data.concat(data[y])

      }
      else {
        missing.push(y)
      }

    })

    if (return_data.length == 0 && missing.length && !vars.internal_error) {
      vars.internal_error = "No Data Available for "+missing.join(", ")
      d3plus.console.warning(vars.internal_error)
    }

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Finally, we need to determine if the data needs to be merged together
  //----------------------------------------------------------------------------
  if (years.length > 1) {

    var separated = false
    vars.axes.values.forEach(function(a){
      if (vars[a].key == vars.time.key && vars[a].scale.value == "continuous") {
        separated = true
      }
    })

    if (!separated) {

      var nested = vars.id.nesting.slice(0,vars.depth.value+1)

      return_data = d3plus.data.nest(vars,return_data,nested,format == "grouped")

    }

  }

  if (!return_data) {
    return_data = [];
  }

  if (vars.dev.value) d3plus.console.groupEnd()

  return return_data

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Filters the data based on vars.check
//-------------------------------------------------------------------
d3plus.data.filter = function(vars) {

  if (vars.check.indexOf("time") >= 0) {
    vars.check.splice(vars.check.indexOf("time"),1)
    if (vars.data.filtered) {
      vars.data.filtered = {"all": vars.data.filtered.all}
    }
  }

  if (!vars.filters) {
    vars.filters = vars.check.slice(0)
  }
  else {
    vars.check.forEach(function(k){
      var variable = vars[k].value ? vars[k].value : vars[k].key
      if (!variable && vars.filters.indexOf(k) >= 0) {
        vars.filters.splice(vars.filters.indexOf(k),1)
      }
    })
  }

  if (vars.check.length >= 1) {

    if (vars.dev.value) d3plus.console.group("Filtering Data by Required Variables");
    var checking = vars.filters.join(", ")
    if (vars.dev.value) d3plus.console.time(checking)

    var data = "value"
    vars.filters.forEach(function(key){

      if (key == "xaxis") vars.x_range = null
      else if (key == "yaxis") vars.y_range = null

      vars.data.filtered = vars.data[data].filter(function(d){
        var variable = vars[key].value ? vars[key].value : vars[key].key
        var val = d3plus.variable.value(vars,d,variable)
        if (key == "size") {
          return val > 0 ? true : false
        }
        else {
          return val != null
        }
      })
      data = "filtered"

    })

    vars.data.filtered = {"all": vars.data.filtered}

    if (vars.dev.value) d3plus.console.timeEnd(checking)
    if (vars.dev.value) d3plus.console.groupEnd();
  }
  else if (!vars.data.filtered) {
    vars.data.filtered = {"all": vars.data.value}
  }

  if (vars.time.key && Object.keys(vars.data.filtered).length == 1) {

    if (vars.dev.value) d3plus.console.group("Disaggregating by Year")

    // Find available years
    vars.data.time = d3plus.util.uniques(vars.data.filtered.all,vars.time.key)
    for (var i=0; i < vars.data.time.length; i++) {
      vars.data.time[i] = parseInt(vars.data.time[i])
    }
    vars.data.time = vars.data.time.filter(function(t){ return t; })
    vars.data.time.sort()

    if (vars.data.time.length) {
      if (vars.dev.value) d3plus.console.time(vars.data.time.length+" years")
      vars.data.time.forEach(function(y){
        vars.data.filtered[y] = vars.data.filtered.all.filter(function(d){
          return d3plus.variable.value(vars,d,vars.time.key) == y;
        })
      })
      if (vars.dev.value) d3plus.console.timeEnd(vars.data.time.length+" years")
    }

    if (vars.dev.value) d3plus.console.groupEnd()

  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Formats Raw Data
//-------------------------------------------------------------------
d3plus.data.format = function(vars,format) {

  if (!format) var format = "grouped"
  return_data = {}

  if (vars.dev.value) d3plus.console.group("Formatting \""+format+"\" Data")

  vars.id.nesting.forEach(function(depth){

    if (vars.dev.value) d3plus.console.time(depth)

    var level = vars.id.nesting.slice(0,vars.id.nesting.indexOf(depth)+1)

    return_data[depth] = {}
    
    for (y in vars.data.restricted) {

      if (format == "grouped") {
        return_data[depth][y] = d3plus.data.nest(vars,vars.data.restricted[y],level,true)
      }
      else {
        return_data[depth][y] = vars.data.restricted[y]
      }

    }

    if (vars.dev.value) d3plus.console.timeEnd(depth)

  })

  if (vars.dev.value) d3plus.console.groupEnd()

  return return_data

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Load Data using JSON
//------------------------------------------------------------------------------
d3plus.data.json = function(vars,key,next) {

  var url = vars[key].url || vars[key].value

  vars[key].url = url
  vars[key].value = []

  d3.json(url,function(error,data) {

    if (!error && data) {

      if (typeof vars[key].callback == "function") {
        var ret = vars[key].callback(data)
        if (ret) {
          if (typeof ret == "object" && !(ret instanceof Array) && key in ret) {
            for (k in ret) {
              if (k in vars) {
                vars[k].value = ret[k]
              }
            }
          }
          else {
            vars[key].value = ret
          }
        }
      }
      else {
        vars[key].value = data
      }

    }
    else {
      vars.internal_error = "Could not load data from: \""+url+"\""
    }

    next()

  })

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Get Key Types from Data
//-------------------------------------------------------------------
d3plus.data.keys = function(vars,type) {

  if (vars.dev.value) d3plus.console.time("key analysis")

  vars[type].keys = {}

  function get_keys(arr,add) {
    if (arr instanceof Array) {
      arr.forEach(function(d){
        get_keys(d)
      })
    }
    else if (typeof arr == "object") {
      for (var d in arr) {
        if (typeof arr[d] == "object") {
          get_keys(arr[d])
        }
        else if (!(d in vars[type].keys) && arr[d]) {
          vars[type].keys[d] = typeof arr[d]
        }
      }
      if (add) {
        arr.d3plus = {}
      }
    }
  }

  if (typeof vars[type].value == "object") {
    for (a in vars[type].value) {
      get_keys(vars[type].value[a],type == "data")
    }
  }
  else {
    get_keys(vars[type].value,type == "data")
  }

  if (vars.dev.value) d3plus.console.timeEnd("key analysis")

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Nests data...
//-------------------------------------------------------------------
d3plus.data.nest = function(vars,flat_data,levels,grouped) {

  var nested_data = d3.nest(), group_data = [];

  var checks = ["active","temp","total"]

  levels.forEach(function(nest_key, i){

    nested_data
      .key(function(d){
        return d3plus.variable.value(vars,d,nest_key)
      })

    vars.axes.values.forEach(function(axis){
      if (d3plus.apps[vars.type.value].requirements && d3plus.apps[vars.type.value].requirements.indexOf(axis) >= 0 && vars[axis].key && vars[axis].scale.value == "continuous") {
        nested_data
          .key(function(d){
            return d3plus.variable.value(vars,d,vars[axis].key)
          })
      }
    })

    if (i == levels.length-1) {

      nested_data.rollup(function(leaves){

        to_return = {
          "d3plus": {
            "depth": i
          }
        }

        checks.forEach(function(c){
          var key = vars[c].key ? vars[c].key : c
          to_return[key] = d3.sum(leaves, function(d){
            if (vars[c].key) {
              var a = d3plus.variable.value(vars,d,vars[c].key)
              if (typeof a != "number") {
                var a = a ? 1 : 0
              }
            }
            else if (c == "total") {
              var a = 1
            }
            else {
              var a = 0
            }
            return a
          })
          to_return.d3plus[key] = to_return[key]
        })

        var nest_obj = d3plus.variable.value(vars,leaves[0],nest_key)
        to_return[nest_key] = nest_obj

        for (key in vars.data.keys) {
          if (((levels.indexOf(nest_key) >= 0 && levels.indexOf(key) <= levels.indexOf(nest_key)) || (vars.id.nesting.indexOf(nest_key) >= 0 && vars.id.nesting.indexOf(key) <= vars.id.nesting.indexOf(nest_key)))
            && key in leaves[0]
            && (!vars.active.key || key != vars.active.key) && key != "d3plus") {
            if (typeof vars.aggs.value[key] == "function") {
              to_return[key] = vars.aggs.value[key](leaves)
            }
            else if (typeof vars.aggs.value[key] == "string") {
              to_return[key] = d3[vars.aggs.value[key]](leaves, function(d){ return d[key]; })
            }
            else if ([vars.time.key,vars.icon].indexOf(key) >= 0 || (key == nest_key && !to_return[key]) || (vars.x.key == key && vars.x.scale.value == "continuous") || (vars.y.key == key && vars.y.scale.value == "continuous")) {
              to_return[key] = leaves[0][key];
            }
            else if (vars.data.keys[key] === "number" && vars.id.nesting.indexOf(key) < 0) {
              to_return[key] = d3.sum(leaves, function(d){ return d[key]; })
            }
            else if (key) {
              to_return[key] = leaves[0][key]
            }
          }
        }

        if (grouped) {
          group_data.push(to_return)
        }

        return to_return

      })
    }

  })

  rename_key_value = function(obj) {
    if (obj.values && obj.values.length) {
      obj.children = obj.values.map(function(obj) {
        return rename_key_value(obj);
      })
      delete obj.values
      return obj
    }
    else if(obj.values) {
      return obj.values
    }
    else {
      return obj;
    }
  }

  find_keys = function(obj,depth,keys) {
    if (obj.children) {
      if (vars.data.keys[levels[depth]] == "number") {
        obj.key = parseFloat(obj.key)
      }
      keys[levels[depth]] = obj.key
      delete obj.key
      for (k in keys) {
        obj[k] = keys[k]
      }
      depth++
      obj.children.forEach(function(c){
        find_keys(c,depth,keys)
      })
    }
  }

  nested_data = nested_data
    .entries(flat_data)
    .map(rename_key_value)
    .map(function(obj){
      find_keys(obj,0,{})
      return obj
    })

  if (grouped) {
    return group_data
  }

  return nested_data;

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Calculates node positions, if needed for network
//-------------------------------------------------------------------
d3plus.data.nodes = function(vars) {

  var set = vars.nodes.value.filter(function(n){
    return typeof n.x == "number" && typeof n.y == "number"
  }).length

  if (set == vars.nodes.value.length) {
    vars.nodes.positions = true
  }
  else {

    var force = d3.layout.force()
      .size([vars.app_width,vars.app_height])
      .nodes(vars.nodes.value)
      .links(vars.edges.value)

    var iterations = 50,
        threshold = 0.01;

    force.start(); // Defaults to alpha = 0.1
    for (var i = iterations; i > 0; --i) {
      force.tick();
      if(force.alpha() < threshold) {
        break;
      }
    }
    force.stop();

    vars.nodes.positions = true

  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Restricts data based on Solo/Mute filters
//------------------------------------------------------------------------------
d3plus.data.restrict = function(vars) {

  vars.filtered = true

  // if "solo", only check against "solo" (disregard "mute")
  var key = vars.solo.length ? "solo" : "mute"

  vars.data.grouped = null
  vars.data.restricted = {}

  if (vars[key].length) {
    
    // start restricting based on "filtered" data
    var data = "filtered"

    vars[key].forEach(function(v){

      if (vars.dev.value) d3plus.console.time(v)

      function test_value(val) {

        if (!(vars[v][key] instanceof Array)) {
          var arr = vars[v][key].value
        }
        else {
          var arr = vars[v][key]
        }

        if (v == "id" && key == "solo" && vars.focus.value && arr.indexOf(vars.focus.value) < 0) {
          arr.push(vars.focus.value)
        }

        var match = false
        arr.forEach(function(f){
          if (typeof f == "function") {
            match = f(val)
          }
          else if (f == val) {
            match = true
          }

        })

        return match
      }

      function nest_check(d) {

        // if the variable has nesting, check all levels
        var match = false

        if (vars[v].nesting) {
          vars[v].nesting.forEach(function(n){
            if (!match) {
              match = test_value(d3plus.variable.value(vars,d,n))
            }
          })
        }
        else {
          var k = vars[v].value ? vars[v].value : vars[v].key
          match = test_value(d3plus.variable.value(vars,d,k))
        }

        if (key == "solo") {
          return match
        }
        else if (key == "mute") {
          return !match
        }

      }

      for (y in vars.data[data]) {
        vars.data.restricted[y] = vars.data[data][y].filter(nest_check)
      }

      if (v == "id") {

        if (vars.nodes.value) {
          if (vars.dev.value) d3plus.console.log("Filtering Nodes")
          vars.nodes.restricted = vars.nodes.value.filter(nest_check)
        }

        if (vars.edges.value) {
          if (vars.dev.value) d3plus.console.log("Filtering Connections")
          vars.edges.restricted = vars.edges.value.filter(function(d){
            var first_match = nest_check(d[vars.edges.source]),
                second_match = nest_check(d[vars.edges.target])
            return first_match && second_match
          })
        }

      }

      // continue restricting on already "restricted" data
      data = "restricted"

      if (vars.dev.value) d3plus.console.timeEnd(v)

    })

  }
  else {

    vars.data.restricted = vars.data.filtered

  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Merges data underneath the size threshold
//-------------------------------------------------------------------
d3plus.data.threshold = function(vars,split) {

  if (!vars.size.threshold) {
    var threshold = 0
  }
  else if (typeof vars.size.threshold === "number") {
    var threshold = vars.size.threshold
  }
  else if (typeof d3plus.apps[vars.type.value].threshold === "number") {
    var threshold = d3plus.apps[vars.type.value].threshold
  }
  else {
    var threshold = 0.02
  }

  if (typeof threshold == "number" && threshold > 0) {

    var allowed = [],
        cutoff = vars.depth.value == 0 ? 0 : {},
        removed = [],
        largest = {}

    var nest = d3.nest()

    if (split) {
      nest
        .key(function(d){
          return d3plus.variable.value(vars,d,split)
        })
    }

    nest
      .rollup(function(leaves){
        var total = leaves.length
        if (vars.aggs[vars.size.key]) {
          if (typeof vars.aggs[vars.size.key] == "function") {
            total = vars.aggs[vars.size.key](leaves)
          }
          else if (typeof vars.aggs[vars.size.key] == "string") {
            total = d3[vars.aggs[vars.size.key]](leaves,function(l){
              return d3plus.variable.value(vars,l,vars.size.key)
            })
          }
        }
        else {
          total = d3.sum(leaves,function(l){
            return d3plus.variable.value(vars,l,vars.size.key)
          })
        }
        var x = split ? d3plus.variable.value(vars,leaves[0],split) : "all"
        largest[x] = total
        return total
      })
      .entries(vars.data.app)

    vars.data.app = vars.data.app.filter(function(d){

      var id = d3plus.variable.value(vars,d,vars.id.key),
          val = d3plus.variable.value(vars,d,vars.size.key),
          x = split ? d3plus.variable.value(vars,d,split) : "all"

      if (allowed.indexOf(id) < 0) {
        if (val/largest[x] >= threshold) {
          allowed.push(id)
        }

      }

      if (allowed.indexOf(id) < 0) {
        if (vars.depth.value == 0) {
          if (val > cutoff) cutoff = val
        }
        else {
          var parent = d[vars.id.nesting[vars.depth.value-1]]
          if (!(parent in cutoff)) cutoff[parent] = 0
          if (val > cutoff[parent]) cutoff[parent] = val
        }
        removed.push(d)
        return false
      }
      else {
        return true
      }

    })

    var levels = vars.id.nesting.slice(0,vars.depth.value)
    var nesting = levels.concat([vars.x.key])
    var merged = d3plus.data.nest(vars,removed,nesting,true).filter(function(d){
      return d3plus.variable.value(vars,d,vars.size.key) > 0
    })

    merged.forEach(function(m){

      var parent = vars.id.nesting[vars.depth.value-1]

      m.d3plus = {}

      vars.id.nesting.forEach(function(d,i){

        if (vars.depth.value == i) {
          var prev = m[vars.id.nesting[i-1]]
          if (prev) {
            m[d] = "d3plus_other_"+prev
          }
          else {
            m[d] = "d3plus_other"
          }
        }
        else if (i > vars.depth.value) {
          delete m[d]
        }
      })

      if (vars.color.key && vars.color.type == "string") {
        if (vars.depth.value == 0) {
          m[vars.color.key] = vars.style.color.missing
        }
        else {
          m[vars.color.key] = d3plus.variable.color(vars,m[parent],parent)
        }
      }

      if (vars.icon.key && vars.depth.value != 0) {
        m[vars.icon.key] = d3plus.variable.value(vars,m[parent],vars.icon.key,parent)
        m.d3plus.depth = vars.id.nesting.indexOf(parent)
      }

      if (vars.text.key) {
        if (vars.depth.value == 0) {
          m[vars.text.key] = vars.format("Values")
          m[vars.text.key] += " < "+vars.format(cutoff)
        }
        else {
          var name = d3plus.variable.value(vars,m,vars.text.key,parent)
          m[vars.text.key] = name
          m[vars.text.key] += " < "+vars.format(cutoff[m[parent]],vars.size.key)
        }
        m[vars.text.key] += " ("+vars.format(threshold*100)+"%)"

        m.d3plus.threshold = cutoff
        if (parent) {
          m.d3plus.merged = []
          removed.forEach(function(r){
            if (m[parent] == r[parent]) {
              m.d3plus.merged.push(r[vars.id.key])
            }
          })
        }
        else {
          m.d3plus.merged = d3plus.util.uniques(removed,vars.id.key)
        }

      }

    })

    vars.data.app = vars.data.app.concat(merged)

  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Miscellaneous Error Checks
//------------------------------------------------------------------------------
d3plus.draw.app = function(vars) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Draw the specified app
  //-------------------------------------------------------------------
  // Set vars.group to the app's specific group element
  vars.group = vars.g.apps[vars.type.value]
  // Reset mouse events for the app to use
  vars.mouse = {}

  if (!vars.internal_error) {

    if (vars.dev.value) d3plus.console.group("Calculating \"" + vars.type.value + "\"")
    var returned = d3plus.apps[vars.type.value].draw(vars)
    if (vars.dev.value) d3plus.console.groupEnd();

  }
  else {
    var returned = null
  }
  
  vars.returned = {
      "nodes": null,
      "edges": null
    }

  if (returned instanceof Array) {
    vars.returned.nodes = returned
  }
  else if (returned) {
    if (returned.nodes) {
      vars.returned.nodes = returned.nodes
    }
    if (returned.edges) {
      vars.returned.edges = returned.edges
    }
  }

  var nodes = vars.returned.nodes
  if (!nodes || !(nodes instanceof Array) || !nodes.length) {
    if (vars.dev.value) d3plus.console.log("No data returned by app.")
    vars.returned.nodes = []
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// If placing into a new container, remove it's contents
// and check text direction.
//
// Also initialized app width and height.
//------------------------------------------------------------------------------
d3plus.draw.container = function(vars) {

  if (vars.container.changed) {

    vars.parent = d3.select(vars.container.value)

    vars.parent
      .style("overflow","hidden")
      .style("position",function(){
        var current = d3.select(this).style("position"),
            remain = ["absolute","fixed"].indexOf(current) >= 0
        return remain ? current : "relative";
      })
      .html("")

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Get overall width and height, if not defined
    //--------------------------------------------------------------------------
    var sizes = ["width","height"]
    sizes.forEach(function(s){
      if (!vars[s].value) {
        function check_parent(element) {

          if (element.tagName === undefined || ["BODY","HTML"].indexOf(element.tagName) >= 0) {
            var val = window["inner"+s.charAt(0).toUpperCase()+s.slice(1)]
              , elem = document != element ? d3.select(element) : null
            if (elem && s == "width") {
              val -= parseFloat(elem.style("margin-left"),10)
              val -= parseFloat(elem.style("margin-right"),10)
              val -= parseFloat(elem.style("padding-left"),10)
              val -= parseFloat(elem.style("padding-right"),10)
            }
            else if (elem && s == "height") {
              val -= parseFloat(elem.style("margin-top"),10)
              val -= parseFloat(elem.style("margin-bottom"),10)
              val -= parseFloat(elem.style("padding-top"),10)
              val -= parseFloat(elem.style("padding-bottom"),10)
            }
            if (d3.selectAll("body > *:not(script)").size() == 1) {
              d3.select("body").style("overflow","hidden")
            }
            if (val <= 20) {
              val = vars[s].small
            }
            vars[s].value = val
          }
          else {

            var val = parseFloat(d3.select(element).style(s),10)
            if (typeof val == "number" && val > 0) {
              vars[s].value = val
            }
            else if (element.tagName != "BODY") {
              check_parent(element.parentNode)
            }

          }

        }
        check_parent(vars.parent.node())
      }
    })

    vars.parent
      .style("width",vars.width.value+"px")
      .style("height",vars.height.value+"px")

  }

  vars.app_width = vars.width.value;
  vars.app_height = vars.height.value;

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Enter Elements
//------------------------------------------------------------------------------
d3plus.draw.enter = function(vars) {

  // Enter SVG
  vars.svg = vars.parent.selectAll("svg#d3plus").data([0]);
  vars.svg.enter().insert("svg","#d3plus_message")
    .attr("id","d3plus")
    .attr("width",vars.width.value)
    .attr("height",vars.height.value)
    .attr("xmlns","http://www.w3.org/2000/svg")
    .attr("xmlns:xmlns:xlink","http://www.w3.org/1999/xlink")

  // Enter BG Rectangle
  vars.g.bg = vars.svg.selectAll("rect#bg").data(["bg"]);
  vars.g.bg.enter().append("rect")
    .attr("id","bg")
    .attr("fill",vars.style.background)
    .attr("width",vars.width.value)
    .attr("height",vars.height.value)

  // Enter Timeline Group
  vars.g.timeline = vars.svg.selectAll("g#timeline").data(["timeline"])
  vars.g.timeline.enter().append("g")
    .attr("id","timeline")
    .attr("transform","translate(0,"+vars.height.value+")")

  // Enter Key Group
  vars.g.legend = vars.svg.selectAll("g#key").data(["key"])
  vars.g.legend.enter().append("g")
    .attr("id","key")
    .attr("transform","translate(0,"+vars.height.value+")")

  // Enter Footer Group
  vars.g.footer = vars.svg.selectAll("g#footer").data(["footer"])
  vars.g.footer.enter().append("g")
    .attr("id","footer")
    .attr("transform","translate(0,"+vars.height.value+")")

  // Enter App Clipping Mask
  vars.g.clipping = vars.svg.selectAll("#clipping").data(["clipping"])
  vars.g.clipping.enter().append("clipPath")
    .attr("id","clipping")
    .append("rect")
      .attr("width",vars.app_width)
      .attr("height",vars.app_height)

  // Enter Container Group
  vars.g.container = vars.svg.selectAll("g#container").data(["container"])
  vars.g.container.enter().append("g")
    .attr("id","container")
    .attr("clip-path","url(#clipping)")
    .attr("transform","translate("+vars.margin.left+","+vars.margin.top+")")

  // Enter Zoom Group
  vars.g.zoom = vars.g.container.selectAll("g#zoom").data(["zoom"])
  vars.g.zoom.enter().append("g")
    .attr("id","zoom")

  // Enter App Background Group
  vars.g.viz = vars.g.zoom.selectAll("g#d3plus_viz").data(["d3plus_viz"])
  vars.g.viz.enter().append("g")
    .attr("id","d3plus_viz")

  // Enter App Overlay Rect
  vars.g.overlay = vars.g.viz.selectAll("rect#d3plus_overlay").data([{"id":"d3plus_overlay"}])
  vars.g.overlay.enter().append("rect")
    .attr("id","d3plus_overlay")
    .attr("width",vars.width.value)
    .attr("height",vars.height.value)
    .attr("opacity",0)

  if (!d3plus.touch) {

    vars.g.overlay
      .on(d3plus.evt.move,function(d){

        if (d.dragging) {

        }
        else if (d3plus.apps[vars.type.value].zoom && vars.zoom.pan.value &&
          vars.zoom_behavior.scaleExtent()[0] < vars.zoom.scale) {
          d3.select(this).style("cursor",d3plus.prefix()+"grab")
        }
        else {
          d3.select(this).style("cursor","auto")
        }

      })
      .on(d3plus.evt.up,function(d){

        if (d3plus.apps[vars.type.value].zoom && vars.zoom.pan.value &&
          vars.zoom_behavior.scaleExtent()[0] < vars.zoom.scale) {
          d.dragging = false
          d3.select(this).style("cursor",d3plus.prefix()+"grab")
        }
        else {
          d3.select(this).style("cursor","auto")
        }

      })
      .on(d3plus.evt.down,function(d){

        if (d3plus.apps[vars.type.value].zoom && vars.zoom.pan.value &&
          vars.zoom_behavior.scaleExtent()[0] < vars.zoom.scale) {
          d.dragging = true
          d3.select(this).style("cursor",d3plus.prefix()+"grabbing")
        }
        else {
          d3.select(this).style("cursor","auto")
        }

      })

  }
  else {

    vars.g.overlay
      .on(d3plus.evt.over,vars.touchEvent)
      .on(d3plus.evt.move,vars.touchEvent)
      .on(d3plus.evt.out,vars.touchEvent)

  }

  // Enter App Background Group
  vars.g.app = vars.g.viz.selectAll("g#app").data(["app"])
  vars.g.app.enter().append("g")
    .attr("id","app")

  // Enter Edges Group
  vars.g.edges = vars.g.viz.selectAll("g#edges").data(["edges"])
  vars.g.edges.enter().append("g")
    .attr("id","edges")
    .attr("opacity",0)

  // Enter Edge Focus Group
  vars.g.edge_focus = vars.g.viz.selectAll("g#focus").data(["focus"])
  vars.g.edge_focus.enter().append("g")
    .attr("id","focus")

  // Enter Edge Hover Group
  vars.g.edge_hover = vars.g.viz.selectAll("g#edge_hover").data(["edge_hover"])
  vars.g.edge_hover.enter().append("g")
    .attr("id","edge_hover")
    .attr("opacity",0)

  // Enter App Data Group
  vars.g.data = vars.g.viz.selectAll("g#data").data(["data"])
  vars.g.data.enter().append("g")
    .attr("id","data")
    .attr("opacity",0)

  // Enter Data Focus Group
  vars.g.data_focus = vars.g.viz.selectAll("g#data_focus").data(["data_focus"])
  vars.g.data_focus.enter().append("g")
    .attr("id","data_focus")

  // Enter Top Label Group
  vars.g.labels = vars.g.viz.selectAll("g#d3plus_labels").data(["d3plus_labels"])
  vars.g.labels.enter().append("g")
    .attr("id","d3plus_labels")

  vars.defs = vars.svg.selectAll("defs").data(["defs"])
  vars.defs.enter().append("defs")

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Miscellaneous Error Checks
//------------------------------------------------------------------------------
d3plus.draw.errors = function(vars) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Check to see if we have all required variables set
  //----------------------------------------------------------------------------
  var reqs = ["id"]
  if (d3plus.apps[vars.type.value].requirements) {
    reqs = reqs.concat(d3plus.apps[vars.type.value].requirements)
  }
  var missing = []
  reqs.forEach(function(r){
    var key = "key" in vars[r] ? "key" : "value"
    if (!vars[r][key]) missing.push(r)
  })
  if (missing.length) {
    vars.internal_error = "The following variables need to be set: "+missing.join(", ")
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Check to see if we have focus connections, if needed
  //----------------------------------------------------------------------------
  if (!vars.internal_error && reqs.indexOf("edges") >= 0 && reqs.indexOf("focus") >= 0) {
    var connections = vars.connections(vars.focus.value)
    if (connections.length == 0) {
      var name = d3plus.variable.text(vars,vars.focus.value,vars.depth.value)
      vars.internal_error = "No Connections Available for \""+name+"\""
    }
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Check to see if we have all required libraries
  //----------------------------------------------------------------------------
  var reqs = ["d3"]
  if (d3plus.apps[vars.type.value].libs) {
    reqs = reqs.concat(d3plus.apps[vars.type.value].libs)
  }
  var missing = []
  reqs.forEach(function(r){
    if (!window[r]) missing.push(r)
  })
  if (missing.length) {
    var libs = missing.join(", ")
    vars.internal_error = "The following libraries need to be loaded: "+libs
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Check to see if the requested app supports the set shape
  //----------------------------------------------------------------------------
  if (!vars.shape.value) {
    vars.shape.value = d3plus.apps[vars.type.value].shapes[0]
  }
  else if (d3plus.apps[vars.type.value].shapes.indexOf(vars.shape.value) < 0) {
    var shapes = d3plus.apps[vars.type.value].shapes.join("\", \"")
    d3plus.console.warning("\""+vars.shape.value+"\" is not an accepted shape for the \""+vars.type.value+"\" app, please use one of the following: \""+shapes+"\"")
    vars.shape.previous = vars.shape.value
    vars.shape.value = d3plus.apps[vars.type.value].shapes[0]
    d3plus.console.log("Defaulting shape to \""+vars.shape.value+"\"")
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Check to see if the requested app supports the set "mode"
  //----------------------------------------------------------------------------
  if ("modes" in d3plus.apps[vars.type.value]) {
    if (!vars.type.mode.value) {
      vars.type.mode.value = d3plus.apps[vars.type.value].modes[0]
    }
    else if (d3plus.apps[vars.type.value].modes.indexOf(vars.type.mode.value) < 0) {
      var modes = d3plus.apps[vars.type.value].modes.join("\", \"")
      d3plus.console.warning("\""+vars.type.mode.value+"\" is not an accepted mode for the \""+vars.type.value+"\" app, please use one of the following: \""+modes+"\"")
      vars.type.mode.previous = vars.type.mode.value
      vars.type.mode.value = d3plus.apps[vars.type.value].modes[0]
      d3plus.console.log("Defaulting mode to \""+vars.type.mode.value+"\"")
    }
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Finalize Visualization
//------------------------------------------------------------------------------
d3plus.draw.finish = function(vars) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Zoom to fit bounds, if applicable
  //----------------------------------------------------------------------------
  if (d3plus.apps[vars.type.value].zoom && vars.zoom.value) {

    if (vars.dev.value) d3plus.console.time("calculating zoom")

    if (!vars.init && vars.zoom.bounds) {
      d3plus.zoom.bounds(vars,vars.zoom.bounds,0)
    }

    if (vars.focus.changed || vars.height.changed || vars.width.changed) {
      if (!vars.zoom.viewport) {
        d3plus.zoom.bounds(vars,vars.zoom.bounds)
      }
      else {
        d3plus.zoom.bounds(vars,vars.zoom.viewport)
      }
    }

    if (vars.dev.value) d3plus.console.timeEnd("calculating zoom")

  }
  else {
    vars.zoom.scale = 1
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Resize/Reposition Overlay Rect for Mouse events
  //----------------------------------------------------------------------------
  var w = vars.zoom.size ? vars.zoom.size.width : vars.app_width,
      h = vars.zoom.size ? vars.zoom.size.height : vars.app_height,
      x = vars.zoom.bounds ? vars.zoom.bounds[0][0] : 0,
      y = vars.zoom.bounds ? vars.zoom.bounds[0][1] : 0

  vars.g.overlay
    .attr("width",w)
    .attr("height",h)
    .attr("x",x)
    .attr("y",y)

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Create labels
  //----------------------------------------------------------------------------
  if (vars.update) {
    d3plus.shape.edges(vars)
    if (vars.timing || (!d3plus.apps[vars.type.value].zoom && !vars.timing)) {
      if (vars.dev.value) d3plus.console.time("data labels")
      d3plus.shape.labels(vars,vars.g.data.selectAll("g"))
      if (vars.dev.value) d3plus.console.timeEnd("data labels")
      if (vars.edges.label) {

        setTimeout(function(){
          if (vars.dev.value) d3plus.console.time("edge labels")
          d3plus.shape.labels(vars,vars.g.edges.selectAll("g"))
          if (vars.dev.value) d3plus.console.timeEnd("edge labels")
        },vars.timing)

      }
    }
  }
  else if (d3plus.apps[vars.type.value].zoom && vars.zoom.value && vars.timing) {
    setTimeout(function(){
      d3plus.zoom.labels(vars)
    },vars.timing)
  }

  if (d3plus.apps[vars.type.value].zoom && vars.zoom.value && vars.focus.value && !vars.timing) {
    if (vars.dev.value) d3plus.console.time("focus labels")
    d3plus.shape.labels(vars,vars.g.data_focus.selectAll("g"))
    if (vars.edges.label) {

      setTimeout(function(){
        d3plus.shape.labels(vars,vars.g.edge_focus.selectAll("g"))
      },vars.timing)

    }
    if (vars.dev.value) d3plus.console.timeEnd("focus labels")
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Check for Errors
  //----------------------------------------------------------------------------
  if (!vars.internal_error) {
    var data_req = d3plus.apps[vars.type.value].requirements.indexOf("data") >= 0
    if ((!vars.data.app || !vars.returned.nodes.length) && data_req) {
      vars.internal_error = "No Data Available"
    }
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Hide the previous app, if applicable
  //----------------------------------------------------------------------------
  var prev = vars.type.previous
  if (prev && vars.type.value != prev && vars.g.apps[prev]) {
    if (vars.dev.value) d3plus.console.group("Hiding \"" + prev + "\"")
    if (vars.timing) {
      vars.g.apps[prev].transition().duration(vars.timing)
        .attr("opacity",0)
    }
    else {
      vars.g.apps[prev].attr("opacity",0)
    }
    if (vars.dev.value) d3plus.console.groupEnd();
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Show the current app, data, and edges groups
  //----------------------------------------------------------------------------
  var data_req = d3plus.apps[vars.type.value].requirements.indexOf("data") >= 0,
      new_opacity = (data_req && vars.data.app.length == 0) || vars.internal_error
        ? 0 : vars.focus.value && d3plus.apps[vars.type.value].zoom && vars.zoom.value ? 0.4 : 1,
      old_opacity = vars.group.attr("opacity")

  if (new_opacity != old_opacity) {

    var timing = vars.style.timing.transitions

    vars.group.transition().duration(timing)
      .attr("opacity",new_opacity)
    vars.g.data.transition().duration(timing)
      .attr("opacity",new_opacity)
    vars.g.edges.transition().duration(timing)
      .attr("opacity",new_opacity)

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Reset all "changed" values to false
  //----------------------------------------------------------------------------
  function reset_change(obj) {

    if (obj.changed) obj.changed = false

    for (o in obj) {
      if (obj[o] != null && typeof obj[o] == "object" && !(obj[o] instanceof Array)) {
        reset_change(obj[o])
      }
    }

  }
  reset_change(vars)

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Display and reset internal_error, if applicable
  //----------------------------------------------------------------------------
  if (vars.internal_error) {
    d3plus.ui.message(vars,vars.internal_error)
    vars.internal_error = null
  }
  else {
    d3plus.ui.message(vars)
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Unfreeze controls and apply zoom behavior, if applicable
  //----------------------------------------------------------------------------
  setTimeout(function(){

    vars.frozen = false
    vars.update = true
    vars.init = true

    if (d3plus.apps[vars.type.value].zoom && vars.zoom.value) {
      vars.g.zoom
        .datum(vars)
        .call(vars.zoom_behavior.on("zoom",d3plus.zoom.mouse))
      if (!vars.zoom.scroll.value) {
        vars.g.zoom.on("wheel.zoom",null)
      }
      if (!vars.zoom.click.value) {
        vars.g.zoom.on("dblclick.zoom",null)
      }
      if (!vars.zoom.pan.value) {
        vars.g.zoom.on("mousemove.zoom",null)
        vars.g.zoom.on("mousedown.zoom",null)
      }
    }
    else {
      vars.g.zoom
        .call(vars.zoom_behavior.on("zoom",null))
    }

  },vars.timing)

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates focus elements, if available
//------------------------------------------------------------------------------
d3plus.draw.focus = function(vars) {

  vars.g.edge_focus
    .selectAll("g")
    .remove()

  vars.g.data_focus
    .selectAll("g")
    .remove()

  if (vars.focus.value && d3plus.apps[vars.type.value].zoom && vars.zoom.value) {

    if (vars.dev.value) d3plus.console.time("drawing focus elements")

    var edges = vars.g.edges.selectAll("g")

    if (edges.size() > 0) {

      edges.each(function(l){

          var source = l[vars.edges.source][vars.id.key],
              target = l[vars.edges.target][vars.id.key]

          if (source == vars.focus.value || target == vars.focus.value) {
            var elem = vars.g.edge_focus.node().appendChild(this.cloneNode(true))
            d3.select(elem).datum(l).attr("opacity",1)
              .selectAll("line, path").datum(l)
          }

        })


      var marker = vars.edges.arrows.value

      vars.g.edge_focus.selectAll("line, path")
        .attr("vector-effect","non-scaling-stroke")
        .style("stroke",vars.style.highlight.focus)
        .style("stroke-width",function(){
          return vars.edges.size ? d3.select(this).style("stroke-width")
               : vars.style.data.stroke.width*2
        })
        .attr("marker-start",function(e){

          var direction = vars.edges.arrows.direction.value

          if ("bucket" in e.d3plus) {
            var d = "_"+e.d3plus.bucket
          }
          else {
            var d = ""
          }
          // console.log(e.d3plus,d)
          return direction == "source" && marker
               ? "url(#d3plus_edge_marker_focus"+d+")" : "none"

        })
        .attr("marker-end",function(e){

          var direction = vars.edges.arrows.direction.value

          if ("bucket" in e.d3plus) {
            var d = "_"+e.d3plus.bucket
          }
          else {
            var d = ""
          }

          return direction == "target" && marker
               ? "url(#d3plus_edge_marker_focus"+d+")" : "none"

        })

      vars.g.edge_focus.selectAll("text")
        .style("fill",vars.style.highlight.focus)

    }

    var focii = d3plus.util.uniques(vars.connections(vars.focus.value,true),vars.id.key)
    focii.push(vars.focus.value)

    var x_bounds = [], y_bounds = [], x_buffer = [0], y_buffer = [0]

    var groups = vars.g.data.selectAll("g")
      .each(function(d){
        if (focii.indexOf(d[vars.id.key]) >= 0) {
          var elem = vars.g.data_focus.node().appendChild(this.cloneNode(true))
          var elem = d3.select(elem).datum(d).attr("opacity",1)

          if (vars.shape.value == "coordinates") {

            vars.zoom.viewport = vars.path.bounds(vars.zoom.coords[d.d3plus.id])

          }
          else if ("d3plus" in d) {
            if ("x" in d.d3plus) {
              x_bounds.push(d.d3plus.x)
            }
            if ("y" in d.d3plus) {
              y_bounds.push(d.d3plus.y)
            }
            if ("r" in d.d3plus) {
              x_buffer.push(d.d3plus.r)
              y_buffer.push(d.d3plus.r)
            }
            else {
              if ("width" in d.d3plus) {
                x_buffer.push(d.d3plus.width/2)
              }
              if ("height" in d.d3plus) {
                y_buffer.push(d.d3plus.height/2)
              }
            }
          }

          for (e in d3plus.evt) {
            var evt = d3.select(this).on(d3plus.evt[e])
            if (evt) {
              elem.on(d3plus.evt[e],evt)
            }
          }

        }
      })

    if (x_bounds.length && y_bounds.length) {

      var xcoords = d3.extent(x_bounds),
          ycoords = d3.extent(y_bounds),
          xmax = d3.max(x_buffer),
          ymax = d3.max(y_buffer)

      vars.zoom.viewport = [
        [xcoords[0]-xmax,ycoords[0]-ymax],
        [xcoords[1]+xmax,ycoords[1]+ymax]
      ]

    }

    vars.g.data_focus.selectAll("path")
      .style("stroke-width",vars.style.data.stroke.width*2)

    if (vars.dev.value) d3plus.console.timeEnd("drawing focus elements")

  }
  else {
    vars.zoom.viewport = null
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Calculate steps needed to redraw the visualization
//------------------------------------------------------------------------------
d3plus.draw.steps = function(vars) {

  var steps = []

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Check to see if any data needs to be loaded with JSON
  //----------------------------------------------------------------------------
  var urlLoads = ["data","attrs","coords","nodes","edges"]
  urlLoads.forEach(function(u){
    if (typeof vars[u].value == "string" || (!vars[u].value && vars[u].url)) {

      steps.push({
        "function": function(vars,next){
          d3plus.data.json(vars,u,next)
        },
        "message": "Loading Data",
        "wait": true
      })

    }
  })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // If it has one, run the current app's setup function.
  //----------------------------------------------------------------------------
  steps.push({
    "check": function(vars) {
      return vars.update && typeof d3plus.apps[vars.type.value].setup == "function"
    },
    "function": d3plus.apps[vars.type.value].setup,
    "message": "Initializing \""+vars.type.value+"\""
  })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Remove any lingering tooltips.
  //----------------------------------------------------------------------------
  steps.push({
    "function": function(vars) {
      if (vars.type.previous && vars.type.value != vars.type.previous) {
        d3plus.tooltip.remove(vars.type.previous);
      }
      d3plus.tooltip.remove(vars.type.value);
    },
    "message": "Resetting Tooltips"
  })

  if (vars.update) {

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Create SVG group elements if the container is new or has changed
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {
        return vars.container.changed
      },
      "function": d3plus.draw.enter,
      "message": "Creating SVG Elements"
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Create group for current app, if it doesn't exist.
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {
        return !(vars.type.value in vars.g.apps)
      },
      "function": function(vars) {

        vars.g.apps[vars.type.value] = vars.g.app
          .selectAll("g#"+vars.type.value)
          .data([vars.type.value])

        vars.g.apps[vars.type.value].enter().append("g")
          .attr("id",vars.type.value)
          .attr("opacity",0)

      },
      "message": "Creating \""+vars.type.value+"\" Group"
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // If new data is detected, analyze and reset it.
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {
        return vars.data.changed
      },
      "function": function(vars) {

        vars.data.filtered = null
        vars.data.grouped = null
        vars.data.app = null
        vars.data.restricted = null
        vars.nodes.restricted = null
        vars.edges.restricted = null

        d3plus.data.keys(vars,"data")

      },
      "message": "Analyzing New Data"
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // If new attributes are detected, analyze them.
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {
        return vars.attrs.changed
      },
      "function": function(vars) {

        d3plus.data.keys(vars,"attrs")

      },
      "message": "Analyzing New Attributes"
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Format nodes/edges if needed
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {
        var edge_req = d3plus.apps[vars.type.value].requirements.indexOf("edges") >= 0
        return (!vars.edges.linked || vars.edges.changed)
          && edge_req && vars.edges.value
      },
      "function": d3plus.data.edges,
      "message": "Analyzing Network"
    })
    steps.push({
      "check": function(vars) {
        var node_req = d3plus.apps[vars.type.value].requirements.indexOf("nodes") >= 0
        return node_req && (!vars.nodes.positions || vars.nodes.changed)
          && vars.nodes.value && vars.edges.value
      },
      "function": d3plus.data.nodes,
      "message": "Analyzing Network"
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Filter Data if variables with "data_filter" have been changed
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {

        vars.check = []
        for (k in vars) {
          if (vars[k] && vars[k]["data_filter"] && vars[k].changed) {
            vars.check.push(k)
          }
        }

        return !vars.data.filtered || vars.check.length || vars.active.changed ||
          vars.temp.changed || vars.total.changed
      },
      "function": function(vars) {

        vars.data.grouped = null
        vars.data.app = null;

        d3plus.data.filter(vars)

      },
      "message": "Filtering Data"
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Restricts Filtered Data if objects have "Solo" or "Mute"
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {
        return vars.mute.length > 0 || vars.solo.length > 0
      },
      "function": d3plus.data.restrict,
      "message": "Filtering Data",
      "otherwise": function(vars) {

        if (vars.filtered || !vars.data.restricted || vars.check.length) {

          vars.data.restricted = d3plus.util.copy(vars.data.filtered)
          vars.data.grouped = null
          vars.data.app = null
          vars.nodes.restricted = null
          vars.edges.restricted = null
          vars.filtered = false

        }

      }
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Formats Data to type "group", if it does not exist.
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {
        return !vars.data.grouped
      },
      "function": function(vars) {
        vars.data.grouped = d3plus.data.format(vars,"grouped")
      },
      "message": "Formatting Data"
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Fetches data "pool" to use for scales and overall values
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {
        var year = !vars.time.fixed.value ? ["all"] : null
        return (year === null && (vars.time.solo.changed || vars.time.mute.changed || vars.depth.changed)) || !vars.data.pool
          || typeof d3plus.apps[vars.type.value].filter == "function"
      },
      "function": function(vars) {
        var year = !vars.time.fixed.value ? ["all"] : null
        vars.data.pool = d3plus.data.fetch(vars,"grouped",year)
        if (typeof d3plus.apps[vars.type.value].filter == "function") {
          vars.data.pool = d3plus.apps[vars.type.value].filter(vars,vars.data.pool)
        }
      },
      "message": "Formatting Data"
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Fetch the correct Data for the App
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {
        return !vars.data.app || vars.depth.changed ||
            vars.time.solo.changed || vars.time.mute.changed ||
            vars.solo.length || vars.mute.length
            || typeof d3plus.apps[vars.type.value].filter == "function"
      },
      "function": function(vars) {
        vars.data.app = d3plus.data.fetch(vars,"grouped")
        if (typeof d3plus.apps[vars.type.value].filter == "function") {
          vars.data.app = d3plus.apps[vars.type.value].filter(vars,vars.data.app)
        }
      },
      "message": "Formatting Data"
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Calculate color scale if type is number
    //--------------------------------------------------------------------------
    steps.push({
      "check": function(vars) {

        if (vars.color.changed && vars.color.key) {

          if (typeof vars.color.key == "object") {
            if (vars.color.key[vars.id.key]) {
              var color_id = vars.color.key[vars.id.key]
            }
            else {
              var color_id = vars.color.key[Object.keys(vars.color.key)[0]]
            }
          }
          else {
            var color_id = vars.color.key
          }

          if (vars.data.keys && color_id in vars.data.keys) {
            vars.color.type = vars.data.keys[color_id]
          }
          else if (vars.attrs.keys && color_id in vars.attrs.keys) {
            vars.color.type = vars.attrs.keys[color_id]
          }
          else {
            vars.color.type = undefined
          }

        }
        else if (!vars.color.key) {
          vars.color.type = vars.data.keys[vars.id.key]
        }

        return vars.color.key && vars.color.type == "number" &&
               vars.id.nesting.indexOf(vars.color.key) < 0 &&
               vars.data.value && vars.color.key != vars.id.key &&
                 (vars.color.changed || vars.data.changed || vars.depth.changed ||
                   (vars.time.fixed.value &&
                     (vars.time.solo.changed || vars.time.mute.changed)
                   )
                 )

      },
      "function": d3plus.data.color,
      "message": "Calculating Colors",
      "otherwise": function(vars) {
        if (vars.color.type != "number") {
          vars.color.scale = null
        }
      }
    })

  }

  steps.push({
    "function": function(vars) {
      vars.margin = {"top": 0, "right": 0, "bottom": 0, "left": 0}
      d3plus.ui.titles(vars)

      if (vars.update) {

        d3plus.ui.timeline(vars)
        d3plus.ui.legend(vars)

      }
      else {

        var timeline = vars.g.timeline.node().getBBox()
        timeline = timeline.height+timeline.y

        var legend = vars.g.legend.node().getBBox()
        legend = legend.height+legend.y

        if (legend && timeline) {
          var padding = vars.style.ui.padding*3
        }
        else if (legend || timeline) {
          var padding = vars.style.ui.padding*2
        }
        else {
          var padding = 0
        }

        vars.margin.bottom += timeline+legend+padding

      }

      d3plus.ui.history(vars)
      vars.app_height -= (vars.margin.top+vars.margin.bottom)
    },
    "message": "Updating UI"
  })

  steps.push({
    "function": [
      d3plus.ui.focus,
      d3plus.draw.update
    ],
    "message": "Updating UI"
  })

  steps.push({
    "function": function(vars) {
      if (vars.update) {
        d3plus.draw.errors(vars)
        d3plus.draw.app(vars)
        d3plus.shape.draw(vars)
      }
      d3plus.draw.focus(vars)
      d3plus.draw.finish(vars)
    },
    "message": "Drawing Visualization"
  })

  return steps

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Updating Elements
//------------------------------------------------------------------------------
d3plus.draw.update = function(vars) {

  if (vars.timing) {

    // Update Parent Element
    vars.parent.transition().duration(vars.timing)
      .style("width",vars.width.value+"px")
      .style("height",vars.height.value+"px")

    // Update SVG
    vars.svg.transition().duration(vars.timing)
        .attr("width",vars.width.value)
        .attr("height",vars.height.value)

    // Update Background Rectangle
    vars.g.bg.transition().duration(vars.timing)
        .attr("width",vars.width.value)
        .attr("height",vars.height.value)

    // Update App Clipping Rectangle
    vars.g.clipping.select("rect").transition().duration(vars.timing)
      .attr("width",vars.app_width)
      .attr("height",vars.app_height)

    // Update Container Groups
    vars.g.container.transition().duration(vars.timing)
      .attr("transform","translate("+vars.margin.left+","+vars.margin.top+")")

  }
  else {

    // Update Parent Element
    vars.parent
      .style("width",vars.width.value+"px")
      .style("height",vars.height.value+"px")

    // Update SVG
    vars.svg
      .attr("width",vars.width.value)
      .attr("height",vars.height.value)

    // Update Background Rectangle
    vars.g.bg
      .attr("width",vars.width.value)
      .attr("height",vars.height.value)

    // Update App Clipping Rectangle
    vars.g.clipping.select("rect")
      .attr("width",vars.app_width)
      .attr("height",vars.app_height)

    // Update Container Groups
    vars.g.container
      .attr("transform","translate("+vars.margin.left+","+vars.margin.top+")")

  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Detects if FontAwesome is loaded on the page
//------------------------------------------------------------------------------
d3plus.font.awesome = false
for (var s = 0; s < document.styleSheets.length; s++) {
  var sheet = document.styleSheets[s]
  if (sheet.href && sheet.href.indexOf("font-awesome") >= 0) {
    d3plus.font.awesome = true
    break;
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates test div to populate with test DIVs
//------------------------------------------------------------------------------
d3plus.font.tester = function() {

  var tester = d3.select("body").selectAll("div.d3plus_tester")
    .data(["d3plus_tester"])

  tester.enter().append("div")
    .attr("class","d3plus_tester")
    .style("position","absolute")
    .style("left","-9999px")
    .style("top","-9999px")
    .style("visibility","hidden")
    .style("display","block")

  return tester

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Given a single font or a list of font, determines which can be rendered
//------------------------------------------------------------------------------
d3plus.font.validate = function(test_fonts) {

  if (!(test_fonts instanceof Array)) {
    test_fonts = test_fonts.split(",")
  }

  var tester = d3plus.font.tester()

  function create_element(font) {

    return tester.append("span")
      .style("font-family",font)
      .style("font-size","32px")
      .style("padding","0px")
      .style("margin","0px")
      .text("abcdefghiABCDEFGHI_!@#$%^&*()_+1234567890")

  }

  function different(elem1,elem2) {

    var width1 = elem1.node().offsetWidth,
        width2 = elem2.node().offsetWidth

    return width1 !== width2

  }

  var monospace = create_element("monospace"),
      proportional = create_element("sans-serif")

  for (font in test_fonts) {

    var family = test_fonts[font].trim()

    var test = create_element(family+",monospace")

    var valid = different(test,monospace)
    test.remove()

    if (!valid) {
      var test = create_element(family+",sans-serif")
      valid = different(test,proportional)
      test.remove()
    }

    if (valid) {
      valid = family
      break;
    }

  }

  if (!valid) {
    valid = "sans-serif"
  }

  monospace.remove()
  proportional.remove()

  return valid

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates a Button
//------------------------------------------------------------------------------
d3plus.forms.button = function(vars,styles,timing) {

  if (vars.dev) d3plus.console.time("calculating borders and padding")
  if (styles.border == "all") {
    var border_width = styles.stroke+"px",
        padding = styles.padding+"px"
  }
  else {
    var sides = ["top","right","bottom","left"]
    var border_width = "", padding = ""
    sides.forEach(function(s,i){
      if (styles.border.indexOf(s) >= 0) {
        border_width += styles.stroke+"px"
        padding += styles.padding+"px"
      }
      else {
        border_width += "0px"
        padding += (styles.padding+styles.stroke)+"px"
      }
      if (i < sides.length-1) {
        border_width += " "
        padding += " "
      }
    })
  }

  var reversed = (styles["font-align"] == "right" && !d3plus.rtl) || (d3plus.rtl && styles["font-align"] == "right")
  if (vars.dev) d3plus.console.timeEnd("calculating borders and padding")

  var color = function(elem) {

    elem
      .style("background-color",function(d){

        if (vars.highlight != d.value) {
          if (vars.hover == d.value) {
            if (vars.highlight) {
              d.bg = d3plus.color.darker(styles.secondary,.05)
            }
            else {
              d.bg = d3plus.color.darker(styles.secondary,.05)
            }
          }
          else {
            d.bg = styles.secondary
          }
        }
        else {
          if (vars.hover == d.value && vars.enabled) {
            d.bg = d3plus.color.darker(styles.color,.025)
          }
          else {
            d.bg = styles.color
          }
        }

        return d.bg
      })
      .style("color",function(d){

        var text_color = d3plus.color.text(d.bg),
            image = d.image && button.size() < vars.large

        if (text_color != "#f7f7f7" && vars.selected == d.value && d.color && !image) {
          return d3plus.color.legible(d.color)
        }

        return text_color

      })
      .style("border-color",styles.secondary)
      .style("opacity",function(d){
        if ([vars.selected,vars.highlight].indexOf(d.value) < 0) {
          return 0.75
        }
        return 1
      })

  }

  var style = function(elem) {

    elem
      .style("position","relative")
      .style("margin",styles.margin+"px")
      .style("display",styles.display)
      .style("border-style","solid")
      .style("border-width",border_width)
      .style("font-family",styles["font-family"])
      .style("font-size",styles["font-size"]+"px")
      .style("font-weight",styles["font-weight"])
      .style("text-align",styles["font-align"])
      .style("letter-spacing",styles["font-spacing"]+"px")

  }

  var icons = function(elem) {

    elem
      .text(function(d){
        return d[vars.text]
      })
      .each(function(d,i){

        var children = []

        if (d.image && button.size() < vars.large) {
          children.push("image")
        }

        if (styles.icon) {
          d.icon = d3plus.util.copy(styles.icon)
          children.push("icon")
        }
        else if (d.value === vars.selected) {
          if (d3plus.font.awesome) {
            d.icon = {
              "class": "fa fa-check",
              "content": ""
            }
          }
          else {
            d.icon = {
              "class": "",
              "content": "&#x2713;"
            }
          }
          children.push("icon")
        }

        var buffer = 0

        var items = d3.select(this).selectAll("div.d3plus_button_element")
          .data(children,function(c,i){
            return c
          })

        items.enter().append("div")
          .style("display","absolute")
          .attr("id",function(c){
            return "d3plus_button_element_"+vars.id+"_"+c
          })
          .attr("class",function(c){
            var extra = ""
            if (c == "icon" && d.icon.class) {
              extra = " "+d[c].class
            }
            return "d3plus_button_element" + extra
          })

        items.order()
          .html(function(c){
            if (c == "icon") {
              return d.icon.content
            }
            else {
              return ""
            }
          })
          .style("background-image",function(c){
            if (c == "image") {
              return "url('"+d.image+"')"
            }
            return "none"
          })
          .style("background-color",function(c){
            if (c == "image" && d.style == "knockout") {
              return d.color || vars.color
            }
            return "transparent"
          })
          .style("background-size","100%")
          .style("text-align","center")
          .style("position",function(c){
            return c == "text" ? "static" : "absolute"
          })
          .style("width",function(c){

            if (styles.height) {
              buffer = (styles.height-(styles.padding*2)-(styles.stroke*2))
            }
            else {
              buffer = styles["font-size"]+styles.padding+styles.stroke
            }
            return buffer+"px"
          })
          .style("height",function(c){
            if (c == "image") {
              return buffer+"px"
            }
            return "auto"
          })
          .style("margin-top",function(c){
            if (this.offsetHeight) {
              var h = this.offsetHeight
            }
            else {
              var h = buffer
              if (c == "icon") h -= 3
            }
            return -h/2+"px"
          })
          .style("top","50%")
          .style("left",function(c){
            if ((c == "image" && !reversed) || (c == "icon" && reversed)) {
              return styles.padding+"px"
            }
            return "auto"
          })
          .style("right",function(c){
            if ((c == "image" && reversed) || (c == "icon" && !reversed)) {
              return styles.padding+"px"
            }
            return "auto"
          })

        items.exit().remove()

        if (buffer > 0) {

          buffer += styles.padding*2

          var p = styles.padding

          if (children.length == 2) {
            var padding = p+"px "+buffer+"px"
          }
          else if ((children[0] == "image" && !d3plus.rtl) || (children[0] == "icon" && d3plus.rtl)) {
            var padding = p+"px "+p+"px "+p+"px "+buffer+"px"
          }
          else {
            var padding = p+"px "+buffer+"px "+p+"px "+p+"px"
          }

          d3.select(this).style("padding",padding)

        }
        else {
          d3.select(this).style("padding",styles.padding+"px")
        }

        if (typeof styles.width == "number") {
          var width = styles.width
          width -= parseFloat(d3.select(this).style("padding-left"),10)
          width -= parseFloat(d3.select(this).style("padding-right"),10)
          width -= styles.stroke*2
          width += "px"
        }
        else {
          var width = "auto"
        }

        d3.select(this).style("width",width)

      })

  }

  function mouseevents(elem) {

    elem
      .on(d3plus.evt.over,function(d,i){

        vars.hover = d.value

        if (vars.data.array.length == 1 || d.value != vars.highlight) {

          if (d3plus.ie || vars.timing == 0) {

            d3.select(this).style("cursor","pointer")
              .call(color)

          }
          else {

            d3.select(this).style("cursor","pointer")
              .transition().duration(100)
              .call(color)
          }

        }
        else {
          d3.select(this).style("cursor","auto")
        }

      })
      .on(d3plus.evt.out,function(d){

        vars.hover = false

        if (d3plus.ie || button.size() >= vars.large) {
          d3.select(this).style("cursor","auto")
            .call(color)
        }
        else {
          d3.select(this).style("cursor","auto")
            .transition().duration(100)
            .call(color)
        }

      })
      .on("click",function(d){

        if (!vars.propagation) {
          d3.event.stopPropagation()
        }

        if (vars.callback && d.value) {

          vars.callback(d)

        }

      })

  }

  var button = vars.container.selectAll("div.d3plus_node")
    .data(vars.data.array,function(d){
      return d.id || d.value
    })

  if (vars.dev) d3plus.console.time("enter")
  button.enter().append("div")
    .attr("id","d3plus_button_"+vars.id)
    .attr("class","d3plus_node")
    .call(color)
    .call(style)
    .call(icons)
    .call(mouseevents)
  if (vars.dev) d3plus.console.timeEnd("enter")

  if (vars.update || button.size() < vars.large) {

    if (vars.dev) d3plus.console.time("ordering")
    button.order()
    if (vars.dev) d3plus.console.timeEnd("ordering")

    var updates = button

  }
  else {

    var checks = [
      vars.previous,
      vars.selected,
      vars.highlight,
      vars.hover,
      vars.hover_previous
    ].filter(function(c){
        return c
      })

    var updates = button.filter(function(b){
      return checks.indexOf(b.value) >= 0
    })

  }

  if (vars.dev) d3plus.console.time("update")
  if (vars.timing) {
    updates
      .transition().duration(vars.timing)
      .call(color)
      .call(style)
  }
  else {
    updates
      .call(color)
      .call(style)
  }
  updates.call(icons).call(mouseevents)
  if (vars.dev) d3plus.console.timeEnd("update")

  button.exit().remove()

}

d3plus.forms.data = function(vars) {

  if (vars.data.data) {

    if (!vars.data.array || (("replace" in vars.data && vars.data.replace === true) || !("replace" in vars.data))) {
      vars.data.array = []
    }

    var defaults = ["value","alt","keywords","image","style","color","selected","text"],
        vals = vars.data.map || {}

    defaults.forEach(function(d){
      if (!(d in vals)) {
        vals[d] = d
      }
    })

    vars.data.data.forEach(function(d){
      var obj = {}
      for (key in vals) {
        if (vals[key] in d) {
          obj[key] = d[vals[key]]
        }
      }
      vars.data.array.push(obj)
    })

    var sort = "sort" in vars.data ? vars.data.sort : "text"
    if (sort) {

      vars.data.array.sort(function(a,b){

        a = a[sort]
        b = b[sort]

        if (sort == "color") {

          a = d3.rgb(a_value).hsl()
          b = d3.rgb(b_value).hsl()

          if (a.s == 0) a = 361
          else a = a.h
          if (b.s == 0) b = 361
          else b = b.h

        }

        if(a < b) return -1;
        if(a > b) return 1;

      })

    }

  }

  vars.data.changed = true
  vars.loading = false

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates Dropdown Menu
//------------------------------------------------------------------------------
d3plus.forms.drop = function(vars,styles,timing) {

  if (vars.element) {
    vars.element.on("focus."+vars.id,function(){
      vars.forms.update(false).hover(true).draw()
    })
    vars.element.on("blur."+vars.id,function(){
      var search = vars.search ? d3.event.relatedTarget != vars.container.select("input").node() : true
      if (search) {
        vars.forms.update(false).hover(false).draw()
      }
    })
    vars.element.on("change."+vars.id,function(){
      vars.forms.value(vars.data.array[this.selectedIndex])
    })
    vars.element.on("keydown.cancel_"+vars.id,function(){
      // Only let TAB work
      var key = d3.event.keyCode
      if (key != 9) {
        d3.event.preventDefault()
      }
    })
  }

  d3.select(document).on("keydown."+vars.id,function(){

    if (vars.enabled || vars.hover === true) {

      var key = d3.event.keyCode,
          options = list.select("div").selectAll("div.d3plus_node"),
          index = 0

      if (typeof vars.hover == "boolean") {
        options.each(function(d,i){
          if (d.value == vars.focus) {
            index = i
          }
        })
      }
      else {
        options.each(function(d,i){
          if (d.value == vars.hover) {
            index = i
          }
        })
      }

      // Tab
      if ([9].indexOf(key) >= 0 && (!vars.search || (vars.search && !d3.event.shiftKey))) {
        vars.forms.update(false).disable()
      }
      // Down Arrow
      else if ([40].indexOf(key) >= 0) {
        if (vars.enabled) {
          if (index >= options.size()-1) {
            index = 0
          }
          else {
            index += 1
          }
        }

        if (typeof vars.hover != "boolean") {
          var hover = options.data()[index].value
        }
        else {
          var hover = vars.focus
        }

        if (vars.enabled) {
          vars.forms.update(false).hover(hover).draw(60)
        }
        else {
          vars.forms.update(false).hover(hover).enable()
        }

      }
      // Up Arrow
      else if ([38].indexOf(key) >= 0) {
        if (vars.enabled) {
          if (index <= 0) {
            index = options.size()-1
          }
          else {
            index -= 1
          }
        }

        if (typeof vars.hover != "boolean") {
          var hover = options.data()[index].value
        }
        else {
          var hover = vars.focus
        }

        if (vars.enabled) {
          vars.forms.update(false).hover(hover).draw(60)
        }
        else {
          vars.forms.update(false).hover(hover).enable()
        }

      }
      // Enter/Return
      else if ([13].indexOf(key) >= 0) {
        if (typeof vars.hover != "boolean") {
          vars.forms.value(vars.hover).hover(true).draw()
        }
        else {
          vars.forms.hover(vars.focus).toggle()
        }
      }
      // Esc
      else if ([27].indexOf(key) >= 0) {
        if (vars.enabled) {
          vars.forms.hover(true).disable()
        }
        else if (vars.hover === true) {
          vars.forms.hover(false).draw()
        }
      }

    }

  })

  function parent_click(elem) {

    d3.select(elem).on("click."+vars.id,function(){

      var element = d3.event.target || d3.event.toElement
      element = element.id
      var child = "_"+vars.id

      if (element.indexOf(child) < 0 && vars.enabled) {
        vars.forms.disable()
      }

    })

    try {
      var same_origin = window.parent.location.host == window.location.host;
    }
    catch (e) {
      var same_origin = false
    }

    if (same_origin) {
      if (elem.self !== window.top) {
        parent_click(elem.parent)
      }
    }

  }

  parent_click(window)

  if (styles.icon) {

    if (styles.icon.indexOf("fa-") == 0) {
      var icon = {
        "class": "d3plus_drop_icon fa "+styles.icon,
        "content": ""
      }
    }
    else {
      var icon = {
        "class": "d3plus_drop_icon",
        "content": styles.icon
      }
    }

  }
  else {
    var icon = false
  }

  var drop_width = d3plus.forms.value(styles.width,["drop","button"])
  if (!drop_width || typeof drop_width != "number") {

    if (vars.dev) d3plus.console.time("calculating width")

    var data = d3plus.util.copy(styles)

    if (!icon) {

      if (d3plus.font.awesome) {
        data.icon = {
          "class": "fa fa-check",
          "content": ""
        }
      }
      else {
        data.icon = {
          "class": "",
          "content": "&#x2713;"
        }
      }

    }
    else {
      data.icon = icon
    }

    data.display = "inline-block"
    data.border = "none"
    data.width = false
    data.margin = 0

    var text = d3plus.forms.value(vars.text,["drop","button"])
    if (!text) {
     text = "text"
    }

    var button = d3plus.forms(data)
      .type("button")
      .text(text)
      .data(vars.data.array)
      .parent(vars.tester)
      .id(vars.id)
      .timing(0)
      .large(9999)
      .draw()

    var w = button.width()
    drop_width = d3.max(w)
    drop_width += styles.stroke*2
    button.remove()

    if (vars.dev) d3plus.console.timeEnd("calculating width")

  }

  if (typeof styles.width != "object") {
    styles.width = {}
  }

  styles.width.drop = drop_width

  var button_width = d3plus.forms.value(styles.width,["button","drop"])
  if (!button_width || typeof button_width != "number") {
    button_width = drop_width
  }

  styles.width.button = button_width

  if (vars.dev) d3plus.console.time("creating main button")

  var style = d3plus.util.copy(styles)
  style.icon = icon
  style.width = button_width
  style.margin = 0
  if (vars.enabled) {
    style.shadow = 0
  }
  var text = d3plus.forms.value(vars.text,["button","drop"])
  if (!text) {
   text = "text"
  }
  var data = d3plus.util.copy(vars.data.array.filter(function(d){
    return d.value == vars.focus
  })[0])
  data.id = "drop_button"
  var test_data = d3plus.util.copy(data)
  test_data.text = "Test"
  var hover = vars.hover === true ? vars.focus : false

  if (vars.dev) d3plus.console.group("main button")
  var button = d3plus.forms(style)
    // .dev(vars.dev)
    .type("button")
    .text(text)
    .parent(vars.container)
    .id(vars.id)
    .timing(timing)
    .hover(hover)
    .data([test_data])
    .callback(vars.forms.toggle)
    .highlight(vars.focus)
    .update(vars.update)
    .enable()
    .draw()

  var line_height = button.height()

  button.data([data]).height(line_height).draw()

  if (vars.dev) d3plus.console.groupEnd()

  if (vars.dev) d3plus.console.timeEnd("creating main button")


  if (vars.dev) d3plus.console.time("creating dropdown")

  var selector = vars.container.selectAll("div.d3plus_drop_selector")
    .data(["selector"])

  selector.enter().append("div")
    .attr("class","d3plus_drop_selector")
    .style("position","absolute")
    .style("top","0px")
    .style("padding",styles.stroke+"px")
    .style("z-index","-1")
    .style("overflow","hidden")

  if (vars.dev) d3plus.console.timeEnd("creating dropdown")
  if (vars.dev && vars.search) d3plus.console.time("creating search")

  var search_style = d3plus.util.merge(styles,styles.drop)
  var search_data = vars.search ? ["search"] : []

  var search = selector.selectAll("div.d3plus_drop_search")
    .data(search_data)

  var search_width = styles.width.drop
  search_width -= styles.padding*4
  search_width -= styles.stroke*2

  if (timing) {
    search.transition().duration(timing)
      .style("padding",search_style.padding+"px")
      .style("display","block")
      .style("background-color",search_style.secondary)
  }
  else {
    search
      .style("padding",search_style.padding+"px")
      .style("display","block")
      .style("background-color",search_style.secondary)
  }

  function input_style(elem) {
    elem
      .style("padding",search_style.padding+"px")
      .style("width",search_width+"px")
      .style("border-style","solid")
      .style("border-width","0px")
      .style("font-family",search_style["font-family"])
      .style("font-size",search_style["font-size"]+"px")
      .style("font-weight",search_style["font-weight"])
      .style("text-align",search_style["font-align"])
      .attr("placeholder",vars.format("Search"))
      .style("outline","none")
      .style(d3plus.prefix()+"border-radius","0")
  }

  if (timing) {
    search.select("input").transition().duration(timing)
      .call(input_style)
  }
  else {
    search.select("input")
      .call(input_style)
  }

  search.enter().insert("div","#d3plus_drop_list_"+vars.id)
    .attr("class","d3plus_drop_search")
    .attr("id","d3plus_drop_search_"+vars.id)
    .style("padding",search_style.padding+"px")
    .style("display","block")
    .style("background-color",search_style.secondary)
    .append("input")
      .attr("id","d3plus_drop_input_"+vars.id)
      .style("-webkit-appearance","none")
      .call(input_style)

  search.select("input").on("keyup."+vars.id,function(d){
    if (vars.filter != this.value) {
      vars.filter = this.value
      vars.forms.draw()
    }
  })

  search.exit().remove()

  if (vars.dev && vars.search) d3plus.console.timeEnd("creating search")
  if (vars.dev) d3plus.console.time("populating list")

  var list = selector.selectAll("div.d3plus_drop_list")
    .data(["list"])

  list.enter().append("div")
    .attr("class","d3plus_drop_list")
    .attr("id","d3plus_drop_list_"+vars.id)
    .style("overflow-y","auto")
    .style("overflow-x","hidden")

  if (vars.loading) {
    var data = [
      {
        "text": vars.format("Loading...")
      }
    ]
  }
  else if (vars.enabled) {

    var search_text = d3plus.util.strip(vars.filter.toLowerCase()).split("_"),
        tests = ["value","text","alt","keywords"],
        search_text = search_text.filter(function(t){ return t != ""; })

    if (vars.filter == "") {
      var data = vars.data.array
    }
    else {

      var data = vars.data.array.filter(function(d){

        var match = false

        for (key in tests) {
          if (tests[key] in d && d[tests[key]]) {
            var text = d3plus.util.strip(d[tests[key]].toLowerCase()).split("_")

            for (t in text) {
              for (s in search_text) {
                if (text[t].indexOf(search_text[s]) == 0) {
                  match = true
                  break
                }
              }
            }
          }
        }
        return match
      })

    }

    if (data.length == 0) {
      data = [
        {
          "text": vars.format("No results match")+" \""+vars.filter+"\""
        }
      ]
    }

  }

  if (vars.dev) d3plus.console.timeEnd("populating list")

  var position = vars.container.node().getBoundingClientRect()

  var max = window.innerHeight-position.top

  max -= button.height()
  max -= 10
  if (max < button.height()*2) {
    max = position.top-10
    vars.flipped = true
  }
  var scrolling = false
  if (max > vars["max-height"]) {
    max = vars["max-height"]
  }

  if (vars.enabled) {

    if (vars.dev) d3plus.console.time("updating list items")

    if (vars.dev) d3plus.console.group("list buttons")

    var style = d3plus.util.merge(styles,styles.drop)
    style.icon = false
    style.display = "block"
    style.border = "none"
    style.width = "auto"
    style.margin = 0
    var text = d3plus.forms.value(vars.text,["drop","button"])
    if (!text) {
     text = "text"
    }

    var large = vars.data.array.length < vars.large ? vars.large : 0

    var buttons = d3plus.forms(style)
      .dev(vars.dev)
      .type("button")
      .text(text)
      .data(data)
      // .height(line_height)
      .parent(list)
      .id(vars.id+"_option")
      .timing(timing)
      .callback(vars.forms.value)
      .previous(vars.previous)
      .selected(vars.focus)
      .hover(vars.hover)
      .hover_previous(vars.hover_previous)
      .update(vars.update)
      .large(large)
      .draw()

    if (vars.dev) d3plus.console.groupEnd()

    if (vars.dev) d3plus.console.timeEnd("updating list items")
    if (vars.dev) d3plus.console.time("calculating height")

    var hidden = false
    if (selector.style("display") == "none") {
      var hidden = true
    }

    if (hidden) selector.style("display","block")

    var search_height = vars.search ? search[0][0].offsetHeight : 0

    var old_height = selector.style("height"),
        old_scroll = selector.property("scrollTop"),
        list_height = list.style("max-height"),
        list_scroll = list.property("scrollTop")

    selector.style("height","auto")
    list.style("max-height","200000px")

    var height = parseFloat(selector.style("height"),10)

    list
      .style("max-height",list_height)
      .property("scrollTop",list_scroll)
    selector
      .style("height",old_height)
      .property("scrollTop",old_scroll)

    if (height > max) {
      height = max
      scrolling = true
    }

    if (hidden) selector.style("display","none")

    if (vars.dev) d3plus.console.timeEnd("calculating height")

    if (scrolling) {

      if (vars.dev) d3plus.console.time("calculating scroll position")

      var index = 0
      var options = list.select("div").selectAll("div.d3plus_node")
      if (typeof vars.hover == "boolean") {
        options.each(function(d,i){
          if (d.value == vars.focus) {
            index = i
          }
        })
      }
      else {
        options.each(function(d,i){
          if (d.value == vars.hover) {
            index = i
          }
        })
      }

      var hidden = false
      if (selector.style("display") == "none") {
        hidden = true
      }
      var option = options[0][index]
      if (hidden) selector.style("display","block")
      var button_top = option.offsetTop,
          button_height = option.offsetHeight,
          list_top = list.property("scrollTop")

      if (hidden) selector.style("display","none")
      if (hidden || vars.data.changed) {

        var scroll = button_top

      }
      else {

        var scroll = list_top

        if (button_top < list_top) {
          var scroll = button_top
        }
        else if (button_top+button_height > list_top+max-search_height) {
          var scroll = button_top - (max-button_height-search_height)
        }

      }

      if (vars.dev) d3plus.console.timeEnd("calculating scroll position")

    }
    else {
      var scroll = 0
    }

  }
  else {
    var scroll = list.property("scrollTop"),
        height = 0,
        search_height = 0
  }

  if (vars.dev) d3plus.console.time("rotating arrow")

  var offset = icon.content == "&#x27A4;" ? 90 : 0
  if (vars.enabled != vars.flipped) {
    var rotate = "rotate(-"+(180-offset)+"deg)"
  }
  else {
    var rotate = "rotate("+offset+"deg)"
  }

  button.select("div#d3plus_button_element_"+vars.id+"_icon")
    .data(["icon"])
    .style(d3plus.prefix()+"transition",(timing/1000)+"s")
    .style(d3plus.prefix()+"transform",rotate)
    .style("opacity",function(){
      return vars.enabled ? 0.5 : 1
    })

  if (vars.dev) d3plus.console.timeEnd("rotating arrow")

  if (vars.dev) d3plus.console.time("drawing list")

  function update(elem) {

    elem
      .style("left",function(){
        if (styles.align == "left") {
          return "0px"
        }
        else if (styles.align == "center") {
          return -((drop_width-button_width)/2)+"px"
        }
        else {
          return "auto"
        }
      })
      .style("right",function(){
        return styles.align == "right" ? "0px" : "auto"
      })
      .style("height",height+"px")
      .style("padding",styles.stroke+"px")
      .style("background-color",styles.secondary)
      .style("z-index",function(){
        return vars.enabled ? "9999" : "-1";
      })
      .style("width",(drop_width-(styles.stroke*2))+"px")
      .style("top",function(){
        return vars.flipped ? "auto" : button.height()+"px"
      })
      .style("bottom",function(){
        return vars.flipped ? button.height()+"px" : "auto"
      })
      .style("opacity",vars.enabled ? 1 : 0)

  }

  function finish(elem) {

    elem
      .style("top",function(){
        return vars.flipped ? "auto" : button.height()+"px"
      })
      .style("bottom",function(){
        return vars.flipped ? button.height()+"px" : "auto"
      })
      .style("display",!vars.enabled ? "none" : null)

    if (vars.search && vars.enabled) {
      selector.select("div.d3plus_drop_search input").node().focus()
    }

  }

  var max_height = vars.enabled ? max-search_height : 0

  if (!timing) {

    selector.call(update).call(finish)

    list
      .style("width",drop_width-styles.stroke*2+"px")
      .style("max-height",max_height+"px")
      .property("scrollTop",scroll)

  }
  else {
    selector.transition().duration(timing)
      .each("start",function(){
        d3.select(this)
          .style("display",vars.enabled ? "block" : null)
      })
      .call(update)
      .each("end",function(){

        d3.select(this).transition().duration(timing)
          .call(finish)

      })

    function scrollTopTween(scrollTop) {
        return function() {
            var i = d3.interpolateNumber(this.scrollTop, scrollTop);
            return function(t) { this.scrollTop = i(t); };
        };
    }

    list.transition().duration(timing)
      .style("width",drop_width-styles.stroke*2+"px")
      .style("max-height",max_height+"px")
      .tween("scroll",scrollTopTween(scroll))
  }

  if (vars.dev) d3plus.console.timeEnd("drawing list")

}

d3plus.forms.element = function(vars) {

  function get_attributes(obj,elem) {

    var attributes = ["value","alt","keywords","image","style","color"];

    [].forEach.call(elem.attributes, function(attr) {
        if (/^data-/.test(attr.name)) {
            var camelCaseName = attr.name.substr(5).replace(/-(.)/g, function ($0, $1) {
                return $1.toUpperCase();
            });
            obj[camelCaseName] = attr.value;
        }
    });
    
    attributes.forEach(function(a){

      if (elem.getAttribute(a) !== null) {
        obj[a] = elem.getAttribute(a)
      }

    })

  }

  vars.tag = vars.element.node().tagName.toLowerCase()

  if (vars.tag == "select") {

    if (vars.element.attr("id") && vars.id == "default") {
      vars.id = vars.element.attr("id")
    }

    vars.element.selectAll("option")
      .each(function(o,i){
        var data_obj = {
          "selected": this.selected,
          "text": this.innerHTML
        }

        get_attributes(data_obj,this)

        if (this.selected) {
          vars.focus = this.value
        }
        vars.data.array.push(data_obj)
      })

  }
  else if (vars.tag == "input" && vars.element.attr("type") == "radio") {

    vars.element
      .each(function(o,i){
        var data_obj = {
          "selected": this.checked
        }

        get_attributes(data_obj,this)

        if (this.id) {
          var label = d3.select("label[for="+this.id+"]")
          if (!label.empty()) {
            data_obj.text = label.style("display","none").html()
          }
        }

        if (this.checked) {
          vars.focus = this.value
        }
        vars.data.array.push(data_obj)
      })
  }

  if (!vars.focus && vars.data.array.length) {
    vars.element.node().selectedIndex = 0
    vars.focus = vars.data.array[0].value
  }

  if (!vars.type) {
    if (vars.data.array.length > 4) {
      vars.type = "drop"
    }
    else {
      vars.type = "radio"
    }
  }

}

d3plus.forms.json = function(vars) {
  
  if (vars.dev) d3plus.console.time("loading data from \""+vars.data.fetch+"\"")
  vars.loading = true
  
  d3.json(vars.data.fetch,function(d){
    
    if (d && Object.keys(d).length == 1) {
      vars.data.data = d[Object.keys(d)[0]]
    }
    else if (d && vars.data.key && d[key]) {
      vars.data.data = d[key]
    }
    else {
      vars.data.data = []
    }
    
    if (typeof vars.data.callback == "function") {
      vars.data.data = vars.data.callback(vars.data.data)
    }
    
    vars.data.loaded = true
    vars.data.changed = true
    if (vars.dev) d3plus.console.timeEnd("loading data from \""+vars.data.fetch+"\"")
    
    d3plus.forms.data(vars)
    
    setTimeout(function(){
      vars.forms.draw()
    },vars.timing*1.5)
    
  })
  
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates a set of Radio Buttons
//------------------------------------------------------------------------------
d3plus.forms.radio = function(vars,styles,timing) {

  vars.container.transition().duration(timing)
    .style("background-color",styles.secondary)
    .style("padding",styles.stroke+"px")
    .style("margin",styles.margin+"px")

  var button_style = d3plus.util.copy(styles)
  button_style.icon = false
  button_style.display = "inline-block"
  button_style.border = "none"
  button_style.width = false
  button_style.margin = 0
  button_style.stroke = 0

  var text = d3plus.forms.value(vars.text,["button"])
  if (!text) {
   text = "text"
  }

  var button = d3plus.forms(button_style)
    .type("button")
    .text(text)
    .data(vars.data.array)
    .parent(vars.container)
    .id(vars.id+"_radios")
    .callback(vars.forms.value)
    .highlight(vars.focus)
    .enable()
    .draw()

}

d3plus.forms.value = function(obj,arr) {
  
  if (typeof obj == "object" && arr) {
    var ret = false
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] in obj) {
        ret = obj[arr[i]]
        break;
      }
    }
    if (ret) {
      return ret
    }
  }
  else if (typeof obj != "object") {
    return obj
  }
  else {
    return false
  }
  
}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws "square" and "circle" shapes using svg:rect
//------------------------------------------------------------------------------
d3plus.shape.area = function(vars,selection,enter,exit) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // D3 area definition
  //----------------------------------------------------------------------------
  var area = d3.svg.area()
    .x(function(d) { return d.d3plus.x; })
    .y0(function(d) { return d.d3plus.y0; })
    .y1(function(d) { return d.d3plus.y; })
    .interpolate(vars.shape.interpolate.value)

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // "paths" Enter
  //----------------------------------------------------------------------------
  enter.append("path").attr("class","d3plus_data")
    .attr("d",function(d){ return area(d.values) })
    .call(d3plus.shape.style,vars)

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // "paths" Update
  //----------------------------------------------------------------------------
  selection.selectAll("path.d3plus_data")
    .data(function(d) {

      if (vars.labels.value) {

        var areas = [],
            obj = null,
            obj2 = null,
            label = {
              "w": 0,
              "h": 0,
              "x": 0,
              "y": 0
            }

        function check_area(area) {

          obj.y = d3.max([obj.y,area.y])
          obj.y0 = d3.min([obj.y0,area.y0])
          obj.x0 = area.x

          obj.h = (obj.y0 - obj.y)
          obj.w = (obj.x0 - obj.x)

          var toosmall = obj.h-(vars.style.labels.padding*2) < 15 || obj.w-(vars.style.labels.padding*2) < 20,
              aspect_old = label.w/label.h,
              size_old = label.w*label.h,
              aspect_new = obj.w/obj.h,
              size_new = obj.w*obj.h

          if ((!toosmall && size_old < size_new) || !label.w) {
            label = {
              "w": obj.w,
              "h": obj.h,
              "x": obj.x+(obj.w/2),
              "y": obj.y+(obj.h/2)
            }
          }
          if (obj.h < 10) {
            obj = d3plus.util.copy(area)
          }

        }

        d.values.forEach(function(v,i){

          if (!obj) {
            obj = d3plus.util.copy(v.d3plus)
          }
          else {
            var arr = d3plus.util.buckets([0,1],vars.style.labels.segments+1)
            arr.shift()
            arr.pop()
            arr.forEach(function(n){

              var test = d3plus.util.copy(v.d3plus),
                  last = d.values[i-1].d3plus

              test.x = last.x + (test.x-last.x) * n
              test.y = last.y + (test.y-last.y) * n
              test.y0 = last.y0 + (test.y0-last.y0) * n

              check_area(test)

            })
            check_area(d3plus.util.copy(v.d3plus))
          }
        })

        if (label.w >= 10 && label.h >= 10) {
          d.d3plus_label = label
        }

      }

      return [d];
    })

  if (vars.timing) {
    selection.selectAll("path.d3plus_data")
      .transition().duration(vars.timing)
        .attr("d",function(d){ return area(d.values) })
        .call(d3plus.shape.style,vars)
  }
  else {
    selection.selectAll("path.d3plus_data")
      .attr("d",function(d){ return area(d.values) })
      .call(d3plus.shape.style,vars)
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Returns the correct fill color for a node
//-------------------------------------------------------------------
d3plus.shape.color = function(d,vars) {

  var shape = d.d3plus ? d.d3plus.shapeType : vars.shape.value

  if (vars.shape.value == "line") {
    if (shape == "circle") {
      return d3plus.variable.color(vars,d)
    }
    else {
      return "none"
    }
  }
  else if (vars.shape.value == "area" || shape == "active") {
    return d3plus.variable.color(vars,d)
  }
  else if (shape == "temp") {
    return "url(#d3plus_hatch_"+d.d3plus.id+")"
  }
  else if (shape == "active") {
    return d3plus.variable.color(vars,d)
  }

  if (d.d3plus.static) {
    return d3plus.color.lighter(d3plus.variable.color(vars,d));
  }

  var active = vars.active.key ? d3plus.variable.value(vars,d,vars.active.key) : d.d3plus.active,
      temp = vars.temp.key ? d3plus.variable.value(vars,d,vars.temp.key) : d.d3plus.temp,
      total = vars.total.key ? d3plus.variable.value(vars,d,vars.total.key) : d.d3plus.total

  if ((!vars.active.key && !vars.temp.key) || active === true || (active && total && active == total && !temp) || (active && !total)) {
    return d3plus.variable.color(vars,d)
  }
  else if (vars.active.spotlight.value) {
    return "#eee"
  }
  else {
    return d3plus.color.lighter(d3plus.variable.color(vars,d),.4);
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws "square" and "circle" shapes using svg:rect
//------------------------------------------------------------------------------
d3plus.shape.coordinates = function(vars,selection,enter,exit) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Define the geographical projection
  //----------------------------------------------------------------------------
  var projection = d3.geo[vars.coords.projection.value]()
    .center(vars.coords.center)
    // .translate([-vars.app_width/2,-vars.app_height/2])

  // var clip = d3.geo.clipExtent()
  //     .extent([[0, 0], [vars.app_width, vars.app_height]]);

  if (!vars.zoom.scale) {
    vars.zoom.scale = 1
  }

  vars.zoom.area = 1/vars.zoom.scale/vars.zoom.scale

  // console.log(vars.zoom)

  // var simplify = d3.geo.transform({
  //   point: function(x, y, z) {
  //     if (z >= vars.zoom.area) this.stream.point(x,y);
  //   }
  // });

  vars.path = d3.geo.path()
    .projection(projection)
    // .projection(simplify)
    // .projection({stream: function(s) { return simplify.stream(clip.stream(s)); }})

  enter.append("path")
    .attr("id",function(d){
      return d.id
    })
    .attr("class","d3plus_data")
    .attr("d",vars.path)
    .call(d3plus.shape.style,vars)

  if (vars.timing) {
    selection.selectAll("path.d3plus_data")
      .transition().duration(vars.timing)
        .call(d3plus.shape.style,vars)
  }
  else {
    selection.selectAll("path.d3plus_data")
      .call(d3plus.shape.style,vars)
  }

  var size_change = vars.old_height != vars.app_height || vars.height.changed
    || vars.old_width != vars.app_width || vars.width.changed

  vars.old_height = vars.app_height
  vars.old_width = vars.app_width

  if (vars.coords.changed || size_change || vars.coords.mute.changed || vars.coords.solo.changed) {

    vars.zoom.bounds = null
    vars.zoom.coords = {}
    vars.zoom.labels = {}

    selection.each(function(d){

      var b = vars.path.bounds(d)

      var areas = []
      d.geometry.coordinates = d.geometry.coordinates.filter(function(c,i){

        var test = d3plus.util.copy(d)
        test.geometry.coordinates = [test.geometry.coordinates[i]]
        var a = vars.path.area(test)
        if (a >= vars.coords.threshold) {
          areas.push(a)
          return true
        }
        return false

      })
      areas.sort(function(a,b){
        return a-b
      })

      var reduced = d3plus.util.copy(d),
          largest = d3plus.util.copy(d)
      reduced.geometry.coordinates = reduced.geometry.coordinates.filter(function(c,i){

        var test = d3plus.util.copy(d)
        test.geometry.coordinates = [test.geometry.coordinates[i]]
        var a = vars.path.area(test)
        if (a == areas[areas.length-1]) {
          largest.geometry.coordinates = test.geometry.coordinates
        }
        return a >= d3.quantile(areas,.9)

      })
      vars.zoom.coords[d.d3plus.id] = reduced

      var center = vars.path.centroid(largest),
          lb = vars.path.bounds(largest)

      vars.zoom.labels[d.d3plus.id] = {
        "anchor": "middle",
        "group": vars.g.labels,
        "h": (lb[1][1]-lb[0][1])*.35,
        "w": (lb[1][0]-lb[0][0])*.35,
        "valign": "center",
        "x": center[0],
        "y": center[1]
      }

      if (!vars.zoom.bounds) {
        vars.zoom.bounds =  b
      }
      else {
        if (vars.zoom.bounds[0][0] > b[0][0]) {
          vars.zoom.bounds[0][0] = b[0][0]
        }
        if (vars.zoom.bounds[0][1] > b[0][1]) {
          vars.zoom.bounds[0][1] = b[0][1]
        }
        if (vars.zoom.bounds[1][0] < b[1][0]) {
          vars.zoom.bounds[1][0] = b[1][0]
        }
        if (vars.zoom.bounds[1][1] < b[1][1]) {
          vars.zoom.bounds[1][1] = b[1][1]
        }
      }

    })

  }
  else if (!vars.focus.value) {
    vars.zoom.viewport = false
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws "donut" shapes using svg:path with arcs
//------------------------------------------------------------------------------
d3plus.shape.donut = function(vars,selection,enter,exit) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // In order to correctly animate each donut's size and arcs, we need to store
  // it's previous values in a lookup object that does not get destroyed when
  // redrawing the visualization.
  //----------------------------------------------------------------------------
  if (!vars.arcs) {
    vars.arcs = {
      "donut": {},
      "active": {},
      "temp": {}
    }
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // This is the main arc function that determines what values to use for each
  // arc angle and radius.
  //----------------------------------------------------------------------------
  var arc = d3.svg.arc()
    .startAngle(0)
    .endAngle(function(d){
      var a = vars.arcs[d.d3plus.shapeType][d.d3plus.id].a
      return a > Math.PI*2 ? Math.PI*2 : a;
    })
    .innerRadius(function(d){
      if (shape == "donut" && !d.d3plus.static) {
        var r = vars.arcs[d.d3plus.shapeType][d.d3plus.id].r
        return r * vars.style.data.donut.size
      }
      else {
        return 0
      }
    })
    .outerRadius(function(d){
      var r = vars.arcs[d.d3plus.shapeType][d.d3plus.id].r
      if (d.d3plus.shapeType != "donut") return r*2
      else return r
    })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // This is the main "arcTween" function where all of the animation happens
  // for each arc.
  //----------------------------------------------------------------------------
  function size(path,mod,rad,ang) {
    if (!mod) var mod = 0
    if (typeof rad != "number") var rad = undefined
    if (typeof ang != "number") var ang = undefined
    path.attrTween("d", function(d){
      if (rad == undefined) var r = d.d3plus.r ? d.d3plus.r : d3.max([d.d3plus.width,d.d3plus.height])
      else var r = rad
      if (ang == undefined) var a = d.d3plus.a[d.d3plus.shapeType]
      else var a = ang
      if (!vars.arcs[d.d3plus.shapeType][d.d3plus.id]) {
        vars.arcs[d.d3plus.shapeType][d.d3plus.id] = {"r": 0}
        vars.arcs[d.d3plus.shapeType][d.d3plus.id].a = d.d3plus.shapeType == "donut" ? Math.PI * 2 : 0
      }
      var radius = d3.interpolate(vars.arcs[d.d3plus.shapeType][d.d3plus.id].r,r+mod),
          angle = d3.interpolate(vars.arcs[d.d3plus.shapeType][d.d3plus.id].a,a)
      return function(t) {
        vars.arcs[d.d3plus.shapeType][d.d3plus.id].r = radius(t)
        vars.arcs[d.d3plus.shapeType][d.d3plus.id].a = angle(t)
        return arc(d)
      }
    })
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // "paths" Exit
  //----------------------------------------------------------------------------
  exit.selectAll("path.d3plus_data")
  .transition().duration(vars.timing)
    .call(size,0,0)
    .each("end",function(d){
      delete vars.arcs[d.d3plus.shapeType][d.d3plus.id]
    })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // "paths" Update
  //----------------------------------------------------------------------------
  selection.selectAll("path.d3plus_data")
    .data(function(d) { return [d]; })
    .transition().duration(vars.timing)
      .call(size)
      .call(d3plus.shape.style,vars)

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // "paths" Enter
  //----------------------------------------------------------------------------
  enter.append("path")
    .attr("class","d3plus_data")
    .transition().duration(0)
      .call(size,0,0)
      .call(d3plus.shape.style,vars)

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws the appropriate shape based on the data
//------------------------------------------------------------------------------
d3plus.shape.draw = function(vars) {

  var data = vars.returned.nodes || [],
      edges = vars.returned.edges || []

  vars.timing = data.length < vars.data.large && edges.length < vars.edges.large ? vars.style.timing.transitions : 0

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Match vars.shape types to their respective d3plus.shape functions. For
  // example, both "square", and "circle" shapes use "rect" as their drawing
  // class.
  //----------------------------------------------------------------------------
  var shape_lookup = {
    "area": "area",
    "circle": "rect",
    "donut": "donut",
    "line": "line",
    "square": "rect",
    "coordinates": "coordinates"
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Split the data by each shape type in the data.
  //----------------------------------------------------------------------------
  var shapes = {}
  data.forEach(function(d){
    if (!d.d3plus) {
      var s = shape_lookup[vars.shape.value]
    }
    else if (!d.d3plus.shape) {
      var s = shape_lookup[vars.shape.value]
      d.d3plus.shapeType = s
    }
    else {
      var s = d.d3plus.shape
      d.d3plus.shapeType = s
    }
    if (!shapes[s]) {
      shapes[s] = []
    }
    shapes[s].push(d)
  })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Resets the "id" of each data point to use with matching.
  //----------------------------------------------------------------------------
  function id(d) {

    var depth = d.d3plus.depth ? d.d3plus.depth : vars.depth.value

    d.d3plus.id = d3plus.variable.value(vars,d,vars.id.nesting[depth])
    d.d3plus.id += "_"+depth+"_"+shape

    vars.axes.values.forEach(function(axis){
      if (vars[axis].scale.value == "continuous") {
        d.d3plus.id += "_"+d3plus.variable.value(vars,d,vars[axis].key)
      }
    })

    d.d3plus.id = d3plus.util.strip(d.d3plus.id)

    return d
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Transforms the positions and scale of each group.
  //----------------------------------------------------------------------------
  function transform(g,grow) {

    var scales = d3plus.apps[vars.type.value].scale
    if (grow && scales && scales[vars.shape.value]) {
       var scale = scales[vars.shape.value]
    }
    else if (grow && scales && typeof scales == "number") {
      var scale = scales
    }
    else {
      var scale = 1
    }

    g
      .attr("transform",function(d){
        if (["line","area","coordinates"].indexOf(shape) < 0) {
          return "translate("+d.d3plus.x+","+d.d3plus.y+")scale("+scale+")"
        }
        else {
          return "scale("+scale+")"
        }
      })

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Remove old groups
  //----------------------------------------------------------------------------
  for (shape in shape_lookup) {
    if (!(shape_lookup[shape] in shapes) || Object.keys(shapes).length === 0) {
      if (vars.timing) {
        vars.g.data.selectAll("g.d3plus_"+shape_lookup[shape])
          .transition().duration(vars.timing)
          .attr("opacity",0)
          .remove()
      }
      else {
        vars.g.data.selectAll("g.d3plus_"+shape_lookup[shape])
          .remove()
      }
    }
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Initialize arrays for labels and sizes
  //----------------------------------------------------------------------------
  var labels = [],
      shares = []

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Create groups by shape, apply data, and call specific shape drawing class.
  //----------------------------------------------------------------------------
  for (shape in shapes) {

    if (vars.dev.value) d3plus.console.group("Drawing \"" + shape + "\" groups")

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Filter out too small shapes
    //--------------------------------------------------------------------------
    if (vars.dev.value) d3plus.console.time("filtering out small shapes")
    var filtered_shapes = shapes[shape].filter(function(s){
      if (s.d3plus) {
        if ("width" in s.d3plus && s.d3plus.width < 1) {
          return false
        }
        if ("height" in s.d3plus && s.d3plus.height < 1) {
          return false
        }
        if ("r" in s.d3plus && s.d3plus.r < 0.5) {
          return false
        }
      }
      else if (s.values) {
        var small = true
        s.values.forEach(function(v){
          if (!("y0" in v.d3plus)) {
            small = false
          }
          else if (small && "y0" in v.d3plus && v.d3plus.y0-v.d3plus.y >= 1) {
            small = false
          }
        })
        if (small) {
          return false
        }
      }
      return true
    })

    if (vars.dev.value) {
      d3plus.console.timeEnd("filtering out small shapes")
      var removed = shapes[shape].length-filtered_shapes.length,
          percent = d3.round(removed/shapes[shape].length,2)
      console.log("removed "+removed+" out of "+shapes[shape].length+" shapes ("+percent*100+"% reduction)")
    }

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Bind Data to Groups
    //--------------------------------------------------------------------------
    var selection = vars.g.data.selectAll("g.d3plus_"+shape)
      .data(filtered_shapes,function(d){

        if (!d.d3plus) {
          d.d3plus = {}
        }

        if (shape == "coordinates") {
          d.d3plus.id = d.id
          return d.id
        }

        if (!d.d3plus.id) {

          if (d.values) {

            d.values.forEach(function(v){
              v = id(v)
              v.d3plus.shapeType = "circle"
            })
            d.d3plus.id = d.key

          }
          else {

            d = id(d)

            if (!d.d3plus.a) {

              d.d3plus.a = {"donut": Math.PI*2}
              var active = vars.active.key ? d.d3plus[vars.active.key] : d.d3plus.active,
                  temp = vars.temp.key ? d.d3plus[vars.temp.key] : d.d3plus.temp,
                  total = vars.total.key ? d.d3plus[vars.total.key] : d.d3plus.total

              if (total) {
                if (active) {
                  d.d3plus.a.active = (active/total) * (Math.PI * 2)
                }
                else {
                  d.d3plus.a.active = 0
                }
                if (temp) {
                  d.d3plus.a.temp = ((temp/total) * (Math.PI * 2)) + d.d3plus.a.active
                }
                else {
                  d.d3plus.a.temp = 0
                }
              }

            }

          }

        }

        return d.d3plus ? d.d3plus.id : false;

      })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Groups Exit
    //--------------------------------------------------------------------------
    if (vars.timing) {
      var exit = selection.exit()
        .transition().duration(vars.timing)
        .attr("opacity",0)
        .remove()
    }
    else {
      var exit = selection.exit()
        .remove()
    }

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Existing Groups Update
    //--------------------------------------------------------------------------
    if (vars.timing) {
      selection
        .transition().duration(vars.timing)
        .call(transform)
    }
    else {
      selection.call(transform)
    }

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Groups Enter
    //--------------------------------------------------------------------------
    var opacity = vars.timing ? 0 : 1
    var enter = selection.enter().append("g")
      .attr("class","d3plus_"+shape)
      .attr("opacity",opacity)
      .call(transform)

    if (vars.timing) {
      enter.transition().duration(vars.timing)
        .attr("opacity",1)
    }

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // All Groups Sort Order
    //--------------------------------------------------------------------------
    selection.order()

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Draw appropriate graphics inside of each group
    //--------------------------------------------------------------------------
    if (vars.dev.value) d3plus.console.time("shapes")
    d3plus.shape[shape](vars,selection,enter,exit,transform)
    if (vars.dev.value) d3plus.console.timeEnd("shapes")

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Check for active and temp fills for rects and donuts
    //--------------------------------------------------------------------------
    if (["rect","donut"].indexOf(shape) >= 0 && d3plus.apps[vars.type.value].fill) {
      d3plus.shape.fill(vars,selection,enter,exit,transform)
    }

    if (vars.dev.value) d3plus.console.groupEnd()

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Function to Update Edges
  //----------------------------------------------------------------------------
  function edge_update(d) {

    if (d && vars.g.edges.selectAll("g").size() > 0) {

      vars.g.edges.selectAll("g")
        .each(function(l){

          var id = d[vars.id.key],
              source = l[vars.edges.source][vars.id.key],
              target = l[vars.edges.target][vars.id.key]

          if (source == id || target == id) {
            var elem = vars.g.edge_hover.node().appendChild(this.cloneNode(true))
            d3.select(elem).datum(l).attr("opacity",1)
              .selectAll("line, path").datum(l)
          }

        })


      var marker = vars.edges.arrows.value

      vars.g.edge_hover
        .attr("opacity",0)
        .selectAll("line, path")
          .style("stroke",vars.style.highlight.primary)
          .style("stroke-width",function(){
            return vars.edges.size ? d3.select(this).style("stroke-width")
                 : vars.style.data.stroke.width*2
          })
          .attr("marker-start",function(e){

            var direction = vars.edges.arrows.direction.value

            if ("bucket" in e.d3plus) {
              var d = "_"+e.d3plus.bucket
            }
            else {
              var d = ""
            }

            return direction == "source" && marker
                 ? "url(#d3plus_edge_marker_highlight"+d+")" : "none"

          })
          .attr("marker-end",function(e){

            var direction = vars.edges.arrows.direction.value

            if ("bucket" in e.d3plus) {
              var d = "_"+e.d3plus.bucket
            }
            else {
              var d = ""
            }

            return direction == "target" && marker
                 ? "url(#d3plus_edge_marker_highlight"+d+")" : "none"

          })


      vars.g.edge_hover.selectAll("text")
        .style("fill",vars.style.highlight.primary)

      if (vars.timing) {

        vars.g.edge_hover
          .transition().duration(vars.style.timing.mouseevents)
          .attr("opacity",1)

        vars.g.edges
          .transition().duration(vars.style.timing.mouseevents)
          .attr("opacity",0.5)

      }
      else {

        vars.g.edge_hover
          .attr("opacity",1)

      }

    }
    else {

      if (vars.timing) {

        vars.g.edge_hover
          .transition().duration(vars.style.timing.mouseevents)
          .attr("opacity",0)
          .transition()
          .selectAll("*")
          .remove()

        vars.g.edges
          .transition().duration(vars.style.timing.mouseevents)
          .attr("opacity",1)

      }
      else {

        vars.g.edge_hover
          .selectAll("*")
          .remove()

      }

    }

  }

  edge_update()

  if (!d3plus.touch) {

    vars.g.data.selectAll("g")
      .on(d3plus.evt.over,function(d){

        if (!vars.frozen && (!d.d3plus || !d.d3plus.static)) {

          d3.select(this).style("cursor","pointer")
            .transition().duration(vars.style.timing.mouseevents)
            .call(transform,true)

          d3.select(this).selectAll(".d3plus_data")
            .transition().duration(vars.style.timing.mouseevents)
            .attr("opacity",1)

          vars.covered = false

          if (["area","line"].indexOf(vars.shape.value) >= 0
            || (d3plus.apps[vars.type.value].tooltip == "follow" &&
            (vars.focus.value != d[vars.id.key]) || !vars.focus.tooltip.value)) {

            if (vars.continuous_axis) {

              var mouse = d3.event[vars.continuous_axis]
                  positions = d3plus.util.uniques(d.values,function(x){return x.d3plus[vars.continuous_axis]}),
                  closest = d3plus.util.closest(positions,mouse)

              d.data = d.values[positions.indexOf(closest)]
              d.d3plus = d.values[positions.indexOf(closest)].d3plus

            }

            var tooltip_data = d.data ? d.data : d
            d3plus.tooltip.app({
              "vars": vars,
              "data": tooltip_data
            })

          }

          if (typeof vars.mouse == "function") {
            vars.mouse(d)
          }
          else if (vars.mouse[d3plus.evt.over]) {
            vars.mouse[d3plus.evt.over](d)
          }

          edge_update(d)

        }

      })
      .on(d3plus.evt.move,function(d){

        if (!vars.frozen && (!d.d3plus || !d.d3plus.static)) {

          vars.covered = false

          if (["area","line"].indexOf(vars.shape.value) >= 0
            || (d3plus.apps[vars.type.value].tooltip == "follow" &&
            (vars.focus.value != d[vars.id.key]) || !vars.focus.tooltip.value)) {

            if (vars.continuous_axis) {

              var mouse = d3.event[vars.continuous_axis]
                  positions = d3plus.util.uniques(d.values,function(x){return x.d3plus[vars.continuous_axis]}),
                  closest = d3plus.util.closest(positions,mouse)

              d.data = d.values[positions.indexOf(closest)]
              d.d3plus = d.values[positions.indexOf(closest)].d3plus

            }

            var tooltip_data = d.data ? d.data : d
            d3plus.tooltip.app({
              "vars": vars,
              "data": tooltip_data
            })

          }

          if (typeof vars.mouse == "function") {
            vars.mouse(d)
          }
          else if (vars.mouse[d3plus.evt.move]) {
            vars.mouse[d3plus.evt.move](d)
          }

        }

      })
      .on(d3plus.evt.out,function(d){

        var child = d3plus.util.child(this,d3.event.toElement)

        if (!child && !vars.frozen && (!d.d3plus || !d.d3plus.static)) {

          d3.select(this)
            .transition().duration(vars.style.timing.mouseevents)
            .call(transform)

          d3.select(this).selectAll(".d3plus_data")
            .transition().duration(vars.style.timing.mouseevents)
            .attr("opacity",vars.style.data.opacity)


          if (!vars.covered) {
            d3plus.tooltip.remove(vars.type.value)
          }

          if (typeof vars.mouse == "function") {
            vars.mouse(d)
          }
          else if (vars.mouse[d3plus.evt.out]) {
            vars.mouse[d3plus.evt.out](d)
          }

          edge_update()

        }

      })

  }
  else {

    vars.g.data.selectAll("g")
      .on(d3plus.evt.over,vars.touchEvent)
      .on(d3plus.evt.move,vars.touchEvent)
      .on(d3plus.evt.out,vars.touchEvent)

  }

  vars.g.data.selectAll("g")
    .on(d3plus.evt.click,function(d){

      if (!vars.frozen && (!d.d3plus || !d.d3plus.static)) {

        if (typeof vars.mouse == "function") {
          vars.mouse(d)
        }
        else if (vars.mouse[d3plus.evt.out]) {
          vars.mouse[d3plus.evt.out](d)
        }
        else if (vars.mouse[d3plus.evt.click]) {
          vars.mouse[d3plus.evt.click](d)
        }

        var depth_delta = vars.zoom_direction(),
            previous = vars.id.solo.value,
            title = d3plus.variable.text(vars,d)[0],
            color = d3plus.color.legible(d3plus.variable.color(vars,d)),
            prev_sub = vars.title.sub.value || false,
            prev_color = vars.style.title.sub.font.color,
            prev_total = vars.style.title.total.font.color

        if (d.d3plus.threshold && d.d3plus.merged && vars.zoom.value) {

          vars.history.states.push(function(){

            vars.viz
              .id({"solo": previous})
              .title({"sub": prev_sub})
              .style({"title": {"sub": {"font": {"color": prev_color}}, "total": {"font": {"color": prev_total}}}})
              .draw()

          })

          vars.viz
            .id({"solo": d.d3plus.merged})
            .title({"sub": title})
            .style({"title": {"sub": {"font": {"color": color}}, "total": {"font": {"color": color}}}})
            .draw()

        }
        else if (depth_delta === 1 && vars.zoom.value) {

          var id = d3plus.variable.value(vars,d,vars.id.key)

          vars.history.states.push(function(){

            vars.viz
              .depth(vars.depth.value-1)
              .id({"solo": previous})
              .title({"sub": prev_sub})
              .style({"title": {"sub": {"font": {"color": prev_color}}, "total": {"font": {"color": prev_total}}}})
              .draw()

          })

          vars.viz
            .depth(vars.depth.value+1)
            .id({"solo": [id]})
            .title({"sub": title})
            .style({"title": {"sub": {"font": {"color": color}}, "total": {"font": {"color": color}}}})
            .draw()

        }
        else if (depth_delta === -1 && vars.zoom.value) {

          vars.back()

        }
        else if (d3plus.apps[vars.type.value].zoom && vars.zoom.value) {

          edge_update()

          d3.select(this)
            .transition().duration(vars.style.timing.mouseevents)
            .call(transform)

          d3.select(this).selectAll(".d3plus_data")
            .transition().duration(vars.style.timing.mouseevents)
            .attr("opacity",vars.style.data.opacity)

          d3plus.tooltip.remove(vars.type.value)
          vars.update = false

          if (!d || d[vars.id.key] == vars.focus.value) {
            vars.viz.focus(null).draw()
          }
          else {
            vars.viz.focus(d[vars.id.key]).draw()
          }

        }
        else if (d[vars.id.key] != vars.focus.value) {

          edge_update()

          var tooltip_data = d.data ? d.data : d

          d3plus.tooltip.app({
            "vars": vars,
            "data": tooltip_data
          })

        }

      }

    })

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws "square" and "circle" shapes using svg:rect
//------------------------------------------------------------------------------
d3plus.shape.edges = function(vars) {

  var edges = vars.returned.edges || [],
      scale = vars.zoom_behavior.scaleExtent()[0]

  if (typeof vars.edges.size === "string") {

    var strokeDomain = d3.extent(edges, function(e){
                         return e[vars.edges.size]
                       })
      , maxSize = d3.min(vars.returned.nodes || [], function(n){
                        return n.d3plus.r
                      })*.6

    vars.edges.scale = d3.scale.sqrt()
                        .domain(strokeDomain)
                        .range([vars.style.edges.width,maxSize*scale])

  }
  else {

    var defaultWidth = typeof vars.edges.size == "number"
                     ? vars.edges.size : vars.style.edges.width

    vars.edges.scale = function(){
      return defaultWidth
    }

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Initialization of Lines
  //----------------------------------------------------------------------------
  function init(l) {

    var opacity = vars.style.edges.opacity == 1 ? vars.style.edges.opacity : 0

    l
      .attr("opacity",opacity)
      .style("stroke-width",0)
      .style("stroke",vars.style.background)
      .style("fill","none")
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Styling of Lines
  //----------------------------------------------------------------------------
  function style(edges) {

    var marker = vars.edges.arrows.value

    edges
      .style("stroke-width",function(e){
        return vars.edges.scale(e[vars.edges.size])
      })
      .style("stroke",vars.style.edges.color)
      .attr("opacity",vars.style.edges.opacity)
      .attr("marker-start",function(e){

        var direction = vars.edges.arrows.direction.value

        if ("bucket" in e.d3plus) {
          var d = "_"+e.d3plus.bucket
        }
        else {
          var d = ""
        }

        return direction == "source" && marker
             ? "url(#d3plus_edge_marker_default"+d+")" : "none"

      })
      .attr("marker-end",function(e){

        var direction = vars.edges.arrows.direction.value

        if ("bucket" in e.d3plus) {
          var d = "_"+e.d3plus.bucket
        }
        else {
          var d = ""
        }

        return direction == "target" && marker
             ? "url(#d3plus_edge_marker_default"+d+")" : "none"

      })
      .attr("vector-effect","non-scaling-stroke")
      .attr("pointer-events","none")
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Positioning of Lines
  //----------------------------------------------------------------------------
  function line(l) {
    l
      .attr("x1",function(d){
        return d[vars.edges.source].d3plus.dx
      })
      .attr("y1",function(d){
        return d[vars.edges.source].d3plus.dy
      })
      .attr("x2",function(d){
        return d[vars.edges.target].d3plus.dx
      })
      .attr("y2",function(d){
        return d[vars.edges.target].d3plus.dy
      })
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Positioning of Splines
  //----------------------------------------------------------------------------
  var diagonal = d3.svg.diagonal(),
      radial = d3.svg.diagonal()
        .projection(function(d){
          var r = d.y, a = d.x;
          return [r * Math.cos(a), r * Math.sin(a)];
        })

  function spline(l) {
    l
      .attr("d", function(d) {
        if (d[vars.edges.source].d3plus.dr) {
          var x1 = d[vars.edges.source].d3plus.a,
              y1 = d[vars.edges.source].d3plus.dr,
              x2 = d[vars.edges.target].d3plus.a,
              y2 = d[vars.edges.target].d3plus.dr
          var obj = {}
          obj[vars.edges.source] = {"x":x1,"y":y1}
          obj[vars.edges.target] = {"x":x2,"y":y2}
          return radial(obj);

        }
        else {
          var x1 = d[vars.edges.source].d3plus.dx,
              y1 = d[vars.edges.source].d3plus.dy,
              x2 = d[vars.edges.target].d3plus.dx,
              y2 = d[vars.edges.target].d3plus.dy
          var obj = {}
          obj[vars.edges.source] = {"x":x1,"y":y1}
          obj[vars.edges.target] = {"x":x2,"y":y2}
          return diagonal(obj);
        }
      })
      .attr("transform",function(d){
        if (d.d3plus && d.d3plus.translate) {
          var x = d.d3plus.translate.x || 0
          var y = d.d3plus.translate.y || 0
          return "translate("+x+","+y+")"
        }
        else {
          "translate(0,0)"
        }
      })
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Calculates and Draws Label for edge
  //----------------------------------------------------------------------------
  function label(d) {

    delete d.d3plus_label

    if (vars.g.edges.selectAll("line, path").size() < vars.edges.large && vars.edges.label && d[vars.edges.label]) {

      if ("spline" in d.d3plus) {

        var length = this.getTotalLength(),
            center = this.getPointAtLength(length/2),
            prev = this.getPointAtLength((length/2)-(length*.1)),
            next = this.getPointAtLength((length/2)+(length*.1)),
            radians = Math.atan2(next.y-prev.y,next.x-prev.x),
            angle = radians*(180/Math.PI),
            bounding = this.parentNode.getBBox(),
            width = length*.8,
            x = d.d3plus.translate.x+center.x,
            y = d.d3plus.translate.y+center.y,
            translate = {
              "x": d.d3plus.translate.x+center.x,
              "y": d.d3plus.translate.y+center.y
            }

      }
      else {

        var bounds = this.getBBox()
            start = {"x": d[vars.edges.source].d3plus.dx, "y": d[vars.edges.source].d3plus.dy},
            end = {"x": d[vars.edges.target].d3plus.dx, "y": d[vars.edges.target].d3plus.dy},
            xdiff = end.x-start.x,
            ydiff = end.y-start.y,
            center = {"x": end.x-(xdiff)/2, "y": end.y-(ydiff)/2},
            radians = Math.atan2(ydiff,xdiff),
            angle = radians*(180/Math.PI),
            length = Math.sqrt((xdiff*xdiff)+(ydiff*ydiff)),
            width = length,
            x = center.x,
            y = center.y,
            translate = {
              "x": center.x,
              "y": center.y
            }

      }

      width += vars.style.labels.padding*2

      var m = 0
      if (vars.edges.arrows.value) {
        m = vars.style.edges.arrows
        m = m/vars.zoom_behavior.scaleExtent()[1]
        width -= m*2
      }

      if (angle < -90 || angle > 90) {
        angle -= 180
      }
      
      if (width*vars.zoom_behavior.scaleExtent()[0] > 20) {

        d.d3plus_label = {
          "x": x,
          "y": y,
          "translate": translate,
          "w": width,
          "h": 15+vars.style.labels.padding*2,
          "angle": angle,
          "anchor": "middle",
          "valign": "center",
          "color": vars.style.edges.color,
          "resize": false,
          "names": [vars.format(d[vars.edges.label])],
          "background": 1
        }

      }

    }

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Enter/update/exit the Arrow Marker
  //----------------------------------------------------------------------------
  var markerData = vars.edges.arrows.value ? typeof vars.edges.size == "string"
                  ? [ "default_0", "default_1", "default_2",
                      "highlight_0", "highlight_1", "highlight_2",
                      "focus_0", "focus_1", "focus_2" ]
                  : [ "default", "highlight", "focus" ] : []

  if (typeof vars.edges.size == "string") {
    var buckets = d3plus.util.buckets(vars.edges.scale.range(),4)
      , markerSize = []
    for (var i = 0; i < 3; i++) {
      markerSize.push(buckets[i+1]+(buckets[1]-buckets[0])*(i+2))
    }
  }
  else {
    var markerSize = typeof vars.edges.size == "number"
                    ? vars.edges.size/vars.style.edges.arrows
                    : vars.style.edges.arrows
  }

  var marker = vars.defs.selectAll(".d3plus_edge_marker")
    .data(markerData, String)

  var marker_style = function(path) {
    path
      .attr("d",function(id){

        var depth = id.split("_")

        if (depth.length == 2 && vars.edges.scale) {
          depth = parseInt(depth[1])
          var m = markerSize[depth]
        }
        else {
          var m = markerSize
        }

        if (vars.edges.arrows.direction.value == "target") {
          return "M 0,-"+m/2+" L "+m*.85+",0 L 0,"+m/2+" L 0,-"+m/2
        }
        else {
          return "M 0,-"+m/2+" L -"+m*.85+",0 L 0,"+m/2+" L 0,-"+m/2
        }
      })
      .attr("fill",function(d){

        var type = d.split("_")[0]

        if (type == "default") {
          return vars.style.edges.color
        }
        else if (type == "focus") {
          return vars.style.highlight.focus
        }
        else {
          return vars.style.highlight.primary
        }
      })
      .attr("transform","scale("+1/scale+")")
  }

  if (vars.timing) {
    marker.exit().transition().duration(vars.timing)
      .attr("opacity",0)
      .remove()

    marker.select("path").transition().duration(vars.timing)
      .attr("opacity",1)
      .call(marker_style)
  }
  else {
    marker.exit().remove()

    marker.select("path")
      .attr("opacity",1)
      .call(marker_style)
  }

  var opacity = vars.timing ? 0 : 1
  var enter = marker.enter().append("marker")
    .attr("id",function(d){
      return "d3plus_edge_marker_"+d
    })
    .attr("class","d3plus_edge_marker")
    .attr("orient","auto")
    .attr("markerUnits","userSpaceOnUse")
    .style("overflow","visible")
    .append("path")
    .attr("opacity",opacity)
    .attr("vector-effect","non-scaling-stroke")
    .call(marker_style)

  if (vars.timing) {
    enter.transition().duration(vars.timing)
      .attr("opacity",1)
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Bind "edges" data to lines in the "edges" group
  //----------------------------------------------------------------------------
  var strokeBuckets = typeof vars.edges.size == "string"
                    ? d3plus.util.buckets(vars.edges.scale.domain(),4)
                    : null
    , direction = vars.edges.arrows.direction.value

  var line_data = edges.filter(function(l){

    if (!l.d3plus || (l.d3plus && !("spline" in l.d3plus))) {

      if (!l.d3plus) {
        l.d3plus = {}
      }

      if (strokeBuckets) {
        var size = l[vars.edges.size]
        l.d3plus.bucket = size < strokeBuckets[1] ? 0
                        : size < strokeBuckets[2] ? 1 : 2
        var marker = markerSize[l.d3plus.bucket]*.85/scale
      }
      else {
        delete l.d3plus.bucket
        var marker = markerSize*.85/scale
      }

      var source = l[vars.edges.source]
        , target = l[vars.edges.target]
        , angle = Math.atan2( source.d3plus.y - target.d3plus.y
                            , source.d3plus.x - target.d3plus.x )
        , sourceRadius = direction == "source" && vars.edges.arrows.value
                       ? source.d3plus.r + marker
                       : source.d3plus.r
        , targetRadius = direction == "target" && vars.edges.arrows.value
                       ? target.d3plus.r + marker
                       : target.d3plus.r
        , sourceOffset = d3plus.util.offset( angle
                                           , sourceRadius
                                           , vars.shape.value )
        , targetOffset = d3plus.util.offset( angle
                                           , targetRadius
                                           , vars.shape.value )

      source.d3plus.dx = source.d3plus.x - sourceOffset.x
      source.d3plus.dy = source.d3plus.y - sourceOffset.y
      target.d3plus.dx = target.d3plus.x + targetOffset.x
      target.d3plus.dy = target.d3plus.y + targetOffset.y

      return true
    }

    return false

  })

  var lines = vars.g.edges.selectAll("g.d3plus_edge_line")
    .data(line_data,function(d){

      if (!d.d3plus) {
        d.d3plus = {}
      }

      d.d3plus.id = d[vars.edges.source][vars.id.key]+"_"+d[vars.edges.target][vars.id.key]

      return d.d3plus.id

    })

  var spline_data = edges.filter(function(l){

    if (l.d3plus && l.d3plus.spline) {

      if (!l.d3plus) {
        l.d3plus = {}
      }

      if (strokeBuckets) {
        var size = l[vars.edges.size]
        l.d3plus.bucket = size < strokeBuckets[1] ? 0
                        : size < strokeBuckets[2] ? 1 : 2
        var marker = markerSize[l.d3plus.bucket]*.85/scale
      }
      else {
        delete l.d3plus.bucket
        var marker = markerSize*.85/scale
      }

      var source = l[vars.edges.source]
        , target = l[vars.edges.target]
        , sourceMod = source.d3plus.depth == 2 ? -marker : marker
        , targetMod = target.d3plus.depth == 2 ? -marker : marker
        , sourceRadius = direction == "source" && vars.edges.arrows.value
                       ? source.d3plus.r + sourceMod
                       : source.d3plus.r
        , targetRadius = direction == "target" && vars.edges.arrows.value
                       ? target.d3plus.r + targetMod
                       : target.d3plus.r

      source.d3plus.dr = sourceRadius
      target.d3plus.dr = targetRadius

      return true

    }

    return false

  })

  var splines = vars.g.edges.selectAll("g.d3plus_edge_path")
    .data(spline_data,function(d){

      if (!d.d3plus) {
        d.d3plus = {}
      }

      d.d3plus.id = d[vars.edges.source][vars.id.key]+"_"+d[vars.edges.target][vars.id.key]

      return d.d3plus.id

    })

  if (vars.timing) {

    lines.exit().transition().duration(vars.timing)
      .attr("opacity",0)
      .remove()

    splines.exit().transition().duration(vars.timing)
      .attr("opacity",0)
      .remove()

    lines.selectAll("text.d3plus_label, rect.d3plus_label_bg")
      .transition().duration(vars.timing/2)
      .attr("opacity",0)
      .remove()

    splines.selectAll("text.d3plus_label, rect.d3plus_label_bg")
      .transition().duration(vars.timing/2)
      .attr("opacity",0)
      .remove()

    lines.selectAll("line").transition().duration(vars.timing)
      .call(line)
      .call(style)
      .each("end",label)

    splines.selectAll("path").transition().duration(vars.timing)
      .call(spline)
      .call(style)
      .each("end",label)

    lines.enter().append("g")
      .attr("class","d3plus_edge_line")
      .append("line")
      .call(line)
      .call(init)
      .transition().duration(vars.timing)
        .call(style)
        .each("end",label)

    splines.enter().append("g")
      .attr("class","d3plus_edge_path")
      .append("path")
      .call(spline)
      .call(init)
      .transition().duration(vars.timing)
        .call(style)
        .each("end",label)

  }
  else {

    lines.exit().remove()

    splines.exit().remove()

    lines.selectAll("text.d3plus_label, rect.d3plus_label_bg")
      .remove()

    splines.selectAll("text.d3plus_label, rect.d3plus_label_bg")
      .remove()

    lines.selectAll("line")
      .call(line)
      .call(style)
      .call(label)

    splines.selectAll("path")
      .call(spline)
      .call(style)
      .call(label)

    lines.enter().append("g")
      .attr("class","d3plus_edge_line")
      .append("line")
      .call(line)
      .call(init)
      .call(style)
      .call(label)

    splines.enter().append("g")
      .attr("class","d3plus_edge_path")
      .append("path")
      .call(spline)
      .call(init)
      .call(style)
      .call(label)

  }

  vars.g.edges.selectAll("g")
    .sort(function(a,b){
      var a = vars.connected(a),
          b = vars.connected(b)
      return a - b
    })

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws "square" and "circle" shapes using svg:rect
//------------------------------------------------------------------------------
d3plus.shape.fill = function(vars,selection,enter,exit) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // The position and size of each rectangle on enter and exit.
  //----------------------------------------------------------------------------
  function init(nodes) {

    nodes
      .attr("x",0)
      .attr("y",0)
      .attr("width",0)
      .attr("height",0)

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // The position and size of each rectangle on update.
  //----------------------------------------------------------------------------
  function update(nodes,mod) {
    if (!mod) var mod = 0
    nodes
      .attr("x",function(d){
        var w = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.width
        return (-w/2)-(mod/2)
      })
      .attr("y",function(d){
        var h = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.height
        return (-h/2)-(mod/2)
      })
      .attr("width",function(d){
        var w = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.width
        return w+mod
      })
      .attr("height",function(d){
        var h = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.height
        return h+mod
      })
      .attr("rx",function(d){
        var w = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.width
        var rounded = ["circle","donut"].indexOf(vars.shape.value) >= 0
        return rounded ? (w+mod)/2 : 0
      })
      .attr("ry",function(d){
        var h = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.height
        var rounded = ["circle","donut"].indexOf(vars.shape.value) >= 0
        return rounded ? (h+mod)/2 : 0
      })
      .attr("shape-rendering",function(d){
        if (["square"].indexOf(vars.shape.value) >= 0) {
          return vars.style.rendering
        }
        else {
          return "auto"
        }
      })
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // In order to correctly animate each donut's size and arcs, we need to store
  // it's previous values in a lookup object that does not get destroyed when
  // redrawing the visualization.
  //----------------------------------------------------------------------------
  if (!vars.arcs) {
    vars.arcs = {
      "donut": {},
      "active": {},
      "temp": {}
    }
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // This is the main arc function that determines what values to use for each
  // arc angle and radius.
  //----------------------------------------------------------------------------
  var arc = d3.svg.arc()
    .startAngle(0)
    .endAngle(function(d){
      var a = vars.arcs[d.d3plus.shapeType][d.d3plus.id].a
      return a > Math.PI*2 ? Math.PI*2 : a;
    })
    .innerRadius(function(d){
      if (shape == "donut" && !d.d3plus.static) {
        var r = vars.arcs[d.d3plus.shapeType][d.d3plus.id].r
        return r * vars.style.data.donut.size
      }
      else {
        return 0
      }
    })
    .outerRadius(function(d){
      var r = vars.arcs[d.d3plus.shapeType][d.d3plus.id].r
      if (d.d3plus.shapeType != "donut") return r*2
      else return r
    })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // This is the main "arcTween" function where all of the animation happens
  // for each arc.
  //----------------------------------------------------------------------------
  function size(path,mod,rad,ang) {
    if (!mod) var mod = 0
    if (typeof rad != "number") var rad = undefined
    if (typeof ang != "number") var ang = undefined
    path.attrTween("d", function(d){
      if (rad == undefined) var r = d.d3plus.r ? d.d3plus.r : d3.max([d.d3plus.width,d.d3plus.height])
      else var r = rad
      if (ang == undefined) var a = d.d3plus.a[d.d3plus.shapeType]
      else var a = ang
      if (!vars.arcs[d.d3plus.shapeType][d.d3plus.id]) {
        vars.arcs[d.d3plus.shapeType][d.d3plus.id] = {"r": 0}
        vars.arcs[d.d3plus.shapeType][d.d3plus.id].a = d.d3plus.shapeType == "donut" ? Math.PI * 2 : 0
      }
      var radius = d3.interpolate(vars.arcs[d.d3plus.shapeType][d.d3plus.id].r,r+mod),
          angle = d3.interpolate(vars.arcs[d.d3plus.shapeType][d.d3plus.id].a,a)

      return function(t) {
        vars.arcs[d.d3plus.shapeType][d.d3plus.id].r = radius(t)
        vars.arcs[d.d3plus.shapeType][d.d3plus.id].a = angle(t)
        return arc(d)
      }
    })
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Check each data point for active and temp data
  //----------------------------------------------------------------------------
  selection.each(function(d){

    var active = vars.active.key ? d.d3plus[vars.active.key] : d.d3plus.active,
        temp = vars.temp.key ? d.d3plus[vars.temp.key] : d.d3plus.temp,
        total = vars.total.key ? d.d3plus[vars.total.key] : d.d3plus.total,
        group = d3.select(this),
        color = d3plus.variable.color(vars,d)

    var fill_data = [], hatch_data = []

    if (total && d3plus.apps[vars.type.value].fill) {

      if (temp) {
        var copy = d3plus.util.copy(d)
        copy.d3plus.shapeType = "temp"
        fill_data.push(copy)
        hatch_data = ["temp"]
      }

      if (active && (active < total || temp)) {
        var copy = d3plus.util.copy(d)
        copy.d3plus.shapeType = "active"
        fill_data.push(copy)
      }

    }

    function hatch_lines(l) {
      l
        .attr("stroke",color)
        .attr("stroke-width",1)
        .attr("shape-rendering",vars.style.rendering)
    }

    var pattern = vars.defs.selectAll("pattern#d3plus_hatch_"+d.d3plus.id)
      .data(hatch_data)

    if (vars.timing) {

      pattern.selectAll("rect")
        .transition().duration(vars.timing)
        .style("fill",color)

      pattern.selectAll("line")
        .transition().duration(vars.timing)
        .style("stroke",color)

    }
    else {

      pattern.selectAll("rect").style("fill",color)

      pattern.selectAll("line").style("stroke",color)

    }

    var pattern_enter = pattern.enter().append("pattern")
      .attr("id","d3plus_hatch_"+d.d3plus.id)
      .attr("patternUnits","userSpaceOnUse")
      .attr("x","0")
      .attr("y","0")
      .attr("width","10")
      .attr("height","10")
      .append("g")

    pattern_enter.append("rect")
      .attr("x","0")
      .attr("y","0")
      .attr("width","10")
      .attr("height","10")
      .attr("fill",color)
      .attr("fill-opacity",0.25)

    pattern_enter.append("line")
      .attr("x1","0")
      .attr("x2","10")
      .attr("y1","0")
      .attr("y2","10")
      .call(hatch_lines)

    pattern_enter.append("line")
      .attr("x1","-1")
      .attr("x2","1")
      .attr("y1","9")
      .attr("y2","11")
      .call(hatch_lines)

    pattern_enter.append("line")
      .attr("x1","9")
      .attr("x2","11")
      .attr("y1","-1")
      .attr("y2","1")
      .call(hatch_lines)

    var clip_data = fill_data.length ? [d] : []

    var clip = group.selectAll("#d3plus_clip_"+d.d3plus.id)
      .data(clip_data)

    clip.enter().insert("clipPath",".d3plus_mouse")
      .attr("id","d3plus_clip_"+d.d3plus.id)
      .append("rect")
      .attr("class","d3plus_clipping")
      .call(init)

    if (vars.timing) {
      
      clip.selectAll("rect").transition().duration(vars.timing)
        .call(update)

      clip.exit().transition().delay(vars.timing)
        .remove()

    }
    else {

      clip.selectAll("rect").call(update)

      clip.exit().remove()

    }

    var fills = group.selectAll("path.d3plus_fill")
      .data(fill_data)

    fills.transition().duration(vars.timing)
      .call(d3plus.shape.style,vars)
      .call(size)

    fills.enter().insert("path","rect.d3plus_mouse")
      .attr("class","d3plus_fill")
      .attr("clip-path","url(#d3plus_clip_"+d.d3plus.id+")")
      .transition().duration(0)
        .call(size,0,undefined,0)
        .call(d3plus.shape.style,vars)
        .transition().duration(vars.timing)
          .call(size)

    fills.exit().transition().duration(vars.timing)
      .call(size,0,undefined,0)
      .remove()

  })

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws "labels" using svg:text and d3plus.util.wordwrap
//------------------------------------------------------------------------------
d3plus.shape.labels = function(vars,selection) {

  var scale = vars.zoom_behavior.scaleExtent()

  var opacity = function(elem) {

    elem
      .attr("opacity",function(d){
        if (!d) var d = {"scale": scale[1]}
        var size = parseFloat(d3.select(this).attr("font-size"),10)
        d.visible = size/d.scale*vars.zoom.scale >= 7
        return d.visible ? 1 : 0
      })

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Label Exiting
  //----------------------------------------------------------------------------
  remove = function(text) {

    if (vars.timing) {
      text
        .transition().duration(vars.timing)
        .attr("opacity",0)
        .remove()
    }
    else {
      text.remove()
    }

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Label Styling
  //----------------------------------------------------------------------------
  style = function(text,wrap) {

    function x_pos(t) {

      var align = t.anchor || vars.style.labels.align,
          tspan = this.tagName == "tspan",
          share = tspan ? this.parentNode.className.baseVal == "d3plus_share" : this.className.baseVal == "d3plus_share",
          width = d3.select(this).node().getComputedTextLength()/scale[1]

      if (align == "middle" || share) {
        var pos = t.x-width/2
      }
      else if ((align == "end" && !d3plus.rtl) || (align == "start" && d3plus.rtl)) {
        var pos = t.x+(t.w-t.padding)/2-width
      }
      else {
        var pos = t.x-(t.w-t.padding)/2
      }

      if (tspan) {
        var t_width = this.getComputedTextLength()/scale[1]
        if (align == "middle") {
          if (d3plus.rtl) {
            pos -= (width-t_width)/2
          }
          else {
            pos += (width-t_width)/2
          }
        }
        else if (align == "end") {
          if (d3plus.rtl) {
            pos -= (width-t_width)
          }
          else {
            pos += (width-t_width)
          }
        }
      }

      if (d3plus.rtl) {
        pos += width
      }

      return pos*scale[1]

    }

    function y_pos(t) {

      if (d3.select(this).select("tspan").empty()) {
        return 0
      }
      else {

        var align = vars.style.labels.align,
            height = d3.select(this).node().getBBox().height/scale[1],
            diff = (parseFloat(d3.select(this).style("font-size"),10)/5)/scale[1]

        if (this.className.baseVal == "d3plus_share") {
          var data = d3.select(this.parentNode).datum()
          var pheight = data.d3plus.r ? data.d3plus.r*2 : data.d3plus.height
          pheight = pheight/scale[1]
          if (align == "end") {
            var y = t.y-pheight/2+diff/2
          }
          else {
            var y = t.y+pheight/2-height-diff/2
          }
        }
        else {

          if (align == "middle" || t.valign == "center") {
            var y = t.y-height/2-diff/2
          }
          else if (align == "end") {
            var y = t.y+(t.h-t.padding)/2-height+diff/2
          }
          else {
            var y = t.y-(t.h-t.padding)/2-diff
          }

        }

        return y*scale[1]

      }
    }

    text
      .attr("font-weight",vars.style.labels.font.weight)
      .attr("font-family",vars.style.labels.font.family)
      .attr("text-anchor","start")
      .attr("pointer-events",function(t){
        return t.mouse ? "auto": "none"
      })
      .attr("fill", function(t){
        if (t.color) {
          return t.color
        }
        else {
          return d3plus.color.text(d3plus.shape.color(t.parent,vars))
        }
      })
      .attr("x",x_pos)
      .attr("y",y_pos)

    if (wrap) {

      text
        .each(function(t){

          if (t.resize instanceof Array) {
            var min = t.resize[0]
              , max = t.resize[1]
          }

          if (t.text) {


            if (!(t.resize instanceof Array)) {
              var min = 8
                , max = 70
            }

            d3plus.util.wordwrap({
              "text": vars.format(t.text*100,"share")+"%",
              "parent": this,
              "width": t.w*t.scale-t.padding,
              "height": t.h*t.scale-t.padding,
              "resize": t.resize,
              "font_min": min/t.scale,
              "font_max": max*t.scale
            })

          }
          else {

            if (vars.style.labels.align != "middle") {
              var height = t.h-t.share
            }
            else {
              var height = t.h
            }

            if (!(t.resize instanceof Array)) {
              var min = 8
                , max = 40
            }

            d3plus.util.wordwrap({
              "text": t.names,
              "parent": this,
              "width": t.w*t.scale-t.padding,
              "height": height*t.scale-t.padding,
              "resize": t.resize,
              "font_min": min/t.scale,
              "font_max": max*t.scale
            })

          }

        })
        .attr("x",x_pos)
        .attr("y",y_pos)

    }

    text
      .attr("transform",function(t){
        var a = t.angle || 0,
            x = t.translate && t.translate.x || 0,
            y = t.translate && t.translate.y || 0

        return "rotate("+a+","+x+","+y+")scale("+1/scale[1]+")"
      })
      .selectAll("tspan")
        .attr("x",x_pos)
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Loop through each selection and analyze the labels
  //----------------------------------------------------------------------------
  if (vars.labels.value) {

    selection.each(function(d){

      var disabled = d.d3plus && "label" in d.d3plus && !d.d3plus.label,
          stat = d.d3plus && "static" in d.d3plus && d.d3plus.static
          label = d.d3plus_label ? d.d3plus_label : vars.zoom.labels ? vars.zoom.labels[d.d3plus.id] : null,
          share = d.d3plus_share,
          names = label && label.names ? label.names : d3plus.variable.text(vars,d),
          group = label && "group" in label ? label.group : d3.select(this),
          share_size = 0,
          fill = d3plus.apps[vars.type.value].fill

      if (label) {

        if (["line","area"].indexOf(vars.shape.value) >= 0) {
          var background = true
        }
        else if (d && "d3plus" in d) {
          var active = vars.active.key ? d.d3plus[vars.active.key] : d.d3plus.active,
              temp = vars.temp.key ? d.d3plus[vars.temp.key] : d.d3plus.temp,
              total = vars.total.key ? d.d3plus[vars.total.key] : d.d3plus.total,
              background = (!temp && !active) || (active == total)
        }

      }

      if (!disabled && (background || !fill) && !stat) {

        if (share && d.d3plus.share && vars.style.labels.align != "middle") {

          share.resize = vars.labels.resize.value === false ? false :
            share && "resize" in share ? share.resize : true

          share.scale = share.resize ? scale[1] : scale[0]

          share.padding = (vars.style.labels.padding/share.scale)*2

          share.text = d.d3plus.share
          share.parent = d

          var text = group.selectAll("text#d3plus_share_"+d.d3plus.id)
            .data([share],function(t){
              return t.w+""+t.h+""+t.text
            })

          if (vars.timing) {

            text
              .transition().duration(vars.timing/2)
              .call(style)

            text.enter().append("text")
              .attr("font-size",vars.style.labels.font.size*share.scale)
              .attr("id","d3plus_share_"+d.d3plus.id)
              .attr("class","d3plus_share")
              .attr("opacity",0)
              .call(style,true)
              .transition().duration(vars.timing/2)
              .delay(vars.timing/2)
              .attr("opacity",0.5)

          }
          else {

            text
              .attr("opacity",0.5)
              .call(style)

            text.enter().append("text")
              .attr("font-size",vars.style.labels.font.size*share.scale)
              .attr("id","d3plus_share_"+d.d3plus.id)
              .attr("class","d3plus_share")
              .attr("opacity",0.5)
              .call(style,true)

          }

          share_size = text.node().getBBox().height

          text.exit().call(remove)

        }
        else {
          group.selectAll("text.d3plus_share")
            .call(remove)
        }

        if (label) {

          label.resize = vars.labels.resize.value === false ? false :
            label && "resize" in label ? label.resize : true

          label.scale = label.resize ? scale[1] : scale[0]

          label.padding = (vars.style.labels.padding/label.scale)*2

        }

        if (label && label.w*label.scale-label.padding >= 20 && label.h*label.scale-label.padding >= 10 && names.length) {

          label.names = names

          label.share = share_size
          label.parent = d

          var text = group.selectAll("text#d3plus_label_"+d.d3plus.id)
            .data([label],function(t){
              if (!t) return false
              return t.w+"_"+t.h+"_"+t.x+"_"+t.y+"_"+t.names.join("_")
            })

          if (vars.timing) {

            text
              .transition().duration(vars.timing/2)
              .call(style)

            text.enter().append("text")
              .attr("font-size",vars.style.labels.font.size*label.scale)
              .attr("id","d3plus_label_"+d.d3plus.id)
              .attr("class","d3plus_label")
              .attr("opacity",0)
              .call(style,true)
              .transition().duration(vars.timing/2)
              .delay(vars.timing/2)
              .call(opacity)

          }
          else {

            text
              .attr("opacity",1)
              .call(style)

            text.enter().append("text")
              .attr("font-size",vars.style.labels.font.size*label.scale)
              .attr("id","d3plus_label_"+d.d3plus.id)
              .attr("class","d3plus_label")
              .call(style,true)
              .call(opacity)

          }

          text.exit().call(remove)

          if (text.size() == 0 || text.html() == "") {
            delete d.d3plus_label
            group.selectAll("text.d3plus_label, rect.d3plus_label_bg")
              .call(remove)
          }
          else {

            if (label.background) {

              var background_data = ["background"]

              var bounds = text.node().getBBox()

              bounds.width += vars.style.labels.padding*scale[0]
              bounds.height += vars.style.labels.padding*scale[0]
              bounds.x -= (vars.style.labels.padding*scale[0])/2
              bounds.y -= (vars.style.labels.padding*scale[0])/2

            }
            else {
              var background_data = [],
                  bounds = {}
            }

            var bg = group.selectAll("rect#d3plus_label_bg_"+d.d3plus.id)
                       .data(background_data)
              , bg_opacity = typeof label.background == "number"
                        ? label.background : 0.6

            function bg_style(elem) {

              var color = vars.style.background == "transparent"
                        ? "#ffffff" : vars.style.background
                , fill = typeof label.background == "string"
                       ? label.background : color
                , a = label.angle || 0
                , x = label.translate ? bounds.x+bounds.width/2 : 0
                , y = label.translate ? bounds.y+bounds.height/2 : 0
                , transform = "scale("+1/scale[1]+")rotate("+a+","+x+","+y+")"

              elem
                .attr("fill",fill)
                .attr(bounds)
                .attr("transform",transform)

            }

            if (vars.timing) {

              bg.exit().transition().duration(vars.timing)
                .attr("opacity",0)
                .remove()

              bg.transition().duration(vars.timing)
                .attr("opacity",bg_opacity)
                .call(bg_style)

              bg.enter().insert("rect",".d3plus_label")
                .attr("id","d3plus_label_bg_"+d.d3plus.id)
                .attr("class","d3plus_label_bg")
                .attr("opacity",0)
                .call(bg_style)
                .transition().duration(vars.timing)
                  .attr("opacity",bg_opacity)

            }
            else {

              bg.exit().remove()

              bg.enter().insert("rect",".d3plus_label")
                .attr("id","d3plus_label_bg_"+d.d3plus.id)
                .attr("class","d3plus_label_bg")

              bg.attr("opacity",bg_opacity)
                .call(bg_style)

            }

          }

        }
        else {
          delete d.d3plus_label
          group.selectAll("text#d3plus_label_"+d.d3plus.id+", rect#d3plus_label_bg_"+d.d3plus.id)
            .call(remove)
        }

      }
      else {
        delete d.d3plus_label
        group.selectAll("text#d3plus_label_"+d.d3plus.id+", rect#d3plus_label_bg_"+d.d3plus.id)
          .call(remove)
      }
    })

  }
  else {

    selection.selectAll("text.d3plus_label, rect.d3plus_label_bg")
      .call(remove)

    vars.g.labels.selectAll("text.d3plus_label, rect.d3plus_label_bg")
      .call(remove)

  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws "line" shapes using svg:line
//------------------------------------------------------------------------------
d3plus.shape.line = function(vars,selection,enter,exit) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // The D3 line function that determines what variables to use for x and y
  // positioning, as well as line interpolation defined by the user.
  //----------------------------------------------------------------------------
  var line = d3.svg.line()
    .x(function(d){ return d.d3plus.x; })
    .y(function(d){ return d.d3plus.y; })
    .interpolate(vars.shape.interpolate.value)

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Divide each line into it's segments. We do this so that there can be gaps
  // in the line and mouseover.
  //
  // Then, create new data group from values to become small nodes at each
  // point on the line.
  //----------------------------------------------------------------------------

  var hitarea = vars.style.data.stroke.width
  if (hitarea < 30) {
    hitarea = 30
  }

  selection.each(function(d){

    var step = false,
        segments = [],
        nodes = [],
        temp = d3plus.util.copy(d),
        group = d3.select(this)

    temp.values = []
    d.values.forEach(function(v,i,arr){
      nodes.push(v)
      var k = v[vars[vars.continuous_axis].key],
          index = vars.tickValues[vars.continuous_axis].indexOf(k)

      if (step === false) {
        step = index
      }

      if (i+step == index) {
        temp.values.push(v)
        temp.key += "_"+segments.length
      }
      else {
        if (i > 0) {
          segments.push(temp)
          temp = d3plus.util.copy(d)
          temp.values = []
        }
        temp.values.push(v)
        temp.key += "_"+segments.length
        step++
      }
      if (i == arr.length-1) {
        segments.push(temp)
      }
    })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Bind segment data to "paths"
    //--------------------------------------------------------------------------
    var paths = group.selectAll("path.d3plus_line")
      .data(segments, function(d){
        return d.key
      })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Bind node data to "rects"
    //--------------------------------------------------------------------------
    var rects = group.selectAll("rect.d3plus_anchor")
      .data(nodes, function(d){
        return d.d3plus.id
      })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // "paths" and "rects" Enter/Update
    //--------------------------------------------------------------------------
    if (vars.timing) {

      paths.transition().duration(vars.timing)
        .attr("d",function(d){ return line(d.values) })
        .call(d3plus.shape.style,vars)

      paths.enter().append("path")
        .attr("class","d3plus_line")
        .attr("d",function(d){ return line(d.values) })
        .call(d3plus.shape.style,vars)

      rects.enter().append("rect")
        .attr("class","d3plus_anchor")
        .attr("id",function(d){
          return d.d3plus.id
        })
        .call(init)
        .call(d3plus.shape.style,vars)

      rects.transition().duration(vars.timing)
        .call(update)
        .call(d3plus.shape.style,vars)

      rects.exit().transition().duration(vars.timing)
        .call(init)
        .remove()

    }
    else {

      paths.enter().append("path")
        .attr("class","d3plus_line")

      paths
        .attr("d",function(d){ return line(d.values) })
        .call(d3plus.shape.style,vars)

      rects.enter().append("rect")
        .attr("class","d3plus_anchor")
        .attr("id",function(d){
          return d.d3plus.id
        })

      rects.call(update)
        .call(d3plus.shape.style,vars)

    }

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Create mouse event lines
    //--------------------------------------------------------------------------
    var mouse = group.selectAll("path.d3plus_mouse")
      .data(segments, function(d){
        return d.key
      })

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Mouse "paths" Enter
    //--------------------------------------------------------------------------
    mouse.enter().append("path")
      .attr("class","d3plus_mouse")
      .attr("d",function(l){ return line(l.values) })
      .style("stroke","black")
      .style("stroke-width",hitarea)
      .style("fill","none")
      .style("stroke-linecap","round")
      .attr("opacity",0)

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Mouse "paths" Update
    //--------------------------------------------------------------------------
    mouse
      .on(d3plus.evt.over,function(m){

        if (!vars.frozen) {

          var mouse = d3.event[vars.continuous_axis]
              positions = d3plus.util.uniques(d.values,function(x){return x.d3plus[vars.continuous_axis]}),
              closest = d3plus.util.closest(positions,mouse)

          var parent_data = d3.select(this.parentNode).datum()
          parent_data.data = d.values[positions.indexOf(closest)]
          parent_data.d3plus = d.values[positions.indexOf(closest)].d3plus

          d3.select(this.parentNode).selectAll("path.d3plus_line")
            .transition().duration(vars.style.timing.mouseevents)
            .style("stroke-width",vars.style.data.stroke.width*2)

          d3.select(this.parentNode).selectAll("rect")
            .transition().duration(vars.style.timing.mouseevents)
            .style("stroke-width",vars.style.data.stroke.width*2)
            .call(update,2)

        }

      })
      .on(d3plus.evt.move,function(d){

        if (!vars.frozen) {

          var mouse = d3.event.x,
              positions = d3plus.util.uniques(d.values,function(x){return x.d3plus.x}),
              closest = d3plus.util.closest(positions,mouse)

          var parent_data = d3.select(this.parentNode).datum()
          parent_data.data = d.values[positions.indexOf(closest)]
          parent_data.d3plus = d.values[positions.indexOf(closest)].d3plus

        }

      })
      .on(d3plus.evt.out,function(d){

        if (!vars.frozen) {

          d3.select(this.parentNode).selectAll("path.d3plus_line")
            .transition().duration(vars.style.timing.mouseevents)
            .style("stroke-width",vars.style.data.stroke.width)

          d3.select(this.parentNode).selectAll("rect")
            .transition().duration(vars.style.timing.mouseevents)
            .style("stroke-width",vars.style.data.stroke.width)
            .call(update)

          var parent_data = d3.select(this.parentNode).datum()
          delete parent_data.data
          delete parent_data.d3plus

        }

      })

    if (vars.timing) {

      mouse.transition().duration(vars.timing)
        .attr("d",function(l){ return line(l.values) })
        .style("stroke-width",hitarea)

    }
    else {

      mouse.attr("d",function(l){ return line(l.values) })
        .style("stroke-width",hitarea)

    }

    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Mouse "paths" Exit
    //--------------------------------------------------------------------------
    mouse.exit().remove()

  })

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // The position and size of each anchor point on enter and exit.
  //----------------------------------------------------------------------------
  function init(n) {

    n
      .attr("x",function(d){
        return d.d3plus.x
      })
      .attr("y",function(d){
        return d.d3plus.y
      })
      .attr("width",0)
      .attr("height",0)

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // The position and size of each anchor point on update.
  //----------------------------------------------------------------------------
  function update(n,mod) {

    if (!mod) var mod = 0

    n
      .attr("x",function(d){
        var w = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.width
        return d.d3plus.x - ((w/2)+(mod/2))
      })
      .attr("y",function(d){
        var h = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.height
        return d.d3plus.y - ((h/2)+(mod/2))
      })
      .attr("width",function(d){
        var w = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.width
        return w+mod
      })
      .attr("height",function(d){
        var h = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.height
        return h+mod
      })
      .attr("rx",function(d){
        var w = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.width
        return (w+mod)/2
      })
      .attr("ry",function(d){
        var h = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.height
        return (h+mod)/2
      })

  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws "square" and "circle" shapes using svg:rect
//------------------------------------------------------------------------------
d3plus.shape.rect = function(vars,selection,enter,exit) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Calculate label position and pass data from parent.
  //----------------------------------------------------------------------------
  function data(d) {

    if (vars.labels.value && !d.d3plus.label) {

      d.d3plus_label = {
        "w": 0,
        "h": 0,
        "x": 0,
        "y": 0
      }

      var w = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.width,
          h = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.height

      // Square bounds
      if (vars.shape.value == "square") {

        d.d3plus_share = {
          "w": w,
          "h": h/4,
          "x": 0,
          "y": 0
        }

        d.d3plus_label.w = w
        d.d3plus_label.h = h

      }
      // Circle bounds
      else {
        d.d3plus_label.w = Math.sqrt(Math.pow(w,2)*.8)
        d.d3plus_label.h = Math.sqrt(Math.pow(h,2)*.8)
      }

    }
    else if (d.d3plus.label) {
      d.d3plus_label = d.d3plus.label
    }

    return [d];

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // The position and size of each rectangle on enter and exit.
  //----------------------------------------------------------------------------
  function init(nodes) {

    nodes
      .attr("x",0)
      .attr("y",0)
      .attr("width",0)
      .attr("height",0)

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // The position and size of each rectangle on update.
  //----------------------------------------------------------------------------
  function update(nodes) {

    nodes
      .attr("x",function(d){
        var w = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.width
        return -w/2
      })
      .attr("y",function(d){
        var h = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.height
        return -h/2
      })
      .attr("width",function(d){
        var w = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.width
        return w
      })
      .attr("height",function(d){
        var h = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.height
        return h
      })
      .attr("rx",function(d){
        var rounded = vars.shape.value == "circle"
        var w = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.width
        return rounded ? (w+2)/2 : 0
      })
      .attr("ry",function(d){
        var rounded = vars.shape.value == "circle"
        var h = d.d3plus.r ? d.d3plus.r*2 : d.d3plus.height
        return rounded ? (h+2)/2 : 0
      })
      .attr("transform",function(d){
        if ("rotate" in d.d3plus) {
          return "rotate("+d.d3plus.rotate+")"
        }
        return ""
      })
      .attr("shape-rendering",function(d){
        if (vars.shape.value == "square" && !("rotate" in d.d3plus)) {
          return vars.style.rendering
        }
        else {
          return "auto"
        }
      })

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // "rects" Enter
  //----------------------------------------------------------------------------
  if (vars.timing) {
    enter.append("rect")
      .attr("class","d3plus_data")
      .call(init)
      .call(d3plus.shape.style,vars)
  }
  else {
    enter.append("rect")
      .attr("class","d3plus_data")
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // "rects" Update
  //----------------------------------------------------------------------------
  if (vars.timing) {
    selection.selectAll("rect.d3plus_data")
      .data(data)
      .transition().duration(vars.timing)
        .call(update)
        .call(d3plus.shape.style,vars)
  }
  else {
    selection.selectAll("rect.d3plus_data")
      .data(data)
      .call(update)
      .call(d3plus.shape.style,vars)
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // "rects" Exit
  //----------------------------------------------------------------------------
  if (vars.timing) {
    exit.selectAll("rect.d3plus_data")
      .transition().duration(vars.timing)
      .call(init)
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Fill style for all shapes
//-------------------------------------------------------------------
d3plus.shape.style = function(nodes,vars) {

  nodes
    .attr("fill",function(d){

      if (d.d3plus && d.d3plus.spline) {
        return "none"
      }
      else {
        return d3plus.shape.color(d,vars)
      }

    })
    .style("stroke", function(d){
      if (d.values) {
        var color = d3plus.shape.color(d.values[0],vars)
      }
      else {
        var color = d3plus.shape.color(d,vars)
      }
      return d3plus.color.legible(color)
    })
    .style("stroke-width",vars.style.data.stroke.width)
    .attr("opacity",vars.style.data.opacity)
    .attr("vector-effect","non-scaling-stroke")

}

d3plus.styles.default = {
  "background": "#ffffff",
  "color": {
    "heatmap": ["#27366C", "#7B91D3", "#9ED3E3", "#F3D261", "#C9853A", "#D74B03"],
    "missing": "#eeeeee",
    "range": ["#D74B03","#eeeeee","#94B153"]
  },
  "data": {
    "donut": {
      "size": 0.35
    },
    "opacity": 0.9,
    "stroke": {
      "width": 1
    }
  },
  "edges": {
    "arrows": 8,
    "color": "#d0d0d0",
    "opacity": 1,
    "width": 1
  },
  "footer": {
    "font": {
      "align": "center",
      "color": "#444",
      "decoration": "none",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "size": 10,
      "transform": "none",
      "weight": 200
    },
    "padding": 5,
    "position": "bottom"
  },
  "font": {
    "color": "#444",
    "decoration": "none",
    "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
    "transform": "none",
    "weight": 200
  },
  "group": {
    "background": true,
  },
  "highlight": {
    "focus": "#444444",
    "primary": "#D74B03",
    "secondary": "#E5B3BB"
  },
  "labels": {
    "align": "middle",
    "padding": 7,
    "segments": 2,
    "font": {
      "decoration": "none",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "size": 12,
      "transform": "none",
      "weight": 200
    }
  },
  "legend": {
    "align": "middle",
    "gradient": {
      "height": 10
    },
    "label": {
      "color": "#444",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "weight": 200,
      "size": 12
    },
    "size": [10,30],
    "tick": {
      "align": "middle",
      "color": "#444",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "weight": 200,
      "size": 10
    }
  },
  "link": {
    "font": {
      "color": "#444",
      "decoration": "none",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "transform": "none",
      "weight": 200
    },
    "hover": {
      "font": {
        "color": "#444",
        "decoration": "underline",
        "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
        "transform": "none",
        "weight": 200
      },
    }
  },
  "message": {
    "font": {
      "color": "#444",
      "decoration": "none",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "size": 18,
      "transform": "none",
      "weight": 200
    },
    "opacity": 0.75,
    "padding": 10
  },
  "rendering": "auto",
  "ticks": {
    "color": "#ccc",
    "font": {
      "color": "#888",
      "decoration": "none",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "size": 12,
      "transform": "none",
      "weight": 200
    },
    "size": 10,
    "width": 1
  },
  "timeline": {
    "align": "middle",
    "background": "#eeeeee",
    "brush": {
      "color": "#fff",
      "opacity": 1
    },
    "handles": {
      "color": "#E5E5E5",
      "hover": "#fff",
      "opacity": 1,
      "size": 3,
      "stroke": "#ccc"
    },
    "height": 20,
    "label": {
      "color": "#444",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "weight": 200,
      "size": 12
    },
    "tick": {
      "align": "middle",
      "color": "#E5E5E5",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "weight": 200,
      "size": 10
    }
  },
  "timing": {
    "mouseevents": 60,
    "transitions": 600
  },
  "title": {
    "font": {
      "align": "center",
      "color": "#444",
      "decoration": "none",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "size": 18,
      "transform": "none",
      "weight": 200
    },
    "height": null,
    "padding": 2,
    "position": "top",
    "sub": {
      "font": {
        "align": "center",
        "color": "#444",
        "decoration": "none",
        "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
        "size": 13,
        "transform": "none",
        "weight": 200
      },
      "padding": 1,
      "position": "top"
    },
    "total": {
      "font": {
        "align": "center",
        "color": "#444",
        "decoration": "none",
        "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
        "size": 13,
        "transform": "none",
        "weight": 200
      },
      "padding": 1,
      "position": "top"
    },
    "width": null
  },
  "tooltip": {
    "anchor": "top center",
    "background": "white",
    "curtain": {
      "color": "#ffffff",
      "opacity": 0.8
    },
    "font": {
      "color": "#444",
      "family": ["Helvetica Neue", "HelveticaNeue", "Helvetica", "Arial", "sans-serif"],
      "size": 12,
      "transform": "none",
      "weight": 200
    },
    "large": 250,
    "small": 200
  },
  "ui": {
    "padding": 5
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates correctly formatted tooltip for Apps
//-------------------------------------------------------------------
d3plus.tooltip.app = function(params) {

  var vars = params.vars,
      d = params.data,
      ex = params.ex,
      mouse = params.mouseevents ? params.mouseevents : false,
      arrow = "arrow" in params ? params.arrow : true,
      id = d3plus.variable.value(vars,d,vars.id.key),
      tooltip_id = params.id || vars.type.value

  if ((d3.event && d3.event.type == "click") && (vars.html.value || vars.tooltip.value.long) && !("fullscreen" in params)) {
    var fullscreen = true,
        arrow = false,
        mouse = true,
        length = "long",
        footer = vars.footer.value

    vars.covered = true
  }
  else {
    var fullscreen = false,
        align = params.anchor || vars.style.tooltip.anchor,
        length = params.length || "short",
        zoom = vars.zoom_direction()

    if (zoom === -1) {
      var key = vars.id.nesting[vars.depth.value-1],
          parent = d3plus.variable.value(vars,id,key),
          solo = vars.id.solo.value.indexOf(parent) >= 0
    }

    if (zoom === 1 && vars.zoom.value) {
      var text = vars.format("Click to Expand")
    }
    else if (zoom === -1 && vars.zoom.value && solo) {
      var text = vars.format("Click to Collapse")
    }
    else if (length == "short" && (vars.html.value || vars.tooltip.value.long) && vars.focus.value != id) {
      var text = "Click for More Info"
    }
    else if (length == "long") {
      var text = vars.footer.value || ""
    }
    else {
      var text = ""
    }

    var footer = text.length ? vars.format(text,"footer") : false

  }

  if ("x" in params) {
    var x = params.x
  }
  else if (d3plus.apps[vars.type.value].tooltip == "follow") {
    var x = d3.mouse(vars.parent.node())[0]
  }
  else {
    var x = d.d3plus.x
    if (vars.zoom.translate && vars.zoom.scale) {
      x = vars.zoom.translate[0]+x*vars.zoom.scale
    }
    x += vars.margin.left
  }

  if ("y" in params) {
    var y = params.y
  }
  else if (d3plus.apps[vars.type.value].tooltip == "follow") {
    var y = d3.mouse(vars.parent.node())[1]
  }
  else {
    var y = d.d3plus.y
    if (vars.zoom.translate && vars.zoom.scale) {
      y = vars.zoom.translate[1]+y*vars.zoom.scale
    }
    y += vars.margin.top
  }

  if ("offset" in params) {
    var offset = params.offset
  }
  else if (d3plus.apps[vars.type.value].tooltip == "follow") {
    var offset = 3
  }
  else {
    var offset = d.d3plus.r ? d.d3plus.r : d.d3plus.height/2
    if (vars.zoom.scale) {
      offset = offset * vars.zoom.scale
    }
  }

  function make_tooltip(html) {

    if (d.d3plus) {

      if (d.d3plus.merged) {
        if (!ex) ex = {}
        ex.items = d.d3plus.merged.length
      }

      var active = vars.active.key ? d3plus.variable.value(vars,d,vars.active.key) : d.d3plus.active,
          temp = vars.temp.key ? d3plus.variable.value(vars,d,vars.temp.key) : d.d3plus.temp,
          total = vars.total.key ? d3plus.variable.value(vars,d,vars.total.key) : d.d3plus.total

      if (typeof active == "number" && active > 0 && total) {
        if (!ex) ex = {}
        var label = vars.active.key || "active"
        ex[label] = active+"/"+total+" ("+vars.format((active/total)*100,"share")+"%)"
      }

      if (typeof temp == "number" && temp > 0 && total) {
        if (!ex) ex = {}
        var label = vars.temp.key || "temp"
        ex[label] = temp+"/"+total+" ("+vars.format((temp/total)*100,"share")+"%)"
      }

      if (d.d3plus.share) {
        if (!ex) ex = {}
        ex.share = vars.format(d.d3plus.share*100,"share")+"%"
      }

    }

    var depth = "depth" in params ? params.depth : vars.depth.value,
        title = d3plus.variable.text(vars,d,depth)[0],
        icon = d3plus.variable.value(vars,d,vars.icon.key,vars.id.nesting[depth]),
        tooltip_data = d3plus.tooltip.data(vars,d,length,ex,depth)

    if ((tooltip_data.length > 0 || footer) || ((!d.d3plus_label && length == "short" && title) || (d.d3plus_label && "visible" in d.d3plus_label && !d.d3plus_label.visible))) {

      if (!title) {
        title = id
      }

      var depth = d.d3plus && "depth" in d.d3plus ? vars.id.nesting[d.d3plus.depth] : vars.id.key

      if (typeof vars.icon.style.value == "string") {
        var icon_style = vars.icon.style.value
      }
      else if (typeof vars.icon.style.value == "object" && vars.icon.style.value[depth]) {
        var icon_style = vars.icon.style.value[depth]
      }
      else {
        var icon_style = "default"
      }

      if (params.width) {
        var width = params.width
      }
      else if (!fullscreen && tooltip_data.length == 0) {
        var width = "auto"
      }
      else {
        var width = vars.style.tooltip.small
      }

      d3plus.tooltip.create({
        "align": align,
        "arrow": arrow,
        "background": vars.style.tooltip.background,
        "curtain": vars.style.tooltip.curtain.color,
        "curtainopacity": vars.style.tooltip.curtain.opacity,
        "fontcolor": vars.style.tooltip.font.color,
        "fontfamily": vars.style.tooltip.font.family,
        "fontsize": vars.style.tooltip.font.size,
        "fontweight": vars.style.tooltip.font.weight,
        "data": tooltip_data,
        "color": d3plus.variable.color(vars,d),
        "footer": footer,
        "fullscreen": fullscreen,
        "html": html,
        "icon": icon,
        "id": tooltip_id,
        "max_height": params.maxheight,
        "max_width": vars.style.tooltip.small,
        "mouseevents": mouse,
        "offset": offset,
        "parent": vars.parent,
        "style": icon_style,
        "title": title,
        "width": width,
        "x": x,
        "y": y
      })

    }
    else {
      d3plus.tooltip.remove(tooltip_id)
    }

  }

  if (fullscreen) {

    if (typeof vars.html.value == "string") {
      make_tooltip(vars.html.value)
    }
    else if (typeof vars.html.value == "function") {
      make_tooltip(vars.html.value(id))
    }
    else if (vars.html.value && typeof vars.html.value == "object" && vars.html.value.url) {
      d3.json(vars.html.value.url,function(data){
        var html = vars.html.value.callback ? vars.html.value.callback(data) : data
        make_tooltip(html)
      })
    }
    else {
      make_tooltip("")
    }

  }
  else {
    make_tooltip("")
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Correctly positions the tooltip's arrow
//-------------------------------------------------------------------
d3plus.tooltip.arrow = function(arrow) {
  arrow
    .style("bottom", function(d){
      if (d.anchor.y != "center" && !d.flip) return "-5px"
      else return "auto"
    })
    .style("top", function(d){
      if (d.anchor.y != "center" && d.flip) return "-5px"
      else if (d.anchor.y == "center") return "50%"
      else return "auto"
    })
    .style("left", function(d){
      if (d.anchor.y == "center" && d.flip) return "-5px"
      else if (d.anchor.y != "center") return "50%"
      else return "auto"
    })
    .style("right", function(d){
      if (d.anchor.y == "center" && !d.flip) return "-5px"
      else return "auto"
    })
    .style("margin-left", function(d){
      if (d.anchor.y == "center") {
        return "auto"
      }
      else {
        if (d.anchor.x == "right") {
          var arrow_x = -d.width/2+d.arrow_offset/2
        }
        else if (d.anchor.x == "left") {
          var arrow_x = d.width/2-d.arrow_offset*2 - 5
        }
        else {
          var arrow_x = -5
        }
        if (d.cx-d.width/2-5 < arrow_x) {
          arrow_x = d.cx-d.width/2-5
          if (arrow_x < 2-d.width/2) arrow_x = 2-d.width/2
        }
        else if (-(d.limit[0]-d.cx-d.width/2+5) > arrow_x) {
          var arrow_x = -(d.limit[0]-d.cx-d.width/2+5)
          if (arrow_x > d.width/2-11) arrow_x = d.width/2-11
        }
        return arrow_x+"px"
      }
    })
    .style("margin-top", function(d){
      if (d.anchor.y != "center") {
        return "auto"
      }
      else {
        if (d.anchor.y == "bottom") {
          var arrow_y = -d.height/2+d.arrow_offset/2 - 1
        }
        else if (d.anchor.y == "top") {
          var arrow_y = d.height/2-d.arrow_offset*2 - 2
        }
        else {
          var arrow_y = -9
        }
        if (d.cy-d.height/2-d.arrow_offset < arrow_y) {
          arrow_y = d.cy-d.height/2-d.arrow_offset
          if (arrow_y < 4-d.height/2) arrow_y = 4-d.height/2
        }
        else if (-(d.limit[1]-d.cy-d.height/2+d.arrow_offset) > arrow_y) {
          var arrow_y = -(d.limit[1]-d.cy-d.height/2+d.arrow_offset)
          if (arrow_y > d.height/2-22) arrow_y = d.height/2-22
        }
        return arrow_y+"px"
      }
    })
}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Create a Tooltip
//-------------------------------------------------------------------
d3plus.tooltip.create = function(params) {

  var default_width = params.fullscreen ? 250 : 200
  params.width = params.width || default_width
  params.max_width = params.max_width || 386
  params.id = params.id || "default"
  params.size = params.fullscreen || params.html ? "large" : "small"
  params.offset = params.offset || 0
  params.arrow_offset = params.arrow ? 8 : 0
  params.x = params.x || 0
  params.y = params.y || 0
  params.color = params.color || "#333"
  params.parent = params.parent || d3.select("body")
  params.curtain = params.curtain || "#fff"
  params.curtainopacity = params.curtainopacity || 0.8
  params.background = params.background || "#fff"
  params.fontcolor = params.fontcolor || "#333"
  params.fontfamily = params.fontfamily || "sans-serif"
  params.fontweight = params.fontweight || "normal"
  params.fontsize = params.fontsize || "12px"
  params.style = params.style || "default"
  params.zindex = params.size == "small" ? 2000 : 500
  if (!params.iconsize) {
    params.iconsize = params.size == "small" ? 22 : 50
  }

  params.limit = [
    parseFloat(params.parent.style("width"),10),
    parseFloat(params.parent.style("height"),10)
  ]

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Function that closes ALL Descriptions
  //-------------------------------------------------------------------
  var close_descriptions = function() {
    d3.selectAll("div.d3plus_tooltip_data_desc").style("height","0px")
    d3.selectAll("div.d3plus_tooltip_data_help").style("background-color","#ccc")
  }

  d3plus.tooltip.remove(params.id)

  params.anchor = {}
  if (params.fullscreen) {
    params.anchor.x = "center"
    params.anchor.y = "center"
    params.x = params.parent ? params.parent.node().offsetWidth/2 : window.innerWidth/2
    params.y = params.parent ? params.parent.node().offsetHeight/2 : window.innerHeight/2
  }
  else if (params.align) {
    var a = params.align.split(" ")
    params.anchor.y = a[0]
    if (a[1]) params.anchor.x = a[1]
    else params.anchor.x = "center"
  }
  else {
    params.anchor.x = "center"
    params.anchor.y = "top"
  }

  var title_width = params.width - 30

  if (params.fullscreen) {
    var curtain = params.parent.append("div")
      .attr("id","d3plus_tooltip_curtain_"+params.id)
      .attr("class","d3plus_tooltip_curtain")
      .style("background-color",params.curtain)
      .style("opacity",params.curtainopacity)
      .style("position","absolute")
      .style("z-index",499)
      .style("top","0px")
      .style("right","0px")
      .style("bottom","0px")
      .style("left","0px")
      .on(d3plus.evt.click,function(){
        d3plus.tooltip.remove(params.id)
      })
  }

  var tooltip = params.parent.append("div")
    .datum(params)
    .attr("id","d3plus_tooltip_id_"+params.id)
    .attr("class","d3plus_tooltip d3plus_tooltip_"+params.size)
    .style("color",params.fontcolor)
    .style("font-family",params.fontfamily)
    .style("font-weight",params.fontweight)
    .style("font-size",params.fontsize+"px")
    .style("position","absolute")
    .style("z-index",params.zindex)
    .on(d3plus.evt.out,function(){
      close_descriptions()
    })

  if (params.max_height) {
    tooltip.style("max-height",params.max_height+"px")
  }

  if (params.fixed) {
    tooltip.style("z-index",500)
    params.mouseevents = true
  }
  else {
    tooltip.style("z-index",2000)
  }

  var container = tooltip.append("div")
    .datum(params)
    .attr("class","d3plus_tooltip_container")
    .style("background-color",params.background)

  if (params.fullscreen && params.html) {

    w = params.parent ? params.parent.node().offsetWidth*0.75 : window.innerWidth*0.75
    h = params.parent ? params.parent.node().offsetHeight*0.75 : window.innerHeight*0.75

    container
      .style("width",w+"px")
      .style("height",h+"px")

    var body = container.append("div")
      .attr("class","d3plus_tooltip_body")
      .style("display","inline-block")
      .style("z-index",1)
      .style("width",params.width+"px")

  }
  else {

    if (params.width == "auto") {
      var w = "auto"
      container.style("max-width",params.max_width+"px")
    }
    else var w = params.width-14+"px"

    var body = container
      .style("width",w)

  }

  if (params.title || params.icon) {
    var header = body.append("div")
      .attr("class","d3plus_tooltip_header")
      .style("position","relative")
      .style("z-index",1)
  }

  if (params.fullscreen) {
    var close = tooltip.append("div")
      .attr("class","d3plus_tooltip_close")
      .style("background-color",params.color)
      .style("color",d3plus.color.text(params.color))
      .style("position","absolute")
      .html("\&times;")
      .on(d3plus.evt.click,function(){
        d3plus.tooltip.remove(params.id)
      })
  }

  if (!params.mouseevents) {
    tooltip.style("pointer-events","none")
  }
  else if (params.mouseevents !== true) {

    var oldout = d3.select(params.mouseevents).on(d3plus.evt.out)

    var newout = function() {

      var target = d3.event.toElement || d3.event.relatedTarget
      if (target) {
        var c = typeof target.className == "string" ? target.className : target.className.baseVal
        var istooltip = c.indexOf("d3plus_tooltip") == 0
      }
      else {
        var istooltip = false
      }
      if (!target || (!ischild(tooltip.node(),target) && !ischild(params.mouseevents,target) && !istooltip)) {
        oldout(d3.select(params.mouseevents).datum())
        close_descriptions()
        d3.select(params.mouseevents).on(d3plus.evt.out,oldout)
      }
    }

    var ischild = function(parent, child) {
       var node = child.parentNode;
       while (node != null) {
         if (node == parent) {
           return true;
         }
         node = node.parentNode;
       }
       return false;
    }

    d3.select(params.mouseevents).on(d3plus.evt.out,newout)
    tooltip.on(d3plus.evt.out,newout)

    var move_event = d3.select(params.mouseevents).on(d3plus.evt.move)
    if (move_event) {
      tooltip.on(d3plus.evt.move,move_event)
    }

  }

  if (params.arrow) {
    var arrow = tooltip.append("div")
      .attr("class","d3plus_tooltip_arrow")
      .style("background-color",params.background)
      .style("position","absolute")
  }

  if (params.icon) {
    var title_icon = header.append("div")
      .attr("class","d3plus_tooltip_icon")
      .style("width",params.iconsize+"px")
      .style("height",params.iconsize+"px")
      .style("z-index",1)
      .style("background-position","50%")
      .style("background-size","100%")
      .style("background-image","url("+params.icon+")")
      .style("display","inline-block")

    if (params.style == "knockout") {
      title_icon.style("background-color",params.color)
    }

    title_width -= title_icon.node().offsetWidth
  }
  
  if (params.title) {
    var mw = params.max_width-6
    if (params.icon) mw -= (params.iconsize+6)
    mw += "px"
    var title = header.append("div")
      .attr("class","d3plus_tooltip_title")
      .style("max-width",mw)
      .style("vertical-align","top")
      .style("width",title_width+"px")
      .style("display","inline-block")
      .style("overflow","hidden")
      .style("text-overflow","ellipsis")
      .style("word-wrap","break-word")
      .style("z-index",1)
      .text(params.title)
  }

  if (params.description) {
    var description = body.append("div")
      .attr("class","d3plus_tooltip_description")
      .text(params.description)
  }

  if (params.data || params.html && !params.fullscreen) {

    var data_container = body.append("div")
      .attr("class","d3plus_tooltip_data_container")
  }

  if (params.data) {

    var val_width = 0, val_heights = {}

    var last_group = null
    params.data.forEach(function(d,i){

      if (d.group) {
        if (last_group != d.group) {
          last_group = d.group
          data_container.append("div")
            .attr("class","d3plus_tooltip_data_title")
            .text(d.group)
        }
      }

      var block = data_container.append("div")
        .attr("class","d3plus_tooltip_data_block")
        .datum(d)

      if (d.highlight) {
        block.style("color",d3plus.color.legible(params.color))
      }

      var name = block.append("div")
          .attr("class","d3plus_tooltip_data_name")
          .html(d.name)
          .on(d3plus.evt.out,function(){
            d3.event.stopPropagation()
          })

      var val = block.append("div")
          .attr("class","d3plus_tooltip_data_value")
          .text(d.value)
          .on(d3plus.evt.out,function(){
            d3.event.stopPropagation()
          })

      if (d3plus.rtl) {
        val.style("left","6px")
      }
      else {
        val.style("right","6px")
      }

      if (params.mouseevents && d.desc) {
        var desc = block.append("div")
          .attr("class","d3plus_tooltip_data_desc")
          .text(d.desc)
          .on(d3plus.evt.out,function(){
            d3.event.stopPropagation()
          })

        var dh = desc.node().offsetHeight

        desc.style("height","0px")

        var help = name.append("div")
          .attr("class","d3plus_tooltip_data_help")
          .text("?")
          .on(d3plus.evt.over,function(){
            var c = d3.select(this.parentNode.parentNode).style("color")
            d3.select(this).style("background-color",c)
            desc.style("height",dh+"px")
          })
          .on(d3plus.evt.out,function(){
            d3.event.stopPropagation()
          })

        name
          .style("cursor","pointer")
          .on(d3plus.evt.over,function(){
            close_descriptions()
            var c = d3.select(this.parentNode).style("color")
            help.style("background-color",c)
            desc.style("height",dh+"px")
          })

        block.on(d3plus.evt.out,function(){
          d3.event.stopPropagation()
          close_descriptions()
        })
      }

      var w = parseFloat(val.style("width"),10)
      if (w > params.width/2) w = params.width/2
      if (w > val_width) val_width = w

      if (i != params.data.length-1) {
        if ((d.group && d.group == params.data[i+1].group) || !d.group && !params.data[i+1].group)
        data_container.append("div")
          .attr("class","d3plus_tooltip_data_seperator")
      }

    })

    data_container.selectAll(".d3plus_tooltip_data_name")
      .style("width",function(){
        var w = parseFloat(d3.select(this.parentNode).style("width"),10)
        return (w-val_width-30)+"px"
      })

    data_container.selectAll(".d3plus_tooltip_data_value")
      .style("width",val_width+"px")
      .each(function(d){
        var h = parseFloat(d3.select(this).style("height"),10)
        val_heights[d.name] = h
      })

    data_container.selectAll(".d3plus_tooltip_data_name")
      .style("min-height",function(d){
        return val_heights[d.name]+"px"
      })

  }

  if (params.html && !params.fullscreen) {
    data_container.append("div")
      .html(params.html)
  }

  var footer = body.append("div")
    .attr("class","d3plus_tooltip_footer")

  if (params.footer) {
    footer.html(params.footer)
  }

  params.height = tooltip.node().offsetHeight

  if (params.html && params.fullscreen) {
    var h = params.height-12
    var w = tooltip.node().offsetWidth-params.width-44
    container.append("div")
      .attr("class","d3plus_tooltip_html")
      .style("width",w+"px")
      .style("height",h+"px")
      .html(params.html)
  }

  params.width = tooltip.node().offsetWidth

  if (params.anchor.y != "center") params.height += params.arrow_offset
  else params.width += params.arrow_offset

  if (params.data || (!params.fullscreen && params.html)) {

    if (!params.fullscreen) {
      var parent_height = params.parent.node().offsetHeight
      var limit = params.fixed ? parent_height-params.y-10 : parent_height-10
      var h = params.height < limit ? params.height : limit
    }
    else {
      var h = params.height
    }
    h -= parseFloat(container.style("padding-top"),10)
    h -= parseFloat(container.style("padding-bottom"),10)
    if (header) {
      h -= header.node().offsetHeight
      h -= parseFloat(header.style("padding-top"),10)
      h -= parseFloat(header.style("padding-bottom"),10)
    }
    if (footer) {
      h -= footer.node().offsetHeight
      h -= parseFloat(footer.style("padding-top"),10)
      h -= parseFloat(footer.style("padding-bottom"),10)
    }

    data_container
      .style("max-height",h+"px")
  }

  params.height = tooltip.node().offsetHeight

  d3plus.tooltip.move(params.x,params.y,params.id);

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates a data object for the Tooltip
//------------------------------------------------------------------------------
d3plus.tooltip.data = function(vars,id,length,extras,depth) {

  if (vars.small) {
    return []
  }

  if (!length) var length = "long"
  if (length == "long") {
    var other_length = "short"
  }
  else {
    var other_length = "long"
  }

  var extra_data = {}
  if (extras && typeof extras == "string") extras = [extras]
  else if (extras && typeof extras == "object") {
    extra_data = d3plus.util.merge(extra_data,extras)
    var extras = []
    for (k in extra_data) {
      extras.push(k)
    }
  }
  else if (!extras) var extras = []

  var tooltip_highlights = []

  if (vars.tooltip.value instanceof Array) {
    var a = vars.tooltip.value
  }
  else if (typeof vars.tooltip.value == "string") {
    var a = [vars.tooltip.value]
  }
  else {

    if (vars.tooltip.value[vars.id.nesting[depth]]) {
      var a = vars.tooltip.value[vars.id.nesting[depth]]
    }
    else {
      var a = vars.tooltip.value
    }

    if (!(a instanceof Array)) {

      if (a[length]) {
        a = a[length]
      }
      else if (a[other_length]) {
        a = []
      }
      else {
        a = d3plus.util.merge({"":[]},a)
      }

    }

    if (typeof a == "string") {
      a = [a]
    }
    else if (!(a instanceof Array)) {
      a = d3plus.util.merge({"":[]},a)
    }

  }

  function format_key(key,group) {
    if (vars.attrs.value[group]) var id_var = group
    else var id_var = null

    if (group) group = vars.format(group)

    var value = extra_data[key] || d3plus.variable.value(vars,id,key,id_var)

    if (value !== false && value !== null) {
      var name = vars.format(key),
          h = tooltip_highlights.indexOf(key) >= 0

      var val = vars.format(value,key)

      var obj = {"name": name, "value": val, "highlight": h, "group": group}

      if (vars.descs.value[key]) obj.desc = vars.descs.value[key]
      if (val) tooltip_data.push(obj)
    }

  }

  var tooltip_data = []
  if (a instanceof Array) {

    extras.forEach(function(e){
      if (a.indexOf(e) < 0) a.push(e)
    })

    a.forEach(function(t){
      format_key(t)
    })

  }
  else {

    if (vars.id.nesting.length && depth < vars.id.nesting.length-1) {
      var a = d3plus.util.copy(a)
      vars.id.nesting.forEach(function(n,i){
        if (i > depth && a[n]) delete a[n]
      })
    }

    if (vars.tooltip.value.long && typeof vars.tooltip.value.long == "object") {
      var placed = []
      for (group in vars.tooltip.value.long) {

        extras.forEach(function(e){
          if (vars.tooltip.value.long[group].indexOf(e) >= 0 && ((a[group] && a[group].indexOf(e) < 0) || !a[group])) {
            if (!a[group]) a[group] = []
            a[group].push(e)
            placed.push(e)
          }
          else if (a[group] && a[group].indexOf(e) >= 0) {
            placed.push(e)
          }
        })
      }
      extras.forEach(function(e){
        if (placed.indexOf(e) < 0) {
          if (!a[""]) a[""] = []
          a[""].push(e)
        }
      })
    }
    else {
      var present = []
      for (group in a) {
        extras.forEach(function(e){
          if (a[group] instanceof Array && a[group].indexOf(e) >= 0) {
            present.push(e)
          }
          else if (typeof a[group] == "string" && a[group] == e) {
            present.push(e)
          }
        })
      }
      if (present.length != extras.length) {
        if (!a[""]) a[""] = []
        extras.forEach(function(e){
          if (present.indexOf(e) < 0) {
            a[""].push(e)
          }
        })
      }
    }

    if (a[""]) {
      a[""].forEach(function(t){
        format_key(t,"")
      })
      delete a[""]
    }

    for (group in a) {
      if (a[group] instanceof Array) {
        a[group].forEach(function(t){
          format_key(t,group)
        })
      }
      else if (typeof a[group] == "string") {
        format_key(a[group],group)
      }
    }

  }

  if (length == "long") {

    var connections = vars.connections(id[vars.id.key],true)
    if (connections.length) {
      connections.forEach(function(c){
        var name = d3plus.variable.text(vars,c)[0],
            color = d3plus.variable.color(vars,c),
            size = vars.style.tooltip.font.size,
            radius = vars.shape.value == "square" ? 0 : size
            styles = [
              "background-color: "+color,
              "border-color: "+d3plus.color.legible(color),
              "border-style: solid",
              "border-width: "+vars.style.data.stroke.width+"px",
              "display: inline-block",
              "height: "+size+"px",
              "left: 0px",
              "position: absolute",
              "width: "+size+"px",
              "top: 0px",
              d3plus.prefix()+"border-radius: "+radius+"px",
            ]
            node = "<div style='"+styles.join("; ")+";'></div>"
        tooltip_data.push({
          "group": vars.format("Primary Connections"),
          "highlight": false,
          "name": "<div style='position:relative;padding-left:"+size*1.5+"px;'>"+node+name+"</div>",
          "value": ""
        })
      })
    }

  }

  return tooltip_data

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Set X and Y position for Tooltip
//-------------------------------------------------------------------

d3plus.tooltip.move = function(x,y,id) {
  
  if (!id) var tooltip = d3.select("div#d3plus_tooltip_id_default")
  else var tooltip = d3.select("div#d3plus_tooltip_id_"+id)
  
  if (tooltip.node()) {
    
    var d = tooltip.datum()
  
    d.cx = x
    d.cy = y
    
    if (!d.fixed) {

      // Set initial values, based off of anchor
      if (d.anchor.y != "center") {

        if (d.anchor.x == "right") {
          d.x = d.cx - d.arrow_offset - 4
        }
        else if (d.anchor.x == "center") {
          d.x = d.cx - d.width/2
        }
        else if (d.anchor.x == "left") {
          d.x = d.cx - d.width + d.arrow_offset + 2
        }

        // Determine whether or not to flip the tooltip
        if (d.anchor.y == "bottom") {
          d.flip = d.cy + d.height + d.offset <= d.limit[1]
        }
        else if (d.anchor.y == "top") {
          d.flip = d.cy - d.height - d.offset < 0
        }
        
        if (d.flip) {
          d.y = d.cy + d.offset + d.arrow_offset
        }
        else {
          d.y = d.cy - d.height - d.offset - d.arrow_offset
        }
    
      }
      else {

        d.y = d.cy - d.height/2
        
        // Determine whether or not to flip the tooltip
        if (d.anchor.x == "right") {
          d.flip = d.cx + d.width + d.offset <= d.limit[0]
        }
        else if (d.anchor.x == "left") {
          d.flip = d.cx - d.width - d.offset < 0
        }
    
        if (d.anchor.x == "center") {
          d.flip = false
          d.x = d.cx - d.width/2
        }
        else if (d.flip) {
          d.x = d.cx + d.offset + d.arrow_offset
        }
        else {
          d.x = d.cx - d.width - d.offset
        }
      }
  
      // Limit X to the bounds of the screen
      if (d.x < 0) {
        d.x = 0
      }
      else if (d.x + d.width > d.limit[0]) {
        d.x = d.limit[0] - d.width
      }
  
      // Limit Y to the bounds of the screen
      if (d.y < 0) {
        d.y = 0
      }
      else if (d.y + d.height > d.limit[1]) {
        d.y = d.limit[1] - d.height
      }
      
    }
    
    tooltip
      .style("top",d.y+"px")
      .style("left",d.x+"px")
  
    if (d.arrow) {
      tooltip.selectAll(".d3plus_tooltip_arrow")
        .call(d3plus.tooltip.arrow)
    }
    
  }
    
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Destroy Tooltips
//-------------------------------------------------------------------

d3plus.tooltip.remove = function(id) {

  // If an ID is specified, only remove that tooltip
  if (id) {
    
    // First remove the background curtain, if the tooltip has one
    d3.selectAll("div#d3plus_tooltip_curtain_"+id).remove()
    // Finally, remove the tooltip itself
    d3.selectAll("div#d3plus_tooltip_id_"+id).remove()
    
  }
  // If no ID is given, remove ALL d3plus tooltips
  else {
    
    // First remove all background curtains on the page
    d3.selectAll("div#d3plus_tooltip_curtain").remove()
    // Finally, remove all tooltip
    d3.selectAll("div.d3plus_tooltip").remove()
    
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates focus tooltip, if applicable
//-------------------------------------------------------------------

d3plus.ui.focus = function(vars) {

  if (!vars.internal_error && vars.focus.value && !vars.small && vars.focus.tooltip.value) {

    var data = vars.data.pool.filter(function(d){
      return d3plus.variable.value(vars,d,vars.id.key) == vars.focus.value
    })

    if (data.length >= 1) {
      data = data[0]
    }
    else {
      data = {}
      data[vars.id.key] = vars.focus.value
    }

    var offset = vars.style.labels.padding

    d3plus.tooltip.app({
      "anchor": "top left",
      "arrow": false,
      "data": data,
      "length": "long",
      "fullscreen": false,
      "id": vars.type.value+"_focus",
      "maxheight": vars.app_height-offset*2,
      "mouseevents": true,
      "offset": 0,
      "vars": vars,
      "x": vars.width.value-vars.margin.right-offset,
      "y": vars.margin.top+offset,
      "width": vars.style.tooltip.large
    })

    if(!d3.select("div#d3plus_tooltip_id_"+vars.type.value+"_focus").empty()) {
      vars.app_width -= (vars.style.tooltip.large+offset*2)
    }

  }
  else {
    d3plus.tooltip.remove(vars.type.value+"_focus")
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates "back" button, if applicable
//------------------------------------------------------------------------------
d3plus.ui.history = function(vars) {

  if (!vars.small && vars.history.states.length > 0) {

    var button = vars.parent.selectAll("div#d3plus_back_button")
      .data(["d3plus_back_button"])

    var size = vars.title.value
      ? vars.style.title.font.size : vars.style.title.sub.font.size

    var color = vars.title.sub.value
      ? vars.style.title.sub.font.color : vars.style.title.font.color

    var family = vars.title.sub.value
      ? vars.style.title.sub.font.family : vars.style.title.font.family

    var weight = vars.title.sub.value
      ? vars.style.title.sub.font.weight : vars.style.title.font.weight

    var padding = vars.title.sub.value
      ? vars.style.title.sub["padding"] : vars.style.title["padding"]

    function style(elem) {

        elem
          .style("position","absolute")
          .style("left",vars.style.ui.padding+"px")
          .style("top",vars.margin.top/2-size/2+"px")
          .style("color", color)
          .style("font-family", family)
          .style("font-weight", weight)
          .style("font-size",size+"px")
          .style("z-index",2000)

    }

    var min_height = size + padding*2
    if (vars.margin.top < min_height) {
      vars.margin.top = min_height
    }

    var enter = button.enter().append("div")
      .attr("id","d3plus_back_button")
      .style("opacity",0)
      .call(style)
      .html(function(){

        if (d3plus.font.awesome) {
          var arrow = "<span style='font-family:FontAwesome;margin-right:5px;'>&#xf104</span>"
        }
        else {
          var arrow = "&laquo; "
        }

        return arrow+vars.format("Back")

      })

    button
      .on(d3plus.evt.over,function(){

        if (!vars.small && vars.history.states.length > 0) {

          d3.select(this)
            .style("cursor","pointer")
            .transition().duration(vars.style.timing.mouseevents)
              .style("color",d3plus.color.lighter(color))

        }

      })
      .on(d3plus.evt.out,function(){

        if (!vars.small && vars.history.states.length > 0) {

          d3.select(this)
            .style("cursor","auto")
            .transition().duration(vars.style.timing.mouseevents)
              .style("color",color)

        }

      })
      .on(d3plus.evt.click,function(){

        vars.back()

      })
      .transition().duration(vars.style.timing.transitions)
        .style("opacity",1)
        .call(style)

  }
  else {
    vars.parent.selectAll("div#d3plus_back_button")
      .transition().duration(vars.style.timing.transitions)
      .style("opacity",0)
      .remove()
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates color key
//------------------------------------------------------------------------------
d3plus.ui.legend = function(vars) {

  var key_display = true,
      square_size = 0,
      key = vars.color.key || vars.id.key

  if (!vars.small && vars.legend.value && key) {

    if (vars.dev.value) d3plus.console.group("Calculating Legend")

    if (vars.data.keys && key in vars.data.keys) {
      var color_type = vars.data.keys[key]
    }
    else if (vars.attrs.keys && key in vars.attrs.keys) {
      var color_type = vars.attrs.keys[key]
    }
    else {
      var color_type = undefined
    }

    if (!vars.color.scale) {

      if (vars.dev.value) d3plus.console.time("determining color groups")

      var color_groups = {},
          placed = []

      if (typeof d3plus.apps[vars.type.value].filter == "function") {
        var data = d3plus.apps[vars.type.value].filter(vars)
      }
      else if (vars.nodes.value && d3plus.apps[vars.type.value].requirements.indexOf("nodes") >= 0) {
        var data = vars.nodes.restriced || vars.nodes.value
      }
      else {
        var data = vars.data.app
      }

      data.forEach(function(d){

        var id = typeof d == "object" ? d[vars.id.key] : d
        if (placed.indexOf(id) < 0) {

          var color = d3plus.variable.color(vars,d)
          if (!color_groups[color]) {
            color_groups[color] = []
          }
          color_groups[color].push(d)
          placed.push(id)
        }

      })

      if (vars.dev.value) d3plus.console.timeEnd("determining color groups")

      if (vars.dev.value) d3plus.console.time("grouping colors")

      var colors = []
      for (color in color_groups) {

        var obj = {
          "color": color,
          "icon_depth": vars.id.nesting[vars.depth.value],
          "name": []
        }

        var i = vars.depth.value == 0 ? 1 : vars.depth.value+1
        while (--i >= 0) {

          var nesting = vars.id.nesting[i]
            , parents = []

          color_groups[color].forEach(function(c){

            var val = d3plus.variable.value(vars,c,nesting)

            if (val && parents.indexOf(val) < 0) {
              parents.push(val)
            }

          })

          if (parents.length == 1) {

            var parent = parents[0]
              , name = d3plus.variable.text(vars,parent,i)

            if (name && obj.name.indexOf(name) < 0) {
              obj.name.push(name.toString())
            }

            if (!obj.icon) {
              var icon = d3plus.variable.value(vars,parent,vars.icon.key,nesting)
              if (icon) {
                obj.icon = icon
                obj.icon_depth = vars.id.nesting[i]
              }
            }

            if (vars.legend.order.val == "id") {
              obj.id = parent
            }
            if (["color","text"].indexOf(vars.legend.order.value) < 0) {
              var key = vars[vars.legend.order.value].key
              obj[vars.legend.order.value] = d3plus.variable.value(vars,parent,key,nesting)
            }

            break;

          }
          else if (i == 0) {

            parents.forEach(function(p){

              var name = d3plus.variable.text(vars,p,i)
              if (name && obj.name.indexOf(name) < 0) {
                obj.name.push(name.toString())
              }

            })

          }

          if (obj.name.length > 0 && obj.icon) {
            break;
          }

        }

        obj.name.sort()
        colors.push(obj)

      }

      if (vars.dev.value) d3plus.console.timeEnd("grouping colors")

      var available_width = vars.width.value

      square_size = vars.style.legend.size

      var key_width = square_size*colors.length+vars.style.ui.padding*(colors.length+1)

      if (square_size instanceof Array) {

        if (vars.dev.value) d3plus.console.time("calculating size")

        for (var i = square_size[1]; i >= square_size[0]; i--) {
          key_width = i*colors.length+vars.style.ui.padding*(colors.length+1)
          if (available_width >= key_width) {
            square_size = i
            break;
          }
        }

        if (vars.dev.value) d3plus.console.timeEnd("calculating size")

      }
      else if (typeof square_size != "number" && square_size !== false) {
        square_size = 30
      }

      if (available_width < key_width || colors.length == 1) {
        key_display = false
      }
      else {

        key_width -= vars.style.ui.padding*2

        if (vars.dev.value) d3plus.console.time("sorting colors")

        var sort = vars.legend.order.sort.value

        colors.sort(function(a,b){

          if (vars.legend.order.value == "color") {

            var a_value = a.color,
                b_value = b.color

            a_value = d3.rgb(a_value).hsl()
            b_value = d3.rgb(b_value).hsl()

            if (a_value.s == 0) a_value = 361
            else a_value = a_value.h
            if (b_value.s == 0) b_value = 361
            else b_value = b_value.h

          }
          else if (vars.legend.order.value == "text") {

            var a_value = a.name[0],
                b_value = b.name[0]

          }
          else {

            var a_value = a[vars.legend.order.value]
              , b_value = b[vars.legend.order.value]

          }

          if(a_value < b_value) return sort == "asc" ? -1 : 1;
          if(a_value > b_value) return sort == "asc" ? 1 : -1;

        })

        if (vars.dev.value) d3plus.console.timeEnd("sorting colors")

        if (vars.style.legend.align == "start") {
          var start_x = vars.style.ui.padding
        }
        else if (vars.style.legend.align == "end") {
          var start_x = available_width - vars.style.ui.padding - key_width
        }
        else {
          var start_x = available_width/2 - key_width/2
        }

        vars.g.legend.selectAll("g.d3plus_scale")
          .transition().duration(vars.style.timing.transitions)
          .attr("opacity",0)
          .remove()

        var keys = vars.g.legend.selectAll("g.d3plus_color")
          .data(colors,function(d){
            return d.url ? d.color+"_"+d.url : d.color
          })

        function position(group) {

          group
            .attr("transform",function(g,i){
              var x = start_x + (i*(vars.style.ui.padding+square_size))
              return "translate("+x+","+vars.style.ui.padding+")"
            })

        }

        var key_enter = keys.enter().append("g")
          .attr("class","d3plus_color")
          .attr("opacity",0)
          .call(position)

        function style(rect) {

          rect
            .attr("width",square_size)
            .attr("height",square_size)
            .attr("fill",function(g){

              d3.select(this.parentNode).selectAll("text")
                .remove()

              if (g.icon) {

                var short_url = d3plus.util.strip(g.icon+"_"+g.color)

                var pattern = vars.defs.selectAll("pattern#"+short_url)
                  .data([short_url])

                if (typeof vars.icon.style.value == "string") {
                  var icon_style = vars.icon.style.value
                }
                else if (typeof vars.icon.style.value == "object" && vars.icon.style.value[g.icon_depth]) {
                  var icon_style = vars.icon.style.value[g.icon_depth]
                }
                else {
                  var icon_style = "default"
                }

                var color = icon_style == "knockout" ? g.color : "none"

                pattern.select("rect").transition().duration(vars.style.timing.transitions)
                  .attr("fill",color)
                  .attr("width",square_size)
                  .attr("height",square_size)

                pattern.select("image").transition().duration(vars.style.timing.transitions)
                  .attr("width",square_size)
                  .attr("height",square_size)

                var pattern_enter = pattern.enter().append("pattern")
                  .attr("id",short_url)
                  .attr("width",square_size)
                  .attr("height",square_size)

                pattern_enter.append("rect")
                  .attr("fill",color)
                  .attr("width",square_size)
                  .attr("height",square_size)

                pattern_enter.append("image")
                  .attr("xlink:href",g.icon)
                  .attr("width",square_size)
                  .attr("height",square_size)
                  .each(function(d){

                    if (g.icon.indexOf("/") == 0 || g.icon.indexOf(window.location.hostname) >= 0) {

                      d3plus.util.dataurl(g.icon,function(base64){

                        pattern.select("image")
                          .attr("xlink:href",base64)

                      })

                    }
                    else {

                      pattern.select("image")
                        .attr("xlink:href",g.icon)

                    }

                  })

                return "url(#"+short_url+")"
              }
              else {

                var text = d3.select(this.parentNode).append("text")

                text
                  .attr("font-size",vars.style.labels.font.size)
                  .attr("font-weight",vars.style.font.weight)
                  .attr("font-family",vars.style.font.family)
                  .attr("text-anchor","start")
                  .attr("fill",d3plus.color.text(g.color))
                  .attr("x",0)
                  .attr("y",0)
                  .each(function(t){

                    if (g.name.length == 1 && g.name[0].length) {

                      d3plus.util.wordwrap({
                        "text": g.name[0],
                        "parent": this,
                        "width": square_size-vars.style.ui.padding*2,
                        "height": square_size-vars.style.ui.padding*2,
                        "resize": vars.labels.resize.value
                      })

                    }

                  })
                  .attr("y",function(t){
                    var h = this.getBBox().height,
                        diff = parseFloat(d3.select(this).style("font-size"),10)/5
                    return square_size/2 - h/2 - diff/2
                  })
                  .selectAll("tspan")
                    .attr("x",function(t){
                      var w = this.getComputedTextLength()
                      return square_size/2 - w/2
                    })

                if (text.select("tspan").empty()) {
                  text.remove()
                }

                return g.color
              }

            })

        }

        key_enter
          .append("rect")
            .attr("class","d3plus_color")
            .call(style)

        if (!d3plus.touch) {

          keys
            .on(d3plus.evt.over,function(d,i){

              if (d.name.length && (d3.select(this).select("text").empty() || d.name.length > 1)) {

                d3.select(this).style("cursor","pointer")

                var x = start_x + (i*(vars.style.ui.padding+square_size)),
                    y = d3.transform(d3.select(this.parentNode).attr("transform")).translate[1]

                x += square_size/2
                y += vars.style.ui.padding+square_size/2

                if (typeof vars.icon.style.value == "string") {
                  var icon_style = vars.icon.style.value
                }
                else if (typeof vars.icon.style.value == "object" && vars.icon.style.value[d.icon_depth]) {
                  var icon_style = vars.icon.style.value[d.icon_depth]
                }
                else {
                  var icon_style = "default"
                }

                var names = []
                d.name.forEach(function(d){
                  if (d instanceof Array) {
                    names.push(d[0])
                  }
                  else {
                    names.push(d)
                  }
                })

                if (names.length == 1) {
                  var title = names[0],
                      description = null
                }
                else {
                  var title = null

                  if (names.length > 4) {
                    var more = names.length-4
                    names = names.slice(0,4)
                    names[4] = vars.format(more+" more")
                  }

                  if (names.length == 2) {
                    var description = names.join(" "+vars.format("and")+" ")
                  }
                  else {
                    names[names.length-1] = vars.format("and")+" "+names[names.length-1]
                    var description = names.join(", ")
                  }

                }

                d3plus.tooltip.create({
                  "align": "top center",
                  "arrow": true,
                  "background": vars.style.tooltip.background,
                  "description": description,
                  "fontcolor": vars.style.tooltip.font.color,
                  "fontfamily": vars.style.tooltip.font.family,
                  "fontweight": vars.style.tooltip.font.weight,
                  // "data": tooltip_data,
                  "color": d.color,
                  "icon": d.icon,
                  "id": "legend",
                  // "mouseevents": mouse,
                  "offset": square_size/2-vars.style.ui.padding,
                  "parent": vars.parent,
                  "style": icon_style,
                  "title": title,
                  "x": x,
                  "y": y,
                  "max_width": 200,
                  "width": "auto"
                })

              }

            })
            .on(d3plus.evt.out,function(d){
              d3plus.tooltip.remove("legend")
            })

        }

        keys.order()
          .transition().duration(vars.style.timing.transitions)
          .attr("opacity",1)
          .call(position)

        keys.selectAll("rect.d3plus_color").transition().duration(vars.style.timing.transitions)
          .call(style)

        keys.exit()
          .transition().duration(vars.style.timing.transitions)
          .attr("opacity",0)
          .remove()

      }

    }
    else if (vars.color.scale) {

      if (vars.dev.value) d3plus.console.time("drawing color scale")

      vars.g.legend.selectAll("g.d3plus_color")
        .transition().duration(vars.style.timing.transitions)
        .attr("opacity",0)
        .remove()

      var values = vars.color.scale.domain(),
          colors = vars.color.scale.range()

      if (values.length <= 2) {
        values = d3plus.util.buckets(values,6)
      }

      var scale = vars.g.legend.selectAll("g.d3plus_scale")
        .data(["scale"])

      scale.enter().append("g")
        .attr("class","d3plus_scale")
        .attr("opacity",0)

      var heatmap = scale.selectAll("#d3plus_legend_heatmap")
        .data(["heatmap"])

      heatmap.enter().append("linearGradient")
        .attr("id", "d3plus_legend_heatmap")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");

      var stops = heatmap.selectAll("stop")
        .data(d3.range(0,colors.length))

      stops.enter().append("stop")
        .attr("stop-opacity",1)

      stops
        .attr("offset",function(i){
          return Math.round((i/(colors.length-1))*100)+"%"
        })
        .attr("stop-color",function(i){
          return colors[i]
        })

      stops.exit().remove()

      var gradient = scale.selectAll("rect#gradient")
        .data(["gradient"])

      gradient.enter().append("rect")
        .attr("id","gradient")
        .attr("x",function(d){
          if (vars.style.legend.align == "middle") {
            return vars.width.value/2
          }
          else if (vars.style.legend.align == "end") {
            return vars.width.value
          }
          else {
            return 0
          }
        })
        .attr("y",vars.style.ui.padding)
        .attr("width", 0)
        .attr("height", vars.style.legend.gradient.height)
        .attr("stroke",vars.style.legend.tick.color)
        .attr("stroke-width",1)
        .style("fill", "url(#d3plus_legend_heatmap)")

      var text = scale.selectAll("text.d3plus_tick")
        .data(d3.range(0,values.length))

      text.enter().append("text")
        .attr("class","d3plus_tick")
        .attr("x",function(d){
          if (vars.style.legend.align == "middle") {
            return vars.width.value/2
          }
          else if (vars.style.legend.align == "end") {
            return vars.width.value
          }
          else {
            return 0
          }
        })
        .attr("y",function(d){
          return this.getBBox().height+vars.style.legend.gradient.height+vars.style.ui.padding*2
        })

      var label_width = 0

      text
        .order()
        .attr("font-weight",vars.style.legend.tick.weight)
        .attr("font-family",vars.style.legend.tick.family)
        .attr("font-size",vars.style.legend.tick.size)
        .attr("text-anchor",vars.style.legend.tick.align)
        .attr("fill",vars.style.legend.tick.color)
        .text(function(d){
          return vars.format(values[d],key)
        })
        .attr("y",function(d){
          return this.getBBox().height+vars.style.legend.gradient.height+vars.style.ui.padding*2
        })
        .each(function(d){
          var w = this.offsetWidth
          if (w > label_width) label_width = w
        })

      label_width += vars.style.labels.padding*2

      var key_width = label_width * (values.length-1)

      if (key_width+label_width < vars.width.value) {

        if (key_width+label_width < vars.width.value/2) {
          key_width = vars.width.value/2
          label_width = key_width/values.length
          key_width -= label_width
        }

        if (vars.style.legend.align == "start") {
          var start_x = vars.style.ui.padding
        }
        else if (vars.style.legend.align == "end") {
          var start_x = vars.width.value - vars.style.ui.padding - key_width
        }
        else {
          var start_x = vars.width.value/2 - key_width/2
        }

        text.transition().duration(vars.style.timing.transitions)
          .attr("x",function(d){
            return start_x + (label_width*d)
          })

        text.exit().transition().duration(vars.style.timing.transitions)
          .attr("opacity",0)
          .remove()

        var ticks = scale.selectAll("rect.d3plus_tick")
          .data(d3.range(0,values.length))

        ticks.enter().append("rect")
          .attr("class","d3plus_tick")
          .attr("x",function(d){
            if (vars.style.legend.align == "middle") {
              return vars.width.value/2
            }
            else if (vars.style.legend.align == "end") {
              return vars.width.value
            }
            else {
              return 0
            }
          })
          .attr("y",vars.style.ui.padding)
          .attr("width",0)
          .attr("height",vars.style.ui.padding+vars.style.legend.gradient.height)
          .attr("fill",vars.style.legend.tick.color)

        ticks.transition().duration(vars.style.timing.transitions)
          .attr("x",function(d){
            var mod = d == 0 ? 1 : 0
            return start_x + (label_width*d) - mod
          })
          .attr("y",vars.style.ui.padding)
          .attr("width",1)
          .attr("height",vars.style.ui.padding+vars.style.legend.gradient.height)
          .attr("fill",vars.style.legend.tick.color)

        ticks.exit().transition().duration(vars.style.timing.transitions)
          .attr("width",0)
          .remove()

        gradient.transition().duration(vars.style.timing.transitions)
          .attr("x",function(d){
            if (vars.style.legend.align == "middle") {
              return vars.width.value/2 - key_width/2
            }
            else if (vars.style.legend.align == "end") {
              return vars.width.value - key_width - vars.style.ui.padding
            }
            else {
              return vars.style.ui.padding
            }
          })
          .attr("y",vars.style.ui.padding)
          .attr("width", key_width)
          .attr("height", vars.style.legend.gradient.height)

        scale.transition().duration(vars.style.timing.transitions)
          .attr("opacity",1)

        if (vars.dev.value) d3plus.console.timeEnd("drawing color scale")

      }
      else {
        key_display = false
      }

    }
    else {
      key_display = false
    }

  }
  else {
    key_display = false
  }
  if (vars.legend.value && key && key_display) {

    if (vars.dev.value) d3plus.console.time("positioning legend")

    if (square_size) {
      var key_height = square_size
    }
    else {
      var key_box = vars.g.legend.node().getBBox(),
          key_height = key_box.height+key_box.y
    }

    if (!vars.g.timeline.node().getBBox().height) {
      vars.margin.bottom += vars.style.ui.padding
    }
    vars.margin.bottom += key_height+vars.style.ui.padding

    vars.g.legend.transition().duration(vars.style.timing.transitions)
      .attr("transform","translate(0,"+(vars.height.value-vars.margin.bottom)+")")

    if (vars.dev.value) d3plus.console.timeEnd("positioning legend")

  }
  else {

    if (vars.dev.value) d3plus.console.time("hiding legend")

    vars.g.legend.transition().duration(vars.style.timing.transitions)
      .attr("transform","translate(0,"+vars.height.value+")")

    if (vars.dev.value) d3plus.console.timeEnd("hiding legend")

  }

  if (vars.legend.value && key && vars.dev.value) {
    d3plus.console.groupEnd()
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates Centered Server Message
//------------------------------------------------------------------------------
d3plus.ui.message = function(vars,message) {

  var message = vars.messages.value ? message : null,
      size = message == vars.internal_error ? "large" : vars.messages.style

  if (size == "large") {
    var font = vars.style.message,
        position = "center"
  }
  else {

    if (vars.footer.value) {
      var font = vars.style.footer
    }
    else if (vars.title.value) {
      var font = vars.style.title
    }
    else if (vars.title.sub.value) {
      var font = vars.style.title.sub
    }
    else if (vars.title.total.value) {
      var font = vars.style.title.total
    }
    else {
      var font = vars.style.title.sub
    }

    var position = font.position

  }

  var font = {
    "color": font.font.color,
    "font-family": font.font.family,
    "font-weight": font.font.weight,
    "font-size": font.font.size+"px",
    "padding": font.padding+"px"
  }

  var background = vars.style.background != "none" ? vars.style.background : "white"

  function style(elem) {

    elem
      .style(font)
      .style("position","absolute")
      .style("background",background)
      .style("text-align","center")
      .style("left",function(){
        return position == "center" ? "50%" : "0px"
      })
      .style("width",function(){
        return position == "center" ? "auto" : vars.width.value+"px"
      })
      .style("margin-left",function(){
        var offset = vars.width.value-vars.app_width
        return position == "center" ? -(this.offsetWidth/2+offset/2)+"px" : "0px"
      })
      .style("top",function(){
        if (position == "center") {
          return "50%";
        }
        else if (position == "top") {
          return "0px"
        }
        else {
          return "auto"
        }
      })
      .style("bottom",function(){
        if (position == "bottom") {
          return "0px"
        }
        else {
          return "auto"
        }
      })
      .style("margin-top",function(){
        if (size == "large") {
          var height = this.offsetHeight
          return -height/2+"px"
        }
        return "0px"
      })

  }

  // Enter Message Group
  vars.g.message = vars.parent.selectAll("div#d3plus_message")
    .data(["message"])

  vars.g.message.enter().append("div")
    .attr("id","d3plus_message")
    .attr("opacity",0)

  var opacity = message ? 1 : 0,
      text = message ? message : vars.g.message.text(),
      display = message ? "inline-block" : "none"

  vars.g.message
    .text(text)
    .call(style)
    // .transition().duration(vars.style.timing.mouseevents)
    .style("opacity",opacity)
    .style("display",display)

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates color key
//-------------------------------------------------------------------

d3plus.ui.timeline = function(vars) {

  var years = vars.data.time

  if (!vars.small && years && years.length > 1 && vars.timeline.value) {

    if ((vars.time.key == vars.x.key && vars.x.scale.value == "continuous") || (vars.time.key == vars.y.key && vars.y.scale.value == "continuous")) {
      var min_required = 2
    }
    else {
      var min_required = 1
    }

    if (vars.time.solo.value.length) {
      var init = d3.extent(vars.time.solo.value)
    }
    else {
      var init = d3.extent(years)
    }

    var min = years[0],
        max = years[years.length-1],
        start = init[0],
        end = init[1],
        year_ticks = [],
        steps = []

    years.forEach(function(y,i){
      if (i != 0) steps.push(y-years[i-1])
    })
    var step = d3.min(steps),
        total = step*years.length
    years = []
    for (var i = min; i <= max; i += step) {
      years.push(i)
      year_ticks.push(d3.time.year(new Date(parseInt(i), 0, 1)))
    }
    year_ticks.push(d3.time.year(new Date(parseInt(max+step), 0, 1)))

    var brushend = function() {

      if (d3.event.sourceEvent !== null) {

        var extent0 = brush.extent(),
            min_val = d3plus.util.closest(year_ticks,d3.time.year.round(extent0[0])),
            max_val = d3plus.util.closest(year_ticks,d3.time.year.round(extent0[1]))

        if (min_val == max_val) {
          min_val = d3plus.util.closest(year_ticks,d3.time.year.floor(extent0[0]))
        }

        var min_index = year_ticks.indexOf(min_val),
            max_index = year_ticks.indexOf(max_val)

        if (max_index-min_index >= min_required) {
          var extent = [min_val,max_val]
        }
        else if (min_index+min_required <= years.length) {
          var extent = [min_val,year_ticks[min_index+min_required]]
        }
        else {

          var extent = [min_val]
          for (var i = 1; i <= min_required; i++) {
            if (min_index+i <= years.length) {
              extent.push(year_ticks[min_index+i])
            }
            else {
              extent.unshift(year_ticks[min_index-((min_index+i)-(years.length))])
            }
          }
          extent = [extent[0],extent[extent.length-1]]
        }

        d3.select(this).transition()
          .call(brush.extent(extent))
          // .call(brush.event)
          .each("end",function(d){

            var new_years = d3.range(extent[0].getFullYear(),extent[1].getFullYear())

            new_years = new_years.filter(function(d){
              return years.indexOf(d) >= 0
            })

            vars.viz.time({"solo": new_years}).draw()

          })

      }
      else {
        return;
      }

    }

    var background = vars.g.timeline.selectAll("rect.d3plus_timeline_background")
      .data(["background"])

    background.enter().append("rect")
      .attr("class","d3plus_timeline_background")

    var ticks = vars.g.timeline.selectAll("g#ticks")
      .data(["ticks"])

    ticks.enter().append("g")
      .attr("id","ticks")
      .attr("transform","translate("+vars.width.value/2+","+vars.style.ui.padding+")")

    var brush_group = vars.g.timeline.selectAll("g#brush")
      .data(["brush"])

    brush_group.enter().append("g")
      .attr("id","brush")

    var labels = vars.g.timeline.selectAll("g#labels")
      .data(["labels"])

    labels.enter().append("g")
      .attr("id","labels")

    var text = labels.selectAll("text")
      .data(years,function(d,i){
        return i
      })

    text.enter().append("text")
      .attr("y",0)
      .attr("dy",0)
      .attr("x",function(d){
        if (vars.style.timeline.align == "middle") {
          return vars.width.value/2
        }
        else if (vars.style.timeline.align == "end") {
          return vars.width.value
        }
        else {
          return 0
        }
      })
      .attr("y",function(d){
        var diff = diff = parseFloat(d3.select(this).style("font-size"),10)/5
        var y = vars.style.ui.padding+vars.style.timeline.height/2+this.getBBox().height/2 - diff
        return y
      })

    var year_width = 0,
        year_height = 0,
        height = vars.style.timeline.height+vars.style.ui.padding

    text
      .order()
      .attr("font-weight",vars.style.timeline.tick.weight)
      .attr("font-family",vars.style.timeline.tick.family)
      .attr("font-size",vars.style.timeline.tick.size)
      .attr("text-anchor",vars.style.timeline.tick.align)
      .attr("opacity",0)
      .text(function(d){
        return d
      })
      .each(function(d){
        var w = this.getBBox().width,
            h = this.getBBox().height
        if (w > year_width) year_width = w
        if (h > year_height) year_height = h
      })

    var label_width = year_width+vars.style.ui.padding*2,
        timeline_width = label_width*years.length,
        available_width = vars.width.value-vars.style.ui.padding*2,
        step = 1

    if (timeline_width > available_width) {
      timeline_width = available_width
      step = Math.ceil(label_width/(timeline_width/years.length))
      label_width = timeline_width/years.length
      for (step; step < years.length-1; step++) {
        if ((years.length-1)%step == 0) {
          break;
        }
      }
      height += year_height
    }

    if (vars.style.timeline.align == "start") {
      var start_x = vars.style.ui.padding
    }
    else if (vars.style.timeline.align == "end") {
      var start_x = vars.width.value - vars.style.ui.padding - timeline_width
    }
    else {
      var start_x = vars.width.value/2 - timeline_width/2
    }

    text
      .text(function(d,i){
        return i%step == 0 ? d : ""
      })
      .attr("opacity",1)

    text.transition().duration(vars.style.timing.transitions)
      .attr("fill",function(d){

        if (d >= init[0] && d <= init[1]) {
          var color1 = vars.style.timeline.background,
              color2 = vars.style.timeline.brush.color,
              opacity = vars.style.timeline.brush.opacity
              mixed = d3plus.color.mix(color2,color1,opacity)

          return d3plus.color.text(mixed)
        }
        return d3plus.color.text(vars.style.timeline.background)
      })
      .attr("x",function(d,i){
        return start_x + (label_width*i) + label_width/2
      })
      .attr("y",function(d){
        var diff = diff = parseFloat(d3.select(this).style("font-size"),10)/5
        var y = vars.style.ui.padding+vars.style.timeline.height/2+this.getBBox().height/2 - diff
        if (step > 1) {
          y += year_height+vars.style.ui.padding
        }
        return y
      })

    text.exit().transition().duration(vars.style.timing.transitions)
      .attr("opacity",0)
      .remove()

    background.transition().duration(vars.style.timing.transitions)
      .attr("width",timeline_width)
      .attr("height",vars.style.timeline.height)
      .attr("x",start_x)
      .attr("y",vars.style.ui.padding)
      .attr("fill",vars.style.timeline.background)

    var x = d3.time.scale()
      .domain(d3.extent(year_ticks))
      .rangeRound([0,timeline_width])

    var brush = d3.svg.brush()
      .x(x)
      .extent([year_ticks[years.indexOf(start)], year_ticks[years.indexOf(end)+1]])
      .on("brushend", brushend)

    ticks.transition().duration(vars.style.timing.transitions)
      .attr("transform","translate("+start_x+","+vars.style.ui.padding+")")
      .call(d3.svg.axis()
        .scale(x)
        .orient("top")
        .ticks(function(){
          return year_ticks
        })
        .tickFormat("")
        .tickSize(-vars.style.timeline.height)
        .tickPadding(0))
        .selectAll("path").attr("fill","none")

    ticks.selectAll("line").transition().duration(vars.style.timing.transitions)
      .attr("stroke",vars.style.timeline.tick.color)
      .attr("shape-rendering",vars.style.rendering)

    brush_group
      .attr("transform","translate("+start_x+","+vars.style.ui.padding+")")
      .attr("opacity",1)
      .call(brush)

    text.attr("pointer-events","none")

    brush_group.selectAll("rect.background, rect.extent")
      .attr("height",vars.style.timeline.height)

    brush_group.selectAll("rect.background")
      .transition().duration(vars.style.timing.transitions)
      .attr("stroke",vars.style.timeline.tick.color)
      .attr("stroke-width",1)
      .style("visibility","visible")
      .attr("fill","none")
      .attr("shape-rendering",vars.style.rendering)

    brush_group.selectAll("rect.extent")
      .transition().duration(vars.style.timing.transitions)
      .attr("fill",vars.style.timeline.brush.color)
      .attr("fill-opacity",vars.style.timeline.brush.opacity)
      .attr("stroke",vars.style.timeline.tick.color)
      .attr("stroke-width",1)
      .attr("shape-rendering",vars.style.rendering)

    if (vars.timeline.handles.value) {

      brush_group.selectAll("g.resize")
        .select("rect")
        .attr("fill",vars.style.timeline.handles.color)
        .attr("stroke",vars.style.timeline.handles.stroke)
        .attr("stroke-width",1)
        .attr("x",-vars.style.timeline.handles.size/2)
        .attr("width",vars.style.timeline.handles.size)
        .attr("height",vars.style.timeline.height)
        .style("visibility","visible")
        .attr("shape-rendering",vars.style.rendering)
        .attr("opacity",vars.style.timeline.handles.opacity)

    }
    else {

      brush_group.selectAll("g.resize")
        .remove()

    }

    if (vars.style.timeline.handles.opacity) {

      brush_group.selectAll("g.resize")
        .on(d3plus.evt.over,function(){
          d3.select(this).select("rect")
            .transition().duration(vars.style.timing.mouseevents)
            .attr("fill",vars.style.timeline.handles.hover)
        })
        .on(d3plus.evt.out,function(){
          d3.select(this).select("rect")
            .transition().duration(vars.style.timing.mouseevents)
            .attr("fill",vars.style.timeline.handles.color)
        })

    }

    vars.margin.bottom += (vars.style.ui.padding*2)+height

    vars.g.timeline.transition().duration(vars.style.timing.transitions)
      .attr("transform","translate(0,"+(vars.height.value-vars.margin.bottom)+")")

  }
  else {

    vars.g.timeline.transition().duration(vars.style.timing.transitions)
      .attr("transform","translate(0,"+vars.height.value+")")

  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws appropriate titles
//------------------------------------------------------------------------------
d3plus.ui.titles = function(vars) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // If there is no data or the title bar is not needed,
  // set the total value to 'null'
  //----------------------------------------------------------------------------
  if (!vars.data.app || !vars.title.total.value || vars.small) {
    var total = null
  }
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Otherwise, let's calculate it!
  //----------------------------------------------------------------------------
  else {

    if (vars.dev.value) {
      d3plus.console.group("Calculating Total Value")
      d3plus.console.time(vars.size.key)
    }

    var total_key = vars.size.key ? vars.size.key
      : vars.color.type == "number" ? vars.color.key : null

    if (vars.focus.value) {
      var total = vars.data.app.filter(function(d){
        return d[vars.id.key] == vars.focus.value
      })
      total = d3.sum(total,function(d){
        return d3plus.variable.value(vars,d,total_key)
      })
    }
    else if (total_key) {
      var total = d3.sum(vars.data.pool,function(d){
        return d3plus.variable.value(vars,d,total_key)
      })
    }

    if (total === 0) {
      total = false
    }

    if (typeof total == "number") {

      var pct = ""

      if (vars.mute.length || vars.solo.length || vars.focus.value) {

        var overall_total = d3.sum(vars.data.filtered.all, function(d){
          if (vars.time.solo.value.length > 0) {
            var match = vars.time.solo.value.indexOf(d3plus.variable.value(vars,d,vars.time.key)) >= 0
          }
          else if (vars.time.mute.value.length > 0) {
            var match = vars.time.solo.value.indexOf(d3plus.variable.value(vars,d,vars.time.key)) < 0
          }
          else {
            var match = true
          }
          if (match) {
            return d3plus.variable.value(vars,d,total_key)
          }
        })

        if (overall_total > total) {

          var pct = (total/overall_total)*100,
              ot = vars.format(overall_total,vars.size.key)

          var pct = " ("+vars.format(pct,"share")+"% of "+ot+")"

        }
      }

      total = vars.format(total,vars.size.key)
      var obj = vars.title.total.value
        , prefix = obj.prefix || vars.format("Total")+": "
      total = prefix + total
      obj.suffix ? total = total + obj.suffix : null
      total += pct

    }

    if (vars.dev.value) {
      d3plus.console.timeEnd(vars.size.key)
      d3plus.console.groupEnd()
    }

  }


  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Initialize titles and detect footer
  //----------------------------------------------------------------------------
  var title_data = []

  if (vars.footer.value) {
    title_data.push({
      "link": vars.footer.link,
      "style": vars.style.footer,
      "type": "footer",
      "value": vars.footer.value
    })
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // If not in "small" mode, detect titles available
  //----------------------------------------------------------------------------
  if (!vars.small) {

    if (vars.title.value) {
      title_data.push({
        "link": vars.title.link,
        "style": vars.style.title,
        "type": "title",
        "value": vars.title.value
      })
    }
    if (vars.title.sub.value) {
      title_data.push({
        "link": vars.title.sub.link,
        "style": vars.style.title.sub,
        "type": "sub",
        "value": vars.title.sub.value
      })
    }
    if (vars.title.total.value && total) {
      title_data.push({
        "link": vars.title.total.link,
        "style": vars.style.title.total,
        "type": "total",
        "value": total
      })
    }

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Title positioning
  //----------------------------------------------------------------------------
  function position(title) {

    title
      .attr("text-anchor",function(t){

        var align = t.style.font.align

        if (align == "center") {
          return "middle"
        }
        else if ((align == "left" && !d3plus.rtl) || (align == "right" && d3plus.rtl)) {
          return "start"
        }
        else if ((align == "left" && d3plus.rtl) || (align == "right" && !d3plus.rtl)) {
          return "end"
        }

      })
      .attr("x",function(t){

        var align = t.style.font.align

        if (align == "center") {
          return vars.width.value/2
        }
        else if ((align == "left" && !d3plus.rtl) || (align == "right" && d3plus.rtl)) {
          return vars.style.padding
        }
        else if ((align == "left" && d3plus.rtl) || (align == "right" && !d3plus.rtl)) {
          return vars.width.value-vars.style.padding
        }

      })
      .attr("y",0)

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Enter Titles
  //----------------------------------------------------------------------------
  function style(title) {

    title
      .attr("font-size",function(t){
        return t.style.font.size
      })
      .attr("fill",function(t){
        return t.link ? vars.style.link.font.color : t.style.font.color
      })
      .attr("font-family",function(t){
        return t.link ? vars.style.link.font.family : t.style.font.family
      })
      .attr("font-weight",function(t){
        return t.link ? vars.style.link.font.weight : t.style.font.weight
      })
      .style("text-decoration",function(t){
        return t.link ? vars.style.link.font.decoration : t.style.font.decoration
      })
      .style("text-transform",function(t){
        return t.link ? vars.style.link.font.transform : t.style.font.transform
      })

  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Enter Titles
  //----------------------------------------------------------------------------
  if (vars.dev.value) d3plus.console.log("Drawing Titles")
  var titles = vars.svg.selectAll("g.d3plus_title")
    .data(title_data,function(t){
      return t.type
    })

  var title_width = vars.style.title.width || vars.width.value

  titles.enter().append("g")
    .attr("class","d3plus_title")
    .attr("opacity",0)
    .attr("transform",function(t){
      var y = t.style.position == "top" ? 0 : vars.height.value
      return "translate(0,"+y+")"
    })
    .append("text")
      .call(position)
      .call(style)

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Wrap text and calculate positions, then transition style and opacity
  //----------------------------------------------------------------------------
  titles
    .each(function(d){

      d3plus.util.wordwrap({
        "text": d.value,
        "parent": d3.select(this).select("text").node(),
        "width": title_width,
        "height": vars.height.value/8,
        "resize": false
      })

      d.y = vars.margin[d.style.position]
      vars.margin[d.style.position] += this.getBBox().height + d.style.padding*2

    })
    .on(d3plus.evt.over,function(t){
      if (t.link) {
        d3.select(this)
          .transition().duration(vars.style.timing.mouseevents)
          .style("cursor","pointer")
          .select("text")
            .attr("fill",vars.style.link.hover.font.color)
            .attr("font-family",vars.style.link.hover.font.family)
            .attr("font-weight",vars.style.link.hover.font.weight)
            .style("text-decoration",vars.style.link.hover.font.decoration)
            .style("text-transform",vars.style.link.hover.font.transform)
      }
    })
    .on(d3plus.evt.out,function(t){
      if (t.link) {
        d3.select(this)
          .transition().duration(vars.style.timing.mouseevents)
          .style("cursor","auto")
          .select("text")
            .call(style)
      }
    })
    .on(d3plus.evt.click,function(t){
      if (t.link) {
        var target = t.link.charAt(0) != "/" ? "_blank" : "_self"
        window.open(t.link,target)
      }
    })
    .transition().duration(vars.timing)
      .attr("opacity",1)
      .attr("transform",function(t){
        var pos = t.style.position,
            y = pos == "top" ? 0+t.y : vars.height.value-t.y
        if (pos == "bottom") {
          y -= this.getBBox().height+t.style.padding
        }
        else {
          y += t.style.padding
        }
        return "translate(0,"+y+")"
      })
      .select("text")
        .call(position)
        .call(style)

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Exit unused titles
  //----------------------------------------------------------------------------
  titles.exit().transition().duration(vars.timing)
    .attr("opacity",0)
    .remove()

  var min = vars.style.title.height
  if (min && vars.margin[vars.style.title.position] < min) {
    vars.margin[vars.style.title.position] = min
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Expands a min/max into a specified number of buckets
//------------------------------------------------------------------------------
d3plus.util.buckets = function(arr, buckets) {
  var return_arr = [], step = 1/(buckets-1)*(arr[1]-arr[0]), i = step

  for (var i = arr[0]; i <= arr[1]; i = i + step) {
    return_arr.push(i)
  }
  if (return_arr.length < buckets) {
    return_arr[buckets-1] = arr[1]
  }
  if (return_arr[return_arr.length-1] < arr[1]) {
    return_arr[return_arr.length-1] = arr[1]
  }
  return return_arr
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Checks to see if element is inside of another elemebt
//------------------------------------------------------------------------------
d3plus.util.child = function(parent,child) {

  if (!parent || !child) {
    return false;
  }

  if (d3plus.util.d3selection(parent)) {
    parent = parent.node()
  }

  if (d3plus.util.d3selection(parent)) {
    child = child.node()
  }

  var node = child.parentNode;
  while (node != null) {
    if (node == parent) {
      return true;
    }
    node = node.parentNode;
  }

  return false;

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Finds closest numeric value in array
//------------------------------------------------------------------------------
d3plus.util.closest = function(arr,value) {
  var closest = arr[0]
  arr.forEach(function(p){
    if (Math.abs(value-p) < Math.abs(value-closest)) {
      closest = p
    }
  })
  return closest
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Clones an object, removing any edges to the original
//------------------------------------------------------------------------------
d3plus.util.copy = function(obj) {
  return d3plus.util.merge(obj)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Cross-browser detect for D3 element
//------------------------------------------------------------------------------
d3plus.util.d3selection = function(selection) {
  return d3plus.ie ?
    typeof selection == "object" && selection instanceof Array
    : selection instanceof d3.selection
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates a Base-64 Data URL from and Image URL
//------------------------------------------------------------------------------
d3plus.util.dataurl = function(url,callback) {

  var img = new Image();
  img.src = url;
  img.crossOrigin = "Anonymous";
  img.onload = function () {

    var canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    var ctx = canvas.getContext("2d");
    ctx.drawImage(this, 0, 0);

    callback.call(this,canvas.toDataURL("image/png"))

    canvas = null

  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Returns distances of all objects in array
//------------------------------------------------------------------------------
d3plus.util.distances = function(arr,accessor) {

  var distances = [], checked = []
  arr.forEach(function(node1){
    var n1 = accessor ? accessor(node1) : [node1.x,node1.y]
    checked.push(node1)
    arr.forEach(function(node2){
      if (checked.indexOf(node2) < 0) {
        var n2 = accessor ? accessor(node2) : [node2.x,node2.y]
          , xx = Math.abs(n1[0]-n2[0])
          , yy = Math.abs(n1[1]-n2[1])
        distances.push(Math.sqrt((xx*xx)+(yy*yy)))
      }
    })

  })

  distances.sort(function(a,b){
    return a - b
  })

  return distances
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Merge two objects to create a new one with the properties of both
//------------------------------------------------------------------------------
d3plus.util.merge = function(obj1, obj2) {
  var obj3 = {};
  function copy_object(obj,ret) {
    for (var a in obj) {
      if (typeof obj[a] != "undefined") {
        if (typeof obj[a] == "object" && !(obj[a] instanceof Array) && obj[a] !== null) {
          if (typeof ret[a] != "object") ret[a] = {}
          copy_object(obj[a],ret[a])
        }
        else if (obj[a] instanceof Array) {
          ret[a] = obj[a].slice(0)
        }
        else {
          ret[a] = obj[a]
        }
      }
    }
  }
  if (obj1) copy_object(obj1,obj3)
  if (obj2) copy_object(obj2,obj3)
  return obj3;
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Gives X and Y offset based off angle and shape
//------------------------------------------------------------------------------
d3plus.util.offset = function(radians, distance, shape) {

  var coords = {"x": 0, "y": 0}

  if (radians < 0) {
    radians = Math.PI*2+radians
  }

  if (shape == "square") {

    var diagonal = 45*(Math.PI/180)

    if (radians <= Math.PI) {

      if (radians < (Math.PI / 2)) {

        if (radians < diagonal) {

          coords.x += distance;
          var oppositeLegLength = Math.tan(radians) * distance;
          coords.y += oppositeLegLength;

        } else {

          coords.y += distance;
          var adjacentLegLength = distance / Math.tan(radians);
          coords.x += adjacentLegLength;

        }

      } else {

        if (radians < (Math.PI - diagonal)) {

          coords.y += distance;
          var adjacentLegLength = distance / Math.tan(Math.PI - radians);
          coords.x -= adjacentLegLength;

        } else {

          coords.x -= distance;
          var oppositeLegLength = Math.tan(Math.PI - radians) * distance;
          coords.y += oppositeLegLength;
        }

      }
    } else {

      if (radians < (3 * Math.PI / 2)) {

        if (radians < (diagonal + Math.PI)) {

          coords.x -= distance;
          var oppositeLegLength = Math.tan(radians - Math.PI) * distance;
          coords.y -= oppositeLegLength;

        } else {

          coords.y -= distance;
          var adjacentLegLength = distance / Math.tan(radians - Math.PI);
          coords.x -= adjacentLegLength;

        }

      } else {

        if (radians < (2 * Math.PI - diagonal)) {

          coords.y -= distance;
          var adjacentLegLength = distance / Math.tan(2 * Math.PI - radians);
          coords.x += adjacentLegLength;

        } else {

          coords.x += distance;
          var oppositeLegLength = Math.tan(2 * Math.PI - radians) * distance;
          coords.y -= oppositeLegLength;

        }

      }
    }

  }
  else {

    coords.x += distance * Math.cos(radians)
    coords.y += distance * Math.sin(radians)

  }

  return coords;

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Removes all non ASCII characters
//------------------------------------------------------------------------------
d3plus.util.strip = function(str) {

  var removed = [ "!","@","#","$","%","^","&","*","(",")",
                  "[","]","{","}",".",",","/","\\","|",
                  "'","\"",";",":","<",">","?","=","+"]

  return str.replace(/[^A-Za-z0-9\-_]/g, function(chr) {

    if (" " == chr) {
      return "_"
    }
    else if (removed.indexOf(chr) >= 0) {
      return ""
    }

    var diacritics = [
        [/[\300-\306]/g, "A"],
        [/[\340-\346]/g, "a"],
        [/[\310-\313]/g, "E"],
        [/[\350-\353]/g, "e"],
        [/[\314-\317]/g, "I"],
        [/[\354-\357]/g, "i"],
        [/[\322-\330]/g, "O"],
        [/[\362-\370]/g, "o"],
        [/[\331-\334]/g, "U"],
        [/[\371-\374]/g, "u"],
        [/[\321]/g, "N"],
        [/[\361]/g, "n"],
        [/[\307]/g, "C"],
        [/[\347]/g, "c"],
    ];

    var ret = ""

    for (d in diacritics) {

      if (diacritics[d][0].test(chr)) {
        ret = diacritics[d][1]
        break;
      }

    }

    return ret;

  });

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Returns list of unique values
//------------------------------------------------------------------------------
d3plus.util.uniques = function(data,value) {

  if (data === undefined) {
    return []
  }

  var type = null
  
  return d3.nest().key(function(d) {
      if (typeof value == "string") {
        if (!type && typeof d[value] !== "undefined") type = typeof d[value]
        return d[value]
      }
      else if (typeof value == "function") {
        if (!type && typeof value(d) !== "undefined") type = typeof value(d)
        return value(d)
      }
      else {
        return d
      }
    })
    .entries(data)
    .reduce(function(a,b){
      if (type) {
        var val = b.key
        if (type == "number") val = parseFloat(val)
        return a.concat(val)
      }
      return a
    },[]).sort(function(a,b){
      return a - b
    })

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// function that will wrap and resize SVG text
//-------------------------------------------------------------------
d3plus.util.wordwrap = function(params) {

  var parent = params.parent,
      width = params.width ? params.width : 20000,
      height = params.height ? params.height : 20000,
      resize = params.resize,
      font_max = params.font_max ? params.font_max : 40,
      font_min = params.font_min ? params.font_min : 9,
      text_array = params.text,
      split = ["-","/",";",":","&"],
      regex = new RegExp("[^\\s\\"+split.join("\\")+"]+\\"+split.join("?\\")+"?","g"),
      current_text = ""

  if (!d3.select(parent).attr("font-size")) {
    d3.select(parent).attr("font-size",font_min)
  }

  if (text_array instanceof Array) {
    text_array = text_array.filter(function(t){
      return ["string","number"].indexOf(typeof t) >= 0
    })
    current_text = String(text_array.shift())
  }
  else {
    current_text = String(text_array)
  }

  wrap()

  function wrap() {

    var words = current_text.match(regex)

    if (resize) {

      // Start by trying the largest font size
      var size = font_max
      size = Math.floor(size)
      d3.select(parent).attr("font-size",size)

      // Add each word to it's own line (to test for longest word)
      d3.select(parent).selectAll("tspan").remove()
      for(var i=0; i<words.length; i++) {
        if (words.length == 1) var t = words[i]
        else var t = words[i]+"..."
        d3.select(parent).append("tspan").attr("x",0).text(t)
      }

      // If the longest word is too wide, make the text proportionately smaller
      if (parent.getBBox().width > width) size = size*(width/parent.getBBox().width)

      // If the new size is too small, return NOTHING
      if (size < font_min) {
        d3.select(parent).selectAll("tspan").remove();
        if (typeof text_array == "string" || text_array.length == 0) return;
        else {
          current_text = String(text_array.shift())
          wrap()
        }
        return;
      }

      // Use new text size
      size = Math.floor(size)
      d3.select(parent).attr("font-size",size);

      // Flow text into box
      flow();

      // If text doesn't fit height-wise, shrink it!
      if (parent.childNodes.length*parent.getBBox().height > height) {
        var temp_size = size*(height/(parent.childNodes.length*parent.getBBox().height))
        if (temp_size < font_min) size = font_min
        else size = temp_size
        size = Math.floor(size)
        d3.select(parent).attr("font-size",size)
      } else finish();

    }

    flow();
    truncate();
    finish();

    function flow() {

      d3.select(parent).selectAll("tspan").remove()

      var x_pos = parent.getAttribute("x")

      var tspan = d3.select(parent).append("tspan")
        .attr("x",x_pos)
        .text(words[0])

      for (var i=1; i < words.length; i++) {

        var current = tspan.text(),
            last_char = current.slice(-1),
            next_char = current_text.charAt(current_text.indexOf(current)+current.length)
            joiner = next_char == " " ? " " : ""

        tspan.text(current+joiner+words[i])

        if (tspan.node().getComputedTextLength() > width) {

          tspan.text(current)

          tspan = d3.select(parent).append("tspan")
            .attr("x",x_pos)
            .text(words[i])

        }
      }

    }

    function truncate() {
      var cut = false
      while (parent.childNodes.length*parent.getBBox().height > height && parent.lastChild && !cut) {
        parent.removeChild(parent.lastChild)
        if (parent.childNodes.length*parent.getBBox().height < height && parent.lastChild) cut = true
      }
      if (cut) {

        tspan = parent.lastChild
        words = d3.select(tspan).text().match(/[^\s-]+-?/g)

        function ellipsis() {

          if (words.length) {

            var last_word = words[words.length-1],
                last_char = last_word.charAt(last_word.length-1)

            if (last_word.length == 1 && split.indexOf(last_word) >= 0) {

              words.pop()
              ellipsis()

            }
            else {

              if (split.indexOf(last_char) >= 0) {
                last_word = last_word.substr(0,last_word.length-1)
              }

              d3.select(tspan).text(words.join(" ")+"...")
              if (tspan.getComputedTextLength() > width) {
                words.pop()
                ellipsis()
              }

            }

          }
          else {

            d3.select(tspan).remove()

          }

        }

        ellipsis()

      }
    }
  }

  function finish() {
    d3.select(parent).selectAll("tspan").attr("dy", d3.select(parent).style("font-size"));
    return;
  }

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Finds an object's color and returns random if it cannot be found
//------------------------------------------------------------------------------
d3plus.variable.color = function(vars,id,level) {

  function get_random(c) {
    if (typeof c == "object") {
      c = c[vars.id.key]
    }
    return d3plus.color.random(c)
  }

  function validate_color(c) {
    if (typeof c == "string" && c.indexOf("#") == 0 && [4,7].indexOf(c.length) >= 0) return true
    else return false
  }

  if (!vars.color.key) {
    return get_random(id);
  }
  else {

    var color = d3plus.variable.value(vars,id,vars.color.key,level)

    if (!color) {
      if (typeof vars.color.scale == "function") {
        return vars.style.color.missing
      }
      return get_random(id)
    }
    else if (!vars.color.scale) {
      var true_color = validate_color(color)
      return true_color ? color : get_random(color)
    }
    else {
      return vars.color.scale(color)
    }

  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Get array of available text values
//------------------------------------------------------------------------------
d3plus.variable.text = function(vars,obj,depth) {

  if (typeof depth != "number") var depth = vars.depth.value

  if (vars.text.array && typeof vars.text.array == "object") {
    if (vars.text.array[vars.id.nesting[depth]]) {
      var text_keys = vars.text.array[vars.id.nesting[depth]]
    }
    else {
      var text_keys = vars.text.array[Object.keys(vars.text.array)[0]]
    }
  }
  else {
    var text_keys = []
    if (vars.text.key) text_keys.push(vars.text.key)
    text_keys.push(vars.id.nesting[depth])
  }
  if (typeof text_keys == "string") {
    text_keys = [text_keys]
  }

  var names = []
  text_keys.forEach(function(t){
    var name = d3plus.variable.value(vars,obj,t,vars.id.nesting[depth])
    if (name) names.push(vars.format(name))
  })

  return names

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Finds a given variable by searching through the data and attrs
//------------------------------------------------------------------------------
d3plus.variable.value = function(vars,id,variable,id_var,agg) {

  if (!id_var) {
    if (variable && typeof variable == "object") {
      if (variable[vars.id.key]) {
        var id_var = vars.id.key
      }
      else {
        var id_var = Object.keys(variable)[0]
      }
      variable = variable[id_var]
    }
    else {
      var id_var = vars.id.key
    }
  }

  if (variable && typeof variable == "function") {
    return variable(id)
  }
  else if (variable == id_var) {
    if (typeof id == "object") {
      return id[variable]
    }
    else {
      return id
    }
  }

  function filter_array(arr) {
    return arr.filter(function(d){
      return d[id_var] == id
    })[0]
  }

  var value_array = []
  function check_children(obj) {
    if (obj.children) {
      obj.children.forEach(function(c){
        check_children(c)
      })
    }
    else if (obj[variable]) {
      value_array.push(obj[variable])
    }
  }

  if (typeof id == "object" && typeof id[variable] != "undefined") {
    return id[variable]
  }
  else if (typeof id == "object" && id.children) {

    if (!agg) {
      var agg = "sum"
      if (typeof vars.aggs.value == "string") {
        agg = vars.aggs.value
      }
      else if (vars.aggs.value[variable]) {
        agg = vars.aggs.value[variable]
      }
    }
    check_children(id)
    if (value_array.length) {
      if (typeof agg == "string") {
        return d3[agg](value_array)
      }
      else if (typeof agg == "function") {
        return agg(value_array)
      }
    }

    var dat = id
    id = dat[id_var]

  }
  else {

    if (typeof id == "object") {
      var dat = id
      id = id[id_var]
    }

    if (vars.data.app instanceof Array) {
      var dat = filter_array(vars.data.app)
    }

    if (dat && typeof dat[variable] != "undefined") return dat[variable]
  }

  if (vars.attrs.value instanceof Array) {
    var attr = filter_array(vars.attrs.value)
  }
  else if (vars.attrs.value[id_var]) {
    if (vars.attrs.value[id_var] instanceof Array) {
      var attr = filter_array(vars.attrs.value[id_var])
    }
    else {
      var attr = vars.attrs.value[id_var][id]
    }
  }
  else {
    var attr = vars.attrs.value[id]
  }

  if (attr && typeof attr[variable] != "undefined") return attr[variable]

  return null

}

d3plus.zoom.bounds = function(vars,b,timing) {

  if (!b) {
    var b = vars.zoom.bounds
  }

  if (typeof timing != "number") {
    var timing = vars.style.timing.transitions
  }

  vars.zoom.size = {
    "height": b[1][1]-b[0][1],
    "width": b[1][0]-b[0][0]
  }

  var fit = vars.coords.fit.value
  if (fit == "auto" || d3plus.apps[vars.type.value].requirements.indexOf("coords") < 0) {
    var aspect = d3.max([vars.zoom.size.width/vars.app_width,vars.zoom.size.height/vars.app_height])
  }
  else {
    var aspect = vars.zoom.size[fit]/vars["app_"+fit]
  }

  var min = d3.min([vars.app_width,vars.app_height])

  var scale = ((min-(vars.coords.padding*2)) / min) / aspect

  var extent = vars.zoom_behavior.scaleExtent()

  if (extent[0] == extent[1] || b == vars.zoom.bounds) {
    vars.zoom_behavior.scaleExtent([scale,scale*16])
  }

  var max_scale = vars.zoom_behavior.scaleExtent()[1]
  if (scale > max_scale) {
    scale = max_scale
  }
  vars.zoom.scale = scale

  var translate = []

  translate[0] = vars.app_width/2-(vars.zoom.size.width*scale)/2-(b[0][0]*scale)
  translate[1] = vars.app_height/2-(vars.zoom.size.height*scale)/2-(b[0][1]*scale)

  vars.zoom.translate = translate
  vars.zoom_behavior.translate(translate).scale(scale)

  vars.zoom.size = {
    "height": vars.zoom.bounds[1][1]-vars.zoom.bounds[0][1],
    "width": vars.zoom.bounds[1][0]-vars.zoom.bounds[0][0]
  }

  d3plus.zoom.transform(vars,timing)

}

d3plus.zoom.controls = function() {
  d3.select("#d3plus.utilsts.zoom_controls").remove()
  if (!vars.small) {
    // Create Zoom Controls
    var zoom_enter = vars.parent.append("div")
      .attr("id","d3plus.utilsts.zoom_controls")
      .style("top",(vars.margin.top+5)+"px")
  
    zoom_enter.append("div")
      .attr("id","zoom_in")
      .attr("unselectable","on")
      .on(d3plus.evt.click,function(){ vars.zoom("in") })
      .text("+")
  
    zoom_enter.append("div")
      .attr("id","zoom_out")
      .attr("unselectable","on")
      .on(d3plus.evt.click,function(){ vars.zoom("out") })
      .text("-")
  
    zoom_enter.append("div")
      .attr("id","zoom_reset")
      .attr("unselectable","on")
      .on(d3plus.evt.click,function(){ 
        vars.zoom("reset") 
        vars.update()
      })
      .html("\&#8634;")
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Sets label opacity based on zoom
//------------------------------------------------------------------------------
d3plus.zoom.labels = function(vars) {

  var max_scale = vars.zoom_behavior.scaleExtent()[1]

  if (vars.dev.value) d3plus.console.time("determining label visibility")

  if (vars.timing) {

    vars.g.viz.selectAll("text.d3plus_label")
      .transition().duration(vars.timing)
      .attr("opacity",function(d){
        if (!d) var d = {"scale": max_scale}
        var size = parseFloat(d3.select(this).attr("font-size"),10)
        d.visible = size/d.scale*vars.zoom.scale >= 7
        return d.visible ? 1 : 0
      })

  }
  else {

    vars.g.viz.selectAll("text.d3plus_label")
      .attr("opacity",function(d){
        if (!d) var d = {"scale": max_scale}
        var size = parseFloat(d3.select(this).attr("font-size"),10)
        d.visible = size/d.scale*vars.zoom.scale >= 7
        return d.visible ? 1 : 0
      })

  }

  if (vars.dev.value) d3plus.console.timeEnd("determining label visibility")

}

d3plus.zoom.mouse = function(vars) {

  var translate = d3.event.translate,
      scale = d3.event.scale,
      limits = vars.zoom.bounds,
      xoffset = (vars.app_width-(vars.zoom.size.width*scale))/2,
      xmin = xoffset > 0 ? xoffset : 0,
      xmax = xoffset > 0 ? vars.app_width-xoffset : vars.app_width,
      yoffset = (vars.app_height-(vars.zoom.size.height*scale))/2,
      ymin = yoffset > 0 ? yoffset : 0,
      ymax = yoffset > 0 ? vars.app_height-yoffset : vars.app_height

  // Auto center visualization
  if (translate[0]+limits[0][0]*scale > xmin) {
    translate[0] = -limits[0][0]*scale+xmin
  }
  else if (translate[0]+limits[1][0]*scale < xmax) {
    translate[0] = xmax-(limits[1][0]*scale)
  }

  if (translate[1]+limits[0][1]*scale > ymin) {
    translate[1] = -limits[0][1]*scale+ymin
  }
  else if (translate[1]+limits[1][1]*scale < ymax) {
    translate[1] = ymax-(limits[1][1]*scale)
  }

  vars.zoom_behavior.translate(translate).scale(scale)

  vars.zoom.translate = translate
  vars.zoom.scale = scale

  if (d3.event.sourceEvent.type == "wheel") {
    var delay = vars.timing ? 100 : 500
    clearTimeout(vars.zoom.wheel)
    vars.zoom.wheel = setTimeout(function(){
      d3plus.zoom.labels(vars)
    },delay)
  }
  else {
    d3plus.zoom.labels(vars)
  }

  if (d3.event.sourceEvent.type == "dblclick") {
    d3plus.zoom.transform(vars,vars.style.timing.transitions)
  }
  else {
    d3plus.zoom.transform(vars,0)
  }

}

d3plus.zoom.transform = function(vars,timing) {

  if (typeof timing != "number") {
    var timing = vars.timing
  }

  var translate = vars.zoom.translate
    , scale = vars.zoom.scale

  if (timing) {
    vars.g.viz.transition().duration(timing)
      .attr("transform","translate("+translate+")scale("+scale+")")

  }
  else {

    vars.g.viz
      .attr("transform","translate("+translate+")scale("+scale+")")

  }

}


/* **********************************************
     Begin jquery.mCustomScrollbar.js
********************************************** */

/*
== malihu jquery custom scrollbars plugin == 
version: 2.8.3 
author: malihu (http://manos.malihu.gr) 
plugin home: http://manos.malihu.gr/jquery-custom-content-scroller 
*/

/*
Copyright 2010-2013 Manos Malihutsakis 

This program is free software: you can redistribute it and/or modify 
it under the terms of the GNU Lesser General Public License as published by 
the Free Software Foundation, either version 3 of the License, or 
any later version. 

This program is distributed in the hope that it will be useful, 
but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the 
GNU Lesser General Public License for more details. 

You should have received a copy of the GNU Lesser General Public License 
along with this program.  If not, see http://www.gnu.org/licenses/lgpl.html. 
*/
(function($){
	/*plugin script*/
	var methods={
		init:function(options){
			var defaults={ 
				set_width:false, /*optional element width: boolean, pixels, percentage*/
				set_height:false, /*optional element height: boolean, pixels, percentage*/
				horizontalScroll:false, /*scroll horizontally: boolean*/
				scrollInertia:950, /*scrolling inertia: integer (milliseconds)*/
				mouseWheel:true, /*mousewheel support: boolean*/
				mouseWheelPixels:"auto", /*mousewheel pixels amount: integer, "auto"*/
				autoDraggerLength:true, /*auto-adjust scrollbar dragger length: boolean*/
				autoHideScrollbar:false, /*auto-hide scrollbar when idle*/
				alwaysShowScrollbar:false, /*always show scrollbar even when there's nothing to scroll (disables autoHideScrollbar): boolean*/
				snapAmount:null, /* optional element always snaps to a multiple of this number in pixels */
				snapOffset:0, /* when snapping, snap with this number in pixels as an offset */
				scrollButtons:{ /*scroll buttons*/
					enable:false, /*scroll buttons support: boolean*/
					scrollType:"continuous", /*scroll buttons scrolling type: "continuous", "pixels"*/
					scrollSpeed:"auto", /*scroll buttons continuous scrolling speed: integer, "auto"*/
					scrollAmount:40 /*scroll buttons pixels scroll amount: integer (pixels)*/
				},
				advanced:{
					updateOnBrowserResize:true, /*update scrollbars on browser resize (for layouts based on percentages): boolean*/
					updateOnContentResize:false, /*auto-update scrollbars on content resize (for dynamic content): boolean*/
					autoExpandHorizontalScroll:false, /*auto-expand width for horizontal scrolling: boolean*/
					autoScrollOnFocus:true, /*auto-scroll on focused elements: boolean*/
					normalizeMouseWheelDelta:false /*normalize mouse-wheel delta (-1/1)*/
				},
				contentTouchScroll:true, /*scrolling by touch-swipe content: boolean*/
				callbacks:{
					onScrollStart:function(){}, /*user custom callback function on scroll start event*/
					onScroll:function(){}, /*user custom callback function on scroll event*/
					onTotalScroll:function(){}, /*user custom callback function on scroll end reached event*/
					onTotalScrollBack:function(){}, /*user custom callback function on scroll begin reached event*/
					onTotalScrollOffset:0, /*scroll end reached offset: integer (pixels)*/
					onTotalScrollBackOffset:0, /*scroll begin reached offset: integer (pixels)*/
					whileScrolling:function(){} /*user custom callback function on scrolling event*/
				},
				theme:"light" /*"light", "dark", "light-2", "dark-2", "light-thick", "dark-thick", "light-thin", "dark-thin"*/
			},
			options=$.extend(true,defaults,options);
			return this.each(function(){
				var $this=$(this);
				/*set element width/height, create markup for custom scrollbars, add classes*/
				if(options.set_width){
					$this.css("width",options.set_width);
				}
				if(options.set_height){
					$this.css("height",options.set_height);
				}
				if(!$(document).data("mCustomScrollbar-index")){
					$(document).data("mCustomScrollbar-index","1");
				}else{
					var mCustomScrollbarIndex=parseInt($(document).data("mCustomScrollbar-index"));
					$(document).data("mCustomScrollbar-index",mCustomScrollbarIndex+1);
				}
				$this.wrapInner("<div class='mCustomScrollBox"+" mCS-"+options.theme+"' id='mCSB_"+$(document).data("mCustomScrollbar-index")+"' style='position:relative; height:100%; overflow:hidden; max-width:100%;' />").addClass("mCustomScrollbar _mCS_"+$(document).data("mCustomScrollbar-index"));
				var mCustomScrollBox=$this.children(".mCustomScrollBox");
				if(options.horizontalScroll){
					mCustomScrollBox.addClass("mCSB_horizontal").wrapInner("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />");
					var mCSB_h_wrapper=mCustomScrollBox.children(".mCSB_h_wrapper");
					mCSB_h_wrapper.wrapInner("<div class='mCSB_container' style='position:absolute; left:0;' />").children(".mCSB_container").css({"width":mCSB_h_wrapper.children().outerWidth(),"position":"relative"}).unwrap();
				}else{
					mCustomScrollBox.wrapInner("<div class='mCSB_container' style='position:relative; top:0;' />");
				}
				var mCSB_container=mCustomScrollBox.children(".mCSB_container");
				if($.support.touch){
					mCSB_container.addClass("mCS_touch");
				}
				mCSB_container.after("<div class='mCSB_scrollTools' style='position:absolute;'><div class='mCSB_draggerContainer'><div class='mCSB_dragger' style='position:absolute;' oncontextmenu='return false;'><div class='mCSB_dragger_bar' style='position:relative;'></div></div><div class='mCSB_draggerRail'></div></div></div>");
				var mCSB_scrollTools=mCustomScrollBox.children(".mCSB_scrollTools"),
					mCSB_draggerContainer=mCSB_scrollTools.children(".mCSB_draggerContainer"),
					mCSB_dragger=mCSB_draggerContainer.children(".mCSB_dragger");
				if(options.horizontalScroll){
					mCSB_dragger.data("minDraggerWidth",mCSB_dragger.width());
				}else{
					mCSB_dragger.data("minDraggerHeight",mCSB_dragger.height());
				}
				if(options.scrollButtons.enable){
					if(options.horizontalScroll){
						mCSB_scrollTools.prepend("<a class='mCSB_buttonLeft' oncontextmenu='return false;'></a>").append("<a class='mCSB_buttonRight' oncontextmenu='return false;'></a>");
					}else{
						mCSB_scrollTools.prepend("<a class='mCSB_buttonUp' oncontextmenu='return false;'></a>").append("<a class='mCSB_buttonDown' oncontextmenu='return false;'></a>");
					}
				}
				/*mCustomScrollBox scrollTop and scrollLeft is always 0 to prevent browser focus scrolling*/
				mCustomScrollBox.bind("scroll",function(){
					if(!$this.is(".mCS_disabled")){ /*native focus scrolling for disabled scrollbars*/
						mCustomScrollBox.scrollTop(0).scrollLeft(0);
					}
				});
				/*store options, global vars/states, intervals*/
				$this.data({
					/*init state*/
					"mCS_Init":true,
					/*instance index*/
					"mCustomScrollbarIndex":$(document).data("mCustomScrollbar-index"),
					/*option parameters*/
					"horizontalScroll":options.horizontalScroll,
					"scrollInertia":options.scrollInertia,
					"scrollEasing":"mcsEaseOut",
					"mouseWheel":options.mouseWheel,
					"mouseWheelPixels":options.mouseWheelPixels,
					"autoDraggerLength":options.autoDraggerLength,
					"autoHideScrollbar":options.autoHideScrollbar,
					"alwaysShowScrollbar":options.alwaysShowScrollbar,
					"snapAmount":options.snapAmount,
					"snapOffset":options.snapOffset,
					"scrollButtons_enable":options.scrollButtons.enable,
					"scrollButtons_scrollType":options.scrollButtons.scrollType,
					"scrollButtons_scrollSpeed":options.scrollButtons.scrollSpeed,
					"scrollButtons_scrollAmount":options.scrollButtons.scrollAmount,
					"autoExpandHorizontalScroll":options.advanced.autoExpandHorizontalScroll,
					"autoScrollOnFocus":options.advanced.autoScrollOnFocus,
					"normalizeMouseWheelDelta":options.advanced.normalizeMouseWheelDelta,
					"contentTouchScroll":options.contentTouchScroll,
					"onScrollStart_Callback":options.callbacks.onScrollStart,
					"onScroll_Callback":options.callbacks.onScroll,
					"onTotalScroll_Callback":options.callbacks.onTotalScroll,
					"onTotalScrollBack_Callback":options.callbacks.onTotalScrollBack,
					"onTotalScroll_Offset":options.callbacks.onTotalScrollOffset,
					"onTotalScrollBack_Offset":options.callbacks.onTotalScrollBackOffset,
					"whileScrolling_Callback":options.callbacks.whileScrolling,
					/*events binding state*/
					"bindEvent_scrollbar_drag":false,
					"bindEvent_content_touch":false,
					"bindEvent_scrollbar_click":false,
					"bindEvent_mousewheel":false,
					"bindEvent_buttonsContinuous_y":false,
					"bindEvent_buttonsContinuous_x":false,
					"bindEvent_buttonsPixels_y":false,
					"bindEvent_buttonsPixels_x":false,
					"bindEvent_focusin":false,
					"bindEvent_autoHideScrollbar":false,
					/*buttons intervals*/
					"mCSB_buttonScrollRight":false,
					"mCSB_buttonScrollLeft":false,
					"mCSB_buttonScrollDown":false,
					"mCSB_buttonScrollUp":false
				});
				/*max-width/max-height*/
				if(options.horizontalScroll){
					if($this.css("max-width")!=="none"){
						if(!options.advanced.updateOnContentResize){ /*needs updateOnContentResize*/
							options.advanced.updateOnContentResize=true;
						}
					}
				}else{
					if($this.css("max-height")!=="none"){
						var percentage=false,maxHeight=parseInt($this.css("max-height"));
						if($this.css("max-height").indexOf("%")>=0){
							percentage=maxHeight,
							maxHeight=$this.parent().height()*percentage/100;
						}
						$this.css("overflow","hidden");
						mCustomScrollBox.css("max-height",maxHeight);
					}
				}
				$this.mCustomScrollbar("update");
				/*window resize fn (for layouts based on percentages)*/
				if(options.advanced.updateOnBrowserResize){
					var mCSB_resizeTimeout,currWinWidth=$(window).width(),currWinHeight=$(window).height();
					$(window).bind("resize."+$this.data("mCustomScrollbarIndex"),function(){
						if(mCSB_resizeTimeout){
							clearTimeout(mCSB_resizeTimeout);
						}
						mCSB_resizeTimeout=setTimeout(function(){
							if(!$this.is(".mCS_disabled") && !$this.is(".mCS_destroyed")){
								var winWidth=$(window).width(),winHeight=$(window).height();
								if(currWinWidth!==winWidth || currWinHeight!==winHeight){ /*ie8 fix*/
									if($this.css("max-height")!=="none" && percentage){
										mCustomScrollBox.css("max-height",$this.parent().height()*percentage/100);
									}
									$this.mCustomScrollbar("update");
									currWinWidth=winWidth; currWinHeight=winHeight;
								}
							}
						},150);
					});
				}
				/*content resize fn (for dynamically generated content)*/
				if(options.advanced.updateOnContentResize){
					var mCSB_onContentResize;
					if(options.horizontalScroll){
						var mCSB_containerOldSize=mCSB_container.outerWidth();
					}else{
						var mCSB_containerOldSize=mCSB_container.outerHeight();
					}
					mCSB_onContentResize=setInterval(function(){
						if(options.horizontalScroll){
							if(options.advanced.autoExpandHorizontalScroll){
								mCSB_container.css({"position":"absolute","width":"auto"}).wrap("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />").css({"width":mCSB_container.outerWidth(),"position":"relative"}).unwrap();
							}
							var mCSB_containerNewSize=mCSB_container.outerWidth();
						}else{
							var mCSB_containerNewSize=mCSB_container.outerHeight();
						}
						if(mCSB_containerNewSize!=mCSB_containerOldSize){
							$this.mCustomScrollbar("update");
							mCSB_containerOldSize=mCSB_containerNewSize;
						}
					},300);
				}
			});
		},
		update:function(){
			var $this=$(this),
				mCustomScrollBox=$this.children(".mCustomScrollBox"),
				mCSB_container=mCustomScrollBox.children(".mCSB_container");
			mCSB_container.removeClass("mCS_no_scrollbar");
			$this.removeClass("mCS_disabled mCS_destroyed");
			mCustomScrollBox.scrollTop(0).scrollLeft(0); /*reset scrollTop/scrollLeft to prevent browser focus scrolling*/
			var mCSB_scrollTools=mCustomScrollBox.children(".mCSB_scrollTools"),
				mCSB_draggerContainer=mCSB_scrollTools.children(".mCSB_draggerContainer"),
				mCSB_dragger=mCSB_draggerContainer.children(".mCSB_dragger");
			if($this.data("horizontalScroll")){
				var mCSB_buttonLeft=mCSB_scrollTools.children(".mCSB_buttonLeft"),
					mCSB_buttonRight=mCSB_scrollTools.children(".mCSB_buttonRight"),
					mCustomScrollBoxW=mCustomScrollBox.width();
				if($this.data("autoExpandHorizontalScroll")){
					mCSB_container.css({"position":"absolute","width":"auto"}).wrap("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />").css({"width":mCSB_container.outerWidth(),"position":"relative"}).unwrap();
				}
				var mCSB_containerW=mCSB_container.outerWidth();
			}else{
				var mCSB_buttonUp=mCSB_scrollTools.children(".mCSB_buttonUp"),
					mCSB_buttonDown=mCSB_scrollTools.children(".mCSB_buttonDown"),
					mCustomScrollBoxH=mCustomScrollBox.height(),
					mCSB_containerH=mCSB_container.outerHeight();
			}
			if(mCSB_containerH>mCustomScrollBoxH && !$this.data("horizontalScroll")){ /*content needs vertical scrolling*/
				mCSB_scrollTools.css("display","block");
				var mCSB_draggerContainerH=mCSB_draggerContainer.height();
				/*auto adjust scrollbar dragger length analogous to content*/
				if($this.data("autoDraggerLength")){
					var draggerH=Math.round(mCustomScrollBoxH/mCSB_containerH*mCSB_draggerContainerH),
						minDraggerH=mCSB_dragger.data("minDraggerHeight");
					if(draggerH<=minDraggerH){ /*min dragger height*/
						mCSB_dragger.css({"height":minDraggerH});
					}else if(draggerH>=mCSB_draggerContainerH-10){ /*max dragger height*/
						var mCSB_draggerContainerMaxH=mCSB_draggerContainerH-10;
						mCSB_dragger.css({"height":mCSB_draggerContainerMaxH});
					}else{
						mCSB_dragger.css({"height":draggerH});
					}
					mCSB_dragger.children(".mCSB_dragger_bar").css({"line-height":mCSB_dragger.height()+"px"});
				}
				var mCSB_draggerH=mCSB_dragger.height(),
				/*calculate and store scroll amount, add scrolling*/
					scrollAmount=(mCSB_containerH-mCustomScrollBoxH)/(mCSB_draggerContainerH-mCSB_draggerH);
				$this.data("scrollAmount",scrollAmount).mCustomScrollbar("scrolling",mCustomScrollBox,mCSB_container,mCSB_draggerContainer,mCSB_dragger,mCSB_buttonUp,mCSB_buttonDown,mCSB_buttonLeft,mCSB_buttonRight);
				/*scroll*/
				var mCSB_containerP=Math.abs(mCSB_container.position().top);
				$this.mCustomScrollbar("scrollTo",mCSB_containerP,{scrollInertia:0,trigger:"internal"});
			}else if(mCSB_containerW>mCustomScrollBoxW && $this.data("horizontalScroll")){ /*content needs horizontal scrolling*/
				mCSB_scrollTools.css("display","block");
				var mCSB_draggerContainerW=mCSB_draggerContainer.width();
				/*auto adjust scrollbar dragger length analogous to content*/
				if($this.data("autoDraggerLength")){
					var draggerW=Math.round(mCustomScrollBoxW/mCSB_containerW*mCSB_draggerContainerW),
						minDraggerW=mCSB_dragger.data("minDraggerWidth");
					if(draggerW<=minDraggerW){ /*min dragger height*/
						mCSB_dragger.css({"width":minDraggerW});
					}else if(draggerW>=mCSB_draggerContainerW-10){ /*max dragger height*/
						var mCSB_draggerContainerMaxW=mCSB_draggerContainerW-10;
						mCSB_dragger.css({"width":mCSB_draggerContainerMaxW});
					}else{
						mCSB_dragger.css({"width":draggerW});
					}
				}
				var mCSB_draggerW=mCSB_dragger.width(),
				/*calculate and store scroll amount, add scrolling*/
					scrollAmount=(mCSB_containerW-mCustomScrollBoxW)/(mCSB_draggerContainerW-mCSB_draggerW);
				$this.data("scrollAmount",scrollAmount).mCustomScrollbar("scrolling",mCustomScrollBox,mCSB_container,mCSB_draggerContainer,mCSB_dragger,mCSB_buttonUp,mCSB_buttonDown,mCSB_buttonLeft,mCSB_buttonRight);
				/*scroll*/
				var mCSB_containerP=Math.abs(mCSB_container.position().left);
				$this.mCustomScrollbar("scrollTo",mCSB_containerP,{scrollInertia:0,trigger:"internal"});
			}else{ /*content does not need scrolling*/
				/*unbind events, reset content position, hide scrollbars, remove classes*/
				mCustomScrollBox.unbind("mousewheel focusin");
				if($this.data("horizontalScroll")){
					mCSB_dragger.add(mCSB_container).css("left",0);
				}else{
					mCSB_dragger.add(mCSB_container).css("top",0);
				}
				if ($this.data("alwaysShowScrollbar")) {
					if(!$this.data("horizontalScroll")){ /*vertical scrolling*/
						mCSB_dragger.css({"height":mCSB_draggerContainer.height()});
					}else if($this.data("horizontalScroll")){ /*horizontal scrolling*/
						mCSB_dragger.css({"width":mCSB_draggerContainer.width()});
					}
				} else {
					mCSB_scrollTools.css("display","none");
					mCSB_container.addClass("mCS_no_scrollbar");
				}
				$this.data({"bindEvent_mousewheel":false,"bindEvent_focusin":false});
			}
		},
		scrolling:function(mCustomScrollBox,mCSB_container,mCSB_draggerContainer,mCSB_dragger,mCSB_buttonUp,mCSB_buttonDown,mCSB_buttonLeft,mCSB_buttonRight){
			var $this=$(this);
			/*scrollbar drag scrolling*/
			if(!$this.data("bindEvent_scrollbar_drag")){
				var mCSB_draggerDragY,mCSB_draggerDragX,
					mCSB_dragger_downEvent,mCSB_dragger_moveEvent,mCSB_dragger_upEvent;
				if($.support.pointer){ /*pointer*/
					mCSB_dragger_downEvent="pointerdown";
					mCSB_dragger_moveEvent="pointermove";
					mCSB_dragger_upEvent="pointerup";
				}else if($.support.msPointer){ /*MSPointer*/
					mCSB_dragger_downEvent="MSPointerDown";
					mCSB_dragger_moveEvent="MSPointerMove";
					mCSB_dragger_upEvent="MSPointerUp";
				}
				if($.support.pointer || $.support.msPointer){ /*pointer, MSPointer*/
					mCSB_dragger.bind(mCSB_dragger_downEvent,function(e){
						e.preventDefault();
						$this.data({"on_drag":true}); mCSB_dragger.addClass("mCSB_dragger_onDrag");
						var elem=$(this),
							elemOffset=elem.offset(),
							x=e.originalEvent.pageX-elemOffset.left,
							y=e.originalEvent.pageY-elemOffset.top;
						if(x<elem.width() && x>0 && y<elem.height() && y>0){
							mCSB_draggerDragY=y;
							mCSB_draggerDragX=x;
						}
					});
					$(document).bind(mCSB_dragger_moveEvent+"."+$this.data("mCustomScrollbarIndex"),function(e){
						e.preventDefault();
						if($this.data("on_drag")){
							var elem=mCSB_dragger,
								elemOffset=elem.offset(),
								x=e.originalEvent.pageX-elemOffset.left,
								y=e.originalEvent.pageY-elemOffset.top;
							scrollbarDrag(mCSB_draggerDragY,mCSB_draggerDragX,y,x);
						}
					}).bind(mCSB_dragger_upEvent+"."+$this.data("mCustomScrollbarIndex"),function(e){
						$this.data({"on_drag":false}); mCSB_dragger.removeClass("mCSB_dragger_onDrag");
					});
				}else{ /*mouse/touch*/
					mCSB_dragger.bind("mousedown touchstart",function(e){
						e.preventDefault(); e.stopImmediatePropagation();
						var	elem=$(this),elemOffset=elem.offset(),x,y;
						if(e.type==="touchstart"){
							var touch=e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
							x=touch.pageX-elemOffset.left; y=touch.pageY-elemOffset.top;
						}else{
							$this.data({"on_drag":true}); mCSB_dragger.addClass("mCSB_dragger_onDrag");
							x=e.pageX-elemOffset.left; y=e.pageY-elemOffset.top;
						}
						if(x<elem.width() && x>0 && y<elem.height() && y>0){
							mCSB_draggerDragY=y; mCSB_draggerDragX=x;
						}
					}).bind("touchmove",function(e){
						e.preventDefault(); e.stopImmediatePropagation();
						var touch=e.originalEvent.touches[0] || e.originalEvent.changedTouches[0],
							elem=$(this),
							elemOffset=elem.offset(),
							x=touch.pageX-elemOffset.left,
							y=touch.pageY-elemOffset.top;
						scrollbarDrag(mCSB_draggerDragY,mCSB_draggerDragX,y,x);
					});
					$(document).bind("mousemove."+$this.data("mCustomScrollbarIndex"),function(e){
						if($this.data("on_drag")){
							var elem=mCSB_dragger,
								elemOffset=elem.offset(),
								x=e.pageX-elemOffset.left,
								y=e.pageY-elemOffset.top;
							scrollbarDrag(mCSB_draggerDragY,mCSB_draggerDragX,y,x);
						}
					}).bind("mouseup."+$this.data("mCustomScrollbarIndex"),function(e){
						$this.data({"on_drag":false}); mCSB_dragger.removeClass("mCSB_dragger_onDrag");
					});
				}
				$this.data({"bindEvent_scrollbar_drag":true});
			}
			function scrollbarDrag(mCSB_draggerDragY,mCSB_draggerDragX,y,x){
				if($this.data("horizontalScroll")){
					$this.mCustomScrollbar("scrollTo",(mCSB_dragger.position().left-(mCSB_draggerDragX))+x,{moveDragger:true,trigger:"internal"});
				}else{
					$this.mCustomScrollbar("scrollTo",(mCSB_dragger.position().top-(mCSB_draggerDragY))+y,{moveDragger:true,trigger:"internal"});
				}
			}
			/*content touch-drag*/
			if($.support.touch && $this.data("contentTouchScroll")){
				if(!$this.data("bindEvent_content_touch")){
					var touch,
						elem,elemOffset,y,x,mCSB_containerTouchY,mCSB_containerTouchX;
					mCSB_container.bind("touchstart",function(e){
						e.stopImmediatePropagation();
						touch=e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
						elem=$(this);
						elemOffset=elem.offset();
						x=touch.pageX-elemOffset.left;
						y=touch.pageY-elemOffset.top;
						mCSB_containerTouchY=y;
						mCSB_containerTouchX=x;
					});
					mCSB_container.bind("touchmove",function(e){
						e.preventDefault(); e.stopImmediatePropagation();
						touch=e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
						elem=$(this).parent();
						elemOffset=elem.offset();
						x=touch.pageX-elemOffset.left;
						y=touch.pageY-elemOffset.top;
						if($this.data("horizontalScroll")){
							$this.mCustomScrollbar("scrollTo",mCSB_containerTouchX-x,{trigger:"internal"});
						}else{
							$this.mCustomScrollbar("scrollTo",mCSB_containerTouchY-y,{trigger:"internal"});
						}
					});
				}
			}
			/*dragger rail click scrolling*/
			if(!$this.data("bindEvent_scrollbar_click")){
				mCSB_draggerContainer.bind("click",function(e){
					var scrollToPos=(e.pageY-mCSB_draggerContainer.offset().top)*$this.data("scrollAmount"),target=$(e.target);
					if($this.data("horizontalScroll")){
						scrollToPos=(e.pageX-mCSB_draggerContainer.offset().left)*$this.data("scrollAmount");
					}
					if(target.hasClass("mCSB_draggerContainer") || target.hasClass("mCSB_draggerRail")){
						$this.mCustomScrollbar("scrollTo",scrollToPos,{trigger:"internal",scrollEasing:"draggerRailEase"});
					}
				});
				$this.data({"bindEvent_scrollbar_click":true});
			}
			/*mousewheel scrolling*/
			if($this.data("mouseWheel")){
				if(!$this.data("bindEvent_mousewheel")){
					mCustomScrollBox.bind("mousewheel",function(e,delta){
						var scrollTo,mouseWheelPixels=$this.data("mouseWheelPixels"),absPos=Math.abs(mCSB_container.position().top),
							draggerPos=mCSB_dragger.position().top,limit=mCSB_draggerContainer.height()-mCSB_dragger.height();
						if($this.data("normalizeMouseWheelDelta")){
							if(delta<0){delta=-1;}else{delta=1;}
						}
						if(mouseWheelPixels==="auto"){
							mouseWheelPixels=100+Math.round($this.data("scrollAmount")/2);
						}
						if($this.data("horizontalScroll")){
							draggerPos=mCSB_dragger.position().left; 
							limit=mCSB_draggerContainer.width()-mCSB_dragger.width();
							absPos=Math.abs(mCSB_container.position().left);
						}
						if((delta>0 && draggerPos!==0) || (delta<0 && draggerPos!==limit)){e.preventDefault(); e.stopImmediatePropagation();}
						scrollTo=absPos-(delta*mouseWheelPixels);
						$this.mCustomScrollbar("scrollTo",scrollTo,{trigger:"internal"});
					});
					$this.data({"bindEvent_mousewheel":true});
				}
			}
			/*buttons scrolling*/
			if($this.data("scrollButtons_enable")){
				if($this.data("scrollButtons_scrollType")==="pixels"){ /*scroll by pixels*/
					if($this.data("horizontalScroll")){
						mCSB_buttonRight.add(mCSB_buttonLeft).unbind("mousedown touchstart MSPointerDown pointerdown mouseup MSPointerUp pointerup mouseout MSPointerOut pointerout touchend",mCSB_buttonRight_stop,mCSB_buttonLeft_stop);
						$this.data({"bindEvent_buttonsContinuous_x":false});
						if(!$this.data("bindEvent_buttonsPixels_x")){
							/*scroll right*/
							mCSB_buttonRight.bind("click",function(e){
								e.preventDefault();
								PixelsScrollTo(Math.abs(mCSB_container.position().left)+$this.data("scrollButtons_scrollAmount"));
							});
							/*scroll left*/
							mCSB_buttonLeft.bind("click",function(e){
								e.preventDefault();
								PixelsScrollTo(Math.abs(mCSB_container.position().left)-$this.data("scrollButtons_scrollAmount"));
							});
							$this.data({"bindEvent_buttonsPixels_x":true});
						}
					}else{
						mCSB_buttonDown.add(mCSB_buttonUp).unbind("mousedown touchstart MSPointerDown pointerdown mouseup MSPointerUp pointerup mouseout MSPointerOut pointerout touchend",mCSB_buttonRight_stop,mCSB_buttonLeft_stop);
						$this.data({"bindEvent_buttonsContinuous_y":false});
						if(!$this.data("bindEvent_buttonsPixels_y")){
							/*scroll down*/
							mCSB_buttonDown.bind("click",function(e){
								e.preventDefault();
								PixelsScrollTo(Math.abs(mCSB_container.position().top)+$this.data("scrollButtons_scrollAmount"));
							});
							/*scroll up*/
							mCSB_buttonUp.bind("click",function(e){
								e.preventDefault();
								PixelsScrollTo(Math.abs(mCSB_container.position().top)-$this.data("scrollButtons_scrollAmount"));
							});
							$this.data({"bindEvent_buttonsPixels_y":true});
						}
					}
					function PixelsScrollTo(to){
						if(!mCSB_dragger.data("preventAction")){
							mCSB_dragger.data("preventAction",true);
							$this.mCustomScrollbar("scrollTo",to,{trigger:"internal"});
						}
					}
				}else{ /*continuous scrolling*/
					if($this.data("horizontalScroll")){
						mCSB_buttonRight.add(mCSB_buttonLeft).unbind("click");
						$this.data({"bindEvent_buttonsPixels_x":false});
						if(!$this.data("bindEvent_buttonsContinuous_x")){
							/*scroll right*/
							mCSB_buttonRight.bind("mousedown touchstart MSPointerDown pointerdown",function(e){
								e.preventDefault();
								var scrollButtonsSpeed=ScrollButtonsSpeed();
								$this.data({"mCSB_buttonScrollRight":setInterval(function(){
									$this.mCustomScrollbar("scrollTo",Math.abs(mCSB_container.position().left)+scrollButtonsSpeed,{trigger:"internal",scrollEasing:"easeOutCirc"});
								},17)});
							});
							var mCSB_buttonRight_stop=function(e){
								e.preventDefault(); clearInterval($this.data("mCSB_buttonScrollRight"));
							}
							mCSB_buttonRight.bind("mouseup touchend MSPointerUp pointerup mouseout MSPointerOut pointerout",mCSB_buttonRight_stop);
							/*scroll left*/
							mCSB_buttonLeft.bind("mousedown touchstart MSPointerDown pointerdown",function(e){
								e.preventDefault();
								var scrollButtonsSpeed=ScrollButtonsSpeed();
								$this.data({"mCSB_buttonScrollLeft":setInterval(function(){
									$this.mCustomScrollbar("scrollTo",Math.abs(mCSB_container.position().left)-scrollButtonsSpeed,{trigger:"internal",scrollEasing:"easeOutCirc"});
								},17)});
							});	
							var mCSB_buttonLeft_stop=function(e){
								e.preventDefault(); clearInterval($this.data("mCSB_buttonScrollLeft"));
							}
							mCSB_buttonLeft.bind("mouseup touchend MSPointerUp pointerup mouseout MSPointerOut pointerout",mCSB_buttonLeft_stop);
							$this.data({"bindEvent_buttonsContinuous_x":true});
						}
					}else{
						mCSB_buttonDown.add(mCSB_buttonUp).unbind("click");
						$this.data({"bindEvent_buttonsPixels_y":false});
						if(!$this.data("bindEvent_buttonsContinuous_y")){
							/*scroll down*/
							mCSB_buttonDown.bind("mousedown touchstart MSPointerDown pointerdown",function(e){
								e.preventDefault();
								var scrollButtonsSpeed=ScrollButtonsSpeed();
								$this.data({"mCSB_buttonScrollDown":setInterval(function(){
									$this.mCustomScrollbar("scrollTo",Math.abs(mCSB_container.position().top)+scrollButtonsSpeed,{trigger:"internal",scrollEasing:"easeOutCirc"});
								},17)});
							});
							var mCSB_buttonDown_stop=function(e){
								e.preventDefault(); clearInterval($this.data("mCSB_buttonScrollDown"));
							}
							mCSB_buttonDown.bind("mouseup touchend MSPointerUp pointerup mouseout MSPointerOut pointerout",mCSB_buttonDown_stop);
							/*scroll up*/
							mCSB_buttonUp.bind("mousedown touchstart MSPointerDown pointerdown",function(e){
								e.preventDefault();
								var scrollButtonsSpeed=ScrollButtonsSpeed();
								$this.data({"mCSB_buttonScrollUp":setInterval(function(){
									$this.mCustomScrollbar("scrollTo",Math.abs(mCSB_container.position().top)-scrollButtonsSpeed,{trigger:"internal",scrollEasing:"easeOutCirc"});
								},17)});
							});	
							var mCSB_buttonUp_stop=function(e){
								e.preventDefault(); clearInterval($this.data("mCSB_buttonScrollUp"));
							}
							mCSB_buttonUp.bind("mouseup touchend MSPointerUp pointerup mouseout MSPointerOut pointerout",mCSB_buttonUp_stop);
							$this.data({"bindEvent_buttonsContinuous_y":true});
						}
					}
					function ScrollButtonsSpeed(){
						var speed=$this.data("scrollButtons_scrollSpeed");
						if($this.data("scrollButtons_scrollSpeed")==="auto"){
							speed=Math.round(($this.data("scrollInertia")+100)/40);
						}
						return speed;
					}
				}
			}
			/*scrolling on element focus (e.g. via TAB key)*/
			if($this.data("autoScrollOnFocus")){
				if(!$this.data("bindEvent_focusin")){
					mCustomScrollBox.bind("focusin",function(){
						mCustomScrollBox.scrollTop(0).scrollLeft(0);
						var focusedElem=$(document.activeElement);
						if(focusedElem.is("input,textarea,select,button,a[tabindex],area,object")){
							var mCSB_containerPos=mCSB_container.position().top,
								focusedElemPos=focusedElem.position().top,
								visibleLimit=mCustomScrollBox.height()-focusedElem.outerHeight();
							if($this.data("horizontalScroll")){
								mCSB_containerPos=mCSB_container.position().left;
								focusedElemPos=focusedElem.position().left;
								visibleLimit=mCustomScrollBox.width()-focusedElem.outerWidth();
							}
							if(mCSB_containerPos+focusedElemPos<0 || mCSB_containerPos+focusedElemPos>visibleLimit){
								$this.mCustomScrollbar("scrollTo",focusedElemPos,{trigger:"internal"});
							}
						}
					});
					$this.data({"bindEvent_focusin":true});
				}
			}
			/*auto-hide scrollbar*/
			if($this.data("autoHideScrollbar") && !$this.data("alwaysShowScrollbar")){
				if(!$this.data("bindEvent_autoHideScrollbar")){
					mCustomScrollBox.bind("mouseenter",function(e){
						mCustomScrollBox.addClass("mCS-mouse-over");
						functions.showScrollbar.call(mCustomScrollBox.children(".mCSB_scrollTools"));
					}).bind("mouseleave touchend",function(e){
						mCustomScrollBox.removeClass("mCS-mouse-over");
						if(e.type==="mouseleave"){functions.hideScrollbar.call(mCustomScrollBox.children(".mCSB_scrollTools"));}
					});
					$this.data({"bindEvent_autoHideScrollbar":true});
				}
			}
		},
		scrollTo:function(scrollTo,options){
			var $this=$(this),
				defaults={
					moveDragger:false,
					trigger:"external",
					callbacks:true,
					scrollInertia:$this.data("scrollInertia"),
					scrollEasing:$this.data("scrollEasing")
				},
				options=$.extend(defaults,options),
				draggerScrollTo,
				mCustomScrollBox=$this.children(".mCustomScrollBox"),
				mCSB_container=mCustomScrollBox.children(".mCSB_container"),
				mCSB_scrollTools=mCustomScrollBox.children(".mCSB_scrollTools"),
				mCSB_draggerContainer=mCSB_scrollTools.children(".mCSB_draggerContainer"),
				mCSB_dragger=mCSB_draggerContainer.children(".mCSB_dragger"),
				contentSpeed=draggerSpeed=options.scrollInertia,
				scrollBeginning,scrollBeginningOffset,totalScroll,totalScrollOffset;
			if(!mCSB_container.hasClass("mCS_no_scrollbar")){
				$this.data({"mCS_trigger":options.trigger});
				if($this.data("mCS_Init")){options.callbacks=false;}
				if(scrollTo || scrollTo===0){
					if(typeof(scrollTo)==="number"){ /*if integer, scroll by number of pixels*/
						if(options.moveDragger){ /*scroll dragger*/
							draggerScrollTo=scrollTo;
							if($this.data("horizontalScroll")){
								scrollTo=mCSB_dragger.position().left*$this.data("scrollAmount");
							}else{
								scrollTo=mCSB_dragger.position().top*$this.data("scrollAmount");
							}
							draggerSpeed=0;
						}else{ /*scroll content by default*/
							draggerScrollTo=scrollTo/$this.data("scrollAmount");
						}
					}else if(typeof(scrollTo)==="string"){ /*if string, scroll by element position*/
						var target;
						if(scrollTo==="top"){ /*scroll to top*/
							target=0;
						}else if(scrollTo==="bottom" && !$this.data("horizontalScroll")){ /*scroll to bottom*/
							target=mCSB_container.outerHeight()-mCustomScrollBox.height();
						}else if(scrollTo==="left"){ /*scroll to left*/
							target=0;
						}else if(scrollTo==="right" && $this.data("horizontalScroll")){ /*scroll to right*/
							target=mCSB_container.outerWidth()-mCustomScrollBox.width();
						}else if(scrollTo==="first"){ /*scroll to first element position*/
							target=$this.find(".mCSB_container").find(":first");
						}else if(scrollTo==="last"){ /*scroll to last element position*/
							target=$this.find(".mCSB_container").find(":last");
						}else{ /*scroll to element position*/
							target=$this.find(scrollTo);
						}
						if(target.length===1){ /*if such unique element exists, scroll to it*/
							if($this.data("horizontalScroll")){
								scrollTo=target.position().left;
							}else{
								scrollTo=target.position().top;
							}
							draggerScrollTo=scrollTo/$this.data("scrollAmount");
						}else{
							draggerScrollTo=scrollTo=target;
						}
					}
					/*scroll to*/
					if($this.data("horizontalScroll")){
						if($this.data("onTotalScrollBack_Offset")){ /*scroll beginning offset*/
							scrollBeginningOffset=-$this.data("onTotalScrollBack_Offset");
						}
						if($this.data("onTotalScroll_Offset")){ /*total scroll offset*/
							totalScrollOffset=mCustomScrollBox.width()-mCSB_container.outerWidth()+$this.data("onTotalScroll_Offset");
						}
						if(draggerScrollTo<0){ /*scroll start position*/
							draggerScrollTo=scrollTo=0; clearInterval($this.data("mCSB_buttonScrollLeft"));
							if(!scrollBeginningOffset){scrollBeginning=true;}
						}else if(draggerScrollTo>=mCSB_draggerContainer.width()-mCSB_dragger.width()){ /*scroll end position*/
							draggerScrollTo=mCSB_draggerContainer.width()-mCSB_dragger.width();
							scrollTo=mCustomScrollBox.width()-mCSB_container.outerWidth(); clearInterval($this.data("mCSB_buttonScrollRight"));
							if(!totalScrollOffset){totalScroll=true;}
						}else{scrollTo=-scrollTo;}
						var snapAmount = $this.data("snapAmount");
						if (snapAmount) {
							scrollTo = Math.round(scrollTo / snapAmount) * snapAmount - $this.data("snapOffset");
						}
						/*scrolling animation*/
						functions.mTweenAxis.call(this,mCSB_dragger[0],"left",Math.round(draggerScrollTo),draggerSpeed,options.scrollEasing);
						functions.mTweenAxis.call(this,mCSB_container[0],"left",Math.round(scrollTo),contentSpeed,options.scrollEasing,{
							onStart:function(){
								if(options.callbacks && !$this.data("mCS_tweenRunning")){callbacks("onScrollStart");}
								if($this.data("autoHideScrollbar") && !$this.data("alwaysShowScrollbar")){functions.showScrollbar.call(mCSB_scrollTools);}
							},
							onUpdate:function(){
								if(options.callbacks){callbacks("whileScrolling");}
							},
							onComplete:function(){
								if(options.callbacks){
									callbacks("onScroll");
									if(scrollBeginning || (scrollBeginningOffset && mCSB_container.position().left>=scrollBeginningOffset)){callbacks("onTotalScrollBack");}
									if(totalScroll || (totalScrollOffset && mCSB_container.position().left<=totalScrollOffset)){callbacks("onTotalScroll");}
								}
								mCSB_dragger.data("preventAction",false); $this.data("mCS_tweenRunning",false);
								if($this.data("autoHideScrollbar") && !$this.data("alwaysShowScrollbar")){if(!mCustomScrollBox.hasClass("mCS-mouse-over")){functions.hideScrollbar.call(mCSB_scrollTools);}}
							}
						});
					}else{
						if($this.data("onTotalScrollBack_Offset")){ /*scroll beginning offset*/
							scrollBeginningOffset=-$this.data("onTotalScrollBack_Offset");
						}
						if($this.data("onTotalScroll_Offset")){ /*total scroll offset*/
							totalScrollOffset=mCustomScrollBox.height()-mCSB_container.outerHeight()+$this.data("onTotalScroll_Offset");
						}
						if(draggerScrollTo<0){ /*scroll start position*/
							draggerScrollTo=scrollTo=0; clearInterval($this.data("mCSB_buttonScrollUp"));
							if(!scrollBeginningOffset){scrollBeginning=true;}
						}else if(draggerScrollTo>=mCSB_draggerContainer.height()-mCSB_dragger.height()){ /*scroll end position*/
							draggerScrollTo=mCSB_draggerContainer.height()-mCSB_dragger.height();
							scrollTo=mCustomScrollBox.height()-mCSB_container.outerHeight(); clearInterval($this.data("mCSB_buttonScrollDown"));
							if(!totalScrollOffset){totalScroll=true;}
						}else{scrollTo=-scrollTo;}
						var snapAmount = $this.data("snapAmount");
						if (snapAmount) {
							scrollTo = Math.round(scrollTo / snapAmount) * snapAmount - $this.data("snapOffset");
						}
						/*scrolling animation*/
						functions.mTweenAxis.call(this,mCSB_dragger[0],"top",Math.round(draggerScrollTo),draggerSpeed,options.scrollEasing);
						functions.mTweenAxis.call(this,mCSB_container[0],"top",Math.round(scrollTo),contentSpeed,options.scrollEasing,{
							onStart:function(){
								if(options.callbacks && !$this.data("mCS_tweenRunning")){callbacks("onScrollStart");}
								if($this.data("autoHideScrollbar") && !$this.data("alwaysShowScrollbar")){functions.showScrollbar.call(mCSB_scrollTools);}
							},
							onUpdate:function(){
								if(options.callbacks){callbacks("whileScrolling");}
							},
							onComplete:function(){
								if(options.callbacks){
									callbacks("onScroll");
									if(scrollBeginning || (scrollBeginningOffset && mCSB_container.position().top>=scrollBeginningOffset)){callbacks("onTotalScrollBack");}
									if(totalScroll || (totalScrollOffset && mCSB_container.position().top<=totalScrollOffset)){callbacks("onTotalScroll");}
								}
								mCSB_dragger.data("preventAction",false); $this.data("mCS_tweenRunning",false);
								if($this.data("autoHideScrollbar") && !$this.data("alwaysShowScrollbar")){if(!mCustomScrollBox.hasClass("mCS-mouse-over")){functions.hideScrollbar.call(mCSB_scrollTools);}}
							}
						});
					}
					if($this.data("mCS_Init")){$this.data({"mCS_Init":false});}
				}
			}
			/*callbacks*/
			function callbacks(cb){
				if ($this.data("mCustomScrollbarIndex")) {
					this.mcs = {
						top: mCSB_container.position().top, left: mCSB_container.position().left,
						draggerTop: mCSB_dragger.position().top, draggerLeft: mCSB_dragger.position().left,
						topPct: Math.round((100 * Math.abs(mCSB_container.position().top)) / Math.abs(mCSB_container.outerHeight() - mCustomScrollBox.height())),
						leftPct: Math.round((100 * Math.abs(mCSB_container.position().left)) / Math.abs(mCSB_container.outerWidth() - mCustomScrollBox.width()))
					};
					switch (cb) {
						/*start scrolling callback*/
						case "onScrollStart":
							$this.data("mCS_tweenRunning", true).data("onScrollStart_Callback").call($this, this.mcs);
							break;
						case "whileScrolling":
							$this.data("whileScrolling_Callback").call($this, this.mcs);
							break;
						case "onScroll":
							$this.data("onScroll_Callback").call($this, this.mcs);
							break;
						case "onTotalScrollBack":
							$this.data("onTotalScrollBack_Callback").call($this, this.mcs);
							break;
						case "onTotalScroll":
							$this.data("onTotalScroll_Callback").call($this, this.mcs);
							break;
					}
				}
			}
		},
		stop:function(){
			var $this=$(this),
				mCSB_container=$this.children().children(".mCSB_container"),
				mCSB_dragger=$this.children().children().children().children(".mCSB_dragger");
			functions.mTweenAxisStop.call(this,mCSB_container[0]);
			functions.mTweenAxisStop.call(this,mCSB_dragger[0]);
		},
		disable:function(resetScroll){
			var $this=$(this),
				mCustomScrollBox=$this.children(".mCustomScrollBox"),
				mCSB_container=mCustomScrollBox.children(".mCSB_container"),
				mCSB_scrollTools=mCustomScrollBox.children(".mCSB_scrollTools"),
				mCSB_dragger=mCSB_scrollTools.children().children(".mCSB_dragger");
			mCustomScrollBox.unbind("mousewheel focusin mouseenter mouseleave touchend");
			mCSB_container.unbind("touchstart touchmove")
			if(resetScroll){
				if($this.data("horizontalScroll")){
					mCSB_dragger.add(mCSB_container).css("left",0);
				}else{
					mCSB_dragger.add(mCSB_container).css("top",0);
				}
			}
			mCSB_scrollTools.css("display","none");
			mCSB_container.addClass("mCS_no_scrollbar");
			$this.data({"bindEvent_mousewheel":false,"bindEvent_focusin":false,"bindEvent_content_touch":false,"bindEvent_autoHideScrollbar":false}).addClass("mCS_disabled");
		},
		destroy:function(){
			var $this=$(this);
			$this.removeClass("mCustomScrollbar _mCS_"+$this.data("mCustomScrollbarIndex")).addClass("mCS_destroyed").children().children(".mCSB_container").unwrap().children().unwrap().siblings(".mCSB_scrollTools").remove();
			$(document).unbind("mousemove."+$this.data("mCustomScrollbarIndex")+" mouseup."+$this.data("mCustomScrollbarIndex")+" MSPointerMove."+$this.data("mCustomScrollbarIndex")+" MSPointerUp."+$this.data("mCustomScrollbarIndex"));
			$(window).unbind("resize."+$this.data("mCustomScrollbarIndex"));
		}
	},
	functions={
		/*hide/show scrollbar*/
		showScrollbar:function(){
			this.stop().animate({opacity:1},"fast");
		},
		hideScrollbar:function(){
			this.stop().animate({opacity:0},"fast");
		},
		/*js animation tween*/
		mTweenAxis:function(el,prop,to,duration,easing,callbacks){
			var callbacks=callbacks || {},
				onStart=callbacks.onStart || function(){},onUpdate=callbacks.onUpdate || function(){},onComplete=callbacks.onComplete || function(){};
			var startTime=_getTime(),_delay,progress=0,from=el.offsetTop,elStyle=el.style;
			if(prop==="left"){from=el.offsetLeft;}
			var diff=to-from;
			_cancelTween();
			_startTween();
			function _getTime(){
				if(window.performance && window.performance.now){
					return window.performance.now();
				}else{
					if(window.performance && window.performance.webkitNow){
						return window.performance.webkitNow();
					}else{
						if(Date.now){return Date.now();}else{return new Date().getTime();}
					}
				}
			}
			function _step(){
				if(!progress){onStart.call();}
				progress=_getTime()-startTime;
				_tween();
				if(progress>=el._time){
					el._time=(progress>el._time) ? progress+_delay-(progress- el._time) : progress+_delay-1;
					if(el._time<progress+1){el._time=progress+1;}
				}
				if(el._time<duration){el._id=_request(_step);}else{onComplete.call();}
			}
			function _tween(){
				if(duration>0){
					el.currVal=_ease(el._time,from,diff,duration,easing);
					elStyle[prop]=Math.round(el.currVal)+"px";
				}else{
					elStyle[prop]=to+"px";
				}
				onUpdate.call();
			}
			function _startTween(){
				_delay=1000/60;
				el._time=progress+_delay;
				_request=(!window.requestAnimationFrame) ? function(f){_tween(); return setTimeout(f,0.01);} : window.requestAnimationFrame;
				el._id=_request(_step);
			}
			function _cancelTween(){
				if(el._id==null){return;}
				if(!window.requestAnimationFrame){clearTimeout(el._id);
				}else{window.cancelAnimationFrame(el._id);}
				el._id=null;
			}
			function _ease(t,b,c,d,type){
				switch(type){
					case "linear":
						return c*t/d + b;
						break;
					case "easeOutQuad":
						t /= d; return -c * t*(t-2) + b;
						break;
					case "easeInOutQuad":
						t /= d/2;
						if (t < 1) return c/2*t*t + b;
						t--;
						return -c/2 * (t*(t-2) - 1) + b;
						break;
					case "easeOutCubic":
						t /= d; t--; return c*(t*t*t + 1) + b;
						break;
					case "easeOutQuart":
						t /= d; t--; return -c * (t*t*t*t - 1) + b;
						break;
					case "easeOutQuint":
						t /= d; t--; return c*(t*t*t*t*t + 1) + b;
						break;
					case "easeOutCirc":
						t /= d; t--; return c * Math.sqrt(1 - t*t) + b;
						break;
					case "easeOutSine":
						return c * Math.sin(t/d * (Math.PI/2)) + b;
						break;
					case "easeOutExpo":
						return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
						break;
					case "mcsEaseOut":
						var ts=(t/=d)*t,tc=ts*t;
						return b+c*(0.499999999999997*tc*ts + -2.5*ts*ts + 5.5*tc + -6.5*ts + 4*t);
						break;
					case "draggerRailEase":
						t /= d/2;
						if (t < 1) return c/2*t*t*t + b;
						t -= 2;
						return c/2*(t*t*t + 2) + b;
						break;
				}
			}
		},
		/*stop js animation tweens*/
		mTweenAxisStop:function(el){
			if(el._id==null){return;}
			if(!window.requestAnimationFrame){clearTimeout(el._id);
			}else{window.cancelAnimationFrame(el._id);}
			el._id=null;
		},
		/*detect requestAnimationFrame and polyfill*/
		rafPolyfill:function(){
			var pfx=["ms","moz","webkit","o"],i=pfx.length;
			while(--i > -1 && !window.requestAnimationFrame){
				window.requestAnimationFrame=window[pfx[i]+"RequestAnimationFrame"];
				window.cancelAnimationFrame=window[pfx[i]+"CancelAnimationFrame"] || window[pfx[i]+"CancelRequestAnimationFrame"];
			}
		}
	}
	/*detect features*/
	functions.rafPolyfill.call(); /*requestAnimationFrame*/
	$.support.touch=!!('ontouchstart' in window); /*touch*/
	$.support.pointer=window.navigator.pointerEnabled; /*pointer support*/
	$.support.msPointer=window.navigator.msPointerEnabled; /*MSPointer support*/
	/*plugin dependencies*/
	var _dlp=("https:"==document.location.protocol) ? "https:" : "http:";
	$.event.special.mousewheel || document.write('<script src="'+_dlp+'//cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.0.6/jquery.mousewheel.min.js"><\/script>');
	/*plugin fn*/
	$.fn.mCustomScrollbar=function(method){
		if(methods[method]){
			return methods[method].apply(this,Array.prototype.slice.call(arguments,1));
		}else if(typeof method==="object" || !method){
			return methods.init.apply(this,arguments);
		}else{
			$.error("Method "+method+" does not exist");
		}
	};
})(jQuery);

/* **********************************************
     Begin fao-explorer.js
********************************************** */

/**
	Bootstrap Project Template
	Designed and built by Zach Wise at VéritéCo
*/

/*	Required Files
	CodeKit Import
	http://incident57.com/codekit/
================================================== */

// @codekit-prepend "library/jquery.smooth-scroll.js";

// @codekit-prepend "library/bootstrap/transition.js";
// @codekit-prepend "library/bootstrap/scrollspy.js";
// @codekit-prepend "library/bootstrap/tab.js";
// @codekit-prepend "library/bootstrap/tooltip.js";
// @codekit-prepend "library/bootstrap/carousel.js";
// @codekit-prepend "library/bootstrap/collapse.js";
// @codekit-prepend "library/bootstrap/modal.js";
// @codekit-prepend "library/bootstrap/dropdown.js";
// @codekit-prepend "library/bootstrap/affix.js";

// @codekit-prepend "library/waypoints.js";
// @codekit-prepend "library/waypoints-sticky.js";

// @codekit-prepend "library/waypoints.js";
// @codekit-prepend "library/waypoints-sticky.js";

// @codekit-prepend "library/china.js";
// @codekit-prepend "library/india.js";

// @codekit-prepend "library/d3.js";
// @codekit-prepend "library/d3plus.js";

// @codekit-prepend "library/jquery.mCustomScrollbar.js";


var initFAO = function() {
	/* WAYPOINTS
	================================================== */
	$('#main-nav').waypoint('sticky', {
		offset: 50,
		wrapper: '<div class="sticky-wrapper" />',
		stuckClass: 'navbar-fixed-top'
	});
	
	// add sticky switcher here 

    var swapLandsatImages = function() {
        var idx = Math.ceil(25 * (mcs.leftPct/100)) - 1;

        // optimization
        if (prevIndex === undefined || prevIndex === idx) {
            prevIndex = idx;
            return;
          }
        $('div#landsat-container img').css('visibility', 'hidden');
        $('div#landsat-container img:eq(' + idx + ')').css('visibility', 'visible');
      }
    var prevIndex = undefined; // used for landsat

    var yr = 1985;

    var capitalStock = {};
    var topCrops = {};

    function humanNumbers(n) {
      if (n > 1000000000000) {
          n = n/1000000000000.0
          return n.toFixed(2) + " trillion";
      }
      if (n > 1000000000) {
          n = n/1000000000.0
          return n.toFixed(2) + " billion";
      }
      if (n > 1000000) {
          n = n/1000000.0
          return n.toFixed(2) + " million";
      }
      return n.toFixed(0);
    }

    var setChartHeight = function() {
        $.each(capitalStock, function(index, value) {
			console.log(yr);
			if (value['year'] == yr) {
	            var livestock = parseFloat(value['LIVESTOCK'] * 1000000)
	            var crops = parseFloat(value['CROPS'] * 1000000);
	            var sum = livestock + crops;
	            var livestockHeight = (livestock / sum) * 100;
	            var cropsHeight = (crops / sum) * 100;
			
				//console.log(livestockHeight);
				//console.log(cropsHeight);
			
	            $(compareItems[0]).css('height', livestockHeight + '%');
	            $(compareItems[1]).css('height', cropsHeight + '%');
	            $(values[0]).html('$' + humanNumbers(livestock));
	            $(values[1]).html('$' + humanNumbers(crops));
			
			};
        });
    };

    // -- initialize for comparison chart
    if ($('.compare-chart')) {
	    var compareItems = $('.compare-chart-item-amount');
	    var values = $('.value');


	    $.getJSON("data/capital-stock/China-capital.json", function(data) {
			capitalStock = data;
			console.log(data);
			setChartHeight();
	    })
    }

    // -- end initialize    




    $("#timeline-navbar").mCustomScrollbar({
    	scrollInertia: 0,
    	horizontalScroll:true,
    	autoDraggerLength: false,
    	advanced:{autoExpandHorizontalScroll:false,updateOnContentResize:false},
    	scrollButtons: { enable: false },
    	contentTouchScroll: true,
    	callbacks:{
			
    		whileScrolling:function(){
				console.log("whileScrolling")
    			yr = 1985 + Math.floor(25 * (mcs.leftPct/100));
    			$(".mCSB_dragger_bar").html( yr );
				
    		},
			
    		onScroll: function() {
                if ($('div#compare-chart')) {
                  setChartHeight();
                }

                if ($('div#landsat-container')) {
                  swapLandsatImages();
                }

				console.log("HEY")
    			var idx = Math.ceil(25 * (mcs.leftPct/100)) - 1;
   			 	// optimization 
   			 	if (prevIndex === undefined || prevIndex === idx) {
    				revIndex = idx;
    				return;
    			}
				
				$('div#landsat-container img').css('visibility', 'hidden');
			 	$('div#landsat-container img:eq(' + idx + ')').css('visibility', 'visible');
			}
			
		}
	});
	
	 $(".mCSB_dragger_bar").html("1985");
	
	/* TIMELINE NAVBAR CHART
	================================================== */
	function viz(data, container) {
		d3plus.viz()
		.container(container)
		.data(data)
		.type("stacked")
		.id("type")
		.text("type")
		.y("value")
		.x("Year")
		.color("color")
		.draw()
	}
	
	viz(china, "#navbar-chart-urban-rural");
	viz(china, "#navbar-chart-population");
	
	
	/* RESIZE LANDSAT
	================================================== */
	function resizeLandsat() {

		$("#landsat-container").height(ratioHeight($("#landsat-container img").width(), 1459, 719)) ;
	}
	
	/* ON RESIZE
	================================================== */
	$( window ).resize(function() {
		resizeLandsat();
	});
}

/* Utlities
================================================== */

// RATIO
var ratioHeight = function(width, ratio_width, ratio_height) {
	return Math.round((width / ratio_width) * ratio_height);
}


