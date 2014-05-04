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

// @codekit-prepend "library/jquery.mCustomScrollbar.js";

$(document).ready(function(){

	/* WAYPOINTS
	================================================== */
	$('#main-nav').waypoint('sticky', {
		offset: 50,
		wrapper: '<div class="sticky-wrapper" />',
		stuckClass: 'navbar-fixed-top'
	});

	/* TIMELINE NAVBAR
	================================================== */

  var prevIndex = undefined;

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
      if (value['year'] == yr) {
        var livestock = parseFloat(value['LIVESTOCK'] * 1000000)
        var crops = parseFloat(value['CROPS'] * 1000000);
        var sum = livestock + crops;
        var livestockHeight = (livestock / sum) * 100;
        var cropsHeight = (crops / sum) * 100;

        $(compareItems[0]).css('height', livestockHeight + '%');
        $(compareItems[1]).css('height', cropsHeight + '%');
        $(values[0]).html('$' + humanNumbers(livestock));
        $(values[1]).html('$' + humanNumbers(crops));
      };
    });
  };

  var drawStreamgraph = function() {
    var n = 10, // number of layers
        m = 25, // number of samples per layer
        stack = d3.layout.stack()
          .offset("wiggle")

    /*
      Each item in the array is an object with an x and a y.
      We need to pull these objects higher in the stack
      so d3 can iterate over them properly and attach a
      y0 value for the offset of the streamgraph.
    */

    var layers = stack(d3.values(topCrops).map(function(d) { return d[0]; }));

    /*
      Using the map function available to arrays,
      grab all of the years from the first stack.
    */
    var years = layers[0].map(function(d) { return d.x });

    var width = 960,
        height = 500;

    var x = d3.scale.linear()
        .domain([d3.min(years), d3.max(years)])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([0, d3.max(layers, function(layer) {
          return d3.max(layer, function(d) {
            return d.y0 + d.y;
          });
        })])
        .range([height, 0]);

    var color = d3.scale.linear()
        .range(["#aad", "#556"]);

    var area = d3.svg.area()
        .x(function(d) { return x(d.x); })
        .y0(function(d) { return y(d.y0); })
        .y1(function(d) { return y(d.y0 + d.y); });

    var svg = d3.select("#streamgraph").append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll("path")
        .data(layers)
      .enter().append("path")
        .attr("d", area)
        .style("fill", function() { return color(Math.random()); });
  }


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

  if ($('div#compare-chart')) {
    var compareItems = $('.compare-chart-item-amount');
    var values = $('.value');


    $.getJSON("data/capital-stock/China-capital.json", function(data) {
      capitalStock = data;
      setChartHeight();
    })

    if ($('#streamgraph')) {
      $.getJSON("data/crops/China-topcrops.json", function(data) {
        topCrops = data;
        drawStreamgraph();
      });
      console.log('doah');
    }
  }

  $("#timeline-navbar").mCustomScrollbar({
    scrollInertia: 0,
    horizontalScroll:true,
    autoDraggerLength: false,
    advanced:{autoExpandHorizontalScroll:false,updateOnContentResize:false},
    scrollButtons: { enable: false },
    contentTouchScroll: true,
    callbacks:{
      whileScrolling:function(){
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
      }
    }
  });

  $(".mCSB_dragger_bar").html("1985");

});
=======
!function(t){function e(t){return t.replace(/(:|\.)/g,"\\$1")}var n="1.4.13",r={},a={exclude:[],excludeWithin:[],offset:0,direction:"top",scrollElement:null,scrollTarget:null,beforeScroll:function(){},afterScroll:function(){},easing:"swing",speed:400,autoCoefficent:2,preventDefault:!0},i=function(e){var n=[],r=!1,a=e.dir&&"left"==e.dir?"scrollLeft":"scrollTop";return this.each(function(){if(this!=document&&this!=window){var e=t(this);e[a]()>0?n.push(this):(e[a](1),r=e[a]()>0,r&&n.push(this),e[a](0))}}),n.length||this.each(function(t){"BODY"===this.nodeName&&(n=[this])}),"first"===e.el&&n.length>1&&(n=[n[0]]),n},o="ontouchend"in document;t.fn.extend({scrollable:function(t){var e=i.call(this,{dir:t});return this.pushStack(e)},firstScrollable:function(t){var e=i.call(this,{el:"first",dir:t});return this.pushStack(e)},smoothScroll:function(n,r){if(n=n||{},"options"===n)return r?this.each(function(){var e=t(this),n=t.extend(e.data("ssOpts")||{},r);t(this).data("ssOpts",n)}):this.first().data("ssOpts");var a=t.extend({},t.fn.smoothScroll.defaults,n),i=t.smoothScroll.filterPath(location.pathname);return this.unbind("click.smoothscroll").bind("click.smoothscroll",function(n){var r=this,o=t(this),l=t.extend({},a,o.data("ssOpts")||{}),s=a.exclude,u=l.excludeWithin,c=0,d=0,p=!0,f={},h=location.hostname===r.hostname||!r.hostname,g=l.scrollTarget||(t.smoothScroll.filterPath(r.pathname)||i)===i,v=e(r.hash);if(l.scrollTarget||h&&g&&v){for(;p&&c<s.length;)o.is(e(s[c++]))&&(p=!1);for(;p&&d<u.length;)o.closest(u[d++]).length&&(p=!1)}else p=!1;p&&(l.preventDefault&&n.preventDefault(),t.extend(f,l,{scrollTarget:l.scrollTarget||v,link:r}),t.smoothScroll(f))}),this}}),t.smoothScroll=function(e,n){if("options"===e&&"object"==typeof n)return t.extend(r,n);var a,i,o,l,s=0,u="offset",c="scrollTop",d={},p={},f=[];"number"==typeof e?(a=t.extend({link:null},t.fn.smoothScroll.defaults,r),o=e):(a=t.extend({link:null},t.fn.smoothScroll.defaults,e||{},r),a.scrollElement&&(u="position","static"==a.scrollElement.css("position")&&a.scrollElement.css("position","relative"))),c="left"==a.direction?"scrollLeft":c,a.scrollElement?(i=a.scrollElement,/^(?:HTML|BODY)$/.test(i[0].nodeName)||(s=i[c]())):i=t("html, body").firstScrollable(a.direction),a.beforeScroll.call(i,a),o="number"==typeof e?e:n||t(a.scrollTarget)[u]()&&t(a.scrollTarget)[u]()[a.direction]||0,d[c]=o+s+a.offset,l=a.speed,"auto"===l&&(l=d[c]||i.scrollTop(),l/=a.autoCoefficent),p={duration:l,easing:a.easing,complete:function(){a.afterScroll.call(a.link,a)}},a.step&&(p.step=a.step),i.length?i.stop().animate(d,p):a.afterScroll.call(a.link,a)},t.smoothScroll.version=n,t.smoothScroll.filterPath=function(t){return t.replace(/^\//,"").replace(/(?:index|default).[a-zA-Z]{3,4}$/,"").replace(/\/$/,"")},t.fn.smoothScroll.defaults=a}(jQuery),+function(t){"use strict";function e(){var t=document.createElement("bootstrap"),e={WebkitTransition:"webkitTransitionEnd",MozTransition:"transitionend",OTransition:"oTransitionEnd otransitionend",transition:"transitionend"};for(var n in e)if(void 0!==t.style[n])return{end:e[n]};return!1}t.fn.emulateTransitionEnd=function(e){var n=!1,r=this;t(this).one(t.support.transition.end,function(){n=!0});var a=function(){n||t(r).trigger(t.support.transition.end)};return setTimeout(a,e),this},t(function(){t.support.transition=e()})}(jQuery),+function(t){"use strict";function e(n,r){var a,i=t.proxy(this.process,this);this.$element=t(t(n).is("body")?window:n),this.$body=t("body"),this.$scrollElement=this.$element.on("scroll.bs.scroll-spy.data-api",i),this.options=t.extend({},e.DEFAULTS,r),this.selector=(this.options.target||(a=t(n).attr("href"))&&a.replace(/.*(?=#[^\s]+$)/,"")||"")+" .nav li > a",this.offsets=t([]),this.targets=t([]),this.activeTarget=null,this.refresh(),this.process()}e.DEFAULTS={offset:10},e.prototype.refresh=function(){var e=this.$element[0]==window?"offset":"position";this.offsets=t([]),this.targets=t([]);var n=this,r=this.$body.find(this.selector).map(function(){var r=t(this),a=r.data("target")||r.attr("href"),i=/^#./.test(a)&&t(a);return i&&i.length&&i.is(":visible")&&[[i[e]().top+(!t.isWindow(n.$scrollElement.get(0))&&n.$scrollElement.scrollTop()),a]]||null}).sort(function(t,e){return t[0]-e[0]}).each(function(){n.offsets.push(this[0]),n.targets.push(this[1])})},e.prototype.process=function(){var t=this.$scrollElement.scrollTop()+this.options.offset,e=this.$scrollElement[0].scrollHeight||this.$body[0].scrollHeight,n=e-this.$scrollElement.height(),r=this.offsets,a=this.targets,i=this.activeTarget,o;if(t>=n)return i!=(o=a.last()[0])&&this.activate(o);if(i&&t<=r[0])return i!=(o=a[0])&&this.activate(o);for(o=r.length;o--;)i!=a[o]&&t>=r[o]&&(!r[o+1]||t<=r[o+1])&&this.activate(a[o])},e.prototype.activate=function(e){this.activeTarget=e,t(this.selector).parentsUntil(this.options.target,".active").removeClass("active");var n=this.selector+'[data-target="'+e+'"],'+this.selector+'[href="'+e+'"]',r=t(n).parents("li").addClass("active");r.parent(".dropdown-menu").length&&(r=r.closest("li.dropdown").addClass("active")),r.trigger("activate.bs.scrollspy")};var n=t.fn.scrollspy;t.fn.scrollspy=function(n){return this.each(function(){var r=t(this),a=r.data("bs.scrollspy"),i="object"==typeof n&&n;a||r.data("bs.scrollspy",a=new e(this,i)),"string"==typeof n&&a[n]()})},t.fn.scrollspy.Constructor=e,t.fn.scrollspy.noConflict=function(){return t.fn.scrollspy=n,this},t(window).on("load",function(){t('[data-spy="scroll"]').each(function(){var e=t(this);e.scrollspy(e.data())})})}(jQuery),+function(t){"use strict";var e=function(e){this.element=t(e)};e.prototype.show=function(){var e=this.element,n=e.closest("ul:not(.dropdown-menu)"),r=e.data("target");if(r||(r=e.attr("href"),r=r&&r.replace(/.*(?=#[^\s]*$)/,"")),!e.parent("li").hasClass("active")){var a=n.find(".active:last a")[0],i=t.Event("show.bs.tab",{relatedTarget:a});if(e.trigger(i),!i.isDefaultPrevented()){var o=t(r);this.activate(e.parent("li"),n),this.activate(o,o.parent(),function(){e.trigger({type:"shown.bs.tab",relatedTarget:a})})}}},e.prototype.activate=function(e,n,r){function a(){i.removeClass("active").find("> .dropdown-menu > .active").removeClass("active"),e.addClass("active"),o?(e[0].offsetWidth,e.addClass("in")):e.removeClass("fade"),e.parent(".dropdown-menu")&&e.closest("li.dropdown").addClass("active"),r&&r()}var i=n.find("> .active"),o=r&&t.support.transition&&i.hasClass("fade");o?i.one(t.support.transition.end,a).emulateTransitionEnd(150):a(),i.removeClass("in")};var n=t.fn.tab;t.fn.tab=function(n){return this.each(function(){var r=t(this),a=r.data("bs.tab");a||r.data("bs.tab",a=new e(this)),"string"==typeof n&&a[n]()})},t.fn.tab.Constructor=e,t.fn.tab.noConflict=function(){return t.fn.tab=n,this},t(document).on("click.bs.tab.data-api",'[data-toggle="tab"], [data-toggle="pill"]',function(e){e.preventDefault(),t(this).tab("show")})}(jQuery),+function(t){"use strict";var e=function(t,e){this.type=this.options=this.enabled=this.timeout=this.hoverState=this.$element=null,this.init("tooltip",t,e)};e.DEFAULTS={animation:!0,placement:"top",selector:!1,template:'<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',trigger:"hover focus",title:"",delay:0,html:!1,container:!1},e.prototype.init=function(e,n,r){this.enabled=!0,this.type=e,this.$element=t(n),this.options=this.getOptions(r);for(var a=this.options.trigger.split(" "),i=a.length;i--;){var o=a[i];if("click"==o)this.$element.on("click."+this.type,this.options.selector,t.proxy(this.toggle,this));else if("manual"!=o){var l="hover"==o?"mouseenter":"focusin",s="hover"==o?"mouseleave":"focusout";this.$element.on(l+"."+this.type,this.options.selector,t.proxy(this.enter,this)),this.$element.on(s+"."+this.type,this.options.selector,t.proxy(this.leave,this))}}this.options.selector?this._options=t.extend({},this.options,{trigger:"manual",selector:""}):this.fixTitle()},e.prototype.getDefaults=function(){return e.DEFAULTS},e.prototype.getOptions=function(e){return e=t.extend({},this.getDefaults(),this.$element.data(),e),e.delay&&"number"==typeof e.delay&&(e.delay={show:e.delay,hide:e.delay}),e},e.prototype.getDelegateOptions=function(){var e={},n=this.getDefaults();return this._options&&t.each(this._options,function(t,r){n[t]!=r&&(e[t]=r)}),e},e.prototype.enter=function(e){var n=e instanceof this.constructor?e:t(e.currentTarget)[this.type](this.getDelegateOptions()).data("bs."+this.type);return clearTimeout(n.timeout),n.hoverState="in",n.options.delay&&n.options.delay.show?void(n.timeout=setTimeout(function(){"in"==n.hoverState&&n.show()},n.options.delay.show)):n.show()},e.prototype.leave=function(e){var n=e instanceof this.constructor?e:t(e.currentTarget)[this.type](this.getDelegateOptions()).data("bs."+this.type);return clearTimeout(n.timeout),n.hoverState="out",n.options.delay&&n.options.delay.hide?void(n.timeout=setTimeout(function(){"out"==n.hoverState&&n.hide()},n.options.delay.hide)):n.hide()},e.prototype.show=function(){var e=t.Event("show.bs."+this.type);if(this.hasContent()&&this.enabled){if(this.$element.trigger(e),e.isDefaultPrevented())return;var n=this,r=this.tip();this.setContent(),this.options.animation&&r.addClass("fade");var a="function"==typeof this.options.placement?this.options.placement.call(this,r[0],this.$element[0]):this.options.placement,i=/\s?auto?\s?/i,o=i.test(a);o&&(a=a.replace(i,"")||"top"),r.detach().css({top:0,left:0,display:"block"}).addClass(a),this.options.container?r.appendTo(this.options.container):r.insertAfter(this.$element);var l=this.getPosition(),s=r[0].offsetWidth,u=r[0].offsetHeight;if(o){var c=this.$element.parent(),d=a,p=document.documentElement.scrollTop||document.body.scrollTop,f="body"==this.options.container?window.innerWidth:c.outerWidth(),h="body"==this.options.container?window.innerHeight:c.outerHeight(),g="body"==this.options.container?0:c.offset().left;a="bottom"==a&&l.top+l.height+u-p>h?"top":"top"==a&&l.top-p-u<0?"bottom":"right"==a&&l.right+s>f?"left":"left"==a&&l.left-s<g?"right":a,r.removeClass(d).addClass(a)}var v=this.getCalculatedOffset(a,l,s,u);this.applyPlacement(v,a),this.hoverState=null;var y=function(){n.$element.trigger("shown.bs."+n.type)};t.support.transition&&this.$tip.hasClass("fade")?r.one(t.support.transition.end,y).emulateTransitionEnd(150):y()}},e.prototype.applyPlacement=function(e,n){var r,a=this.tip(),i=a[0].offsetWidth,o=a[0].offsetHeight,l=parseInt(a.css("margin-top"),10),s=parseInt(a.css("margin-left"),10);isNaN(l)&&(l=0),isNaN(s)&&(s=0),e.top=e.top+l,e.left=e.left+s,t.offset.setOffset(a[0],t.extend({using:function(t){a.css({top:Math.round(t.top),left:Math.round(t.left)})}},e),0),a.addClass("in");var u=a[0].offsetWidth,c=a[0].offsetHeight;if("top"==n&&c!=o&&(r=!0,e.top=e.top+o-c),/bottom|top/.test(n)){var d=0;e.left<0&&(d=-2*e.left,e.left=0,a.offset(e),u=a[0].offsetWidth,c=a[0].offsetHeight),this.replaceArrow(d-i+u,u,"left")}else this.replaceArrow(c-o,c,"top");r&&a.offset(e)},e.prototype.replaceArrow=function(t,e,n){this.arrow().css(n,t?50*(1-t/e)+"%":"")},e.prototype.setContent=function(){var t=this.tip(),e=this.getTitle();t.find(".tooltip-inner")[this.options.html?"html":"text"](e),t.removeClass("fade in top bottom left right")},e.prototype.hide=function(){function e(){"in"!=n.hoverState&&r.detach(),n.$element.trigger("hidden.bs."+n.type)}var n=this,r=this.tip(),a=t.Event("hide.bs."+this.type);return this.$element.trigger(a),a.isDefaultPrevented()?void 0:(r.removeClass("in"),t.support.transition&&this.$tip.hasClass("fade")?r.one(t.support.transition.end,e).emulateTransitionEnd(150):e(),this.hoverState=null,this)},e.prototype.fixTitle=function(){var t=this.$element;(t.attr("title")||"string"!=typeof t.attr("data-original-title"))&&t.attr("data-original-title",t.attr("title")||"").attr("title","")},e.prototype.hasContent=function(){return this.getTitle()},e.prototype.getPosition=function(){var e=this.$element[0];return t.extend({},"function"==typeof e.getBoundingClientRect?e.getBoundingClientRect():{width:e.offsetWidth,height:e.offsetHeight},this.$element.offset())},e.prototype.getCalculatedOffset=function(t,e,n,r){return"bottom"==t?{top:e.top+e.height,left:e.left+e.width/2-n/2}:"top"==t?{top:e.top-r,left:e.left+e.width/2-n/2}:"left"==t?{top:e.top+e.height/2-r/2,left:e.left-n}:{top:e.top+e.height/2-r/2,left:e.left+e.width}},e.prototype.getTitle=function(){var t,e=this.$element,n=this.options;return t=e.attr("data-original-title")||("function"==typeof n.title?n.title.call(e[0]):n.title)},e.prototype.tip=function(){return this.$tip=this.$tip||t(this.options.template)},e.prototype.arrow=function(){return this.$arrow=this.$arrow||this.tip().find(".tooltip-arrow")},e.prototype.validate=function(){this.$element[0].parentNode||(this.hide(),this.$element=null,this.options=null)},e.prototype.enable=function(){this.enabled=!0},e.prototype.disable=function(){this.enabled=!1},e.prototype.toggleEnabled=function(){this.enabled=!this.enabled},e.prototype.toggle=function(e){var n=e?t(e.currentTarget)[this.type](this.getDelegateOptions()).data("bs."+this.type):this;n.tip().hasClass("in")?n.leave(n):n.enter(n)},e.prototype.destroy=function(){clearTimeout(this.timeout),this.hide().$element.off("."+this.type).removeData("bs."+this.type)};var n=t.fn.tooltip;t.fn.tooltip=function(n){return this.each(function(){var r=t(this),a=r.data("bs.tooltip"),i="object"==typeof n&&n;(a||"destroy"!=n)&&(a||r.data("bs.tooltip",a=new e(this,i)),"string"==typeof n&&a[n]())})},t.fn.tooltip.Constructor=e,t.fn.tooltip.noConflict=function(){return t.fn.tooltip=n,this}}(jQuery),+function(t){"use strict";var e=function(e,n){this.$element=t(e),this.$indicators=this.$element.find(".carousel-indicators"),this.options=n,this.paused=this.sliding=this.interval=this.$active=this.$items=null,"hover"==this.options.pause&&this.$element.on("mouseenter",t.proxy(this.pause,this)).on("mouseleave",t.proxy(this.cycle,this))};e.DEFAULTS={interval:5e3,pause:"hover",wrap:!0},e.prototype.cycle=function(e){return e||(this.paused=!1),this.interval&&clearInterval(this.interval),this.options.interval&&!this.paused&&(this.interval=setInterval(t.proxy(this.next,this),this.options.interval)),this},e.prototype.getActiveIndex=function(){return this.$active=this.$element.find(".item.active"),this.$items=this.$active.parent().children(),this.$items.index(this.$active)},e.prototype.to=function(e){var n=this,r=this.getActiveIndex();return e>this.$items.length-1||0>e?void 0:this.sliding?this.$element.one("slid.bs.carousel",function(){n.to(e)}):r==e?this.pause().cycle():this.slide(e>r?"next":"prev",t(this.$items[e]))},e.prototype.pause=function(e){return e||(this.paused=!0),this.$element.find(".next, .prev").length&&t.support.transition&&(this.$element.trigger(t.support.transition.end),this.cycle(!0)),this.interval=clearInterval(this.interval),this},e.prototype.next=function(){return this.sliding?void 0:this.slide("next")},e.prototype.prev=function(){return this.sliding?void 0:this.slide("prev")},e.prototype.slide=function(e,n){var r=this.$element.find(".item.active"),a=n||r[e](),i=this.interval,o="next"==e?"left":"right",l="next"==e?"first":"last",s=this;if(!a.length){if(!this.options.wrap)return;a=this.$element.find(".item")[l]()}if(a.hasClass("active"))return this.sliding=!1;var u=t.Event("slide.bs.carousel",{relatedTarget:a[0],direction:o});return this.$element.trigger(u),u.isDefaultPrevented()?void 0:(this.sliding=!0,i&&this.pause(),this.$indicators.length&&(this.$indicators.find(".active").removeClass("active"),this.$element.one("slid.bs.carousel",function(){var e=t(s.$indicators.children()[s.getActiveIndex()]);e&&e.addClass("active")})),t.support.transition&&this.$element.hasClass("slide")?(a.addClass(e),a[0].offsetWidth,r.addClass(o),a.addClass(o),r.one(t.support.transition.end,function(){a.removeClass([e,o].join(" ")).addClass("active"),r.removeClass(["active",o].join(" ")),s.sliding=!1,setTimeout(function(){s.$element.trigger("slid.bs.carousel")},0)}).emulateTransitionEnd(1e3*r.css("transition-duration").slice(0,-1))):(r.removeClass("active"),a.addClass("active"),this.sliding=!1,this.$element.trigger("slid.bs.carousel")),i&&this.cycle(),this)};var n=t.fn.carousel;t.fn.carousel=function(n){return this.each(function(){var r=t(this),a=r.data("bs.carousel"),i=t.extend({},e.DEFAULTS,r.data(),"object"==typeof n&&n),o="string"==typeof n?n:i.slide;a||r.data("bs.carousel",a=new e(this,i)),"number"==typeof n?a.to(n):o?a[o]():i.interval&&a.pause().cycle()})},t.fn.carousel.Constructor=e,t.fn.carousel.noConflict=function(){return t.fn.carousel=n,this},t(document).on("click.bs.carousel.data-api","[data-slide], [data-slide-to]",function(e){var n=t(this),r,a=t(n.attr("data-target")||(r=n.attr("href"))&&r.replace(/.*(?=#[^\s]+$)/,"")),i=t.extend({},a.data(),n.data()),o=n.attr("data-slide-to");o&&(i.interval=!1),a.carousel(i),(o=n.attr("data-slide-to"))&&a.data("bs.carousel").to(o),e.preventDefault()}),t(window).on("load",function(){t('[data-ride="carousel"]').each(function(){var e=t(this);e.carousel(e.data())})})}(jQuery),+function(t){"use strict";var e=function(n,r){this.$element=t(n),this.options=t.extend({},e.DEFAULTS,r),this.transitioning=null,this.options.parent&&(this.$parent=t(this.options.parent)),this.options.toggle&&this.toggle()};e.DEFAULTS={toggle:!0},e.prototype.dimension=function(){var t=this.$element.hasClass("width");return t?"width":"height"},e.prototype.show=function(){if(!this.transitioning&&!this.$element.hasClass("in")){var e=t.Event("show.bs.collapse");if(this.$element.trigger(e),!e.isDefaultPrevented()){var n=this.$parent&&this.$parent.find("> .panel > .in");if(n&&n.length){var r=n.data("bs.collapse");if(r&&r.transitioning)return;n.collapse("hide"),r||n.data("bs.collapse",null)}var a=this.dimension();this.$element.removeClass("collapse").addClass("collapsing")[a](0),this.transitioning=1;var i=function(){this.$element.removeClass("collapsing").addClass("collapse in")[a]("auto"),this.transitioning=0,this.$element.trigger("shown.bs.collapse")};if(!t.support.transition)return i.call(this);var o=t.camelCase(["scroll",a].join("-"));this.$element.one(t.support.transition.end,t.proxy(i,this)).emulateTransitionEnd(350)[a](this.$element[0][o])}}},e.prototype.hide=function(){if(!this.transitioning&&this.$element.hasClass("in")){var e=t.Event("hide.bs.collapse");if(this.$element.trigger(e),!e.isDefaultPrevented()){var n=this.dimension();this.$element[n](this.$element[n]())[0].offsetHeight,this.$element.addClass("collapsing").removeClass("collapse").removeClass("in"),this.transitioning=1;var r=function(){this.transitioning=0,this.$element.trigger("hidden.bs.collapse").removeClass("collapsing").addClass("collapse")};return t.support.transition?void this.$element[n](0).one(t.support.transition.end,t.proxy(r,this)).emulateTransitionEnd(350):r.call(this)}}},e.prototype.toggle=function(){this[this.$element.hasClass("in")?"hide":"show"]()};var n=t.fn.collapse;t.fn.collapse=function(n){return this.each(function(){var r=t(this),a=r.data("bs.collapse"),i=t.extend({},e.DEFAULTS,r.data(),"object"==typeof n&&n);!a&&i.toggle&&"show"==n&&(n=!n),a||r.data("bs.collapse",a=new e(this,i)),"string"==typeof n&&a[n]()})},t.fn.collapse.Constructor=e,t.fn.collapse.noConflict=function(){return t.fn.collapse=n,this},t(document).on("click.bs.collapse.data-api","[data-toggle=collapse]",function(e){var n=t(this),r,a=n.attr("data-target")||e.preventDefault()||(r=n.attr("href"))&&r.replace(/.*(?=#[^\s]+$)/,""),i=t(a),o=i.data("bs.collapse"),l=o?"toggle":n.data(),s=n.attr("data-parent"),u=s&&t(s);o&&o.transitioning||(u&&u.find('[data-toggle=collapse][data-parent="'+s+'"]').not(n).addClass("collapsed"),n[i.hasClass("in")?"addClass":"removeClass"]("collapsed")),i.collapse(l)})}(jQuery),+function(t){"use strict";var e=function(e,n){this.options=n,this.$element=t(e),this.$backdrop=this.isShown=null,this.options.remote&&this.$element.find(".modal-content").load(this.options.remote,t.proxy(function(){this.$element.trigger("loaded.bs.modal")},this))};e.DEFAULTS={backdrop:!0,keyboard:!0,show:!0},e.prototype.toggle=function(t){return this[this.isShown?"hide":"show"](t)},e.prototype.show=function(e){var n=this,r=t.Event("show.bs.modal",{relatedTarget:e});this.$element.trigger(r),this.isShown||r.isDefaultPrevented()||(this.isShown=!0,this.escape(),this.$element.on("click.dismiss.bs.modal",'[data-dismiss="modal"]',t.proxy(this.hide,this)),this.backdrop(function(){var r=t.support.transition&&n.$element.hasClass("fade");n.$element.parent().length||n.$element.appendTo(document.body),n.$element.show().scrollTop(0),r&&n.$element[0].offsetWidth,n.$element.addClass("in").attr("aria-hidden",!1),n.enforceFocus();var a=t.Event("shown.bs.modal",{relatedTarget:e});r?n.$element.find(".modal-dialog").one(t.support.transition.end,function(){n.$element.focus().trigger(a)}).emulateTransitionEnd(300):n.$element.focus().trigger(a)}))},e.prototype.hide=function(e){e&&e.preventDefault(),e=t.Event("hide.bs.modal"),this.$element.trigger(e),this.isShown&&!e.isDefaultPrevented()&&(this.isShown=!1,this.escape(),t(document).off("focusin.bs.modal"),this.$element.removeClass("in").attr("aria-hidden",!0).off("click.dismiss.bs.modal"),t.support.transition&&this.$element.hasClass("fade")?this.$element.one(t.support.transition.end,t.proxy(this.hideModal,this)).emulateTransitionEnd(300):this.hideModal())},e.prototype.enforceFocus=function(){t(document).off("focusin.bs.modal").on("focusin.bs.modal",t.proxy(function(t){this.$element[0]===t.target||this.$element.has(t.target).length||this.$element.focus()},this))},e.prototype.escape=function(){this.isShown&&this.options.keyboard?this.$element.on("keyup.dismiss.bs.modal",t.proxy(function(t){27==t.which&&this.hide()},this)):this.isShown||this.$element.off("keyup.dismiss.bs.modal")},e.prototype.hideModal=function(){var t=this;this.$element.hide(),this.backdrop(function(){t.removeBackdrop(),t.$element.trigger("hidden.bs.modal")})},e.prototype.removeBackdrop=function(){this.$backdrop&&this.$backdrop.remove(),this.$backdrop=null},e.prototype.backdrop=function(e){var n=this.$element.hasClass("fade")?"fade":"";if(this.isShown&&this.options.backdrop){var r=t.support.transition&&n;if(this.$backdrop=t('<div class="modal-backdrop '+n+'" />').appendTo(document.body),this.$element.on("click.dismiss.bs.modal",t.proxy(function(t){t.target===t.currentTarget&&("static"==this.options.backdrop?this.$element[0].focus.call(this.$element[0]):this.hide.call(this))},this)),r&&this.$backdrop[0].offsetWidth,this.$backdrop.addClass("in"),!e)return;r?this.$backdrop.one(t.support.transition.end,e).emulateTransitionEnd(150):e()}else!this.isShown&&this.$backdrop?(this.$backdrop.removeClass("in"),t.support.transition&&this.$element.hasClass("fade")?this.$backdrop.one(t.support.transition.end,e).emulateTransitionEnd(150):e()):e&&e()};var n=t.fn.modal;t.fn.modal=function(n,r){return this.each(function(){var a=t(this),i=a.data("bs.modal"),o=t.extend({},e.DEFAULTS,a.data(),"object"==typeof n&&n);i||a.data("bs.modal",i=new e(this,o)),"string"==typeof n?i[n](r):o.show&&i.show(r)})},t.fn.modal.Constructor=e,t.fn.modal.noConflict=function(){return t.fn.modal=n,this},t(document).on("click.bs.modal.data-api",'[data-toggle="modal"]',function(e){var n=t(this),r=n.attr("href"),a=t(n.attr("data-target")||r&&r.replace(/.*(?=#[^\s]+$)/,"")),i=a.data("bs.modal")?"toggle":t.extend({remote:!/#/.test(r)&&r},a.data(),n.data());n.is("a")&&e.preventDefault(),a.modal(i,this).one("hide",function(){n.is(":visible")&&n.focus()})}),t(document).on("show.bs.modal",".modal",function(){t(document.body).addClass("modal-open")}).on("hidden.bs.modal",".modal",function(){t(document.body).removeClass("modal-open")})}(jQuery),+function(t){"use strict";function e(e){t(r).remove(),t(a).each(function(){var r=n(t(this)),a={relatedTarget:this};r.hasClass("open")&&(r.trigger(e=t.Event("hide.bs.dropdown",a)),e.isDefaultPrevented()||r.removeClass("open").trigger("hidden.bs.dropdown",a))})}function n(e){var n=e.attr("data-target");n||(n=e.attr("href"),n=n&&/#[A-Za-z]/.test(n)&&n.replace(/.*(?=#[^\s]*$)/,""));var r=n&&t(n);return r&&r.length?r:e.parent()}var r=".dropdown-backdrop",a="[data-toggle=dropdown]",i=function(e){t(e).on("click.bs.dropdown",this.toggle)};i.prototype.toggle=function(r){var a=t(this);if(!a.is(".disabled, :disabled")){var i=n(a),o=i.hasClass("open");if(e(),!o){"ontouchstart"in document.documentElement&&!i.closest(".navbar-nav").length&&t('<div class="dropdown-backdrop"/>').insertAfter(t(this)).on("click",e);var l={relatedTarget:this};if(i.trigger(r=t.Event("show.bs.dropdown",l)),r.isDefaultPrevented())return;i.toggleClass("open").trigger("shown.bs.dropdown",l),a.focus()}return!1}},i.prototype.keydown=function(e){if(/(38|40|27)/.test(e.keyCode)){var r=t(this);if(e.preventDefault(),e.stopPropagation(),!r.is(".disabled, :disabled")){var i=n(r),o=i.hasClass("open");if(!o||o&&27==e.keyCode)return 27==e.which&&i.find(a).focus(),r.click();var l=" li:not(.divider):visible a",s=i.find("[role=menu]"+l+", [role=listbox]"+l);if(s.length){var u=s.index(s.filter(":focus"));38==e.keyCode&&u>0&&u--,40==e.keyCode&&u<s.length-1&&u++,~u||(u=0),s.eq(u).focus()}}}};var o=t.fn.dropdown;t.fn.dropdown=function(e){return this.each(function(){var n=t(this),r=n.data("bs.dropdown");r||n.data("bs.dropdown",r=new i(this)),"string"==typeof e&&r[e].call(n)})},t.fn.dropdown.Constructor=i,t.fn.dropdown.noConflict=function(){return t.fn.dropdown=o,this},t(document).on("click.bs.dropdown.data-api",e).on("click.bs.dropdown.data-api",".dropdown form",function(t){t.stopPropagation()}).on("click.bs.dropdown.data-api",a,i.prototype.toggle).on("keydown.bs.dropdown.data-api",a+", [role=menu], [role=listbox]",i.prototype.keydown)}(jQuery),+function(t){"use strict";var e=function(n,r){this.options=t.extend({},e.DEFAULTS,r),this.$window=t(window).on("scroll.bs.affix.data-api",t.proxy(this.checkPosition,this)).on("click.bs.affix.data-api",t.proxy(this.checkPositionWithEventLoop,this)),this.$element=t(n),this.affixed=this.unpin=this.pinnedOffset=null,this.checkPosition()};e.RESET="affix affix-top affix-bottom",e.DEFAULTS={offset:0},e.prototype.getPinnedOffset=function(){if(this.pinnedOffset)return this.pinnedOffset;this.$element.removeClass(e.RESET).addClass("affix");var t=this.$window.scrollTop(),n=this.$element.offset();return this.pinnedOffset=n.top-t},e.prototype.checkPositionWithEventLoop=function(){setTimeout(t.proxy(this.checkPosition,this),1)},e.prototype.checkPosition=function(){if(this.$element.is(":visible")){var n=t(document).height(),r=this.$window.scrollTop(),a=this.$element.offset(),i=this.options.offset,o=i.top,l=i.bottom;"top"==this.affixed&&(a.top+=r),"object"!=typeof i&&(l=o=i),"function"==typeof o&&(o=i.top(this.$element)),"function"==typeof l&&(l=i.bottom(this.$element));var s=null!=this.unpin&&r+this.unpin<=a.top?!1:null!=l&&a.top+this.$element.height()>=n-l?"bottom":null!=o&&o>=r?"top":!1;if(this.affixed!==s){this.unpin&&this.$element.css("top","");var u="affix"+(s?"-"+s:""),c=t.Event(u+".bs.affix");this.$element.trigger(c),c.isDefaultPrevented()||(this.affixed=s,this.unpin="bottom"==s?this.getPinnedOffset():null,this.$element.removeClass(e.RESET).addClass(u).trigger(t.Event(u.replace("affix","affixed"))),"bottom"==s&&this.$element.offset({top:n-l-this.$element.height()}))}}};var n=t.fn.affix;t.fn.affix=function(n){return this.each(function(){var r=t(this),a=r.data("bs.affix"),i="object"==typeof n&&n;a||r.data("bs.affix",a=new e(this,i)),"string"==typeof n&&a[n]()})},t.fn.affix.Constructor=e,t.fn.affix.noConflict=function(){return t.fn.affix=n,this},t(window).on("load",function(){t('[data-spy="affix"]').each(function(){var e=t(this),n=e.data();n.offset=n.offset||{},n.offsetBottom&&(n.offset.bottom=n.offsetBottom),n.offsetTop&&(n.offset.top=n.offsetTop),e.affix(n)})})}(jQuery),function(){var t=[].indexOf||function(t){for(var e=0,n=this.length;n>e;e++)if(e in this&&this[e]===t)return e;return-1},e=[].slice;!function(t,e){return"function"==typeof define&&define.amd?define("waypoints",["jquery"],function(n){return e(n,t)}):e(t.jQuery,t)}(this,function(n,r){var a,i,o,l,s,u,c,d,p,f,h,g,v,y,m,b;return a=n(r),d=t.call(r,"ontouchstart")>=0,l={horizontal:{},vertical:{}},s=1,c={},u="waypoints-context-id",h="resize.waypoints",g="scroll.waypoints",v=1,y="waypoints-waypoint-ids",m="waypoint",b="waypoints",i=function(){function t(t){var e=this;this.$element=t,this.element=t[0],this.didResize=!1,this.didScroll=!1,this.id="context"+s++,this.oldScroll={x:t.scrollLeft(),y:t.scrollTop()},this.waypoints={horizontal:{},vertical:{}},t.data(u,this.id),c[this.id]=this,t.bind(g,function(){var t;return e.didScroll||d?void 0:(e.didScroll=!0,t=function(){return e.doScroll(),e.didScroll=!1},r.setTimeout(t,n[b].settings.scrollThrottle))}),t.bind(h,function(){var t;return e.didResize?void 0:(e.didResize=!0,t=function(){return n[b]("refresh"),e.didResize=!1},r.setTimeout(t,n[b].settings.resizeThrottle))})}return t.prototype.doScroll=function(){var t,e=this;return t={horizontal:{newScroll:this.$element.scrollLeft(),oldScroll:this.oldScroll.x,forward:"right",backward:"left"},vertical:{newScroll:this.$element.scrollTop(),oldScroll:this.oldScroll.y,forward:"down",backward:"up"}},!d||t.vertical.oldScroll&&t.vertical.newScroll||n[b]("refresh"),n.each(t,function(t,r){var a,i,o;return o=[],i=r.newScroll>r.oldScroll,a=i?r.forward:r.backward,n.each(e.waypoints[t],function(t,e){var n,a;return r.oldScroll<(n=e.offset)&&n<=r.newScroll?o.push(e):r.newScroll<(a=e.offset)&&a<=r.oldScroll?o.push(e):void 0}),o.sort(function(t,e){return t.offset-e.offset}),i||o.reverse(),n.each(o,function(t,e){return e.options.continuous||t===o.length-1?e.trigger([a]):void 0})}),this.oldScroll={x:t.horizontal.newScroll,y:t.vertical.newScroll}},t.prototype.refresh=function(){var t,e,r,a=this;return r=n.isWindow(this.element),e=this.$element.offset(),this.doScroll(),t={horizontal:{contextOffset:r?0:e.left,contextScroll:r?0:this.oldScroll.x,contextDimension:this.$element.width(),oldScroll:this.oldScroll.x,forward:"right",backward:"left",offsetProp:"left"},vertical:{contextOffset:r?0:e.top,contextScroll:r?0:this.oldScroll.y,contextDimension:r?n[b]("viewportHeight"):this.$element.height(),oldScroll:this.oldScroll.y,forward:"down",backward:"up",offsetProp:"top"}},n.each(t,function(t,e){return n.each(a.waypoints[t],function(t,r){var a,i,o,l,s;return a=r.options.offset,o=r.offset,i=n.isWindow(r.element)?0:r.$element.offset()[e.offsetProp],n.isFunction(a)?a=a.apply(r.element):"string"==typeof a&&(a=parseFloat(a),r.options.offset.indexOf("%")>-1&&(a=Math.ceil(e.contextDimension*a/100))),r.offset=i-e.contextOffset+e.contextScroll-a,r.options.onlyOnScroll&&null!=o||!r.enabled?void 0:null!==o&&o<(l=e.oldScroll)&&l<=r.offset?r.trigger([e.backward]):null!==o&&o>(s=e.oldScroll)&&s>=r.offset?r.trigger([e.forward]):null===o&&e.oldScroll>=r.offset?r.trigger([e.forward]):void 0})})},t.prototype.checkEmpty=function(){return n.isEmptyObject(this.waypoints.horizontal)&&n.isEmptyObject(this.waypoints.vertical)?(this.$element.unbind([h,g].join(" ")),delete c[this.id]):void 0},t}(),o=function(){function t(t,e,r){var a,i;r=n.extend({},n.fn[m].defaults,r),"bottom-in-view"===r.offset&&(r.offset=function(){var t;return t=n[b]("viewportHeight"),n.isWindow(e.element)||(t=e.$element.height()),t-n(this).outerHeight()}),this.$element=t,this.element=t[0],this.axis=r.horizontal?"horizontal":"vertical",this.callback=r.handler,this.context=e,this.enabled=r.enabled,this.id="waypoints"+v++,this.offset=null,this.options=r,e.waypoints[this.axis][this.id]=this,l[this.axis][this.id]=this,a=null!=(i=t.data(y))?i:[],a.push(this.id),t.data(y,a)}return t.prototype.trigger=function(t){return this.enabled?(null!=this.callback&&this.callback.apply(this.element,t),this.options.triggerOnce?this.destroy():void 0):void 0},t.prototype.disable=function(){return this.enabled=!1},t.prototype.enable=function(){return this.context.refresh(),this.enabled=!0},t.prototype.destroy=function(){return delete l[this.axis][this.id],delete this.context.waypoints[this.axis][this.id],this.context.checkEmpty()
},t.getWaypointsByElement=function(t){var e,r;return(r=n(t).data(y))?(e=n.extend({},l.horizontal,l.vertical),n.map(r,function(t){return e[t]})):[]},t}(),f={init:function(t,e){var r;return null==e&&(e={}),null==(r=e.handler)&&(e.handler=t),this.each(function(){var t,r,a,l;return t=n(this),a=null!=(l=e.context)?l:n.fn[m].defaults.context,n.isWindow(a)||(a=t.closest(a)),a=n(a),r=c[a.data(u)],r||(r=new i(a)),new o(t,r,e)}),n[b]("refresh"),this},disable:function(){return f._invoke(this,"disable")},enable:function(){return f._invoke(this,"enable")},destroy:function(){return f._invoke(this,"destroy")},prev:function(t,e){return f._traverse.call(this,t,e,function(t,e,n){return e>0?t.push(n[e-1]):void 0})},next:function(t,e){return f._traverse.call(this,t,e,function(t,e,n){return e<n.length-1?t.push(n[e+1]):void 0})},_traverse:function(t,e,a){var i,o;return null==t&&(t="vertical"),null==e&&(e=r),o=p.aggregate(e),i=[],this.each(function(){var e;return e=n.inArray(this,o[t]),a(i,e,o[t])}),this.pushStack(i)},_invoke:function(t,e){return t.each(function(){var t;return t=o.getWaypointsByElement(this),n.each(t,function(t,n){return n[e](),!0})}),this}},n.fn[m]=function(){var t,r;return r=arguments[0],t=2<=arguments.length?e.call(arguments,1):[],f[r]?f[r].apply(this,t):n.isFunction(r)?f.init.apply(this,arguments):n.isPlainObject(r)?f.init.apply(this,[null,r]):n.error(r?"The "+r+" method does not exist in jQuery Waypoints.":"jQuery Waypoints needs a callback function or handler option.")},n.fn[m].defaults={context:r,continuous:!0,enabled:!0,horizontal:!1,offset:0,triggerOnce:!1},p={refresh:function(){return n.each(c,function(t,e){return e.refresh()})},viewportHeight:function(){var t;return null!=(t=r.innerHeight)?t:a.height()},aggregate:function(t){var e,r,a;return e=l,t&&(e=null!=(a=c[n(t).data(u)])?a.waypoints:void 0),e?(r={horizontal:[],vertical:[]},n.each(r,function(t,a){return n.each(e[t],function(t,e){return a.push(e)}),a.sort(function(t,e){return t.offset-e.offset}),r[t]=n.map(a,function(t){return t.element}),r[t]=n.unique(r[t])}),r):[]},above:function(t){return null==t&&(t=r),p._filter(t,"vertical",function(t,e){return e.offset<=t.oldScroll.y})},below:function(t){return null==t&&(t=r),p._filter(t,"vertical",function(t,e){return e.offset>t.oldScroll.y})},left:function(t){return null==t&&(t=r),p._filter(t,"horizontal",function(t,e){return e.offset<=t.oldScroll.x})},right:function(t){return null==t&&(t=r),p._filter(t,"horizontal",function(t,e){return e.offset>t.oldScroll.x})},enable:function(){return p._invoke("enable")},disable:function(){return p._invoke("disable")},destroy:function(){return p._invoke("destroy")},extendFn:function(t,e){return f[t]=e},_invoke:function(t){var e;return e=n.extend({},l.vertical,l.horizontal),n.each(e,function(e,n){return n[t](),!0})},_filter:function(t,e,r){var a,i;return(a=c[n(t).data(u)])?(i=[],n.each(a.waypoints[e],function(t,e){return r(a,e)?i.push(e):void 0}),i.sort(function(t,e){return t.offset-e.offset}),n.map(i,function(t){return t.element})):[]}},n[b]=function(){var t,n;return n=arguments[0],t=2<=arguments.length?e.call(arguments,1):[],p[n]?p[n].apply(null,t):p.aggregate.call(null,n)},n[b].settings={resizeThrottle:100,scrollThrottle:30},a.load(function(){return n[b]("refresh")})})}.call(this),function(){!function(t,e){return"function"==typeof define&&define.amd?define(["jquery","waypoints"],e):e(t.jQuery)}(this,function(t){var e,n;return e={wrapper:'<div class="sticky-wrapper" />',stuckClass:"stuck"},n=function(t,e){return t.wrap(e.wrapper),t.parent()},t.waypoints("extendFn","sticky",function(r){var a,i,o;return i=t.extend({},t.fn.waypoint.defaults,e,r),a=n(this,i),o=i.handler,i.handler=function(e){var n,r;return n=t(this).children(":first"),r="down"===e||"right"===e,n.toggleClass(i.stuckClass,r),a.height(r?n.outerHeight():""),null!=o?o.call(this,e):void 0},a.waypoint(i),this.data("stuckClass",i.stuckClass)}),t.waypoints("extendFn","unsticky",function(){return this.parent().waypoint("destroy"),this.unwrap(),this.removeClass(this.data("stuckClass"))})})}.call(this);var china=[{Year:1985,type:"rural",value:814900,color:"#16a085"},{Year:1986,type:"rural",value:820396,color:"#16a085"},{Year:1987,type:"rural",value:825892,color:"#16a085"},{Year:1988,type:"rural",value:831387,color:"#16a085"},{Year:1989,type:"rural",value:836883,color:"#16a085"},{Year:1990,type:"rural",value:842379,color:"#16a085"},{Year:1991,type:"rural",value:841527,color:"#16a085"},{Year:1992,type:"rural",value:840675,color:"#16a085"},{Year:1993,type:"rural",value:839824,color:"#16a085"},{Year:1994,type:"rural",value:838972,color:"#16a085"},{Year:1995,type:"rural",value:838120,color:"#16a085"},{Year:1996,type:"rural",value:833254,color:"#16a085"},{Year:1997,type:"rural",value:828389,color:"#16a085"},{Year:1998,type:"rural",value:823523,color:"#16a085"},{Year:1999,type:"rural",value:818658,color:"#16a085"},{Year:2e3,type:"rural",value:813792,color:"#16a085"},{Year:2001,type:"rural",value:801349,color:"#16a085"},{Year:2002,type:"rural",value:788906,color:"#16a085"},{Year:2003,type:"rural",value:776462,color:"#16a085"},{Year:2004,type:"rural",value:764019,color:"#16a085"},{Year:2005,type:"rural",value:751576,color:"#16a085"},{Year:2006,type:"rural",value:737471,color:"#16a085"},{Year:2007,type:"rural",value:723365,color:"#16a085"},{Year:2008,type:"rural",value:709260,color:"#16a085"},{Year:2009,type:"rural",value:695154,color:"#16a085"},{Year:2010,type:"rural",value:681049,color:"#16a085"},{Year:1985,type:"urban",value:241679,color:"#9b59b6"},{Year:1986,type:"urban",value:253907,color:"#9b59b6"},{Year:1987,type:"urban",value:266134,color:"#9b59b6"},{Year:1988,type:"urban",value:278362,color:"#9b59b6"},{Year:1989,type:"urban",value:290589,color:"#9b59b6"},{Year:1990,type:"urban",value:302817,color:"#9b59b6"},{Year:1991,type:"urban",value:317427,color:"#9b59b6"},{Year:1992,type:"urban",value:332037,color:"#9b59b6"},{Year:1993,type:"urban",value:346646,color:"#9b59b6"},{Year:1994,type:"urban",value:361256,color:"#9b59b6"},{Year:1995,type:"urban",value:375866,color:"#9b59b6"},{Year:1996,type:"urban",value:391758,color:"#9b59b6"},{Year:1997,type:"urban",value:407650,color:"#9b59b6"},{Year:1998,type:"urban",value:423541,color:"#9b59b6"},{Year:1999,type:"urban",value:439433,color:"#9b59b6"},{Year:2e3,type:"urban",value:455325,color:"#9b59b6"},{Year:2001,type:"urban",value:475463,color:"#9b59b6"},{Year:2002,type:"urban",value:495602,color:"#9b59b6"},{Year:2003,type:"urban",value:515740,color:"#9b59b6"},{Year:2004,type:"urban",value:535879,color:"#9b59b6"},{Year:2005,type:"urban",value:556017,color:"#9b59b6"},{Year:2006,type:"urban",value:576871,color:"#9b59b6"},{Year:2007,type:"urban",value:597725,color:"#9b59b6"},{Year:2008,type:"urban",value:618578,color:"#9b59b6"},{Year:2009,type:"urban",value:639432,color:"#9b59b6"},{Year:2010,type:"urban",value:660286,color:"#9b59b6"}],india=[{Year:1985,type:"rural",color:"#16a085",value:593481},{Year:1986,type:"rural",color:"#16a085",value:604896},{Year:1987,type:"rural",color:"#16a085",value:616311},{Year:1988,type:"rural",color:"#16a085",value:627726},{Year:1989,type:"rural",color:"#16a085",value:639141},{Year:1990,type:"rural",color:"#16a085",value:650556},{Year:1991,type:"rural",color:"#16a085",value:662017},{Year:1992,type:"rural",color:"#16a085",value:673478},{Year:1993,type:"rural",color:"#16a085",value:684940},{Year:1994,type:"rural",color:"#16a085",value:696401},{Year:1995,type:"rural",color:"#16a085",value:707862},{Year:1996,type:"rural",color:"#16a085",value:718752},{Year:1997,type:"rural",color:"#16a085",value:729642},{Year:1998,type:"rural",color:"#16a085",value:740533},{Year:1999,type:"rural",color:"#16a085",value:751423},{Year:2e3,type:"rural",color:"#16a085",value:762313},{Year:2001,type:"rural",color:"#16a085",value:771201},{Year:2002,type:"rural",color:"#16a085",value:780090},{Year:2003,type:"rural",color:"#16a085",value:788978},{Year:2004,type:"rural",color:"#16a085",value:797867},{Year:2005,type:"rural",color:"#16a085",value:806755},{Year:2006,type:"rural",color:"#16a085",value:814572},{Year:2007,type:"rural",color:"#16a085",value:822389},{Year:2008,type:"rural",color:"#16a085",value:830205},{Year:2009,type:"rural",color:"#16a085",value:838022},{Year:2010,type:"rural",color:"#16a085",value:845839},{Year:1985,type:"urban",color:"#9b59b6",value:191009},{Year:1986,type:"urban",color:"#9b59b6",value:197453},{Year:1987,type:"urban",color:"#9b59b6",value:203897},{Year:1988,type:"urban",color:"#9b59b6",value:210342},{Year:1989,type:"urban",color:"#9b59b6",value:216786},{Year:1990,type:"urban",color:"#9b59b6",value:223230},{Year:1991,type:"urban",color:"#9b59b6",value:229909},{Year:1992,type:"urban",color:"#9b59b6",value:236588},{Year:1993,type:"urban",color:"#9b59b6",value:243266},{Year:1994,type:"urban",color:"#9b59b6",value:249945},{Year:1995,type:"urban",color:"#9b59b6",value:256624},{Year:1996,type:"urban",color:"#9b59b6",value:263616},{Year:1997,type:"urban",color:"#9b59b6",value:270608},{Year:1998,type:"urban",color:"#9b59b6",value:277601},{Year:1999,type:"urban",color:"#9b59b6",value:284593},{Year:2e3,type:"urban",color:"#9b59b6",value:291585},{Year:2001,type:"urban",color:"#9b59b6",value:299926},{Year:2002,type:"urban",color:"#9b59b6",value:308266},{Year:2003,type:"urban",color:"#9b59b6",value:316607},{Year:2004,type:"urban",color:"#9b59b6",value:324947},{Year:2005,type:"urban",color:"#9b59b6",value:333288},{Year:2006,type:"urban",color:"#9b59b6",value:342385},{Year:2007,type:"urban",color:"#9b59b6",value:351483},{Year:2008,type:"urban",color:"#9b59b6",value:360580},{Year:2009,type:"urban",color:"#9b59b6",value:369678},{Year:2010,type:"urban",color:"#9b59b6",value:378775}];!function(){function t(t,e){return e>t?-1:t>e?1:t>=e?0:0/0}function e(t){return null!=t&&!isNaN(t)}function n(t){return{left:function(e,n,r,a){for(arguments.length<3&&(r=0),arguments.length<4&&(a=e.length);a>r;){var i=r+a>>>1;t(e[i],n)<0?r=i+1:a=i}return r},right:function(e,n,r,a){for(arguments.length<3&&(r=0),arguments.length<4&&(a=e.length);a>r;){var i=r+a>>>1;t(e[i],n)>0?a=i:r=i+1}return r}}}function r(t){return t.length}function a(t){for(var e=1;t*e%1;)e*=10;return e}function i(t,e){try{for(var n in e)Object.defineProperty(t.prototype,n,{value:e[n],enumerable:!1})}catch(r){t.prototype=e}}function o(){}function l(t){return fl+t in this}function s(t){return t=fl+t,t in this&&delete this[t]}function u(){var t=[];return this.forEach(function(e){t.push(e)}),t}function c(){var t=0;for(var e in this)e.charCodeAt(0)===hl&&++t;return t}function d(){for(var t in this)if(t.charCodeAt(0)===hl)return!1;return!0}function p(){}function f(t,e,n){return function(){var r=n.apply(e,arguments);return r===e?t:r}}function h(t,e){if(e in t)return e;e=e.charAt(0).toUpperCase()+e.substring(1);for(var n=0,r=gl.length;r>n;++n){var a=gl[n]+e;if(a in t)return a}}function g(){}function v(){}function y(t){function e(){for(var e=n,r=-1,a=e.length,i;++r<a;)(i=e[r].on)&&i.apply(this,arguments);return t}var n=[],r=new o;return e.on=function(e,a){var i=r.get(e),o;return arguments.length<2?i&&i.on:(i&&(i.on=null,n=n.slice(0,o=n.indexOf(i)).concat(n.slice(o+1)),r.remove(e)),a&&n.push(r.set(e,{on:a})),t)},e}function m(){Go.event.preventDefault()}function b(){for(var t=Go.event,e;e=t.sourceEvent;)t=e;return t}function x(t){for(var e=new v,n=0,r=arguments.length;++n<r;)e[arguments[n]]=y(e);return e.of=function(n,r){return function(a){try{var i=a.sourceEvent=Go.event;a.target=t,Go.event=a,e[a.type].apply(n,r)}finally{Go.event=i}}},e}function _(t){return yl(t,wl),t}function w(t){return"function"==typeof t?t:function(){return ml(t,this)}}function k(t){return"function"==typeof t?t:function(){return bl(t,this)}}function z(t,e){function n(){this.removeAttribute(t)}function r(){this.removeAttributeNS(t.space,t.local)}function a(){this.setAttribute(t,e)}function i(){this.setAttributeNS(t.space,t.local,e)}function o(){var n=e.apply(this,arguments);null==n?this.removeAttribute(t):this.setAttribute(t,n)}function l(){var n=e.apply(this,arguments);null==n?this.removeAttributeNS(t.space,t.local):this.setAttributeNS(t.space,t.local,n)}return t=Go.ns.qualify(t),null==e?t.local?r:n:"function"==typeof e?t.local?l:o:t.local?i:a}function S(t){return t.trim().replace(/\s+/g," ")}function M(t){return new RegExp("(?:^|\\s+)"+Go.requote(t)+"(?:\\s+|$)","g")}function E(t){return t.trim().split(/^|\s+/)}function C(t,e){function n(){for(var n=-1;++n<a;)t[n](this,e)}function r(){for(var n=-1,r=e.apply(this,arguments);++n<a;)t[n](this,r)}t=E(t).map(A);var a=t.length;return"function"==typeof e?r:n}function A(t){var e=M(t);return function(n,r){if(a=n.classList)return r?a.add(t):a.remove(t);var a=n.getAttribute("class")||"";r?(e.lastIndex=0,e.test(a)||n.setAttribute("class",S(a+" "+t))):n.setAttribute("class",S(a.replace(e," ")))}}function T(t,e,n){function r(){this.style.removeProperty(t)}function a(){this.style.setProperty(t,e,n)}function i(){var r=e.apply(this,arguments);null==r?this.style.removeProperty(t):this.style.setProperty(t,r,n)}return null==e?r:"function"==typeof e?i:a}function O(t,e){function n(){delete this[t]}function r(){this[t]=e}function a(){var n=e.apply(this,arguments);null==n?delete this[t]:this[t]=n}return null==e?n:"function"==typeof e?a:r}function B(t){return"function"==typeof t?t:(t=Go.ns.qualify(t)).local?function(){return this.ownerDocument.createElementNS(t.space,t.local)}:function(){return this.ownerDocument.createElementNS(this.namespaceURI,t)}}function N(t){return{__data__:t}}function D(t){return function(){return _l(this,t)}}function j(e){return arguments.length||(e=t),function(t,n){return t&&n?e(t.__data__,n.__data__):!t-!n}}function P(t,e){for(var n=0,r=t.length;r>n;n++)for(var a=t[n],i=0,o=a.length,l;o>i;i++)(l=a[i])&&e(l,i,n);return t}function $(t){return yl(t,zl),t}function q(t){var e,n;return function(r,a,i){var o=t[i].update,l=o.length,s;for(i!=n&&(n=i,e=0),a>=e&&(e=a+1);!(s=o[e])&&++e<l;);return s}}function H(){var t=this.__transition__;t&&++t.active}function L(t,e,n){function r(){var e=this[o];e&&(this.removeEventListener(t,e,e.$),delete this[o])}function a(){var a=s(e,tl(arguments));r.call(this),this.addEventListener(t,this[o]=a,a.$=n),a._=e}function i(){var e=new RegExp("^__on([^.]+)"+Go.requote(t)+"$"),n;for(var r in this)if(n=r.match(e)){var a=this[r];this.removeEventListener(n[1],a,a.$),delete this[r]}}var o="__on"+t,l=t.indexOf("."),s=Y;l>0&&(t=t.substring(0,l));var u=Ml.get(t);return u&&(t=u,s=F),l?e?a:r:e?g:i}function Y(t,e){return function(n){var r=Go.event;Go.event=n,e[0]=this.__data__;try{t.apply(this,e)}finally{Go.event=r}}}function F(t,e){var n=Y(t,e);return function(t){var e=this,r=t.relatedTarget;r&&(r===e||8&r.compareDocumentPosition(e))||n.call(e,t)}}function I(){var t=".dragsuppress-"+ ++Cl,e="click"+t,n=Go.select(rl).on("touchmove"+t,m).on("dragstart"+t,m).on("selectstart"+t,m);if(El){var r=nl.style,a=r[El];r[El]="none"}return function(i){function o(){n.on(e,null)}n.on(t,null),El&&(r[El]=a),i&&(n.on(e,function(){m(),o()},!0),setTimeout(o,0))}}function R(t,e){e.changedTouches&&(e=e.changedTouches[0]);var n=t.ownerSVGElement||t;if(n.createSVGPoint){var r=n.createSVGPoint();return r.x=e.clientX,r.y=e.clientY,r=r.matrixTransform(t.getScreenCTM().inverse()),[r.x,r.y]}var a=t.getBoundingClientRect();return[e.clientX-a.left-t.clientLeft,e.clientY-a.top-t.clientTop]}function U(){return Go.event.changedTouches[0].identifier}function W(){return Go.event.target}function V(){return rl}function Z(t){return t>0?1:0>t?-1:0}function X(t,e,n){return(e[0]-t[0])*(n[1]-t[1])-(e[1]-t[1])*(n[0]-t[0])}function Q(t){return t>1?0:-1>t?Al:Math.acos(t)}function J(t){return t>1?Ol:-1>t?-Ol:Math.asin(t)}function G(t){return((t=Math.exp(t))-1/t)/2}function K(t){return((t=Math.exp(t))+1/t)/2}function te(t){return((t=Math.exp(2*t))-1)/(t+1)}function ee(t){return(t=Math.sin(t/2))*t}function ne(){}function re(t,e,n){return new ae(t,e,n)}function ae(t,e,n){this.h=t,this.s=e,this.l=n}function ie(t,e,n){function r(t){return t>360?t-=360:0>t&&(t+=360),60>t?i+(o-i)*t/60:180>t?o:240>t?i+(o-i)*(240-t)/60:i}function a(t){return Math.round(255*r(t))}var i,o;return t=isNaN(t)?0:(t%=360)<0?t+360:t,e=isNaN(e)?0:0>e?0:e>1?1:e,n=0>n?0:n>1?1:n,o=.5>=n?n*(1+e):n+e-n*e,i=2*n-o,me(a(t+120),a(t),a(t-120))}function oe(t,e,n){return new le(t,e,n)}function le(t,e,n){this.h=t,this.c=e,this.l=n}function se(t,e,n){return isNaN(t)&&(t=0),isNaN(e)&&(e=0),ue(n,Math.cos(t*=Dl)*e,Math.sin(t)*e)}function ue(t,e,n){return new ce(t,e,n)}function ce(t,e,n){this.l=t,this.a=e,this.b=n}function de(t,e,n){var r=(t+16)/116,a=r+e/500,i=r-n/200;return a=fe(a)*Ul,r=fe(r)*Wl,i=fe(i)*Vl,me(ge(3.2404542*a-1.5371385*r-.4985314*i),ge(-.969266*a+1.8760108*r+.041556*i),ge(.0556434*a-.2040259*r+1.0572252*i))}function pe(t,e,n){return t>0?oe(Math.atan2(n,e)*jl,Math.sqrt(e*e+n*n),t):oe(0/0,0/0,t)}function fe(t){return t>.206893034?t*t*t:(t-4/29)/7.787037}function he(t){return t>.008856?Math.pow(t,1/3):7.787037*t+4/29}function ge(t){return Math.round(255*(.00304>=t?12.92*t:1.055*Math.pow(t,1/2.4)-.055))}function ve(t){return me(t>>16,t>>8&255,255&t)}function ye(t){return ve(t)+""}function me(t,e,n){return new be(t,e,n)}function be(t,e,n){this.r=t,this.g=e,this.b=n}function xe(t){return 16>t?"0"+Math.max(0,t).toString(16):Math.min(255,t).toString(16)}function _e(t,e,n){var r=0,a=0,i=0,o,l,s;if(o=/([a-z]+)\((.*)\)/i.exec(t))switch(l=o[2].split(","),o[1]){case"hsl":return n(parseFloat(l[0]),parseFloat(l[1])/100,parseFloat(l[2])/100);case"rgb":return e(Se(l[0]),Se(l[1]),Se(l[2]))}return(s=Ql.get(t))?e(s.r,s.g,s.b):(null==t||"#"!==t.charAt(0)||isNaN(s=parseInt(t.substring(1),16))||(4===t.length?(r=(3840&s)>>4,r=r>>4|r,a=240&s,a=a>>4|a,i=15&s,i=i<<4|i):7===t.length&&(r=(16711680&s)>>16,a=(65280&s)>>8,i=255&s)),e(r,a,i))}function we(t,e,n){var r=Math.min(t/=255,e/=255,n/=255),a=Math.max(t,e,n),i=a-r,o,l,s=(a+r)/2;return i?(l=.5>s?i/(a+r):i/(2-a-r),o=t==a?(e-n)/i+(n>e?6:0):e==a?(n-t)/i+2:(t-e)/i+4,o*=60):(o=0/0,l=s>0&&1>s?0:o),re(o,l,s)}function ke(t,e,n){t=ze(t),e=ze(e),n=ze(n);var r=he((.4124564*t+.3575761*e+.1804375*n)/Ul),a=he((.2126729*t+.7151522*e+.072175*n)/Wl),i=he((.0193339*t+.119192*e+.9503041*n)/Vl);return ue(116*a-16,500*(r-a),200*(a-i))}function ze(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function Se(t){var e=parseFloat(t);return"%"===t.charAt(t.length-1)?Math.round(2.55*e):e}function Me(t){return"function"==typeof t?t:function(){return t}}function Ee(t){return t}function Ce(t){return function(e,n,r){return 2===arguments.length&&"function"==typeof n&&(r=n,n=null),Ae(e,n,t,r)}}function Ae(t,e,n,r){function a(){var t=s.status,e;if(!t&&s.responseText||t>=200&&300>t||304===t){try{e=n.call(i,s)}catch(r){return void o.error.call(i,r)}o.load.call(i,e)}else o.error.call(i,s)}var i={},o=Go.dispatch("beforesend","progress","load","error"),l={},s=new XMLHttpRequest,u=null;return!rl.XDomainRequest||"withCredentials"in s||!/^(http(s)?:)?\/\//.test(t)||(s=new XDomainRequest),"onload"in s?s.onload=s.onerror=a:s.onreadystatechange=function(){s.readyState>3&&a()},s.onprogress=function(t){var e=Go.event;Go.event=t;try{o.progress.call(i,s)}finally{Go.event=e}},i.header=function(t,e){return t=(t+"").toLowerCase(),arguments.length<2?l[t]:(null==e?delete l[t]:l[t]=e+"",i)},i.mimeType=function(t){return arguments.length?(e=null==t?null:t+"",i):e},i.responseType=function(t){return arguments.length?(u=t,i):u},i.response=function(t){return n=t,i},["get","post"].forEach(function(t){i[t]=function(){return i.send.apply(i,[t].concat(tl(arguments)))}}),i.send=function(n,r,a){if(2===arguments.length&&"function"==typeof r&&(a=r,r=null),s.open(n,t,!0),null==e||"accept"in l||(l.accept=e+",*/*"),s.setRequestHeader)for(var c in l)s.setRequestHeader(c,l[c]);return null!=e&&s.overrideMimeType&&s.overrideMimeType(e),null!=u&&(s.responseType=u),null!=a&&i.on("error",a).on("load",function(t){a(null,t)}),o.beforesend.call(i,s),s.send(null==r?null:r),i},i.abort=function(){return s.abort(),i},Go.rebind(i,o,"on"),null==r?i:i.get(Te(r))}function Te(t){return 1===t.length?function(e,n){t(null==e?n:null)}:t}function Oe(){var t=Be(),e=Ne()-t;e>24?(isFinite(e)&&(clearTimeout(ts),ts=setTimeout(Oe,e)),Kl=0):(Kl=1,ns(Oe))}function Be(){var t=Date.now();for(es=Jl;es;)t>=es.t&&(es.f=es.c(t-es.t)),es=es.n;return t}function Ne(){for(var t,e=Jl,n=1/0;e;)e.f?e=t?t.n=e.n:Jl=e.n:(e.t<n&&(n=e.t),e=(t=e).n);return Gl=t,n}function De(t,e){return e-(t?Math.ceil(Math.log(t)/Math.LN10):1)}function je(t,e){var n=Math.pow(10,3*pl(8-e));return{scale:e>8?function(t){return t/n}:function(t){return t*n},symbol:t}}function Pe(t){var e=t.decimal,n=t.thousands,r=t.grouping,a=t.currency,i=r?function(t){for(var e=t.length,a=[],i=0,o=r[0];e>0&&o>0;)a.push(t.substring(e-=o,e+o)),o=r[i=(i+1)%r.length];return a.reverse().join(n)}:Ee;return function(t){var n=as.exec(t),r=n[1]||" ",o=n[2]||">",l=n[3]||"",s=n[4]||"",u=n[5],c=+n[6],d=n[7],p=n[8],f=n[9],h=1,g="",v="",y=!1;switch(p&&(p=+p.substring(1)),(u||"0"===r&&"="===o)&&(u=r="0",o="=",d&&(c-=Math.floor((c-1)/4))),f){case"n":d=!0,f="g";break;case"%":h=100,v="%",f="f";break;case"p":h=100,v="%",f="r";break;case"b":case"o":case"x":case"X":"#"===s&&(g="0"+f.toLowerCase());case"c":case"d":y=!0,p=0;break;case"s":h=-1,f="r"}"$"===s&&(g=a[0],v=a[1]),"r"!=f||p||(f="g"),null!=p&&("g"==f?p=Math.max(1,Math.min(21,p)):("e"==f||"f"==f)&&(p=Math.max(0,Math.min(20,p)))),f=is.get(f)||$e;var m=u&&d;return function(t){var n=v;if(y&&t%1)return"";var a=0>t||0===t&&0>1/t?(t=-t,"-"):l;if(0>h){var s=Go.formatPrefix(t,p);t=s.scale(t),n=s.symbol+v}else t*=h;t=f(t,p);var b=t.lastIndexOf("."),x=0>b?t:t.substring(0,b),_=0>b?"":e+t.substring(b+1);!u&&d&&(x=i(x));var w=g.length+x.length+_.length+(m?0:a.length),k=c>w?new Array(w=c-w+1).join(r):"";return m&&(x=i(k+x)),a+=g,t=x+_,("<"===o?a+t+k:">"===o?k+a+t:"^"===o?k.substring(0,w>>=1)+a+t+k.substring(w):a+(m?t:k+t))+n}}}function $e(t){return t+""}function qe(){this._=new Date(arguments.length>1?Date.UTC.apply(this,arguments):arguments[0])}function He(t,e,n){function r(e){var n=t(e),r=i(n,1);return r-e>e-n?n:r}function a(n){return e(n=t(new ls(n-1)),1),n}function i(t,n){return e(t=new ls(+t),n),t}function o(t,r,i){var o=a(t),l=[];if(i>1)for(;r>o;)n(o)%i||l.push(new Date(+o)),e(o,1);else for(;r>o;)l.push(new Date(+o)),e(o,1);return l}function l(t,e,n){try{ls=qe;var r=new qe;return r._=t,o(r,e,n)}finally{ls=Date}}t.floor=t,t.round=r,t.ceil=a,t.offset=i,t.range=o;var s=t.utc=Le(t);return s.floor=s,s.round=Le(r),s.ceil=Le(a),s.offset=Le(i),s.range=l,t}function Le(t){return function(e,n){try{ls=qe;var r=new qe;return r._=e,t(r,n)._}finally{ls=Date}}}function Ye(t){function e(t){function e(e){for(var n=[],a=-1,i=0,o,l,s;++a<r;)37===t.charCodeAt(a)&&(n.push(t.substring(i,a)),null!=(l=us[o=t.charAt(++a)])&&(o=t.charAt(++a)),(s=C[o])&&(o=s(e,null==l?"e"===o?" ":"0":l)),n.push(o),i=a+1);return n.push(t.substring(i,a)),n.join("")}var r=t.length;return e.parse=function(e){var r={y:1900,m:0,d:1,H:0,M:0,S:0,L:0,Z:null},a=n(r,t,e,0);if(a!=e.length)return null;"p"in r&&(r.H=r.H%12+12*r.p);var i=null!=r.Z&&ls!==qe,o=new(i?qe:ls);return"j"in r?o.setFullYear(r.y,0,r.j):"w"in r&&("W"in r||"U"in r)?(o.setFullYear(r.y,0,1),o.setFullYear(r.y,0,"W"in r?(r.w+6)%7+7*r.W-(o.getDay()+5)%7:r.w+7*r.U-(o.getDay()+6)%7)):o.setFullYear(r.y,r.m,r.d),o.setHours(r.H+Math.floor(r.Z/100),r.M+r.Z%100,r.S,r.L),i?o._:o},e.toString=function(){return t},e}function n(t,e,n,r){for(var a,i,o,l=0,s=e.length,u=n.length;s>l;){if(r>=u)return-1;if(a=e.charCodeAt(l++),37===a){if(o=e.charAt(l++),i=A[o in us?e.charAt(l++):o],!i||(r=i(t,n,r))<0)return-1}else if(a!=n.charCodeAt(r++))return-1}return r}function r(t,e,n){w.lastIndex=0;var r=w.exec(e.substring(n));return r?(t.w=k.get(r[0].toLowerCase()),n+r[0].length):-1}function a(t,e,n){x.lastIndex=0;var r=x.exec(e.substring(n));return r?(t.w=_.get(r[0].toLowerCase()),n+r[0].length):-1}function i(t,e,n){M.lastIndex=0;var r=M.exec(e.substring(n));return r?(t.m=E.get(r[0].toLowerCase()),n+r[0].length):-1}function o(t,e,n){z.lastIndex=0;var r=z.exec(e.substring(n));return r?(t.m=S.get(r[0].toLowerCase()),n+r[0].length):-1}function l(t,e,r){return n(t,C.c.toString(),e,r)}function s(t,e,r){return n(t,C.x.toString(),e,r)}function u(t,e,r){return n(t,C.X.toString(),e,r)}function c(t,e,n){var r=b.get(e.substring(n,n+=2).toLowerCase());return null==r?-1:(t.p=r,n)}var d=t.dateTime,p=t.date,f=t.time,h=t.periods,g=t.days,v=t.shortDays,y=t.months,m=t.shortMonths;e.utc=function(t){function n(t){try{ls=qe;var e=new ls;return e._=t,r(e)}finally{ls=Date}}var r=e(t);return n.parse=function(t){try{ls=qe;var e=r.parse(t);return e&&e._}finally{ls=Date}},n.toString=r.toString,n},e.multi=e.utc.multi=sn;var b=Go.map(),x=Ie(g),_=Re(g),w=Ie(v),k=Re(v),z=Ie(y),S=Re(y),M=Ie(m),E=Re(m);h.forEach(function(t,e){b.set(t.toLowerCase(),e)});var C={a:function(t){return v[t.getDay()]},A:function(t){return g[t.getDay()]},b:function(t){return m[t.getMonth()]},B:function(t){return y[t.getMonth()]},c:e(d),d:function(t,e){return Fe(t.getDate(),e,2)},e:function(t,e){return Fe(t.getDate(),e,2)},H:function(t,e){return Fe(t.getHours(),e,2)},I:function(t,e){return Fe(t.getHours()%12||12,e,2)},j:function(t,e){return Fe(1+os.dayOfYear(t),e,3)},L:function(t,e){return Fe(t.getMilliseconds(),e,3)},m:function(t,e){return Fe(t.getMonth()+1,e,2)},M:function(t,e){return Fe(t.getMinutes(),e,2)},p:function(t){return h[+(t.getHours()>=12)]},S:function(t,e){return Fe(t.getSeconds(),e,2)},U:function(t,e){return Fe(os.sundayOfYear(t),e,2)},w:function(t){return t.getDay()},W:function(t,e){return Fe(os.mondayOfYear(t),e,2)},x:e(p),X:e(f),y:function(t,e){return Fe(t.getFullYear()%100,e,2)},Y:function(t,e){return Fe(t.getFullYear()%1e4,e,4)},Z:on,"%":function(){return"%"}},A={a:r,A:a,b:i,B:o,c:l,d:Ke,e:Ke,H:en,I:en,j:tn,L:an,m:Ge,M:nn,p:c,S:rn,U:We,w:Ue,W:Ve,x:s,X:u,y:Xe,Y:Ze,Z:Qe,"%":ln};return e}function Fe(t,e,n){var r=0>t?"-":"",a=(r?-t:t)+"",i=a.length;return r+(n>i?new Array(n-i+1).join(e)+a:a)}function Ie(t){return new RegExp("^(?:"+t.map(Go.requote).join("|")+")","i")}function Re(t){for(var e=new o,n=-1,r=t.length;++n<r;)e.set(t[n].toLowerCase(),n);return e}function Ue(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n,n+1));return r?(t.w=+r[0],n+r[0].length):-1}function We(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n));return r?(t.U=+r[0],n+r[0].length):-1}function Ve(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n));return r?(t.W=+r[0],n+r[0].length):-1}function Ze(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n,n+4));return r?(t.y=+r[0],n+r[0].length):-1}function Xe(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n,n+2));return r?(t.y=Je(+r[0]),n+r[0].length):-1}function Qe(t,e,n){return/^[+-]\d{4}$/.test(e=e.substring(n,n+5))?(t.Z=-e,n+5):-1}function Je(t){return t+(t>68?1900:2e3)}function Ge(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n,n+2));return r?(t.m=r[0]-1,n+r[0].length):-1}function Ke(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n,n+2));return r?(t.d=+r[0],n+r[0].length):-1}function tn(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n,n+3));return r?(t.j=+r[0],n+r[0].length):-1}function en(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n,n+2));return r?(t.H=+r[0],n+r[0].length):-1}function nn(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n,n+2));return r?(t.M=+r[0],n+r[0].length):-1}function rn(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n,n+2));return r?(t.S=+r[0],n+r[0].length):-1}function an(t,e,n){cs.lastIndex=0;var r=cs.exec(e.substring(n,n+3));return r?(t.L=+r[0],n+r[0].length):-1}function on(t){var e=t.getTimezoneOffset(),n=e>0?"-":"+",r=~~(pl(e)/60),a=pl(e)%60;return n+Fe(r,"0",2)+Fe(a,"0",2)}function ln(t,e,n){ds.lastIndex=0;var r=ds.exec(e.substring(n,n+1));return r?n+r[0].length:-1}function sn(t){for(var e=t.length,n=-1;++n<e;)t[n][0]=this(t[n][0]);return function(e){for(var n=0,r=t[n];!r[1](e);)r=t[++n];return r[0](e)}}function un(){}function cn(t,e,n){var r=n.s=t+e,a=r-t,i=r-a;n.t=t-i+(e-a)}function dn(t,e){t&&gs.hasOwnProperty(t.type)&&gs[t.type](t,e)}function pn(t,e,n){var r=-1,a=t.length-n,i;for(e.lineStart();++r<a;)i=t[r],e.point(i[0],i[1],i[2]);e.lineEnd()}function fn(t,e){var n=-1,r=t.length;for(e.polygonStart();++n<r;)pn(t[n],e,1);e.polygonEnd()}function hn(){function t(t,e){t*=Dl,e=e*Dl/2+Al/4;var n=t-r,o=n>=0?1:-1,l=o*n,s=Math.cos(e),u=Math.sin(e),c=i*u,d=a*s+c*Math.cos(l),p=c*o*Math.sin(l);ys.add(Math.atan2(p,d)),r=t,a=s,i=u}var e,n,r,a,i;ms.point=function(o,l){ms.point=t,r=(e=o)*Dl,a=Math.cos(l=(n=l)*Dl/2+Al/4),i=Math.sin(l)},ms.lineEnd=function(){t(e,n)}}function gn(t){var e=t[0],n=t[1],r=Math.cos(n);return[r*Math.cos(e),r*Math.sin(e),Math.sin(n)]}function vn(t,e){return t[0]*e[0]+t[1]*e[1]+t[2]*e[2]}function yn(t,e){return[t[1]*e[2]-t[2]*e[1],t[2]*e[0]-t[0]*e[2],t[0]*e[1]-t[1]*e[0]]}function mn(t,e){t[0]+=e[0],t[1]+=e[1],t[2]+=e[2]}function bn(t,e){return[t[0]*e,t[1]*e,t[2]*e]}function xn(t){var e=Math.sqrt(t[0]*t[0]+t[1]*t[1]+t[2]*t[2]);t[0]/=e,t[1]/=e,t[2]/=e}function _n(t){return[Math.atan2(t[1],t[0]),J(t[2])]}function wn(t,e){return pl(t[0]-e[0])<Bl&&pl(t[1]-e[1])<Bl}function kn(t,e){t*=Dl;var n=Math.cos(e*=Dl);zn(n*Math.cos(t),n*Math.sin(t),Math.sin(e))}function zn(t,e,n){++bs,_s+=(t-_s)/bs,ws+=(e-ws)/bs,ks+=(n-ks)/bs}function Sn(){function t(t,a){t*=Dl;var i=Math.cos(a*=Dl),o=i*Math.cos(t),l=i*Math.sin(t),s=Math.sin(a),u=Math.atan2(Math.sqrt((u=n*s-r*l)*u+(u=r*o-e*s)*u+(u=e*l-n*o)*u),e*o+n*l+r*s);xs+=u,zs+=u*(e+(e=o)),Ss+=u*(n+(n=l)),Ms+=u*(r+(r=s)),zn(e,n,r)}var e,n,r;Ts.point=function(a,i){a*=Dl;var o=Math.cos(i*=Dl);e=o*Math.cos(a),n=o*Math.sin(a),r=Math.sin(i),Ts.point=t,zn(e,n,r)}}function Mn(){Ts.point=kn}function En(){function t(t,e){t*=Dl;var n=Math.cos(e*=Dl),o=n*Math.cos(t),l=n*Math.sin(t),s=Math.sin(e),u=a*s-i*l,c=i*o-r*s,d=r*l-a*o,p=Math.sqrt(u*u+c*c+d*d),f=r*o+a*l+i*s,h=p&&-Q(f)/p,g=Math.atan2(p,f);Es+=h*u,Cs+=h*c,As+=h*d,xs+=g,zs+=g*(r+(r=o)),Ss+=g*(a+(a=l)),Ms+=g*(i+(i=s)),zn(r,a,i)}var e,n,r,a,i;Ts.point=function(o,l){e=o,n=l,Ts.point=t,o*=Dl;var s=Math.cos(l*=Dl);r=s*Math.cos(o),a=s*Math.sin(o),i=Math.sin(l),zn(r,a,i)},Ts.lineEnd=function(){t(e,n),Ts.lineEnd=Mn,Ts.point=kn}}function Cn(){return!0}function An(t,e,n,r,a){var i=[],o=[];if(t.forEach(function(t){if(!((e=t.length-1)<=0)){var e,n=t[0],r=t[e];if(wn(n,r)){a.lineStart();for(var l=0;e>l;++l)a.point((n=t[l])[0],n[1]);return void a.lineEnd()}var s=new On(n,t,null,!0),u=new On(n,null,s,!1);s.o=u,i.push(s),o.push(u),s=new On(r,t,null,!1),u=new On(r,null,s,!0),s.o=u,i.push(s),o.push(u)}}),o.sort(e),Tn(i),Tn(o),i.length){for(var l=0,s=n,u=o.length;u>l;++l)o[l].e=s=!s;for(var c=i[0],d,p;;){for(var f=c,h=!0;f.v;)if((f=f.n)===c)return;d=f.z,a.lineStart();do{if(f.v=f.o.v=!0,f.e){if(h)for(var l=0,u=d.length;u>l;++l)a.point((p=d[l])[0],p[1]);else r(f.x,f.n.x,1,a);f=f.n}else{if(h){d=f.p.z;for(var l=d.length-1;l>=0;--l)a.point((p=d[l])[0],p[1])}else r(f.x,f.p.x,-1,a);f=f.p}f=f.o,d=f.z,h=!h}while(!f.v);a.lineEnd()}}}function Tn(t){if(e=t.length){for(var e,n=0,r=t[0],a;++n<e;)r.n=a=t[n],a.p=r,r=a;r.n=a=t[0],a.p=r}}function On(t,e,n,r){this.x=t,this.z=e,this.o=n,this.e=r,this.v=!1,this.n=this.p=null}function Bn(t,e,n,r){return function(a,i){function o(e,n){var r=a(e,n);t(e=r[0],n=r[1])&&i.point(e,n)}function l(t,e){var n=a(t,e);f.point(n[0],n[1])}function s(){g.point=l,f.lineStart()}function u(){g.point=o,f.lineEnd()}function c(t,e){_.push([t,e]);var n=a(t,e);m.point(n[0],n[1])}function d(){m.lineStart(),_=[]}function p(){c(_[0][0],_[0][1]),m.lineEnd();var t=m.clean(),e=y.buffer(),n,r=e.length;if(_.pop(),x.push(_),_=null,r)if(1&t){n=e[0];var r=n.length-1,a=-1,o;if(r>0){for(b||(i.polygonStart(),b=!0),i.lineStart();++a<r;)i.point((o=n[a])[0],o[1]);i.lineEnd()}}else r>1&&2&t&&e.push(e.pop().concat(e.shift())),v.push(e.filter(Nn))}var f=e(i),h=a.invert(r[0],r[1]),g={point:o,lineStart:s,lineEnd:u,polygonStart:function(){g.point=c,g.lineStart=d,g.lineEnd=p,v=[],x=[]},polygonEnd:function(){g.point=o,g.lineStart=s,g.lineEnd=u,v=Go.merge(v);var t=Pn(h,x);v.length?(b||(i.polygonStart(),b=!0),An(v,jn,t,n,i)):t&&(b||(i.polygonStart(),b=!0),i.lineStart(),n(null,null,1,i),i.lineEnd()),b&&(i.polygonEnd(),b=!1),v=x=null
},sphere:function(){i.polygonStart(),i.lineStart(),n(null,null,1,i),i.lineEnd(),i.polygonEnd()}},v,y=Dn(),m=e(y),b=!1,x,_;return g}}function Nn(t){return t.length>1}function Dn(){var t=[],e;return{lineStart:function(){t.push(e=[])},point:function(t,n){e.push([t,n])},lineEnd:g,buffer:function(){var n=t;return t=[],e=null,n},rejoin:function(){t.length>1&&t.push(t.pop().concat(t.shift()))}}}function jn(t,e){return((t=t.x)[0]<0?t[1]-Ol-Bl:Ol-t[1])-((e=e.x)[0]<0?e[1]-Ol-Bl:Ol-e[1])}function Pn(t,e){var n=t[0],r=t[1],a=[Math.sin(n),-Math.cos(n),0],i=0,o=0;ys.reset();for(var l=0,s=e.length;s>l;++l){var u=e[l],c=u.length;if(c)for(var d=u[0],p=d[0],f=d[1]/2+Al/4,h=Math.sin(f),g=Math.cos(f),v=1;;){v===c&&(v=0),t=u[v];var y=t[0],m=t[1]/2+Al/4,b=Math.sin(m),x=Math.cos(m),_=y-p,w=_>=0?1:-1,k=w*_,z=k>Al,S=h*b;if(ys.add(Math.atan2(S*w*Math.sin(k),g*x+S*Math.cos(k))),i+=z?_+w*Tl:_,z^p>=n^y>=n){var M=yn(gn(d),gn(t));xn(M);var E=yn(a,M);xn(E);var C=(z^_>=0?-1:1)*J(E[2]);(r>C||r===C&&(M[0]||M[1]))&&(o+=z^_>=0?1:-1)}if(!v++)break;p=y,h=b,g=x,d=t}}return(-Bl>i||Bl>i&&0>ys)^1&o}function $n(t){var e=0/0,n=0/0,r=0/0,a;return{lineStart:function(){t.lineStart(),a=1},point:function(i,o){var l=i>0?Al:-Al,s=pl(i-e);pl(s-Al)<Bl?(t.point(e,n=(n+o)/2>0?Ol:-Ol),t.point(r,n),t.lineEnd(),t.lineStart(),t.point(l,n),t.point(i,n),a=0):r!==l&&s>=Al&&(pl(e-r)<Bl&&(e-=r*Bl),pl(i-l)<Bl&&(i-=l*Bl),n=qn(e,n,i,o),t.point(r,n),t.lineEnd(),t.lineStart(),t.point(l,n),a=0),t.point(e=i,n=o),r=l},lineEnd:function(){t.lineEnd(),e=n=0/0},clean:function(){return 2-a}}}function qn(t,e,n,r){var a,i,o=Math.sin(t-n);return pl(o)>Bl?Math.atan((Math.sin(e)*(i=Math.cos(r))*Math.sin(n)-Math.sin(r)*(a=Math.cos(e))*Math.sin(t))/(a*i*o)):(e+r)/2}function Hn(t,e,n,r){var a;if(null==t)a=n*Ol,r.point(-Al,a),r.point(0,a),r.point(Al,a),r.point(Al,0),r.point(Al,-a),r.point(0,-a),r.point(-Al,-a),r.point(-Al,0),r.point(-Al,a);else if(pl(t[0]-e[0])>Bl){var i=t[0]<e[0]?Al:-Al;a=n*i/2,r.point(-i,a),r.point(0,a),r.point(i,a)}else r.point(e[0],e[1])}function Ln(t){function e(t,e){return Math.cos(t)*Math.cos(e)>i}function n(t){var n,i,s,u,c;return{lineStart:function(){u=s=!1,c=1},point:function(d,p){var f=[d,p],h,g=e(d,p),v=o?g?0:a(d,p):g?a(d+(0>d?Al:-Al),p):0;if(!n&&(u=s=g)&&t.lineStart(),g!==s&&(h=r(n,f),(wn(n,h)||wn(f,h))&&(f[0]+=Bl,f[1]+=Bl,g=e(f[0],f[1]))),g!==s)c=0,g?(t.lineStart(),h=r(f,n),t.point(h[0],h[1])):(h=r(n,f),t.point(h[0],h[1]),t.lineEnd()),n=h;else if(l&&n&&o^g){var y;v&i||!(y=r(f,n,!0))||(c=0,o?(t.lineStart(),t.point(y[0][0],y[0][1]),t.point(y[1][0],y[1][1]),t.lineEnd()):(t.point(y[1][0],y[1][1]),t.lineEnd(),t.lineStart(),t.point(y[0][0],y[0][1])))}!g||n&&wn(n,f)||t.point(f[0],f[1]),n=f,s=g,i=v},lineEnd:function(){s&&t.lineEnd(),n=null},clean:function(){return c|(u&&s)<<1}}}function r(t,e,n){var r=gn(t),a=gn(e),o=[1,0,0],l=yn(r,a),s=vn(l,l),u=l[0],c=s-u*u;if(!c)return!n&&t;var d=i*s/c,p=-i*u/c,f=yn(o,l),h=bn(o,d),g=bn(l,p);mn(h,g);var v=f,y=vn(h,v),m=vn(v,v),b=y*y-m*(vn(h,h)-1);if(!(0>b)){var x=Math.sqrt(b),_=bn(v,(-y-x)/m);if(mn(_,h),_=_n(_),!n)return _;var w=t[0],k=e[0],z=t[1],S=e[1],M;w>k&&(M=w,w=k,k=M);var E=k-w,C=pl(E-Al)<Bl,A=C||Bl>E;if(!C&&z>S&&(M=z,z=S,S=M),A?C?z+S>0^_[1]<(pl(_[0]-w)<Bl?z:S):z<=_[1]&&_[1]<=S:E>Al^(w<=_[0]&&_[0]<=k)){var T=bn(v,(-y+x)/m);return mn(T,h),[_,_n(T)]}}}function a(e,n){var r=o?t:Al-t,a=0;return-r>e?a|=1:e>r&&(a|=2),-r>n?a|=4:n>r&&(a|=8),a}var i=Math.cos(t),o=i>0,l=pl(i)>Bl,s=hr(t,6*Dl);return Bn(e,n,s,o?[0,-t]:[-Al,t-Al])}function Yn(t,e,n,r){return function(a){var i=a.a,o=a.b,l=i.x,s=i.y,u=o.x,c=o.y,d=0,p=1,f=u-l,h=c-s,g;if(g=t-l,f||!(g>0)){if(g/=f,0>f){if(d>g)return;p>g&&(p=g)}else if(f>0){if(g>p)return;g>d&&(d=g)}if(g=n-l,f||!(0>g)){if(g/=f,0>f){if(g>p)return;g>d&&(d=g)}else if(f>0){if(d>g)return;p>g&&(p=g)}if(g=e-s,h||!(g>0)){if(g/=h,0>h){if(d>g)return;p>g&&(p=g)}else if(h>0){if(g>p)return;g>d&&(d=g)}if(g=r-s,h||!(0>g)){if(g/=h,0>h){if(g>p)return;g>d&&(d=g)}else if(h>0){if(d>g)return;p>g&&(p=g)}return d>0&&(a.a={x:l+d*f,y:s+d*h}),1>p&&(a.b={x:l+p*f,y:s+p*h}),a}}}}}}function Fn(t,e,n,r){function a(r,a){return pl(r[0]-t)<Bl?a>0?0:3:pl(r[0]-n)<Bl?a>0?2:1:pl(r[1]-e)<Bl?a>0?1:0:a>0?3:2}function i(t,e){return o(t.x,e.x)}function o(t,e){var n=a(t,1),r=a(e,1);return n!==r?n-r:0===n?e[1]-t[1]:1===n?t[0]-e[0]:2===n?t[1]-e[1]:e[0]-t[0]}return function(l){function s(t){for(var e=0,n=b.length,r=t[1],a=0;n>a;++a)for(var i=1,o=b[a],l=o.length,s=o[0],u;l>i;++i)u=o[i],s[1]<=r?u[1]>r&&X(s,u,t)>0&&++e:u[1]<=r&&X(s,u,t)<0&&--e,s=u;return 0!==e}function u(i,l,s,u){var c=0,d=0;if(null==i||(c=a(i,s))!==(d=a(l,s))||o(i,l)<0^s>0){do u.point(0===c||3===c?t:n,c>1?r:e);while((c=(c+s+4)%4)!==d)}else u.point(l[0],l[1])}function c(a,i){return a>=t&&n>=a&&i>=e&&r>=i}function d(t,e){c(t,e)&&l.point(t,e)}function p(){_.point=h,b&&b.push(x=[]),C=!0,E=!1,S=M=0/0}function f(){m&&(h(w,k),z&&E&&v.rejoin(),m.push(v.buffer())),_.point=d,E&&l.lineEnd()}function h(t,e){t=Math.max(-Bs,Math.min(Bs,t)),e=Math.max(-Bs,Math.min(Bs,e));var n=c(t,e);if(b&&x.push([t,e]),C)w=t,k=e,z=n,C=!1,n&&(l.lineStart(),l.point(t,e));else if(n&&E)l.point(t,e);else{var r={a:{x:S,y:M},b:{x:t,y:e}};y(r)?(E||(l.lineStart(),l.point(r.a.x,r.a.y)),l.point(r.b.x,r.b.y),n||l.lineEnd(),A=!1):n&&(l.lineStart(),l.point(t,e),A=!1)}S=t,M=e,E=n}var g=l,v=Dn(),y=Yn(t,e,n,r),m,b,x,_={point:d,lineStart:p,lineEnd:f,polygonStart:function(){l=v,m=[],b=[],A=!0},polygonEnd:function(){l=g,m=Go.merge(m);var e=s([t,r]),n=A&&e,a=m.length;(n||a)&&(l.polygonStart(),n&&(l.lineStart(),u(null,null,1,l),l.lineEnd()),a&&An(m,i,e,u,l),l.polygonEnd()),m=b=x=null}},w,k,z,S,M,E,C,A;return _}}function In(t,e){function n(n,r){return n=t(n,r),e(n[0],n[1])}return t.invert&&e.invert&&(n.invert=function(n,r){return n=e.invert(n,r),n&&t.invert(n[0],n[1])}),n}function Rn(t){var e=0,n=Al/3,r=or(t),a=r(e,n);return a.parallels=function(t){return arguments.length?r(e=t[0]*Al/180,n=t[1]*Al/180):[e/Al*180,n/Al*180]},a}function Un(t,e){function n(t,e){var n=Math.sqrt(i-2*a*Math.sin(e))/a;return[n*Math.sin(t*=a),o-n*Math.cos(t)]}var r=Math.sin(t),a=(r+Math.sin(e))/2,i=1+r*(2*a-r),o=Math.sqrt(i)/a;return n.invert=function(t,e){var n=o-e;return[Math.atan2(t,n)/a,J((i-(t*t+n*n)*a*a)/(2*a))]},n}function Wn(){function t(t,e){Ds+=a*t-r*e,r=t,a=e}var e,n,r,a;js.point=function(i,o){js.point=t,e=r=i,n=a=o},js.lineEnd=function(){t(e,n)}}function Vn(t,e){Ps>t&&(Ps=t),t>qs&&(qs=t),$s>e&&($s=e),e>Hs&&(Hs=e)}function Zn(){function t(t,e){o.push("M",t,",",e,i)}function e(t,e){o.push("M",t,",",e),l.point=n}function n(t,e){o.push("L",t,",",e)}function r(){l.point=t}function a(){o.push("Z")}var i=Xn(4.5),o=[],l={point:t,lineStart:function(){l.point=e},lineEnd:r,polygonStart:function(){l.lineEnd=a},polygonEnd:function(){l.lineEnd=r,l.point=t},pointRadius:function(t){return i=Xn(t),l},result:function(){if(o.length){var t=o.join("");return o=[],t}}};return l}function Xn(t){return"m0,"+t+"a"+t+","+t+" 0 1,1 0,"+-2*t+"a"+t+","+t+" 0 1,1 0,"+2*t+"z"}function Qn(t,e){_s+=t,ws+=e,++ks}function Jn(){function t(t,r){var a=t-e,i=r-n,o=Math.sqrt(a*a+i*i);zs+=o*(e+t)/2,Ss+=o*(n+r)/2,Ms+=o,Qn(e=t,n=r)}var e,n;Ys.point=function(r,a){Ys.point=t,Qn(e=r,n=a)}}function Gn(){Ys.point=Qn}function Kn(){function t(t,e){var n=t-r,i=e-a,o=Math.sqrt(n*n+i*i);zs+=o*(r+t)/2,Ss+=o*(a+e)/2,Ms+=o,o=a*t-r*e,Es+=o*(r+t),Cs+=o*(a+e),As+=3*o,Qn(r=t,a=e)}var e,n,r,a;Ys.point=function(i,o){Ys.point=t,Qn(e=r=i,n=a=o)},Ys.lineEnd=function(){t(e,n)}}function tr(t){function e(e,n){t.moveTo(e,n),t.arc(e,n,o,0,Tl)}function n(e,n){t.moveTo(e,n),l.point=r}function r(e,n){t.lineTo(e,n)}function a(){l.point=e}function i(){t.closePath()}var o=4.5,l={point:e,lineStart:function(){l.point=n},lineEnd:a,polygonStart:function(){l.lineEnd=i},polygonEnd:function(){l.lineEnd=a,l.point=e},pointRadius:function(t){return o=t,l},result:g};return l}function er(t){function e(t){return(l?r:n)(t)}function n(e){return ar(e,function(n,r){n=t(n,r),e.point(n[0],n[1])})}function r(e){function n(n,r){n=t(n,r),e.point(n[0],n[1])}function r(){b=0/0,z.point=i,e.lineStart()}function i(n,r){var i=gn([n,r]),o=t(n,r);a(b,x,m,_,w,k,b=o[0],x=o[1],m=n,_=i[0],w=i[1],k=i[2],l,e),e.point(b,x)}function o(){z.point=n,e.lineEnd()}function s(){r(),z.point=u,z.lineEnd=c}function u(t,e){i(d=t,p=e),f=b,h=x,g=_,v=w,y=k,z.point=i}function c(){a(b,x,m,_,w,k,f,h,d,g,v,y,l,e),z.lineEnd=o,o()}var d,p,f,h,g,v,y,m,b,x,_,w,k,z={point:n,lineStart:r,lineEnd:o,polygonStart:function(){e.polygonStart(),z.lineStart=s},polygonEnd:function(){e.polygonEnd(),z.lineStart=r}};return z}function a(e,n,r,l,s,u,c,d,p,f,h,g,v,y){var m=c-e,b=d-n,x=m*m+b*b;if(x>4*i&&v--){var _=l+f,w=s+h,k=u+g,z=Math.sqrt(_*_+w*w+k*k),S=Math.asin(k/=z),M=pl(pl(k)-1)<Bl||pl(r-p)<Bl?(r+p)/2:Math.atan2(w,_),E=t(M,S),C=E[0],A=E[1],T=C-e,O=A-n,B=b*T-m*O;(B*B/x>i||pl((m*T+b*O)/x-.5)>.3||o>l*f+s*h+u*g)&&(a(e,n,r,l,s,u,C,A,M,_/=z,w/=z,k,v,y),y.point(C,A),a(C,A,M,_,w,k,c,d,p,f,h,g,v,y))}}var i=.5,o=Math.cos(30*Dl),l=16;return e.precision=function(t){return arguments.length?(l=(i=t*t)>0&&16,e):Math.sqrt(i)},e}function nr(t){var e=er(function(e,n){return t([e*jl,n*jl])});return function(t){return lr(e(t))}}function rr(t){this.stream=t}function ar(t,e){return{point:e,sphere:function(){t.sphere()},lineStart:function(){t.lineStart()},lineEnd:function(){t.lineEnd()},polygonStart:function(){t.polygonStart()},polygonEnd:function(){t.polygonEnd()}}}function ir(t){return or(function(){return t})()}function or(t){function e(t){return t=l(t[0]*Dl,t[1]*Dl),[t[0]*u+y,m-t[1]*u]}function n(t){return t=l.invert((t[0]-y)/u,(m-t[1])/u),t&&[t[0]*jl,t[1]*jl]}function r(){l=In(o=cr(h,g,v),i);var t=i(p,f);return y=c-t[0]*u,m=d+t[1]*u,a()}function a(){return k&&(k.valid=!1,k=null),e}var i,o,l,s=er(function(t,e){return t=i(t,e),[t[0]*u+y,m-t[1]*u]}),u=150,c=480,d=250,p=0,f=0,h=0,g=0,v=0,y,m,b=Os,x=Ee,_=null,w=null,k;return e.stream=function(t){return k&&(k.valid=!1),k=lr(b(o,s(x(t)))),k.valid=!0,k},e.clipAngle=function(t){return arguments.length?(b=null==t?(_=t,Os):Ln((_=+t)*Dl),a()):_},e.clipExtent=function(t){return arguments.length?(w=t,x=t?Fn(t[0][0],t[0][1],t[1][0],t[1][1]):Ee,a()):w},e.scale=function(t){return arguments.length?(u=+t,r()):u},e.translate=function(t){return arguments.length?(c=+t[0],d=+t[1],r()):[c,d]},e.center=function(t){return arguments.length?(p=t[0]%360*Dl,f=t[1]%360*Dl,r()):[p*jl,f*jl]},e.rotate=function(t){return arguments.length?(h=t[0]%360*Dl,g=t[1]%360*Dl,v=t.length>2?t[2]%360*Dl:0,r()):[h*jl,g*jl,v*jl]},Go.rebind(e,s,"precision"),function(){return i=t.apply(this,arguments),e.invert=i.invert&&n,r()}}function lr(t){return ar(t,function(e,n){t.point(e*Dl,n*Dl)})}function sr(t,e){return[t,e]}function ur(t,e){return[t>Al?t-Tl:-Al>t?t+Tl:t,e]}function cr(t,e,n){return t?e||n?In(pr(t),fr(e,n)):pr(t):e||n?fr(e,n):ur}function dr(t){return function(e,n){return e+=t,[e>Al?e-Tl:-Al>e?e+Tl:e,n]}}function pr(t){var e=dr(t);return e.invert=dr(-t),e}function fr(t,e){function n(t,e){var n=Math.cos(e),l=Math.cos(t)*n,s=Math.sin(t)*n,u=Math.sin(e),c=u*r+l*a;return[Math.atan2(s*i-c*o,l*r-u*a),J(c*i+s*o)]}var r=Math.cos(t),a=Math.sin(t),i=Math.cos(e),o=Math.sin(e);return n.invert=function(t,e){var n=Math.cos(e),l=Math.cos(t)*n,s=Math.sin(t)*n,u=Math.sin(e),c=u*i-s*o;return[Math.atan2(s*i+u*o,l*r+c*a),J(c*r-l*a)]},n}function hr(t,e){var n=Math.cos(t),r=Math.sin(t);return function(a,i,o,l){var s=o*e;null!=a?(a=gr(n,a),i=gr(n,i),(o>0?i>a:a>i)&&(a+=o*Tl)):(a=t+o*Tl,i=t-.5*s);for(var u,c=a;o>0?c>i:i>c;c-=s)l.point((u=_n([n,-r*Math.cos(c),-r*Math.sin(c)]))[0],u[1])}}function gr(t,e){var n=gn(e);n[0]-=t,xn(n);var r=Q(-n[1]);return((-n[2]<0?-r:r)+2*Math.PI-Bl)%(2*Math.PI)}function vr(t,e,n){var r=Go.range(t,e-Bl,n).concat(e);return function(t){return r.map(function(e){return[t,e]})}}function yr(t,e,n){var r=Go.range(t,e-Bl,n).concat(e);return function(t){return r.map(function(e){return[e,t]})}}function mr(t){return t.source}function br(t){return t.target}function xr(t,e,n,r){var a=Math.cos(e),i=Math.sin(e),o=Math.cos(r),l=Math.sin(r),s=a*Math.cos(t),u=a*Math.sin(t),c=o*Math.cos(n),d=o*Math.sin(n),p=2*Math.asin(Math.sqrt(ee(r-e)+a*o*ee(n-t))),f=1/Math.sin(p),h=p?function(t){var e=Math.sin(t*=p)*f,n=Math.sin(p-t)*f,r=n*s+e*c,a=n*u+e*d,o=n*i+e*l;return[Math.atan2(a,r)*jl,Math.atan2(o,Math.sqrt(r*r+a*a))*jl]}:function(){return[t*jl,e*jl]};return h.distance=p,h}function _r(){function t(t,a){var i=Math.sin(a*=Dl),o=Math.cos(a),l=pl((t*=Dl)-e),s=Math.cos(l);Fs+=Math.atan2(Math.sqrt((l=o*Math.sin(l))*l+(l=r*i-n*o*s)*l),n*i+r*o*s),e=t,n=i,r=o}var e,n,r;Is.point=function(a,i){e=a*Dl,n=Math.sin(i*=Dl),r=Math.cos(i),Is.point=t},Is.lineEnd=function(){Is.point=Is.lineEnd=g}}function wr(t,e){function n(e,n){var r=Math.cos(e),a=Math.cos(n),i=t(r*a);return[i*a*Math.sin(e),i*Math.sin(n)]}return n.invert=function(t,n){var r=Math.sqrt(t*t+n*n),a=e(r),i=Math.sin(a),o=Math.cos(a);return[Math.atan2(t*i,r*o),Math.asin(r&&n*i/r)]},n}function kr(t,e){function n(t,e){o>0?-Ol+Bl>e&&(e=-Ol+Bl):e>Ol-Bl&&(e=Ol-Bl);var n=o/Math.pow(a(e),i);return[n*Math.sin(i*t),o-n*Math.cos(i*t)]}var r=Math.cos(t),a=function(t){return Math.tan(Al/4+t/2)},i=t===e?Math.sin(t):Math.log(r/Math.cos(e))/Math.log(a(e)/a(t)),o=r*Math.pow(a(t),i)/i;return i?(n.invert=function(t,e){var n=o-e,r=Z(i)*Math.sqrt(t*t+n*n);return[Math.atan2(t,n)/i,2*Math.atan(Math.pow(o/r,1/i))-Ol]},n):Sr}function zr(t,e){function n(t,e){var n=i-e;return[n*Math.sin(a*t),i-n*Math.cos(a*t)]}var r=Math.cos(t),a=t===e?Math.sin(t):(r-Math.cos(e))/(e-t),i=r/a+t;return pl(a)<Bl?sr:(n.invert=function(t,e){var n=i-e;return[Math.atan2(t,n)/a,i-Z(a)*Math.sqrt(t*t+n*n)]},n)}function Sr(t,e){return[t,Math.log(Math.tan(Al/4+e/2))]}function Mr(t){var e=ir(t),n=e.scale,r=e.translate,a=e.clipExtent,i;return e.scale=function(){var t=n.apply(e,arguments);return t===e?i?e.clipExtent(null):e:t},e.translate=function(){var t=r.apply(e,arguments);return t===e?i?e.clipExtent(null):e:t},e.clipExtent=function(t){var o=a.apply(e,arguments);if(o===e){if(i=null==t){var l=Al*n(),s=r();a([[s[0]-l,s[1]-l],[s[0]+l,s[1]+l]])}}else i&&(o=null);return o},e.clipExtent(null)}function Er(t,e){return[Math.log(Math.tan(Al/4+e/2)),-t]}function Cr(t){return t[0]}function Ar(t){return t[1]}function Tr(t){for(var e=t.length,n=[0,1],r=2,a=2;e>a;a++){for(;r>1&&X(t[n[r-2]],t[n[r-1]],t[a])<=0;)--r;n[r++]=a}return n.slice(0,r)}function Or(t,e){return t[0]-e[0]||t[1]-e[1]}function Br(t,e,n){return(n[0]-e[0])*(t[1]-e[1])<(n[1]-e[1])*(t[0]-e[0])}function Nr(t,e,n,r){var a=t[0],i=n[0],o=e[0]-a,l=r[0]-i,s=t[1],u=n[1],c=e[1]-s,d=r[1]-u,p=(l*(s-u)-d*(a-i))/(d*o-l*c);return[a+p*o,s+p*c]}function Dr(t){var e=t[0],n=t[t.length-1];return!(e[0]-n[0]||e[1]-n[1])}function jr(){na(this),this.edge=this.site=this.circle=null}function Pr(t){var e=Ks.pop()||new jr;return e.site=t,e}function $r(t){Vr(t),Gs.remove(t),Ks.push(t),na(t)}function qr(t){var e=t.circle,n=e.x,r=e.cy,a={x:n,y:r},i=t.P,o=t.N,l=[t];$r(t);for(var s=i;s.circle&&pl(n-s.circle.x)<Bl&&pl(r-s.circle.cy)<Bl;)i=s.P,l.unshift(s),$r(s),s=i;l.unshift(s),Vr(s);for(var u=o;u.circle&&pl(n-u.circle.x)<Bl&&pl(r-u.circle.cy)<Bl;)o=u.N,l.push(u),$r(u),u=o;l.push(u),Vr(u);var c=l.length,d;for(d=1;c>d;++d)u=l[d],s=l[d-1],Kr(u.edge,s.site,u.site,a);s=l[0],u=l[c-1],u.edge=Jr(s.site,u.site,null,a),Wr(s),Wr(u)}function Hr(t){for(var e=t.x,n=t.y,r,a,i,o,l=Gs._;l;)if(i=Lr(l,n)-e,i>Bl)l=l.L;else{if(o=e-Yr(l,n),!(o>Bl)){i>-Bl?(r=l.P,a=l):o>-Bl?(r=l,a=l.N):r=a=l;break}if(!l.R){r=l;break}l=l.R}var s=Pr(t);if(Gs.insert(r,s),r||a){if(r===a)return Vr(r),a=Pr(r.site),Gs.insert(s,a),s.edge=a.edge=Jr(r.site,s.site),Wr(r),void Wr(a);if(!a)return void(s.edge=Jr(r.site,s.site));Vr(r),Vr(a);var u=r.site,c=u.x,d=u.y,p=t.x-c,f=t.y-d,h=a.site,g=h.x-c,v=h.y-d,y=2*(p*v-f*g),m=p*p+f*f,b=g*g+v*v,x={x:(v*m-f*b)/y+c,y:(p*b-g*m)/y+d};Kr(a.edge,u,h,x),s.edge=Jr(u,t,null,x),a.edge=Jr(t,h,null,x),Wr(r),Wr(a)}}function Lr(t,e){var n=t.site,r=n.x,a=n.y,i=a-e;if(!i)return r;var o=t.P;if(!o)return-1/0;n=o.site;var l=n.x,s=n.y,u=s-e;if(!u)return l;var c=l-r,d=1/i-1/u,p=c/u;return d?(-p+Math.sqrt(p*p-2*d*(c*c/(-2*u)-s+u/2+a-i/2)))/d+r:(r+l)/2}function Yr(t,e){var n=t.N;if(n)return Lr(n,e);var r=t.site;return r.y===e?r.x:1/0}function Fr(t){this.site=t,this.edges=[]}function Ir(t){for(var e=t[0][0],n=t[1][0],r=t[0][1],a=t[1][1],i,o,l,s,u=Js,c=u.length,d,p,f,h,g,v;c--;)if(d=u[c],d&&d.prepare())for(f=d.edges,h=f.length,p=0;h>p;)v=f[p].end(),l=v.x,s=v.y,g=f[++p%h].start(),i=g.x,o=g.y,(pl(l-i)>Bl||pl(s-o)>Bl)&&(f.splice(p,0,new ta(Gr(d.site,v,pl(l-e)<Bl&&a-s>Bl?{x:e,y:pl(i-e)<Bl?o:a}:pl(s-a)<Bl&&n-l>Bl?{x:pl(o-a)<Bl?i:n,y:a}:pl(l-n)<Bl&&s-r>Bl?{x:n,y:pl(i-n)<Bl?o:r}:pl(s-r)<Bl&&l-e>Bl?{x:pl(o-r)<Bl?i:e,y:r}:null),d.site,null)),++h)}function Rr(t,e){return e.angle-t.angle}function Ur(){na(this),this.x=this.y=this.arc=this.site=this.cy=null}function Wr(t){var e=t.P,n=t.N;if(e&&n){var r=e.site,a=t.site,i=n.site;if(r!==i){var o=a.x,l=a.y,s=r.x-o,u=r.y-l,c=i.x-o,d=i.y-l,p=2*(s*d-u*c);if(!(p>=-Nl)){var f=s*s+u*u,h=c*c+d*d,g=(d*f-u*h)/p,v=(s*h-c*f)/p,d=v+l,y=nu.pop()||new Ur;y.arc=t,y.site=a,y.x=g+o,y.y=d+Math.sqrt(g*g+v*v),y.cy=d,t.circle=y;for(var m=null,b=eu._;b;)if(y.y<b.y||y.y===b.y&&y.x<=b.x){if(!b.L){m=b.P;break}b=b.L}else{if(!b.R){m=b;break}b=b.R}eu.insert(m,y),m||(tu=y)}}}}function Vr(t){var e=t.circle;e&&(e.P||(tu=e.N),eu.remove(e),nu.push(e),na(e),t.circle=null)}function Zr(t){for(var e=Qs,n=Yn(t[0][0],t[0][1],t[1][0],t[1][1]),r=e.length,a;r--;)a=e[r],(!Xr(a,t)||!n(a)||pl(a.a.x-a.b.x)<Bl&&pl(a.a.y-a.b.y)<Bl)&&(a.a=a.b=null,e.splice(r,1))}function Xr(t,e){var n=t.b;if(n)return!0;var r=t.a,a=e[0][0],i=e[1][0],o=e[0][1],l=e[1][1],s=t.l,u=t.r,c=s.x,d=s.y,p=u.x,f=u.y,h=(c+p)/2,g=(d+f)/2,v,y;if(f===d){if(a>h||h>=i)return;if(c>p){if(r){if(r.y>=l)return}else r={x:h,y:o};n={x:h,y:l}}else{if(r){if(r.y<o)return}else r={x:h,y:l};n={x:h,y:o}}}else if(v=(c-p)/(f-d),y=g-v*h,-1>v||v>1)if(c>p){if(r){if(r.y>=l)return}else r={x:(o-y)/v,y:o};n={x:(l-y)/v,y:l}}else{if(r){if(r.y<o)return}else r={x:(l-y)/v,y:l};n={x:(o-y)/v,y:o}}else if(f>d){if(r){if(r.x>=i)return}else r={x:a,y:v*a+y};n={x:i,y:v*i+y}}else{if(r){if(r.x<a)return}else r={x:i,y:v*i+y};n={x:a,y:v*a+y}}return t.a=r,t.b=n,!0}function Qr(t,e){this.l=t,this.r=e,this.a=this.b=null}function Jr(t,e,n,r){var a=new Qr(t,e);return Qs.push(a),n&&Kr(a,t,e,n),r&&Kr(a,e,t,r),Js[t.i].edges.push(new ta(a,t,e)),Js[e.i].edges.push(new ta(a,e,t)),a}function Gr(t,e,n){var r=new Qr(t,null);return r.a=e,r.b=n,Qs.push(r),r}function Kr(t,e,n,r){t.a||t.b?t.l===n?t.b=r:t.a=r:(t.a=r,t.l=e,t.r=n)}function ta(t,e,n){var r=t.a,a=t.b;this.edge=t,this.site=e,this.angle=n?Math.atan2(n.y-e.y,n.x-e.x):t.l===e?Math.atan2(a.x-r.x,r.y-a.y):Math.atan2(r.x-a.x,a.y-r.y)}function ea(){this._=null}function na(t){t.U=t.C=t.L=t.R=t.P=t.N=null}function ra(t,e){var n=e,r=e.R,a=n.U;a?a.L===n?a.L=r:a.R=r:t._=r,r.U=a,n.U=r,n.R=r.L,n.R&&(n.R.U=n),r.L=n}function aa(t,e){var n=e,r=e.L,a=n.U;a?a.L===n?a.L=r:a.R=r:t._=r,r.U=a,n.U=r,n.L=r.R,n.L&&(n.L.U=n),r.R=n}function ia(t){for(;t.L;)t=t.L;return t}function oa(t,e){var n=t.sort(la).pop(),r,a,i;for(Qs=[],Js=new Array(t.length),Gs=new ea,eu=new ea;;)if(i=tu,n&&(!i||n.y<i.y||n.y===i.y&&n.x<i.x))(n.x!==r||n.y!==a)&&(Js[n.i]=new Fr(n),Hr(n),r=n.x,a=n.y),n=t.pop();else{if(!i)break;qr(i.arc)}e&&(Zr(e),Ir(e));var o={cells:Js,edges:Qs};return Gs=eu=Qs=Js=null,o}function la(t,e){return e.y-t.y||e.x-t.x}function sa(t,e,n){return(t.x-n.x)*(e.y-t.y)-(t.x-e.x)*(n.y-t.y)}function ua(t){return t.x}function ca(t){return t.y}function da(){return{leaf:!0,nodes:[],point:null,x:null,y:null}}function pa(t,e,n,r,a,i){if(!t(e,n,r,a,i)){var o=.5*(n+a),l=.5*(r+i),s=e.nodes;s[0]&&pa(t,s[0],n,r,o,l),s[1]&&pa(t,s[1],o,r,a,l),s[2]&&pa(t,s[2],n,l,o,i),s[3]&&pa(t,s[3],o,l,a,i)}}function fa(t,e){t=Go.rgb(t),e=Go.rgb(e);var n=t.r,r=t.g,a=t.b,i=e.r-n,o=e.g-r,l=e.b-a;return function(t){return"#"+xe(Math.round(n+i*t))+xe(Math.round(r+o*t))+xe(Math.round(a+l*t))}}function ha(t,e){var n={},r={},a;for(a in t)a in e?n[a]=ya(t[a],e[a]):r[a]=t[a];for(a in e)a in t||(r[a]=e[a]);return function(t){for(a in n)r[a]=n[a](t);return r}}function ga(t,e){return e-=t=+t,function(n){return t+e*n}}function va(t,e){var n=au.lastIndex=iu.lastIndex=0,r,a,i,o=-1,l=[],s=[];for(t+="",e+="";(r=au.exec(t))&&(a=iu.exec(e));)(i=a.index)>n&&(i=e.substring(n,i),l[o]?l[o]+=i:l[++o]=i),(r=r[0])===(a=a[0])?l[o]?l[o]+=a:l[++o]=a:(l[++o]=null,s.push({i:o,x:ga(r,a)})),n=iu.lastIndex;return n<e.length&&(i=e.substring(n),l[o]?l[o]+=i:l[++o]=i),l.length<2?s[0]?(e=s[0].x,function(t){return e(t)+""}):function(){return e}:(e=s.length,function(t){for(var n=0,r;e>n;++n)l[(r=s[n]).i]=r.x(t);return l.join("")})}function ya(t,e){for(var n=Go.interpolators.length,r;--n>=0&&!(r=Go.interpolators[n](t,e)););return r}function ma(t,e){var n=[],r=[],a=t.length,i=e.length,o=Math.min(t.length,e.length),l;for(l=0;o>l;++l)n.push(ya(t[l],e[l]));for(;a>l;++l)r[l]=t[l];for(;i>l;++l)r[l]=e[l];return function(t){for(l=0;o>l;++l)r[l]=n[l](t);return r}}function ba(t){return function(e){return 0>=e?0:e>=1?1:t(e)}}function xa(t){return function(e){return 1-t(1-e)}}function _a(t){return function(e){return.5*(.5>e?t(2*e):2-t(2-2*e))}}function wa(t){return t*t}function ka(t){return t*t*t}function za(t){if(0>=t)return 0;if(t>=1)return 1;var e=t*t,n=e*t;return 4*(.5>t?n:3*(t-e)+n-.75)}function Sa(t){return function(e){return Math.pow(e,t)}}function Ma(t){return 1-Math.cos(t*Ol)}function Ea(t){return Math.pow(2,10*(t-1))}function Ca(t){return 1-Math.sqrt(1-t*t)}function Aa(t,e){var n;return arguments.length<2&&(e=.45),arguments.length?n=e/Tl*Math.asin(1/t):(t=1,n=e/4),function(r){return 1+t*Math.pow(2,-10*r)*Math.sin((r-n)*Tl/e)}}function Ta(t){return t||(t=1.70158),function(e){return e*e*((t+1)*e-t)}}function Oa(t){return 1/2.75>t?7.5625*t*t:2/2.75>t?7.5625*(t-=1.5/2.75)*t+.75:2.5/2.75>t?7.5625*(t-=2.25/2.75)*t+.9375:7.5625*(t-=2.625/2.75)*t+.984375}function Ba(t,e){t=Go.hcl(t),e=Go.hcl(e);var n=t.h,r=t.c,a=t.l,i=e.h-n,o=e.c-r,l=e.l-a;return isNaN(o)&&(o=0,r=isNaN(r)?e.c:r),isNaN(i)?(i=0,n=isNaN(n)?e.h:n):i>180?i-=360:-180>i&&(i+=360),function(t){return se(n+i*t,r+o*t,a+l*t)+""}}function Na(t,e){t=Go.hsl(t),e=Go.hsl(e);var n=t.h,r=t.s,a=t.l,i=e.h-n,o=e.s-r,l=e.l-a;return isNaN(o)&&(o=0,r=isNaN(r)?e.s:r),isNaN(i)?(i=0,n=isNaN(n)?e.h:n):i>180?i-=360:-180>i&&(i+=360),function(t){return ie(n+i*t,r+o*t,a+l*t)+""}}function Da(t,e){t=Go.lab(t),e=Go.lab(e);var n=t.l,r=t.a,a=t.b,i=e.l-n,o=e.a-r,l=e.b-a;return function(t){return de(n+i*t,r+o*t,a+l*t)+""}}function ja(t,e){return e-=t,function(n){return Math.round(t+e*n)}}function Pa(t){var e=[t.a,t.b],n=[t.c,t.d],r=qa(e),a=$a(e,n),i=qa(Ha(n,e,-a))||0;e[0]*n[1]<n[0]*e[1]&&(e[0]*=-1,e[1]*=-1,r*=-1,a*=-1),this.rotate=(r?Math.atan2(e[1],e[0]):Math.atan2(-n[0],n[1]))*jl,this.translate=[t.e,t.f],this.scale=[r,i],this.skew=i?Math.atan2(a,i)*jl:0}function $a(t,e){return t[0]*e[0]+t[1]*e[1]}function qa(t){var e=Math.sqrt($a(t,t));return e&&(t[0]/=e,t[1]/=e),e}function Ha(t,e,n){return t[0]+=n*e[0],t[1]+=n*e[1],t}function La(t,e){var n=[],r=[],a,i=Go.transform(t),o=Go.transform(e),l=i.translate,s=o.translate,u=i.rotate,c=o.rotate,d=i.skew,p=o.skew,f=i.scale,h=o.scale;return l[0]!=s[0]||l[1]!=s[1]?(n.push("translate(",null,",",null,")"),r.push({i:1,x:ga(l[0],s[0])},{i:3,x:ga(l[1],s[1])})):n.push(s[0]||s[1]?"translate("+s+")":""),u!=c?(u-c>180?c+=360:c-u>180&&(u+=360),r.push({i:n.push(n.pop()+"rotate(",null,")")-2,x:ga(u,c)})):c&&n.push(n.pop()+"rotate("+c+")"),d!=p?r.push({i:n.push(n.pop()+"skewX(",null,")")-2,x:ga(d,p)}):p&&n.push(n.pop()+"skewX("+p+")"),f[0]!=h[0]||f[1]!=h[1]?(a=n.push(n.pop()+"scale(",null,",",null,")"),r.push({i:a-4,x:ga(f[0],h[0])},{i:a-2,x:ga(f[1],h[1])})):(1!=h[0]||1!=h[1])&&n.push(n.pop()+"scale("+h+")"),a=r.length,function(t){for(var e=-1,i;++e<a;)n[(i=r[e]).i]=i.x(t);return n.join("")}}function Ya(t,e){return e=e-(t=+t)?1/(e-t):0,function(n){return(n-t)*e}}function Fa(t,e){return e=e-(t=+t)?1/(e-t):0,function(n){return Math.max(0,Math.min(1,(n-t)*e))}}function Ia(t){for(var e=t.source,n=t.target,r=Ua(e,n),a=[e];e!==r;)e=e.parent,a.push(e);for(var i=a.length;n!==r;)a.splice(i,0,n),n=n.parent;return a}function Ra(t){for(var e=[],n=t.parent;null!=n;)e.push(t),t=n,n=n.parent;return e.push(t),e}function Ua(t,e){if(t===e)return t;for(var n=Ra(t),r=Ra(e),a=n.pop(),i=r.pop(),o=null;a===i;)o=a,a=n.pop(),i=r.pop();return o}function Wa(t){t.fixed|=2}function Va(t){t.fixed&=-7}function Za(t){t.fixed|=4,t.px=t.x,t.py=t.y}function Xa(t){t.fixed&=-5}function Qa(t,e,n){var r=0,a=0;if(t.charge=0,!t.leaf)for(var i=t.nodes,o=i.length,l=-1,s;++l<o;)s=i[l],null!=s&&(Qa(s,e,n),t.charge+=s.charge,r+=s.charge*s.cx,a+=s.charge*s.cy);if(t.point){t.leaf||(t.point.x+=Math.random()-.5,t.point.y+=Math.random()-.5);var u=e*n[t.point.index];t.charge+=t.pointCharge=u,r+=u*t.point.x,a+=u*t.point.y}t.cx=r/t.charge,t.cy=a/t.charge}function Ja(t,e){return Go.rebind(t,e,"sort","children","value"),t.nodes=t,t.links=ei,t}function Ga(t){return t.children}function Ka(t){return t.value}function ti(t,e){return e.value-t.value}function ei(t){return Go.merge(t.map(function(t){return(t.children||[]).map(function(e){return{source:t,target:e}})}))}function ni(t){return t.x}function ri(t){return t.y}function ai(t,e,n){t.y0=e,t.y=n}function ii(t){return Go.range(t.length)}function oi(t){for(var e=-1,n=t[0].length,r=[];++e<n;)r[e]=0;return r}function li(t){for(var e=1,n=0,r=t[0][1],a,i=t.length;i>e;++e)(a=t[e][1])>r&&(n=e,r=a);return n}function si(t){return t.reduce(ui,0)}function ui(t,e){return t+e[1]}function ci(t,e){return di(t,Math.ceil(Math.log(e.length)/Math.LN2+1))}function di(t,e){for(var n=-1,r=+t[0],a=(t[1]-r)/e,i=[];++n<=e;)i[n]=a*n+r;return i}function pi(t){return[Go.min(t),Go.max(t)]}function fi(t,e){return t.parent==e.parent?1:2}function hi(t){var e=t.children;return e&&e.length?e[0]:t._tree.thread}function gi(t){var e=t.children,n;return e&&(n=e.length)?e[n-1]:t._tree.thread}function vi(t,e){var n=t.children;if(n&&(a=n.length))for(var r,a,i=-1;++i<a;)e(r=vi(n[i],e),t)>0&&(t=r);return t}function yi(t,e){return t.x-e.x}function mi(t,e){return e.x-t.x}function bi(t,e){return t.depth-e.depth}function xi(t,e){function n(t,r){var a=t.children;if(a&&(s=a.length))for(var i,o=null,l=-1,s;++l<s;)i=a[l],n(i,o),o=i;e(t,r)}n(t,null)}function _i(t){for(var e=0,n=0,r=t.children,a=r.length,i;--a>=0;)i=r[a]._tree,i.prelim+=e,i.mod+=e,e+=i.shift+(n+=i.change)}function wi(t,e,n){t=t._tree,e=e._tree;var r=n/(e.number-t.number);t.change+=r,e.change-=r,e.shift+=n,e.prelim+=n,e.mod+=n}function ki(t,e,n){return t._tree.ancestor.parent==e.parent?t._tree.ancestor:n}function zi(t,e){return t.value-e.value}function Si(t,e){var n=t._pack_next;t._pack_next=e,e._pack_prev=t,e._pack_next=n,n._pack_prev=e}function Mi(t,e){t._pack_next=e,e._pack_prev=t}function Ei(t,e){var n=e.x-t.x,r=e.y-t.y,a=t.r+e.r;return.999*a*a>n*n+r*r}function Ci(t){function e(t){r=Math.min(t.x-t.r,r),a=Math.max(t.x+t.r,a),i=Math.min(t.y-t.r,i),o=Math.max(t.y+t.r,o)}if((n=t.children)&&(f=n.length)){var n,r=1/0,a=-1/0,i=1/0,o=-1/0,l,s,u,c,d,p,f;if(n.forEach(Ai),l=n[0],l.x=-l.r,l.y=0,e(l),f>1&&(s=n[1],s.x=s.r,s.y=0,e(s),f>2))for(u=n[2],Bi(l,s,u),e(u),Si(l,u),l._pack_prev=u,Si(u,s),s=l._pack_next,c=3;f>c;c++){Bi(l,s,u=n[c]);var h=0,g=1,v=1;for(d=s._pack_next;d!==s;d=d._pack_next,g++)if(Ei(d,u)){h=1;break}if(1==h)for(p=l._pack_prev;p!==d._pack_prev&&!Ei(p,u);p=p._pack_prev,v++);h?(v>g||g==v&&s.r<l.r?Mi(l,s=d):Mi(l=p,s),c--):(Si(l,u),s=u,e(u))}var y=(r+a)/2,m=(i+o)/2,b=0;for(c=0;f>c;c++)u=n[c],u.x-=y,u.y-=m,b=Math.max(b,u.r+Math.sqrt(u.x*u.x+u.y*u.y));t.r=b,n.forEach(Ti)}}function Ai(t){t._pack_next=t._pack_prev=t}function Ti(t){delete t._pack_next,delete t._pack_prev}function Oi(t,e,n,r){var a=t.children;if(t.x=e+=r*t.x,t.y=n+=r*t.y,t.r*=r,a)for(var i=-1,o=a.length;++i<o;)Oi(a[i],e,n,r)}function Bi(t,e,n){var r=t.r+n.r,a=e.x-t.x,i=e.y-t.y;if(r&&(a||i)){var o=e.r+n.r,l=a*a+i*i;o*=o,r*=r;var s=.5+(r-o)/(2*l),u=Math.sqrt(Math.max(0,2*o*(r+l)-(r-=l)*r-o*o))/(2*l);n.x=t.x+s*a+u*i,n.y=t.y+s*i-u*a}else n.x=t.x+r,n.y=t.y}function Ni(t){return 1+Go.max(t,function(t){return t.y})}function Di(t){return t.reduce(function(t,e){return t+e.x},0)/t.length}function ji(t){var e=t.children;return e&&e.length?ji(e[0]):t}function Pi(t){var e=t.children,n;return e&&(n=e.length)?Pi(e[n-1]):t}function $i(t){return{x:t.x,y:t.y,dx:t.dx,dy:t.dy}}function qi(t,e){var n=t.x+e[3],r=t.y+e[0],a=t.dx-e[1]-e[3],i=t.dy-e[0]-e[2];return 0>a&&(n+=a/2,a=0),0>i&&(r+=i/2,i=0),{x:n,y:r,dx:a,dy:i}}function Hi(t){var e=t[0],n=t[t.length-1];return n>e?[e,n]:[n,e]}function Li(t){return t.rangeExtent?t.rangeExtent():Hi(t.range())}function Yi(t,e,n,r){var a=n(t[0],t[1]),i=r(e[0],e[1]);return function(t){return i(a(t))}}function Fi(t,e){var n=0,r=t.length-1,a=t[n],i=t[r],o;return a>i&&(o=n,n=r,r=o,o=a,a=i,i=o),t[n]=e.floor(a),t[r]=e.ceil(i),t}function Ii(t){return t?{floor:function(e){return Math.floor(e/t)*t},ceil:function(e){return Math.ceil(e/t)*t}}:vu}function Ri(t,e,n,r){var a=[],i=[],o=0,l=Math.min(t.length,e.length)-1;for(t[l]<t[0]&&(t=t.slice().reverse(),e=e.slice().reverse());++o<=l;)a.push(n(t[o-1],t[o])),i.push(r(e[o-1],e[o]));return function(e){var n=Go.bisect(t,e,1,l)-1;return i[n](a[n](e))}}function Ui(t,e,n,r){function a(){var a=Math.min(t.length,e.length)>2?Ri:Yi,s=r?Fa:Ya;return o=a(t,e,s,n),l=a(e,t,s,ya),i}function i(t){return o(t)}var o,l;return i.invert=function(t){return l(t)},i.domain=function(e){return arguments.length?(t=e.map(Number),a()):t},i.range=function(t){return arguments.length?(e=t,a()):e},i.rangeRound=function(t){return i.range(t).interpolate(ja)},i.clamp=function(t){return arguments.length?(r=t,a()):r},i.interpolate=function(t){return arguments.length?(n=t,a()):n},i.ticks=function(e){return Xi(t,e)},i.tickFormat=function(e,n){return Qi(t,e,n)},i.nice=function(e){return Vi(t,e),a()},i.copy=function(){return Ui(t,e,n,r)},a()}function Wi(t,e){return Go.rebind(t,e,"range","rangeRound","interpolate","clamp")}function Vi(t,e){return Fi(t,Ii(Zi(t,e)[2]))}function Zi(t,e){null==e&&(e=10);var n=Hi(t),r=n[1]-n[0],a=Math.pow(10,Math.floor(Math.log(r/e)/Math.LN10)),i=e/r*a;return.15>=i?a*=10:.35>=i?a*=5:.75>=i&&(a*=2),n[0]=Math.ceil(n[0]/a)*a,n[1]=Math.floor(n[1]/a)*a+.5*a,n[2]=a,n}function Xi(t,e){return Go.range.apply(Go,Zi(t,e))}function Qi(t,e,n){var r=Zi(t,e);if(n){var a=as.exec(n);if(a.shift(),"s"===a[8]){var i=Go.formatPrefix(Math.max(pl(r[0]),pl(r[1])));return a[7]||(a[7]="."+Ji(i.scale(r[2]))),a[8]="f",n=Go.format(a.join("")),function(t){return n(i.scale(t))+i.symbol}}a[7]||(a[7]="."+Gi(a[8],r)),n=a.join("")}else n=",."+Ji(r[2])+"f";return Go.format(n)}function Ji(t){return-Math.floor(Math.log(t)/Math.LN10+.01)}function Gi(t,e){var n=Ji(e[2]);return t in yu?Math.abs(n-Ji(Math.max(pl(e[0]),pl(e[1]))))+ +("e"!==t):n-2*("%"===t)}function Ki(t,e,n,r){function a(t){return(n?Math.log(0>t?0:t):-Math.log(t>0?0:-t))/Math.log(e)}function i(t){return n?Math.pow(e,t):-Math.pow(e,-t)}function o(e){return t(a(e))}return o.invert=function(e){return i(t.invert(e))},o.domain=function(e){return arguments.length?(n=e[0]>=0,t.domain((r=e.map(Number)).map(a)),o):r},o.base=function(n){return arguments.length?(e=+n,t.domain(r.map(a)),o):e},o.nice=function(){var e=Fi(r.map(a),n?Math:bu);return t.domain(e),r=e.map(i),o},o.ticks=function(){var t=Hi(r),o=[],l=t[0],s=t[1],u=Math.floor(a(l)),c=Math.ceil(a(s)),d=e%1?2:e;if(isFinite(c-u)){if(n){for(;c>u;u++)for(var p=1;d>p;p++)o.push(i(u)*p);o.push(i(u))}else for(o.push(i(u));u++<c;)for(var p=d-1;p>0;p--)o.push(i(u)*p);for(u=0;o[u]<l;u++);for(c=o.length;o[c-1]>s;c--);o=o.slice(u,c)}return o},o.tickFormat=function(t,e){if(!arguments.length)return mu;arguments.length<2?e=mu:"function"!=typeof e&&(e=Go.format(e));var r=Math.max(.1,t/o.ticks().length),l=n?(s=1e-12,Math.ceil):(s=-1e-12,Math.floor),s;return function(t){return t/i(l(a(t)+s))<=r?e(t):""}},o.copy=function(){return Ki(t.copy(),e,n,r)},Wi(o,t)}function to(t,e,n){function r(e){return t(a(e))}var a=eo(e),i=eo(1/e);return r.invert=function(e){return i(t.invert(e))},r.domain=function(e){return arguments.length?(t.domain((n=e.map(Number)).map(a)),r):n},r.ticks=function(t){return Xi(n,t)},r.tickFormat=function(t,e){return Qi(n,t,e)
},r.nice=function(t){return r.domain(Vi(n,t))},r.exponent=function(o){return arguments.length?(a=eo(e=o),i=eo(1/e),t.domain(n.map(a)),r):e},r.copy=function(){return to(t.copy(),e,n)},Wi(r,t)}function eo(t){return function(e){return 0>e?-Math.pow(-e,t):Math.pow(e,t)}}function no(t,e){function n(n){return i[((a.get(n)||("range"===e.t?a.set(n,t.push(n)):0/0))-1)%i.length]}function r(e,n){return Go.range(t.length).map(function(t){return e+n*t})}var a,i,l;return n.domain=function(r){if(!arguments.length)return t;t=[],a=new o;for(var i=-1,l=r.length,s;++i<l;)a.has(s=r[i])||a.set(s,t.push(s));return n[e.t].apply(n,e.a)},n.range=function(t){return arguments.length?(i=t,l=0,e={t:"range",a:arguments},n):i},n.rangePoints=function(a,o){arguments.length<2&&(o=0);var s=a[0],u=a[1],c=(u-s)/(Math.max(1,t.length-1)+o);return i=r(t.length<2?(s+u)/2:s+c*o/2,c),l=0,e={t:"rangePoints",a:arguments},n},n.rangeBands=function(a,o,s){arguments.length<2&&(o=0),arguments.length<3&&(s=o);var u=a[1]<a[0],c=a[u-0],d=a[1-u],p=(d-c)/(t.length-o+2*s);return i=r(c+p*s,p),u&&i.reverse(),l=p*(1-o),e={t:"rangeBands",a:arguments},n},n.rangeRoundBands=function(a,o,s){arguments.length<2&&(o=0),arguments.length<3&&(s=o);var u=a[1]<a[0],c=a[u-0],d=a[1-u],p=Math.floor((d-c)/(t.length-o+2*s)),f=d-c-(t.length-o)*p;return i=r(c+Math.round(f/2),p),u&&i.reverse(),l=Math.round(p*(1-o)),e={t:"rangeRoundBands",a:arguments},n},n.rangeBand=function(){return l},n.rangeExtent=function(){return Hi(e.a[0])},n.copy=function(){return no(t,e)},n.domain(t)}function ro(n,r){function a(){var t=0,e=r.length;for(o=[];++t<e;)o[t-1]=Go.quantile(n,t/e);return i}function i(t){return isNaN(t=+t)?void 0:r[Go.bisect(o,t)]}var o;return i.domain=function(r){return arguments.length?(n=r.filter(e).sort(t),a()):n},i.range=function(t){return arguments.length?(r=t,a()):r},i.quantiles=function(){return o},i.invertExtent=function(t){return t=r.indexOf(t),0>t?[0/0,0/0]:[t>0?o[t-1]:n[0],t<o.length?o[t]:n[n.length-1]]},i.copy=function(){return ro(n,r)},a()}function ao(t,e,n){function r(e){return n[Math.max(0,Math.min(o,Math.floor(i*(e-t))))]}function a(){return i=n.length/(e-t),o=n.length-1,r}var i,o;return r.domain=function(n){return arguments.length?(t=+n[0],e=+n[n.length-1],a()):[t,e]},r.range=function(t){return arguments.length?(n=t,a()):n},r.invertExtent=function(e){return e=n.indexOf(e),e=0>e?0/0:e/i+t,[e,e+1/i]},r.copy=function(){return ao(t,e,n)},a()}function io(t,e){function n(n){return n>=n?e[Go.bisect(t,n)]:void 0}return n.domain=function(e){return arguments.length?(t=e,n):t},n.range=function(t){return arguments.length?(e=t,n):e},n.invertExtent=function(n){return n=e.indexOf(n),[t[n-1],t[n]]},n.copy=function(){return io(t,e)},n}function oo(t){function e(t){return+t}return e.invert=e,e.domain=e.range=function(n){return arguments.length?(t=n.map(e),e):t},e.ticks=function(e){return Xi(t,e)},e.tickFormat=function(e,n){return Qi(t,e,n)},e.copy=function(){return oo(t)},e}function lo(t){return t.innerRadius}function so(t){return t.outerRadius}function uo(t){return t.startAngle}function co(t){return t.endAngle}function po(t){function e(e){function o(){s.push("M",i(t(u),l))}for(var s=[],u=[],c=-1,d=e.length,p,f=Me(n),h=Me(r);++c<d;)a.call(this,p=e[c],c)?u.push([+f.call(this,p,c),+h.call(this,p,c)]):u.length&&(o(),u=[]);return u.length&&o(),s.length?s.join(""):null}var n=Cr,r=Ar,a=Cn,i=fo,o=i.key,l=.7;return e.x=function(t){return arguments.length?(n=t,e):n},e.y=function(t){return arguments.length?(r=t,e):r},e.defined=function(t){return arguments.length?(a=t,e):a},e.interpolate=function(t){return arguments.length?(o="function"==typeof t?i=t:(i=Mu.get(t)||fo).key,e):o},e.tension=function(t){return arguments.length?(l=t,e):l},e}function fo(t){return t.join("L")}function ho(t){return fo(t)+"Z"}function go(t){for(var e=0,n=t.length,r=t[0],a=[r[0],",",r[1]];++e<n;)a.push("H",(r[0]+(r=t[e])[0])/2,"V",r[1]);return n>1&&a.push("H",r[0]),a.join("")}function vo(t){for(var e=0,n=t.length,r=t[0],a=[r[0],",",r[1]];++e<n;)a.push("V",(r=t[e])[1],"H",r[0]);return a.join("")}function yo(t){for(var e=0,n=t.length,r=t[0],a=[r[0],",",r[1]];++e<n;)a.push("H",(r=t[e])[0],"V",r[1]);return a.join("")}function mo(t,e){return t.length<4?fo(t):t[1]+_o(t.slice(1,t.length-1),wo(t,e))}function bo(t,e){return t.length<3?fo(t):t[0]+_o((t.push(t[0]),t),wo([t[t.length-2]].concat(t,[t[1]]),e))}function xo(t,e){return t.length<3?fo(t):t[0]+_o(t,wo(t,e))}function _o(t,e){if(e.length<1||t.length!=e.length&&t.length!=e.length+2)return fo(t);var n=t.length!=e.length,r="",a=t[0],i=t[1],o=e[0],l=o,s=1;if(n&&(r+="Q"+(i[0]-2*o[0]/3)+","+(i[1]-2*o[1]/3)+","+i[0]+","+i[1],a=t[1],s=2),e.length>1){l=e[1],i=t[s],s++,r+="C"+(a[0]+o[0])+","+(a[1]+o[1])+","+(i[0]-l[0])+","+(i[1]-l[1])+","+i[0]+","+i[1];for(var u=2;u<e.length;u++,s++)i=t[s],l=e[u],r+="S"+(i[0]-l[0])+","+(i[1]-l[1])+","+i[0]+","+i[1]}if(n){var c=t[s];r+="Q"+(i[0]+2*l[0]/3)+","+(i[1]+2*l[1]/3)+","+c[0]+","+c[1]}return r}function wo(t,e){for(var n=[],r=(1-e)/2,a,i=t[0],o=t[1],l=1,s=t.length;++l<s;)a=i,i=o,o=t[l],n.push([r*(o[0]-a[0]),r*(o[1]-a[1])]);return n}function ko(t){if(t.length<3)return fo(t);var e=1,n=t.length,r=t[0],a=r[0],i=r[1],o=[a,a,a,(r=t[1])[0]],l=[i,i,i,r[1]],s=[a,",",i,"L",Eo(Au,o),",",Eo(Au,l)];for(t.push(t[n-1]);++e<=n;)r=t[e],o.shift(),o.push(r[0]),l.shift(),l.push(r[1]),Co(s,o,l);return t.pop(),s.push("L",r),s.join("")}function zo(t){if(t.length<4)return fo(t);for(var e=[],n=-1,r=t.length,a,i=[0],o=[0];++n<3;)a=t[n],i.push(a[0]),o.push(a[1]);for(e.push(Eo(Au,i)+","+Eo(Au,o)),--n;++n<r;)a=t[n],i.shift(),i.push(a[0]),o.shift(),o.push(a[1]),Co(e,i,o);return e.join("")}function So(t){for(var e,n=-1,r=t.length,a=r+4,i,o=[],l=[];++n<4;)i=t[n%r],o.push(i[0]),l.push(i[1]);for(e=[Eo(Au,o),",",Eo(Au,l)],--n;++n<a;)i=t[n%r],o.shift(),o.push(i[0]),l.shift(),l.push(i[1]),Co(e,o,l);return e.join("")}function Mo(t,e){var n=t.length-1;if(n)for(var r=t[0][0],a=t[0][1],i=t[n][0]-r,o=t[n][1]-a,l=-1,s,u;++l<=n;)s=t[l],u=l/n,s[0]=e*s[0]+(1-e)*(r+u*i),s[1]=e*s[1]+(1-e)*(a+u*o);return ko(t)}function Eo(t,e){return t[0]*e[0]+t[1]*e[1]+t[2]*e[2]+t[3]*e[3]}function Co(t,e,n){t.push("C",Eo(Eu,e),",",Eo(Eu,n),",",Eo(Cu,e),",",Eo(Cu,n),",",Eo(Au,e),",",Eo(Au,n))}function Ao(t,e){return(e[1]-t[1])/(e[0]-t[0])}function To(t){for(var e=0,n=t.length-1,r=[],a=t[0],i=t[1],o=r[0]=Ao(a,i);++e<n;)r[e]=(o+(o=Ao(a=i,i=t[e+1])))/2;return r[e]=o,r}function Oo(t){for(var e=[],n,r,a,i,o=To(t),l=-1,s=t.length-1;++l<s;)n=Ao(t[l],t[l+1]),pl(n)<Bl?o[l]=o[l+1]=0:(r=o[l]/n,a=o[l+1]/n,i=r*r+a*a,i>9&&(i=3*n/Math.sqrt(i),o[l]=i*r,o[l+1]=i*a));for(l=-1;++l<=s;)i=(t[Math.min(s,l+1)][0]-t[Math.max(0,l-1)][0])/(6*(1+o[l]*o[l])),e.push([i||0,o[l]*i||0]);return e}function Bo(t){return t.length<3?fo(t):t[0]+_o(t,Oo(t))}function No(t){for(var e,n=-1,r=t.length,a,i;++n<r;)e=t[n],a=e[0],i=e[1]+zu,e[0]=a*Math.cos(i),e[1]=a*Math.sin(i);return t}function Do(t){function e(e){function s(){p.push("M",l(t(h),d),c,u(t(f.reverse()),d),"Z")}for(var p=[],f=[],h=[],g=-1,v=e.length,y,m=Me(n),b=Me(a),x=n===r?function(){return w}:Me(r),_=a===i?function(){return k}:Me(i),w,k;++g<v;)o.call(this,y=e[g],g)?(f.push([w=+m.call(this,y,g),k=+b.call(this,y,g)]),h.push([+x.call(this,y,g),+_.call(this,y,g)])):f.length&&(s(),f=[],h=[]);return f.length&&s(),p.length?p.join(""):null}var n=Cr,r=Cr,a=0,i=Ar,o=Cn,l=fo,s=l.key,u=l,c="L",d=.7;return e.x=function(t){return arguments.length?(n=r=t,e):r},e.x0=function(t){return arguments.length?(n=t,e):n},e.x1=function(t){return arguments.length?(r=t,e):r},e.y=function(t){return arguments.length?(a=i=t,e):i},e.y0=function(t){return arguments.length?(a=t,e):a},e.y1=function(t){return arguments.length?(i=t,e):i},e.defined=function(t){return arguments.length?(o=t,e):o},e.interpolate=function(t){return arguments.length?(s="function"==typeof t?l=t:(l=Mu.get(t)||fo).key,u=l.reverse||l,c=l.closed?"M":"L",e):s},e.tension=function(t){return arguments.length?(d=t,e):d},e}function jo(t){return t.radius}function Po(t){return[t.x,t.y]}function $o(t){return function(){var e=t.apply(this,arguments),n=e[0],r=e[1]+zu;return[n*Math.cos(r),n*Math.sin(r)]}}function qo(){return 64}function Ho(){return"circle"}function Lo(t){var e=Math.sqrt(t/Al);return"M0,"+e+"A"+e+","+e+" 0 1,1 0,"+-e+"A"+e+","+e+" 0 1,1 0,"+e+"Z"}function Yo(t,e){return yl(t,Nu),t.id=e,t}function Fo(t,e,n,r){var a=t.id;return P(t,"function"==typeof n?function(t,i,o){t.__transition__[a].tween.set(e,r(n.call(t,t.__data__,i,o)))}:(n=r(n),function(t){t.__transition__[a].tween.set(e,n)}))}function Io(t){return null==t&&(t=""),function(){this.textContent=t}}function Ro(t,e,n,r){var a=t.__transition__||(t.__transition__={active:0,count:0}),i=a[n];if(!i){var l=r.time;i=a[n]={tween:new o,time:l,ease:r.ease,delay:r.delay,duration:r.duration},++a.count,Go.timer(function(r){function o(r){return a.active>n?u():(a.active=n,i.event&&i.event.start.call(t,c,e),i.tween.forEach(function(n,r){(r=r.call(t,c,e))&&g.push(r)}),void Go.timer(function(){return h.c=s(r||1)?Cn:s,1},0,l))}function s(r){if(a.active!==n)return u();for(var o=r/f,l=d(o),s=g.length;s>0;)g[--s].call(t,l);return o>=1?(i.event&&i.event.end.call(t,c,e),u()):void 0}function u(){return--a.count?delete a[n]:delete t.__transition__,1}var c=t.__data__,d=i.ease,p=i.delay,f=i.duration,h=es,g=[];return h.t=p+l,r>=p?o(r-p):void(h.c=o)},0,l)}}function Uo(t,e){t.attr("transform",function(t){return"translate("+e(t)+",0)"})}function Wo(t,e){t.attr("transform",function(t){return"translate(0,"+e(t)+")"})}function Vo(t){return t.toISOString()}function Zo(t,e,n){function r(e){return t(e)}function a(t,n){var r=t[1]-t[0],a=r/n,i=Go.bisect(Ru,a);return i==Ru.length?[e.year,Zi(t.map(function(t){return t/31536e6}),n)[2]]:i?e[a/Ru[i-1]<Ru[i]/a?i-1:i]:[Vu,Zi(t,n)[2]]}return r.invert=function(e){return Xo(t.invert(e))},r.domain=function(e){return arguments.length?(t.domain(e),r):t.domain().map(Xo)},r.nice=function(t,e){function n(n){return!isNaN(n)&&!t.range(n,Xo(+n+1),e).length}var i=r.domain(),o=Hi(i),l=null==t?a(o,10):"number"==typeof t&&a(o,t);return l&&(t=l[0],e=l[1]),r.domain(Fi(i,e>1?{floor:function(e){for(;n(e=t.floor(e));)e=Xo(e-1);return e},ceil:function(e){for(;n(e=t.ceil(e));)e=Xo(+e+1);return e}}:t))},r.ticks=function(t,e){var n=Hi(r.domain()),i=null==t?a(n,10):"number"==typeof t?a(n,t):!t.range&&[{range:t},e];return i&&(t=i[0],e=i[1]),t.range(n[0],Xo(+n[1]+1),1>e?1:e)},r.tickFormat=function(){return n},r.copy=function(){return Zo(t.copy(),e,n)},Wi(r,t)}function Xo(t){return new Date(t)}function Qo(t){return JSON.parse(t.responseText)}function Jo(t){var e=el.createRange();return e.selectNode(el.body),e.createContextualFragment(t.responseText)}var Go={version:"3.4.6"};Date.now||(Date.now=function(){return+new Date});var Ko=[].slice,tl=function(t){return Ko.call(t)},el=document,nl=el.documentElement,rl=window;try{tl(nl.childNodes)[0].nodeType}catch(al){tl=function(t){for(var e=t.length,n=new Array(e);e--;)n[e]=t[e];return n}}try{el.createElement("div").style.setProperty("opacity",0,"")}catch(il){var ol=rl.Element.prototype,ll=ol.setAttribute,sl=ol.setAttributeNS,ul=rl.CSSStyleDeclaration.prototype,cl=ul.setProperty;ol.setAttribute=function(t,e){ll.call(this,t,e+"")},ol.setAttributeNS=function(t,e,n){sl.call(this,t,e,n+"")},ul.setProperty=function(t,e,n){cl.call(this,t,e+"",n)}}Go.ascending=t,Go.descending=function(t,e){return t>e?-1:e>t?1:e>=t?0:0/0},Go.min=function(t,e){var n=-1,r=t.length,a,i;if(1===arguments.length){for(;++n<r&&!(null!=(a=t[n])&&a>=a);)a=void 0;for(;++n<r;)null!=(i=t[n])&&a>i&&(a=i)}else{for(;++n<r&&!(null!=(a=e.call(t,t[n],n))&&a>=a);)a=void 0;for(;++n<r;)null!=(i=e.call(t,t[n],n))&&a>i&&(a=i)}return a},Go.max=function(t,e){var n=-1,r=t.length,a,i;if(1===arguments.length){for(;++n<r&&!(null!=(a=t[n])&&a>=a);)a=void 0;for(;++n<r;)null!=(i=t[n])&&i>a&&(a=i)}else{for(;++n<r&&!(null!=(a=e.call(t,t[n],n))&&a>=a);)a=void 0;for(;++n<r;)null!=(i=e.call(t,t[n],n))&&i>a&&(a=i)}return a},Go.extent=function(t,e){var n=-1,r=t.length,a,i,o;if(1===arguments.length){for(;++n<r&&!(null!=(a=o=t[n])&&a>=a);)a=o=void 0;for(;++n<r;)null!=(i=t[n])&&(a>i&&(a=i),i>o&&(o=i))}else{for(;++n<r&&!(null!=(a=o=e.call(t,t[n],n))&&a>=a);)a=void 0;for(;++n<r;)null!=(i=e.call(t,t[n],n))&&(a>i&&(a=i),i>o&&(o=i))}return[a,o]},Go.sum=function(t,e){var n=0,r=t.length,a,i=-1;if(1===arguments.length)for(;++i<r;)isNaN(a=+t[i])||(n+=a);else for(;++i<r;)isNaN(a=+e.call(t,t[i],i))||(n+=a);return n},Go.mean=function(t,n){var r=0,a=t.length,i,o=-1,l=a;if(1===arguments.length)for(;++o<a;)e(i=t[o])?r+=i:--l;else for(;++o<a;)e(i=n.call(t,t[o],o))?r+=i:--l;return l?r/l:void 0},Go.quantile=function(t,e){var n=(t.length-1)*e+1,r=Math.floor(n),a=+t[r-1],i=n-r;return i?a+i*(t[r]-a):a},Go.median=function(n,r){return arguments.length>1&&(n=n.map(r)),n=n.filter(e),n.length?Go.quantile(n.sort(t),.5):void 0};var dl=n(t);Go.bisectLeft=dl.left,Go.bisect=Go.bisectRight=dl.right,Go.bisector=function(e){return n(1===e.length?function(n,r){return t(e(n),r)}:e)},Go.shuffle=function(t){for(var e=t.length,n,r;e;)r=Math.random()*e--|0,n=t[e],t[e]=t[r],t[r]=n;return t},Go.permute=function(t,e){for(var n=e.length,r=new Array(n);n--;)r[n]=t[e[n]];return r},Go.pairs=function(t){for(var e=0,n=t.length-1,r,a=t[0],i=new Array(0>n?0:n);n>e;)i[e]=[r=a,a=t[++e]];return i},Go.zip=function(){if(!(i=arguments.length))return[];for(var t=-1,e=Go.min(arguments,r),n=new Array(e);++t<e;)for(var a=-1,i,o=n[t]=new Array(i);++a<i;)o[a]=arguments[a][t];return n},Go.transpose=function(t){return Go.zip.apply(Go,t)},Go.keys=function(t){var e=[];for(var n in t)e.push(n);return e},Go.values=function(t){var e=[];for(var n in t)e.push(t[n]);return e},Go.entries=function(t){var e=[];for(var n in t)e.push({key:n,value:t[n]});return e},Go.merge=function(t){for(var e=t.length,n,r=-1,a=0,i,o;++r<e;)a+=t[r].length;for(i=new Array(a);--e>=0;)for(o=t[e],n=o.length;--n>=0;)i[--a]=o[n];return i};var pl=Math.abs;Go.range=function(t,e,n){if(arguments.length<3&&(n=1,arguments.length<2&&(e=t,t=0)),(e-t)/n===1/0)throw new Error("infinite range");var r=[],i=a(pl(n)),o=-1,l;if(t*=i,e*=i,n*=i,0>n)for(;(l=t+n*++o)>e;)r.push(l/i);else for(;(l=t+n*++o)<e;)r.push(l/i);return r},Go.map=function(t){var e=new o;if(t instanceof o)t.forEach(function(t,n){e.set(t,n)});else for(var n in t)e.set(n,t[n]);return e},i(o,{has:l,get:function(t){return this[fl+t]},set:function(t,e){return this[fl+t]=e},remove:s,keys:u,values:function(){var t=[];return this.forEach(function(e,n){t.push(n)}),t},entries:function(){var t=[];return this.forEach(function(e,n){t.push({key:e,value:n})}),t},size:c,empty:d,forEach:function(t){for(var e in this)e.charCodeAt(0)===hl&&t.call(this,e.substring(1),this[e])}});var fl="\x00",hl=fl.charCodeAt(0);Go.nest=function(){function t(e,a,s){if(s>=r.length)return l?l.call(n,a):i?a.sort(i):a;for(var u=-1,c=a.length,d=r[s++],p,f,h,g=new o,v;++u<c;)(v=g.get(p=d(f=a[u])))?v.push(f):g.set(p,[f]);return e?(f=e(),h=function(n,r){f.set(n,t(e,r,s))}):(f={},h=function(n,r){f[n]=t(e,r,s)}),g.forEach(h),f}function e(t,n){if(n>=r.length)return t;var i=[],o=a[n++];return t.forEach(function(t,r){i.push({key:t,values:e(r,n)})}),o?i.sort(function(t,e){return o(t.key,e.key)}):i}var n={},r=[],a=[],i,l;return n.map=function(e,n){return t(n,e,0)},n.entries=function(n){return e(t(Go.map,n,0),0)},n.key=function(t){return r.push(t),n},n.sortKeys=function(t){return a[r.length-1]=t,n},n.sortValues=function(t){return i=t,n},n.rollup=function(t){return l=t,n},n},Go.set=function(t){var e=new p;if(t)for(var n=0,r=t.length;r>n;++n)e.add(t[n]);return e},i(p,{has:l,add:function(t){return this[fl+t]=!0,t},remove:function(t){return t=fl+t,t in this&&delete this[t]},values:u,size:c,empty:d,forEach:function(t){for(var e in this)e.charCodeAt(0)===hl&&t.call(this,e.substring(1))}}),Go.behavior={},Go.rebind=function(t,e){for(var n=1,r=arguments.length,a;++n<r;)t[a=arguments[n]]=f(t,e,e[a]);return t};var gl=["webkit","ms","moz","Moz","o","O"];Go.dispatch=function(){for(var t=new v,e=-1,n=arguments.length;++e<n;)t[arguments[e]]=y(t);return t},v.prototype.on=function(t,e){var n=t.indexOf("."),r="";if(n>=0&&(r=t.substring(n+1),t=t.substring(0,n)),t)return arguments.length<2?this[t].on(r):this[t].on(r,e);if(2===arguments.length){if(null==e)for(t in this)this.hasOwnProperty(t)&&this[t].on(r,null);return this}},Go.event=null,Go.requote=function(t){return t.replace(vl,"\\$&")};var vl=/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g,yl={}.__proto__?function(t,e){t.__proto__=e}:function(t,e){for(var n in e)t[n]=e[n]},ml=function(t,e){return e.querySelector(t)},bl=function(t,e){return e.querySelectorAll(t)},xl=nl[h(nl,"matchesSelector")],_l=function(t,e){return xl.call(t,e)};"function"==typeof Sizzle&&(ml=function(t,e){return Sizzle(t,e)[0]||null},bl=Sizzle,_l=Sizzle.matchesSelector),Go.selection=function(){return Sl};var wl=Go.selection.prototype=[];wl.select=function(t){var e=[],n,r,a,i;t=w(t);for(var o=-1,l=this.length;++o<l;){e.push(n=[]),n.parentNode=(a=this[o]).parentNode;for(var s=-1,u=a.length;++s<u;)(i=a[s])?(n.push(r=t.call(i,i.__data__,s,o)),r&&"__data__"in i&&(r.__data__=i.__data__)):n.push(null)}return _(e)},wl.selectAll=function(t){var e=[],n,r;t=k(t);for(var a=-1,i=this.length;++a<i;)for(var o=this[a],l=-1,s=o.length;++l<s;)(r=o[l])&&(e.push(n=tl(t.call(r,r.__data__,l,a))),n.parentNode=r);return _(e)};var kl={svg:"http://www.w3.org/2000/svg",xhtml:"http://www.w3.org/1999/xhtml",xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};Go.ns={prefix:kl,qualify:function(t){var e=t.indexOf(":"),n=t;return e>=0&&(n=t.substring(0,e),t=t.substring(e+1)),kl.hasOwnProperty(n)?{space:kl[n],local:t}:t}},wl.attr=function(t,e){if(arguments.length<2){if("string"==typeof t){var n=this.node();return t=Go.ns.qualify(t),t.local?n.getAttributeNS(t.space,t.local):n.getAttribute(t)}for(e in t)this.each(z(e,t[e]));return this}return this.each(z(t,e))},wl.classed=function(t,e){if(arguments.length<2){if("string"==typeof t){var n=this.node(),r=(t=E(t)).length,a=-1;if(e=n.classList){for(;++a<r;)if(!e.contains(t[a]))return!1}else for(e=n.getAttribute("class");++a<r;)if(!M(t[a]).test(e))return!1;return!0}for(e in t)this.each(C(e,t[e]));return this}return this.each(C(t,e))},wl.style=function(t,e,n){var r=arguments.length;if(3>r){if("string"!=typeof t){2>r&&(e="");for(n in t)this.each(T(n,t[n],e));return this}if(2>r)return rl.getComputedStyle(this.node(),null).getPropertyValue(t);n=""}return this.each(T(t,e,n))},wl.property=function(t,e){if(arguments.length<2){if("string"==typeof t)return this.node()[t];for(e in t)this.each(O(e,t[e]));return this}return this.each(O(t,e))},wl.text=function(t){return arguments.length?this.each("function"==typeof t?function(){var e=t.apply(this,arguments);this.textContent=null==e?"":e}:null==t?function(){this.textContent=""}:function(){this.textContent=t}):this.node().textContent},wl.html=function(t){return arguments.length?this.each("function"==typeof t?function(){var e=t.apply(this,arguments);this.innerHTML=null==e?"":e}:null==t?function(){this.innerHTML=""}:function(){this.innerHTML=t}):this.node().innerHTML},wl.append=function(t){return t=B(t),this.select(function(){return this.appendChild(t.apply(this,arguments))})},wl.insert=function(t,e){return t=B(t),e=w(e),this.select(function(){return this.insertBefore(t.apply(this,arguments),e.apply(this,arguments)||null)})},wl.remove=function(){return this.each(function(){var t=this.parentNode;t&&t.removeChild(this)})},wl.data=function(t,e){function n(t,n){var r,a=t.length,i=n.length,l=Math.min(a,i),d=new Array(i),p=new Array(i),f=new Array(a),h,g;if(e){var v=new o,y=new o,m=[],b;for(r=-1;++r<a;)b=e.call(h=t[r],h.__data__,r),v.has(b)?f[r]=h:v.set(b,h),m.push(b);for(r=-1;++r<i;)b=e.call(n,g=n[r],r),(h=v.get(b))?(d[r]=h,h.__data__=g):y.has(b)||(p[r]=N(g)),y.set(b,g),v.remove(b);for(r=-1;++r<a;)v.has(m[r])&&(f[r]=t[r])}else{for(r=-1;++r<l;)h=t[r],g=n[r],h?(h.__data__=g,d[r]=h):p[r]=N(g);for(;i>r;++r)p[r]=N(n[r]);for(;a>r;++r)f[r]=t[r]}p.update=d,p.parentNode=d.parentNode=f.parentNode=t.parentNode,s.push(p),u.push(d),c.push(f)}var r=-1,a=this.length,i,l;if(!arguments.length){for(t=new Array(a=(i=this[0]).length);++r<a;)(l=i[r])&&(t[r]=l.__data__);return t}var s=$([]),u=_([]),c=_([]);if("function"==typeof t)for(;++r<a;)n(i=this[r],t.call(i,i.parentNode.__data__,r));else for(;++r<a;)n(i=this[r],t);return u.enter=function(){return s},u.exit=function(){return c},u},wl.datum=function(t){return arguments.length?this.property("__data__",t):this.property("__data__")},wl.filter=function(t){var e=[],n,r,a;"function"!=typeof t&&(t=D(t));for(var i=0,o=this.length;o>i;i++){e.push(n=[]),n.parentNode=(r=this[i]).parentNode;for(var l=0,s=r.length;s>l;l++)(a=r[l])&&t.call(a,a.__data__,l,i)&&n.push(a)}return _(e)},wl.order=function(){for(var t=-1,e=this.length;++t<e;)for(var n=this[t],r=n.length-1,a=n[r],i;--r>=0;)(i=n[r])&&(a&&a!==i.nextSibling&&a.parentNode.insertBefore(i,a),a=i);return this},wl.sort=function(t){t=j.apply(this,arguments);for(var e=-1,n=this.length;++e<n;)this[e].sort(t);return this.order()},wl.each=function(t){return P(this,function(e,n,r){t.call(e,e.__data__,n,r)})},wl.call=function(t){var e=tl(arguments);return t.apply(e[0]=this,e),this},wl.empty=function(){return!this.node()},wl.node=function(){for(var t=0,e=this.length;e>t;t++)for(var n=this[t],r=0,a=n.length;a>r;r++){var i=n[r];if(i)return i}return null},wl.size=function(){var t=0;return this.each(function(){++t}),t};var zl=[];Go.selection.enter=$,Go.selection.enter.prototype=zl,zl.append=wl.append,zl.empty=wl.empty,zl.node=wl.node,zl.call=wl.call,zl.size=wl.size,zl.select=function(t){for(var e=[],n,r,a,i,o,l=-1,s=this.length;++l<s;){a=(i=this[l]).update,e.push(n=[]),n.parentNode=i.parentNode;for(var u=-1,c=i.length;++u<c;)(o=i[u])?(n.push(a[u]=r=t.call(i.parentNode,o.__data__,u,l)),r.__data__=o.__data__):n.push(null)}return _(e)},zl.insert=function(t,e){return arguments.length<2&&(e=q(this)),wl.insert.call(this,t,e)},wl.transition=function(){for(var t=ju||++Du,e=[],n,r,a=Pu||{time:Date.now(),ease:za,delay:0,duration:250},i=-1,o=this.length;++i<o;){e.push(n=[]);for(var l=this[i],s=-1,u=l.length;++s<u;)(r=l[s])&&Ro(r,s,t,a),n.push(r)}return Yo(e,t)},wl.interrupt=function(){return this.each(H)},Go.select=function(t){var e=["string"==typeof t?ml(t,el):t];return e.parentNode=nl,_([e])},Go.selectAll=function(t){var e=tl("string"==typeof t?bl(t,el):t);return e.parentNode=nl,_([e])};var Sl=Go.select(nl);wl.on=function(t,e,n){var r=arguments.length;if(3>r){if("string"!=typeof t){2>r&&(e=!1);for(n in t)this.each(L(n,t[n],e));return this}if(2>r)return(r=this.node()["__on"+t])&&r._;n=!1}return this.each(L(t,e,n))};var Ml=Go.map({mouseenter:"mouseover",mouseleave:"mouseout"});Ml.forEach(function(t){"on"+t in el&&Ml.remove(t)});var El="onselectstart"in el?null:h(nl.style,"userSelect"),Cl=0;Go.mouse=function(t){return R(t,b())},Go.touches=function(t,e){return arguments.length<2&&(e=b().touches),e?tl(e).map(function(e){var n=R(t,e);return n.identifier=e.identifier,n}):[]},Go.behavior.drag=function(){function t(){this.on("mousedown.drag",a).on("touchstart.drag",i)}function e(t,e,a,i,o){return function(){function l(){var t=e(d,h),n,r;t&&(n=t[0]-b[0],r=t[1]-b[1],f|=n|r,b=t,p({type:"drag",x:t[0]+v[0],y:t[1]+v[1],dx:n,dy:r}))}function s(){e(d,h)&&(y.on(i+g,null).on(o+g,null),m(f&&Go.event.target===c),p({type:"dragend"}))}var u=this,c=Go.event.target,d=u.parentNode,p=n.of(u,arguments),f=0,h=t(),g=".drag"+(null==h?"":"-"+h),v,y=Go.select(a()).on(i+g,l).on(o+g,s),m=I(),b=e(d,h);r?(v=r.apply(u,arguments),v=[v.x-b[0],v.y-b[1]]):v=[0,0],p({type:"dragstart"})}}var n=x(t,"drag","dragstart","dragend"),r=null,a=e(g,Go.mouse,V,"mousemove","mouseup"),i=e(U,Go.touch,W,"touchmove","touchend");return t.origin=function(e){return arguments.length?(r=e,t):r},Go.rebind(t,n,"on")};var Al=Math.PI,Tl=2*Al,Ol=Al/2,Bl=1e-6,Nl=Bl*Bl,Dl=Al/180,jl=180/Al,Pl=Math.SQRT2,$l=2,ql=4;Go.interpolateZoom=function(t,e){function n(t){var e=t*m;if(y){var n=K(g),o=i/($l*p)*(n*te(Pl*e+g)-G(g));return[r+o*u,a+o*c,i*n/K(Pl*e+g)]}return[r+t*u,a+t*c,i*Math.exp(Pl*e)]}var r=t[0],a=t[1],i=t[2],o=e[0],l=e[1],s=e[2],u=o-r,c=l-a,d=u*u+c*c,p=Math.sqrt(d),f=(s*s-i*i+ql*d)/(2*i*$l*p),h=(s*s-i*i-ql*d)/(2*s*$l*p),g=Math.log(Math.sqrt(f*f+1)-f),v=Math.log(Math.sqrt(h*h+1)-h),y=v-g,m=(y||Math.log(s/i))/Pl;return n.duration=1e3*m,n},Go.behavior.zoom=function(){function t(t){t.on(_,u).on(Yl+".zoom",d).on(w,p).on("dblclick.zoom",f).on(S,c)}function e(t){return[(t[0]-h.x)/h.k,(t[1]-h.y)/h.k]}function n(t){return[t[0]*h.k+h.x,t[1]*h.k+h.y]}function r(t){h.k=Math.max(b[0],Math.min(b[1],t))}function a(t,e){e=n(e),h.x+=t[0]-e[0],h.y+=t[1]-e[1]}function i(){A&&A.domain(C.range().map(function(t){return(t-h.x)/h.k}).map(C.invert)),O&&O.domain(T.range().map(function(t){return(t-h.y)/h.k}).map(T.invert))}function o(t){t({type:"zoomstart"})}function l(t){i(),t({type:"zoom",scale:h.k,translate:[h.x,h.y]})}function s(t){t({type:"zoomend"})}function u(){function t(){c=1,a(Go.mouse(r),f),l(u)}function n(){d.on(w,rl===r?p:null).on(k,null),h(c&&Go.event.target===i),s(u)}var r=this,i=Go.event.target,u=E.of(r,arguments),c=0,d=Go.select(rl).on(w,t).on(k,n),f=e(Go.mouse(r)),h=I();H.call(r),o(u)}function c(){function t(){var t=Go.touches(p);return y=h.k,t.forEach(function(t){t.identifier in g&&(g[t.identifier]=e(t))}),t}function n(){for(var e=Go.event.changedTouches,n=0,i=e.length;i>n;++n)g[e[n].identifier]=null;var o=t(),s=Date.now();if(1===o.length){if(500>s-M){var u=o[0],c=g[u.identifier];r(2*h.k),a(u,c),m(),l(f)}M=s}else if(o.length>1){var u=o[0],d=o[1],p=u[0]-d[0],y=u[1]-d[1];v=p*p+y*y}}function i(){for(var t=Go.touches(p),e,n,i,o,s=0,u=t.length;u>s;++s,o=null)if(i=t[s],o=g[i.identifier]){if(n)break;e=i,n=o}if(o){var c=(c=i[0]-e[0])*c+(c=i[1]-e[1])*c,d=v&&Math.sqrt(c/v);e=[(e[0]+i[0])/2,(e[1]+i[1])/2],n=[(n[0]+o[0])/2,(n[1]+o[1])/2],r(d*y)}M=null,a(e,n),l(f)}function d(){if(Go.event.touches.length){for(var e=Go.event.changedTouches,n=0,r=e.length;r>n;++n)delete g[e[n].identifier];for(var a in g)return void t()}k.on(b,null),z.on(_,u).on(S,c),C(),s(f)}var p=this,f=E.of(p,arguments),g={},v=0,y,b=".zoom-"+Go.event.changedTouches[0].identifier,x="touchmove"+b,w="touchend"+b,k=Go.select(Go.event.target).on(x,i).on(w,d),z=Go.select(p).on(_,null).on(S,n),C=I();H.call(p),n(),o(f)}function d(){var t=E.of(this,arguments);z?clearTimeout(z):(H.call(this),o(t)),z=setTimeout(function(){z=null,s(t)},50),m();var n=v||Go.mouse(this);g||(g=e(n)),r(Math.pow(2,.002*Ll())*h.k),a(n,g),l(t)}function p(){g=null}function f(){var t=E.of(this,arguments),n=Go.mouse(this),i=e(n),u=Math.log(h.k)/Math.LN2;o(t),r(Math.pow(2,Go.event.shiftKey?Math.ceil(u)-1:Math.floor(u)+1)),a(n,i),l(t),s(t)}var h={x:0,y:0,k:1},g,v,y=[960,500],b=Hl,_="mousedown.zoom",w="mousemove.zoom",k="mouseup.zoom",z,S="touchstart.zoom",M,E=x(t,"zoomstart","zoom","zoomend"),C,A,T,O;return t.event=function(t){t.each(function(){var t=E.of(this,arguments),e=h;ju?Go.select(this).transition().each("start.zoom",function(){h=this.__chart__||{x:0,y:0,k:1},o(t)}).tween("zoom:zoom",function(){var n=y[0],r=y[1],a=n/2,i=r/2,o=Go.interpolateZoom([(a-h.x)/h.k,(i-h.y)/h.k,n/h.k],[(a-e.x)/e.k,(i-e.y)/e.k,n/e.k]);return function(e){var r=o(e),s=n/r[2];this.__chart__=h={x:a-r[0]*s,y:i-r[1]*s,k:s},l(t)}}).each("end.zoom",function(){s(t)}):(this.__chart__=h,o(t),l(t),s(t))})},t.translate=function(e){return arguments.length?(h={x:+e[0],y:+e[1],k:h.k},i(),t):[h.x,h.y]},t.scale=function(e){return arguments.length?(h={x:h.x,y:h.y,k:+e},i(),t):h.k},t.scaleExtent=function(e){return arguments.length?(b=null==e?Hl:[+e[0],+e[1]],t):b},t.center=function(e){return arguments.length?(v=e&&[+e[0],+e[1]],t):v},t.size=function(e){return arguments.length?(y=e&&[+e[0],+e[1]],t):y},t.x=function(e){return arguments.length?(A=e,C=e.copy(),h={x:0,y:0,k:1},t):A},t.y=function(e){return arguments.length?(O=e,T=e.copy(),h={x:0,y:0,k:1},t):O},Go.rebind(t,E,"on")};var Hl=[0,1/0],Ll,Yl="onwheel"in el?(Ll=function(){return-Go.event.deltaY*(Go.event.deltaMode?120:1)},"wheel"):"onmousewheel"in el?(Ll=function(){return Go.event.wheelDelta},"mousewheel"):(Ll=function(){return-Go.event.detail},"MozMousePixelScroll");ne.prototype.toString=function(){return this.rgb()+""},Go.hsl=function(t,e,n){return 1===arguments.length?t instanceof ae?re(t.h,t.s,t.l):_e(""+t,we,re):re(+t,+e,+n)};var Fl=ae.prototype=new ne;Fl.brighter=function(t){return t=Math.pow(.7,arguments.length?t:1),re(this.h,this.s,this.l/t)},Fl.darker=function(t){return t=Math.pow(.7,arguments.length?t:1),re(this.h,this.s,t*this.l)},Fl.rgb=function(){return ie(this.h,this.s,this.l)},Go.hcl=function(t,e,n){return 1===arguments.length?t instanceof le?oe(t.h,t.c,t.l):t instanceof ce?pe(t.l,t.a,t.b):pe((t=ke((t=Go.rgb(t)).r,t.g,t.b)).l,t.a,t.b):oe(+t,+e,+n)};var Il=le.prototype=new ne;Il.brighter=function(t){return oe(this.h,this.c,Math.min(100,this.l+Rl*(arguments.length?t:1)))},Il.darker=function(t){return oe(this.h,this.c,Math.max(0,this.l-Rl*(arguments.length?t:1)))},Il.rgb=function(){return se(this.h,this.c,this.l).rgb()},Go.lab=function(t,e,n){return 1===arguments.length?t instanceof ce?ue(t.l,t.a,t.b):t instanceof le?se(t.l,t.c,t.h):ke((t=Go.rgb(t)).r,t.g,t.b):ue(+t,+e,+n)};var Rl=18,Ul=.95047,Wl=1,Vl=1.08883,Zl=ce.prototype=new ne;Zl.brighter=function(t){return ue(Math.min(100,this.l+Rl*(arguments.length?t:1)),this.a,this.b)},Zl.darker=function(t){return ue(Math.max(0,this.l-Rl*(arguments.length?t:1)),this.a,this.b)},Zl.rgb=function(){return de(this.l,this.a,this.b)},Go.rgb=function(t,e,n){return 1===arguments.length?t instanceof be?me(t.r,t.g,t.b):_e(""+t,me,ie):me(~~t,~~e,~~n)};var Xl=be.prototype=new ne;Xl.brighter=function(t){t=Math.pow(.7,arguments.length?t:1);var e=this.r,n=this.g,r=this.b,a=30;return e||n||r?(e&&a>e&&(e=a),n&&a>n&&(n=a),r&&a>r&&(r=a),me(Math.min(255,~~(e/t)),Math.min(255,~~(n/t)),Math.min(255,~~(r/t)))):me(a,a,a)},Xl.darker=function(t){return t=Math.pow(.7,arguments.length?t:1),me(~~(t*this.r),~~(t*this.g),~~(t*this.b))},Xl.hsl=function(){return we(this.r,this.g,this.b)},Xl.toString=function(){return"#"+xe(this.r)+xe(this.g)+xe(this.b)};var Ql=Go.map({aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074});
Ql.forEach(function(t,e){Ql.set(t,ve(e))}),Go.functor=Me,Go.xhr=Ce(Ee),Go.dsv=function(t,e){function n(t,n,i){arguments.length<3&&(i=n,n=null);var o=Ae(t,e,null==n?r:a(n),i);return o.row=function(t){return arguments.length?o.response(null==(n=t)?r:a(t)):n},o}function r(t){return n.parse(t.responseText)}function a(t){return function(e){return n.parse(e.responseText,t)}}function i(e){return e.map(o).join(t)}function o(t){return l.test(t)?'"'+t.replace(/\"/g,'""')+'"':t}var l=new RegExp('["'+t+"\n]"),s=t.charCodeAt(0);return n.parse=function(t,e){var r;return n.parseRows(t,function(t,n){if(r)return r(t,n-1);var a=new Function("d","return {"+t.map(function(t,e){return JSON.stringify(t)+": d["+e+"]"}).join(",")+"}");r=e?function(t,n){return e(a(t),n)}:a})},n.parseRows=function(t,e){function n(){if(l>=o)return a;if(d)return d=!1,r;var e=l;if(34===t.charCodeAt(e)){for(var n=e;n++<o;)if(34===t.charCodeAt(n)){if(34!==t.charCodeAt(n+1))break;++n}l=n+2;var i=t.charCodeAt(n+1);return 13===i?(d=!0,10===t.charCodeAt(n+2)&&++l):10===i&&(d=!0),t.substring(e+1,n).replace(/""/g,'"')}for(;o>l;){var i=t.charCodeAt(l++),u=1;if(10===i)d=!0;else if(13===i)d=!0,10===t.charCodeAt(l)&&(++l,++u);else if(i!==s)continue;return t.substring(e,l-u)}return t.substring(e)}for(var r={},a={},i=[],o=t.length,l=0,u=0,c,d;(c=n())!==a;){for(var p=[];c!==r&&c!==a;)p.push(c),c=n();(!e||(p=e(p,u++)))&&i.push(p)}return i},n.format=function(e){if(Array.isArray(e[0]))return n.formatRows(e);var r=new p,a=[];return e.forEach(function(t){for(var e in t)r.has(e)||a.push(r.add(e))}),[a.map(o).join(t)].concat(e.map(function(e){return a.map(function(t){return o(e[t])}).join(t)})).join("\n")},n.formatRows=function(t){return t.map(i).join("\n")},n},Go.csv=Go.dsv(",","text/csv"),Go.tsv=Go.dsv("	","text/tab-separated-values"),Go.touch=function(t,e,n){if(arguments.length<3&&(n=e,e=b().changedTouches),e)for(var r=0,a=e.length,i;a>r;++r)if((i=e[r]).identifier===n)return R(t,i)};var Jl,Gl,Kl,ts,es,ns=rl[h(rl,"requestAnimationFrame")]||function(t){setTimeout(t,17)};Go.timer=function(t,e,n){var r=arguments.length;2>r&&(e=0),3>r&&(n=Date.now());var a=n+e,i={c:t,t:a,f:!1,n:null};Gl?Gl.n=i:Jl=i,Gl=i,Kl||(ts=clearTimeout(ts),Kl=1,ns(Oe))},Go.timer.flush=function(){Be(),Ne()},Go.round=function(t,e){return e?Math.round(t*(e=Math.pow(10,e)))/e:Math.round(t)};var rs=["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"].map(je);Go.formatPrefix=function(t,e){var n=0;return t&&(0>t&&(t*=-1),e&&(t=Go.round(t,De(t,e))),n=1+Math.floor(1e-12+Math.log(t)/Math.LN10),n=Math.max(-24,Math.min(24,3*Math.floor((n-1)/3)))),rs[8+n/3]};var as=/(?:([^{])?([<>=^]))?([+\- ])?([$#])?(0)?(\d+)?(,)?(\.-?\d+)?([a-z%])?/i,is=Go.map({b:function(t){return t.toString(2)},c:function(t){return String.fromCharCode(t)},o:function(t){return t.toString(8)},x:function(t){return t.toString(16)},X:function(t){return t.toString(16).toUpperCase()},g:function(t,e){return t.toPrecision(e)},e:function(t,e){return t.toExponential(e)},f:function(t,e){return t.toFixed(e)},r:function(t,e){return(t=Go.round(t,De(t,e))).toFixed(Math.max(0,Math.min(20,De(t*(1+1e-15),e))))}}),os=Go.time={},ls=Date;qe.prototype={getDate:function(){return this._.getUTCDate()},getDay:function(){return this._.getUTCDay()},getFullYear:function(){return this._.getUTCFullYear()},getHours:function(){return this._.getUTCHours()},getMilliseconds:function(){return this._.getUTCMilliseconds()},getMinutes:function(){return this._.getUTCMinutes()},getMonth:function(){return this._.getUTCMonth()},getSeconds:function(){return this._.getUTCSeconds()},getTime:function(){return this._.getTime()},getTimezoneOffset:function(){return 0},valueOf:function(){return this._.valueOf()},setDate:function(){ss.setUTCDate.apply(this._,arguments)},setDay:function(){ss.setUTCDay.apply(this._,arguments)},setFullYear:function(){ss.setUTCFullYear.apply(this._,arguments)},setHours:function(){ss.setUTCHours.apply(this._,arguments)},setMilliseconds:function(){ss.setUTCMilliseconds.apply(this._,arguments)},setMinutes:function(){ss.setUTCMinutes.apply(this._,arguments)},setMonth:function(){ss.setUTCMonth.apply(this._,arguments)},setSeconds:function(){ss.setUTCSeconds.apply(this._,arguments)},setTime:function(){ss.setTime.apply(this._,arguments)}};var ss=Date.prototype;os.year=He(function(t){return t=os.day(t),t.setMonth(0,1),t},function(t,e){t.setFullYear(t.getFullYear()+e)},function(t){return t.getFullYear()}),os.years=os.year.range,os.years.utc=os.year.utc.range,os.day=He(function(t){var e=new ls(2e3,0);return e.setFullYear(t.getFullYear(),t.getMonth(),t.getDate()),e},function(t,e){t.setDate(t.getDate()+e)},function(t){return t.getDate()-1}),os.days=os.day.range,os.days.utc=os.day.utc.range,os.dayOfYear=function(t){var e=os.year(t);return Math.floor((t-e-6e4*(t.getTimezoneOffset()-e.getTimezoneOffset()))/864e5)},["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].forEach(function(t,e){e=7-e;var n=os[t]=He(function(t){return(t=os.day(t)).setDate(t.getDate()-(t.getDay()+e)%7),t},function(t,e){t.setDate(t.getDate()+7*Math.floor(e))},function(t){var n=os.year(t).getDay();return Math.floor((os.dayOfYear(t)+(n+e)%7)/7)-(n!==e)});os[t+"s"]=n.range,os[t+"s"].utc=n.utc.range,os[t+"OfYear"]=function(t){var n=os.year(t).getDay();return Math.floor((os.dayOfYear(t)+(n+e)%7)/7)}}),os.week=os.sunday,os.weeks=os.sunday.range,os.weeks.utc=os.sunday.utc.range,os.weekOfYear=os.sundayOfYear;var us={"-":"",_:" ",0:"0"},cs=/^\s*\d+/,ds=/^%/;Go.locale=function(t){return{numberFormat:Pe(t),timeFormat:Ye(t)}};var ps=Go.locale({decimal:".",thousands:",",grouping:[3],currency:["$",""],dateTime:"%a %b %e %X %Y",date:"%m/%d/%Y",time:"%H:%M:%S",periods:["AM","PM"],days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],shortDays:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],months:["January","February","March","April","May","June","July","August","September","October","November","December"],shortMonths:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]});Go.format=ps.numberFormat,Go.geo={},un.prototype={s:0,t:0,add:function(t){cn(t,this.t,fs),cn(fs.s,this.s,this),this.s?this.t+=fs.t:this.s=fs.t},reset:function(){this.s=this.t=0},valueOf:function(){return this.s}};var fs=new un;Go.geo.stream=function(t,e){t&&hs.hasOwnProperty(t.type)?hs[t.type](t,e):dn(t,e)};var hs={Feature:function(t,e){dn(t.geometry,e)},FeatureCollection:function(t,e){for(var n=t.features,r=-1,a=n.length;++r<a;)dn(n[r].geometry,e)}},gs={Sphere:function(t,e){e.sphere()},Point:function(t,e){t=t.coordinates,e.point(t[0],t[1],t[2])},MultiPoint:function(t,e){for(var n=t.coordinates,r=-1,a=n.length;++r<a;)t=n[r],e.point(t[0],t[1],t[2])},LineString:function(t,e){pn(t.coordinates,e,0)},MultiLineString:function(t,e){for(var n=t.coordinates,r=-1,a=n.length;++r<a;)pn(n[r],e,0)},Polygon:function(t,e){fn(t.coordinates,e)},MultiPolygon:function(t,e){for(var n=t.coordinates,r=-1,a=n.length;++r<a;)fn(n[r],e)},GeometryCollection:function(t,e){for(var n=t.geometries,r=-1,a=n.length;++r<a;)dn(n[r],e)}};Go.geo.area=function(t){return vs=0,Go.geo.stream(t,ms),vs};var vs,ys=new un,ms={sphere:function(){vs+=4*Al},point:g,lineStart:g,lineEnd:g,polygonStart:function(){ys.reset(),ms.lineStart=hn},polygonEnd:function(){var t=2*ys;vs+=0>t?4*Al+t:t,ms.lineStart=ms.lineEnd=ms.point=g}};Go.geo.bounds=function(){function t(t,e){b.push(x=[c=t,p=t]),d>e&&(d=e),e>f&&(f=e)}function e(e,n){var r=gn([e*Dl,n*Dl]);if(y){var a=yn(y,r),i=[a[1],-a[0],0],o=yn(i,a);xn(o),o=_n(o);var s=e-h,u=s>0?1:-1,g=o[0]*jl*u,v=pl(s)>180;if(v^(g>u*h&&u*e>g)){var m=o[1]*jl;m>f&&(f=m)}else if(g=(g+360)%360-180,v^(g>u*h&&u*e>g)){var m=-o[1]*jl;d>m&&(d=m)}else d>n&&(d=n),n>f&&(f=n);v?h>e?l(c,e)>l(c,p)&&(p=e):l(e,p)>l(c,p)&&(c=e):p>=c?(c>e&&(c=e),e>p&&(p=e)):e>h?l(c,e)>l(c,p)&&(p=e):l(e,p)>l(c,p)&&(c=e)}else t(e,n);y=r,h=e}function n(){_.point=e}function r(){x[0]=c,x[1]=p,_.point=t,y=null}function a(t,n){if(y){var r=t-h;m+=pl(r)>180?r+(r>0?360:-360):r}else g=t,v=n;ms.point(t,n),e(t,n)}function i(){ms.lineStart()}function o(){a(g,v),ms.lineEnd(),pl(m)>Bl&&(c=-(p=180)),x[0]=c,x[1]=p,y=null}function l(t,e){return(e-=t)<0?e+360:e}function s(t,e){return t[0]-e[0]}function u(t,e){return e[0]<=e[1]?e[0]<=t&&t<=e[1]:t<e[0]||e[1]<t}var c,d,p,f,h,g,v,y,m,b,x,_={point:t,lineStart:n,lineEnd:r,polygonStart:function(){_.point=a,_.lineStart=i,_.lineEnd=o,m=0,ms.polygonStart()},polygonEnd:function(){ms.polygonEnd(),_.point=t,_.lineStart=n,_.lineEnd=r,0>ys?(c=-(p=180),d=-(f=90)):m>Bl?f=90:-Bl>m&&(d=-90),x[0]=c,x[1]=p}};return function(t){f=p=-(c=d=1/0),b=[],Go.geo.stream(t,_);var e=b.length;if(e){b.sort(s);for(var n=1,r=b[0],a,i=[r];e>n;++n)a=b[n],u(a[0],r)||u(a[1],r)?(l(r[0],a[1])>l(r[0],r[1])&&(r[1]=a[1]),l(a[0],r[1])>l(r[0],r[1])&&(r[0]=a[0])):i.push(r=a);for(var o=-1/0,h,e=i.length-1,n=0,r=i[e],a;e>=n;r=a,++n)a=i[n],(h=l(r[1],a[0]))>o&&(o=h,c=a[0],p=r[1])}return b=x=null,1/0===c||1/0===d?[[0/0,0/0],[0/0,0/0]]:[[c,d],[p,f]]}}(),Go.geo.centroid=function(t){bs=xs=_s=ws=ks=zs=Ss=Ms=Es=Cs=As=0,Go.geo.stream(t,Ts);var e=Es,n=Cs,r=As,a=e*e+n*n+r*r;return Nl>a&&(e=zs,n=Ss,r=Ms,Bl>xs&&(e=_s,n=ws,r=ks),a=e*e+n*n+r*r,Nl>a)?[0/0,0/0]:[Math.atan2(n,e)*jl,J(r/Math.sqrt(a))*jl]};var bs,xs,_s,ws,ks,zs,Ss,Ms,Es,Cs,As,Ts={sphere:g,point:kn,lineStart:Sn,lineEnd:Mn,polygonStart:function(){Ts.lineStart=En},polygonEnd:function(){Ts.lineStart=Sn}},Os=Bn(Cn,$n,Hn,[-Al,-Al/2]),Bs=1e9;Go.geo.clipExtent=function(){var t,e,n,r,a,i,o={stream:function(t){return a&&(a.valid=!1),a=i(t),a.valid=!0,a},extent:function(l){return arguments.length?(i=Fn(t=+l[0][0],e=+l[0][1],n=+l[1][0],r=+l[1][1]),a&&(a.valid=!1,a=null),o):[[t,e],[n,r]]}};return o.extent([[0,0],[960,500]])},(Go.geo.conicEqualArea=function(){return Rn(Un)}).raw=Un,Go.geo.albers=function(){return Go.geo.conicEqualArea().rotate([96,0]).center([-.6,38.7]).parallels([29.5,45.5]).scale(1070)},Go.geo.albersUsa=function(){function t(t){var e=t[0],n=t[1];return a=null,o(e,n),a||(l(e,n),a)||s(e,n),a}var e=Go.geo.albers(),n=Go.geo.conicEqualArea().rotate([154,0]).center([-2,58.5]).parallels([55,65]),r=Go.geo.conicEqualArea().rotate([157,0]).center([-3,19.9]).parallels([8,18]),a,i={point:function(t,e){a=[t,e]}},o,l,s;return t.invert=function(t){var a=e.scale(),i=e.translate(),o=(t[0]-i[0])/a,l=(t[1]-i[1])/a;return(l>=.12&&.234>l&&o>=-.425&&-.214>o?n:l>=.166&&.234>l&&o>=-.214&&-.115>o?r:e).invert(t)},t.stream=function(t){var a=e.stream(t),i=n.stream(t),o=r.stream(t);return{point:function(t,e){a.point(t,e),i.point(t,e),o.point(t,e)},sphere:function(){a.sphere(),i.sphere(),o.sphere()},lineStart:function(){a.lineStart(),i.lineStart(),o.lineStart()},lineEnd:function(){a.lineEnd(),i.lineEnd(),o.lineEnd()},polygonStart:function(){a.polygonStart(),i.polygonStart(),o.polygonStart()},polygonEnd:function(){a.polygonEnd(),i.polygonEnd(),o.polygonEnd()}}},t.precision=function(a){return arguments.length?(e.precision(a),n.precision(a),r.precision(a),t):e.precision()},t.scale=function(a){return arguments.length?(e.scale(a),n.scale(.35*a),r.scale(a),t.translate(e.translate())):e.scale()},t.translate=function(a){if(!arguments.length)return e.translate();var u=e.scale(),c=+a[0],d=+a[1];return o=e.translate(a).clipExtent([[c-.455*u,d-.238*u],[c+.455*u,d+.238*u]]).stream(i).point,l=n.translate([c-.307*u,d+.201*u]).clipExtent([[c-.425*u+Bl,d+.12*u+Bl],[c-.214*u-Bl,d+.234*u-Bl]]).stream(i).point,s=r.translate([c-.205*u,d+.212*u]).clipExtent([[c-.214*u+Bl,d+.166*u+Bl],[c-.115*u-Bl,d+.234*u-Bl]]).stream(i).point,t},t.scale(1070)};var Ns,Ds,js={point:g,lineStart:g,lineEnd:g,polygonStart:function(){Ds=0,js.lineStart=Wn},polygonEnd:function(){js.lineStart=js.lineEnd=js.point=g,Ns+=pl(Ds/2)}},Ps,$s,qs,Hs,Ls={point:Vn,lineStart:g,lineEnd:g,polygonStart:g,polygonEnd:g},Ys={point:Qn,lineStart:Jn,lineEnd:Gn,polygonStart:function(){Ys.lineStart=Kn},polygonEnd:function(){Ys.point=Qn,Ys.lineStart=Jn,Ys.lineEnd=Gn}};Go.geo.path=function(){function t(t){return t&&("function"==typeof n&&o.pointRadius(+n.apply(this,arguments)),l&&l.valid||(l=i(o)),Go.geo.stream(t,l)),o.result()}function e(){return l=null,t}var n=4.5,r,a,i,o,l;return t.area=function(t){return Ns=0,Go.geo.stream(t,i(js)),Ns},t.centroid=function(t){return _s=ws=ks=zs=Ss=Ms=Es=Cs=As=0,Go.geo.stream(t,i(Ys)),As?[Es/As,Cs/As]:Ms?[zs/Ms,Ss/Ms]:ks?[_s/ks,ws/ks]:[0/0,0/0]},t.bounds=function(t){return qs=Hs=-(Ps=$s=1/0),Go.geo.stream(t,i(Ls)),[[Ps,$s],[qs,Hs]]},t.projection=function(t){return arguments.length?(i=(r=t)?t.stream||nr(t):Ee,e()):r},t.context=function(t){return arguments.length?(o=null==(a=t)?new Zn:new tr(t),"function"!=typeof n&&o.pointRadius(n),e()):a},t.pointRadius=function(e){return arguments.length?(n="function"==typeof e?e:(o.pointRadius(+e),+e),t):n},t.projection(Go.geo.albersUsa()).context(null)},Go.geo.transform=function(t){return{stream:function(e){var n=new rr(e);for(var r in t)n[r]=t[r];return n}}},rr.prototype={point:function(t,e){this.stream.point(t,e)},sphere:function(){this.stream.sphere()},lineStart:function(){this.stream.lineStart()},lineEnd:function(){this.stream.lineEnd()},polygonStart:function(){this.stream.polygonStart()},polygonEnd:function(){this.stream.polygonEnd()}},Go.geo.projection=ir,Go.geo.projectionMutator=or,(Go.geo.equirectangular=function(){return ir(sr)}).raw=sr.invert=sr,Go.geo.rotation=function(t){function e(e){return e=t(e[0]*Dl,e[1]*Dl),e[0]*=jl,e[1]*=jl,e}return t=cr(t[0]%360*Dl,t[1]*Dl,t.length>2?t[2]*Dl:0),e.invert=function(e){return e=t.invert(e[0]*Dl,e[1]*Dl),e[0]*=jl,e[1]*=jl,e},e},ur.invert=sr,Go.geo.circle=function(){function t(){var t="function"==typeof e?e.apply(this,arguments):e,n=cr(-t[0]*Dl,-t[1]*Dl,0).invert,r=[];return a(null,null,1,{point:function(t,e){r.push(t=n(t,e)),t[0]*=jl,t[1]*=jl}}),{type:"Polygon",coordinates:[r]}}var e=[0,0],n,r=6,a;return t.origin=function(n){return arguments.length?(e=n,t):e},t.angle=function(e){return arguments.length?(a=hr((n=+e)*Dl,r*Dl),t):n},t.precision=function(e){return arguments.length?(a=hr(n*Dl,(r=+e)*Dl),t):r},t.angle(90)},Go.geo.distance=function(t,e){var n=(e[0]-t[0])*Dl,r=t[1]*Dl,a=e[1]*Dl,i=Math.sin(n),o=Math.cos(n),l=Math.sin(r),s=Math.cos(r),u=Math.sin(a),c=Math.cos(a),d;return Math.atan2(Math.sqrt((d=c*i)*d+(d=s*u-l*c*o)*d),l*u+s*c*o)},Go.geo.graticule=function(){function t(){return{type:"MultiLineString",coordinates:e()}}function e(){return Go.range(Math.ceil(i/p)*p,a,p).map(v).concat(Go.range(Math.ceil(u/f)*f,s,f).map(y)).concat(Go.range(Math.ceil(r/c)*c,n,c).filter(function(t){return pl(t%p)>Bl}).map(h)).concat(Go.range(Math.ceil(l/d)*d,o,d).filter(function(t){return pl(t%f)>Bl}).map(g))}var n,r,a,i,o,l,s,u,c=10,d=c,p=90,f=360,h,g,v,y,m=2.5;return t.lines=function(){return e().map(function(t){return{type:"LineString",coordinates:t}})},t.outline=function(){return{type:"Polygon",coordinates:[v(i).concat(y(s).slice(1),v(a).reverse().slice(1),y(u).reverse().slice(1))]}},t.extent=function(e){return arguments.length?t.majorExtent(e).minorExtent(e):t.minorExtent()},t.majorExtent=function(e){return arguments.length?(i=+e[0][0],a=+e[1][0],u=+e[0][1],s=+e[1][1],i>a&&(e=i,i=a,a=e),u>s&&(e=u,u=s,s=e),t.precision(m)):[[i,u],[a,s]]},t.minorExtent=function(e){return arguments.length?(r=+e[0][0],n=+e[1][0],l=+e[0][1],o=+e[1][1],r>n&&(e=r,r=n,n=e),l>o&&(e=l,l=o,o=e),t.precision(m)):[[r,l],[n,o]]},t.step=function(e){return arguments.length?t.majorStep(e).minorStep(e):t.minorStep()},t.majorStep=function(e){return arguments.length?(p=+e[0],f=+e[1],t):[p,f]},t.minorStep=function(e){return arguments.length?(c=+e[0],d=+e[1],t):[c,d]},t.precision=function(e){return arguments.length?(m=+e,h=vr(l,o,90),g=yr(r,n,m),v=vr(u,s,90),y=yr(i,a,m),t):m},t.majorExtent([[-180,-90+Bl],[180,90-Bl]]).minorExtent([[-180,-80-Bl],[180,80+Bl]])},Go.geo.greatArc=function(){function t(){return{type:"LineString",coordinates:[n||e.apply(this,arguments),a||r.apply(this,arguments)]}}var e=mr,n,r=br,a;return t.distance=function(){return Go.geo.distance(n||e.apply(this,arguments),a||r.apply(this,arguments))},t.source=function(r){return arguments.length?(e=r,n="function"==typeof r?null:r,t):e},t.target=function(e){return arguments.length?(r=e,a="function"==typeof e?null:e,t):r},t.precision=function(){return arguments.length?t:0},t},Go.geo.interpolate=function(t,e){return xr(t[0]*Dl,t[1]*Dl,e[0]*Dl,e[1]*Dl)},Go.geo.length=function(t){return Fs=0,Go.geo.stream(t,Is),Fs};var Fs,Is={sphere:g,point:g,lineStart:_r,lineEnd:g,polygonStart:g,polygonEnd:g},Rs=wr(function(t){return Math.sqrt(2/(1+t))},function(t){return 2*Math.asin(t/2)});(Go.geo.azimuthalEqualArea=function(){return ir(Rs)}).raw=Rs;var Us=wr(function(t){var e=Math.acos(t);return e&&e/Math.sin(e)},Ee);(Go.geo.azimuthalEquidistant=function(){return ir(Us)}).raw=Us,(Go.geo.conicConformal=function(){return Rn(kr)}).raw=kr,(Go.geo.conicEquidistant=function(){return Rn(zr)}).raw=zr;var Ws=wr(function(t){return 1/t},Math.atan);(Go.geo.gnomonic=function(){return ir(Ws)}).raw=Ws,Sr.invert=function(t,e){return[t,2*Math.atan(Math.exp(e))-Ol]},(Go.geo.mercator=function(){return Mr(Sr)}).raw=Sr;var Vs=wr(function(){return 1},Math.asin);(Go.geo.orthographic=function(){return ir(Vs)}).raw=Vs;var Zs=wr(function(t){return 1/(1+t)},function(t){return 2*Math.atan(t)});(Go.geo.stereographic=function(){return ir(Zs)}).raw=Zs,Er.invert=function(t,e){return[-e,2*Math.atan(Math.exp(t))-Ol]},(Go.geo.transverseMercator=function(){var t=Mr(Er),e=t.center,n=t.rotate;return t.center=function(t){return t?e([-t[1],t[0]]):(t=e(),[-t[1],t[0]])},t.rotate=function(t){return t?n([t[0],t[1],t.length>2?t[2]+90:90]):(t=n(),[t[0],t[1],t[2]-90])},t.rotate([0,0])}).raw=Er,Go.geom={},Go.geom.hull=function(t){function e(t){if(t.length<3)return[];var e=Me(n),a=Me(r),i,o=t.length,l=[],s=[];for(i=0;o>i;i++)l.push([+e.call(this,t[i],i),+a.call(this,t[i],i),i]);for(l.sort(Or),i=0;o>i;i++)s.push([l[i][0],-l[i][1]]);var u=Tr(l),c=Tr(s),d=c[0]===u[0],p=c[c.length-1]===u[u.length-1],f=[];for(i=u.length-1;i>=0;--i)f.push(t[l[u[i]][2]]);for(i=+d;i<c.length-p;++i)f.push(t[l[c[i]][2]]);return f}var n=Cr,r=Ar;return arguments.length?e(t):(e.x=function(t){return arguments.length?(n=t,e):n},e.y=function(t){return arguments.length?(r=t,e):r},e)},Go.geom.polygon=function(t){return yl(t,Xs),t};var Xs=Go.geom.polygon.prototype=[];Xs.area=function(){for(var t=-1,e=this.length,n,r=this[e-1],a=0;++t<e;)n=r,r=this[t],a+=n[1]*r[0]-n[0]*r[1];return.5*a},Xs.centroid=function(t){var e=-1,n=this.length,r=0,a=0,i,o=this[n-1],l;for(arguments.length||(t=-1/(6*this.area()));++e<n;)i=o,o=this[e],l=i[0]*o[1]-o[0]*i[1],r+=(i[0]+o[0])*l,a+=(i[1]+o[1])*l;return[r*t,a*t]},Xs.clip=function(t){for(var e,n=Dr(t),r=-1,a=this.length-Dr(this),i,o,l=this[a-1],s,u,c;++r<a;){for(e=t.slice(),t.length=0,s=this[r],u=e[(o=e.length-n)-1],i=-1;++i<o;)c=e[i],Br(c,l,s)?(Br(u,l,s)||t.push(Nr(u,c,l,s)),t.push(c)):Br(u,l,s)&&t.push(Nr(u,c,l,s)),u=c;n&&t.push(t[0]),l=s}return t};var Qs,Js,Gs,Ks=[],tu,eu,nu=[];Fr.prototype.prepare=function(){for(var t=this.edges,e=t.length,n;e--;)n=t[e].edge,n.b&&n.a||t.splice(e,1);return t.sort(Rr),t.length},ta.prototype={start:function(){return this.edge.l===this.site?this.edge.a:this.edge.b},end:function(){return this.edge.l===this.site?this.edge.b:this.edge.a}},ea.prototype={insert:function(t,e){var n,r,a;if(t){if(e.P=t,e.N=t.N,t.N&&(t.N.P=e),t.N=e,t.R){for(t=t.R;t.L;)t=t.L;t.L=e}else t.R=e;n=t}else this._?(t=ia(this._),e.P=null,e.N=t,t.P=t.L=e,n=t):(e.P=e.N=null,this._=e,n=null);for(e.L=e.R=null,e.U=n,e.C=!0,t=e;n&&n.C;)r=n.U,n===r.L?(a=r.R,a&&a.C?(n.C=a.C=!1,r.C=!0,t=r):(t===n.R&&(ra(this,n),t=n,n=t.U),n.C=!1,r.C=!0,aa(this,r))):(a=r.L,a&&a.C?(n.C=a.C=!1,r.C=!0,t=r):(t===n.L&&(aa(this,n),t=n,n=t.U),n.C=!1,r.C=!0,ra(this,r))),n=t.U;this._.C=!1},remove:function(t){t.N&&(t.N.P=t.P),t.P&&(t.P.N=t.N),t.N=t.P=null;var e=t.U,n,r=t.L,a=t.R,i,o;if(i=r?a?ia(a):r:a,e?e.L===t?e.L=i:e.R=i:this._=i,r&&a?(o=i.C,i.C=t.C,i.L=r,r.U=i,i!==a?(e=i.U,i.U=t.U,t=i.R,e.L=t,i.R=a,a.U=i):(i.U=e,e=i,t=i.R)):(o=t.C,t=i),t&&(t.U=e),!o){if(t&&t.C)return void(t.C=!1);do{if(t===this._)break;if(t===e.L){if(n=e.R,n.C&&(n.C=!1,e.C=!0,ra(this,e),n=e.R),n.L&&n.L.C||n.R&&n.R.C){n.R&&n.R.C||(n.L.C=!1,n.C=!0,aa(this,n),n=e.R),n.C=e.C,e.C=n.R.C=!1,ra(this,e),t=this._;break}}else if(n=e.L,n.C&&(n.C=!1,e.C=!0,aa(this,e),n=e.L),n.L&&n.L.C||n.R&&n.R.C){n.L&&n.L.C||(n.R.C=!1,n.C=!0,ra(this,n),n=e.L),n.C=e.C,e.C=n.L.C=!1,aa(this,e),t=this._;break}n.C=!0,t=e,e=e.U}while(!t.C);t&&(t.C=!1)}}},Go.geom.voronoi=function(t){function e(t){var e=new Array(t.length),r=l[0][0],a=l[0][1],i=l[1][0],o=l[1][1];return oa(n(t),l).cells.forEach(function(n,l){var s=n.edges,u=n.site,c=e[l]=s.length?s.map(function(t){var e=t.start();return[e.x,e.y]}):u.x>=r&&u.x<=i&&u.y>=a&&u.y<=o?[[r,o],[i,o],[i,a],[r,a]]:[];c.point=t[l]}),e}function n(t){return t.map(function(t,e){return{x:Math.round(i(t,e)/Bl)*Bl,y:Math.round(o(t,e)/Bl)*Bl,i:e}})}var r=Cr,a=Ar,i=r,o=a,l=ru;return t?e(t):(e.links=function(t){return oa(n(t)).edges.filter(function(t){return t.l&&t.r}).map(function(e){return{source:t[e.l.i],target:t[e.r.i]}})},e.triangles=function(t){var e=[];return oa(n(t)).cells.forEach(function(n,r){for(var a=n.site,i=n.edges.sort(Rr),o=-1,l=i.length,s,u,c=i[l-1].edge,d=c.l===a?c.r:c.l;++o<l;)s=c,u=d,c=i[o].edge,d=c.l===a?c.r:c.l,r<u.i&&r<d.i&&sa(a,u,d)<0&&e.push([t[r],t[u.i],t[d.i]])}),e},e.x=function(t){return arguments.length?(i=Me(r=t),e):r},e.y=function(t){return arguments.length?(o=Me(a=t),e):a},e.clipExtent=function(t){return arguments.length?(l=null==t?ru:t,e):l===ru?null:l},e.size=function(t){return arguments.length?e.clipExtent(t&&[[0,0],t]):l===ru?null:l&&l[1]},e)};var ru=[[-1e6,-1e6],[1e6,1e6]];Go.geom.delaunay=function(t){return Go.geom.voronoi().triangles(t)},Go.geom.quadtree=function(t,e,n,r,a){function i(t){function i(t,e,n,r,a,i,o,l){if(!isNaN(n)&&!isNaN(r))if(t.leaf){var s=t.x,c=t.y;if(null!=s)if(pl(s-n)+pl(c-r)<.01)u(t,e,n,r,a,i,o,l);else{var d=t.point;t.x=t.y=t.point=null,u(t,d,s,c,a,i,o,l),u(t,e,n,r,a,i,o,l)}else t.x=n,t.y=r,t.point=e}else u(t,e,n,r,a,i,o,l)}function u(t,e,n,r,a,o,l,s){var u=.5*(a+l),c=.5*(o+s),d=n>=u,p=r>=c,f=(p<<1)+d;t.leaf=!1,t=t.nodes[f]||(t.nodes[f]=da()),d?a=u:l=u,p?o=c:s=c,i(t,e,n,r,a,o,l,s)}var c,d=Me(o),p=Me(l),f,h,g,v,y,m,b,x;if(null!=e)y=e,m=n,b=r,x=a;else if(b=x=-(y=m=1/0),f=[],h=[],v=t.length,s)for(g=0;v>g;++g)c=t[g],c.x<y&&(y=c.x),c.y<m&&(m=c.y),c.x>b&&(b=c.x),c.y>x&&(x=c.y),f.push(c.x),h.push(c.y);else for(g=0;v>g;++g){var _=+d(c=t[g],g),w=+p(c,g);y>_&&(y=_),m>w&&(m=w),_>b&&(b=_),w>x&&(x=w),f.push(_),h.push(w)}var k=b-y,z=x-m;k>z?x=m+k:b=y+z;var S=da();if(S.add=function(t){i(S,t,+d(t,++g),+p(t,g),y,m,b,x)},S.visit=function(t){pa(t,S,y,m,b,x)},g=-1,null==e){for(;++g<v;)i(S,t[g],f[g],h[g],y,m,b,x);--g}else t.forEach(S.add);return f=h=t=c=null,S}var o=Cr,l=Ar,s;return(s=arguments.length)?(o=ua,l=ca,3===s&&(a=n,r=e,n=e=0),i(t)):(i.x=function(t){return arguments.length?(o=t,i):o},i.y=function(t){return arguments.length?(l=t,i):l},i.extent=function(t){return arguments.length?(null==t?e=n=r=a=null:(e=+t[0][0],n=+t[0][1],r=+t[1][0],a=+t[1][1]),i):null==e?null:[[e,n],[r,a]]},i.size=function(t){return arguments.length?(null==t?e=n=r=a=null:(e=n=0,r=+t[0],a=+t[1]),i):null==e?null:[r-e,a-n]},i)},Go.interpolateRgb=fa,Go.interpolateObject=ha,Go.interpolateNumber=ga,Go.interpolateString=va;var au=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,iu=new RegExp(au.source,"g");Go.interpolate=ya,Go.interpolators=[function(t,e){var n=typeof e;return("string"===n?Ql.has(e)||/^(#|rgb\(|hsl\()/.test(e)?fa:va:e instanceof ne?fa:Array.isArray(e)?ma:"object"===n&&isNaN(e)?ha:ga)(t,e)}],Go.interpolateArray=ma;var ou=function(){return Ee},lu=Go.map({linear:ou,poly:Sa,quad:function(){return wa},cubic:function(){return ka},sin:function(){return Ma},exp:function(){return Ea},circle:function(){return Ca},elastic:Aa,back:Ta,bounce:function(){return Oa}}),su=Go.map({"in":Ee,out:xa,"in-out":_a,"out-in":function(t){return _a(xa(t))}});Go.ease=function(t){var e=t.indexOf("-"),n=e>=0?t.substring(0,e):t,r=e>=0?t.substring(e+1):"in";return n=lu.get(n)||ou,r=su.get(r)||Ee,ba(r(n.apply(null,Ko.call(arguments,1))))},Go.interpolateHcl=Ba,Go.interpolateHsl=Na,Go.interpolateLab=Da,Go.interpolateRound=ja,Go.transform=function(t){var e=el.createElementNS(Go.ns.prefix.svg,"g");return(Go.transform=function(t){if(null!=t){e.setAttribute("transform",t);var n=e.transform.baseVal.consolidate()}return new Pa(n?n.matrix:uu)})(t)},Pa.prototype.toString=function(){return"translate("+this.translate+")rotate("+this.rotate+")skewX("+this.skew+")scale("+this.scale+")"};var uu={a:1,b:0,c:0,d:1,e:0,f:0};Go.interpolateTransform=La,Go.layout={},Go.layout.bundle=function(){return function(t){for(var e=[],n=-1,r=t.length;++n<r;)e.push(Ia(t[n]));return e}},Go.layout.chord=function(){function t(){var t={},n=[],d=Go.range(o),p=[],f,h,g,v,y;for(r=[],a=[],f=0,v=-1;++v<o;){for(h=0,y=-1;++y<o;)h+=i[v][y];n.push(h),p.push(Go.range(o)),f+=h}for(s&&d.sort(function(t,e){return s(n[t],n[e])}),u&&p.forEach(function(t,e){t.sort(function(t,n){return u(i[e][t],i[e][n])})}),f=(Tl-l*o)/f,h=0,v=-1;++v<o;){for(g=h,y=-1;++y<o;){var m=d[v],b=p[m][y],x=i[m][b],_=h,w=h+=x*f;t[m+"-"+b]={index:m,subindex:b,startAngle:_,endAngle:w,value:x}}a[m]={index:m,startAngle:g,endAngle:h,value:(h-g)/f},h+=l}for(v=-1;++v<o;)for(y=v-1;++y<o;){var k=t[v+"-"+y],z=t[y+"-"+v];(k.value||z.value)&&r.push(k.value<z.value?{source:z,target:k}:{source:k,target:z})}c&&e()}function e(){r.sort(function(t,e){return c((t.source.value+t.target.value)/2,(e.source.value+e.target.value)/2)})}var n={},r,a,i,o,l=0,s,u,c;return n.matrix=function(t){return arguments.length?(o=(i=t)&&i.length,r=a=null,n):i},n.padding=function(t){return arguments.length?(l=t,r=a=null,n):l},n.sortGroups=function(t){return arguments.length?(s=t,r=a=null,n):s},n.sortSubgroups=function(t){return arguments.length?(u=t,r=null,n):u},n.sortChords=function(t){return arguments.length?(c=t,r&&e(),n):c},n.chords=function(){return r||t(),r},n.groups=function(){return a||t(),a},n},Go.layout.force=function(){function t(t){return function(e,n,r,a){if(e.point!==t){var i=e.cx-t.x,o=e.cy-t.y,l=a-n,s=i*i+o*o;if(s>l*l/f){if(d>s){var u=e.charge/s;t.px-=i*u,t.py-=o*u}return!0}if(e.point&&s&&d>s){var u=e.pointCharge/s;t.px-=i*u,t.py-=o*u}}return!e.charge}}function e(t){t.px=Go.event.x,t.py=Go.event.y,n.resume()}var n={},r=Go.dispatch("start","tick","end"),a=[1,1],i,o,l=.9,s=cu,u=du,c=-30,d=pu,p=.1,f=.64,h=[],g=[],v,y,m;return n.tick=function(){if((o*=.99)<.005)return r.end({type:"end",alpha:o=0}),!0;var e=h.length,n=g.length,i,s,u,d,f,b,x,_,w;for(s=0;n>s;++s)u=g[s],d=u.source,f=u.target,_=f.x-d.x,w=f.y-d.y,(b=_*_+w*w)&&(b=o*y[s]*((b=Math.sqrt(b))-v[s])/b,_*=b,w*=b,f.x-=_*(x=d.weight/(f.weight+d.weight)),f.y-=w*x,d.x+=_*(x=1-x),d.y+=w*x);if((x=o*p)&&(_=a[0]/2,w=a[1]/2,s=-1,x))for(;++s<e;)u=h[s],u.x+=(_-u.x)*x,u.y+=(w-u.y)*x;if(c)for(Qa(i=Go.geom.quadtree(h),o,m),s=-1;++s<e;)(u=h[s]).fixed||i.visit(t(u));for(s=-1;++s<e;)u=h[s],u.fixed?(u.x=u.px,u.y=u.py):(u.x-=(u.px-(u.px=u.x))*l,u.y-=(u.py-(u.py=u.y))*l);r.tick({type:"tick",alpha:o})},n.nodes=function(t){return arguments.length?(h=t,n):h},n.links=function(t){return arguments.length?(g=t,n):g},n.size=function(t){return arguments.length?(a=t,n):a},n.linkDistance=function(t){return arguments.length?(s="function"==typeof t?t:+t,n):s},n.distance=n.linkDistance,n.linkStrength=function(t){return arguments.length?(u="function"==typeof t?t:+t,n):u},n.friction=function(t){return arguments.length?(l=+t,n):l},n.charge=function(t){return arguments.length?(c="function"==typeof t?t:+t,n):c},n.chargeDistance=function(t){return arguments.length?(d=t*t,n):Math.sqrt(d)},n.gravity=function(t){return arguments.length?(p=+t,n):p},n.theta=function(t){return arguments.length?(f=t*t,n):Math.sqrt(f)},n.alpha=function(t){return arguments.length?(t=+t,o?o=t>0?t:0:t>0&&(r.start({type:"start",alpha:o=t}),Go.timer(n.tick)),n):o},n.start=function(){function t(t,n){if(!d){for(d=new Array(r),o=0;r>o;++o)d[o]=[];for(o=0;l>o;++o){var a=g[o];d[a.source.index].push(a.target),d[a.target.index].push(a.source)}}for(var i=d[e],o=-1,l=i.length,s;++o<l;)if(!isNaN(s=i[o][t]))return s;return Math.random()*n}var e,r=h.length,i=g.length,o=a[0],l=a[1],d,p;for(e=0;r>e;++e)(p=h[e]).index=e,p.weight=0;for(e=0;i>e;++e)p=g[e],"number"==typeof p.source&&(p.source=h[p.source]),"number"==typeof p.target&&(p.target=h[p.target]),++p.source.weight,++p.target.weight;for(e=0;r>e;++e)p=h[e],isNaN(p.x)&&(p.x=t("x",o)),isNaN(p.y)&&(p.y=t("y",l)),isNaN(p.px)&&(p.px=p.x),isNaN(p.py)&&(p.py=p.y);if(v=[],"function"==typeof s)for(e=0;i>e;++e)v[e]=+s.call(this,g[e],e);else for(e=0;i>e;++e)v[e]=s;if(y=[],"function"==typeof u)for(e=0;i>e;++e)y[e]=+u.call(this,g[e],e);else for(e=0;i>e;++e)y[e]=u;if(m=[],"function"==typeof c)for(e=0;r>e;++e)m[e]=+c.call(this,h[e],e);else for(e=0;r>e;++e)m[e]=c;return n.resume()},n.resume=function(){return n.alpha(.1)},n.stop=function(){return n.alpha(0)},n.drag=function(){return i||(i=Go.behavior.drag().origin(Ee).on("dragstart.force",Wa).on("drag.force",e).on("dragend.force",Va)),arguments.length?void this.on("mouseover.force",Za).on("mouseout.force",Xa).call(i):i},Go.rebind(n,r,"on")};var cu=20,du=1,pu=1/0;Go.layout.hierarchy=function(){function t(e,o,l){var s=a.call(n,e,o);if(e.depth=o,l.push(e),s&&(c=s.length)){for(var u=-1,c,d=e.children=new Array(c),p=0,f=o+1,h;++u<c;)h=d[u]=t(s[u],f,l),h.parent=e,p+=h.value;r&&d.sort(r),i&&(e.value=p)}else delete e.children,i&&(e.value=+i.call(n,e,o)||0);return e}function e(t,r){var a=t.children,o=0;if(a&&(s=a.length))for(var l=-1,s,u=r+1;++l<s;)o+=e(a[l],u);else i&&(o=+i.call(n,t,r)||0);return i&&(t.value=o),o}function n(e){var n=[];return t(e,0,n),n}var r=ti,a=Ga,i=Ka;return n.sort=function(t){return arguments.length?(r=t,n):r},n.children=function(t){return arguments.length?(a=t,n):a},n.value=function(t){return arguments.length?(i=t,n):i},n.revalue=function(t){return e(t,0),t},n},Go.layout.partition=function(){function t(e,n,r,a){var i=e.children;if(e.x=n,e.y=e.depth*a,e.dx=r,e.dy=a,i&&(l=i.length)){var o=-1,l,s,u;for(r=e.value?r/e.value:0;++o<l;)t(s=i[o],n,u=s.value*r,a),n+=u}}function e(t){var n=t.children,r=0;if(n&&(i=n.length))for(var a=-1,i;++a<i;)r=Math.max(r,e(n[a]));return 1+r}function n(n,i){var o=r.call(this,n,i);return t(o[0],0,a[0],a[1]/e(o[0])),o}var r=Go.layout.hierarchy(),a=[1,1];return n.size=function(t){return arguments.length?(a=t,n):a},Ja(n,r)},Go.layout.pie=function(){function t(i){var o=i.map(function(n,r){return+e.call(t,n,r)}),l=+("function"==typeof r?r.apply(this,arguments):r),s=(("function"==typeof a?a.apply(this,arguments):a)-l)/Go.sum(o),u=Go.range(i.length);null!=n&&u.sort(n===fu?function(t,e){return o[e]-o[t]}:function(t,e){return n(i[t],i[e])});var c=[];return u.forEach(function(t){var e;c[t]={data:i[t],value:e=o[t],startAngle:l,endAngle:l+=e*s}}),c}var e=Number,n=fu,r=0,a=Tl;return t.value=function(n){return arguments.length?(e=n,t):e},t.sort=function(e){return arguments.length?(n=e,t):n},t.startAngle=function(e){return arguments.length?(r=e,t):r},t.endAngle=function(e){return arguments.length?(a=e,t):a},t};var fu={};Go.layout.stack=function(){function t(l,s){var u=l.map(function(n,r){return e.call(t,n,r)}),c=u.map(function(e){return e.map(function(e,n){return[i.call(t,e,n),o.call(t,e,n)]})}),d=n.call(t,c,s);u=Go.permute(u,d),c=Go.permute(c,d);var p=r.call(t,c,s),f=u.length,h=u[0].length,g,v,y;for(v=0;h>v;++v)for(a.call(t,u[0][v],y=p[v],c[0][v][1]),g=1;f>g;++g)a.call(t,u[g][v],y+=c[g-1][v][1],c[g][v][1]);return l}var e=Ee,n=ii,r=oi,a=ai,i=ni,o=ri;return t.values=function(n){return arguments.length?(e=n,t):e},t.order=function(e){return arguments.length?(n="function"==typeof e?e:hu.get(e)||ii,t):n},t.offset=function(e){return arguments.length?(r="function"==typeof e?e:gu.get(e)||oi,t):r},t.x=function(e){return arguments.length?(i=e,t):i},t.y=function(e){return arguments.length?(o=e,t):o},t.out=function(e){return arguments.length?(a=e,t):a},t};var hu=Go.map({"inside-out":function(t){var e=t.length,n,r,a=t.map(li),i=t.map(si),o=Go.range(e).sort(function(t,e){return a[t]-a[e]
}),l=0,s=0,u=[],c=[];for(n=0;e>n;++n)r=o[n],s>l?(l+=i[r],u.push(r)):(s+=i[r],c.push(r));return c.reverse().concat(u)},reverse:function(t){return Go.range(t.length).reverse()},"default":ii}),gu=Go.map({silhouette:function(t){var e=t.length,n=t[0].length,r=[],a=0,i,o,l,s=[];for(o=0;n>o;++o){for(i=0,l=0;e>i;i++)l+=t[i][o][1];l>a&&(a=l),r.push(l)}for(o=0;n>o;++o)s[o]=(a-r[o])/2;return s},wiggle:function(t){var e=t.length,n=t[0],r=n.length,a,i,o,l,s,u,c,d,p,f=[];for(f[0]=d=p=0,i=1;r>i;++i){for(a=0,l=0;e>a;++a)l+=t[a][i][1];for(a=0,s=0,c=n[i][0]-n[i-1][0];e>a;++a){for(o=0,u=(t[a][i][1]-t[a][i-1][1])/(2*c);a>o;++o)u+=(t[o][i][1]-t[o][i-1][1])/c;s+=u*t[a][i][1]}f[i]=d-=l?s/l*c:0,p>d&&(p=d)}for(i=0;r>i;++i)f[i]-=p;return f},expand:function(t){var e=t.length,n=t[0].length,r=1/e,a,i,o,l=[];for(i=0;n>i;++i){for(a=0,o=0;e>a;a++)o+=t[a][i][1];if(o)for(a=0;e>a;a++)t[a][i][1]/=o;else for(a=0;e>a;a++)t[a][i][1]=r}for(i=0;n>i;++i)l[i]=0;return l},zero:oi});Go.layout.histogram=function(){function t(t,i){for(var o=[],l=t.map(n,this),s=r.call(this,l,i),u=a.call(this,s,l,i),c,i=-1,d=l.length,p=u.length-1,f=e?1:1/d,h;++i<p;)c=o[i]=[],c.dx=u[i+1]-(c.x=u[i]),c.y=0;if(p>0)for(i=-1;++i<d;)h=l[i],h>=s[0]&&h<=s[1]&&(c=o[Go.bisect(u,h,1,p)-1],c.y+=f,c.push(t[i]));return o}var e=!0,n=Number,r=pi,a=ci;return t.value=function(e){return arguments.length?(n=e,t):n},t.range=function(e){return arguments.length?(r=Me(e),t):r},t.bins=function(e){return arguments.length?(a="number"==typeof e?function(t){return di(t,e)}:Me(e),t):a},t.frequency=function(n){return arguments.length?(e=!!n,t):e},t},Go.layout.tree=function(){function t(t,i){function o(t,e){var r=t.children,a=t._tree;if(r&&(i=r.length)){for(var i,l=r[0],u,c=l,d,p=-1;++p<i;)d=r[p],o(d,u),c=s(d,u,c),u=d;_i(t);var f=.5*(l._tree.prelim+d._tree.prelim);e?(a.prelim=e._tree.prelim+n(t,e),a.mod=a.prelim-f):a.prelim=f}else e&&(a.prelim=e._tree.prelim+n(t,e))}function l(t,e){t.x=t._tree.prelim+e;var n=t.children;if(n&&(a=n.length)){var r=-1,a;for(e+=t._tree.mod;++r<a;)l(n[r],e)}}function s(t,e,r){if(e){for(var a=t,i=t,o=e,l=t.parent.children[0],s=a._tree.mod,u=i._tree.mod,c=o._tree.mod,d=l._tree.mod,p;o=gi(o),a=hi(a),o&&a;)l=hi(l),i=gi(i),i._tree.ancestor=t,p=o._tree.prelim+c-a._tree.prelim-s+n(o,a),p>0&&(wi(ki(o,t,r),t,p),s+=p,u+=p),c+=o._tree.mod,s+=a._tree.mod,d+=l._tree.mod,u+=i._tree.mod;o&&!gi(i)&&(i._tree.thread=o,i._tree.mod+=c-u),a&&!hi(l)&&(l._tree.thread=a,l._tree.mod+=s-d,r=t)}return r}var u=e.call(this,t,i),c=u[0];xi(c,function(t,e){t._tree={ancestor:t,prelim:0,mod:0,change:0,shift:0,number:e?e._tree.number+1:0}}),o(c),l(c,-c._tree.prelim);var d=vi(c,mi),p=vi(c,yi),f=vi(c,bi),h=d.x-n(d,p)/2,g=p.x+n(p,d)/2,v=f.depth||1;return xi(c,a?function(t){t.x*=r[0],t.y=t.depth*r[1],delete t._tree}:function(t){t.x=(t.x-h)/(g-h)*r[0],t.y=t.depth/v*r[1],delete t._tree}),u}var e=Go.layout.hierarchy().sort(null).value(null),n=fi,r=[1,1],a=!1;return t.separation=function(e){return arguments.length?(n=e,t):n},t.size=function(e){return arguments.length?(a=null==(r=e),t):a?null:r},t.nodeSize=function(e){return arguments.length?(a=null!=(r=e),t):a?r:null},Ja(t,e)},Go.layout.pack=function(){function t(t,i){var o=e.call(this,t,i),l=o[0],s=r[0],u=r[1],c=null==a?Math.sqrt:"function"==typeof a?a:function(){return a};if(l.x=l.y=0,xi(l,function(t){t.r=+c(t.value)}),xi(l,Ci),n){var d=n*(a?1:Math.max(2*l.r/s,2*l.r/u))/2;xi(l,function(t){t.r+=d}),xi(l,Ci),xi(l,function(t){t.r-=d})}return Oi(l,s/2,u/2,a?1:1/Math.max(2*l.r/s,2*l.r/u)),o}var e=Go.layout.hierarchy().sort(zi),n=0,r=[1,1],a;return t.size=function(e){return arguments.length?(r=e,t):r},t.radius=function(e){return arguments.length?(a=null==e||"function"==typeof e?e:+e,t):a},t.padding=function(e){return arguments.length?(n=+e,t):n},Ja(t,e)},Go.layout.cluster=function(){function t(t,i){var o=e.call(this,t,i),l=o[0],s,u=0;xi(l,function(t){var e=t.children;e&&e.length?(t.x=Di(e),t.y=Ni(e)):(t.x=s?u+=n(t,s):0,t.y=0,s=t)});var c=ji(l),d=Pi(l),p=c.x-n(c,d)/2,f=d.x+n(d,c)/2;return xi(l,a?function(t){t.x=(t.x-l.x)*r[0],t.y=(l.y-t.y)*r[1]}:function(t){t.x=(t.x-p)/(f-p)*r[0],t.y=(1-(l.y?t.y/l.y:1))*r[1]}),o}var e=Go.layout.hierarchy().sort(null).value(null),n=fi,r=[1,1],a=!1;return t.separation=function(e){return arguments.length?(n=e,t):n},t.size=function(e){return arguments.length?(a=null==(r=e),t):a?null:r},t.nodeSize=function(e){return arguments.length?(a=null!=(r=e),t):a?r:null},Ja(t,e)},Go.layout.treemap=function(){function t(t,e){for(var n=-1,r=t.length,a,i;++n<r;)i=(a=t[n]).value*(0>e?0:e),a.area=isNaN(i)||0>=i?0:i}function e(n){var i=n.children;if(i&&i.length){var o=c(n),l=[],s=i.slice(),u,d=1/0,p,h="slice"===f?o.dx:"dice"===f?o.dy:"slice-dice"===f?1&n.depth?o.dy:o.dx:Math.min(o.dx,o.dy),g;for(t(s,o.dx*o.dy/n.value),l.area=0;(g=s.length)>0;)l.push(u=s[g-1]),l.area+=u.area,"squarify"!==f||(p=r(l,h))<=d?(s.pop(),d=p):(l.area-=l.pop().area,a(l,h,o,!1),h=Math.min(o.dx,o.dy),l.length=l.area=0,d=1/0);l.length&&(a(l,h,o,!0),l.length=l.area=0),i.forEach(e)}}function n(e){var r=e.children;if(r&&r.length){var i=c(e),o=r.slice(),l,s=[];for(t(o,i.dx*i.dy/e.value),s.area=0;l=o.pop();)s.push(l),s.area+=l.area,null!=l.z&&(a(s,l.z?i.dx:i.dy,i,!o.length),s.length=s.area=0);r.forEach(n)}}function r(t,e){for(var n=t.area,r,a=0,i=1/0,o=-1,l=t.length;++o<l;)(r=t[o].area)&&(i>r&&(i=r),r>a&&(a=r));return n*=n,e*=e,n?Math.max(e*a*h/n,n/(e*i*h)):1/0}function a(t,e,n,r){var a=-1,i=t.length,o=n.x,s=n.y,u=e?l(t.area/e):0,c;if(e==n.dx){for((r||u>n.dy)&&(u=n.dy);++a<i;)c=t[a],c.x=o,c.y=s,c.dy=u,o+=c.dx=Math.min(n.x+n.dx-o,u?l(c.area/u):0);c.z=!0,c.dx+=n.x+n.dx-o,n.y+=u,n.dy-=u}else{for((r||u>n.dx)&&(u=n.dx);++a<i;)c=t[a],c.x=o,c.y=s,c.dx=u,s+=c.dy=Math.min(n.y+n.dy-s,u?l(c.area/u):0);c.z=!1,c.dy+=n.y+n.dy-s,n.x+=u,n.dx-=u}}function i(r){var a=p||o(r),i=a[0];return i.x=0,i.y=0,i.dx=s[0],i.dy=s[1],p&&o.revalue(i),t([i],i.dx*i.dy/i.value),(p?n:e)(i),d&&(p=a),a}var o=Go.layout.hierarchy(),l=Math.round,s=[1,1],u=null,c=$i,d=!1,p,f="squarify",h=.5*(1+Math.sqrt(5));return i.size=function(t){return arguments.length?(s=t,i):s},i.padding=function(t){function e(e){var n=t.call(i,e,e.depth);return null==n?$i(e):qi(e,"number"==typeof n?[n,n,n,n]:n)}function n(e){return qi(e,t)}if(!arguments.length)return u;var r;return c=null==(u=t)?$i:"function"==(r=typeof t)?e:"number"===r?(t=[t,t,t,t],n):n,i},i.round=function(t){return arguments.length?(l=t?Math.round:Number,i):l!=Number},i.sticky=function(t){return arguments.length?(d=t,p=null,i):d},i.ratio=function(t){return arguments.length?(h=t,i):h},i.mode=function(t){return arguments.length?(f=t+"",i):f},Ja(i,o)},Go.random={normal:function(t,e){var n=arguments.length;return 2>n&&(e=1),1>n&&(t=0),function(){var n,r,a;do n=2*Math.random()-1,r=2*Math.random()-1,a=n*n+r*r;while(!a||a>1);return t+e*n*Math.sqrt(-2*Math.log(a)/a)}},logNormal:function(){var t=Go.random.normal.apply(Go,arguments);return function(){return Math.exp(t())}},bates:function(t){var e=Go.random.irwinHall(t);return function(){return e()/t}},irwinHall:function(t){return function(){for(var e=0,n=0;t>n;n++)e+=Math.random();return e}}},Go.scale={};var vu={floor:Ee,ceil:Ee};Go.scale.linear=function(){return Ui([0,1],[0,1],ya,!1)};var yu={s:1,g:1,p:1,r:1,e:1};Go.scale.log=function(){return Ki(Go.scale.linear().domain([0,1]),10,!0,[1,10])};var mu=Go.format(".0e"),bu={floor:function(t){return-Math.ceil(-t)},ceil:function(t){return-Math.floor(-t)}};Go.scale.pow=function(){return to(Go.scale.linear(),1,[0,1])},Go.scale.sqrt=function(){return Go.scale.pow().exponent(.5)},Go.scale.ordinal=function(){return no([],{t:"range",a:[[]]})},Go.scale.category10=function(){return Go.scale.ordinal().range(xu)},Go.scale.category20=function(){return Go.scale.ordinal().range(_u)},Go.scale.category20b=function(){return Go.scale.ordinal().range(wu)},Go.scale.category20c=function(){return Go.scale.ordinal().range(ku)};var xu=[2062260,16744206,2924588,14034728,9725885,9197131,14907330,8355711,12369186,1556175].map(ye),_u=[2062260,11454440,16744206,16759672,2924588,10018698,14034728,16750742,9725885,12955861,9197131,12885140,14907330,16234194,8355711,13092807,12369186,14408589,1556175,10410725].map(ye),wu=[3750777,5395619,7040719,10264286,6519097,9216594,11915115,13556636,9202993,12426809,15186514,15190932,8666169,11356490,14049643,15177372,8077683,10834324,13528509,14589654].map(ye),ku=[3244733,7057110,10406625,13032431,15095053,16616764,16625259,16634018,3253076,7652470,10607003,13101504,7695281,10394312,12369372,14342891,6513507,9868950,12434877,14277081].map(ye);Go.scale.quantile=function(){return ro([],[])},Go.scale.quantize=function(){return ao(0,1,[0,1])},Go.scale.threshold=function(){return io([.5],[0,1])},Go.scale.identity=function(){return oo([0,1])},Go.svg={},Go.svg.arc=function(){function t(){var t=e.apply(this,arguments),i=n.apply(this,arguments),o=r.apply(this,arguments)+zu,l=a.apply(this,arguments)+zu,s=(o>l&&(s=o,o=l,l=s),l-o),u=Al>s?"0":"1",c=Math.cos(o),d=Math.sin(o),p=Math.cos(l),f=Math.sin(l);return s>=Su?t?"M0,"+i+"A"+i+","+i+" 0 1,1 0,"+-i+"A"+i+","+i+" 0 1,1 0,"+i+"M0,"+t+"A"+t+","+t+" 0 1,0 0,"+-t+"A"+t+","+t+" 0 1,0 0,"+t+"Z":"M0,"+i+"A"+i+","+i+" 0 1,1 0,"+-i+"A"+i+","+i+" 0 1,1 0,"+i+"Z":t?"M"+i*c+","+i*d+"A"+i+","+i+" 0 "+u+",1 "+i*p+","+i*f+"L"+t*p+","+t*f+"A"+t+","+t+" 0 "+u+",0 "+t*c+","+t*d+"Z":"M"+i*c+","+i*d+"A"+i+","+i+" 0 "+u+",1 "+i*p+","+i*f+"L0,0Z"}var e=lo,n=so,r=uo,a=co;return t.innerRadius=function(n){return arguments.length?(e=Me(n),t):e},t.outerRadius=function(e){return arguments.length?(n=Me(e),t):n},t.startAngle=function(e){return arguments.length?(r=Me(e),t):r},t.endAngle=function(e){return arguments.length?(a=Me(e),t):a},t.centroid=function(){var t=(e.apply(this,arguments)+n.apply(this,arguments))/2,i=(r.apply(this,arguments)+a.apply(this,arguments))/2+zu;return[Math.cos(i)*t,Math.sin(i)*t]},t};var zu=-Ol,Su=Tl-Bl;Go.svg.line=function(){return po(Ee)};var Mu=Go.map({linear:fo,"linear-closed":ho,step:go,"step-before":vo,"step-after":yo,basis:ko,"basis-open":zo,"basis-closed":So,bundle:Mo,cardinal:xo,"cardinal-open":mo,"cardinal-closed":bo,monotone:Bo});Mu.forEach(function(t,e){e.key=t,e.closed=/-closed$/.test(t)});var Eu=[0,2/3,1/3,0],Cu=[0,1/3,2/3,0],Au=[0,1/6,2/3,1/6];Go.svg.line.radial=function(){var t=po(No);return t.radius=t.x,delete t.x,t.angle=t.y,delete t.y,t},vo.reverse=yo,yo.reverse=vo,Go.svg.area=function(){return Do(Ee)},Go.svg.area.radial=function(){var t=Do(No);return t.radius=t.x,delete t.x,t.innerRadius=t.x0,delete t.x0,t.outerRadius=t.x1,delete t.x1,t.angle=t.y,delete t.y,t.startAngle=t.y0,delete t.y0,t.endAngle=t.y1,delete t.y1,t},Go.svg.chord=function(){function t(t,l){var s=e(this,i,t,l),u=e(this,o,t,l);return"M"+s.p0+r(s.r,s.p1,s.a1-s.a0)+(n(s,u)?a(s.r,s.p1,s.r,s.p0):a(s.r,s.p1,u.r,u.p0)+r(u.r,u.p1,u.a1-u.a0)+a(u.r,u.p1,s.r,s.p0))+"Z"}function e(t,e,n,r){var a=e.call(t,n,r),i=l.call(t,a,r),o=s.call(t,a,r)+zu,c=u.call(t,a,r)+zu;return{r:i,a0:o,a1:c,p0:[i*Math.cos(o),i*Math.sin(o)],p1:[i*Math.cos(c),i*Math.sin(c)]}}function n(t,e){return t.a0==e.a0&&t.a1==e.a1}function r(t,e,n){return"A"+t+","+t+" 0 "+ +(n>Al)+",1 "+e}function a(t,e,n,r){return"Q 0,0 "+r}var i=mr,o=br,l=jo,s=uo,u=co;return t.radius=function(e){return arguments.length?(l=Me(e),t):l},t.source=function(e){return arguments.length?(i=Me(e),t):i},t.target=function(e){return arguments.length?(o=Me(e),t):o},t.startAngle=function(e){return arguments.length?(s=Me(e),t):s},t.endAngle=function(e){return arguments.length?(u=Me(e),t):u},t},Go.svg.diagonal=function(){function t(t,a){var i=e.call(this,t,a),o=n.call(this,t,a),l=(i.y+o.y)/2,s=[i,{x:i.x,y:l},{x:o.x,y:l},o];return s=s.map(r),"M"+s[0]+"C"+s[1]+" "+s[2]+" "+s[3]}var e=mr,n=br,r=Po;return t.source=function(n){return arguments.length?(e=Me(n),t):e},t.target=function(e){return arguments.length?(n=Me(e),t):n},t.projection=function(e){return arguments.length?(r=e,t):r},t},Go.svg.diagonal.radial=function(){var t=Go.svg.diagonal(),e=Po,n=t.projection;return t.projection=function(t){return arguments.length?n($o(e=t)):e},t},Go.svg.symbol=function(){function t(t,r){return(Tu.get(e.call(this,t,r))||Lo)(n.call(this,t,r))}var e=Ho,n=qo;return t.type=function(n){return arguments.length?(e=Me(n),t):e},t.size=function(e){return arguments.length?(n=Me(e),t):n},t};var Tu=Go.map({circle:Lo,cross:function(t){var e=Math.sqrt(t/5)/2;return"M"+-3*e+","+-e+"H"+-e+"V"+-3*e+"H"+e+"V"+-e+"H"+3*e+"V"+e+"H"+e+"V"+3*e+"H"+-e+"V"+e+"H"+-3*e+"Z"},diamond:function(t){var e=Math.sqrt(t/(2*Bu)),n=e*Bu;return"M0,"+-e+"L"+n+",0 0,"+e+" "+-n+",0Z"},square:function(t){var e=Math.sqrt(t)/2;return"M"+-e+","+-e+"L"+e+","+-e+" "+e+","+e+" "+-e+","+e+"Z"},"triangle-down":function(t){var e=Math.sqrt(t/Ou),n=e*Ou/2;return"M0,"+n+"L"+e+","+-n+" "+-e+","+-n+"Z"},"triangle-up":function(t){var e=Math.sqrt(t/Ou),n=e*Ou/2;return"M0,"+-n+"L"+e+","+n+" "+-e+","+n+"Z"}});Go.svg.symbolTypes=Tu.keys();var Ou=Math.sqrt(3),Bu=Math.tan(30*Dl),Nu=[],Du=0,ju,Pu;Nu.call=wl.call,Nu.empty=wl.empty,Nu.node=wl.node,Nu.size=wl.size,Go.transition=function(t){return arguments.length?ju?t.transition():t:Sl.transition()},Go.transition.prototype=Nu,Nu.select=function(t){var e=this.id,n=[],r,a,i;t=w(t);for(var o=-1,l=this.length;++o<l;){n.push(r=[]);for(var s=this[o],u=-1,c=s.length;++u<c;)(i=s[u])&&(a=t.call(i,i.__data__,u,o))?("__data__"in i&&(a.__data__=i.__data__),Ro(a,u,e,i.__transition__[e]),r.push(a)):r.push(null)}return Yo(n,e)},Nu.selectAll=function(t){var e=this.id,n=[],r,a,i,o,l;t=k(t);for(var s=-1,u=this.length;++s<u;)for(var c=this[s],d=-1,p=c.length;++d<p;)if(i=c[d]){l=i.__transition__[e],a=t.call(i,i.__data__,d,s),n.push(r=[]);for(var f=-1,h=a.length;++f<h;)(o=a[f])&&Ro(o,f,e,l),r.push(o)}return Yo(n,e)},Nu.filter=function(t){var e=[],n,r,a;"function"!=typeof t&&(t=D(t));for(var i=0,o=this.length;o>i;i++){e.push(n=[]);for(var r=this[i],l=0,s=r.length;s>l;l++)(a=r[l])&&t.call(a,a.__data__,l,i)&&n.push(a)}return Yo(e,this.id)},Nu.tween=function(t,e){var n=this.id;return arguments.length<2?this.node().__transition__[n].tween.get(t):P(this,null==e?function(e){e.__transition__[n].tween.remove(t)}:function(r){r.__transition__[n].tween.set(t,e)})},Nu.attr=function(t,e){function n(){this.removeAttribute(l)}function r(){this.removeAttributeNS(l.space,l.local)}function a(t){return null==t?n:(t+="",function(){var e=this.getAttribute(l),n;return e!==t&&(n=o(e,t),function(t){this.setAttribute(l,n(t))})})}function i(t){return null==t?r:(t+="",function(){var e=this.getAttributeNS(l.space,l.local),n;return e!==t&&(n=o(e,t),function(t){this.setAttributeNS(l.space,l.local,n(t))})})}if(arguments.length<2){for(e in t)this.attr(e,t[e]);return this}var o="transform"==t?La:ya,l=Go.ns.qualify(t);return Fo(this,"attr."+t,e,l.local?i:a)},Nu.attrTween=function(t,e){function n(t,n){var r=e.call(this,t,n,this.getAttribute(a));return r&&function(t){this.setAttribute(a,r(t))}}function r(t,n){var r=e.call(this,t,n,this.getAttributeNS(a.space,a.local));return r&&function(t){this.setAttributeNS(a.space,a.local,r(t))}}var a=Go.ns.qualify(t);return this.tween("attr."+t,a.local?r:n)},Nu.style=function(t,e,n){function r(){this.style.removeProperty(t)}function a(e){return null==e?r:(e+="",function(){var r=rl.getComputedStyle(this,null).getPropertyValue(t),a;return r!==e&&(a=ya(r,e),function(e){this.style.setProperty(t,a(e),n)})})}var i=arguments.length;if(3>i){if("string"!=typeof t){2>i&&(e="");for(n in t)this.style(n,t[n],e);return this}n=""}return Fo(this,"style."+t,e,a)},Nu.styleTween=function(t,e,n){function r(r,a){var i=e.call(this,r,a,rl.getComputedStyle(this,null).getPropertyValue(t));return i&&function(e){this.style.setProperty(t,i(e),n)}}return arguments.length<3&&(n=""),this.tween("style."+t,r)},Nu.text=function(t){return Fo(this,"text",t,Io)},Nu.remove=function(){return this.each("end.transition",function(){var t;this.__transition__.count<2&&(t=this.parentNode)&&t.removeChild(this)})},Nu.ease=function(t){var e=this.id;return arguments.length<1?this.node().__transition__[e].ease:("function"!=typeof t&&(t=Go.ease.apply(Go,arguments)),P(this,function(n){n.__transition__[e].ease=t}))},Nu.delay=function(t){var e=this.id;return arguments.length<1?this.node().__transition__[e].delay:P(this,"function"==typeof t?function(n,r,a){n.__transition__[e].delay=+t.call(n,n.__data__,r,a)}:(t=+t,function(n){n.__transition__[e].delay=t}))},Nu.duration=function(t){var e=this.id;return arguments.length<1?this.node().__transition__[e].duration:P(this,"function"==typeof t?function(n,r,a){n.__transition__[e].duration=Math.max(1,t.call(n,n.__data__,r,a))}:(t=Math.max(1,t),function(n){n.__transition__[e].duration=t}))},Nu.each=function(t,e){var n=this.id;if(arguments.length<2){var r=Pu,a=ju;ju=n,P(this,function(e,r,a){Pu=e.__transition__[n],t.call(e,e.__data__,r,a)}),Pu=r,ju=a}else P(this,function(r){var a=r.__transition__[n];(a.event||(a.event=Go.dispatch("start","end"))).on(t,e)});return this},Nu.transition=function(){for(var t=this.id,e=++Du,n=[],r,a,i,o,l=0,s=this.length;s>l;l++){n.push(r=[]);for(var a=this[l],u=0,c=a.length;c>u;u++)(i=a[u])&&(o=Object.create(i.__transition__[t]),o.delay+=o.duration,Ro(i,u,e,o)),r.push(i)}return Yo(n,e)},Go.svg.axis=function(){function t(t){t.each(function(){var t=Go.select(this),u=this.__chart__||e,c=this.__chart__=e.copy(),d=null==l?c.ticks?c.ticks.apply(c,o):c.domain():l,p=null==s?c.tickFormat?c.tickFormat.apply(c,o):Ee:s,f=t.selectAll(".tick").data(d,c),h=f.enter().insert("g",".domain").attr("class","tick").style("opacity",Bl),g=Go.transition(f.exit()).style("opacity",Bl).remove(),v=Go.transition(f.order()).style("opacity",1),y,m=Li(c),b=t.selectAll(".domain").data([0]),x=(b.enter().append("path").attr("class","domain"),Go.transition(b));h.append("line"),h.append("text");var _=h.select("line"),w=v.select("line"),k=f.select("text").text(p),z=h.select("text"),S=v.select("text");switch(n){case"bottom":y=Uo,_.attr("y2",r),z.attr("y",Math.max(r,0)+i),w.attr("x2",0).attr("y2",r),S.attr("x",0).attr("y",Math.max(r,0)+i),k.attr("dy",".71em").style("text-anchor","middle"),x.attr("d","M"+m[0]+","+a+"V0H"+m[1]+"V"+a);break;case"top":y=Uo,_.attr("y2",-r),z.attr("y",-(Math.max(r,0)+i)),w.attr("x2",0).attr("y2",-r),S.attr("x",0).attr("y",-(Math.max(r,0)+i)),k.attr("dy","0em").style("text-anchor","middle"),x.attr("d","M"+m[0]+","+-a+"V0H"+m[1]+"V"+-a);break;case"left":y=Wo,_.attr("x2",-r),z.attr("x",-(Math.max(r,0)+i)),w.attr("x2",-r).attr("y2",0),S.attr("x",-(Math.max(r,0)+i)).attr("y",0),k.attr("dy",".32em").style("text-anchor","end"),x.attr("d","M"+-a+","+m[0]+"H0V"+m[1]+"H"+-a);break;case"right":y=Wo,_.attr("x2",r),z.attr("x",Math.max(r,0)+i),w.attr("x2",r).attr("y2",0),S.attr("x",Math.max(r,0)+i).attr("y",0),k.attr("dy",".32em").style("text-anchor","start"),x.attr("d","M"+a+","+m[0]+"H0V"+m[1]+"H"+a)}if(c.rangeBand){var M=c,E=M.rangeBand()/2;u=c=function(t){return M(t)+E}}else u.rangeBand?u=c:g.call(y,c);h.call(y,u),v.call(y,c)})}var e=Go.scale.linear(),n=$u,r=6,a=6,i=3,o=[10],l=null,s;return t.scale=function(n){return arguments.length?(e=n,t):e},t.orient=function(e){return arguments.length?(n=e in qu?e+"":$u,t):n},t.ticks=function(){return arguments.length?(o=arguments,t):o},t.tickValues=function(e){return arguments.length?(l=e,t):l},t.tickFormat=function(e){return arguments.length?(s=e,t):s},t.tickSize=function(e){var n=arguments.length;return n?(r=+e,a=+arguments[n-1],t):r},t.innerTickSize=function(e){return arguments.length?(r=+e,t):r},t.outerTickSize=function(e){return arguments.length?(a=+e,t):a},t.tickPadding=function(e){return arguments.length?(i=+e,t):i},t.tickSubdivide=function(){return arguments.length&&t},t};var $u="bottom",qu={top:1,right:1,bottom:1,left:1};Go.svg.brush=function(){function t(i){i.each(function(){var i=Go.select(this).style("pointer-events","all").style("-webkit-tap-highlight-color","rgba(0,0,0,0)").on("mousedown.brush",a).on("touchstart.brush",a),s=i.selectAll(".background").data([0]);s.enter().append("rect").attr("class","background").style("visibility","hidden").style("cursor","crosshair"),i.selectAll(".extent").data([0]).enter().append("rect").attr("class","extent").style("cursor","move");var u=i.selectAll(".resize").data(h,Ee);u.exit().remove(),u.enter().append("g").attr("class",function(t){return"resize "+t}).style("cursor",function(t){return Hu[t]}).append("rect").attr("x",function(t){return/[ew]$/.test(t)?-3:null}).attr("y",function(t){return/^[ns]/.test(t)?-3:null}).attr("width",6).attr("height",6).style("visibility","hidden"),u.style("display",t.empty()?"none":null);var c=Go.transition(i),d=Go.transition(s),p;o&&(p=Li(o),d.attr("x",p[0]).attr("width",p[1]-p[0]),n(c)),l&&(p=Li(l),d.attr("y",p[0]).attr("height",p[1]-p[0]),r(c)),e(c)})}function e(t){t.selectAll(".resize").attr("transform",function(t){return"translate("+s[+/e$/.test(t)]+","+u[+/^s/.test(t)]+")"})}function n(t){t.select(".extent").attr("x",s[0]),t.selectAll(".extent,.n>rect,.s>rect").attr("width",s[1]-s[0])}function r(t){t.select(".extent").attr("y",u[0]),t.selectAll(".extent,.e>rect,.w>rect").attr("height",u[1]-u[0])}function a(){function a(){32==Go.event.keyCode&&(M||(C=null,A[0]-=s[1],A[1]-=u[1],M=2),m())}function h(){32==Go.event.keyCode&&2==M&&(A[0]+=s[1],A[1]+=u[1],M=0,m())}function g(){var t=Go.mouse(b),a=!1;T&&(t[0]+=T[0],t[1]+=T[1]),M||(Go.event.altKey?(C||(C=[(s[0]+s[1])/2,(u[0]+u[1])/2]),A[0]=s[+(t[0]<C[0])],A[1]=u[+(t[1]<C[1])]):C=null),z&&v(t,o,0)&&(n(w),a=!0),S&&v(t,l,1)&&(r(w),a=!0),a&&(e(w),_({type:"brush",mode:M?"move":"resize"}))}function v(t,e,n){var r=Li(e),a=r[0],i=r[1],o=A[n],l=n?u:s,h=l[1]-l[0],g,v;return M&&(a-=o,i-=h+o),g=(n?f:p)?Math.max(a,Math.min(i,t[n])):t[n],M?v=(g+=o)+h:(C&&(o=Math.max(a,Math.min(i,2*C[n]-g))),g>o?(v=g,g=o):v=o),l[0]!=g||l[1]!=v?(n?d=null:c=null,l[0]=g,l[1]=v,!0):void 0}function y(){g(),w.style("pointer-events","all").selectAll(".resize").style("display",t.empty()?"none":null),Go.select("body").style("cursor",null),O.on("mousemove.brush",null).on("mouseup.brush",null).on("touchmove.brush",null).on("touchend.brush",null).on("keydown.brush",null).on("keyup.brush",null),E(),_({type:"brushend"})}var b=this,x=Go.select(Go.event.target),_=i.of(b,arguments),w=Go.select(b),k=x.datum(),z=!/^(n|s)$/.test(k)&&o,S=!/^(e|w)$/.test(k)&&l,M=x.classed("extent"),E=I(),C,A=Go.mouse(b),T,O=Go.select(rl).on("keydown.brush",a).on("keyup.brush",h);if(Go.event.changedTouches?O.on("touchmove.brush",g).on("touchend.brush",y):O.on("mousemove.brush",g).on("mouseup.brush",y),w.interrupt().selectAll("*").interrupt(),M)A[0]=s[0]-A[0],A[1]=u[0]-A[1];else if(k){var B=+/w$/.test(k),N=+/^n/.test(k);T=[s[1-B]-A[0],u[1-N]-A[1]],A[0]=s[B],A[1]=u[N]}else Go.event.altKey&&(C=A.slice());w.style("pointer-events","none").selectAll(".resize").style("display",null),Go.select("body").style("cursor",x.style("cursor")),_({type:"brushstart"}),g()}var i=x(t,"brushstart","brush","brushend"),o=null,l=null,s=[0,0],u=[0,0],c,d,p=!0,f=!0,h=Lu[0];return t.event=function(t){t.each(function(){var t=i.of(this,arguments),e={x:s,y:u,i:c,j:d},n=this.__chart__||e;this.__chart__=e,ju?Go.select(this).transition().each("start.brush",function(){c=n.i,d=n.j,s=n.x,u=n.y,t({type:"brushstart"})}).tween("brush:brush",function(){var n=ma(s,e.x),r=ma(u,e.y);return c=d=null,function(a){s=e.x=n(a),u=e.y=r(a),t({type:"brush",mode:"resize"})}}).each("end.brush",function(){c=e.i,d=e.j,t({type:"brush",mode:"resize"}),t({type:"brushend"})}):(t({type:"brushstart"}),t({type:"brush",mode:"resize"}),t({type:"brushend"}))})},t.x=function(e){return arguments.length?(o=e,h=Lu[!o<<1|!l],t):o},t.y=function(e){return arguments.length?(l=e,h=Lu[!o<<1|!l],t):l},t.clamp=function(e){return arguments.length?(o&&l?(p=!!e[0],f=!!e[1]):o?p=!!e:l&&(f=!!e),t):o&&l?[p,f]:o?p:l?f:null},t.extent=function(e){var n,r,a,i,p;return arguments.length?(o&&(n=e[0],r=e[1],l&&(n=n[0],r=r[0]),c=[n,r],o.invert&&(n=o(n),r=o(r)),n>r&&(p=n,n=r,r=p),(n!=s[0]||r!=s[1])&&(s=[n,r])),l&&(a=e[0],i=e[1],o&&(a=a[1],i=i[1]),d=[a,i],l.invert&&(a=l(a),i=l(i)),a>i&&(p=a,a=i,i=p),(a!=u[0]||i!=u[1])&&(u=[a,i])),t):(o&&(c?(n=c[0],r=c[1]):(n=s[0],r=s[1],o.invert&&(n=o.invert(n),r=o.invert(r)),n>r&&(p=n,n=r,r=p))),l&&(d?(a=d[0],i=d[1]):(a=u[0],i=u[1],l.invert&&(a=l.invert(a),i=l.invert(i)),a>i&&(p=a,a=i,i=p))),o&&l?[[n,a],[r,i]]:o?[n,r]:l&&[a,i])},t.clear=function(){return t.empty()||(s=[0,0],u=[0,0],c=d=null),t},t.empty=function(){return!!o&&s[0]==s[1]||!!l&&u[0]==u[1]},Go.rebind(t,i,"on")};var Hu={n:"ns-resize",e:"ew-resize",s:"ns-resize",w:"ew-resize",nw:"nwse-resize",ne:"nesw-resize",se:"nwse-resize",sw:"nesw-resize"},Lu=[["n","e","s","w","nw","ne","se","sw"],["e","w"],["n","s"],[]],Yu=os.format=ps.timeFormat,Fu=Yu.utc,Iu=Fu("%Y-%m-%dT%H:%M:%S.%LZ");Yu.iso=Date.prototype.toISOString&&+new Date("2000-01-01T00:00:00.000Z")?Vo:Iu,Vo.parse=function(t){var e=new Date(t);return isNaN(e)?null:e},Vo.toString=Iu.toString,os.second=He(function(t){return new ls(1e3*Math.floor(t/1e3))},function(t,e){t.setTime(t.getTime()+1e3*Math.floor(e))},function(t){return t.getSeconds()}),os.seconds=os.second.range,os.seconds.utc=os.second.utc.range,os.minute=He(function(t){return new ls(6e4*Math.floor(t/6e4))},function(t,e){t.setTime(t.getTime()+6e4*Math.floor(e))},function(t){return t.getMinutes()}),os.minutes=os.minute.range,os.minutes.utc=os.minute.utc.range,os.hour=He(function(t){var e=t.getTimezoneOffset()/60;return new ls(36e5*(Math.floor(t/36e5-e)+e))},function(t,e){t.setTime(t.getTime()+36e5*Math.floor(e))},function(t){return t.getHours()}),os.hours=os.hour.range,os.hours.utc=os.hour.utc.range,os.month=He(function(t){return t=os.day(t),t.setDate(1),t},function(t,e){t.setMonth(t.getMonth()+e)},function(t){return t.getMonth()}),os.months=os.month.range,os.months.utc=os.month.utc.range;var Ru=[1e3,5e3,15e3,3e4,6e4,3e5,9e5,18e5,36e5,108e5,216e5,432e5,864e5,1728e5,6048e5,2592e6,7776e6,31536e6],Uu=[[os.second,1],[os.second,5],[os.second,15],[os.second,30],[os.minute,1],[os.minute,5],[os.minute,15],[os.minute,30],[os.hour,1],[os.hour,3],[os.hour,6],[os.hour,12],[os.day,1],[os.day,2],[os.week,1],[os.month,1],[os.month,3],[os.year,1]],Wu=Yu.multi([[".%L",function(t){return t.getMilliseconds()}],[":%S",function(t){return t.getSeconds()}],["%I:%M",function(t){return t.getMinutes()}],["%I %p",function(t){return t.getHours()}],["%a %d",function(t){return t.getDay()&&1!=t.getDate()}],["%b %d",function(t){return 1!=t.getDate()}],["%B",function(t){return t.getMonth()}],["%Y",Cn]]),Vu={range:function(t,e,n){return Go.range(Math.ceil(t/n)*n,+e,n).map(Xo)},floor:Ee,ceil:Ee};Uu.year=os.year,os.scale=function(){return Zo(Go.scale.linear(),Uu,Wu)};var Zu=Uu.map(function(t){return[t[0].utc,t[1]]}),Xu=Fu.multi([[".%L",function(t){return t.getUTCMilliseconds()}],[":%S",function(t){return t.getUTCSeconds()}],["%I:%M",function(t){return t.getUTCMinutes()}],["%I %p",function(t){return t.getUTCHours()}],["%a %d",function(t){return t.getUTCDay()&&1!=t.getUTCDate()}],["%b %d",function(t){return 1!=t.getUTCDate()}],["%B",function(t){return t.getUTCMonth()}],["%Y",Cn]]);Zu.year=os.year.utc,os.scale.utc=function(){return Zo(Go.scale.linear(),Zu,Xu)},Go.text=Ce(function(t){return t.responseText}),Go.json=function(t,e){return Ae(t,"application/json",Qo,e)},Go.html=function(t,e){return Ae(t,"text/html",Jo,e)},Go.xml=Ce(function(t){return t.responseXML}),"function"==typeof define&&define.amd?define(Go):"object"==typeof module&&module.exports?module.exports=Go:this.d3=Go}(),function(){var t=window.d3plus||{};window.d3plus=t,t.version="1.2.4 - Royal",t.ie=/*@cc_on!@*/!1,t.rtl="rtl"==d3.select("html").attr("dir"),t.prefix=function(){if("-webkit-transform"in document.body.style)var e="-webkit-";else if("-moz-transform"in document.body.style)var e="-moz-";else if("-ms-transform"in document.body.style)var e="-ms-";else if("-o-transform"in document.body.style)var e="-o-";else var e="";return t.prefix=function(){return e},e},t.scrollbar=function(){var e=document.createElement("p");e.style.width="100%",e.style.height="200px";var n=document.createElement("div");n.style.position="absolute",n.style.top="0px",n.style.left="0px",n.style.visibility="hidden",n.style.width="200px",n.style.height="150px",n.style.overflow="hidden",n.appendChild(e),document.body.appendChild(n);var r=e.offsetWidth;n.style.overflow="scroll";var a=e.offsetWidth;r==a&&(a=n.clientWidth),document.body.removeChild(n);var i=r-a;return t.scrollbar=function(){return i},i},d3.select(window).on("load.d3plus_scrollbar",function(){t.prefix(),t.scrollbar()}),t.evt={},t.touch=window.Modernizr&&Modernizr.touch,t.touch?(t.evt.click="click",t.evt.down="touchstart",t.evt.up="touchend",t.evt.over="touchstart",t.evt.out="touchend",t.evt.move="touchmove"):(t.evt.click="click",t.evt.down="mousedown",t.evt.up="mouseup",t.ie?(t.evt.over="mouseenter",t.evt.out="mouseleave"):(t.evt.over="mouseover",t.evt.out="mouseout"),t.evt.move="mousemove"),t.apps={},t.color={},t.data={},t.draw={},t.font={},t.forms={},t.ui={},t.shape={},t.styles={},t.tooltip={},t.util={},t.variable={},t.zoom={},t.console={},t.console.print=function(e,n,r){t.ie?console.log("[d3plus] "+n):console[e]("%c[d3plus]%c "+n,"font-weight:bold;",r)},t.console.log=function(e,n){if(!n)var n="font-weight:bold;";t.console.print("log",e,n)},t.console.group=function(e,n){if(!n)var n="font-weight:bold;";t.console.print("group",e,n)},t.console.warning=function(e,n){if(!n)var n="font-weight:bold;color:red;";e="WARNING: "+e,t.console.print("log",e,n)},t.console.groupEnd=function(){t.ie||console.groupEnd()},t.console.time=function(e){t.ie||console.time(e)},t.console.timeEnd=function(e){t.ie||console.timeEnd(e)},t.forms=function(e){var n={before:null,callback:!1,data:[],dev:!1,enabled:!1,filter:"",flipped:!1,format:t.public.text_format.value,highlight:!1,hover:!1,id:"default",init:!1,large:200,"max-height":600,"max-width":600,parent:d3.select("body"),previous:!1,propagation:!0,selected:!1,text:"text",timing:200,update:!0},r={align:"left",border:"all",color:"#ffffff",corners:0,display:"inline-block",drop:{},"font-family":"'Helvetica Neue', 'HelveticaNeue', 'Helvetica', 'Arial', 'sans-serif'","font-size":12,"font-spacing":0,"font-weight":200,height:!1,margin:0,padding:4,secondary:t.color.darker("#ffffff",.05),shadow:5,stroke:1,width:!1};r["font-align"]=t.rtl?"right":"left",r.icon=t.font.awesome?"fa-angle-down":"&#x27A4;",e&&(r=t.util.merge(r,e)),n.forms=function(e,a){var i=n.data.array instanceof Array&&n.data.array.length>n.large,a=!n.init||i||t.ie?0:n.timing;if(n.data instanceof Array&&"function"!=typeof n.data.select)n.data={array:n.data};else if("object"!=typeof n.data||n.data.array||n.data instanceof Array)n.data&&!n.data.array&&("string"!=typeof n.data||d3.select(n.data).empty()?t.util.d3selection(n.data)&&(n.element=n.data,n.data.node().id&&(n.before="#"+n.data.node().id)):(n.element=d3.selectAll(n.data),"#"==n.data.charAt(0)&&(n.before=n.data)),n.data={array:[]});else{n.data.array||(n.data.array=[]),n.element&&t.forms.element(n),t.forms.data(n);var o=n.data.array.filter(function(t){return t.value==n.focus})[0];o||(n.data.array[0].selected=!0,n.focus=n.data.array[0].value),n.data.changed}0==n.data.array.length&&n.element&&(n.parent=d3.select(n.element.node().parentNode),t.forms.element(n)),"string"==typeof n.data.array?t.console.warning('Cannot create UI element for "'+n.data.array+'", no data found.'):n.data.array instanceof Array?(n.focus||(n.data.array[0].selected=!0,n.focus=n.data.array[0].value,n.dev&&t.console.log('"value" set to "'+n.focus+'"')),n.data.array.length>10&&!("search"in n)&&(n.search=!0,n.dev&&t.console.log("search enabled")),n.element&&(n.element.style("position","absolute").style("overflow","hidden").style("clip","rect(0 0 0 0)").style("width","1px").style("height","1px").style("margin","-1px").style("padding","0").style("border","0"),n.data.changed&&"drop"==n.type&&(options=n.element.selectAll("option").data(n.data.array,function(t){return t?t.value:!1}),options.enter().append("option").each(function(t){for(k in t)["alt","value","text","selected"].indexOf(k)>=0?d3.select(this).attr(k,t[k]):d3.select(this).attr("data-"+k,t[k]);
this.selected=t.value==n.focus?!0:!1}),options.exit().remove())),n.init||(n.container=n.parent.selectAll("div#d3plus_"+n.type+"_"+n.id).data(["container"]),n.container.enter().insert("div",n.before).attr("id","d3plus_"+n.type+"_"+n.id).style("display",r.display).style("position","relative").style("overflow","visible").style("vertical-align","top"),n.tester=t.font.tester()),a?n.container.transition().duration(a).each("start",function(){"drop"==n.type&&n.enabled&&d3.select(this).style("z-index",9999)}).style("margin",r.margin+"px").each("end",function(){"drop"!=n.type||n.enabled||d3.select(this).style("z-index","auto")}):n.container.style("margin",r.margin+"px").style("z-index",function(){return"drop"==n.type&&n.enabled?9999:"auto"}),n.dev&&t.console.group('drawing "'+n.type+'"'),t.forms[n.type](n,r,a),n.dev&&t.console.groupEnd(),n.init=!0,n.update=!0,n.data.changed=!1):t.console.warning("Cannot create UI element, no data found.")};var a=["callback","data","dev","element","highlight","hover","hover_previous","id","large","parent","previous","propagation","search","selected","timing","text","type","update"];a.forEach(function(e){n.forms[e]=function(e){return function(r){if(n.dev){var a=void 0===r?"":r.toString();if(a.length>50||void 0===r)var a="";else var a=' to "'+a+'"'}return"hover"==e&&(n.hover_previous=n.hover),arguments.length?(["element","parent"].indexOf(e)>=0?("string"!=typeof r||d3.select(r).empty()?t.util.d3selection(r)?(n.dev&&t.console.log('"'+e+'" set'+a),n[e]=r):t.console.warning('Cannot set "'+e+'" as "'+r.toString()+'"'):(n.dev&&t.console.log('"'+e+'" set'+a),n[e]=d3.selectAll(r)),n[e]&&"element"==e&&(n[e].node().id&&(n.before="#"+n[e].node().id),n.parent=d3.select(n[e].node().parentNode))):(n.dev&&t.console.log('"'+e+'" set'+a),n[e]=r),n.forms):n[e]}}(e)});var i=["align","icon","border","color","corners","display","font","margin","padding","shadows"];return i.forEach(function(e){n.forms[e]=function(e){return function(a){function i(e,r){if("string"==typeof r&&(n.dev&&t.console.log('"font-family" set'+a),e["font-family"]=r),"number"==typeof r)n.dev&&t.console.log('"font-size" set'+a),e["font-size"]=r;else if("object"==typeof r)for(style in r)if("drop"==style)i(e.drop,r[style]);else{if("align"==style&&t.rtl&&("left"==r[style]?r[style]="right":"right"==r[style]&&(r[style]="left")),n.dev){var a=r[style].toString();if(a.length>50)var a="";else var a=' to "'+a+'"';t.console.log('"font-'+style+'" set'+a)}e["font-"+style]=r[style]}}if(!arguments.length)return"font"==e?r:r[e];if(n.dev){var o=a.toString();if(o.length>50)var o="";else var o=' to "'+o+'"'}return"font"==e?i(r,a):("color"==e&&r.secondary==t.color.darker(r.color,.05)&&(r.secondary=t.color.darker(a,.05)),n.dev&&t.console.log('"'+e+'" set'+o),r[e]=a),n.forms}}(e)}),n.forms.disable=function(){return n.dev&&t.console.log("disable"),n.enabled=!1,n.init&&n.parent.call(n.forms),n.forms},n.forms.enable=function(){return n.dev&&t.console.log("enable"),n.enabled=!0,!n.data.fetch||n.data.loaded&&!n.data.continuous||t.forms.json(n),n.init&&n.parent.call(n.forms),n.forms},n.forms.draw=function(t){return n.parent.call(n.forms,t),n.forms},n.forms.height=function(e){return arguments.length?(n.dev&&t.console.log('"height" set to "'+e+'"'),r.height=e,n.forms):n.container[0][0].offsetHeight},n.forms.remove=function(t){n.container.remove()},n.forms.select=function(t){return n.container.select(t)},n.forms.value=function(e){return arguments.length?("string"==typeof e&&(e=n.data.array.filter(function(t){return t.value==e})[0]),e.value!=n.focus&&("select"==n.tag?n.element.selectAll("option").each(function(t,r){this.value==e.value&&(n.element.node().selectedIndex=r)}):"input"==n.tag&&"radio"==n.element.attr("type")&&n.element.each(function(){this.checked=this.value==e.value?!0:!1}),n.callback&&n.callback(e.value),n.dev&&t.console.log('"value" set to "'+e.value+'"'),n.previous=n.focus,n.focus=e.value),n.enabled=!1,n.highlight=!1,n.init&&n.parent.call(n.forms),n.forms):n.focus},n.forms.toggle=function(){return n.dev&&t.console.log("toggle"),n.update=!1,n.enabled?n.forms.disable():n.forms.enable(),n.forms},n.forms.width=function(e){if(!arguments.length){var a=[];return n.container.selectAll("div.d3plus_node").each(function(t){a.push(this.offsetWidth)}),a.length>1?a.sort():1==a.length?a[0]:n.container.node().offsetWidth}return n.dev&&t.console.log('"width" set to "'+e+'"'),r.width=e,n.forms},n.forms},t.viz=function(){function e(r){for(key in r)if(null!==r[key]&&"object"==typeof r[key]&&!(r[key]instanceof Array)){if("family"in r[key])if(r[key].family in n.fonts)r[key].family=n.fonts[r[key].family];else{var a=r[key].family;r[key].family=t.font.validate(r[key].family),n.fonts[a]=r[key].family}e(r[key])}}var n={back:function(){if(n.history.states.length>0){var t=n.history.states.pop();"function"==typeof t&&t()}},connected:function(t){var e=n.focus.value;if(e){var r=t[n.edges.source][n.id.key],a=t[n.edges.target][n.id.key];if(r==e||a==e)return!0}return!1},connections:function(t,e){if(!n.edges.value)return[];var r=n.edges.restricted||n.edges.value,a=[];if(!t)return r;var i=r.filter(function(r){var i=!1;return r[n.edges.source][n.id.key]==t?(i=!0,e&&a.push(r[n.edges.target])):r[n.edges.target][n.id.key]==t&&(i=!0,e&&a.push(r[n.edges.source])),i});return e?a:i},filtered:!1,fonts:{},format:function(t,e){return"number"==typeof t?n.number_format.value(t,e,n):"string"==typeof t?n.text_format.value(t,e,n):JSON.stringify(t)},frozen:!1,g:{apps:{}},init:!1,margin:{top:0,right:0,bottom:0,left:0},mute:[],solo:[],style:t.styles.default,timing:t.styles.default.timing.transitions,touchEvent:function(){var e=n.zoom.scale>n.zoom_behavior.scaleExtent()[0],r=t.apps[n.type.value].zoom&&n.zoom.value&&n.zoom.scroll.value,a=d3.event.touches.length>1&&r;a||e||d3.event.stopPropagation()},update:!0,zoom_behavior:d3.behavior.zoom().scaleExtent([1,1]),zoom_direction:function(){var e=n.id.nesting.length-1,r=n.depth.value,a=t.apps[n.type.value].nesting===!1;return a?0:e>r?1:r!=e||!n.small&&n.html.value?0:-1}};return e(n.style),n.viz=function(e){return e.each(function(){function e(){l.length?r():(n.dev.value&&t.console.groupEnd(),n.parent.style("cursor","auto"))}function r(){var r=l.shift(),a=n.g.message&&n.g.message.text()==r.message,i="check"in r?r.check(n):!0;if(i)if(a||!n.update||n.timing&&n.init)r.function instanceof Array?r.function.forEach(function(t){t(n,e)}):"function"==typeof r.function&&r.function(n,e),r.wait||e();else{n.dev.value&&(t.console.groupEnd(),t.console.group(r.message));var o="string"==typeof n.messages.value?n.messages.value:r.message;t.ui.message(n,o),setTimeout(function(){r.function instanceof Array?r.function.forEach(function(t){t(n,e)}):"function"==typeof r.function&&r.function(n,e),r.wait||e()},10)}else"otherwise"in r&&r.otherwise(n),e()}n.frozen=!0,n.internal_error=null,t.draw.container(n);var a=n.width.value<=n.width.small,i=n.height.value<=n.height.small;if(n.small=a||i,n.error.value){n.messages.style="large";var o=n.error.value===!0?"Error":n.error.value;n.dev.value&&t.console.warning(o),t.ui.message(n,o)}else{var l=t.draw.steps(n);n.parent.style("cursor","wait"),n.messages.style=n.data.app?"small":"large",r()}}),n.viz},n.viz.csv=function(e){if(e instanceof Array)var r=e;var a=[],i=[],o=n.title.value||"My D3plus App Data";if(o=t.util.strip(o),!r){var r=[n.id.key];n.time.key&&r.push(n.time.key),n.size.key&&r.push(n.size.key),n.text.key&&r.push(n.text.key)}r.forEach(function(t){i.push(n.format(t))}),a.push(i),n.returned.nodes.forEach(function(e){var i=[];r.forEach(function(r){i.push(t.variable.value(n,e,r))}),a.push(i)});var l="data:text/csv;charset=utf-8,";if(a.forEach(function(t,e){dataString=t.join(","),l+=e<a.length?dataString+"\n":dataString}),t.ie){var s=new Blob([l],{type:"text/csv;charset=utf-8;"});navigator.msSaveBlob(s,o+".csv")}else{var u=encodeURI(l),c=document.createElement("a");c.setAttribute("href",u),c.setAttribute("download",o+".csv"),c.click()}return a},n.viz.draw=function(e){return n.container.value?d3.select(n.container.value).empty()?t.console.warning('Cannot find <div> on page matching: "'+n.container+'"'):d3.select(n.container.value).call(n.viz):t.console.warning("Please define a container div using .container()"),n.viz},n.viz.style=function(e){function r(e,a,i){if("object"!=typeof i||i instanceof Array)void 0===e[a]?t.console.warning('"'+a+'" cannot be set'):("family"==a&&(i=i in n.fonts?n.fonts[i]:t.font.validate(i)),e[a]=i);else for(d in i)void 0===e[a]?t.console.warning('"'+a+'" cannot be set'):r(e[a],d,i[d])}function a(t,e){for(e in t)null!==t[e]&&"object"==typeof t[e]&&("font"in t[e]&&r(t,e,i),a(t[e]))}if(!arguments.length)return n.style;if("object"==typeof e){if("font"in e){var i=t.util.copy(e.font);i={font:i},a(n.style)}r(n,"style",e)}else"string"==typeof e?t.styles[e]?n.style=plus.styles[e]:t.console.warning('Style "'+e+'" does not exist. Installed styles are: "'+Object.keys(t.styles).join('", "')+'"'):t.console.warning(".style() only accepts strings or keyed objects.");return n.viz},Object.keys(t.public).forEach(function(e){function r(a){for(o in a)"deprecates"==o?a[o].forEach(function(r){n.viz[r]=function(e,r){return function(a){return t.console.warning("."+e+"() method has been deprecated, please use the new ."+r+"() method."),n.viz}}(r,e)}):"object"==typeof a[o]&&r(a[o])}n[e]=t.util.copy(t.public[e]),"type"==e&&(n[e].accepted=Object.keys(t.apps)),n[e]&&r(n[e]),n.viz[e]=function(e){return function(r,a){function i(e,n,r){if(void 0===e[n])t.console.warning('"'+n+'" cannot be set.');else if("object"!=typeof r||r instanceof Array)l(e,n,r);else{if("object"==typeof e[n]&&null!==e[n])if(void 0!==e[n].key)var a="key";else if(void 0!==e[n].value)var a="value";else var a=null;else var a=null;if(n==a)l(e,a,r);else if(["key","value"].indexOf(n)>=0)l(e,n,r);else if("object"==typeof e[n]&&null!==e[n]&&e[n].object===!0)l(e[n],a,r);else for(d in r)i(e[n],d,r[d])}}function o(t,e){return e instanceof Array?t=e:t.indexOf(e)>=0?t.splice(t.indexOf(e),1):t.push(e),t}function l(r,a,i){if("type"==e&&(r.accepted||(r.accepted=Object.keys(t.apps)),r.accepted.indexOf(i)<0))for(app in t.apps)t.apps[app].deprecates&&t.apps[app].deprecates.indexOf(i)>=0&&(t.console.warning(JSON.stringify(i)+" has been deprecated by "+JSON.stringify(app)+", please update your code."),i=app);if("value"!=a&&"key"!=a&&a)var l='"'+a+'" of .'+e+"()";else var l="."+e+"()";if("value"!=a&&"key"!=a||!r.accepted)if("object"==typeof r[a]&&null!==r[a]&&r[a].accepted)var s=r[a].accepted;else var s=!1;else var s=r.accepted;var u=!0;if(s)if("string"==typeof s[0])var u=s.indexOf(i)>=0,c=s;else{var u=s.indexOf(i.constructor)>=0,c=[];s.forEach(function(t){var e=t.toString().split("()")[0].substring(9);c.push(e)})}if(s&&!u)t.console.warning(""+JSON.stringify(i)+" is not an accepted value for "+l+', please use one of the following: "'+c.join('", "')+'"');else if(!(r[a]instanceof Array)&&r[a]==i||r[a]&&(r[a].key===i||r[a].value===i))n.dev.value&&t.console.log(l+" was not updated because it did not change.");else{if("solo"==a||"mute"==a){r[a].value=o(r[a].value,i),r[a].changed=!0;var d=r[a].value;["time","coords"].indexOf(e)<0&&(d.length&&n[a].indexOf(e)<0?n[a].push(e):!d.length&&n[a].indexOf(e)>=0&&n[a].splice(n[a].indexOf(e),1))}else if("id"==e&&"key"==a)i instanceof Array?(n.id.nesting=i,n.depth.value<i.length?n.id.key=i[n.depth.value]:(n.id.key=i[0],n.depth.value=0)):(n.id.key=i,n.id.nesting=[i],n.depth.value=0),r.changed=!0;else if("text"==e&&"key"==a){if(n.text.array||(n.text.array={}),"string"==typeof i)n.text.array[n.id.key]=[i];else if(i instanceof Array)n.text.array[n.id.key]=i;else{n.text.array=i;var p=i[n.id.key]?i[n.id.key]:i[Object.keys(i)[0]];n.text.array[n.id.key]="string"==typeof p?[p]:p}n.text.key=n.text.array[n.id.key][0],r.changed=!0}else if("depth"==e){if(n.depth.value=i>=n.id.nesting.length?n.id.nesting.length-1:0>i?0:i,n.id.key=n.id.nesting[n.depth.value],n.text.array){var p=n.text.array[n.id.key];p&&(n.text.array[n.id.key]="string"==typeof p?[p]:p,n.text.key=n.text.array[n.id.key][0])}r.changed=!0}else if("aggs"==e)for(agg in i)r[a][agg]&&r[a][agg]==i[agg]?n.dev.value&&t.console.log('Aggregation for "'+agg+'" is already set to "'+i[agg]+'"'):(r[a][agg]=i[agg],r.changed=!0);else{if("object"==typeof r[a]&&null!=r[a]&&(void 0!==r[a].key||void 0!==r[a].value)){var f=void 0!==r[a].key?"key":"value";r=r[a],a=f}r.previous=r[a],r[a]=i,r.changed=!0}(n.dev.value||"dev"==e)&&(r.changed||["solo","mute"].indexOf(a)>=0)&&t.console.log("function"!=typeof r[a]&&JSON.stringify(r[a]).length<260?l+" has been set to "+JSON.stringify(r[a])+".":l+" has been set.")}}if(!arguments.length)return n[e];if(n[e].reset&&n[e].reset.forEach(function(t){n[t]=null}),a&&(n[e].callback=a),void 0!==n[e].key)var s="key";else if(void 0!==n[e].value)var s="value";else var s=null;return("object"!=typeof r||null===r||!s||r[s]||Object.keys(r)[0]in n[e])&&"object"==typeof r&&null!==r?"object"==typeof r?i(n,e,r):t.console.warning("Incompatible format for ."+e+"() method."):l(n[e],s,r),n.viz}}(e)}),n.viz},t.public={},t.public.active={key:null,mute:{value:[]},solo:{value:[]},spotlight:{accepted:[Boolean],value:!1,deprecates:["spotlight"]}},t.public.aggs={deprecated:["nesting_aggs"],value:{}},t.public.axes={mirror:{accepted:[Boolean],deprecates:["mirror_axis","mirror_axes"],value:!1},values:["x","y"]},t.public.attrs={value:{}},t.public.color={deprecates:["color_var"],key:null,mute:{value:[]},solo:{value:[]}},t.public.container={value:null},t.public.coords={center:[0,0],fit:{accepted:["auto","height","width"],value:"auto"},mute:{value:[]},padding:20,projection:{accepted:["mercator","equirectangular"],value:"mercator"},solo:{value:[]},threshold:.1,value:null},t.public.data={large:400,value:[]},t.public.depth={value:0},t.public.descs={value:{}},t.public.dev={accepted:[Boolean],value:!1},t.public.edges={arrows:{accepted:[Boolean],direction:{accepted:["source","target"],value:"target"},value:!1},deprecates:["edges"],label:!1,large:100,limit:!1,size:!1,source:"source",target:"target",value:null},t.public.error={value:!1},t.public.focus={deprecates:["highlight"],tooltip:{accepted:[Boolean],value:!0},value:null},t.public.footer={link:null,value:!1},t.public.height={small:300,value:null},t.public.history={accepted:[Boolean],states:[],value:!0},t.public.html={deprecates:["click_function"],value:null},t.public.icon={deprecates:["icon_var"],key:"icon",style:{deprecates:["icon_style"],object:!0,value:"default"}},t.public.id={data_filter:!0,deprecates:["id_var","nesting"],key:"id",mute:{value:[],deprecates:["filter"]},nesting:["id"],solo:{value:[],deprecates:["solo"]}},t.public.labels={accepted:[Boolean],resize:{accepted:[Boolean],value:!0},value:!0},t.public.legend={accepted:[Boolean],label:null,order:{accepted:["color","id","size","text"],sort:{accepted:["asc","desc"],value:"asc"},value:"color"},value:!0},t.public.messages={accepted:[Boolean,String],value:!0},t.public.nodes={value:null},t.public.number_format={value:function(t,e,n){var r=n&&n.time.key?[n.time.key]:["year","date"];if(e&&r.indexOf(e.toLowerCase())>=0)return t;if(10>t&&t>-10)return d3.round(t,2);if(t.toString().split(".")[0].length>4){var a=d3.formatPrefix(t).symbol;return a=a.replace("G","B"),t=d3.formatPrefix(t).scale(t),t=parseFloat(d3.format(".3g")(t)),t+a}return"share"==e?d3.format(".2f")(t):d3.format(",f")(t)}},t.public.order={key:null,sort:{accepted:["asc","desc"],value:"asc",deprecates:["sort"]}},t.public.shape={accepted:["circle","donut","line","square","area","coordinates"],interpolate:{accepted:["linear","step","step-before","step-after","basis","basis-open","cardinal","cardinal-open","monotone"],value:"linear",deprecates:["stack_type"]},value:null},t.public.size={data_filter:!0,deprecates:["value"],key:null,mute:{value:[]},scale:{accepted:["sqrt","linear","log"],deprecates:["size_scale"],value:"sqrt"},solo:{value:[]},threshold:!0},t.public.temp={deprecates:["else_var","else"],key:null,mute:{value:[]},solo:{value:[]}},t.public.text={deprecates:["name_array","text_var"],key:null,mute:{value:[]},solo:{value:[]}},t.public.text_format={value:function(t,e,n){if(!t)return"";var r=["a","and","of","to"];return t.replace(/\w\S*/g,function(t,e){return r.indexOf(t)>=0&&0!=e?t:t.charAt(0).toUpperCase()+t.substr(1).toLowerCase()})}},t.public.time={data_filter:!0,deprecates:["year","year_var"],fixed:{accepted:[Boolean],value:!0,deprecates:["static_axis","static_axes"]},key:null,mute:{value:[]},solo:{value:[]}},t.public.timeline={accepted:[Boolean],handles:{accepted:[Boolean],value:!0},label:null,value:!0},t.public.title={link:null,sub:{link:null,value:null,deprecates:["sub_title"]},total:{link:null,value:!1,deprecates:["total_bar"],object:!0},value:null},t.public.tooltip={deprecates:["tooltip_info"],object:!0,value:[]},t.public.total={deprecates:["total_var"],key:null,mute:{value:[]},solo:{value:[]}},t.public.type={mode:{accepted:["squarify","slice","dice","slice-dice"],value:"squarify"},value:"tree_map"},t.public.width={small:400,value:null},t.public.x={data_filter:!0,deprecates:["xaxis","xaxis_val","xaxis_var"],domain:null,key:null,lines:[],mute:{value:[]},reset:["x_range"],scale:{accepted:["linear","log","continuous","share"],value:"linear",deprecates:["layout","unique_axis","xaxis_scale"]},solo:{value:[]},stacked:{accepted:[Boolean],value:!1},zerofill:{accepted:[Boolean],value:!1}},t.public.y={data_filter:!0,deprecates:["yaxis","yaxis_val","yaxis_var"],domain:null,key:null,lines:[],mute:{value:[]},reset:["y_range"],scale:{accepted:["linear","log","continuous","share"],value:"linear",deprecates:["layout","unique_axis","yaxis_scale"]},solo:{value:[]},stacked:{accepted:[Boolean],value:!1},zerofill:{accepted:[Boolean],value:!1}},t.public.zoom={accepted:[Boolean],click:{accepted:[Boolean],value:!0},pan:{accepted:[Boolean],value:!0},scroll:{accepted:[Boolean],value:!0,deprecates:["scroll_zoom"]},value:!0}}(),d3plus.apps.bubbles={},d3plus.apps.bubbles.fill=!0,d3plus.apps.bubbles.requirements=["data"],d3plus.apps.bubbles.tooltip="static",d3plus.apps.bubbles.shapes=["circle","donut"],d3plus.apps.bubbles.scale=1.05,d3plus.apps.bubbles.draw=function(t){function e(e){e.attr("x",function(t){return t.d3plus.x}).attr("y",function(t){return t.d3plus.y-t.r-t.d3plus.label_height-c}).attr("text-anchor","middle").attr("font-weight",t.style.font.weight).attr("font-family",t.style.font.family).attr("font-size","12px").style("fill",function(e){var n=d3plus.variable.color(t,e);return d3plus.color.legible(n)}).each(function(e){if(e.r>10&&n>10){var r=d3plus.variable.text(t,e,e.depth);d3plus.util.wordwrap({text:r,parent:this,width:o-2*c,height:n})}}).attr("y",function(t){return t.d3plus.label_height=d3.select(this).node().getBBox().height,t.d3plus.y-t.r-t.d3plus.label_height-c}).selectAll("tspan").attr("x",function(t){return t.d3plus.x})}var n=t.labels.value&&!t.small?50:0,r=t.order.key||t.size.key;if(t.data.app.sort(function(e,n){var a=d3plus.variable.value(t,e,r),i=d3plus.variable.value(t,n,r);return"asc"==t.order.sort.value?a-i:i-a}),1==t.data.app.length)var a=1,i=1;else if(t.data.app.length<4)var a=t.data.app.length,i=1;else var i=Math.ceil(Math.sqrt(t.data.app.length/(t.app_width/t.app_height))),a=Math.ceil(Math.sqrt(t.data.app.length*(t.app_width/t.app_height)));if(t.data.app.length>0)for(;(i-1)*a>=t.data.app.length;)i--;var o=t.app_width/a,l=t.app_height/i;t.data.app||(t.data.app=[]);var s=d3.min(t.data.app,function(e){return t.size.key?d3plus.variable.value(t,e,t.size.key,null,"min"):0}),u=d3.max(t.data.app,function(e){return t.size.key?d3plus.variable.value(t,e,t.size.key):0}),c=5,d=20,p=d3.min([o,l])/2-2*c;p-=n;var f=d3.scale[t.size.scale.value]().domain([s,u]).rangeRound([d,p]),h=d3.layout.pack().size([o-2*c,l-2*c-n]).value(function(e){return t.size.key?d3plus.variable.value(t,e,t.size.key):0}).padding(c).radius(function(t){return f(t)}),g=[],v=0;t.data.app.forEach(function(e,r){var i=h.nodes(e),s=o*r%t.app_width,u=l*v;i.forEach(function(e){e.d3plus||(e.d3plus={}),e.d3plus.depth||(e.d3plus.depth=e.depth),e.xoffset=s,e.yoffset=u+n,e.d3plus.static=e.depth<t.depth.value?!0:!1,e.d3plus.label=1==i.length?!1:!0}),g=g.concat(i),(r+1)%a==0&&v++});var y=p/d3.max(g,function(t){return t.r});g.forEach(function(t){t.x=(t.x-o/2)*y+o/2,t.d3plus.x=t.x+t.xoffset,t.y=(t.y-l/2)*y+l/2,t.d3plus.y=t.y+t.yoffset,t.r=t.r*y,t.d3plus.r=t.r}),g.sort(function(t,e){return t.depth-e.depth});var m=g.filter(function(t){return 0==t.depth}),b=t.group.selectAll("text.d3plus_bubble_label").data(m,function(e){return e.d3plus.label_height||(e.d3plus.label_height=0),e[t.id.nesting[e.depth]]});return b.enter().append("text").attr("class","d3plus_bubble_label").call(e).attr("opacity",0),b.transition().duration(t.style.timing.transitions).call(e).attr("opacity",1),b.exit().attr("opacity",0).remove(),g},d3plus.apps.chart={},d3plus.apps.chart.fill=!0,d3plus.apps.chart.requirements=["data","x","y"],d3plus.apps.chart.tooltip="static",d3plus.apps.chart.shapes=["circle","donut","line","square","area"],d3plus.apps.chart.scale={circle:1.1,donut:1.1,square:1.1},d3plus.apps.chart.draw=function(t){function e(e,n){e.attr("stroke",t.style.ticks.color).attr("stroke-width",t.style.ticks.width).attr("shape-rendering",t.style.rendering).style("opacity",function(e){var r="log"==t[n].scale.value&&"1"!=e.toString().charAt(0);return r?.25:1})}function n(e,n){e.attr("x1",function(e){return"x"==n?t.x_scale(e):0}).attr("x2",function(e){return"x"==n?t.x_scale(e):l.width}).attr("y1",function(e){return"y"==n?t.y_scale(e):0}).attr("y2",function(e){return"y"==n?t.y_scale(e):l.height})}function r(t){return"number"==typeof t||"string"==typeof t?null:Object.keys(t)[0]}function a(t){if("number"==typeof t)return t;if("string"==typeof t)return parseFloat(t);var e=t[Object.keys(t)[0]];return"string"==typeof e?parseFloat(e):e}function i(e,n){e.attr("x1",function(t){return"y"==n?0:t.d3plus.x-l.margin.left}).attr("x2",function(t){return"y"==n?-5:t.d3plus.x-l.margin.left}).attr("y1",function(t){return"x"==n?l.height:t.d3plus.y-l.margin.top}).attr("y2",function(t){return"x"==n?l.height+5:t.d3plus.y-l.margin.top}).style("stroke",function(e){return d3plus.color.legible(d3plus.variable.color(t,e))}).style("stroke-width",t.style.data.stroke.width).attr("shape-rendering",t.style.rendering)}function o(e){function n(t){t.attr("x2",function(t){var e="x"==t.axis?t.x:t.x-t.r;return e}).attr("y2",function(t){var e="y"==t.axis?t.y:t.y+t.r;return e}).style("stroke-width",0).attr("opacity",0)}var r=d3.event.type==d3plus.evt.click&&(t.tooltip.value.long||t.html.value),a=[d3plus.evt.over,d3plus.evt.move].indexOf(d3.event.type)>=0;if(!r&&a&&"area"!=t.shape.value){if(e.data)var e=e.data;var i=[d3plus.util.copy(e.d3plus),d3plus.util.copy(e.d3plus)];i[0].axis="x",i[1].axis="y"}else var i=[];var o=A.selectAll("line.d3plus_axis_label").data(i,function(t){return t.axis+"_"+t.id});o.enter().append("line").attr("class","d3plus_axis_label").call(n).attr("x1",function(t){return"x"==t.axis?t.x:t.x-t.r}).attr("y1",function(t){return"y"==t.axis?t.y:t.y+t.r}).style("stroke",function(n){return d3plus.variable.color(t,e)}).attr("shape-rendering",t.style.rendering),o.transition().duration(t.style.timing.mouseevents).attr("class","d3plus_axis_label").attr("x2",function(e){return"x"==e.axis?e.x:l.margin.left-t.style.ticks.size}).attr("y2",function(e){return"y"==e.axis?e.y:l.height+l.margin.top+t.style.ticks.size}).style("stroke",function(n){return d3plus.color.legible(d3plus.variable.color(t,e))}).style("stroke-width",t.style.data.stroke.width).attr("opacity",1),o.exit().transition().duration(t.style.timing.mouseevents).call(n).remove();var s=A.selectAll("text.d3plus_axis_label").data(i,function(t){return t.axis+"_"+t.id});s.enter().append("text").attr("class","d3plus_axis_label").attr("id",function(t){return t.axis+"_"+t.id}).text(function(n){var r=d3plus.variable.value(t,e,t[n.axis].key);return t.format(r,t[n.axis].key)}).attr("x",function(e){return"x"==e.axis?e.x:l.margin.left-5-t.style.ticks.size}).attr("y",function(e){return"y"==e.axis?e.y:l.height+l.margin.top+5+t.style.ticks.size}).attr("dy",function(e){return"y"==e.axis?.35*t.style.ticks.font.size:t.style.ticks.font.size}).attr("text-anchor",function(t){return"y"==t.axis?"end":"middle"}).style("fill",function(n){return d3plus.color.legible(d3plus.variable.color(t,e))}).style("font-size",t.style.ticks.font.size).attr("font-family",t.style.font.family).attr("font-weight",t.style.font.weight).attr("opacity",0),s.transition().duration(t.style.timing.mouseevents).delay(t.style.timing.mouseevents).attr("opacity",1),s.exit().transition().duration(t.style.timing.mouseevents).attr("opacity",0).remove();var u=A.selectAll("rect.d3plus_axis_label").data(i,function(t){return t.axis+"_"+t.id});u.enter().insert("rect","text").attr("class","d3plus_axis_label").attr("x",function(e){var n=d3.select("text#"+e.axis+"_"+e.id).node().getBBox().width,r="x"==e.axis?e.x:l.margin.left-t.style.ticks.size;return"x"==e.axis?r-n/2-5:r-n-10}).attr("y",function(e){var n=d3.select("text#"+e.axis+"_"+e.id).node().getBBox().height,r="y"==e.axis?e.y:l.height+l.margin.top;return"x"==e.axis?r+t.style.ticks.size:r-n/2-5}).attr("width",function(t){var e=d3.select("text#"+t.axis+"_"+t.id).node().getBBox();return e.width+10}).attr("height",function(t){var e=d3.select("text#"+t.axis+"_"+t.id).node().getBBox();return e.height+10}).style("stroke",function(n){return d3plus.color.legible(d3plus.variable.color(t,e))}).style("fill","white").style("stroke-width",t.style.data.stroke.width).attr("shape-rendering",t.style.rendering).attr("opacity",0),u.transition().duration(t.style.timing.mouseevents).delay(t.style.timing.mouseevents).attr("opacity",1),u.exit().transition().duration(t.style.timing.mouseevents).attr("opacity",0).remove()}if(t.small)var l={margin:{top:0,right:0,bottom:0,left:0}};else var l={margin:{top:10,right:10,bottom:40,left:40}};if(l.width=t.app_width-l.margin.left-l.margin.right,l.height=t.app_height-l.margin.top-l.margin.bottom,t.data.app.length){if(t.tickValues||(t.tickValues={}),t.continuous_axis=null,t.opp_axis=null,t.stacked_axis=null,t.axes.values.forEach(function(e){if(t[e].stacked.value&&(t.stacked_axis=e),t.continuous_axis||"continuous"!=t[e].scale.value||(t.continuous_axis=e,t.opp_axis="x"==e?"y":"x"),t.data.changed||t.depth.changed||!t[e+"_range"]||t.time.fixed.value){if(t.dev.value&&d3plus.console.time("determining "+e+"-axis"),"share"==t[e].scale.value)t[e+"_range"]=[0,1],t.tickValues[e]=d3plus.util.buckets([0,1],11),t.stacked_axis=e;else if(t[e].stacked.value){if(t.time.fixed.value)var n=t.data.app;else var n=t.data.restricted.all;var r=d3.nest().key(function(e){return e[t.x.key]}).rollup(function(n){return d3.sum(n,function(n){return parseFloat(d3plus.variable.value(t,n,t[e].key))})}).entries(n);t[e+"_range"]=[0,d3.max(r,function(t){return t.values})]}else if(t[e].domain instanceof Array)t[e+"_range"]=t[e].domain,t.tickValues[e]=d3plus.util.uniques(t.data.app,t[e].key),t.tickValues[e]=t.tickValues[e].filter(function(n){return n>=t[e+"_range"][0]&&n<=t[e+"_range"][1]});else if(t.time.fixed.value)t[e+"_range"]=d3.extent(t.data.app,function(n){return parseFloat(d3plus.variable.value(t,n,t[e].key))}),t.tickValues[e]=d3plus.util.uniques(t.data.app,t[e].key);else{var a=[];for(id in t.id.nesting)a=a.concat(t.data.grouped[t.id.nesting[id]].all);t[e+"_range"]=d3.extent(a,function(n){return parseFloat(d3plus.variable.value(t,n,t[e].key))}),t.tickValues[e]=d3plus.util.uniques(t.data.restricted.all,t[e].key)}t[e+"_range"][0]==t[e+"_range"][1]&&(t[e+"_range"][0]-=1,t[e+"_range"][1]+=1),"y"==e&&(t.y_range=t.y_range.reverse()),t.dev.value&&d3plus.console.timeEnd("determining "+e+"-axis")}else t[e+"_range"]||(t[e+"_range"]=[-1,1])}),t.axes.mirror.value){var s=t.y_range.concat(t.x_range);t.x_range=d3.extent(s),t.y_range=d3.extent(s).reverse()}t.dev.value&&d3plus.console.time("removing data outside of axes");var u=t.data.app.length;if("share"==t.y.scale.value)var c=t.data.app;else var c=t.data.app.filter(function(e){var n=parseFloat(d3plus.variable.value(t,e,t.y.key)),r=null!=n&&n<=t.y_range[0]&&n>=t.y_range[1];if(r){var n=parseFloat(d3plus.variable.value(t,e,t.x.key));return null!=n&&n>=t.x_range[0]&&n<=t.x_range[1]}return!1});t.dev.value&&d3plus.console.timeEnd("removing data outside of axes");var p=u-c.length;if(p&&t.dev.value&&console.log("removed "+p+" nodes"),c){if(t.dev.value&&d3plus.console.time("determining size scale"),t.size.key){if(t.time.fixed.value)var f=d3.extent(t.data.app,function(e){var n=d3plus.variable.value(t,e,t.size.key);return 0==n?null:n});else{var h=[];for(id in t.id.nesting)h=h.concat(t.data.grouped[t.id.nesting[id]].all);var f=d3.extent(h,function(e){var n=d3plus.variable.value(t,e,t.size.key);return 0==n?null:n})}f[0]&&f[1]||(f=[0,0])}else var f=[0,0];var g=Math.floor(d3.max([d3.min([l.width,l.height])/15,10])),v=10;if(f[0]==f[1])var v=g;var y=[v,g],m=d3.scale[t.size.scale.value]().domain(f).rangeRound(y);t.dev.value&&d3plus.console.timeEnd("determining size scale")}t.axes.values.forEach(function(e){var n="x"==e?l.width:l.height;if(["continuous","share"].indexOf(t[e].scale.value)>=0)var r="linear";else var r=t[e].scale.value;if(t[e+"_scale"]=d3.scale[r]().domain(t[e+"_range"]).rangeRound([0,n]),["square","circle","donut"].indexOf(t.shape.value)>=0&&["share"].indexOf(t[e].scale.value)<0){var a=t[e+"_scale"],i=2*m.range()[1],o=a.invert(-i),s=a.invert(n+i);t[e+"_scale"].domain([o,s])}var u="x"==e?"bottom":"left";if(t[e+"_axis"]=d3.svg.axis().tickSize(t.style.ticks.size).tickPadding(5).orient(u).scale(t[e+"_scale"]).tickFormat(function(n,r){var a=!0;if(t[e].key==t.time.key&&n%1!=0&&(a=!1),("log"==t[e].scale.value&&"1"==n.toString().charAt(0)||"log"!=t[e].scale.value)&&a){if("share"==t[e].scale.value)var i=100*n+"%";else var i=t.format(n,t[e].key);if(d3.select(this).style("font-size",t.style.ticks.font.size).style("fill",t.style.ticks.font.color).attr("font-family",t.style.font.family).attr("font-weight",t.style.font.weight).text(i),"x"==e){var o=this.getBBox().width,s=this.getBBox().height;d3.select(this).attr("transform","translate(18,8)rotate(70)");var u=Math.ceil(Math.cos(25)*o+5);u>l.yoffset&&!t.small&&(l.yoffset=u);var c=Math.ceil(Math.cos(25)*s+5);c>l.rightoffset&&!t.small&&(l.rightoffset=c)}else{var c=this.getBBox().width;c>l.offset&&!t.small&&(l.offset=c)}}else var i=null;return i}),"continuous"==t[e].scale.value&&t.tickValues[e]){var c=d3.extent(t.tickValues[e]);t.tickValues[e]=d3.range(c[0],c[1]),t.tickValues[e].push(c[1]),t[e+"_axis"].tickValues(t.tickValues[e])}})}if(!c)var c=[];var b=t.group.selectAll("g#plane").data(["plane"]);b.enter().append("g").attr("id","plane").attr("transform","translate("+l.margin.left+","+l.margin.top+")");var x=b.selectAll("rect#background").data(["background"]);x.enter().append("rect").attr("id","background").attr("x",0).attr("y",0).attr("width",l.width).attr("height",l.height).attr("stroke-width",1).attr("stroke","#ccc").attr("shape-rendering",t.style.rendering).style("fill","#fafafa");var _=b.selectAll("path#mirror").data(["mirror"]);_.enter().append("path").attr("id","mirror").attr("fill","#000").attr("fill-opacity",.03).attr("stroke-width",1).attr("stroke","#ccc").attr("stroke-dasharray","10,10").attr("opacity",0);var w=t.group.selectAll("g#axes").data(["axes"]);w.enter().append("g").attr("id","axes");var k=b.selectAll("g#xgrid").data(["xgrid"]);k.enter().append("g").attr("id","xgrid");var z=b.selectAll("g#ygrid").data(["ygrid"]);z.enter().append("g").attr("id","ygrid");var S=b.selectAll("g#xaxis").data(["xaxis"]);S.enter().append("g").attr("id","xaxis").attr("transform","translate(0,"+l.height+")");var M=b.selectAll("g#yaxis").data(["yaxis"]);M.enter().append("g").attr("id","yaxis");var E=w.selectAll("text#xlabel").data(["xlabel"]);E.enter().append("text").attr("id","xlabel").attr("x",t.app_width/2).attr("y",t.app_height-10).text(t.format(t.x.key)).attr("font-family",t.style.font.family).attr("font-weight",t.style.font.weight).attr("font-size",t.style.labels.size).attr("fill",t.style.labels.color).attr("text-anchor",t.style.labels.align);
var C=w.selectAll("text#ylabel").data(["ylabel"]);C.enter().append("text").attr("id","ylabel").attr("y",15).attr("x",-(l.height/2+l.margin.top)).text(t.format(t.y.key)).attr("transform","rotate(-90)").attr("font-family",t.style.font.family).attr("font-weight",t.style.font.weight).attr("font-size",t.style.labels.size).attr("fill",t.style.labels.color).attr("text-anchor",t.style.labels.align);var A=t.group.selectAll("g#mouseevents").data(["mouseevents"]);A.enter().append("g").attr("id","mouseevents"),l.offset=0,M.call(t.y_axis).selectAll("line").call(e,"y"),l.margin.left+=l.offset,l.width-=l.offset,t.x_scale.rangeRound([0,l.width]),l.yoffset=0,l.rightoffset=0,S.call(t.x_axis).selectAll("line").call(e,"x"),l.height-=l.yoffset,l.width-=l.rightoffset,t.x_scale.rangeRound([0,l.width]),t.y_scale.rangeRound([0,l.height]),M.call(t.y_axis),S.call(t.x_axis),b.transition().duration(t.style.timing.transitions).attr("transform","translate("+l.margin.left+","+l.margin.top+")"),x.attr("width",l.width).attr("height",l.height),_.transition().duration(t.style.timing.transitions).attr("opacity",function(){return t.axes.mirror.value?1:0}).attr("d",function(){var t=l.width,e=l.height;return"M "+t+" "+e+" L 0 "+e+" L "+t+" 0 Z"}),M.transition().duration(t.style.timing.transitions).call(t.y_axis.scale(t.y_scale)),M.selectAll("line").transition().duration(t.style.timing.transitions).call(e,"y"),M.selectAll("path").style("fill","none"),S.transition().duration(t.style.timing.transitions).attr("transform","translate(0,"+l.height+")").call(t.x_axis.scale(t.x_scale)).selectAll("g.tick").select("text").style("text-anchor","start"),S.selectAll("line").transition().duration(t.style.timing.transitions).call(e,"x"),S.selectAll("path").style("fill","none");var T="continuous"==t.y.scale.value?t.y_scale.ticks(t.tickValues.y.length):t.y_scale.ticks(),O=z.selectAll("line").data(T);O.enter().append("line").style("opacity",0).call(n,"y").call(e,"y"),O.transition().duration(t.style.timing.transitions).style("opacity",1).call(n,"y").call(e,"y"),O.exit().transition().duration(t.style.timing.transitions).style("opacity",0).remove();var B="continuous"==t.x.scale.value?t.x_scale.ticks(t.tickValues.x.length):t.x_scale.ticks(),N=k.selectAll("line").data(B);N.enter().append("line").style("opacity",0).call(n,"x").call(e,"x"),N.transition().duration(t.style.timing.transitions).style("opacity",1).call(n,"x").call(e,"x"),N.exit().transition().duration(t.style.timing.transitions).style("opacity",0).remove(),E.text(t.format(t.x.key)).attr("x",t.app_width/2).attr("y",t.app_height-10).attr("opacity",function(){return 0==t.data.app.length?0:1}),C.text(t.format(t.y.key)).attr("y",15).attr("x",-(l.height/2+l.margin.top)).attr("opacity",function(){return 0==t.data.app.length?0:1}),t.axes.values.forEach(function(e){var n=b.selectAll("g.d3plus_"+e+"line").data(t[e].lines,function(t){return"number"==typeof t||"string"==typeof t?t:Object.keys(t)[0]}),i=n.enter().append("g").attr("class","d3plus_"+e+"line"),o="x"==e?"height":"width",s="x"==e?l.height-8+"px":"10px",u="x"==e?10:20;i.append("line").attr(e+"1",0).attr(e+"2",l[o]).attr("stroke","#ccc").attr("stroke-width",3).attr("stroke-dasharray","10,10"),i.append("text").style("font-size",t.style.ticks.font.size).style("fill",t.style.ticks.font.color).attr("text-align","start").attr(e,s),n.selectAll("line").transition().duration(t.style.timing.transitions).attr(e+"1",function(n){return a(n)?t[e+"_scale"](a(n)):0}).attr(e+"2",function(n){return a(n)?t[e+"_scale"](a(n)):0}).attr("opacity",function(n){var r=a(n)>t[e+"_scale"].domain()[1]&&a(n)<t[e+"_scale"].domain()[0];return null!=a(n)&&r?1:0}),n.selectAll("text").transition().duration(t.style.timing.transitions).text(function(){if(null!=a(d)){var e=t.format(a(d),y_name);return r(d)?t.format(r(d))+": "+e:e}return null}).attr(e,function(n){return t[e+"_scale"](a(n))+u+"px"})}),["line","area"].indexOf(t.shape.value)>=0&&m.rangeRound([2,2]),t.axis_offset={x:l.margin.left,y:l.margin.top},c.forEach(function(e){e.d3plus.x=t.x_scale(d3plus.variable.value(t,e,t.x.key)),e.d3plus.x+=t.axis_offset.x,e.d3plus.r=m(d3plus.variable.value(t,e,t.size.key)),t.stacked_axis||(e.d3plus.y=t.y_scale(d3plus.variable.value(t,e,t.y.key)),e.d3plus.y+=t.axis_offset.y,"area"==t.shape.value&&(e.d3plus[t.opp_axis+"0"]=t[t.opp_axis+"_scale"].range()[1],e.d3plus[t.opp_axis+"0"]+=t.axis_offset[t.opp_axis]))}),["line","area"].indexOf(t.shape.value)>=0&&(c=d3.nest().key(function(e){var n=d3plus.variable.value(t,e,t.id.key),r=e.d3plus.depth?e.d3plus.depth:0;return d3plus.util.strip(n)+"_"+r+"_"+t.shape.value}).rollup(function(e){var n=d3plus.util.uniques(e,t[t.continuous_axis].key),r=!1;return t.tickValues[t.continuous_axis].forEach(function(a,i,o){if(n.indexOf(a)<0){var l={};if(l[t[t.continuous_axis].key]=a,l[t.id.key]=e[0][t.id.key],l[t[t.opp_axis].key]=t[t.opp_axis+"_scale"].domain()[1],l.d3plus={},l.d3plus.r=m(m.domain()[0]),l.d3plus[t.continuous_axis]+=t.axis_offset[t.continuous_axis],t.stacked_axis||(l.d3plus[t.opp_axis]=t[t.opp_axis+"_scale"].range()[1],l.d3plus[t.opp_axis]+=t.axis_offset[t.opp_axis],l.d3plus[t.opp_axis+"0"]=l.d3plus[t.opp_axis]),t[t.continuous_axis].zerofill.value||t[t.opp_axis].stacked.value){var s=t[t.continuous_axis+"_scale"](a);s+=t.axis_offset[t.continuous_axis],l.d3plus[t.continuous_axis]=s,e.push(l)}else if("line"!=t.shape.value){if(!r&&i>0){var s=t[t.continuous_axis+"_scale"](o[i-1]);s+=t.axis_offset[t.continuous_axis],l.d3plus[t.continuous_axis]=s,e.push(l)}if(i<o.length-1){var s=t[t.continuous_axis+"_scale"](o[i+1]);s+=t.axis_offset[t.continuous_axis];var u=d3plus.util.copy(l);u.d3plus[t.continuous_axis]=s,e.push(u)}}r=!0}else r=!1}),e.sort(function(e,n){var r=e.d3plus[t.continuous_axis]-n.d3plus[t.continuous_axis];if(r)return r;var a=e[t[t.continuous_axis].key]-n[t[t.continuous_axis].key];return a}),e}).entries(c),c.forEach(function(e,n){t.id.nesting.forEach(function(n,r){r<=t.depth.value&&!e[n]&&(e[n]=d3plus.util.uniques(e.values,n).filter(function(t){return t&&"undefined"!=t})[0])})}));var D=null;if(t.order.key?D=t.order.key:t.continuous_axis?D=t[t.opp_axis].key:t.size.key&&(D=t.size.key),D&&c.sort(function(e,n){return e.values instanceof Array?(a_value=0,e.values.forEach(function(e){var n=d3plus.variable.value(t,e,D);n&&("number"==typeof n?a_value+=n:a_value=n)})):a_value=d3plus.variable.value(t,e,D),n.values instanceof Array?(b_value=0,n.values.forEach(function(e){var n=d3plus.variable.value(t,e,D);n&&("number"==typeof n?b_value+=n:b_value=n)})):b_value=d3plus.variable.value(t,n,D),t.color.key&&D==t.color.key&&(a_value=d3plus.variable.color(t,e),b_value=d3plus.variable.color(t,n),a_value=d3.rgb(a_value).hsl(),b_value=d3.rgb(b_value).hsl(),a_value=0==a_value.s?361:a_value.h,b_value=0==b_value.s?361:b_value.h),b_value>a_value?"desc"==t.order.sort.value?-1:1:a_value>b_value?"desc"==t.order.sort.value?1:-1:0}),t.stacked_axis)var j=d3.layout.stack().values(function(t){return t.values}).x(function(t){return t.d3plus.x}).x(function(t){return t.d3plus.y}).y(function(e){var n=l.height,r=d3plus.variable.value(t,e,t.y.key);return n-t.y_scale(r)}).out(function(e,n,r){var a=l.height;"share"==t[t.stacked_axis].scale.value?(e.d3plus.y0=(1-n)*a,e.d3plus.y=e.d3plus.y0-r*a):(e.d3plus.y0=a-n,e.d3plus.y=e.d3plus.y0-r),e.d3plus.y+=l.margin.top,e.d3plus.y0+=l.margin.top}),P="share"==t[t.stacked_axis].scale.value?"expand":"zero",c=j.offset(P)(c);else if(["area","line"].indexOf(t.shape.value)<0){var $=b.selectAll("g.d3plus_data_ticks").data(c,function(e){return e[t.id.key]+"_"+e.d3plus.depth}),q=$.enter().append("g").attr("class","d3plus_data_ticks").attr("opacity",0);q.append("line").attr("class","d3plus_data_y").call(i,"y"),$.selectAll("line.d3plus_data_y").call(i,"y"),q.append("line").attr("class","d3plus_data_x").call(i,"x"),$.selectAll("line.d3plus_data_x").call(i,"x"),$.transition().duration(t.style.timing.transitions).attr("opacity",1),$.exit().transition().duration(t.style.timing.transitions).attr("opacity",0).remove()}return t.mouse=o,c},d3plus.apps.geo_map={},d3plus.apps.geo_map.libs=["topojson"],d3plus.apps.geo_map.requirements=["color","coords"],d3plus.apps.geo_map.tooltip="follow",d3plus.apps.geo_map.shapes=["coordinates"],d3plus.apps.geo_map.scale=1,d3plus.apps.geo_map.nesting=!1,d3plus.apps.geo_map.zoom=!0,d3plus.apps.geo_map.draw=function(t){topojson.presimplify(t.coords.value);var e=t.coords.value,n=Object.keys(e.objects)[0];topo=topojson.feature(e,e.objects[n]),r=topo.features;var r=r.filter(function(e){return e[t.id.key]=e.id,t.coords.solo.value.length?t.coords.solo.value.indexOf(e.id)>=0:t.coords.mute.value.length?t.coords.mute.value.indexOf(e.id)<0:!0});return r},d3plus.apps.line={},d3plus.apps.line.requirements=["data","x","y"],d3plus.apps.line.tooltip="static",d3plus.apps.line.shapes=["line"],d3plus.apps.line.setup=function(t){t.x.scale.value="continuous"},d3plus.apps.line.draw=function(t){return d3plus.apps.chart.draw(t)},d3plus.apps.network={},d3plus.apps.network.requirements=["nodes","edges"],d3plus.apps.network.tooltip="static",d3plus.apps.network.shapes=["circle","square","donut"],d3plus.apps.network.scale=1.05,d3plus.apps.network.nesting=!1,d3plus.apps.network.zoom=!0,d3plus.apps.network.draw=function(t){var e=t.nodes.restricted||t.nodes.value,n=t.edges.restricted||t.edges.value,r=d3.extent(e,function(t){return t.x}),a=d3.extent(e,function(t){return t.y}),i=d3.extent(e,function(e){var n=d3plus.variable.value(t,e,t.size.key);return 0==n?null:n});"undefined"==typeof i[0]&&(i=[1,1]);var o=d3.min(d3plus.util.distances(e));if(o=t.edges.arrows.value?.45*o:.6*o,i[0]==i[1])var l=o;else{var s=r[1]+1.1*o-(r[0]-1.1*o),u=a[1]+1.1*o-(a[0]-1.1*o);if(aspect=s/u,app=t.app_width/t.app_height,app>aspect)var c=t.app_height/u;else var c=t.app_width/s;var l=.25*o;3>l*c&&(l=3/c)}var d=d3.scale[t.size.scale.value]().domain(i).rangeRound([l,o]);t.zoom.bounds=[[r[0]-1.1*o,a[0]-1.1*o],[r[1]+1.1*o,a[1]+1.1*o]];var p=[],f={};return e.forEach(function(e){var n=t.data.app.filter(function(n){return n[t.id.key]==e[t.id.key]})[0];if(n)var r=d3plus.util.merge(e,n);else var r=d3plus.util.copy(e);r.d3plus={},r.d3plus.x=e.x,r.d3plus.y=e.y;var a=d3plus.variable.value(t,r,t.size.key);r.d3plus.r=a?d(a):d.range()[0],f[r[t.id.key]]={x:r.d3plus.x,y:r.d3plus.y,r:r.d3plus.r},p.push(r)}),p.sort(function(t,e){return e.d3plus.r-t.d3plus.r}),n.forEach(function(e,n){e[t.edges.source]=d3plus.util.copy(e[t.edges.source]),e[t.edges.source].d3plus={};var r=f[e[t.edges.source][t.id.key]];e[t.edges.source].d3plus.r=r.r,e[t.edges.source].d3plus.x=r.x,e[t.edges.source].d3plus.y=r.y,e[t.edges.target]=d3plus.util.copy(e[t.edges.target]),e[t.edges.target].d3plus={};var a=f[e[t.edges.target][t.id.key]];e[t.edges.target].d3plus.r=a.r,e[t.edges.target].d3plus.x=a.x,e[t.edges.target].d3plus.y=a.y}),{nodes:p,edges:n}},d3plus.apps.rings={},d3plus.apps.rings.requirements=["edges","focus"],d3plus.apps.rings.tooltip="static",d3plus.apps.rings.shapes=["circle","square","donut"],d3plus.apps.rings.scale=1,d3plus.apps.rings.nesting=!1,d3plus.apps.rings.filter=function(t,e){var n=t.connections(t.focus.value,!0),r=[];n.forEach(function(e){r=r.concat(t.connections(e[t.id.key],!0))});var a=n.concat(r),i=d3plus.util.uniques(a,t.id.key);return void 0===e?i:e.filter(function(e){return i.indexOf(e[t.id.key])>=0})},d3plus.apps.rings.draw=function(t){function e(e,n){return a_value=d3plus.variable.value(t,e,p),b_value=d3plus.variable.value(t,n,p),t.color.key&&p==t.color.key?(a_value=d3plus.variable.color(t,e),b_value=d3plus.variable.color(t,n),a_value=d3.rgb(a_value).hsl(),b_value=d3.rgb(b_value).hsl(),a_value=0==a_value.s?361:a_value.h,b_value=0==b_value.s?361:b_value.h):(a_value=d3plus.variable.value(t,e,p),b_value=d3plus.variable.value(t,n,p)),b_value>a_value?"desc"==t.order.sort.value?-1:1:a_value>b_value?"desc"==t.order.sort.value?1:-1:void 0}var n=d3.min([t.app_height,t.app_width])/2,r=t.small||!t.labels.value?(n-2*t.style.labels.padding)/2:n/3,i=t.small||!t.labels.value?1.4*r:r,o=2*r,l=[],s=[],u=t.data.app.filter(function(e){return e[t.id.key]==t.focus.value})[0];u||(u={d3plus:{}},u[t.id.key]=t.focus.value),u.d3plus.x=t.app_width/2,u.d3plus.y=t.app_height/2,u.d3plus.r=.65*i;var c=[],d=[t.focus.value];t.connections(t.focus.value).forEach(function(e){var n=e[t.edges.source][t.id.key]==t.focus.value?e[t.edges.target]:e[t.edges.source],r=t.data.app.filter(function(e){return e[t.id.key]==n[t.id.key]})[0];r||(r={d3plus:{}},r[t.id.key]=n[t.id.key]),r.d3plus.edges=t.connections(r[t.id.key]).filter(function(e){return e[t.edges.source][t.id.key]!=t.focus.value&&e[t.edges.target][t.id.key]!=t.focus.value}),r.d3plus.edge=e,d.push(r[t.id.key]),c.push(r)});var p=null;p=t.order.key?t.order.key:t.color.key?t.color.key:t.size.key?t.size.key:t.id.key,c.sort(function(t,n){var r=t.d3plus.edges.length-n.d3plus.edges.length;return r?r:e(t,n)}),"number"==typeof t.edges.limit?c=c.slice(0,t.edges.limit):"function"==typeof t.edges.limit&&(c=t.edges.limit(c));var f=[],h=0;c.forEach(function(e){var n=e[t.id.key];e.d3plus.edges=e.d3plus.edges.filter(function(e){var r=e[t.edges.source][t.id.key],a=e[t.edges.target][t.id.key];return d.indexOf(r)<0&&a==n||d.indexOf(a)<0&&r==n}),h+=e.d3plus.edges.length||1,e.d3plus.edges.forEach(function(e){var r=e[t.edges.source],a=e[t.edges.target],i=a[t.id.key]==n?r:a;d.push(i[t.id.key])})}),c.sort(e);var g=0,v=2*Math.PI,y=0;c.forEach(function(n,r){var l=n.d3plus.edges.length||1,s=v/h*l;0==r&&(y=u,g-=s/2);var u=g+s/2;u-=v/4,n.d3plus.radians=u,n.d3plus.x=t.app_width/2+i*Math.cos(u),n.d3plus.y=t.app_height/2+i*Math.sin(u),g+=s,n.d3plus.edges.sort(function(r,a){var r=r[t.edges.source][t.id.key]==n[t.id.key]?r[t.edges.target]:r[t.edges.source],a=a[t.edges.source][t.id.key]==n[t.id.key]?a[t.edges.target]:a[t.edges.source];return e(r,a)}),n.d3plus.edges.forEach(function(e,r){var i=e[t.edges.source][t.id.key]==n[t.id.key]?e[t.edges.target]:e[t.edges.source],s=v/h,c=t.data.app.filter(function(e){return e[t.id.key]==i[t.id.key]})[0];c||(c={d3plus:{}},c[t.id.key]=i[t.id.key]),a=u-s*l/2+s/2+s*r,c.d3plus.radians=a,c.d3plus.x=t.app_width/2+o*Math.cos(a),c.d3plus.y=t.app_height/2+o*Math.sin(a),f.push(c)})});var m=d3.min(d3plus.util.distances(c,function(t){return[t.d3plus.x,t.d3plus.y]})),b=d3.min(d3plus.util.distances(f,function(t){return[t.d3plus.x,t.d3plus.y]}));if(m||(m=r/2),b||(b=r/4),8>m/2-4)var x=d3.min([m/2,8]);else var x=m/2-4;if(4>b/2-4)var _=d3.min([b/2,4]);else var _=b/2-4;_>r/10&&(_=r/10),x>1.5*_&&(x=1.5*_),x=Math.floor(x),_=Math.floor(_);var w=d3plus.util.uniques(c,t.id.key);w=w.concat(d3plus.util.uniques(f,t.id.key)),w.push(t.focus.value);var k=t.data.app.filter(function(e){return w.indexOf(e[t.id.key])>=0});if(t.size.key){var z=d3.extent(k,function(e){return d3plus.variable.value(t,e,t.size.key)});z[0]==z[1]&&(z[0]=0);var n=d3.scale.linear().domain(z).rangeRound([3,d3.min([x,_])]),S=d3plus.variable.value(t,u,t.size.key);u.d3plus.r=n(S)}else{var n=d3.scale.linear().domain([1,2]).rangeRound([x,_]);t.edges.label&&(u.d3plus.r=1.5*n(1))}return f.forEach(function(e){e.d3plus.ring=2;var r=t.size.key?d3plus.variable.value(t,e,t.size.key):2;e.d3plus.r=n(r)}),c.forEach(function(e,r){e.d3plus.ring=1;var a=t.size.key?d3plus.variable.value(t,e,t.size.key):1;e.d3plus.r=n(a);var s=[t.edges.source,t.edges.target];s.forEach(function(n){e.d3plus.edge[n].d3plus=e.d3plus.edge[n][t.id.key]==u[t.id.key]?{x:u.d3plus.x,y:u.d3plus.y,r:u.d3plus.r}:{x:e.d3plus.x,y:e.d3plus.y,r:e.d3plus.r}}),delete e.d3plus.edge.d3plus,l.push(e.d3plus.edge),t.connections(e[t.id.key]).forEach(function(n){var r=n[t.edges.source][t.id.key]==e[t.id.key]?n[t.edges.target]:n[t.edges.source];if(r[t.id.key]!=u[t.id.key]){var a=f.filter(function(e){return e[t.id.key]==r[t.id.key]})[0];if(a)var s=o;else{var s=i;a=c.filter(function(e){return e[t.id.key]==r[t.id.key]})[0]}if(a){n.d3plus={spline:!0,translate:{x:t.app_width/2,y:t.app_height/2}};var d=[t.edges.source,t.edges.target];d.forEach(function(r){n[r].d3plus=n[r][t.id.key]==e[t.id.key]?{a:e.d3plus.radians,r:i+e.d3plus.r,depth:1}:{a:a.d3plus.radians,r:s-a.d3plus.r,depth:2}}),l.push(n)}}})}),s=[u].concat(c).concat(f),s.forEach(function(e){if(!t.small&&t.labels.value)if(e[t.id.key]!=t.focus.value){e.d3plus.rotate=e.d3plus.radians*(180/Math.PI);var n=e.d3plus.rotate,a=r-3*t.style.labels.padding-e.d3plus.r;if(-90>n||n>90){n-=180;var o=-(e.d3plus.r+a/2+t.style.labels.padding),l="end"}else var o=e.d3plus.r+a/2+t.style.labels.padding,l="start";var s=c.indexOf(e)>=0?!0:!1,u=1==e.d3plus.ring?m:b;u+=2*t.style.labels.padding,e.d3plus.label={x:o,y:0,w:a,h:u,angle:n,anchor:l,valign:"center",color:d3plus.color.legible(d3plus.variable.color(t,e[t.id.key])),resize:[8,t.style.labels.font.size],background:s,mouse:!0}}else if(t.size.key||t.edges.label){var u=i-2*e.d3plus.r-2*t.style.labels.padding;e.d3plus.label={x:0,y:e.d3plus.r+u/2,w:i,h:u,color:d3plus.color.legible(d3plus.variable.color(t,e[t.id.key])),resize:[10,40],background:!0,mouse:!0}}else delete e.d3plus.rotate,delete e.d3plus.label;else delete e.d3plus.rotate,delete e.d3plus.label}),t.mouse[d3plus.evt.click]=function(e){e[t.id.key]!=t.focus.value&&(d3plus.tooltip.remove(t.type.value),t.viz.focus(e[t.id.key]).draw())},{edges:l,nodes:s,data:k}},d3plus.apps.scatter={},d3plus.apps.chart.fill=!0,d3plus.apps.chart.deprecates=["pie_scatter"],d3plus.apps.scatter.requirements=["data","x","y"],d3plus.apps.scatter.tooltip="static",d3plus.apps.scatter.shapes=["circle","square","donut"],d3plus.apps.scatter.scale=d3plus.apps.chart.scale,d3plus.apps.scatter.draw=function(t){return d3plus.apps.chart.draw(t)},d3plus.apps.stacked={},d3plus.apps.stacked.requirements=["data","x","y"],d3plus.apps.stacked.tooltip="static",d3plus.apps.stacked.shapes=["area"],d3plus.apps.stacked.threshold=.03,d3plus.apps.stacked.setup=function(t){t.dev.value&&d3plus.console.time("setting local variables"),t.x.scale.value="continuous",t.dev.value&&console.log('"x" scale set to "continuous"'),t.x.zerofill.value=!0,t.dev.value&&console.log('"x" zerofill set to "true"'),t.y.stacked.value=!0,!t.y.key&&t.size.key||t.size.changed&&t.size.previous==t.y.key?(t.y.key=t.size.key,t.y.changed=!0):(!t.size.key&&t.y.key||t.y.changed&&t.y.previous==t.size.key)&&(t.size.key=t.y.key,t.size.changed=!0),t.dev.value&&console.log('"y" stacked set to "true"'),t.dev.value&&d3plus.console.timeEnd("setting local variables")},d3plus.apps.stacked.draw=function(t){return d3plus.data.threshold(t,t.x.key),d3plus.apps.chart.draw(t)},d3plus.apps.tree_map={},d3plus.apps.tree_map.modes=["squarify","slice","dice","slice-dice"],d3plus.apps.tree_map.requirements=["data","size"],d3plus.apps.tree_map.tooltip="follow",d3plus.apps.tree_map.shapes=["square"],d3plus.apps.tree_map.threshold=5e-4,d3plus.apps.tree_map.draw=function(t){d3plus.data.threshold(t);var e=d3.nest();t.id.nesting.forEach(function(n,r){r<t.depth.value&&e.key(function(t){return t[n]})}),e=e.entries(t.data.app);var n=d3.layout.treemap().mode(t.type.mode.value).round(!0).size([t.app_width,t.app_height]).children(function(t){return t.values}).padding(1).sort(function(t,e){return t.value-e.value}).value(function(e){return d3plus.variable.value(t,e,t.size.key)}).nodes({name:"root",values:e}).filter(function(t){return!t.values&&t.area});if(n.length){for(var r=n[0];r.parent;)r=r.parent;n.forEach(function(t){t.d3plus.x=t.x+t.dx/2,t.d3plus.y=t.y+t.dy/2,t.d3plus.width=t.dx,t.d3plus.height=t.dy,t.d3plus.share=t.value/r.value})}return n},d3plus.color.darker=function(t,e){var n=d3.hsl(t);if(!e)var e=.2;return n.l-=e,n.l<.1&&(n.l=.1),n.toString()},d3plus.color.legible=function(t){var e=d3.hsl(t);return e.s>.9&&(e.s=.9),e.l>.4&&(e.l=.4),e.toString()},d3plus.color.lighter=function(t,e){var n=d3.hsl(t);if(!e)var e=.1;return n.l+=e,n.s-=e/2,n.l>.95&&(n.l=.95),n.s<.05&&(n.s=.05),n.toString()},d3plus.color.mix=function(t,e,n,r){if(!n)var n=1;if(!r)var r=1;t=d3.rgb(t),e=d3.rgb(e);var a=(n*t.r+r*e.r-n*r*e.r)/(n+r-n*r),i=(n*t.g+r*e.g-n*r*e.g)/(n+r-n*r),o=(n*t.b+r*e.b-n*r*e.b)/(n+r-n*r);return d3.rgb(a,i,o).toString()},d3plus.color.random=function(t){var e=t||Math.floor(20*Math.random());return d3plus.color.scale.default(e)},d3plus.color.scale={},d3plus.color.scale.default=d3.scale.ordinal().range(["#b35c1e","#C9853A","#E4BA79","#F5DD9E","#F3D261","#C4B346","#94B153","#254322","#4F6456","#759E80","#9ED3E3","#27366C","#7B91D3","#C6CBF7","#D59DC2","#E5B3BB","#E06363","#AF3500","#D74B03","#843012","#9A4400"]),d3plus.color.text=function(t){var e=d3.hsl(t),n="#f7f7f7",r="#444444";return e.l>.65?r:e.l<.49?n:e.h>35&&e.s>=.3?r:n},d3plus.data.analyze=function(t){},d3plus.data.color=function(t){t.dev.value&&d3plus.console.time("get data range");var e=[];if(t.data.pool.forEach(function(n){var r=parseFloat(d3plus.variable.value(t,n,t.color.key));"number"==typeof r&&!isNaN(r)&&e.indexOf(r)<0&&e.push(r)}),t.dev.value&&d3plus.console.timeEnd("get data range"),e.length>1){var n=null;if(t.dev.value&&d3plus.console.time("create color scale"),e=d3.extent(e),e[0]<0&&e[1]>0){var r=t.style.color.range;3==r.length&&(e.push(e[1]),e[1]=0)}else if(e[1]>0&&e[0]>=0){var r=t.style.color.heatmap;e=d3plus.util.buckets(e,r.length)}else{var r=t.style.color.range.slice(0);e[0]<0?r.pop():r.shift()}t.color.scale=d3.scale.sqrt().domain(e).range(r).interpolate(d3.interpolateRgb),t.dev.value&&d3plus.console.timeEnd("create color scale")}else t.color.scale=null},d3plus.data.edges=function(t){var e=d3plus.apps[t.type.value].requirements.indexOf("nodes")>=0,n=e&&!t.nodes.value;if(n){t.nodes.value=[];var r=[];t.nodes.changed=!0}t.edges.value.forEach(function(e){if("object"!=typeof e[t.edges.source]){var a={};a[t.id.key]=e[t.edges.source],e[t.edges.source]=a}if("object"!=typeof e[t.edges.target]){var a={};a[t.id.key]=e[t.edges.target],e[t.edges.target]=a}"keys"in t.data||(t.data.keys={}),t.id.key in t.data.keys||(t.data.keys[t.id.key]=typeof e[t.edges.source][t.id.key]),n&&(r.indexOf(e[t.edges.source][t.id.key])<0&&(r.push(e[t.edges.source][t.id.key]),t.nodes.value.push(e[t.edges.source])),r.indexOf(e[t.edges.target][t.id.key])<0&&(r.push(e[t.edges.target][t.id.key]),t.nodes.value.push(e[t.edges.target])))}),t.edges.linked=!0},d3plus.data.fetch=function(t,e,n){var r=[];if(t.dev.value&&d3plus.console.group('Fetching "'+e+'" data'),!n)if(t.time.solo.value.length){var n=[];t.time.solo.value.forEach(function(e){"function"==typeof e?t.data.time.forEach(function(t){e(t)&&n.push(t)}):n.push(e)})}else if(t.time.mute.value.length){var a=[];t.time.mute.value.forEach(function(e){"function"==typeof e?t.data.time.forEach(function(t){e(t)&&a.push(t)}):a.push(e)});var n=t.data.time.filter(function(t){return a.indexOf(t)<0})}else var n=["all"];if(t.dev.value&&console.log("years: "+n.join(",")),"restricted"==e)var i=t.data.restricted;else var i=t.data[e][t.id.nesting[t.depth.value]];if(1==n.length)r=i[n[0]];else{var o=[];n.forEach(function(t){i[t]?r=r.concat(i[t]):o.push(t)}),0==r.length&&o.length&&!t.internal_error&&(t.internal_error="No Data Available for "+o.join(", "),d3plus.console.warning(t.internal_error))}if(n.length>1){var l=!1;if(t.axes.values.forEach(function(e){t[e].key==t.time.key&&"continuous"==t[e].scale.value&&(l=!0)}),!l){var s=t.id.nesting.slice(0,t.depth.value+1);r=d3plus.data.nest(t,r,s,"grouped"==e)}}return r||(r=[]),t.dev.value&&d3plus.console.groupEnd(),r},d3plus.data.filter=function(t){if(t.check.indexOf("time")>=0&&(t.check.splice(t.check.indexOf("time"),1),t.data.filtered&&(t.data.filtered={all:t.data.filtered.all})),t.filters?t.check.forEach(function(e){var n=t[e].value?t[e].value:t[e].key;!n&&t.filters.indexOf(e)>=0&&t.filters.splice(t.filters.indexOf(e),1)}):t.filters=t.check.slice(0),t.check.length>=1){t.dev.value&&d3plus.console.group("Filtering Data by Required Variables");var e=t.filters.join(", ");t.dev.value&&d3plus.console.time(e);var n="value";t.filters.forEach(function(e){"xaxis"==e?t.x_range=null:"yaxis"==e&&(t.y_range=null),t.data.filtered=t.data[n].filter(function(n){var r=t[e].value?t[e].value:t[e].key,a=d3plus.variable.value(t,n,r);return"size"==e?a>0?!0:!1:null!=a}),n="filtered"}),t.data.filtered={all:t.data.filtered},t.dev.value&&d3plus.console.timeEnd(e),t.dev.value&&d3plus.console.groupEnd()}else t.data.filtered||(t.data.filtered={all:t.data.value});if(t.time.key&&1==Object.keys(t.data.filtered).length){t.dev.value&&d3plus.console.group("Disaggregating by Year"),t.data.time=d3plus.util.uniques(t.data.filtered.all,t.time.key);for(var r=0;r<t.data.time.length;r++)t.data.time[r]=parseInt(t.data.time[r]);t.data.time=t.data.time.filter(function(t){return t}),t.data.time.sort(),t.data.time.length&&(t.dev.value&&d3plus.console.time(t.data.time.length+" years"),t.data.time.forEach(function(e){t.data.filtered[e]=t.data.filtered.all.filter(function(n){return d3plus.variable.value(t,n,t.time.key)==e})}),t.dev.value&&d3plus.console.timeEnd(t.data.time.length+" years")),t.dev.value&&d3plus.console.groupEnd()}},d3plus.data.format=function(t,e){if(!e)var e="grouped";return return_data={},t.dev.value&&d3plus.console.group('Formatting "'+e+'" Data'),t.id.nesting.forEach(function(n){t.dev.value&&d3plus.console.time(n);var r=t.id.nesting.slice(0,t.id.nesting.indexOf(n)+1);return_data[n]={};for(y in t.data.restricted)return_data[n][y]="grouped"==e?d3plus.data.nest(t,t.data.restricted[y],r,!0):t.data.restricted[y];t.dev.value&&d3plus.console.timeEnd(n)}),t.dev.value&&d3plus.console.groupEnd(),return_data},d3plus.data.json=function(t,e,n){var r=t[e].url||t[e].value;t[e].url=r,t[e].value=[],d3.json(r,function(a,i){if(!a&&i)if("function"==typeof t[e].callback){var o=t[e].callback(i);if(o)if("object"==typeof o&&!(o instanceof Array)&&e in o)for(k in o)k in t&&(t[k].value=o[k]);else t[e].value=o}else t[e].value=i;else t.internal_error='Could not load data from: "'+r+'"';n()})},d3plus.data.keys=function(t,e){function n(r,a){if(r instanceof Array)r.forEach(function(t){n(t)});else if("object"==typeof r){for(var i in r)"object"==typeof r[i]?n(r[i]):i in t[e].keys||!r[i]||(t[e].keys[i]=typeof r[i]);a&&(r.d3plus={})}}if(t.dev.value&&d3plus.console.time("key analysis"),t[e].keys={},"object"==typeof t[e].value)for(a in t[e].value)n(t[e].value[a],"data"==e);else n(t[e].value,"data"==e);t.dev.value&&d3plus.console.timeEnd("key analysis")},d3plus.data.nest=function(t,e,n,r){var a=d3.nest(),i=[],o=["active","temp","total"];return n.forEach(function(e,l){a.key(function(n){return d3plus.variable.value(t,n,e)}),t.axes.values.forEach(function(e){d3plus.apps[t.type.value].requirements&&d3plus.apps[t.type.value].requirements.indexOf(e)>=0&&t[e].key&&"continuous"==t[e].scale.value&&a.key(function(n){return d3plus.variable.value(t,n,t[e].key)})}),l==n.length-1&&a.rollup(function(a){to_return={d3plus:{depth:l}},o.forEach(function(e){var n=t[e].key?t[e].key:e;to_return[n]=d3.sum(a,function(n){if(t[e].key){var r=d3plus.variable.value(t,n,t[e].key);if("number"!=typeof r)var r=r?1:0}else if("total"==e)var r=1;else var r=0;return r}),to_return.d3plus[n]=to_return[n]});var s=d3plus.variable.value(t,a[0],e);to_return[e]=s;for(key in t.data.keys)(n.indexOf(e)>=0&&n.indexOf(key)<=n.indexOf(e)||t.id.nesting.indexOf(e)>=0&&t.id.nesting.indexOf(key)<=t.id.nesting.indexOf(e))&&key in a[0]&&(!t.active.key||key!=t.active.key)&&"d3plus"!=key&&("function"==typeof t.aggs.value[key]?to_return[key]=t.aggs.value[key](a):"string"==typeof t.aggs.value[key]?to_return[key]=d3[t.aggs.value[key]](a,function(t){return t[key]}):[t.time.key,t.icon].indexOf(key)>=0||key==e&&!to_return[key]||t.x.key==key&&"continuous"==t.x.scale.value||t.y.key==key&&"continuous"==t.y.scale.value?to_return[key]=a[0][key]:"number"===t.data.keys[key]&&t.id.nesting.indexOf(key)<0?to_return[key]=d3.sum(a,function(t){return t[key]}):key&&(to_return[key]=a[0][key]));return r&&i.push(to_return),to_return})}),rename_key_value=function(t){return t.values&&t.values.length?(t.children=t.values.map(function(t){return rename_key_value(t)}),delete t.values,t):t.values?t.values:t},find_keys=function(e,r,a){if(e.children){"number"==t.data.keys[n[r]]&&(e.key=parseFloat(e.key)),a[n[r]]=e.key,delete e.key;for(k in a)e[k]=a[k];r++,e.children.forEach(function(t){find_keys(t,r,a)})}},a=a.entries(e).map(rename_key_value).map(function(t){return find_keys(t,0,{}),t}),r?i:a},d3plus.data.nodes=function(t){var e=t.nodes.value.filter(function(t){return"number"==typeof t.x&&"number"==typeof t.y}).length;if(e==t.nodes.value.length)t.nodes.positions=!0;else{var n=d3.layout.force().size([t.app_width,t.app_height]).nodes(t.nodes.value).links(t.edges.value),r=50,a=.01;n.start();for(var i=r;i>0&&(n.tick(),!(n.alpha()<a));--i);n.stop(),t.nodes.positions=!0}},d3plus.data.restrict=function(t){t.filtered=!0;var e=t.solo.length?"solo":"mute";if(t.data.grouped=null,t.data.restricted={},t[e].length){var n="filtered";t[e].forEach(function(r){function a(n){if(t[r][e]instanceof Array)var a=t[r][e];else var a=t[r][e].value;"id"==r&&"solo"==e&&t.focus.value&&a.indexOf(t.focus.value)<0&&a.push(t.focus.value);var i=!1;return a.forEach(function(t){"function"==typeof t?i=t(n):t==n&&(i=!0)}),i}function i(n){var i=!1;if(t[r].nesting)t[r].nesting.forEach(function(e){i||(i=a(d3plus.variable.value(t,n,e)))});else{var o=t[r].value?t[r].value:t[r].key;i=a(d3plus.variable.value(t,n,o))}return"solo"==e?i:"mute"==e?!i:void 0}t.dev.value&&d3plus.console.time(r);for(y in t.data[n])t.data.restricted[y]=t.data[n][y].filter(i);"id"==r&&(t.nodes.value&&(t.dev.value&&d3plus.console.log("Filtering Nodes"),t.nodes.restricted=t.nodes.value.filter(i)),t.edges.value&&(t.dev.value&&d3plus.console.log("Filtering Connections"),t.edges.restricted=t.edges.value.filter(function(e){var n=i(e[t.edges.source]),r=i(e[t.edges.target]);return n&&r}))),n="restricted",t.dev.value&&d3plus.console.timeEnd(r)})}else t.data.restricted=t.data.filtered},d3plus.data.threshold=function(t,e){if(t.size.threshold)if("number"==typeof t.size.threshold)var n=t.size.threshold;else if("number"==typeof d3plus.apps[t.type.value].threshold)var n=d3plus.apps[t.type.value].threshold;else var n=.02;else var n=0;if("number"==typeof n&&n>0){var r=[],a=0==t.depth.value?0:{},i=[],o={},l=d3.nest();e&&l.key(function(n){return d3plus.variable.value(t,n,e)}),l.rollup(function(n){var r=n.length;t.aggs[t.size.key]?"function"==typeof t.aggs[t.size.key]?r=t.aggs[t.size.key](n):"string"==typeof t.aggs[t.size.key]&&(r=d3[t.aggs[t.size.key]](n,function(e){return d3plus.variable.value(t,e,t.size.key)})):r=d3.sum(n,function(e){return d3plus.variable.value(t,e,t.size.key)});var a=e?d3plus.variable.value(t,n[0],e):"all";return o[a]=r,r}).entries(t.data.app),t.data.app=t.data.app.filter(function(l){var s=d3plus.variable.value(t,l,t.id.key),u=d3plus.variable.value(t,l,t.size.key),c=e?d3plus.variable.value(t,l,e):"all";if(r.indexOf(s)<0&&u/o[c]>=n&&r.push(s),r.indexOf(s)<0){if(0==t.depth.value)u>a&&(a=u);else{var d=l[t.id.nesting[t.depth.value-1]];d in a||(a[d]=0),u>a[d]&&(a[d]=u)}return i.push(l),!1}return!0});var s=t.id.nesting.slice(0,t.depth.value),u=s.concat([t.x.key]),c=d3plus.data.nest(t,i,u,!0).filter(function(e){return d3plus.variable.value(t,e,t.size.key)>0});c.forEach(function(e){var r=t.id.nesting[t.depth.value-1];if(e.d3plus={},t.id.nesting.forEach(function(n,r){if(t.depth.value==r){var a=e[t.id.nesting[r-1]];e[n]=a?"d3plus_other_"+a:"d3plus_other"}else r>t.depth.value&&delete e[n]}),t.color.key&&"string"==t.color.type&&(e[t.color.key]=0==t.depth.value?t.style.color.missing:d3plus.variable.color(t,e[r],r)),t.icon.key&&0!=t.depth.value&&(e[t.icon.key]=d3plus.variable.value(t,e[r],t.icon.key,r),e.d3plus.depth=t.id.nesting.indexOf(r)),t.text.key){if(0==t.depth.value)e[t.text.key]=t.format("Values"),e[t.text.key]+=" < "+t.format(a);else{var o=d3plus.variable.value(t,e,t.text.key,r);e[t.text.key]=o,e[t.text.key]+=" < "+t.format(a[e[r]],t.size.key)}e[t.text.key]+=" ("+t.format(100*n)+"%)",e.d3plus.threshold=a,r?(e.d3plus.merged=[],i.forEach(function(n){e[r]==n[r]&&e.d3plus.merged.push(n[t.id.key])})):e.d3plus.merged=d3plus.util.uniques(i,t.id.key)}}),t.data.app=t.data.app.concat(c)}},d3plus.draw.app=function(t){if(t.group=t.g.apps[t.type.value],t.mouse={},t.internal_error)var e=null;
else{t.dev.value&&d3plus.console.group('Calculating "'+t.type.value+'"');var e=d3plus.apps[t.type.value].draw(t);t.dev.value&&d3plus.console.groupEnd()}t.returned={nodes:null,edges:null},e instanceof Array?t.returned.nodes=e:e&&(e.nodes&&(t.returned.nodes=e.nodes),e.edges&&(t.returned.edges=e.edges));var n=t.returned.nodes;n&&n instanceof Array&&n.length||(t.dev.value&&d3plus.console.log("No data returned by app."),t.returned.nodes=[])},d3plus.draw.container=function(t){if(t.container.changed){t.parent=d3.select(t.container.value),t.parent.style("overflow","hidden").style("position",function(){var t=d3.select(this).style("position"),e=["absolute","fixed"].indexOf(t)>=0;return e?t:"relative"}).html("");var e=["width","height"];e.forEach(function(e){function n(r){if(void 0===r.tagName||["BODY","HTML"].indexOf(r.tagName)>=0){var a=window["inner"+e.charAt(0).toUpperCase()+e.slice(1)],i=document!=r?d3.select(r):null;i&&"width"==e?(a-=parseFloat(i.style("margin-left"),10),a-=parseFloat(i.style("margin-right"),10),a-=parseFloat(i.style("padding-left"),10),a-=parseFloat(i.style("padding-right"),10)):i&&"height"==e&&(a-=parseFloat(i.style("margin-top"),10),a-=parseFloat(i.style("margin-bottom"),10),a-=parseFloat(i.style("padding-top"),10),a-=parseFloat(i.style("padding-bottom"),10)),1==d3.selectAll("body > *:not(script)").size()&&d3.select("body").style("overflow","hidden"),20>=a&&(a=t[e].small),t[e].value=a}else{var a=parseFloat(d3.select(r).style(e),10);"number"==typeof a&&a>0?t[e].value=a:"BODY"!=r.tagName&&n(r.parentNode)}}t[e].value||n(t.parent.node())}),t.parent.style("width",t.width.value+"px").style("height",t.height.value+"px")}t.app_width=t.width.value,t.app_height=t.height.value},d3plus.draw.enter=function(t){t.svg=t.parent.selectAll("svg#d3plus").data([0]),t.svg.enter().insert("svg","#d3plus_message").attr("id","d3plus").attr("width",t.width.value).attr("height",t.height.value).attr("xmlns","http://www.w3.org/2000/svg").attr("xmlns:xmlns:xlink","http://www.w3.org/1999/xlink"),t.g.bg=t.svg.selectAll("rect#bg").data(["bg"]),t.g.bg.enter().append("rect").attr("id","bg").attr("fill",t.style.background).attr("width",t.width.value).attr("height",t.height.value),t.g.timeline=t.svg.selectAll("g#timeline").data(["timeline"]),t.g.timeline.enter().append("g").attr("id","timeline").attr("transform","translate(0,"+t.height.value+")"),t.g.legend=t.svg.selectAll("g#key").data(["key"]),t.g.legend.enter().append("g").attr("id","key").attr("transform","translate(0,"+t.height.value+")"),t.g.footer=t.svg.selectAll("g#footer").data(["footer"]),t.g.footer.enter().append("g").attr("id","footer").attr("transform","translate(0,"+t.height.value+")"),t.g.clipping=t.svg.selectAll("#clipping").data(["clipping"]),t.g.clipping.enter().append("clipPath").attr("id","clipping").append("rect").attr("width",t.app_width).attr("height",t.app_height),t.g.container=t.svg.selectAll("g#container").data(["container"]),t.g.container.enter().append("g").attr("id","container").attr("clip-path","url(#clipping)").attr("transform","translate("+t.margin.left+","+t.margin.top+")"),t.g.zoom=t.g.container.selectAll("g#zoom").data(["zoom"]),t.g.zoom.enter().append("g").attr("id","zoom"),t.g.viz=t.g.zoom.selectAll("g#d3plus_viz").data(["d3plus_viz"]),t.g.viz.enter().append("g").attr("id","d3plus_viz"),t.g.overlay=t.g.viz.selectAll("rect#d3plus_overlay").data([{id:"d3plus_overlay"}]),t.g.overlay.enter().append("rect").attr("id","d3plus_overlay").attr("width",t.width.value).attr("height",t.height.value).attr("opacity",0),d3plus.touch?t.g.overlay.on(d3plus.evt.over,t.touchEvent).on(d3plus.evt.move,t.touchEvent).on(d3plus.evt.out,t.touchEvent):t.g.overlay.on(d3plus.evt.move,function(e){e.dragging||(d3plus.apps[t.type.value].zoom&&t.zoom.pan.value&&t.zoom_behavior.scaleExtent()[0]<t.zoom.scale?d3.select(this).style("cursor",d3plus.prefix()+"grab"):d3.select(this).style("cursor","auto"))}).on(d3plus.evt.up,function(e){d3plus.apps[t.type.value].zoom&&t.zoom.pan.value&&t.zoom_behavior.scaleExtent()[0]<t.zoom.scale?(e.dragging=!1,d3.select(this).style("cursor",d3plus.prefix()+"grab")):d3.select(this).style("cursor","auto")}).on(d3plus.evt.down,function(e){d3plus.apps[t.type.value].zoom&&t.zoom.pan.value&&t.zoom_behavior.scaleExtent()[0]<t.zoom.scale?(e.dragging=!0,d3.select(this).style("cursor",d3plus.prefix()+"grabbing")):d3.select(this).style("cursor","auto")}),t.g.app=t.g.viz.selectAll("g#app").data(["app"]),t.g.app.enter().append("g").attr("id","app"),t.g.edges=t.g.viz.selectAll("g#edges").data(["edges"]),t.g.edges.enter().append("g").attr("id","edges").attr("opacity",0),t.g.edge_focus=t.g.viz.selectAll("g#focus").data(["focus"]),t.g.edge_focus.enter().append("g").attr("id","focus"),t.g.edge_hover=t.g.viz.selectAll("g#edge_hover").data(["edge_hover"]),t.g.edge_hover.enter().append("g").attr("id","edge_hover").attr("opacity",0),t.g.data=t.g.viz.selectAll("g#data").data(["data"]),t.g.data.enter().append("g").attr("id","data").attr("opacity",0),t.g.data_focus=t.g.viz.selectAll("g#data_focus").data(["data_focus"]),t.g.data_focus.enter().append("g").attr("id","data_focus"),t.g.labels=t.g.viz.selectAll("g#d3plus_labels").data(["d3plus_labels"]),t.g.labels.enter().append("g").attr("id","d3plus_labels"),t.defs=t.svg.selectAll("defs").data(["defs"]),t.defs.enter().append("defs")},d3plus.draw.errors=function(t){var e=["id"];d3plus.apps[t.type.value].requirements&&(e=e.concat(d3plus.apps[t.type.value].requirements));var n=[];if(e.forEach(function(e){var r="key"in t[e]?"key":"value";t[e][r]||n.push(e)}),n.length&&(t.internal_error="The following variables need to be set: "+n.join(", ")),!t.internal_error&&e.indexOf("edges")>=0&&e.indexOf("focus")>=0){var r=t.connections(t.focus.value);if(0==r.length){var a=d3plus.variable.text(t,t.focus.value,t.depth.value);t.internal_error='No Connections Available for "'+a+'"'}}var e=["d3"];d3plus.apps[t.type.value].libs&&(e=e.concat(d3plus.apps[t.type.value].libs));var n=[];if(e.forEach(function(t){window[t]||n.push(t)}),n.length){var i=n.join(", ");t.internal_error="The following libraries need to be loaded: "+i}if(t.shape.value){if(d3plus.apps[t.type.value].shapes.indexOf(t.shape.value)<0){var o=d3plus.apps[t.type.value].shapes.join('", "');d3plus.console.warning('"'+t.shape.value+'" is not an accepted shape for the "'+t.type.value+'" app, please use one of the following: "'+o+'"'),t.shape.previous=t.shape.value,t.shape.value=d3plus.apps[t.type.value].shapes[0],d3plus.console.log('Defaulting shape to "'+t.shape.value+'"')}}else t.shape.value=d3plus.apps[t.type.value].shapes[0];if("modes"in d3plus.apps[t.type.value])if(t.type.mode.value){if(d3plus.apps[t.type.value].modes.indexOf(t.type.mode.value)<0){var l=d3plus.apps[t.type.value].modes.join('", "');d3plus.console.warning('"'+t.type.mode.value+'" is not an accepted mode for the "'+t.type.value+'" app, please use one of the following: "'+l+'"'),t.type.mode.previous=t.type.mode.value,t.type.mode.value=d3plus.apps[t.type.value].modes[0],d3plus.console.log('Defaulting mode to "'+t.type.mode.value+'"')}}else t.type.mode.value=d3plus.apps[t.type.value].modes[0]},d3plus.draw.finish=function(t){function e(t){t.changed&&(t.changed=!1);for(o in t)null==t[o]||"object"!=typeof t[o]||t[o]instanceof Array||e(t[o])}d3plus.apps[t.type.value].zoom&&t.zoom.value?(t.dev.value&&d3plus.console.time("calculating zoom"),!t.init&&t.zoom.bounds&&d3plus.zoom.bounds(t,t.zoom.bounds,0),(t.focus.changed||t.height.changed||t.width.changed)&&(t.zoom.viewport?d3plus.zoom.bounds(t,t.zoom.viewport):d3plus.zoom.bounds(t,t.zoom.bounds)),t.dev.value&&d3plus.console.timeEnd("calculating zoom")):t.zoom.scale=1;var n=t.zoom.size?t.zoom.size.width:t.app_width,r=t.zoom.size?t.zoom.size.height:t.app_height,a=t.zoom.bounds?t.zoom.bounds[0][0]:0,i=t.zoom.bounds?t.zoom.bounds[0][1]:0;if(t.g.overlay.attr("width",n).attr("height",r).attr("x",a).attr("y",i),t.update?(d3plus.shape.edges(t),(t.timing||!d3plus.apps[t.type.value].zoom&&!t.timing)&&(t.dev.value&&d3plus.console.time("data labels"),d3plus.shape.labels(t,t.g.data.selectAll("g")),t.dev.value&&d3plus.console.timeEnd("data labels"),t.edges.label&&setTimeout(function(){t.dev.value&&d3plus.console.time("edge labels"),d3plus.shape.labels(t,t.g.edges.selectAll("g")),t.dev.value&&d3plus.console.timeEnd("edge labels")},t.timing))):d3plus.apps[t.type.value].zoom&&t.zoom.value&&t.timing&&setTimeout(function(){d3plus.zoom.labels(t)},t.timing),d3plus.apps[t.type.value].zoom&&t.zoom.value&&t.focus.value&&!t.timing&&(t.dev.value&&d3plus.console.time("focus labels"),d3plus.shape.labels(t,t.g.data_focus.selectAll("g")),t.edges.label&&setTimeout(function(){d3plus.shape.labels(t,t.g.edge_focus.selectAll("g"))},t.timing),t.dev.value&&d3plus.console.timeEnd("focus labels")),!t.internal_error){var l=d3plus.apps[t.type.value].requirements.indexOf("data")>=0;t.data.app&&t.returned.nodes.length||!l||(t.internal_error="No Data Available")}var s=t.type.previous;s&&t.type.value!=s&&t.g.apps[s]&&(t.dev.value&&d3plus.console.group('Hiding "'+s+'"'),t.timing?t.g.apps[s].transition().duration(t.timing).attr("opacity",0):t.g.apps[s].attr("opacity",0),t.dev.value&&d3plus.console.groupEnd());var l=d3plus.apps[t.type.value].requirements.indexOf("data")>=0,u=l&&0==t.data.app.length||t.internal_error?0:t.focus.value&&d3plus.apps[t.type.value].zoom&&t.zoom.value?.4:1,c=t.group.attr("opacity");if(u!=c){var d=t.style.timing.transitions;t.group.transition().duration(d).attr("opacity",u),t.g.data.transition().duration(d).attr("opacity",u),t.g.edges.transition().duration(d).attr("opacity",u)}e(t),t.internal_error?(d3plus.ui.message(t,t.internal_error),t.internal_error=null):d3plus.ui.message(t),setTimeout(function(){t.frozen=!1,t.update=!0,t.init=!0,d3plus.apps[t.type.value].zoom&&t.zoom.value?(t.g.zoom.datum(t).call(t.zoom_behavior.on("zoom",d3plus.zoom.mouse)),t.zoom.scroll.value||t.g.zoom.on("wheel.zoom",null),t.zoom.click.value||t.g.zoom.on("dblclick.zoom",null),t.zoom.pan.value||(t.g.zoom.on("mousemove.zoom",null),t.g.zoom.on("mousedown.zoom",null))):t.g.zoom.call(t.zoom_behavior.on("zoom",null))},t.timing)},d3plus.draw.focus=function(t){if(t.g.edge_focus.selectAll("g").remove(),t.g.data_focus.selectAll("g").remove(),t.focus.value&&d3plus.apps[t.type.value].zoom&&t.zoom.value){t.dev.value&&d3plus.console.time("drawing focus elements");var n=t.g.edges.selectAll("g");if(n.size()>0){n.each(function(e){var n=e[t.edges.source][t.id.key],r=e[t.edges.target][t.id.key];if(n==t.focus.value||r==t.focus.value){var a=t.g.edge_focus.node().appendChild(this.cloneNode(!0));d3.select(a).datum(e).attr("opacity",1).selectAll("line, path").datum(e)}});var r=t.edges.arrows.value;t.g.edge_focus.selectAll("line, path").attr("vector-effect","non-scaling-stroke").style("stroke",t.style.highlight.focus).style("stroke-width",function(){return t.edges.size?d3.select(this).style("stroke-width"):2*t.style.data.stroke.width}).attr("marker-start",function(e){var n=t.edges.arrows.direction.value;if("bucket"in e.d3plus)var a="_"+e.d3plus.bucket;else var a="";return"source"==n&&r?"url(#d3plus_edge_marker_focus"+a+")":"none"}).attr("marker-end",function(e){var n=t.edges.arrows.direction.value;if("bucket"in e.d3plus)var a="_"+e.d3plus.bucket;else var a="";return"target"==n&&r?"url(#d3plus_edge_marker_focus"+a+")":"none"}),t.g.edge_focus.selectAll("text").style("fill",t.style.highlight.focus)}var a=d3plus.util.uniques(t.connections(t.focus.value,!0),t.id.key);a.push(t.focus.value);var i=[],o=[],l=[0],s=[0],u=t.g.data.selectAll("g").each(function(n){if(a.indexOf(n[t.id.key])>=0){var r=t.g.data_focus.node().appendChild(this.cloneNode(!0)),r=d3.select(r).datum(n).attr("opacity",1);"coordinates"==t.shape.value?t.zoom.viewport=t.path.bounds(t.zoom.coords[n.d3plus.id]):"d3plus"in n&&("x"in n.d3plus&&i.push(n.d3plus.x),"y"in n.d3plus&&o.push(n.d3plus.y),"r"in n.d3plus?(l.push(n.d3plus.r),s.push(n.d3plus.r)):("width"in n.d3plus&&l.push(n.d3plus.width/2),"height"in n.d3plus&&s.push(n.d3plus.height/2)));for(e in d3plus.evt){var u=d3.select(this).on(d3plus.evt[e]);u&&r.on(d3plus.evt[e],u)}}});if(i.length&&o.length){var c=d3.extent(i),d=d3.extent(o),p=d3.max(l),f=d3.max(s);t.zoom.viewport=[[c[0]-p,d[0]-f],[c[1]+p,d[1]+f]]}t.g.data_focus.selectAll("path").style("stroke-width",2*t.style.data.stroke.width),t.dev.value&&d3plus.console.timeEnd("drawing focus elements")}else t.zoom.viewport=null},d3plus.draw.steps=function(t){var e=[],n=["data","attrs","coords","nodes","edges"];return n.forEach(function(n){("string"==typeof t[n].value||!t[n].value&&t[n].url)&&e.push({"function":function(t,e){d3plus.data.json(t,n,e)},message:"Loading Data",wait:!0})}),e.push({check:function(t){return t.update&&"function"==typeof d3plus.apps[t.type.value].setup},"function":d3plus.apps[t.type.value].setup,message:'Initializing "'+t.type.value+'"'}),e.push({"function":function(t){t.type.previous&&t.type.value!=t.type.previous&&d3plus.tooltip.remove(t.type.previous),d3plus.tooltip.remove(t.type.value)},message:"Resetting Tooltips"}),t.update&&(e.push({check:function(t){return t.container.changed},"function":d3plus.draw.enter,message:"Creating SVG Elements"}),e.push({check:function(t){return!(t.type.value in t.g.apps)},"function":function(t){t.g.apps[t.type.value]=t.g.app.selectAll("g#"+t.type.value).data([t.type.value]),t.g.apps[t.type.value].enter().append("g").attr("id",t.type.value).attr("opacity",0)},message:'Creating "'+t.type.value+'" Group'}),e.push({check:function(t){return t.data.changed},"function":function(t){t.data.filtered=null,t.data.grouped=null,t.data.app=null,t.data.restricted=null,t.nodes.restricted=null,t.edges.restricted=null,d3plus.data.keys(t,"data")},message:"Analyzing New Data"}),e.push({check:function(t){return t.attrs.changed},"function":function(t){d3plus.data.keys(t,"attrs")},message:"Analyzing New Attributes"}),e.push({check:function(t){var e=d3plus.apps[t.type.value].requirements.indexOf("edges")>=0;return(!t.edges.linked||t.edges.changed)&&e&&t.edges.value},"function":d3plus.data.edges,message:"Analyzing Network"}),e.push({check:function(t){var e=d3plus.apps[t.type.value].requirements.indexOf("nodes")>=0;return e&&(!t.nodes.positions||t.nodes.changed)&&t.nodes.value&&t.edges.value},"function":d3plus.data.nodes,message:"Analyzing Network"}),e.push({check:function(t){t.check=[];for(k in t)t[k]&&t[k].data_filter&&t[k].changed&&t.check.push(k);return!t.data.filtered||t.check.length||t.active.changed||t.temp.changed||t.total.changed},"function":function(t){t.data.grouped=null,t.data.app=null,d3plus.data.filter(t)},message:"Filtering Data"}),e.push({check:function(t){return t.mute.length>0||t.solo.length>0},"function":d3plus.data.restrict,message:"Filtering Data",otherwise:function(t){(t.filtered||!t.data.restricted||t.check.length)&&(t.data.restricted=d3plus.util.copy(t.data.filtered),t.data.grouped=null,t.data.app=null,t.nodes.restricted=null,t.edges.restricted=null,t.filtered=!1)}}),e.push({check:function(t){return!t.data.grouped},"function":function(t){t.data.grouped=d3plus.data.format(t,"grouped")},message:"Formatting Data"}),e.push({check:function(t){var e=t.time.fixed.value?null:["all"];return null===e&&(t.time.solo.changed||t.time.mute.changed||t.depth.changed)||!t.data.pool||"function"==typeof d3plus.apps[t.type.value].filter},"function":function(t){var e=t.time.fixed.value?null:["all"];t.data.pool=d3plus.data.fetch(t,"grouped",e),"function"==typeof d3plus.apps[t.type.value].filter&&(t.data.pool=d3plus.apps[t.type.value].filter(t,t.data.pool))},message:"Formatting Data"}),e.push({check:function(t){return!t.data.app||t.depth.changed||t.time.solo.changed||t.time.mute.changed||t.solo.length||t.mute.length||"function"==typeof d3plus.apps[t.type.value].filter},"function":function(t){t.data.app=d3plus.data.fetch(t,"grouped"),"function"==typeof d3plus.apps[t.type.value].filter&&(t.data.app=d3plus.apps[t.type.value].filter(t,t.data.app))},message:"Formatting Data"}),e.push({check:function(t){if(t.color.changed&&t.color.key){if("object"==typeof t.color.key)if(t.color.key[t.id.key])var e=t.color.key[t.id.key];else var e=t.color.key[Object.keys(t.color.key)[0]];else var e=t.color.key;t.color.type=t.data.keys&&e in t.data.keys?t.data.keys[e]:t.attrs.keys&&e in t.attrs.keys?t.attrs.keys[e]:void 0}else t.color.key||(t.color.type=t.data.keys[t.id.key]);return t.color.key&&"number"==t.color.type&&t.id.nesting.indexOf(t.color.key)<0&&t.data.value&&t.color.key!=t.id.key&&(t.color.changed||t.data.changed||t.depth.changed||t.time.fixed.value&&(t.time.solo.changed||t.time.mute.changed))},"function":d3plus.data.color,message:"Calculating Colors",otherwise:function(t){"number"!=t.color.type&&(t.color.scale=null)}})),e.push({"function":function(t){if(t.margin={top:0,right:0,bottom:0,left:0},d3plus.ui.titles(t),t.update)d3plus.ui.timeline(t),d3plus.ui.legend(t);else{var e=t.g.timeline.node().getBBox();e=e.height+e.y;var n=t.g.legend.node().getBBox();if(n=n.height+n.y,n&&e)var r=3*t.style.ui.padding;else if(n||e)var r=2*t.style.ui.padding;else var r=0;t.margin.bottom+=e+n+r}d3plus.ui.history(t),t.app_height-=t.margin.top+t.margin.bottom},message:"Updating UI"}),e.push({"function":[d3plus.ui.focus,d3plus.draw.update],message:"Updating UI"}),e.push({"function":function(t){t.update&&(d3plus.draw.errors(t),d3plus.draw.app(t),d3plus.shape.draw(t)),d3plus.draw.focus(t),d3plus.draw.finish(t)},message:"Drawing Visualization"}),e},d3plus.draw.update=function(t){t.timing?(t.parent.transition().duration(t.timing).style("width",t.width.value+"px").style("height",t.height.value+"px"),t.svg.transition().duration(t.timing).attr("width",t.width.value).attr("height",t.height.value),t.g.bg.transition().duration(t.timing).attr("width",t.width.value).attr("height",t.height.value),t.g.clipping.select("rect").transition().duration(t.timing).attr("width",t.app_width).attr("height",t.app_height),t.g.container.transition().duration(t.timing).attr("transform","translate("+t.margin.left+","+t.margin.top+")")):(t.parent.style("width",t.width.value+"px").style("height",t.height.value+"px"),t.svg.attr("width",t.width.value).attr("height",t.height.value),t.g.bg.attr("width",t.width.value).attr("height",t.height.value),t.g.clipping.select("rect").attr("width",t.app_width).attr("height",t.app_height),t.g.container.attr("transform","translate("+t.margin.left+","+t.margin.top+")"))},d3plus.font.awesome=!1;for(var s=0;s<document.styleSheets.length;s++){var sheet=document.styleSheets[s];if(sheet.href&&sheet.href.indexOf("font-awesome")>=0){d3plus.font.awesome=!0;break}}d3plus.font.tester=function(){var t=d3.select("body").selectAll("div.d3plus_tester").data(["d3plus_tester"]);return t.enter().append("div").attr("class","d3plus_tester").style("position","absolute").style("left","-9999px").style("top","-9999px").style("visibility","hidden").style("display","block"),t},d3plus.font.validate=function(t){function e(t){return r.append("span").style("font-family",t).style("font-size","32px").style("padding","0px").style("margin","0px").text("abcdefghiABCDEFGHI_!@#$%^&*()_+1234567890")}function n(t,e){var n=t.node().offsetWidth,r=e.node().offsetWidth;return n!==r}t instanceof Array||(t=t.split(","));var r=d3plus.font.tester(),a=e("monospace"),i=e("sans-serif");for(font in t){var o=t[font].trim(),l=e(o+",monospace"),s=n(l,a);if(l.remove(),!s){var l=e(o+",sans-serif");s=n(l,i),l.remove()}if(s){s=o;break}}return s||(s="sans-serif"),a.remove(),i.remove(),s},d3plus.forms.button=function(t,e,n){function r(e){e.on(d3plus.evt.over,function(e,n){t.hover=e.value,1==t.data.array.length||e.value!=t.highlight?d3plus.ie||0==t.timing?d3.select(this).style("cursor","pointer").call(s):d3.select(this).style("cursor","pointer").transition().duration(100).call(s):d3.select(this).style("cursor","auto")}).on(d3plus.evt.out,function(e){t.hover=!1,d3plus.ie||d.size()>=t.large?d3.select(this).style("cursor","auto").call(s):d3.select(this).style("cursor","auto").transition().duration(100).call(s)}).on("click",function(e){t.propagation||d3.event.stopPropagation(),t.callback&&e.value&&t.callback(e)})}if(t.dev&&d3plus.console.time("calculating borders and padding"),"all"==e.border)var a=e.stroke+"px",i=e.padding+"px";else{var o=["top","right","bottom","left"],a="",i="";o.forEach(function(t,n){e.border.indexOf(t)>=0?(a+=e.stroke+"px",i+=e.padding+"px"):(a+="0px",i+=e.padding+e.stroke+"px"),n<o.length-1&&(a+=" ",i+=" ")})}var l="right"==e["font-align"]&&!d3plus.rtl||d3plus.rtl&&"right"==e["font-align"];t.dev&&d3plus.console.timeEnd("calculating borders and padding");var s=function(n){n.style("background-color",function(n){return n.bg=t.highlight!=n.value?t.hover==n.value?t.highlight?d3plus.color.darker(e.secondary,.05):d3plus.color.darker(e.secondary,.05):e.secondary:t.hover==n.value&&t.enabled?d3plus.color.darker(e.color,.025):e.color,n.bg}).style("color",function(e){var n=d3plus.color.text(e.bg),r=e.image&&d.size()<t.large;return"#f7f7f7"!=n&&t.selected==e.value&&e.color&&!r?d3plus.color.legible(e.color):n}).style("border-color",e.secondary).style("opacity",function(e){return[t.selected,t.highlight].indexOf(e.value)<0?.75:1})},u=function(t){t.style("position","relative").style("margin",e.margin+"px").style("display",e.display).style("border-style","solid").style("border-width",a).style("font-family",e["font-family"]).style("font-size",e["font-size"]+"px").style("font-weight",e["font-weight"]).style("text-align",e["font-align"]).style("letter-spacing",e["font-spacing"]+"px")},c=function(n){n.text(function(e){return e[t.text]}).each(function(n,r){var a=[];n.image&&d.size()<t.large&&a.push("image"),e.icon?(n.icon=d3plus.util.copy(e.icon),a.push("icon")):n.value===t.selected&&(n.icon=d3plus.font.awesome?{"class":"fa fa-check",content:""}:{"class":"",content:"&#x2713;"},a.push("icon"));var i=0,o=d3.select(this).selectAll("div.d3plus_button_element").data(a,function(t,e){return t});if(o.enter().append("div").style("display","absolute").attr("id",function(e){return"d3plus_button_element_"+t.id+"_"+e}).attr("class",function(t){var e="";return"icon"==t&&n.icon.class&&(e=" "+n[t].class),"d3plus_button_element"+e}),o.order().html(function(t){return"icon"==t?n.icon.content:""}).style("background-image",function(t){return"image"==t?"url('"+n.image+"')":"none"}).style("background-color",function(e){return"image"==e&&"knockout"==n.style?n.color||t.color:"transparent"}).style("background-size","100%").style("text-align","center").style("position",function(t){return"text"==t?"static":"absolute"}).style("width",function(t){return i=e.height?e.height-2*e.padding-2*e.stroke:e["font-size"]+e.padding+e.stroke,i+"px"}).style("height",function(t){return"image"==t?i+"px":"auto"}).style("margin-top",function(t){if(this.offsetHeight)var e=this.offsetHeight;else{var e=i;"icon"==t&&(e-=3)}return-e/2+"px"}).style("top","50%").style("left",function(t){return"image"==t&&!l||"icon"==t&&l?e.padding+"px":"auto"}).style("right",function(t){return"image"==t&&l||"icon"==t&&!l?e.padding+"px":"auto"}),o.exit().remove(),i>0){i+=2*e.padding;var s=e.padding;if(2==a.length)var u=s+"px "+i+"px";else if("image"==a[0]&&!d3plus.rtl||"icon"==a[0]&&d3plus.rtl)var u=s+"px "+s+"px "+s+"px "+i+"px";else var u=s+"px "+i+"px "+s+"px "+s+"px";d3.select(this).style("padding",u)}else d3.select(this).style("padding",e.padding+"px");if("number"==typeof e.width){var c=e.width;c-=parseFloat(d3.select(this).style("padding-left"),10),c-=parseFloat(d3.select(this).style("padding-right"),10),c-=2*e.stroke,c+="px"}else var c="auto";d3.select(this).style("width",c)})},d=t.container.selectAll("div.d3plus_node").data(t.data.array,function(t){return t.id||t.value});if(t.dev&&d3plus.console.time("enter"),d.enter().append("div").attr("id","d3plus_button_"+t.id).attr("class","d3plus_node").call(s).call(u).call(c).call(r),t.dev&&d3plus.console.timeEnd("enter"),t.update||d.size()<t.large){t.dev&&d3plus.console.time("ordering"),d.order(),t.dev&&d3plus.console.timeEnd("ordering");var p=d}else var f=[t.previous,t.selected,t.highlight,t.hover,t.hover_previous].filter(function(t){return t}),p=d.filter(function(t){return f.indexOf(t.value)>=0});t.dev&&d3plus.console.time("update"),t.timing?p.transition().duration(t.timing).call(s).call(u):p.call(s).call(u),p.call(c).call(r),t.dev&&d3plus.console.timeEnd("update"),d.exit().remove()},d3plus.forms.data=function(t){if(t.data.data){t.data.array&&!("replace"in t.data&&t.data.replace===!0)&&"replace"in t.data||(t.data.array=[]);var e=["value","alt","keywords","image","style","color","selected","text"],n=t.data.map||{};e.forEach(function(t){t in n||(n[t]=t)}),t.data.data.forEach(function(e){var r={};for(key in n)n[key]in e&&(r[key]=e[n[key]]);t.data.array.push(r)});var r="sort"in t.data?t.data.sort:"text";r&&t.data.array.sort(function(t,e){return t=t[r],e=e[r],"color"==r&&(t=d3.rgb(a_value).hsl(),e=d3.rgb(b_value).hsl(),t=0==t.s?361:t.h,e=0==e.s?361:e.h),e>t?-1:t>e?1:void 0})}t.data.changed=!0,t.loading=!1},d3plus.forms.drop=function(e,n,r){function a(t){d3.select(t).on("click."+e.id,function(){var t=d3.event.target||d3.event.toElement;t=t.id;var n="_"+e.id;t.indexOf(n)<0&&e.enabled&&e.forms.disable()});try{var n=window.parent.location.host==window.location.host}catch(r){var n=!1}n&&t.self!==window.top&&a(t.parent)}function i(t){t.style("padding",w.padding+"px").style("width",S+"px").style("border-style","solid").style("border-width","0px").style("font-family",w["font-family"]).style("font-size",w["font-size"]+"px").style("font-weight",w["font-weight"]).style("text-align",w["font-align"]).attr("placeholder",e.format("Search")).style("outline","none").style(d3plus.prefix()+"border-radius","0")}function o(t){t.style("left",function(){return"left"==n.align?"0px":"center"==n.align?-((d-v)/2)+"px":"auto"}).style("right",function(){return"right"==n.align?"0px":"auto"}).style("height",L+"px").style("padding",n.stroke+"px").style("background-color",n.secondary).style("z-index",function(){return e.enabled?"9999":"-1"}).style("width",d-2*n.stroke+"px").style("top",function(){return e.flipped?"auto":h.height()+"px"}).style("bottom",function(){return e.flipped?h.height()+"px":"auto"}).style("opacity",e.enabled?1:0)}function l(t){t.style("top",function(){return e.flipped?"auto":h.height()+"px"}).style("bottom",function(){return e.flipped?h.height()+"px":"auto"}).style("display",e.enabled?null:"none"),e.search&&e.enabled&&_.select("div.d3plus_drop_search input").node().focus()}function u(t){return function(){var e=d3.interpolateNumber(this.scrollTop,t);return function(t){this.scrollTop=e(t)}}}if(e.element&&(e.element.on("focus."+e.id,function(){e.forms.update(!1).hover(!0).draw()}),e.element.on("blur."+e.id,function(){var t=e.search?d3.event.relatedTarget!=e.container.select("input").node():!0;t&&e.forms.update(!1).hover(!1).draw()}),e.element.on("change."+e.id,function(){e.forms.value(e.data.array[this.selectedIndex])}),e.element.on("keydown.cancel_"+e.id,function(){var t=d3.event.keyCode;9!=t&&d3.event.preventDefault()})),d3.select(document).on("keydown."+e.id,function(){if(e.enabled||e.hover===!0){var t=d3.event.keyCode,n=M.select("div").selectAll("div.d3plus_node"),r=0;if(n.each("boolean"==typeof e.hover?function(t,n){t.value==e.focus&&(r=n)}:function(t,n){t.value==e.hover&&(r=n)}),[9].indexOf(t)>=0&&(!e.search||e.search&&!d3.event.shiftKey))e.forms.update(!1).disable();else if([40].indexOf(t)>=0){if(e.enabled&&(r>=n.size()-1?r=0:r+=1),"boolean"!=typeof e.hover)var a=n.data()[r].value;else var a=e.focus;e.enabled?e.forms.update(!1).hover(a).draw(60):e.forms.update(!1).hover(a).enable()}else if([38].indexOf(t)>=0){if(e.enabled&&(0>=r?r=n.size()-1:r-=1),"boolean"!=typeof e.hover)var a=n.data()[r].value;else var a=e.focus;e.enabled?e.forms.update(!1).hover(a).draw(60):e.forms.update(!1).hover(a).enable()}else[13].indexOf(t)>=0?"boolean"!=typeof e.hover?e.forms.value(e.hover).hover(!0).draw():e.forms.hover(e.focus).toggle():[27].indexOf(t)>=0&&(e.enabled?e.forms.hover(!0).disable():e.hover===!0&&e.forms.hover(!1).draw())}}),a(window),n.icon)if(0==n.icon.indexOf("fa-"))var c={"class":"d3plus_drop_icon fa "+n.icon,content:""};else var c={"class":"d3plus_drop_icon",content:n.icon};else var c=!1;var d=d3plus.forms.value(n.width,["drop","button"]);if(!d||"number"!=typeof d){e.dev&&d3plus.console.time("calculating width");var p=d3plus.util.copy(n);p.icon=c?c:d3plus.font.awesome?{"class":"fa fa-check",content:""}:{"class":"",content:"&#x2713;"},p.display="inline-block",p.border="none",p.width=!1,p.margin=0;var f=d3plus.forms.value(e.text,["drop","button"]);f||(f="text");var h=d3plus.forms(p).type("button").text(f).data(e.data.array).parent(e.tester).id(e.id).timing(0).large(9999).draw(),g=h.width();d=d3.max(g),d+=2*n.stroke,h.remove(),e.dev&&d3plus.console.timeEnd("calculating width")}"object"!=typeof n.width&&(n.width={}),n.width.drop=d;var v=d3plus.forms.value(n.width,["button","drop"]);v&&"number"==typeof v||(v=d),n.width.button=v,e.dev&&d3plus.console.time("creating main button");var y=d3plus.util.copy(n);y.icon=c,y.width=v,y.margin=0,e.enabled&&(y.shadow=0);var f=d3plus.forms.value(e.text,["button","drop"]);f||(f="text");var p=d3plus.util.copy(e.data.array.filter(function(t){return t.value==e.focus})[0]);p.id="drop_button";var m=d3plus.util.copy(p);m.text="Test";var b=e.hover===!0?e.focus:!1;e.dev&&d3plus.console.group("main button");var h=d3plus.forms(y).type("button").text(f).parent(e.container).id(e.id).timing(r).hover(b).data([m]).callback(e.forms.toggle).highlight(e.focus).update(e.update).enable().draw(),x=h.height();h.data([p]).height(x).draw(),e.dev&&d3plus.console.groupEnd(),e.dev&&d3plus.console.timeEnd("creating main button"),e.dev&&d3plus.console.time("creating dropdown");var _=e.container.selectAll("div.d3plus_drop_selector").data(["selector"]);_.enter().append("div").attr("class","d3plus_drop_selector").style("position","absolute").style("top","0px").style("padding",n.stroke+"px").style("z-index","-1").style("overflow","hidden"),e.dev&&d3plus.console.timeEnd("creating dropdown"),e.dev&&e.search&&d3plus.console.time("creating search");var w=d3plus.util.merge(n,n.drop),k=e.search?["search"]:[],z=_.selectAll("div.d3plus_drop_search").data(k),S=n.width.drop;S-=4*n.padding,S-=2*n.stroke,r?z.transition().duration(r).style("padding",w.padding+"px").style("display","block").style("background-color",w.secondary):z.style("padding",w.padding+"px").style("display","block").style("background-color",w.secondary),r?z.select("input").transition().duration(r).call(i):z.select("input").call(i),z.enter().insert("div","#d3plus_drop_list_"+e.id).attr("class","d3plus_drop_search").attr("id","d3plus_drop_search_"+e.id).style("padding",w.padding+"px").style("display","block").style("background-color",w.secondary).append("input").attr("id","d3plus_drop_input_"+e.id).style("-webkit-appearance","none").call(i),z.select("input").on("keyup."+e.id,function(t){e.filter!=this.value&&(e.filter=this.value,e.forms.draw())}),z.exit().remove(),e.dev&&e.search&&d3plus.console.timeEnd("creating search"),e.dev&&d3plus.console.time("populating list");var M=_.selectAll("div.d3plus_drop_list").data(["list"]);if(M.enter().append("div").attr("class","d3plus_drop_list").attr("id","d3plus_drop_list_"+e.id).style("overflow-y","auto").style("overflow-x","hidden"),e.loading)var p=[{text:e.format("Loading...")}];else if(e.enabled){var E=d3plus.util.strip(e.filter.toLowerCase()).split("_"),C=["value","text","alt","keywords"],E=E.filter(function(t){return""!=t});if(""==e.filter)var p=e.data.array;else var p=e.data.array.filter(function(e){var n=!1;for(key in C)if(C[key]in e&&e[C[key]]){var r=d3plus.util.strip(e[C[key]].toLowerCase()).split("_");for(t in r)for(s in E)if(0==r[t].indexOf(E[s])){n=!0;break}}return n});0==p.length&&(p=[{text:e.format("No results match")+' "'+e.filter+'"'}])}e.dev&&d3plus.console.timeEnd("populating list");var A=e.container.node().getBoundingClientRect(),T=window.innerHeight-A.top;T-=h.height(),T-=10,T<2*h.height()&&(T=A.top-10,e.flipped=!0);var O=!1;if(T>e["max-height"]&&(T=e["max-height"]),e.enabled){e.dev&&d3plus.console.time("updating list items"),e.dev&&d3plus.console.group("list buttons");
var y=d3plus.util.merge(n,n.drop);y.icon=!1,y.display="block",y.border="none",y.width="auto",y.margin=0;var f=d3plus.forms.value(e.text,["drop","button"]);f||(f="text");var B=e.data.array.length<e.large?e.large:0,N=d3plus.forms(y).dev(e.dev).type("button").text(f).data(p).parent(M).id(e.id+"_option").timing(r).callback(e.forms.value).previous(e.previous).selected(e.focus).hover(e.hover).hover_previous(e.hover_previous).update(e.update).large(B).draw();e.dev&&d3plus.console.groupEnd(),e.dev&&d3plus.console.timeEnd("updating list items"),e.dev&&d3plus.console.time("calculating height");var D=!1;if("none"==_.style("display"))var D=!0;D&&_.style("display","block");var j=e.search?z[0][0].offsetHeight:0,P=_.style("height"),$=_.property("scrollTop"),q=M.style("max-height"),H=M.property("scrollTop");_.style("height","auto"),M.style("max-height","200000px");var L=parseFloat(_.style("height"),10);if(M.style("max-height",q).property("scrollTop",H),_.style("height",P).property("scrollTop",$),L>T&&(L=T,O=!0),D&&_.style("display","none"),e.dev&&d3plus.console.timeEnd("calculating height"),O){e.dev&&d3plus.console.time("calculating scroll position");var Y=0,F=M.select("div").selectAll("div.d3plus_node");F.each("boolean"==typeof e.hover?function(t,n){t.value==e.focus&&(Y=n)}:function(t,n){t.value==e.hover&&(Y=n)});var D=!1;"none"==_.style("display")&&(D=!0);var I=F[0][Y];D&&_.style("display","block");var R=I.offsetTop,U=I.offsetHeight,W=M.property("scrollTop");if(D&&_.style("display","none"),D||e.data.changed)var V=R;else{var V=W;if(W>R)var V=R;else if(R+U>W+T-j)var V=R-(T-U-j)}e.dev&&d3plus.console.timeEnd("calculating scroll position")}else var V=0}else var V=M.property("scrollTop"),L=0,j=0;e.dev&&d3plus.console.time("rotating arrow");var Z="&#x27A4;"==c.content?90:0;if(e.enabled!=e.flipped)var X="rotate(-"+(180-Z)+"deg)";else var X="rotate("+Z+"deg)";h.select("div#d3plus_button_element_"+e.id+"_icon").data(["icon"]).style(d3plus.prefix()+"transition",r/1e3+"s").style(d3plus.prefix()+"transform",X).style("opacity",function(){return e.enabled?.5:1}),e.dev&&d3plus.console.timeEnd("rotating arrow"),e.dev&&d3plus.console.time("drawing list");var Q=e.enabled?T-j:0;r?(_.transition().duration(r).each("start",function(){d3.select(this).style("display",e.enabled?"block":null)}).call(o).each("end",function(){d3.select(this).transition().duration(r).call(l)}),M.transition().duration(r).style("width",d-2*n.stroke+"px").style("max-height",Q+"px").tween("scroll",u(V))):(_.call(o).call(l),M.style("width",d-2*n.stroke+"px").style("max-height",Q+"px").property("scrollTop",V)),e.dev&&d3plus.console.timeEnd("drawing list")},d3plus.forms.element=function(t){function e(t,e){var n=["value","alt","keywords","image","style","color"];[].forEach.call(e.attributes,function(e){if(/^data-/.test(e.name)){var n=e.name.substr(5).replace(/-(.)/g,function(t,e){return e.toUpperCase()});t[n]=e.value}}),n.forEach(function(n){null!==e.getAttribute(n)&&(t[n]=e.getAttribute(n))})}t.tag=t.element.node().tagName.toLowerCase(),"select"==t.tag?(t.element.attr("id")&&"default"==t.id&&(t.id=t.element.attr("id")),t.element.selectAll("option").each(function(n,r){var a={selected:this.selected,text:this.innerHTML};e(a,this),this.selected&&(t.focus=this.value),t.data.array.push(a)})):"input"==t.tag&&"radio"==t.element.attr("type")&&t.element.each(function(n,r){var a={selected:this.checked};if(e(a,this),this.id){var i=d3.select("label[for="+this.id+"]");i.empty()||(a.text=i.style("display","none").html())}this.checked&&(t.focus=this.value),t.data.array.push(a)}),!t.focus&&t.data.array.length&&(t.element.node().selectedIndex=0,t.focus=t.data.array[0].value),t.type||(t.type=t.data.array.length>4?"drop":"radio")},d3plus.forms.json=function(t){t.dev&&d3plus.console.time('loading data from "'+t.data.fetch+'"'),t.loading=!0,d3.json(t.data.fetch,function(e){t.data.data=e&&1==Object.keys(e).length?e[Object.keys(e)[0]]:e&&t.data.key&&e[key]?e[key]:[],"function"==typeof t.data.callback&&(t.data.data=t.data.callback(t.data.data)),t.data.loaded=!0,t.data.changed=!0,t.dev&&d3plus.console.timeEnd('loading data from "'+t.data.fetch+'"'),d3plus.forms.data(t),setTimeout(function(){t.forms.draw()},1.5*t.timing)})},d3plus.forms.radio=function(t,e,n){t.container.transition().duration(n).style("background-color",e.secondary).style("padding",e.stroke+"px").style("margin",e.margin+"px");var r=d3plus.util.copy(e);r.icon=!1,r.display="inline-block",r.border="none",r.width=!1,r.margin=0,r.stroke=0;var a=d3plus.forms.value(t.text,["button"]);a||(a="text");var i=d3plus.forms(r).type("button").text(a).data(t.data.array).parent(t.container).id(t.id+"_radios").callback(t.forms.value).highlight(t.focus).enable().draw()},d3plus.forms.value=function(t,e){if("object"!=typeof t||!e)return"object"!=typeof t?t:!1;for(var n=!1,r=0;r<e.length;r++)if(e[r]in t){n=t[e[r]];break}return n?n:void 0},d3plus.shape.area=function(t,e,n,r){var a=d3.svg.area().x(function(t){return t.d3plus.x}).y0(function(t){return t.d3plus.y0}).y1(function(t){return t.d3plus.y}).interpolate(t.shape.interpolate.value);n.append("path").attr("class","d3plus_data").attr("d",function(t){return a(t.values)}).call(d3plus.shape.style,t),e.selectAll("path.d3plus_data").data(function(e){function n(e){a.y=d3.max([a.y,e.y]),a.y0=d3.min([a.y0,e.y0]),a.x0=e.x,a.h=a.y0-a.y,a.w=a.x0-a.x;var n=a.h-2*t.style.labels.padding<15||a.w-2*t.style.labels.padding<20,r=o.w/o.h,i=o.w*o.h,l=a.w/a.h,s=a.w*a.h;(!n&&s>i||!o.w)&&(o={w:a.w,h:a.h,x:a.x+a.w/2,y:a.y+a.h/2}),a.h<10&&(a=d3plus.util.copy(e))}if(t.labels.value){var r=[],a=null,i=null,o={w:0,h:0,x:0,y:0};e.values.forEach(function(r,i){if(a){var o=d3plus.util.buckets([0,1],t.style.labels.segments+1);o.shift(),o.pop(),o.forEach(function(t){var a=d3plus.util.copy(r.d3plus),o=e.values[i-1].d3plus;a.x=o.x+(a.x-o.x)*t,a.y=o.y+(a.y-o.y)*t,a.y0=o.y0+(a.y0-o.y0)*t,n(a)}),n(d3plus.util.copy(r.d3plus))}else a=d3plus.util.copy(r.d3plus)}),o.w>=10&&o.h>=10&&(e.d3plus_label=o)}return[e]}),t.timing?e.selectAll("path.d3plus_data").transition().duration(t.timing).attr("d",function(t){return a(t.values)}).call(d3plus.shape.style,t):e.selectAll("path.d3plus_data").attr("d",function(t){return a(t.values)}).call(d3plus.shape.style,t)},d3plus.shape.color=function(t,e){var n=t.d3plus?t.d3plus.shapeType:e.shape.value;if("line"==e.shape.value)return"circle"==n?d3plus.variable.color(e,t):"none";if("area"==e.shape.value||"active"==n)return d3plus.variable.color(e,t);if("temp"==n)return"url(#d3plus_hatch_"+t.d3plus.id+")";if("active"==n)return d3plus.variable.color(e,t);if(t.d3plus.static)return d3plus.color.lighter(d3plus.variable.color(e,t));var r=e.active.key?d3plus.variable.value(e,t,e.active.key):t.d3plus.active,a=e.temp.key?d3plus.variable.value(e,t,e.temp.key):t.d3plus.temp,i=e.total.key?d3plus.variable.value(e,t,e.total.key):t.d3plus.total;return!e.active.key&&!e.temp.key||r===!0||r&&i&&r==i&&!a||r&&!i?d3plus.variable.color(e,t):e.active.spotlight.value?"#eee":d3plus.color.lighter(d3plus.variable.color(e,t),.4)},d3plus.shape.coordinates=function(t,e,n,r){var a=d3.geo[t.coords.projection.value]().center(t.coords.center);t.zoom.scale||(t.zoom.scale=1),t.zoom.area=1/t.zoom.scale/t.zoom.scale,t.path=d3.geo.path().projection(a),n.append("path").attr("id",function(t){return t.id}).attr("class","d3plus_data").attr("d",t.path).call(d3plus.shape.style,t),t.timing?e.selectAll("path.d3plus_data").transition().duration(t.timing).call(d3plus.shape.style,t):e.selectAll("path.d3plus_data").call(d3plus.shape.style,t);var i=t.old_height!=t.app_height||t.height.changed||t.old_width!=t.app_width||t.width.changed;t.old_height=t.app_height,t.old_width=t.app_width,t.coords.changed||i||t.coords.mute.changed||t.coords.solo.changed?(t.zoom.bounds=null,t.zoom.coords={},t.zoom.labels={},e.each(function(e){var n=t.path.bounds(e),r=[];e.geometry.coordinates=e.geometry.coordinates.filter(function(n,a){var i=d3plus.util.copy(e);i.geometry.coordinates=[i.geometry.coordinates[a]];var o=t.path.area(i);return o>=t.coords.threshold?(r.push(o),!0):!1}),r.sort(function(t,e){return t-e});var a=d3plus.util.copy(e),i=d3plus.util.copy(e);a.geometry.coordinates=a.geometry.coordinates.filter(function(n,a){var o=d3plus.util.copy(e);o.geometry.coordinates=[o.geometry.coordinates[a]];var l=t.path.area(o);return l==r[r.length-1]&&(i.geometry.coordinates=o.geometry.coordinates),l>=d3.quantile(r,.9)}),t.zoom.coords[e.d3plus.id]=a;var o=t.path.centroid(i),l=t.path.bounds(i);t.zoom.labels[e.d3plus.id]={anchor:"middle",group:t.g.labels,h:.35*(l[1][1]-l[0][1]),w:.35*(l[1][0]-l[0][0]),valign:"center",x:o[0],y:o[1]},t.zoom.bounds?(t.zoom.bounds[0][0]>n[0][0]&&(t.zoom.bounds[0][0]=n[0][0]),t.zoom.bounds[0][1]>n[0][1]&&(t.zoom.bounds[0][1]=n[0][1]),t.zoom.bounds[1][0]<n[1][0]&&(t.zoom.bounds[1][0]=n[1][0]),t.zoom.bounds[1][1]<n[1][1]&&(t.zoom.bounds[1][1]=n[1][1])):t.zoom.bounds=n})):t.focus.value||(t.zoom.viewport=!1)},d3plus.shape.donut=function(t,e,n,r){function a(e,n,r,a){if(!n)var n=0;if("number"!=typeof r)var r=void 0;if("number"!=typeof a)var a=void 0;e.attrTween("d",function(e){if(void 0==r)var o=e.d3plus.r?e.d3plus.r:d3.max([e.d3plus.width,e.d3plus.height]);else var o=r;if(void 0==a)var l=e.d3plus.a[e.d3plus.shapeType];else var l=a;t.arcs[e.d3plus.shapeType][e.d3plus.id]||(t.arcs[e.d3plus.shapeType][e.d3plus.id]={r:0},t.arcs[e.d3plus.shapeType][e.d3plus.id].a="donut"==e.d3plus.shapeType?2*Math.PI:0);var s=d3.interpolate(t.arcs[e.d3plus.shapeType][e.d3plus.id].r,o+n),u=d3.interpolate(t.arcs[e.d3plus.shapeType][e.d3plus.id].a,l);return function(n){return t.arcs[e.d3plus.shapeType][e.d3plus.id].r=s(n),t.arcs[e.d3plus.shapeType][e.d3plus.id].a=u(n),i(e)}})}t.arcs||(t.arcs={donut:{},active:{},temp:{}});var i=d3.svg.arc().startAngle(0).endAngle(function(e){var n=t.arcs[e.d3plus.shapeType][e.d3plus.id].a;return n>2*Math.PI?2*Math.PI:n}).innerRadius(function(e){if("donut"!=shape||e.d3plus.static)return 0;var n=t.arcs[e.d3plus.shapeType][e.d3plus.id].r;return n*t.style.data.donut.size}).outerRadius(function(e){var n=t.arcs[e.d3plus.shapeType][e.d3plus.id].r;return"donut"!=e.d3plus.shapeType?2*n:n});r.selectAll("path.d3plus_data").transition().duration(t.timing).call(a,0,0).each("end",function(e){delete t.arcs[e.d3plus.shapeType][e.d3plus.id]}),e.selectAll("path.d3plus_data").data(function(t){return[t]}).transition().duration(t.timing).call(a).call(d3plus.shape.style,t),n.append("path").attr("class","d3plus_data").transition().duration(0).call(a,0,0).call(d3plus.shape.style,t)},d3plus.shape.draw=function(t){function e(e){var n=e.d3plus.depth?e.d3plus.depth:t.depth.value;return e.d3plus.id=d3plus.variable.value(t,e,t.id.nesting[n]),e.d3plus.id+="_"+n+"_"+shape,t.axes.values.forEach(function(n){"continuous"==t[n].scale.value&&(e.d3plus.id+="_"+d3plus.variable.value(t,e,t[n].key))}),e.d3plus.id=d3plus.util.strip(e.d3plus.id),e}function n(e,n){var r=d3plus.apps[t.type.value].scale;if(n&&r&&r[t.shape.value])var a=r[t.shape.value];else if(n&&r&&"number"==typeof r)var a=r;else var a=1;e.attr("transform",function(t){return["line","area","coordinates"].indexOf(shape)<0?"translate("+t.d3plus.x+","+t.d3plus.y+")scale("+a+")":"scale("+a+")"})}function r(e){if(e&&t.g.edges.selectAll("g").size()>0){t.g.edges.selectAll("g").each(function(n){var r=e[t.id.key],a=n[t.edges.source][t.id.key],i=n[t.edges.target][t.id.key];if(a==r||i==r){var o=t.g.edge_hover.node().appendChild(this.cloneNode(!0));d3.select(o).datum(n).attr("opacity",1).selectAll("line, path").datum(n)}});var n=t.edges.arrows.value;t.g.edge_hover.attr("opacity",0).selectAll("line, path").style("stroke",t.style.highlight.primary).style("stroke-width",function(){return t.edges.size?d3.select(this).style("stroke-width"):2*t.style.data.stroke.width}).attr("marker-start",function(e){var r=t.edges.arrows.direction.value;if("bucket"in e.d3plus)var a="_"+e.d3plus.bucket;else var a="";return"source"==r&&n?"url(#d3plus_edge_marker_highlight"+a+")":"none"}).attr("marker-end",function(e){var r=t.edges.arrows.direction.value;if("bucket"in e.d3plus)var a="_"+e.d3plus.bucket;else var a="";return"target"==r&&n?"url(#d3plus_edge_marker_highlight"+a+")":"none"}),t.g.edge_hover.selectAll("text").style("fill",t.style.highlight.primary),t.timing?(t.g.edge_hover.transition().duration(t.style.timing.mouseevents).attr("opacity",1),t.g.edges.transition().duration(t.style.timing.mouseevents).attr("opacity",.5)):t.g.edge_hover.attr("opacity",1)}else t.timing?(t.g.edge_hover.transition().duration(t.style.timing.mouseevents).attr("opacity",0).transition().selectAll("*").remove(),t.g.edges.transition().duration(t.style.timing.mouseevents).attr("opacity",1)):t.g.edge_hover.selectAll("*").remove()}var a=t.returned.nodes||[],i=t.returned.edges||[];t.timing=a.length<t.data.large&&i.length<t.edges.large?t.style.timing.transitions:0;var o={area:"area",circle:"rect",donut:"donut",line:"line",square:"rect",coordinates:"coordinates"},l={};a.forEach(function(e){if(e.d3plus)if(e.d3plus.shape){var n=e.d3plus.shape;e.d3plus.shapeType=n}else{var n=o[t.shape.value];e.d3plus.shapeType=n}else var n=o[t.shape.value];l[n]||(l[n]=[]),l[n].push(e)});for(shape in o)o[shape]in l&&0!==Object.keys(l).length||(t.timing?t.g.data.selectAll("g.d3plus_"+o[shape]).transition().duration(t.timing).attr("opacity",0).remove():t.g.data.selectAll("g.d3plus_"+o[shape]).remove());var s=[],u=[];for(shape in l){t.dev.value&&d3plus.console.group('Drawing "'+shape+'" groups'),t.dev.value&&d3plus.console.time("filtering out small shapes");var c=l[shape].filter(function(t){if(t.d3plus){if("width"in t.d3plus&&t.d3plus.width<1)return!1;if("height"in t.d3plus&&t.d3plus.height<1)return!1;if("r"in t.d3plus&&t.d3plus.r<.5)return!1}else if(t.values){var e=!0;if(t.values.forEach(function(t){"y0"in t.d3plus?e&&"y0"in t.d3plus&&t.d3plus.y0-t.d3plus.y>=1&&(e=!1):e=!1}),e)return!1}return!0});if(t.dev.value){d3plus.console.timeEnd("filtering out small shapes");var d=l[shape].length-c.length,p=d3.round(d/l[shape].length,2);console.log("removed "+d+" out of "+l[shape].length+" shapes ("+100*p+"% reduction)")}var f=t.g.data.selectAll("g.d3plus_"+shape).data(c,function(n){if(n.d3plus||(n.d3plus={}),"coordinates"==shape)return n.d3plus.id=n.id,n.id;if(!n.d3plus.id)if(n.values)n.values.forEach(function(t){t=e(t),t.d3plus.shapeType="circle"}),n.d3plus.id=n.key;else if(n=e(n),!n.d3plus.a){n.d3plus.a={donut:2*Math.PI};var r=t.active.key?n.d3plus[t.active.key]:n.d3plus.active,a=t.temp.key?n.d3plus[t.temp.key]:n.d3plus.temp,i=t.total.key?n.d3plus[t.total.key]:n.d3plus.total;i&&(n.d3plus.a.active=r?r/i*2*Math.PI:0,n.d3plus.a.temp=a?a/i*2*Math.PI+n.d3plus.a.active:0)}return n.d3plus?n.d3plus.id:!1});if(t.timing)var h=f.exit().transition().duration(t.timing).attr("opacity",0).remove();else var h=f.exit().remove();t.timing?f.transition().duration(t.timing).call(n):f.call(n);var g=t.timing?0:1,v=f.enter().append("g").attr("class","d3plus_"+shape).attr("opacity",g).call(n);t.timing&&v.transition().duration(t.timing).attr("opacity",1),f.order(),t.dev.value&&d3plus.console.time("shapes"),d3plus.shape[shape](t,f,v,h,n),t.dev.value&&d3plus.console.timeEnd("shapes"),["rect","donut"].indexOf(shape)>=0&&d3plus.apps[t.type.value].fill&&d3plus.shape.fill(t,f,v,h,n),t.dev.value&&d3plus.console.groupEnd()}r(),d3plus.touch?t.g.data.selectAll("g").on(d3plus.evt.over,t.touchEvent).on(d3plus.evt.move,t.touchEvent).on(d3plus.evt.out,t.touchEvent):t.g.data.selectAll("g").on(d3plus.evt.over,function(e){if(!(t.frozen||e.d3plus&&e.d3plus.static)){if(d3.select(this).style("cursor","pointer").transition().duration(t.style.timing.mouseevents).call(n,!0),d3.select(this).selectAll(".d3plus_data").transition().duration(t.style.timing.mouseevents).attr("opacity",1),t.covered=!1,["area","line"].indexOf(t.shape.value)>=0||"follow"==d3plus.apps[t.type.value].tooltip&&t.focus.value!=e[t.id.key]||!t.focus.tooltip.value){if(t.continuous_axis){var a=d3.event[t.continuous_axis];positions=d3plus.util.uniques(e.values,function(e){return e.d3plus[t.continuous_axis]}),closest=d3plus.util.closest(positions,a),e.data=e.values[positions.indexOf(closest)],e.d3plus=e.values[positions.indexOf(closest)].d3plus}var i=e.data?e.data:e;d3plus.tooltip.app({vars:t,data:i})}"function"==typeof t.mouse?t.mouse(e):t.mouse[d3plus.evt.over]&&t.mouse[d3plus.evt.over](e),r(e)}}).on(d3plus.evt.move,function(e){if(!(t.frozen||e.d3plus&&e.d3plus.static)){if(t.covered=!1,["area","line"].indexOf(t.shape.value)>=0||"follow"==d3plus.apps[t.type.value].tooltip&&t.focus.value!=e[t.id.key]||!t.focus.tooltip.value){if(t.continuous_axis){var n=d3.event[t.continuous_axis];positions=d3plus.util.uniques(e.values,function(e){return e.d3plus[t.continuous_axis]}),closest=d3plus.util.closest(positions,n),e.data=e.values[positions.indexOf(closest)],e.d3plus=e.values[positions.indexOf(closest)].d3plus}var r=e.data?e.data:e;d3plus.tooltip.app({vars:t,data:r})}"function"==typeof t.mouse?t.mouse(e):t.mouse[d3plus.evt.move]&&t.mouse[d3plus.evt.move](e)}}).on(d3plus.evt.out,function(e){var a=d3plus.util.child(this,d3.event.toElement);a||t.frozen||e.d3plus&&e.d3plus.static||(d3.select(this).transition().duration(t.style.timing.mouseevents).call(n),d3.select(this).selectAll(".d3plus_data").transition().duration(t.style.timing.mouseevents).attr("opacity",t.style.data.opacity),t.covered||d3plus.tooltip.remove(t.type.value),"function"==typeof t.mouse?t.mouse(e):t.mouse[d3plus.evt.out]&&t.mouse[d3plus.evt.out](e),r())}),t.g.data.selectAll("g").on(d3plus.evt.click,function(e){if(!(t.frozen||e.d3plus&&e.d3plus.static)){"function"==typeof t.mouse?t.mouse(e):t.mouse[d3plus.evt.out]?t.mouse[d3plus.evt.out](e):t.mouse[d3plus.evt.click]&&t.mouse[d3plus.evt.click](e);var a=t.zoom_direction(),i=t.id.solo.value,o=d3plus.variable.text(t,e)[0],l=d3plus.color.legible(d3plus.variable.color(t,e)),s=t.title.sub.value||!1,u=t.style.title.sub.font.color,c=t.style.title.total.font.color;if(e.d3plus.threshold&&e.d3plus.merged&&t.zoom.value)t.history.states.push(function(){t.viz.id({solo:i}).title({sub:s}).style({title:{sub:{font:{color:u}},total:{font:{color:c}}}}).draw()}),t.viz.id({solo:e.d3plus.merged}).title({sub:o}).style({title:{sub:{font:{color:l}},total:{font:{color:l}}}}).draw();else if(1===a&&t.zoom.value){var d=d3plus.variable.value(t,e,t.id.key);t.history.states.push(function(){t.viz.depth(t.depth.value-1).id({solo:i}).title({sub:s}).style({title:{sub:{font:{color:u}},total:{font:{color:c}}}}).draw()}),t.viz.depth(t.depth.value+1).id({solo:[d]}).title({sub:o}).style({title:{sub:{font:{color:l}},total:{font:{color:l}}}}).draw()}else if(-1===a&&t.zoom.value)t.back();else if(d3plus.apps[t.type.value].zoom&&t.zoom.value)r(),d3.select(this).transition().duration(t.style.timing.mouseevents).call(n),d3.select(this).selectAll(".d3plus_data").transition().duration(t.style.timing.mouseevents).attr("opacity",t.style.data.opacity),d3plus.tooltip.remove(t.type.value),t.update=!1,e&&e[t.id.key]!=t.focus.value?t.viz.focus(e[t.id.key]).draw():t.viz.focus(null).draw();else if(e[t.id.key]!=t.focus.value){r();var p=e.data?e.data:e;d3plus.tooltip.app({vars:t,data:p})}}})},d3plus.shape.edges=function(t){function e(e){var n=1==t.style.edges.opacity?t.style.edges.opacity:0;e.attr("opacity",n).style("stroke-width",0).style("stroke",t.style.background).style("fill","none")}function n(e){var n=t.edges.arrows.value;e.style("stroke-width",function(e){return t.edges.scale(e[t.edges.size])}).style("stroke",t.style.edges.color).attr("opacity",t.style.edges.opacity).attr("marker-start",function(e){var r=t.edges.arrows.direction.value;if("bucket"in e.d3plus)var a="_"+e.d3plus.bucket;else var a="";return"source"==r&&n?"url(#d3plus_edge_marker_default"+a+")":"none"}).attr("marker-end",function(e){var r=t.edges.arrows.direction.value;if("bucket"in e.d3plus)var a="_"+e.d3plus.bucket;else var a="";return"target"==r&&n?"url(#d3plus_edge_marker_default"+a+")":"none"}).attr("vector-effect","non-scaling-stroke").attr("pointer-events","none")}function r(e){e.attr("x1",function(e){return e[t.edges.source].d3plus.dx}).attr("y1",function(e){return e[t.edges.source].d3plus.dy}).attr("x2",function(e){return e[t.edges.target].d3plus.dx}).attr("y2",function(e){return e[t.edges.target].d3plus.dy})}function a(e){e.attr("d",function(e){if(e[t.edges.source].d3plus.dr){var n=e[t.edges.source].d3plus.a,r=e[t.edges.source].d3plus.dr,a=e[t.edges.target].d3plus.a,i=e[t.edges.target].d3plus.dr,o={};return o[t.edges.source]={x:n,y:r},o[t.edges.target]={x:a,y:i},p(o)}var n=e[t.edges.source].d3plus.dx,r=e[t.edges.source].d3plus.dy,a=e[t.edges.target].d3plus.dx,i=e[t.edges.target].d3plus.dy,o={};return o[t.edges.source]={x:n,y:r},o[t.edges.target]={x:a,y:i},d(o)}).attr("transform",function(t){if(t.d3plus&&t.d3plus.translate){var e=t.d3plus.translate.x||0,n=t.d3plus.translate.y||0;return"translate("+e+","+n+")"}})}function i(e){if(delete e.d3plus_label,t.g.edges.selectAll("line, path").size()<t.edges.large&&t.edges.label&&e[t.edges.label]){if("spline"in e.d3plus)var n=this.getTotalLength(),r=this.getPointAtLength(n/2),a=this.getPointAtLength(n/2-.1*n),i=this.getPointAtLength(n/2+.1*n),o=Math.atan2(i.y-a.y,i.x-a.x),l=o*(180/Math.PI),s=this.parentNode.getBBox(),u=.8*n,c=e.d3plus.translate.x+r.x,d=e.d3plus.translate.y+r.y,p={x:e.d3plus.translate.x+r.x,y:e.d3plus.translate.y+r.y};else{var f=this.getBBox();start={x:e[t.edges.source].d3plus.dx,y:e[t.edges.source].d3plus.dy},end={x:e[t.edges.target].d3plus.dx,y:e[t.edges.target].d3plus.dy},xdiff=end.x-start.x,ydiff=end.y-start.y,r={x:end.x-xdiff/2,y:end.y-ydiff/2},o=Math.atan2(ydiff,xdiff),l=o*(180/Math.PI),n=Math.sqrt(xdiff*xdiff+ydiff*ydiff),u=n,c=r.x,d=r.y,p={x:r.x,y:r.y}}u+=2*t.style.labels.padding;var h=0;t.edges.arrows.value&&(h=t.style.edges.arrows,h/=t.zoom_behavior.scaleExtent()[1],u-=2*h),(-90>l||l>90)&&(l-=180),u*t.zoom_behavior.scaleExtent()[0]>20&&(e.d3plus_label={x:c,y:d,translate:p,w:u,h:15+2*t.style.labels.padding,angle:l,anchor:"middle",valign:"center",color:t.style.edges.color,resize:!1,names:[t.format(e[t.edges.label])],background:1})}}var o=t.returned.edges||[],l=t.zoom_behavior.scaleExtent()[0];if("string"==typeof t.edges.size){var s=d3.extent(o,function(e){return e[t.edges.size]}),u=.6*d3.min(t.returned.nodes||[],function(t){return t.d3plus.r});t.edges.scale=d3.scale.sqrt().domain(s).range([t.style.edges.width,u*l])}else{var c="number"==typeof t.edges.size?t.edges.size:t.style.edges.width;t.edges.scale=function(){return c}}var d=d3.svg.diagonal(),p=d3.svg.diagonal().projection(function(t){var e=t.y,n=t.x;return[e*Math.cos(n),e*Math.sin(n)]}),f=t.edges.arrows.value?"string"==typeof t.edges.size?["default_0","default_1","default_2","highlight_0","highlight_1","highlight_2","focus_0","focus_1","focus_2"]:["default","highlight","focus"]:[];if("string"==typeof t.edges.size)for(var h=d3plus.util.buckets(t.edges.scale.range(),4),g=[],v=0;3>v;v++)g.push(h[v+1]+(h[1]-h[0])*(v+2));else var g="number"==typeof t.edges.size?t.edges.size/t.style.edges.arrows:t.style.edges.arrows;var y=t.defs.selectAll(".d3plus_edge_marker").data(f,String),m=function(e){e.attr("d",function(e){var n=e.split("_");if(2==n.length&&t.edges.scale){n=parseInt(n[1]);var r=g[n]}else var r=g;return"target"==t.edges.arrows.direction.value?"M 0,-"+r/2+" L "+.85*r+",0 L 0,"+r/2+" L 0,-"+r/2:"M 0,-"+r/2+" L -"+.85*r+",0 L 0,"+r/2+" L 0,-"+r/2}).attr("fill",function(e){var n=e.split("_")[0];return"default"==n?t.style.edges.color:"focus"==n?t.style.highlight.focus:t.style.highlight.primary}).attr("transform","scale("+1/l+")")};t.timing?(y.exit().transition().duration(t.timing).attr("opacity",0).remove(),y.select("path").transition().duration(t.timing).attr("opacity",1).call(m)):(y.exit().remove(),y.select("path").attr("opacity",1).call(m));var b=t.timing?0:1,x=y.enter().append("marker").attr("id",function(t){return"d3plus_edge_marker_"+t}).attr("class","d3plus_edge_marker").attr("orient","auto").attr("markerUnits","userSpaceOnUse").style("overflow","visible").append("path").attr("opacity",b).attr("vector-effect","non-scaling-stroke").call(m);t.timing&&x.transition().duration(t.timing).attr("opacity",1);var _="string"==typeof t.edges.size?d3plus.util.buckets(t.edges.scale.domain(),4):null,w=t.edges.arrows.direction.value,k=o.filter(function(e){if(!e.d3plus||e.d3plus&&!("spline"in e.d3plus)){if(e.d3plus||(e.d3plus={}),_){var n=e[t.edges.size];e.d3plus.bucket=n<_[1]?0:n<_[2]?1:2;var r=.85*g[e.d3plus.bucket]/l}else{delete e.d3plus.bucket;var r=.85*g/l}var a=e[t.edges.source],i=e[t.edges.target],o=Math.atan2(a.d3plus.y-i.d3plus.y,a.d3plus.x-i.d3plus.x),s="source"==w&&t.edges.arrows.value?a.d3plus.r+r:a.d3plus.r,u="target"==w&&t.edges.arrows.value?i.d3plus.r+r:i.d3plus.r,c=d3plus.util.offset(o,s,t.shape.value),d=d3plus.util.offset(o,u,t.shape.value);return a.d3plus.dx=a.d3plus.x-c.x,a.d3plus.dy=a.d3plus.y-c.y,i.d3plus.dx=i.d3plus.x+d.x,i.d3plus.dy=i.d3plus.y+d.y,!0}return!1}),z=t.g.edges.selectAll("g.d3plus_edge_line").data(k,function(e){return e.d3plus||(e.d3plus={}),e.d3plus.id=e[t.edges.source][t.id.key]+"_"+e[t.edges.target][t.id.key],e.d3plus.id}),S=o.filter(function(e){if(e.d3plus&&e.d3plus.spline){if(e.d3plus||(e.d3plus={}),_){var n=e[t.edges.size];e.d3plus.bucket=n<_[1]?0:n<_[2]?1:2;var r=.85*g[e.d3plus.bucket]/l}else{delete e.d3plus.bucket;var r=.85*g/l}var a=e[t.edges.source],i=e[t.edges.target],o=2==a.d3plus.depth?-r:r,s=2==i.d3plus.depth?-r:r,u="source"==w&&t.edges.arrows.value?a.d3plus.r+o:a.d3plus.r,c="target"==w&&t.edges.arrows.value?i.d3plus.r+s:i.d3plus.r;return a.d3plus.dr=u,i.d3plus.dr=c,!0}return!1}),M=t.g.edges.selectAll("g.d3plus_edge_path").data(S,function(e){return e.d3plus||(e.d3plus={}),e.d3plus.id=e[t.edges.source][t.id.key]+"_"+e[t.edges.target][t.id.key],e.d3plus.id});t.timing?(z.exit().transition().duration(t.timing).attr("opacity",0).remove(),M.exit().transition().duration(t.timing).attr("opacity",0).remove(),z.selectAll("text.d3plus_label, rect.d3plus_label_bg").transition().duration(t.timing/2).attr("opacity",0).remove(),M.selectAll("text.d3plus_label, rect.d3plus_label_bg").transition().duration(t.timing/2).attr("opacity",0).remove(),z.selectAll("line").transition().duration(t.timing).call(r).call(n).each("end",i),M.selectAll("path").transition().duration(t.timing).call(a).call(n).each("end",i),z.enter().append("g").attr("class","d3plus_edge_line").append("line").call(r).call(e).transition().duration(t.timing).call(n).each("end",i),M.enter().append("g").attr("class","d3plus_edge_path").append("path").call(a).call(e).transition().duration(t.timing).call(n).each("end",i)):(z.exit().remove(),M.exit().remove(),z.selectAll("text.d3plus_label, rect.d3plus_label_bg").remove(),M.selectAll("text.d3plus_label, rect.d3plus_label_bg").remove(),z.selectAll("line").call(r).call(n).call(i),M.selectAll("path").call(a).call(n).call(i),z.enter().append("g").attr("class","d3plus_edge_line").append("line").call(r).call(e).call(n).call(i),M.enter().append("g").attr("class","d3plus_edge_path").append("path").call(a).call(e).call(n).call(i)),t.g.edges.selectAll("g").sort(function(e,n){var e=t.connected(e),n=t.connected(n);return e-n})},d3plus.shape.fill=function(t,e,n,r){function a(t){t.attr("x",0).attr("y",0).attr("width",0).attr("height",0)}function i(e,n){if(!n)var n=0;e.attr("x",function(t){var e=t.d3plus.r?2*t.d3plus.r:t.d3plus.width;return-e/2-n/2}).attr("y",function(t){var e=t.d3plus.r?2*t.d3plus.r:t.d3plus.height;return-e/2-n/2}).attr("width",function(t){var e=t.d3plus.r?2*t.d3plus.r:t.d3plus.width;return e+n}).attr("height",function(t){var e=t.d3plus.r?2*t.d3plus.r:t.d3plus.height;return e+n}).attr("rx",function(e){var r=e.d3plus.r?2*e.d3plus.r:e.d3plus.width,a=["circle","donut"].indexOf(t.shape.value)>=0;return a?(r+n)/2:0}).attr("ry",function(e){var r=e.d3plus.r?2*e.d3plus.r:e.d3plus.height,a=["circle","donut"].indexOf(t.shape.value)>=0;return a?(r+n)/2:0}).attr("shape-rendering",function(e){return["square"].indexOf(t.shape.value)>=0?t.style.rendering:"auto"})}function o(e,n,r,a){if(!n)var n=0;if("number"!=typeof r)var r=void 0;if("number"!=typeof a)var a=void 0;e.attrTween("d",function(e){if(void 0==r)var i=e.d3plus.r?e.d3plus.r:d3.max([e.d3plus.width,e.d3plus.height]);else var i=r;if(void 0==a)var o=e.d3plus.a[e.d3plus.shapeType];else var o=a;t.arcs[e.d3plus.shapeType][e.d3plus.id]||(t.arcs[e.d3plus.shapeType][e.d3plus.id]={r:0},t.arcs[e.d3plus.shapeType][e.d3plus.id].a="donut"==e.d3plus.shapeType?2*Math.PI:0);var s=d3.interpolate(t.arcs[e.d3plus.shapeType][e.d3plus.id].r,i+n),u=d3.interpolate(t.arcs[e.d3plus.shapeType][e.d3plus.id].a,o);return function(n){return t.arcs[e.d3plus.shapeType][e.d3plus.id].r=s(n),t.arcs[e.d3plus.shapeType][e.d3plus.id].a=u(n),l(e)}})}t.arcs||(t.arcs={donut:{},active:{},temp:{}});var l=d3.svg.arc().startAngle(0).endAngle(function(e){var n=t.arcs[e.d3plus.shapeType][e.d3plus.id].a;return n>2*Math.PI?2*Math.PI:n}).innerRadius(function(e){if("donut"!=shape||e.d3plus.static)return 0;var n=t.arcs[e.d3plus.shapeType][e.d3plus.id].r;return n*t.style.data.donut.size}).outerRadius(function(e){var n=t.arcs[e.d3plus.shapeType][e.d3plus.id].r;return"donut"!=e.d3plus.shapeType?2*n:n});e.each(function(e){function n(e){e.attr("stroke",c).attr("stroke-width",1).attr("shape-rendering",t.style.rendering)}var r=t.active.key?e.d3plus[t.active.key]:e.d3plus.active,l=t.temp.key?e.d3plus[t.temp.key]:e.d3plus.temp,s=t.total.key?e.d3plus[t.total.key]:e.d3plus.total,u=d3.select(this),c=d3plus.variable.color(t,e),d=[],p=[];if(s&&d3plus.apps[t.type.value].fill){if(l){var f=d3plus.util.copy(e);f.d3plus.shapeType="temp",d.push(f),p=["temp"]}if(r&&(s>r||l)){var f=d3plus.util.copy(e);f.d3plus.shapeType="active",d.push(f)}}var h=t.defs.selectAll("pattern#d3plus_hatch_"+e.d3plus.id).data(p);t.timing?(h.selectAll("rect").transition().duration(t.timing).style("fill",c),h.selectAll("line").transition().duration(t.timing).style("stroke",c)):(h.selectAll("rect").style("fill",c),h.selectAll("line").style("stroke",c));var g=h.enter().append("pattern").attr("id","d3plus_hatch_"+e.d3plus.id).attr("patternUnits","userSpaceOnUse").attr("x","0").attr("y","0").attr("width","10").attr("height","10").append("g");g.append("rect").attr("x","0").attr("y","0").attr("width","10").attr("height","10").attr("fill",c).attr("fill-opacity",.25),g.append("line").attr("x1","0").attr("x2","10").attr("y1","0").attr("y2","10").call(n),g.append("line").attr("x1","-1").attr("x2","1").attr("y1","9").attr("y2","11").call(n),g.append("line").attr("x1","9").attr("x2","11").attr("y1","-1").attr("y2","1").call(n);var v=d.length?[e]:[],y=u.selectAll("#d3plus_clip_"+e.d3plus.id).data(v);y.enter().insert("clipPath",".d3plus_mouse").attr("id","d3plus_clip_"+e.d3plus.id).append("rect").attr("class","d3plus_clipping").call(a),t.timing?(y.selectAll("rect").transition().duration(t.timing).call(i),y.exit().transition().delay(t.timing).remove()):(y.selectAll("rect").call(i),y.exit().remove());var m=u.selectAll("path.d3plus_fill").data(d);m.transition().duration(t.timing).call(d3plus.shape.style,t).call(o),m.enter().insert("path","rect.d3plus_mouse").attr("class","d3plus_fill").attr("clip-path","url(#d3plus_clip_"+e.d3plus.id+")").transition().duration(0).call(o,0,void 0,0).call(d3plus.shape.style,t).transition().duration(t.timing).call(o),m.exit().transition().duration(t.timing).call(o,0,void 0,0).remove()})},d3plus.shape.labels=function(t,e){var n=t.zoom_behavior.scaleExtent(),r=function(e){e.attr("opacity",function(e){if(!e)var e={scale:n[1]};var r=parseFloat(d3.select(this).attr("font-size"),10);return e.visible=r/e.scale*t.zoom.scale>=7,e.visible?1:0})};remove=function(e){t.timing?e.transition().duration(t.timing).attr("opacity",0).remove():e.remove()},style=function(e,r){function a(e){var r=e.anchor||t.style.labels.align,a="tspan"==this.tagName,i=a?"d3plus_share"==this.parentNode.className.baseVal:"d3plus_share"==this.className.baseVal,o=d3.select(this).node().getComputedTextLength()/n[1];if("middle"==r||i)var l=e.x-o/2;else if("end"==r&&!d3plus.rtl||"start"==r&&d3plus.rtl)var l=e.x+(e.w-e.padding)/2-o;
else var l=e.x-(e.w-e.padding)/2;if(a){var s=this.getComputedTextLength()/n[1];"middle"==r?d3plus.rtl?l-=(o-s)/2:l+=(o-s)/2:"end"==r&&(d3plus.rtl?l-=o-s:l+=o-s)}return d3plus.rtl&&(l+=o),l*n[1]}function i(e){if(d3.select(this).select("tspan").empty())return 0;var r=t.style.labels.align,a=d3.select(this).node().getBBox().height/n[1],i=parseFloat(d3.select(this).style("font-size"),10)/5/n[1];if("d3plus_share"==this.className.baseVal){var o=d3.select(this.parentNode).datum(),l=o.d3plus.r?2*o.d3plus.r:o.d3plus.height;if(l/=n[1],"end"==r)var s=e.y-l/2+i/2;else var s=e.y+l/2-a-i/2}else if("middle"==r||"center"==e.valign)var s=e.y-a/2-i/2;else if("end"==r)var s=e.y+(e.h-e.padding)/2-a+i/2;else var s=e.y-(e.h-e.padding)/2-i;return s*n[1]}e.attr("font-weight",t.style.labels.font.weight).attr("font-family",t.style.labels.font.family).attr("text-anchor","start").attr("pointer-events",function(t){return t.mouse?"auto":"none"}).attr("fill",function(e){return e.color?e.color:d3plus.color.text(d3plus.shape.color(e.parent,t))}).attr("x",a).attr("y",i),r&&e.each(function(e){if(e.resize instanceof Array)var n=e.resize[0],r=e.resize[1];if(e.text){if(!(e.resize instanceof Array))var n=8,r=70;d3plus.util.wordwrap({text:t.format(100*e.text,"share")+"%",parent:this,width:e.w*e.scale-e.padding,height:e.h*e.scale-e.padding,resize:e.resize,font_min:n/e.scale,font_max:r*e.scale})}else{if("middle"!=t.style.labels.align)var a=e.h-e.share;else var a=e.h;if(!(e.resize instanceof Array))var n=8,r=40;d3plus.util.wordwrap({text:e.names,parent:this,width:e.w*e.scale-e.padding,height:a*e.scale-e.padding,resize:e.resize,font_min:n/e.scale,font_max:r*e.scale})}}).attr("x",a).attr("y",i),e.attr("transform",function(t){var e=t.angle||0,r=t.translate&&t.translate.x||0,a=t.translate&&t.translate.y||0;return"rotate("+e+","+r+","+a+")scale("+1/n[1]+")"}).selectAll("tspan").attr("x",a)},t.labels.value?e.each(function(e){function a(e){var r="transparent"==t.style.background?"#ffffff":t.style.background,a="string"==typeof label.background?label.background:r,i=label.angle||0,o=label.translate?f.x+f.width/2:0,l=label.translate?f.y+f.height/2:0,s="scale("+1/n[1]+")rotate("+i+","+o+","+l+")";e.attr("fill",a).attr(f).attr("transform",s)}var i=e.d3plus&&"label"in e.d3plus&&!e.d3plus.label,o=e.d3plus&&"static"in e.d3plus&&e.d3plus.static;if(label=e.d3plus_label?e.d3plus_label:t.zoom.labels?t.zoom.labels[e.d3plus.id]:null,share=e.d3plus_share,names=label&&label.names?label.names:d3plus.variable.text(t,e),group=label&&"group"in label?label.group:d3.select(this),share_size=0,fill=d3plus.apps[t.type.value].fill,label)if(["line","area"].indexOf(t.shape.value)>=0)var l=!0;else if(e&&"d3plus"in e)var s=t.active.key?e.d3plus[t.active.key]:e.d3plus.active,u=t.temp.key?e.d3plus[t.temp.key]:e.d3plus.temp,c=t.total.key?e.d3plus[t.total.key]:e.d3plus.total,l=!u&&!s||s==c;if(i||!l&&fill||o)delete e.d3plus_label,group.selectAll("text#d3plus_label_"+e.d3plus.id+", rect#d3plus_label_bg_"+e.d3plus.id).call(remove);else{if(share&&e.d3plus.share&&"middle"!=t.style.labels.align){share.resize=t.labels.resize.value===!1?!1:share&&"resize"in share?share.resize:!0,share.scale=share.resize?n[1]:n[0],share.padding=t.style.labels.padding/share.scale*2,share.text=e.d3plus.share,share.parent=e;var d=group.selectAll("text#d3plus_share_"+e.d3plus.id).data([share],function(t){return t.w+""+t.h+t.text});t.timing?(d.transition().duration(t.timing/2).call(style),d.enter().append("text").attr("font-size",t.style.labels.font.size*share.scale).attr("id","d3plus_share_"+e.d3plus.id).attr("class","d3plus_share").attr("opacity",0).call(style,!0).transition().duration(t.timing/2).delay(t.timing/2).attr("opacity",.5)):(d.attr("opacity",.5).call(style),d.enter().append("text").attr("font-size",t.style.labels.font.size*share.scale).attr("id","d3plus_share_"+e.d3plus.id).attr("class","d3plus_share").attr("opacity",.5).call(style,!0)),share_size=d.node().getBBox().height,d.exit().call(remove)}else group.selectAll("text.d3plus_share").call(remove);if(label&&(label.resize=t.labels.resize.value===!1?!1:label&&"resize"in label?label.resize:!0,label.scale=label.resize?n[1]:n[0],label.padding=t.style.labels.padding/label.scale*2),label&&label.w*label.scale-label.padding>=20&&label.h*label.scale-label.padding>=10&&names.length){label.names=names,label.share=share_size,label.parent=e;var d=group.selectAll("text#d3plus_label_"+e.d3plus.id).data([label],function(t){return t?t.w+"_"+t.h+"_"+t.x+"_"+t.y+"_"+t.names.join("_"):!1});if(t.timing?(d.transition().duration(t.timing/2).call(style),d.enter().append("text").attr("font-size",t.style.labels.font.size*label.scale).attr("id","d3plus_label_"+e.d3plus.id).attr("class","d3plus_label").attr("opacity",0).call(style,!0).transition().duration(t.timing/2).delay(t.timing/2).call(r)):(d.attr("opacity",1).call(style),d.enter().append("text").attr("font-size",t.style.labels.font.size*label.scale).attr("id","d3plus_label_"+e.d3plus.id).attr("class","d3plus_label").call(style,!0).call(r)),d.exit().call(remove),0==d.size()||""==d.html())delete e.d3plus_label,group.selectAll("text.d3plus_label, rect.d3plus_label_bg").call(remove);else{if(label.background){var p=["background"],f=d.node().getBBox();f.width+=t.style.labels.padding*n[0],f.height+=t.style.labels.padding*n[0],f.x-=t.style.labels.padding*n[0]/2,f.y-=t.style.labels.padding*n[0]/2}else var p=[],f={};var h=group.selectAll("rect#d3plus_label_bg_"+e.d3plus.id).data(p),g="number"==typeof label.background?label.background:.6;t.timing?(h.exit().transition().duration(t.timing).attr("opacity",0).remove(),h.transition().duration(t.timing).attr("opacity",g).call(a),h.enter().insert("rect",".d3plus_label").attr("id","d3plus_label_bg_"+e.d3plus.id).attr("class","d3plus_label_bg").attr("opacity",0).call(a).transition().duration(t.timing).attr("opacity",g)):(h.exit().remove(),h.enter().insert("rect",".d3plus_label").attr("id","d3plus_label_bg_"+e.d3plus.id).attr("class","d3plus_label_bg"),h.attr("opacity",g).call(a))}}else delete e.d3plus_label,group.selectAll("text#d3plus_label_"+e.d3plus.id+", rect#d3plus_label_bg_"+e.d3plus.id).call(remove)}}):(e.selectAll("text.d3plus_label, rect.d3plus_label_bg").call(remove),t.g.labels.selectAll("text.d3plus_label, rect.d3plus_label_bg").call(remove))},d3plus.shape.line=function(t,e,n,r){function a(t){t.attr("x",function(t){return t.d3plus.x}).attr("y",function(t){return t.d3plus.y}).attr("width",0).attr("height",0)}function i(t,e){if(!e)var e=0;t.attr("x",function(t){var n=t.d3plus.r?2*t.d3plus.r:t.d3plus.width;return t.d3plus.x-(n/2+e/2)}).attr("y",function(t){var n=t.d3plus.r?2*t.d3plus.r:t.d3plus.height;return t.d3plus.y-(n/2+e/2)}).attr("width",function(t){var n=t.d3plus.r?2*t.d3plus.r:t.d3plus.width;return n+e}).attr("height",function(t){var n=t.d3plus.r?2*t.d3plus.r:t.d3plus.height;return n+e}).attr("rx",function(t){var n=t.d3plus.r?2*t.d3plus.r:t.d3plus.width;return(n+e)/2}).attr("ry",function(t){var n=t.d3plus.r?2*t.d3plus.r:t.d3plus.height;return(n+e)/2})}var o=d3.svg.line().x(function(t){return t.d3plus.x}).y(function(t){return t.d3plus.y}).interpolate(t.shape.interpolate.value),l=t.style.data.stroke.width;30>l&&(l=30),e.each(function(e){var n=!1,r=[],s=[],u=d3plus.util.copy(e),c=d3.select(this);u.values=[],e.values.forEach(function(a,i,o){s.push(a);var l=a[t[t.continuous_axis].key],c=t.tickValues[t.continuous_axis].indexOf(l);n===!1&&(n=c),i+n==c?(u.values.push(a),u.key+="_"+r.length):(i>0&&(r.push(u),u=d3plus.util.copy(e),u.values=[]),u.values.push(a),u.key+="_"+r.length,n++),i==o.length-1&&r.push(u)});var d=c.selectAll("path.d3plus_line").data(r,function(t){return t.key}),p=c.selectAll("rect.d3plus_anchor").data(s,function(t){return t.d3plus.id});t.timing?(d.transition().duration(t.timing).attr("d",function(t){return o(t.values)}).call(d3plus.shape.style,t),d.enter().append("path").attr("class","d3plus_line").attr("d",function(t){return o(t.values)}).call(d3plus.shape.style,t),p.enter().append("rect").attr("class","d3plus_anchor").attr("id",function(t){return t.d3plus.id}).call(a).call(d3plus.shape.style,t),p.transition().duration(t.timing).call(i).call(d3plus.shape.style,t),p.exit().transition().duration(t.timing).call(a).remove()):(d.enter().append("path").attr("class","d3plus_line"),d.attr("d",function(t){return o(t.values)}).call(d3plus.shape.style,t),p.enter().append("rect").attr("class","d3plus_anchor").attr("id",function(t){return t.d3plus.id}),p.call(i).call(d3plus.shape.style,t));var f=c.selectAll("path.d3plus_mouse").data(r,function(t){return t.key});f.enter().append("path").attr("class","d3plus_mouse").attr("d",function(t){return o(t.values)}).style("stroke","black").style("stroke-width",l).style("fill","none").style("stroke-linecap","round").attr("opacity",0),f.on(d3plus.evt.over,function(n){if(!t.frozen){var r=d3.event[t.continuous_axis];positions=d3plus.util.uniques(e.values,function(e){return e.d3plus[t.continuous_axis]}),closest=d3plus.util.closest(positions,r);var a=d3.select(this.parentNode).datum();a.data=e.values[positions.indexOf(closest)],a.d3plus=e.values[positions.indexOf(closest)].d3plus,d3.select(this.parentNode).selectAll("path.d3plus_line").transition().duration(t.style.timing.mouseevents).style("stroke-width",2*t.style.data.stroke.width),d3.select(this.parentNode).selectAll("rect").transition().duration(t.style.timing.mouseevents).style("stroke-width",2*t.style.data.stroke.width).call(i,2)}}).on(d3plus.evt.move,function(e){if(!t.frozen){var n=d3.event.x,r=d3plus.util.uniques(e.values,function(t){return t.d3plus.x}),a=d3plus.util.closest(r,n),i=d3.select(this.parentNode).datum();i.data=e.values[r.indexOf(a)],i.d3plus=e.values[r.indexOf(a)].d3plus}}).on(d3plus.evt.out,function(e){if(!t.frozen){d3.select(this.parentNode).selectAll("path.d3plus_line").transition().duration(t.style.timing.mouseevents).style("stroke-width",t.style.data.stroke.width),d3.select(this.parentNode).selectAll("rect").transition().duration(t.style.timing.mouseevents).style("stroke-width",t.style.data.stroke.width).call(i);var n=d3.select(this.parentNode).datum();delete n.data,delete n.d3plus}}),t.timing?f.transition().duration(t.timing).attr("d",function(t){return o(t.values)}).style("stroke-width",l):f.attr("d",function(t){return o(t.values)}).style("stroke-width",l),f.exit().remove()})},d3plus.shape.rect=function(t,e,n,r){function a(e){if(t.labels.value&&!e.d3plus.label){e.d3plus_label={w:0,h:0,x:0,y:0};var n=e.d3plus.r?2*e.d3plus.r:e.d3plus.width,r=e.d3plus.r?2*e.d3plus.r:e.d3plus.height;"square"==t.shape.value?(e.d3plus_share={w:n,h:r/4,x:0,y:0},e.d3plus_label.w=n,e.d3plus_label.h=r):(e.d3plus_label.w=Math.sqrt(.8*Math.pow(n,2)),e.d3plus_label.h=Math.sqrt(.8*Math.pow(r,2)))}else e.d3plus.label&&(e.d3plus_label=e.d3plus.label);return[e]}function i(t){t.attr("x",0).attr("y",0).attr("width",0).attr("height",0)}function o(e){e.attr("x",function(t){var e=t.d3plus.r?2*t.d3plus.r:t.d3plus.width;return-e/2}).attr("y",function(t){var e=t.d3plus.r?2*t.d3plus.r:t.d3plus.height;return-e/2}).attr("width",function(t){var e=t.d3plus.r?2*t.d3plus.r:t.d3plus.width;return e}).attr("height",function(t){var e=t.d3plus.r?2*t.d3plus.r:t.d3plus.height;return e}).attr("rx",function(e){var n="circle"==t.shape.value,r=e.d3plus.r?2*e.d3plus.r:e.d3plus.width;return n?(r+2)/2:0}).attr("ry",function(e){var n="circle"==t.shape.value,r=e.d3plus.r?2*e.d3plus.r:e.d3plus.height;return n?(r+2)/2:0}).attr("transform",function(t){return"rotate"in t.d3plus?"rotate("+t.d3plus.rotate+")":""}).attr("shape-rendering",function(e){return"square"!=t.shape.value||"rotate"in e.d3plus?"auto":t.style.rendering})}t.timing?n.append("rect").attr("class","d3plus_data").call(i).call(d3plus.shape.style,t):n.append("rect").attr("class","d3plus_data"),t.timing?e.selectAll("rect.d3plus_data").data(a).transition().duration(t.timing).call(o).call(d3plus.shape.style,t):e.selectAll("rect.d3plus_data").data(a).call(o).call(d3plus.shape.style,t),t.timing&&r.selectAll("rect.d3plus_data").transition().duration(t.timing).call(i)},d3plus.shape.style=function(t,e){t.attr("fill",function(t){return t.d3plus&&t.d3plus.spline?"none":d3plus.shape.color(t,e)}).style("stroke",function(t){if(t.values)var n=d3plus.shape.color(t.values[0],e);else var n=d3plus.shape.color(t,e);return d3plus.color.legible(n)}).style("stroke-width",e.style.data.stroke.width).attr("opacity",e.style.data.opacity).attr("vector-effect","non-scaling-stroke")},d3plus.styles.default={background:"#ffffff",color:{heatmap:["#27366C","#7B91D3","#9ED3E3","#F3D261","#C9853A","#D74B03"],missing:"#eeeeee",range:["#D74B03","#eeeeee","#94B153"]},data:{donut:{size:.35},opacity:.9,stroke:{width:1}},edges:{arrows:8,color:"#d0d0d0",opacity:1,width:1},footer:{font:{align:"center",color:"#444",decoration:"none",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],size:10,transform:"none",weight:200},padding:5,position:"bottom"},font:{color:"#444",decoration:"none",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],transform:"none",weight:200},group:{background:!0},highlight:{focus:"#444444",primary:"#D74B03",secondary:"#E5B3BB"},labels:{align:"middle",padding:7,segments:2,font:{decoration:"none",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],size:12,transform:"none",weight:200}},legend:{align:"middle",gradient:{height:10},label:{color:"#444",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],weight:200,size:12},size:[10,30],tick:{align:"middle",color:"#444",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],weight:200,size:10}},link:{font:{color:"#444",decoration:"none",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],transform:"none",weight:200},hover:{font:{color:"#444",decoration:"underline",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],transform:"none",weight:200}}},message:{font:{color:"#444",decoration:"none",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],size:18,transform:"none",weight:200},opacity:.75,padding:10},rendering:"auto",ticks:{color:"#ccc",font:{color:"#888",decoration:"none",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],size:12,transform:"none",weight:200},size:10,width:1},timeline:{align:"middle",background:"#eeeeee",brush:{color:"#fff",opacity:1},handles:{color:"#E5E5E5",hover:"#fff",opacity:1,size:3,stroke:"#ccc"},height:20,label:{color:"#444",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],weight:200,size:12},tick:{align:"middle",color:"#E5E5E5",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],weight:200,size:10}},timing:{mouseevents:60,transitions:600},title:{font:{align:"center",color:"#444",decoration:"none",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],size:18,transform:"none",weight:200},height:null,padding:2,position:"top",sub:{font:{align:"center",color:"#444",decoration:"none",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],size:13,transform:"none",weight:200},padding:1,position:"top"},total:{font:{align:"center",color:"#444",decoration:"none",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],size:13,transform:"none",weight:200},padding:1,position:"top"},width:null},tooltip:{anchor:"top center",background:"white",curtain:{color:"#ffffff",opacity:.8},font:{color:"#444",family:["Helvetica Neue","HelveticaNeue","Helvetica","Arial","sans-serif"],size:12,transform:"none",weight:200},large:250,small:200},ui:{padding:5}},d3plus.tooltip.app=function(t){function e(e){if(r.d3plus){r.d3plus.merged&&(a||(a={}),a.items=r.d3plus.merged.length);var p=n.active.key?d3plus.variable.value(n,r,n.active.key):r.d3plus.active,f=n.temp.key?d3plus.variable.value(n,r,n.temp.key):r.d3plus.temp,h=n.total.key?d3plus.variable.value(n,r,n.total.key):r.d3plus.total;if("number"==typeof p&&p>0&&h){a||(a={});var g=n.active.key||"active";a[g]=p+"/"+h+" ("+n.format(p/h*100,"share")+"%)"}if("number"==typeof f&&f>0&&h){a||(a={});var g=n.temp.key||"temp";a[g]=f+"/"+h+" ("+n.format(f/h*100,"share")+"%)"}r.d3plus.share&&(a||(a={}),a.share=n.format(100*r.d3plus.share,"share")+"%")}var v="depth"in t?t.depth:n.depth.value,_=d3plus.variable.text(n,r,v)[0],w=d3plus.variable.value(n,r,n.icon.key,n.id.nesting[v]),k=d3plus.tooltip.data(n,r,d,a,v);if(k.length>0||y||!r.d3plus_label&&"short"==d&&_||r.d3plus_label&&"visible"in r.d3plus_label&&!r.d3plus_label.visible){_||(_=l);var v=r.d3plus&&"depth"in r.d3plus?n.id.nesting[r.d3plus.depth]:n.id.key;if("string"==typeof n.icon.style.value)var z=n.icon.style.value;else if("object"==typeof n.icon.style.value&&n.icon.style.value[v])var z=n.icon.style.value[v];else var z="default";if(t.width)var S=t.width;else if(u||0!=k.length)var S=n.style.tooltip.small;else var S="auto";d3plus.tooltip.create({align:c,arrow:o,background:n.style.tooltip.background,curtain:n.style.tooltip.curtain.color,curtainopacity:n.style.tooltip.curtain.opacity,fontcolor:n.style.tooltip.font.color,fontfamily:n.style.tooltip.font.family,fontsize:n.style.tooltip.font.size,fontweight:n.style.tooltip.font.weight,data:k,color:d3plus.variable.color(n,r),footer:y,fullscreen:u,html:e,icon:w,id:s,max_height:t.maxheight,max_width:n.style.tooltip.small,mouseevents:i,offset:x,parent:n.parent,style:z,title:_,width:S,x:m,y:b})}else d3plus.tooltip.remove(s)}var n=t.vars,r=t.data,a=t.ex,i=t.mouseevents?t.mouseevents:!1,o="arrow"in t?t.arrow:!0,l=d3plus.variable.value(n,r,n.id.key),s=t.id||n.type.value;if(!d3.event||"click"!=d3.event.type||!n.html.value&&!n.tooltip.value.long||"fullscreen"in t){var u=!1,c=t.anchor||n.style.tooltip.anchor,d=t.length||"short",p=n.zoom_direction();if(-1===p)var f=n.id.nesting[n.depth.value-1],h=d3plus.variable.value(n,l,f),g=n.id.solo.value.indexOf(h)>=0;if(1===p&&n.zoom.value)var v=n.format("Click to Expand");else if(-1===p&&n.zoom.value&&g)var v=n.format("Click to Collapse");else if("short"==d&&(n.html.value||n.tooltip.value.long)&&n.focus.value!=l)var v="Click for More Info";else if("long"==d)var v=n.footer.value||"";else var v="";var y=v.length?n.format(v,"footer"):!1}else{var u=!0,o=!1,i=!0,d="long",y=n.footer.value;n.covered=!0}if("x"in t)var m=t.x;else if("follow"==d3plus.apps[n.type.value].tooltip)var m=d3.mouse(n.parent.node())[0];else{var m=r.d3plus.x;n.zoom.translate&&n.zoom.scale&&(m=n.zoom.translate[0]+m*n.zoom.scale),m+=n.margin.left}if("y"in t)var b=t.y;else if("follow"==d3plus.apps[n.type.value].tooltip)var b=d3.mouse(n.parent.node())[1];else{var b=r.d3plus.y;n.zoom.translate&&n.zoom.scale&&(b=n.zoom.translate[1]+b*n.zoom.scale),b+=n.margin.top}if("offset"in t)var x=t.offset;else if("follow"==d3plus.apps[n.type.value].tooltip)var x=3;else{var x=r.d3plus.r?r.d3plus.r:r.d3plus.height/2;n.zoom.scale&&(x*=n.zoom.scale)}u?"string"==typeof n.html.value?e(n.html.value):"function"==typeof n.html.value?e(n.html.value(l)):n.html.value&&"object"==typeof n.html.value&&n.html.value.url?d3.json(n.html.value.url,function(t){var r=n.html.value.callback?n.html.value.callback(t):t;e(r)}):e(""):e("")},d3plus.tooltip.arrow=function(t){t.style("bottom",function(t){return"center"==t.anchor.y||t.flip?"auto":"-5px"}).style("top",function(t){return"center"!=t.anchor.y&&t.flip?"-5px":"center"==t.anchor.y?"50%":"auto"}).style("left",function(t){return"center"==t.anchor.y&&t.flip?"-5px":"center"!=t.anchor.y?"50%":"auto"}).style("right",function(t){return"center"!=t.anchor.y||t.flip?"auto":"-5px"}).style("margin-left",function(t){if("center"==t.anchor.y)return"auto";if("right"==t.anchor.x)var e=-t.width/2+t.arrow_offset/2;else if("left"==t.anchor.x)var e=t.width/2-2*t.arrow_offset-5;else var e=-5;if(t.cx-t.width/2-5<e)e=t.cx-t.width/2-5,e<2-t.width/2&&(e=2-t.width/2);else if(-(t.limit[0]-t.cx-t.width/2+5)>e){var e=-(t.limit[0]-t.cx-t.width/2+5);e>t.width/2-11&&(e=t.width/2-11)}return e+"px"}).style("margin-top",function(t){if("center"!=t.anchor.y)return"auto";if("bottom"==t.anchor.y)var e=-t.height/2+t.arrow_offset/2-1;else if("top"==t.anchor.y)var e=t.height/2-2*t.arrow_offset-2;else var e=-9;if(t.cy-t.height/2-t.arrow_offset<e)e=t.cy-t.height/2-t.arrow_offset,e<4-t.height/2&&(e=4-t.height/2);else if(-(t.limit[1]-t.cy-t.height/2+t.arrow_offset)>e){var e=-(t.limit[1]-t.cy-t.height/2+t.arrow_offset);e>t.height/2-22&&(e=t.height/2-22)}return e+"px"})},d3plus.tooltip.create=function(t){var e=t.fullscreen?250:200;t.width=t.width||e,t.max_width=t.max_width||386,t.id=t.id||"default",t.size=t.fullscreen||t.html?"large":"small",t.offset=t.offset||0,t.arrow_offset=t.arrow?8:0,t.x=t.x||0,t.y=t.y||0,t.color=t.color||"#333",t.parent=t.parent||d3.select("body"),t.curtain=t.curtain||"#fff",t.curtainopacity=t.curtainopacity||.8,t.background=t.background||"#fff",t.fontcolor=t.fontcolor||"#333",t.fontfamily=t.fontfamily||"sans-serif",t.fontweight=t.fontweight||"normal",t.fontsize=t.fontsize||"12px",t.style=t.style||"default",t.zindex="small"==t.size?2e3:500,t.iconsize||(t.iconsize="small"==t.size?22:50),t.limit=[parseFloat(t.parent.style("width"),10),parseFloat(t.parent.style("height"),10)];var n=function(){d3.selectAll("div.d3plus_tooltip_data_desc").style("height","0px"),d3.selectAll("div.d3plus_tooltip_data_help").style("background-color","#ccc")};if(d3plus.tooltip.remove(t.id),t.anchor={},t.fullscreen)t.anchor.x="center",t.anchor.y="center",t.x=t.parent?t.parent.node().offsetWidth/2:window.innerWidth/2,t.y=t.parent?t.parent.node().offsetHeight/2:window.innerHeight/2;else if(t.align){var r=t.align.split(" ");t.anchor.y=r[0],t.anchor.x=r[1]?r[1]:"center"}else t.anchor.x="center",t.anchor.y="top";var a=t.width-30;if(t.fullscreen)var i=t.parent.append("div").attr("id","d3plus_tooltip_curtain_"+t.id).attr("class","d3plus_tooltip_curtain").style("background-color",t.curtain).style("opacity",t.curtainopacity).style("position","absolute").style("z-index",499).style("top","0px").style("right","0px").style("bottom","0px").style("left","0px").on(d3plus.evt.click,function(){d3plus.tooltip.remove(t.id)});var o=t.parent.append("div").datum(t).attr("id","d3plus_tooltip_id_"+t.id).attr("class","d3plus_tooltip d3plus_tooltip_"+t.size).style("color",t.fontcolor).style("font-family",t.fontfamily).style("font-weight",t.fontweight).style("font-size",t.fontsize+"px").style("position","absolute").style("z-index",t.zindex).on(d3plus.evt.out,function(){n()});t.max_height&&o.style("max-height",t.max_height+"px"),t.fixed?(o.style("z-index",500),t.mouseevents=!0):o.style("z-index",2e3);var l=o.append("div").datum(t).attr("class","d3plus_tooltip_container").style("background-color",t.background);if(t.fullscreen&&t.html){u=t.parent?.75*t.parent.node().offsetWidth:.75*window.innerWidth,M=t.parent?.75*t.parent.node().offsetHeight:.75*window.innerHeight,l.style("width",u+"px").style("height",M+"px");var s=l.append("div").attr("class","d3plus_tooltip_body").style("display","inline-block").style("z-index",1).style("width",t.width+"px")}else{if("auto"==t.width){var u="auto";l.style("max-width",t.max_width+"px")}else var u=t.width-14+"px";var s=l.style("width",u)}if(t.title||t.icon)var c=s.append("div").attr("class","d3plus_tooltip_header").style("position","relative").style("z-index",1);if(t.fullscreen)var d=o.append("div").attr("class","d3plus_tooltip_close").style("background-color",t.color).style("color",d3plus.color.text(t.color)).style("position","absolute").html("&times;").on(d3plus.evt.click,function(){d3plus.tooltip.remove(t.id)});if(t.mouseevents){if(t.mouseevents!==!0){var p=d3.select(t.mouseevents).on(d3plus.evt.out),f=function(){var e=d3.event.toElement||d3.event.relatedTarget;if(e)var r="string"==typeof e.className?e.className:e.className.baseVal,a=0==r.indexOf("d3plus_tooltip");else var a=!1;e&&(h(o.node(),e)||h(t.mouseevents,e)||a)||(p(d3.select(t.mouseevents).datum()),n(),d3.select(t.mouseevents).on(d3plus.evt.out,p))},h=function(t,e){for(var n=e.parentNode;null!=n;){if(n==t)return!0;n=n.parentNode}return!1};d3.select(t.mouseevents).on(d3plus.evt.out,f),o.on(d3plus.evt.out,f);var g=d3.select(t.mouseevents).on(d3plus.evt.move);g&&o.on(d3plus.evt.move,g)}}else o.style("pointer-events","none");if(t.arrow)var v=o.append("div").attr("class","d3plus_tooltip_arrow").style("background-color",t.background).style("position","absolute");if(t.icon){var y=c.append("div").attr("class","d3plus_tooltip_icon").style("width",t.iconsize+"px").style("height",t.iconsize+"px").style("z-index",1).style("background-position","50%").style("background-size","100%").style("background-image","url("+t.icon+")").style("display","inline-block");"knockout"==t.style&&y.style("background-color",t.color),a-=y.node().offsetWidth}if(t.title){var m=t.max_width-6;t.icon&&(m-=t.iconsize+6),m+="px";var b=c.append("div").attr("class","d3plus_tooltip_title").style("max-width",m).style("vertical-align","top").style("width",a+"px").style("display","inline-block").style("overflow","hidden").style("text-overflow","ellipsis").style("word-wrap","break-word").style("z-index",1).text(t.title)}if(t.description)var x=s.append("div").attr("class","d3plus_tooltip_description").text(t.description);if(t.data||t.html&&!t.fullscreen)var _=s.append("div").attr("class","d3plus_tooltip_data_container");if(t.data){var w=0,k={},z=null;t.data.forEach(function(e,r){e.group&&z!=e.group&&(z=e.group,_.append("div").attr("class","d3plus_tooltip_data_title").text(e.group));var a=_.append("div").attr("class","d3plus_tooltip_data_block").datum(e);e.highlight&&a.style("color",d3plus.color.legible(t.color));var i=a.append("div").attr("class","d3plus_tooltip_data_name").html(e.name).on(d3plus.evt.out,function(){d3.event.stopPropagation()}),o=a.append("div").attr("class","d3plus_tooltip_data_value").text(e.value).on(d3plus.evt.out,function(){d3.event.stopPropagation()});if(d3plus.rtl?o.style("left","6px"):o.style("right","6px"),t.mouseevents&&e.desc){var l=a.append("div").attr("class","d3plus_tooltip_data_desc").text(e.desc).on(d3plus.evt.out,function(){d3.event.stopPropagation()}),s=l.node().offsetHeight;l.style("height","0px");var u=i.append("div").attr("class","d3plus_tooltip_data_help").text("?").on(d3plus.evt.over,function(){var t=d3.select(this.parentNode.parentNode).style("color");d3.select(this).style("background-color",t),l.style("height",s+"px")}).on(d3plus.evt.out,function(){d3.event.stopPropagation()});i.style("cursor","pointer").on(d3plus.evt.over,function(){n();var t=d3.select(this.parentNode).style("color");u.style("background-color",t),l.style("height",s+"px")}),a.on(d3plus.evt.out,function(){d3.event.stopPropagation(),n()})}var c=parseFloat(o.style("width"),10);c>t.width/2&&(c=t.width/2),c>w&&(w=c),r!=t.data.length-1&&(e.group&&e.group==t.data[r+1].group||!e.group&&!t.data[r+1].group)&&_.append("div").attr("class","d3plus_tooltip_data_seperator")}),_.selectAll(".d3plus_tooltip_data_name").style("width",function(){var t=parseFloat(d3.select(this.parentNode).style("width"),10);return t-w-30+"px"}),_.selectAll(".d3plus_tooltip_data_value").style("width",w+"px").each(function(t){var e=parseFloat(d3.select(this).style("height"),10);k[t.name]=e}),_.selectAll(".d3plus_tooltip_data_name").style("min-height",function(t){return k[t.name]+"px"})}t.html&&!t.fullscreen&&_.append("div").html(t.html);var S=s.append("div").attr("class","d3plus_tooltip_footer");if(t.footer&&S.html(t.footer),t.height=o.node().offsetHeight,t.html&&t.fullscreen){var M=t.height-12,u=o.node().offsetWidth-t.width-44;l.append("div").attr("class","d3plus_tooltip_html").style("width",u+"px").style("height",M+"px").html(t.html)}if(t.width=o.node().offsetWidth,"center"!=t.anchor.y?t.height+=t.arrow_offset:t.width+=t.arrow_offset,t.data||!t.fullscreen&&t.html){if(t.fullscreen)var M=t.height;else var E=t.parent.node().offsetHeight,C=t.fixed?E-t.y-10:E-10,M=t.height<C?t.height:C;M-=parseFloat(l.style("padding-top"),10),M-=parseFloat(l.style("padding-bottom"),10),c&&(M-=c.node().offsetHeight,M-=parseFloat(c.style("padding-top"),10),M-=parseFloat(c.style("padding-bottom"),10)),S&&(M-=S.node().offsetHeight,M-=parseFloat(S.style("padding-top"),10),M-=parseFloat(S.style("padding-bottom"),10)),_.style("max-height",M+"px")}t.height=o.node().offsetHeight,d3plus.tooltip.move(t.x,t.y,t.id)},d3plus.tooltip.data=function(t,e,n,r,a){function i(n,r){if(t.attrs.value[r])var a=r;else var a=null;r&&(r=t.format(r));var i=l[n]||d3plus.variable.value(t,e,n,a);if(i!==!1&&null!==i){var o=t.format(n),u=s.indexOf(n)>=0,d=t.format(i,n),p={name:o,value:d,highlight:u,group:r};t.descs.value[n]&&(p.desc=t.descs.value[n]),d&&c.push(p)}}if(t.small)return[];if(!n)var n="long";if("long"==n)var o="short";else var o="long";var l={};if(r&&"string"==typeof r)r=[r];else if(r&&"object"==typeof r){l=d3plus.util.merge(l,r);var r=[];for(k in l)r.push(k)}else if(!r)var r=[];var s=[];if(t.tooltip.value instanceof Array)var u=t.tooltip.value;else if("string"==typeof t.tooltip.value)var u=[t.tooltip.value];else{if(t.tooltip.value[t.id.nesting[a]])var u=t.tooltip.value[t.id.nesting[a]];else var u=t.tooltip.value;u instanceof Array||(u=u[n]?u[n]:u[o]?[]:d3plus.util.merge({"":[]},u)),"string"==typeof u?u=[u]:u instanceof Array||(u=d3plus.util.merge({"":[]},u))}var c=[];if(u instanceof Array)r.forEach(function(t){u.indexOf(t)<0&&u.push(t)}),u.forEach(function(t){i(t)});else{if(t.id.nesting.length&&a<t.id.nesting.length-1){var u=d3plus.util.copy(u);t.id.nesting.forEach(function(t,e){e>a&&u[t]&&delete u[t]})}if(t.tooltip.value.long&&"object"==typeof t.tooltip.value.long){var d=[];for(group in t.tooltip.value.long)r.forEach(function(e){t.tooltip.value.long[group].indexOf(e)>=0&&(u[group]&&u[group].indexOf(e)<0||!u[group])?(u[group]||(u[group]=[]),u[group].push(e),d.push(e)):u[group]&&u[group].indexOf(e)>=0&&d.push(e)});r.forEach(function(t){d.indexOf(t)<0&&(u[""]||(u[""]=[]),u[""].push(t))})}else{var p=[];for(group in u)r.forEach(function(t){u[group]instanceof Array&&u[group].indexOf(t)>=0?p.push(t):"string"==typeof u[group]&&u[group]==t&&p.push(t)});p.length!=r.length&&(u[""]||(u[""]=[]),r.forEach(function(t){p.indexOf(t)<0&&u[""].push(t)}))}u[""]&&(u[""].forEach(function(t){i(t,"")}),delete u[""]);for(group in u)u[group]instanceof Array?u[group].forEach(function(t){i(t,group)}):"string"==typeof u[group]&&i(u[group],group)}if("long"==n){var f=t.connections(e[t.id.key],!0);f.length&&f.forEach(function(e){var n=d3plus.variable.text(t,e)[0],r=d3plus.variable.color(t,e),a=t.style.tooltip.font.size,i="square"==t.shape.value?0:a;styles=["background-color: "+r,"border-color: "+d3plus.color.legible(r),"border-style: solid","border-width: "+t.style.data.stroke.width+"px","display: inline-block","height: "+a+"px","left: 0px","position: absolute","width: "+a+"px","top: 0px",d3plus.prefix()+"border-radius: "+i+"px"],node="<div style='"+styles.join("; ")+";'></div>",c.push({group:t.format("Primary Connections"),highlight:!1,name:"<div style='position:relative;padding-left:"+1.5*a+"px;'>"+node+n+"</div>",value:""})})}return c},d3plus.tooltip.move=function(t,e,n){if(n)var r=d3.select("div#d3plus_tooltip_id_"+n);else var r=d3.select("div#d3plus_tooltip_id_default");if(r.node()){var a=r.datum();a.cx=t,a.cy=e,a.fixed||("center"!=a.anchor.y?("right"==a.anchor.x?a.x=a.cx-a.arrow_offset-4:"center"==a.anchor.x?a.x=a.cx-a.width/2:"left"==a.anchor.x&&(a.x=a.cx-a.width+a.arrow_offset+2),"bottom"==a.anchor.y?a.flip=a.cy+a.height+a.offset<=a.limit[1]:"top"==a.anchor.y&&(a.flip=a.cy-a.height-a.offset<0),a.y=a.flip?a.cy+a.offset+a.arrow_offset:a.cy-a.height-a.offset-a.arrow_offset):(a.y=a.cy-a.height/2,"right"==a.anchor.x?a.flip=a.cx+a.width+a.offset<=a.limit[0]:"left"==a.anchor.x&&(a.flip=a.cx-a.width-a.offset<0),"center"==a.anchor.x?(a.flip=!1,a.x=a.cx-a.width/2):a.x=a.flip?a.cx+a.offset+a.arrow_offset:a.cx-a.width-a.offset),a.x<0?a.x=0:a.x+a.width>a.limit[0]&&(a.x=a.limit[0]-a.width),a.y<0?a.y=0:a.y+a.height>a.limit[1]&&(a.y=a.limit[1]-a.height)),r.style("top",a.y+"px").style("left",a.x+"px"),a.arrow&&r.selectAll(".d3plus_tooltip_arrow").call(d3plus.tooltip.arrow)
}},d3plus.tooltip.remove=function(t){t?(d3.selectAll("div#d3plus_tooltip_curtain_"+t).remove(),d3.selectAll("div#d3plus_tooltip_id_"+t).remove()):(d3.selectAll("div#d3plus_tooltip_curtain").remove(),d3.selectAll("div.d3plus_tooltip").remove())},d3plus.ui.focus=function(t){if(!t.internal_error&&t.focus.value&&!t.small&&t.focus.tooltip.value){var e=t.data.pool.filter(function(e){return d3plus.variable.value(t,e,t.id.key)==t.focus.value});e.length>=1?e=e[0]:(e={},e[t.id.key]=t.focus.value);var n=t.style.labels.padding;d3plus.tooltip.app({anchor:"top left",arrow:!1,data:e,length:"long",fullscreen:!1,id:t.type.value+"_focus",maxheight:t.app_height-2*n,mouseevents:!0,offset:0,vars:t,x:t.width.value-t.margin.right-n,y:t.margin.top+n,width:t.style.tooltip.large}),d3.select("div#d3plus_tooltip_id_"+t.type.value+"_focus").empty()||(t.app_width-=t.style.tooltip.large+2*n)}else d3plus.tooltip.remove(t.type.value+"_focus")},d3plus.ui.history=function(t){function e(e){e.style("position","absolute").style("left",t.style.ui.padding+"px").style("top",t.margin.top/2-r/2+"px").style("color",a).style("font-family",i).style("font-weight",o).style("font-size",r+"px").style("z-index",2e3)}if(!t.small&&t.history.states.length>0){var n=t.parent.selectAll("div#d3plus_back_button").data(["d3plus_back_button"]),r=t.title.value?t.style.title.font.size:t.style.title.sub.font.size,a=t.title.sub.value?t.style.title.sub.font.color:t.style.title.font.color,i=t.title.sub.value?t.style.title.sub.font.family:t.style.title.font.family,o=t.title.sub.value?t.style.title.sub.font.weight:t.style.title.font.weight,l=t.title.sub.value?t.style.title.sub.padding:t.style.title.padding,s=r+2*l;t.margin.top<s&&(t.margin.top=s);var u=n.enter().append("div").attr("id","d3plus_back_button").style("opacity",0).call(e).html(function(){if(d3plus.font.awesome)var e="<span style='font-family:FontAwesome;margin-right:5px;'>&#xf104</span>";else var e="&laquo; ";return e+t.format("Back")});n.on(d3plus.evt.over,function(){!t.small&&t.history.states.length>0&&d3.select(this).style("cursor","pointer").transition().duration(t.style.timing.mouseevents).style("color",d3plus.color.lighter(a))}).on(d3plus.evt.out,function(){!t.small&&t.history.states.length>0&&d3.select(this).style("cursor","auto").transition().duration(t.style.timing.mouseevents).style("color",a)}).on(d3plus.evt.click,function(){t.back()}).transition().duration(t.style.timing.transitions).style("opacity",1).call(e)}else t.parent.selectAll("div#d3plus_back_button").transition().duration(t.style.timing.transitions).style("opacity",0).remove()},d3plus.ui.legend=function(t){function e(e){e.attr("transform",function(e,n){var r=v+n*(t.style.ui.padding+a);return"translate("+r+","+t.style.ui.padding+")"})}function n(e){e.attr("width",a).attr("height",a).attr("fill",function(e){if(d3.select(this.parentNode).selectAll("text").remove(),e.icon){var n=d3plus.util.strip(e.icon+"_"+e.color),r=t.defs.selectAll("pattern#"+n).data([n]);if("string"==typeof t.icon.style.value)var i=t.icon.style.value;else if("object"==typeof t.icon.style.value&&t.icon.style.value[e.icon_depth])var i=t.icon.style.value[e.icon_depth];else var i="default";var o="knockout"==i?e.color:"none";r.select("rect").transition().duration(t.style.timing.transitions).attr("fill",o).attr("width",a).attr("height",a),r.select("image").transition().duration(t.style.timing.transitions).attr("width",a).attr("height",a);var l=r.enter().append("pattern").attr("id",n).attr("width",a).attr("height",a);return l.append("rect").attr("fill",o).attr("width",a).attr("height",a),l.append("image").attr("xlink:href",e.icon).attr("width",a).attr("height",a).each(function(t){0==e.icon.indexOf("/")||e.icon.indexOf(window.location.hostname)>=0?d3plus.util.dataurl(e.icon,function(t){r.select("image").attr("xlink:href",t)}):r.select("image").attr("xlink:href",e.icon)}),"url(#"+n+")"}var s=d3.select(this.parentNode).append("text");return s.attr("font-size",t.style.labels.font.size).attr("font-weight",t.style.font.weight).attr("font-family",t.style.font.family).attr("text-anchor","start").attr("fill",d3plus.color.text(e.color)).attr("x",0).attr("y",0).each(function(n){1==e.name.length&&e.name[0].length&&d3plus.util.wordwrap({text:e.name[0],parent:this,width:a-2*t.style.ui.padding,height:a-2*t.style.ui.padding,resize:t.labels.resize.value})}).attr("y",function(t){var e=this.getBBox().height,n=parseFloat(d3.select(this).style("font-size"),10)/5;return a/2-e/2-n/2}).selectAll("tspan").attr("x",function(t){var e=this.getComputedTextLength();return a/2-e/2}),s.select("tspan").empty()&&s.remove(),e.color})}var r=!0,a=0,i=t.color.key||t.id.key;if(!t.small&&t.legend.value&&i){if(t.dev.value&&d3plus.console.group("Calculating Legend"),t.data.keys&&i in t.data.keys)var o=t.data.keys[i];else if(t.attrs.keys&&i in t.attrs.keys)var o=t.attrs.keys[i];else var o=void 0;if(t.color.scale)if(t.color.scale){t.dev.value&&d3plus.console.time("drawing color scale"),t.g.legend.selectAll("g.d3plus_color").transition().duration(t.style.timing.transitions).attr("opacity",0).remove();var l=t.color.scale.domain(),s=t.color.scale.range();l.length<=2&&(l=d3plus.util.buckets(l,6));var u=t.g.legend.selectAll("g.d3plus_scale").data(["scale"]);u.enter().append("g").attr("class","d3plus_scale").attr("opacity",0);var c=u.selectAll("#d3plus_legend_heatmap").data(["heatmap"]);c.enter().append("linearGradient").attr("id","d3plus_legend_heatmap").attr("x1","0%").attr("y1","0%").attr("x2","100%").attr("y2","0%").attr("spreadMethod","pad");var d=c.selectAll("stop").data(d3.range(0,s.length));d.enter().append("stop").attr("stop-opacity",1),d.attr("offset",function(t){return Math.round(t/(s.length-1)*100)+"%"}).attr("stop-color",function(t){return s[t]}),d.exit().remove();var p=u.selectAll("rect#gradient").data(["gradient"]);p.enter().append("rect").attr("id","gradient").attr("x",function(e){return"middle"==t.style.legend.align?t.width.value/2:"end"==t.style.legend.align?t.width.value:0}).attr("y",t.style.ui.padding).attr("width",0).attr("height",t.style.legend.gradient.height).attr("stroke",t.style.legend.tick.color).attr("stroke-width",1).style("fill","url(#d3plus_legend_heatmap)");var f=u.selectAll("text.d3plus_tick").data(d3.range(0,l.length));f.enter().append("text").attr("class","d3plus_tick").attr("x",function(e){return"middle"==t.style.legend.align?t.width.value/2:"end"==t.style.legend.align?t.width.value:0}).attr("y",function(e){return this.getBBox().height+t.style.legend.gradient.height+2*t.style.ui.padding});var h=0;f.order().attr("font-weight",t.style.legend.tick.weight).attr("font-family",t.style.legend.tick.family).attr("font-size",t.style.legend.tick.size).attr("text-anchor",t.style.legend.tick.align).attr("fill",t.style.legend.tick.color).text(function(e){return t.format(l[e],i)}).attr("y",function(e){return this.getBBox().height+t.style.legend.gradient.height+2*t.style.ui.padding}).each(function(t){var e=this.offsetWidth;e>h&&(h=e)}),h+=2*t.style.labels.padding;var g=h*(l.length-1);if(g+h<t.width.value){if(g+h<t.width.value/2&&(g=t.width.value/2,h=g/l.length,g-=h),"start"==t.style.legend.align)var v=t.style.ui.padding;else if("end"==t.style.legend.align)var v=t.width.value-t.style.ui.padding-g;else var v=t.width.value/2-g/2;f.transition().duration(t.style.timing.transitions).attr("x",function(t){return v+h*t}),f.exit().transition().duration(t.style.timing.transitions).attr("opacity",0).remove();var y=u.selectAll("rect.d3plus_tick").data(d3.range(0,l.length));y.enter().append("rect").attr("class","d3plus_tick").attr("x",function(e){return"middle"==t.style.legend.align?t.width.value/2:"end"==t.style.legend.align?t.width.value:0}).attr("y",t.style.ui.padding).attr("width",0).attr("height",t.style.ui.padding+t.style.legend.gradient.height).attr("fill",t.style.legend.tick.color),y.transition().duration(t.style.timing.transitions).attr("x",function(t){var e=0==t?1:0;return v+h*t-e}).attr("y",t.style.ui.padding).attr("width",1).attr("height",t.style.ui.padding+t.style.legend.gradient.height).attr("fill",t.style.legend.tick.color),y.exit().transition().duration(t.style.timing.transitions).attr("width",0).remove(),p.transition().duration(t.style.timing.transitions).attr("x",function(e){return"middle"==t.style.legend.align?t.width.value/2-g/2:"end"==t.style.legend.align?t.width.value-g-t.style.ui.padding:t.style.ui.padding}).attr("y",t.style.ui.padding).attr("width",g).attr("height",t.style.legend.gradient.height),u.transition().duration(t.style.timing.transitions).attr("opacity",1),t.dev.value&&d3plus.console.timeEnd("drawing color scale")}else r=!1}else r=!1;else{t.dev.value&&d3plus.console.time("determining color groups");var m={},b=[];if("function"==typeof d3plus.apps[t.type.value].filter)var x=d3plus.apps[t.type.value].filter(t);else if(t.nodes.value&&d3plus.apps[t.type.value].requirements.indexOf("nodes")>=0)var x=t.nodes.restriced||t.nodes.value;else var x=t.data.app;x.forEach(function(e){var n="object"==typeof e?e[t.id.key]:e;if(b.indexOf(n)<0){var r=d3plus.variable.color(t,e);m[r]||(m[r]=[]),m[r].push(e),b.push(n)}}),t.dev.value&&d3plus.console.timeEnd("determining color groups"),t.dev.value&&d3plus.console.time("grouping colors");var s=[];for(color in m){for(var _={color:color,icon_depth:t.id.nesting[t.depth.value],name:[]},w=0==t.depth.value?1:t.depth.value+1;--w>=0;){var k=t.id.nesting[w],z=[];if(m[color].forEach(function(e){var n=d3plus.variable.value(t,e,k);n&&z.indexOf(n)<0&&z.push(n)}),1==z.length){var S=z[0],M=d3plus.variable.text(t,S,w);if(M&&_.name.indexOf(M)<0&&_.name.push(M.toString()),!_.icon){var E=d3plus.variable.value(t,S,t.icon.key,k);E&&(_.icon=E,_.icon_depth=t.id.nesting[w])}if("id"==t.legend.order.val&&(_.id=S),["color","text"].indexOf(t.legend.order.value)<0){var i=t[t.legend.order.value].key;_[t.legend.order.value]=d3plus.variable.value(t,S,i,k)}break}if(0==w&&z.forEach(function(e){var n=d3plus.variable.text(t,e,w);n&&_.name.indexOf(n)<0&&_.name.push(n.toString())}),_.name.length>0&&_.icon)break}_.name.sort(),s.push(_)}t.dev.value&&d3plus.console.timeEnd("grouping colors");var C=t.width.value;a=t.style.legend.size;var g=a*s.length+t.style.ui.padding*(s.length+1);if(a instanceof Array){t.dev.value&&d3plus.console.time("calculating size");for(var w=a[1];w>=a[0];w--)if(g=w*s.length+t.style.ui.padding*(s.length+1),C>=g){a=w;break}t.dev.value&&d3plus.console.timeEnd("calculating size")}else"number"!=typeof a&&a!==!1&&(a=30);if(g>C||1==s.length)r=!1;else{g-=2*t.style.ui.padding,t.dev.value&&d3plus.console.time("sorting colors");var A=t.legend.order.sort.value;if(s.sort(function(e,n){if("color"==t.legend.order.value){var r=e.color,a=n.color;r=d3.rgb(r).hsl(),a=d3.rgb(a).hsl(),r=0==r.s?361:r.h,a=0==a.s?361:a.h}else if("text"==t.legend.order.value)var r=e.name[0],a=n.name[0];else var r=e[t.legend.order.value],a=n[t.legend.order.value];return a>r?"asc"==A?-1:1:r>a?"asc"==A?1:-1:void 0}),t.dev.value&&d3plus.console.timeEnd("sorting colors"),"start"==t.style.legend.align)var v=t.style.ui.padding;else if("end"==t.style.legend.align)var v=C-t.style.ui.padding-g;else var v=C/2-g/2;t.g.legend.selectAll("g.d3plus_scale").transition().duration(t.style.timing.transitions).attr("opacity",0).remove();var T=t.g.legend.selectAll("g.d3plus_color").data(s,function(t){return t.url?t.color+"_"+t.url:t.color}),O=T.enter().append("g").attr("class","d3plus_color").attr("opacity",0).call(e);O.append("rect").attr("class","d3plus_color").call(n),d3plus.touch||T.on(d3plus.evt.over,function(e,n){if(e.name.length&&(d3.select(this).select("text").empty()||e.name.length>1)){d3.select(this).style("cursor","pointer");var r=v+n*(t.style.ui.padding+a),i=d3.transform(d3.select(this.parentNode).attr("transform")).translate[1];if(r+=a/2,i+=t.style.ui.padding+a/2,"string"==typeof t.icon.style.value)var o=t.icon.style.value;else if("object"==typeof t.icon.style.value&&t.icon.style.value[e.icon_depth])var o=t.icon.style.value[e.icon_depth];else var o="default";var l=[];if(e.name.forEach(function(t){l.push(t instanceof Array?t[0]:t)}),1==l.length)var s=l[0],u=null;else{var s=null;if(l.length>4){var c=l.length-4;l=l.slice(0,4),l[4]=t.format(c+" more")}if(2==l.length)var u=l.join(" "+t.format("and")+" ");else{l[l.length-1]=t.format("and")+" "+l[l.length-1];var u=l.join(", ")}}d3plus.tooltip.create({align:"top center",arrow:!0,background:t.style.tooltip.background,description:u,fontcolor:t.style.tooltip.font.color,fontfamily:t.style.tooltip.font.family,fontweight:t.style.tooltip.font.weight,color:e.color,icon:e.icon,id:"legend",offset:a/2-t.style.ui.padding,parent:t.parent,style:o,title:s,x:r,y:i,max_width:200,width:"auto"})}}).on(d3plus.evt.out,function(t){d3plus.tooltip.remove("legend")}),T.order().transition().duration(t.style.timing.transitions).attr("opacity",1).call(e),T.selectAll("rect.d3plus_color").transition().duration(t.style.timing.transitions).call(n),T.exit().transition().duration(t.style.timing.transitions).attr("opacity",0).remove()}}}else r=!1;if(t.legend.value&&i&&r){if(t.dev.value&&d3plus.console.time("positioning legend"),a)var B=a;else var N=t.g.legend.node().getBBox(),B=N.height+N.y;t.g.timeline.node().getBBox().height||(t.margin.bottom+=t.style.ui.padding),t.margin.bottom+=B+t.style.ui.padding,t.g.legend.transition().duration(t.style.timing.transitions).attr("transform","translate(0,"+(t.height.value-t.margin.bottom)+")"),t.dev.value&&d3plus.console.timeEnd("positioning legend")}else t.dev.value&&d3plus.console.time("hiding legend"),t.g.legend.transition().duration(t.style.timing.transitions).attr("transform","translate(0,"+t.height.value+")"),t.dev.value&&d3plus.console.timeEnd("hiding legend");t.legend.value&&i&&t.dev.value&&d3plus.console.groupEnd()},d3plus.ui.message=function(t,e){function n(e){e.style(a).style("position","absolute").style("background",o).style("text-align","center").style("left",function(){return"center"==i?"50%":"0px"}).style("width",function(){return"center"==i?"auto":t.width.value+"px"}).style("margin-left",function(){var e=t.width.value-t.app_width;return"center"==i?-(this.offsetWidth/2+e/2)+"px":"0px"}).style("top",function(){return"center"==i?"50%":"top"==i?"0px":"auto"}).style("bottom",function(){return"bottom"==i?"0px":"auto"}).style("margin-top",function(){if("large"==r){var t=this.offsetHeight;return-t/2+"px"}return"0px"})}var e=t.messages.value?e:null,r=e==t.internal_error?"large":t.messages.style;if("large"==r)var a=t.style.message,i="center";else{if(t.footer.value)var a=t.style.footer;else if(t.title.value)var a=t.style.title;else if(t.title.sub.value)var a=t.style.title.sub;else if(t.title.total.value)var a=t.style.title.total;else var a=t.style.title.sub;var i=a.position}var a={color:a.font.color,"font-family":a.font.family,"font-weight":a.font.weight,"font-size":a.font.size+"px",padding:a.padding+"px"},o="none"!=t.style.background?t.style.background:"white";t.g.message=t.parent.selectAll("div#d3plus_message").data(["message"]),t.g.message.enter().append("div").attr("id","d3plus_message").attr("opacity",0);var l=e?1:0,s=e?e:t.g.message.text(),u=e?"inline-block":"none";t.g.message.text(s).call(n).style("opacity",l).style("display",u)},d3plus.ui.timeline=function(t){var e=t.data.time;if(!t.small&&e&&e.length>1&&t.timeline.value){if(t.time.key==t.x.key&&"continuous"==t.x.scale.value||t.time.key==t.y.key&&"continuous"==t.y.scale.value)var n=2;else var n=1;if(t.time.solo.value.length)var r=d3.extent(t.time.solo.value);else var r=d3.extent(e);var a=e[0],i=e[e.length-1],o=r[0],l=r[1],s=[],u=[];e.forEach(function(t,n){0!=n&&u.push(t-e[n-1])});var c=d3.min(u),d=c*e.length;e=[];for(var p=a;i>=p;p+=c)e.push(p),s.push(d3.time.year(new Date(parseInt(p),0,1)));s.push(d3.time.year(new Date(parseInt(i+c),0,1)));var f=function(){if(null!==d3.event.sourceEvent){var r=E.extent(),a=d3plus.util.closest(s,d3.time.year.round(r[0])),i=d3plus.util.closest(s,d3.time.year.round(r[1]));a==i&&(a=d3plus.util.closest(s,d3.time.year.floor(r[0])));var o=s.indexOf(a),l=s.indexOf(i);if(l-o>=n)var u=[a,i];else if(o+n<=e.length)var u=[a,s[o+n]];else{for(var u=[a],c=1;n>=c;c++)o+c<=e.length?u.push(s[o+c]):u.unshift(s[o-(o+c-e.length)]);u=[u[0],u[u.length-1]]}d3.select(this).transition().call(E.extent(u)).each("end",function(n){var r=d3.range(u[0].getFullYear(),u[1].getFullYear());r=r.filter(function(t){return e.indexOf(t)>=0}),t.viz.time({solo:r}).draw()})}},h=t.g.timeline.selectAll("rect.d3plus_timeline_background").data(["background"]);h.enter().append("rect").attr("class","d3plus_timeline_background");var g=t.g.timeline.selectAll("g#ticks").data(["ticks"]);g.enter().append("g").attr("id","ticks").attr("transform","translate("+t.width.value/2+","+t.style.ui.padding+")");var v=t.g.timeline.selectAll("g#brush").data(["brush"]);v.enter().append("g").attr("id","brush");var y=t.g.timeline.selectAll("g#labels").data(["labels"]);y.enter().append("g").attr("id","labels");var m=y.selectAll("text").data(e,function(t,e){return e});m.enter().append("text").attr("y",0).attr("dy",0).attr("x",function(e){return"middle"==t.style.timeline.align?t.width.value/2:"end"==t.style.timeline.align?t.width.value:0}).attr("y",function(e){var n=n=parseFloat(d3.select(this).style("font-size"),10)/5,r=t.style.ui.padding+t.style.timeline.height/2+this.getBBox().height/2-n;return r});var b=0,x=0,_=t.style.timeline.height+t.style.ui.padding;m.order().attr("font-weight",t.style.timeline.tick.weight).attr("font-family",t.style.timeline.tick.family).attr("font-size",t.style.timeline.tick.size).attr("text-anchor",t.style.timeline.tick.align).attr("opacity",0).text(function(t){return t}).each(function(t){var e=this.getBBox().width,n=this.getBBox().height;e>b&&(b=e),n>x&&(x=n)});var w=b+2*t.style.ui.padding,k=w*e.length,z=t.width.value-2*t.style.ui.padding,c=1;if(k>z){for(k=z,c=Math.ceil(w/(k/e.length)),w=k/e.length,c;c<e.length-1&&(e.length-1)%c!=0;c++);_+=x}if("start"==t.style.timeline.align)var S=t.style.ui.padding;else if("end"==t.style.timeline.align)var S=t.width.value-t.style.ui.padding-k;else var S=t.width.value/2-k/2;m.text(function(t,e){return e%c==0?t:""}).attr("opacity",1),m.transition().duration(t.style.timing.transitions).attr("fill",function(e){if(e>=r[0]&&e<=r[1]){var n=t.style.timeline.background,a=t.style.timeline.brush.color,i=t.style.timeline.brush.opacity;return mixed=d3plus.color.mix(a,n,i),d3plus.color.text(mixed)}return d3plus.color.text(t.style.timeline.background)}).attr("x",function(t,e){return S+w*e+w/2}).attr("y",function(e){var n=n=parseFloat(d3.select(this).style("font-size"),10)/5,r=t.style.ui.padding+t.style.timeline.height/2+this.getBBox().height/2-n;return c>1&&(r+=x+t.style.ui.padding),r}),m.exit().transition().duration(t.style.timing.transitions).attr("opacity",0).remove(),h.transition().duration(t.style.timing.transitions).attr("width",k).attr("height",t.style.timeline.height).attr("x",S).attr("y",t.style.ui.padding).attr("fill",t.style.timeline.background);var M=d3.time.scale().domain(d3.extent(s)).rangeRound([0,k]),E=d3.svg.brush().x(M).extent([s[e.indexOf(o)],s[e.indexOf(l)+1]]).on("brushend",f);g.transition().duration(t.style.timing.transitions).attr("transform","translate("+S+","+t.style.ui.padding+")").call(d3.svg.axis().scale(M).orient("top").ticks(function(){return s}).tickFormat("").tickSize(-t.style.timeline.height).tickPadding(0)).selectAll("path").attr("fill","none"),g.selectAll("line").transition().duration(t.style.timing.transitions).attr("stroke",t.style.timeline.tick.color).attr("shape-rendering",t.style.rendering),v.attr("transform","translate("+S+","+t.style.ui.padding+")").attr("opacity",1).call(E),m.attr("pointer-events","none"),v.selectAll("rect.background, rect.extent").attr("height",t.style.timeline.height),v.selectAll("rect.background").transition().duration(t.style.timing.transitions).attr("stroke",t.style.timeline.tick.color).attr("stroke-width",1).style("visibility","visible").attr("fill","none").attr("shape-rendering",t.style.rendering),v.selectAll("rect.extent").transition().duration(t.style.timing.transitions).attr("fill",t.style.timeline.brush.color).attr("fill-opacity",t.style.timeline.brush.opacity).attr("stroke",t.style.timeline.tick.color).attr("stroke-width",1).attr("shape-rendering",t.style.rendering),t.timeline.handles.value?v.selectAll("g.resize").select("rect").attr("fill",t.style.timeline.handles.color).attr("stroke",t.style.timeline.handles.stroke).attr("stroke-width",1).attr("x",-t.style.timeline.handles.size/2).attr("width",t.style.timeline.handles.size).attr("height",t.style.timeline.height).style("visibility","visible").attr("shape-rendering",t.style.rendering).attr("opacity",t.style.timeline.handles.opacity):v.selectAll("g.resize").remove(),t.style.timeline.handles.opacity&&v.selectAll("g.resize").on(d3plus.evt.over,function(){d3.select(this).select("rect").transition().duration(t.style.timing.mouseevents).attr("fill",t.style.timeline.handles.hover)}).on(d3plus.evt.out,function(){d3.select(this).select("rect").transition().duration(t.style.timing.mouseevents).attr("fill",t.style.timeline.handles.color)}),t.margin.bottom+=2*t.style.ui.padding+_,t.g.timeline.transition().duration(t.style.timing.transitions).attr("transform","translate(0,"+(t.height.value-t.margin.bottom)+")")}else t.g.timeline.transition().duration(t.style.timing.transitions).attr("transform","translate(0,"+t.height.value+")")},d3plus.ui.titles=function(t){function e(e){e.attr("text-anchor",function(t){var e=t.style.font.align;return"center"==e?"middle":"left"==e&&!d3plus.rtl||"right"==e&&d3plus.rtl?"start":"left"==e&&d3plus.rtl||"right"==e&&!d3plus.rtl?"end":void 0}).attr("x",function(e){var n=e.style.font.align;return"center"==n?t.width.value/2:"left"==n&&!d3plus.rtl||"right"==n&&d3plus.rtl?t.style.padding:"left"==n&&d3plus.rtl||"right"==n&&!d3plus.rtl?t.width.value-t.style.padding:void 0}).attr("y",0)}function n(e){e.attr("font-size",function(t){return t.style.font.size}).attr("fill",function(e){return e.link?t.style.link.font.color:e.style.font.color}).attr("font-family",function(e){return e.link?t.style.link.font.family:e.style.font.family}).attr("font-weight",function(e){return e.link?t.style.link.font.weight:e.style.font.weight}).style("text-decoration",function(e){return e.link?t.style.link.font.decoration:e.style.font.decoration}).style("text-transform",function(e){return e.link?t.style.link.font.transform:e.style.font.transform})}if(t.data.app&&t.title.total.value&&!t.small){t.dev.value&&(d3plus.console.group("Calculating Total Value"),d3plus.console.time(t.size.key));var r=t.size.key?t.size.key:"number"==t.color.type?t.color.key:null;if(t.focus.value){var a=t.data.app.filter(function(e){return e[t.id.key]==t.focus.value});a=d3.sum(a,function(e){return d3plus.variable.value(t,e,r)})}else if(r)var a=d3.sum(t.data.pool,function(e){return d3plus.variable.value(t,e,r)});if(0===a&&(a=!1),"number"==typeof a){var i="";if(t.mute.length||t.solo.length||t.focus.value){var o=d3.sum(t.data.filtered.all,function(e){if(t.time.solo.value.length>0)var n=t.time.solo.value.indexOf(d3plus.variable.value(t,e,t.time.key))>=0;else if(t.time.mute.value.length>0)var n=t.time.solo.value.indexOf(d3plus.variable.value(t,e,t.time.key))<0;else var n=!0;return n?d3plus.variable.value(t,e,r):void 0});if(o>a)var i=a/o*100,l=t.format(o,t.size.key),i=" ("+t.format(i,"share")+"% of "+l+")"}a=t.format(a,t.size.key);var s=t.title.total.value,u=s.prefix||t.format("Total")+": ";a=u+a,s.suffix?a+=s.suffix:null,a+=i}t.dev.value&&(d3plus.console.timeEnd(t.size.key),d3plus.console.groupEnd())}else var a=null;var c=[];t.footer.value&&c.push({link:t.footer.link,style:t.style.footer,type:"footer",value:t.footer.value}),t.small||(t.title.value&&c.push({link:t.title.link,style:t.style.title,type:"title",value:t.title.value}),t.title.sub.value&&c.push({link:t.title.sub.link,style:t.style.title.sub,type:"sub",value:t.title.sub.value}),t.title.total.value&&a&&c.push({link:t.title.total.link,style:t.style.title.total,type:"total",value:a})),t.dev.value&&d3plus.console.log("Drawing Titles");var d=t.svg.selectAll("g.d3plus_title").data(c,function(t){return t.type}),p=t.style.title.width||t.width.value;d.enter().append("g").attr("class","d3plus_title").attr("opacity",0).attr("transform",function(e){var n="top"==e.style.position?0:t.height.value;return"translate(0,"+n+")"}).append("text").call(e).call(n),d.each(function(e){d3plus.util.wordwrap({text:e.value,parent:d3.select(this).select("text").node(),width:p,height:t.height.value/8,resize:!1}),e.y=t.margin[e.style.position],t.margin[e.style.position]+=this.getBBox().height+2*e.style.padding}).on(d3plus.evt.over,function(e){e.link&&d3.select(this).transition().duration(t.style.timing.mouseevents).style("cursor","pointer").select("text").attr("fill",t.style.link.hover.font.color).attr("font-family",t.style.link.hover.font.family).attr("font-weight",t.style.link.hover.font.weight).style("text-decoration",t.style.link.hover.font.decoration).style("text-transform",t.style.link.hover.font.transform)}).on(d3plus.evt.out,function(e){e.link&&d3.select(this).transition().duration(t.style.timing.mouseevents).style("cursor","auto").select("text").call(n)}).on(d3plus.evt.click,function(t){if(t.link){var e="/"!=t.link.charAt(0)?"_blank":"_self";window.open(t.link,e)}}).transition().duration(t.timing).attr("opacity",1).attr("transform",function(e){var n=e.style.position,r="top"==n?0+e.y:t.height.value-e.y;return"bottom"==n?r-=this.getBBox().height+e.style.padding:r+=e.style.padding,"translate(0,"+r+")"}).select("text").call(e).call(n),d.exit().transition().duration(t.timing).attr("opacity",0).remove();var f=t.style.title.height;f&&t.margin[t.style.title.position]<f&&(t.margin[t.style.title.position]=f)},d3plus.util.buckets=function(t,e){for(var n=[],r=1/(e-1)*(t[1]-t[0]),a=r,a=t[0];a<=t[1];a+=r)n.push(a);return n.length<e&&(n[e-1]=t[1]),n[n.length-1]<t[1]&&(n[n.length-1]=t[1]),n},d3plus.util.child=function(t,e){if(!t||!e)return!1;d3plus.util.d3selection(t)&&(t=t.node()),d3plus.util.d3selection(t)&&(e=e.node());for(var n=e.parentNode;null!=n;){if(n==t)return!0;n=n.parentNode}return!1},d3plus.util.closest=function(t,e){var n=t[0];return t.forEach(function(t){Math.abs(e-t)<Math.abs(e-n)&&(n=t)}),n},d3plus.util.copy=function(t){return d3plus.util.merge(t)},d3plus.util.d3selection=function(t){return d3plus.ie?"object"==typeof t&&t instanceof Array:t instanceof d3.selection},d3plus.util.dataurl=function(t,e){var n=new Image;n.src=t,n.crossOrigin="Anonymous",n.onload=function(){var t=document.createElement("canvas");t.width=this.width,t.height=this.height;var n=t.getContext("2d");n.drawImage(this,0,0),e.call(this,t.toDataURL("image/png")),t=null}},d3plus.util.distances=function(t,e){var n=[],r=[];return t.forEach(function(a){var i=e?e(a):[a.x,a.y];r.push(a),t.forEach(function(t){if(r.indexOf(t)<0){var a=e?e(t):[t.x,t.y],o=Math.abs(i[0]-a[0]),l=Math.abs(i[1]-a[1]);n.push(Math.sqrt(o*o+l*l))}})}),n.sort(function(t,e){return t-e}),n},d3plus.util.merge=function(t,e){function n(t,e){for(var r in t)"undefined"!=typeof t[r]&&("object"!=typeof t[r]||t[r]instanceof Array||null===t[r]?e[r]=t[r]instanceof Array?t[r].slice(0):t[r]:("object"!=typeof e[r]&&(e[r]={}),n(t[r],e[r])))}var r={};return t&&n(t,r),e&&n(e,r),r},d3plus.util.offset=function(t,e,n){var r={x:0,y:0};if(0>t&&(t=2*Math.PI+t),"square"==n){var a=45*(Math.PI/180);if(t<=Math.PI)if(t<Math.PI/2)if(a>t){r.x+=e;var i=Math.tan(t)*e;r.y+=i}else{r.y+=e;var o=e/Math.tan(t);r.x+=o}else if(t<Math.PI-a){r.y+=e;var o=e/Math.tan(Math.PI-t);r.x-=o}else{r.x-=e;var i=Math.tan(Math.PI-t)*e;r.y+=i}else if(t<3*Math.PI/2)if(t<a+Math.PI){r.x-=e;var i=Math.tan(t-Math.PI)*e;r.y-=i}else{r.y-=e;var o=e/Math.tan(t-Math.PI);r.x-=o}else if(t<2*Math.PI-a){r.y-=e;var o=e/Math.tan(2*Math.PI-t);r.x+=o}else{r.x+=e;var i=Math.tan(2*Math.PI-t)*e;r.y-=i}}else r.x+=e*Math.cos(t),r.y+=e*Math.sin(t);return r},d3plus.util.strip=function(t){var e=["!","@","#","$","%","^","&","*","(",")","[","]","{","}",".",",","/","\\","|","'",'"',";",":","<",">","?","=","+"];return t.replace(/[^A-Za-z0-9\-_]/g,function(t){if(" "==t)return"_";if(e.indexOf(t)>=0)return"";var n=[[/[\300-\306]/g,"A"],[/[\340-\346]/g,"a"],[/[\310-\313]/g,"E"],[/[\350-\353]/g,"e"],[/[\314-\317]/g,"I"],[/[\354-\357]/g,"i"],[/[\322-\330]/g,"O"],[/[\362-\370]/g,"o"],[/[\331-\334]/g,"U"],[/[\371-\374]/g,"u"],[/[\321]/g,"N"],[/[\361]/g,"n"],[/[\307]/g,"C"],[/[\347]/g,"c"]],r="";for(d in n)if(n[d][0].test(t)){r=n[d][1];break}return r})},d3plus.util.uniques=function(t,e){if(void 0===t)return[];var n=null;return d3.nest().key(function(t){return"string"==typeof e?(n||"undefined"==typeof t[e]||(n=typeof t[e]),t[e]):"function"==typeof e?(n||"undefined"==typeof e(t)||(n=typeof e(t)),e(t)):t}).entries(t).reduce(function(t,e){if(n){var r=e.key;return"number"==n&&(r=parseFloat(r)),t.concat(r)}return t},[]).sort(function(t,e){return t-e})},d3plus.util.wordwrap=function(t){function e(){function t(){d3.select(r).selectAll("tspan").remove();for(var t=r.getAttribute("x"),e=d3.select(r).append("tspan").attr("x",t).text(h[0]),n=1;n<h.length;n++){var i=e.text(),o=i.slice(-1),l=p.charAt(p.indexOf(i)+i.length);joiner=" "==l?" ":"",e.text(i+joiner+h[n]),e.node().getComputedTextLength()>a&&(e.text(i),e=d3.select(r).append("tspan").attr("x",t).text(h[n]))}}function f(){function t(){if(h.length){var e=h[h.length-1],n=e.charAt(e.length-1);1==e.length&&c.indexOf(e)>=0?(h.pop(),t()):(c.indexOf(n)>=0&&(e=e.substr(0,e.length-1)),d3.select(tspan).text(h.join(" ")+"..."),tspan.getComputedTextLength()>a&&(h.pop(),t()))}else d3.select(tspan).remove()}for(var e=!1;r.childNodes.length*r.getBBox().height>i&&r.lastChild&&!e;)r.removeChild(r.lastChild),r.childNodes.length*r.getBBox().height<i&&r.lastChild&&(e=!0);e&&(tspan=r.lastChild,h=d3.select(tspan).text().match(/[^\s-]+-?/g),t())}var h=p.match(d);if(o){var g=l;g=Math.floor(g),d3.select(r).attr("font-size",g),d3.select(r).selectAll("tspan").remove();for(var v=0;v<h.length;v++){if(1==h.length)var y=h[v];else var y=h[v]+"...";d3.select(r).append("tspan").attr("x",0).text(y)}if(r.getBBox().width>a&&(g*=a/r.getBBox().width),s>g){if(d3.select(r).selectAll("tspan").remove(),"string"==typeof u||0==u.length)return;return p=String(u.shift()),void e()}if(g=Math.floor(g),d3.select(r).attr("font-size",g),t(),r.childNodes.length*r.getBBox().height>i){var m=g*(i/(r.childNodes.length*r.getBBox().height));g=s>m?s:m,g=Math.floor(g),d3.select(r).attr("font-size",g)}else n()}t(),f(),n()}function n(){d3.select(r).selectAll("tspan").attr("dy",d3.select(r).style("font-size"))}var r=t.parent,a=t.width?t.width:2e4,i=t.height?t.height:2e4,o=t.resize,l=t.font_max?t.font_max:40,s=t.font_min?t.font_min:9,u=t.text,c=["-","/",";",":","&"],d=new RegExp("[^\\s\\"+c.join("\\")+"]+\\"+c.join("?\\")+"?","g"),p="";d3.select(r).attr("font-size")||d3.select(r).attr("font-size",s),u instanceof Array?(u=u.filter(function(t){return["string","number"].indexOf(typeof t)>=0}),p=String(u.shift())):p=String(u),e()},d3plus.variable.color=function(t,e,n){function r(e){return"object"==typeof e&&(e=e[t.id.key]),d3plus.color.random(e)}function a(t){return"string"==typeof t&&0==t.indexOf("#")&&[4,7].indexOf(t.length)>=0?!0:!1}if(t.color.key){var i=d3plus.variable.value(t,e,t.color.key,n);if(i){if(t.color.scale)return t.color.scale(i);var o=a(i);return o?i:r(i)}return"function"==typeof t.color.scale?t.style.color.missing:r(e)}return r(e)},d3plus.variable.text=function(t,e,n){if("number"!=typeof n)var n=t.depth.value;if(t.text.array&&"object"==typeof t.text.array)if(t.text.array[t.id.nesting[n]])var r=t.text.array[t.id.nesting[n]];else var r=t.text.array[Object.keys(t.text.array)[0]];else{var r=[];t.text.key&&r.push(t.text.key),r.push(t.id.nesting[n])}"string"==typeof r&&(r=[r]);var a=[];return r.forEach(function(r){var i=d3plus.variable.value(t,e,r,t.id.nesting[n]);i&&a.push(t.format(i))}),a},d3plus.variable.value=function(t,e,n,r,a){function i(t){return t.filter(function(t){return t[r]==e})[0]}function o(t){t.children?t.children.forEach(function(t){o(t)}):t[n]&&l.push(t[n])
}if(!r)if(n&&"object"==typeof n){if(n[t.id.key])var r=t.id.key;else var r=Object.keys(n)[0];n=n[r]}else var r=t.id.key;if(n&&"function"==typeof n)return n(e);if(n==r)return"object"==typeof e?e[n]:e;var l=[];if("object"==typeof e&&"undefined"!=typeof e[n])return e[n];if("object"==typeof e&&e.children){if(!a){var a="sum";"string"==typeof t.aggs.value?a=t.aggs.value:t.aggs.value[n]&&(a=t.aggs.value[n])}if(o(e),l.length){if("string"==typeof a)return d3[a](l);if("function"==typeof a)return a(l)}var s=e;e=s[r]}else{if("object"==typeof e){var s=e;e=e[r]}if(t.data.app instanceof Array)var s=i(t.data.app);if(s&&"undefined"!=typeof s[n])return s[n]}if(t.attrs.value instanceof Array)var u=i(t.attrs.value);else if(t.attrs.value[r])if(t.attrs.value[r]instanceof Array)var u=i(t.attrs.value[r]);else var u=t.attrs.value[r][e];else var u=t.attrs.value[e];return u&&"undefined"!=typeof u[n]?u[n]:null},d3plus.zoom.bounds=function(t,e,n){if(!e)var e=t.zoom.bounds;if("number"!=typeof n)var n=t.style.timing.transitions;t.zoom.size={height:e[1][1]-e[0][1],width:e[1][0]-e[0][0]};var r=t.coords.fit.value;if("auto"==r||d3plus.apps[t.type.value].requirements.indexOf("coords")<0)var a=d3.max([t.zoom.size.width/t.app_width,t.zoom.size.height/t.app_height]);else var a=t.zoom.size[r]/t["app_"+r];var i=d3.min([t.app_width,t.app_height]),o=(i-2*t.coords.padding)/i/a,l=t.zoom_behavior.scaleExtent();(l[0]==l[1]||e==t.zoom.bounds)&&t.zoom_behavior.scaleExtent([o,16*o]);var s=t.zoom_behavior.scaleExtent()[1];o>s&&(o=s),t.zoom.scale=o;var u=[];u[0]=t.app_width/2-t.zoom.size.width*o/2-e[0][0]*o,u[1]=t.app_height/2-t.zoom.size.height*o/2-e[0][1]*o,t.zoom.translate=u,t.zoom_behavior.translate(u).scale(o),t.zoom.size={height:t.zoom.bounds[1][1]-t.zoom.bounds[0][1],width:t.zoom.bounds[1][0]-t.zoom.bounds[0][0]},d3plus.zoom.transform(t,n)},d3plus.zoom.controls=function(){if(d3.select("#d3plus.utilsts.zoom_controls").remove(),!vars.small){var t=vars.parent.append("div").attr("id","d3plus.utilsts.zoom_controls").style("top",vars.margin.top+5+"px");t.append("div").attr("id","zoom_in").attr("unselectable","on").on(d3plus.evt.click,function(){vars.zoom("in")}).text("+"),t.append("div").attr("id","zoom_out").attr("unselectable","on").on(d3plus.evt.click,function(){vars.zoom("out")}).text("-"),t.append("div").attr("id","zoom_reset").attr("unselectable","on").on(d3plus.evt.click,function(){vars.zoom("reset"),vars.update()}).html("&#8634;")}},d3plus.zoom.labels=function(t){var e=t.zoom_behavior.scaleExtent()[1];t.dev.value&&d3plus.console.time("determining label visibility"),t.timing?t.g.viz.selectAll("text.d3plus_label").transition().duration(t.timing).attr("opacity",function(n){if(!n)var n={scale:e};var r=parseFloat(d3.select(this).attr("font-size"),10);return n.visible=r/n.scale*t.zoom.scale>=7,n.visible?1:0}):t.g.viz.selectAll("text.d3plus_label").attr("opacity",function(n){if(!n)var n={scale:e};var r=parseFloat(d3.select(this).attr("font-size"),10);return n.visible=r/n.scale*t.zoom.scale>=7,n.visible?1:0}),t.dev.value&&d3plus.console.timeEnd("determining label visibility")},d3plus.zoom.mouse=function(t){var e=d3.event.translate,n=d3.event.scale,r=t.zoom.bounds,a=(t.app_width-t.zoom.size.width*n)/2,i=a>0?a:0,o=a>0?t.app_width-a:t.app_width,l=(t.app_height-t.zoom.size.height*n)/2,s=l>0?l:0,u=l>0?t.app_height-l:t.app_height;if(e[0]+r[0][0]*n>i?e[0]=-r[0][0]*n+i:e[0]+r[1][0]*n<o&&(e[0]=o-r[1][0]*n),e[1]+r[0][1]*n>s?e[1]=-r[0][1]*n+s:e[1]+r[1][1]*n<u&&(e[1]=u-r[1][1]*n),t.zoom_behavior.translate(e).scale(n),t.zoom.translate=e,t.zoom.scale=n,"wheel"==d3.event.sourceEvent.type){var c=t.timing?100:500;clearTimeout(t.zoom.wheel),t.zoom.wheel=setTimeout(function(){d3plus.zoom.labels(t)},c)}else d3plus.zoom.labels(t);"dblclick"==d3.event.sourceEvent.type?d3plus.zoom.transform(t,t.style.timing.transitions):d3plus.zoom.transform(t,0)},d3plus.zoom.transform=function(t,e){if("number"!=typeof e)var e=t.timing;var n=t.zoom.translate,r=t.zoom.scale;e?t.g.viz.transition().duration(e).attr("transform","translate("+n+")scale("+r+")"):t.g.viz.attr("transform","translate("+n+")scale("+r+")")},function(t){var e={init:function(e){var n={set_width:!1,set_height:!1,horizontalScroll:!1,scrollInertia:950,mouseWheel:!0,mouseWheelPixels:"auto",autoDraggerLength:!0,autoHideScrollbar:!1,alwaysShowScrollbar:!1,snapAmount:null,snapOffset:0,scrollButtons:{enable:!1,scrollType:"continuous",scrollSpeed:"auto",scrollAmount:40},advanced:{updateOnBrowserResize:!0,updateOnContentResize:!1,autoExpandHorizontalScroll:!1,autoScrollOnFocus:!0,normalizeMouseWheelDelta:!1},contentTouchScroll:!0,callbacks:{onScrollStart:function(){},onScroll:function(){},onTotalScroll:function(){},onTotalScrollBack:function(){},onTotalScrollOffset:0,onTotalScrollBackOffset:0,whileScrolling:function(){}},theme:"light"},e=t.extend(!0,n,e);return this.each(function(){var n=t(this);if(e.set_width&&n.css("width",e.set_width),e.set_height&&n.css("height",e.set_height),t(document).data("mCustomScrollbar-index")){var r=parseInt(t(document).data("mCustomScrollbar-index"));t(document).data("mCustomScrollbar-index",r+1)}else t(document).data("mCustomScrollbar-index","1");n.wrapInner("<div class='mCustomScrollBox mCS-"+e.theme+"' id='mCSB_"+t(document).data("mCustomScrollbar-index")+"' style='position:relative; height:100%; overflow:hidden; max-width:100%;' />").addClass("mCustomScrollbar _mCS_"+t(document).data("mCustomScrollbar-index"));var a=n.children(".mCustomScrollBox");if(e.horizontalScroll){a.addClass("mCSB_horizontal").wrapInner("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />");var i=a.children(".mCSB_h_wrapper");i.wrapInner("<div class='mCSB_container' style='position:absolute; left:0;' />").children(".mCSB_container").css({width:i.children().outerWidth(),position:"relative"}).unwrap()}else a.wrapInner("<div class='mCSB_container' style='position:relative; top:0;' />");var o=a.children(".mCSB_container");t.support.touch&&o.addClass("mCS_touch"),o.after("<div class='mCSB_scrollTools' style='position:absolute;'><div class='mCSB_draggerContainer'><div class='mCSB_dragger' style='position:absolute;' oncontextmenu='return false;'><div class='mCSB_dragger_bar' style='position:relative;'></div></div><div class='mCSB_draggerRail'></div></div></div>");var l=a.children(".mCSB_scrollTools"),s=l.children(".mCSB_draggerContainer"),u=s.children(".mCSB_dragger");if(e.horizontalScroll?u.data("minDraggerWidth",u.width()):u.data("minDraggerHeight",u.height()),e.scrollButtons.enable&&(e.horizontalScroll?l.prepend("<a class='mCSB_buttonLeft' oncontextmenu='return false;'></a>").append("<a class='mCSB_buttonRight' oncontextmenu='return false;'></a>"):l.prepend("<a class='mCSB_buttonUp' oncontextmenu='return false;'></a>").append("<a class='mCSB_buttonDown' oncontextmenu='return false;'></a>")),a.bind("scroll",function(){n.is(".mCS_disabled")||a.scrollTop(0).scrollLeft(0)}),n.data({mCS_Init:!0,mCustomScrollbarIndex:t(document).data("mCustomScrollbar-index"),horizontalScroll:e.horizontalScroll,scrollInertia:e.scrollInertia,scrollEasing:"mcsEaseOut",mouseWheel:e.mouseWheel,mouseWheelPixels:e.mouseWheelPixels,autoDraggerLength:e.autoDraggerLength,autoHideScrollbar:e.autoHideScrollbar,alwaysShowScrollbar:e.alwaysShowScrollbar,snapAmount:e.snapAmount,snapOffset:e.snapOffset,scrollButtons_enable:e.scrollButtons.enable,scrollButtons_scrollType:e.scrollButtons.scrollType,scrollButtons_scrollSpeed:e.scrollButtons.scrollSpeed,scrollButtons_scrollAmount:e.scrollButtons.scrollAmount,autoExpandHorizontalScroll:e.advanced.autoExpandHorizontalScroll,autoScrollOnFocus:e.advanced.autoScrollOnFocus,normalizeMouseWheelDelta:e.advanced.normalizeMouseWheelDelta,contentTouchScroll:e.contentTouchScroll,onScrollStart_Callback:e.callbacks.onScrollStart,onScroll_Callback:e.callbacks.onScroll,onTotalScroll_Callback:e.callbacks.onTotalScroll,onTotalScrollBack_Callback:e.callbacks.onTotalScrollBack,onTotalScroll_Offset:e.callbacks.onTotalScrollOffset,onTotalScrollBack_Offset:e.callbacks.onTotalScrollBackOffset,whileScrolling_Callback:e.callbacks.whileScrolling,bindEvent_scrollbar_drag:!1,bindEvent_content_touch:!1,bindEvent_scrollbar_click:!1,bindEvent_mousewheel:!1,bindEvent_buttonsContinuous_y:!1,bindEvent_buttonsContinuous_x:!1,bindEvent_buttonsPixels_y:!1,bindEvent_buttonsPixels_x:!1,bindEvent_focusin:!1,bindEvent_autoHideScrollbar:!1,mCSB_buttonScrollRight:!1,mCSB_buttonScrollLeft:!1,mCSB_buttonScrollDown:!1,mCSB_buttonScrollUp:!1}),e.horizontalScroll)"none"!==n.css("max-width")&&(e.advanced.updateOnContentResize||(e.advanced.updateOnContentResize=!0));else if("none"!==n.css("max-height")){var c=!1,d=parseInt(n.css("max-height"));n.css("max-height").indexOf("%")>=0&&(c=d,d=n.parent().height()*c/100),n.css("overflow","hidden"),a.css("max-height",d)}if(n.mCustomScrollbar("update"),e.advanced.updateOnBrowserResize){var p,f=t(window).width(),h=t(window).height();t(window).bind("resize."+n.data("mCustomScrollbarIndex"),function(){p&&clearTimeout(p),p=setTimeout(function(){if(!n.is(".mCS_disabled")&&!n.is(".mCS_destroyed")){var e=t(window).width(),r=t(window).height();(f!==e||h!==r)&&("none"!==n.css("max-height")&&c&&a.css("max-height",n.parent().height()*c/100),n.mCustomScrollbar("update"),f=e,h=r)}},150)})}if(e.advanced.updateOnContentResize){var g;if(e.horizontalScroll)var v=o.outerWidth();else var v=o.outerHeight();g=setInterval(function(){if(e.horizontalScroll){e.advanced.autoExpandHorizontalScroll&&o.css({position:"absolute",width:"auto"}).wrap("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />").css({width:o.outerWidth(),position:"relative"}).unwrap();var t=o.outerWidth()}else var t=o.outerHeight();t!=v&&(n.mCustomScrollbar("update"),v=t)},300)}})},update:function(){var e=t(this),n=e.children(".mCustomScrollBox"),r=n.children(".mCSB_container");r.removeClass("mCS_no_scrollbar"),e.removeClass("mCS_disabled mCS_destroyed"),n.scrollTop(0).scrollLeft(0);var a=n.children(".mCSB_scrollTools"),i=a.children(".mCSB_draggerContainer"),o=i.children(".mCSB_dragger");if(e.data("horizontalScroll")){var l=a.children(".mCSB_buttonLeft"),s=a.children(".mCSB_buttonRight"),u=n.width();e.data("autoExpandHorizontalScroll")&&r.css({position:"absolute",width:"auto"}).wrap("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />").css({width:r.outerWidth(),position:"relative"}).unwrap();var c=r.outerWidth()}else var d=a.children(".mCSB_buttonUp"),p=a.children(".mCSB_buttonDown"),f=n.height(),h=r.outerHeight();if(h>f&&!e.data("horizontalScroll")){a.css("display","block");var g=i.height();if(e.data("autoDraggerLength")){var v=Math.round(f/h*g),y=o.data("minDraggerHeight");if(y>=v)o.css({height:y});else if(v>=g-10){var m=g-10;o.css({height:m})}else o.css({height:v});o.children(".mCSB_dragger_bar").css({"line-height":o.height()+"px"})}var b=o.height(),x=(h-f)/(g-b);e.data("scrollAmount",x).mCustomScrollbar("scrolling",n,r,i,o,d,p,l,s);var _=Math.abs(r.position().top);e.mCustomScrollbar("scrollTo",_,{scrollInertia:0,trigger:"internal"})}else if(c>u&&e.data("horizontalScroll")){a.css("display","block");var w=i.width();if(e.data("autoDraggerLength")){var k=Math.round(u/c*w),z=o.data("minDraggerWidth");if(z>=k)o.css({width:z});else if(k>=w-10){var S=w-10;o.css({width:S})}else o.css({width:k})}var M=o.width(),x=(c-u)/(w-M);e.data("scrollAmount",x).mCustomScrollbar("scrolling",n,r,i,o,d,p,l,s);var _=Math.abs(r.position().left);e.mCustomScrollbar("scrollTo",_,{scrollInertia:0,trigger:"internal"})}else n.unbind("mousewheel focusin"),e.data("horizontalScroll")?o.add(r).css("left",0):o.add(r).css("top",0),e.data("alwaysShowScrollbar")?e.data("horizontalScroll")?e.data("horizontalScroll")&&o.css({width:i.width()}):o.css({height:i.height()}):(a.css("display","none"),r.addClass("mCS_no_scrollbar")),e.data({bindEvent_mousewheel:!1,bindEvent_focusin:!1})},scrolling:function(e,r,a,i,o,l,s,u){function c(t,e,n,r){f.data("horizontalScroll")?f.mCustomScrollbar("scrollTo",i.position().left-e+r,{moveDragger:!0,trigger:"internal"}):f.mCustomScrollbar("scrollTo",i.position().top-t+n,{moveDragger:!0,trigger:"internal"})}function d(t){i.data("preventAction")||(i.data("preventAction",!0),f.mCustomScrollbar("scrollTo",t,{trigger:"internal"}))}function p(){var t=f.data("scrollButtons_scrollSpeed");return"auto"===f.data("scrollButtons_scrollSpeed")&&(t=Math.round((f.data("scrollInertia")+100)/40)),t}var f=t(this);if(!f.data("bindEvent_scrollbar_drag")){var h,g,v,y,m;t.support.pointer?(v="pointerdown",y="pointermove",m="pointerup"):t.support.msPointer&&(v="MSPointerDown",y="MSPointerMove",m="MSPointerUp"),t.support.pointer||t.support.msPointer?(i.bind(v,function(e){e.preventDefault(),f.data({on_drag:!0}),i.addClass("mCSB_dragger_onDrag");var n=t(this),r=n.offset(),a=e.originalEvent.pageX-r.left,o=e.originalEvent.pageY-r.top;a<n.width()&&a>0&&o<n.height()&&o>0&&(h=o,g=a)}),t(document).bind(y+"."+f.data("mCustomScrollbarIndex"),function(t){if(t.preventDefault(),f.data("on_drag")){var e=i,n=e.offset(),r=t.originalEvent.pageX-n.left,a=t.originalEvent.pageY-n.top;c(h,g,a,r)}}).bind(m+"."+f.data("mCustomScrollbarIndex"),function(t){f.data({on_drag:!1}),i.removeClass("mCSB_dragger_onDrag")})):(i.bind("mousedown touchstart",function(e){e.preventDefault(),e.stopImmediatePropagation();var n=t(this),r=n.offset(),a,o;if("touchstart"===e.type){var l=e.originalEvent.touches[0]||e.originalEvent.changedTouches[0];a=l.pageX-r.left,o=l.pageY-r.top}else f.data({on_drag:!0}),i.addClass("mCSB_dragger_onDrag"),a=e.pageX-r.left,o=e.pageY-r.top;a<n.width()&&a>0&&o<n.height()&&o>0&&(h=o,g=a)}).bind("touchmove",function(e){e.preventDefault(),e.stopImmediatePropagation();var n=e.originalEvent.touches[0]||e.originalEvent.changedTouches[0],r=t(this),a=r.offset(),i=n.pageX-a.left,o=n.pageY-a.top;c(h,g,o,i)}),t(document).bind("mousemove."+f.data("mCustomScrollbarIndex"),function(t){if(f.data("on_drag")){var e=i,n=e.offset(),r=t.pageX-n.left,a=t.pageY-n.top;c(h,g,a,r)}}).bind("mouseup."+f.data("mCustomScrollbarIndex"),function(t){f.data({on_drag:!1}),i.removeClass("mCSB_dragger_onDrag")})),f.data({bindEvent_scrollbar_drag:!0})}if(t.support.touch&&f.data("contentTouchScroll")&&!f.data("bindEvent_content_touch")){var b,x,_,w,k,z,S;r.bind("touchstart",function(e){e.stopImmediatePropagation(),b=e.originalEvent.touches[0]||e.originalEvent.changedTouches[0],x=t(this),_=x.offset(),k=b.pageX-_.left,w=b.pageY-_.top,z=w,S=k}),r.bind("touchmove",function(e){e.preventDefault(),e.stopImmediatePropagation(),b=e.originalEvent.touches[0]||e.originalEvent.changedTouches[0],x=t(this).parent(),_=x.offset(),k=b.pageX-_.left,w=b.pageY-_.top,f.data("horizontalScroll")?f.mCustomScrollbar("scrollTo",S-k,{trigger:"internal"}):f.mCustomScrollbar("scrollTo",z-w,{trigger:"internal"})})}if(f.data("bindEvent_scrollbar_click")||(a.bind("click",function(e){var n=(e.pageY-a.offset().top)*f.data("scrollAmount"),r=t(e.target);f.data("horizontalScroll")&&(n=(e.pageX-a.offset().left)*f.data("scrollAmount")),(r.hasClass("mCSB_draggerContainer")||r.hasClass("mCSB_draggerRail"))&&f.mCustomScrollbar("scrollTo",n,{trigger:"internal",scrollEasing:"draggerRailEase"})}),f.data({bindEvent_scrollbar_click:!0})),f.data("mouseWheel")&&(f.data("bindEvent_mousewheel")||(e.bind("mousewheel",function(t,e){var n,o=f.data("mouseWheelPixels"),l=Math.abs(r.position().top),s=i.position().top,u=a.height()-i.height();f.data("normalizeMouseWheelDelta")&&(e=0>e?-1:1),"auto"===o&&(o=100+Math.round(f.data("scrollAmount")/2)),f.data("horizontalScroll")&&(s=i.position().left,u=a.width()-i.width(),l=Math.abs(r.position().left)),(e>0&&0!==s||0>e&&s!==u)&&(t.preventDefault(),t.stopImmediatePropagation()),n=l-e*o,f.mCustomScrollbar("scrollTo",n,{trigger:"internal"})}),f.data({bindEvent_mousewheel:!0}))),f.data("scrollButtons_enable"))if("pixels"===f.data("scrollButtons_scrollType"))f.data("horizontalScroll")?(u.add(s).unbind("mousedown touchstart MSPointerDown pointerdown mouseup MSPointerUp pointerup mouseout MSPointerOut pointerout touchend",M,E),f.data({bindEvent_buttonsContinuous_x:!1}),f.data("bindEvent_buttonsPixels_x")||(u.bind("click",function(t){t.preventDefault(),d(Math.abs(r.position().left)+f.data("scrollButtons_scrollAmount"))}),s.bind("click",function(t){t.preventDefault(),d(Math.abs(r.position().left)-f.data("scrollButtons_scrollAmount"))}),f.data({bindEvent_buttonsPixels_x:!0}))):(l.add(o).unbind("mousedown touchstart MSPointerDown pointerdown mouseup MSPointerUp pointerup mouseout MSPointerOut pointerout touchend",M,E),f.data({bindEvent_buttonsContinuous_y:!1}),f.data("bindEvent_buttonsPixels_y")||(l.bind("click",function(t){t.preventDefault(),d(Math.abs(r.position().top)+f.data("scrollButtons_scrollAmount"))}),o.bind("click",function(t){t.preventDefault(),d(Math.abs(r.position().top)-f.data("scrollButtons_scrollAmount"))}),f.data({bindEvent_buttonsPixels_y:!0})));else if(f.data("horizontalScroll")){if(u.add(s).unbind("click"),f.data({bindEvent_buttonsPixels_x:!1}),!f.data("bindEvent_buttonsContinuous_x")){u.bind("mousedown touchstart MSPointerDown pointerdown",function(t){t.preventDefault();var e=p();f.data({mCSB_buttonScrollRight:setInterval(function(){f.mCustomScrollbar("scrollTo",Math.abs(r.position().left)+e,{trigger:"internal",scrollEasing:"easeOutCirc"})},17)})});var M=function(t){t.preventDefault(),clearInterval(f.data("mCSB_buttonScrollRight"))};u.bind("mouseup touchend MSPointerUp pointerup mouseout MSPointerOut pointerout",M),s.bind("mousedown touchstart MSPointerDown pointerdown",function(t){t.preventDefault();var e=p();f.data({mCSB_buttonScrollLeft:setInterval(function(){f.mCustomScrollbar("scrollTo",Math.abs(r.position().left)-e,{trigger:"internal",scrollEasing:"easeOutCirc"})},17)})});var E=function(t){t.preventDefault(),clearInterval(f.data("mCSB_buttonScrollLeft"))};s.bind("mouseup touchend MSPointerUp pointerup mouseout MSPointerOut pointerout",E),f.data({bindEvent_buttonsContinuous_x:!0})}}else if(l.add(o).unbind("click"),f.data({bindEvent_buttonsPixels_y:!1}),!f.data("bindEvent_buttonsContinuous_y")){l.bind("mousedown touchstart MSPointerDown pointerdown",function(t){t.preventDefault();var e=p();f.data({mCSB_buttonScrollDown:setInterval(function(){f.mCustomScrollbar("scrollTo",Math.abs(r.position().top)+e,{trigger:"internal",scrollEasing:"easeOutCirc"})},17)})});var C=function(t){t.preventDefault(),clearInterval(f.data("mCSB_buttonScrollDown"))};l.bind("mouseup touchend MSPointerUp pointerup mouseout MSPointerOut pointerout",C),o.bind("mousedown touchstart MSPointerDown pointerdown",function(t){t.preventDefault();var e=p();f.data({mCSB_buttonScrollUp:setInterval(function(){f.mCustomScrollbar("scrollTo",Math.abs(r.position().top)-e,{trigger:"internal",scrollEasing:"easeOutCirc"})},17)})});var A=function(t){t.preventDefault(),clearInterval(f.data("mCSB_buttonScrollUp"))};o.bind("mouseup touchend MSPointerUp pointerup mouseout MSPointerOut pointerout",A),f.data({bindEvent_buttonsContinuous_y:!0})}f.data("autoScrollOnFocus")&&(f.data("bindEvent_focusin")||(e.bind("focusin",function(){e.scrollTop(0).scrollLeft(0);var n=t(document.activeElement);if(n.is("input,textarea,select,button,a[tabindex],area,object")){var a=r.position().top,i=n.position().top,o=e.height()-n.outerHeight();f.data("horizontalScroll")&&(a=r.position().left,i=n.position().left,o=e.width()-n.outerWidth()),(0>a+i||a+i>o)&&f.mCustomScrollbar("scrollTo",i,{trigger:"internal"})}}),f.data({bindEvent_focusin:!0}))),f.data("autoHideScrollbar")&&!f.data("alwaysShowScrollbar")&&(f.data("bindEvent_autoHideScrollbar")||(e.bind("mouseenter",function(t){e.addClass("mCS-mouse-over"),n.showScrollbar.call(e.children(".mCSB_scrollTools"))}).bind("mouseleave touchend",function(t){e.removeClass("mCS-mouse-over"),"mouseleave"===t.type&&n.hideScrollbar.call(e.children(".mCSB_scrollTools"))}),f.data({bindEvent_autoHideScrollbar:!0})))},scrollTo:function(e,r){function a(t){if(i.data("mCustomScrollbarIndex"))switch(this.mcs={top:u.position().top,left:u.position().left,draggerTop:p.position().top,draggerLeft:p.position().left,topPct:Math.round(100*Math.abs(u.position().top)/Math.abs(u.outerHeight()-s.height())),leftPct:Math.round(100*Math.abs(u.position().left)/Math.abs(u.outerWidth()-s.width()))},t){case"onScrollStart":i.data("mCS_tweenRunning",!0).data("onScrollStart_Callback").call(i,this.mcs);break;case"whileScrolling":i.data("whileScrolling_Callback").call(i,this.mcs);break;case"onScroll":i.data("onScroll_Callback").call(i,this.mcs);break;case"onTotalScrollBack":i.data("onTotalScrollBack_Callback").call(i,this.mcs);break;case"onTotalScroll":i.data("onTotalScroll_Callback").call(i,this.mcs)}}var i=t(this),o={moveDragger:!1,trigger:"external",callbacks:!0,scrollInertia:i.data("scrollInertia"),scrollEasing:i.data("scrollEasing")},r=t.extend(o,r),l,s=i.children(".mCustomScrollBox"),u=s.children(".mCSB_container"),c=s.children(".mCSB_scrollTools"),d=c.children(".mCSB_draggerContainer"),p=d.children(".mCSB_dragger"),f=draggerSpeed=r.scrollInertia,h,g,v,y;if(!u.hasClass("mCS_no_scrollbar")&&(i.data({mCS_trigger:r.trigger}),i.data("mCS_Init")&&(r.callbacks=!1),e||0===e)){if("number"==typeof e)r.moveDragger?(l=e,e=i.data("horizontalScroll")?p.position().left*i.data("scrollAmount"):p.position().top*i.data("scrollAmount"),draggerSpeed=0):l=e/i.data("scrollAmount");else if("string"==typeof e){var m;m="top"===e?0:"bottom"!==e||i.data("horizontalScroll")?"left"===e?0:"right"===e&&i.data("horizontalScroll")?u.outerWidth()-s.width():"first"===e?i.find(".mCSB_container").find(":first"):"last"===e?i.find(".mCSB_container").find(":last"):i.find(e):u.outerHeight()-s.height(),1===m.length?(e=i.data("horizontalScroll")?m.position().left:m.position().top,l=e/i.data("scrollAmount")):l=e=m}if(i.data("horizontalScroll")){i.data("onTotalScrollBack_Offset")&&(g=-i.data("onTotalScrollBack_Offset")),i.data("onTotalScroll_Offset")&&(y=s.width()-u.outerWidth()+i.data("onTotalScroll_Offset")),0>l?(l=e=0,clearInterval(i.data("mCSB_buttonScrollLeft")),g||(h=!0)):l>=d.width()-p.width()?(l=d.width()-p.width(),e=s.width()-u.outerWidth(),clearInterval(i.data("mCSB_buttonScrollRight")),y||(v=!0)):e=-e;var b=i.data("snapAmount");b&&(e=Math.round(e/b)*b-i.data("snapOffset")),n.mTweenAxis.call(this,p[0],"left",Math.round(l),draggerSpeed,r.scrollEasing),n.mTweenAxis.call(this,u[0],"left",Math.round(e),f,r.scrollEasing,{onStart:function(){r.callbacks&&!i.data("mCS_tweenRunning")&&a("onScrollStart"),i.data("autoHideScrollbar")&&!i.data("alwaysShowScrollbar")&&n.showScrollbar.call(c)},onUpdate:function(){r.callbacks&&a("whileScrolling")},onComplete:function(){r.callbacks&&(a("onScroll"),(h||g&&u.position().left>=g)&&a("onTotalScrollBack"),(v||y&&u.position().left<=y)&&a("onTotalScroll")),p.data("preventAction",!1),i.data("mCS_tweenRunning",!1),i.data("autoHideScrollbar")&&!i.data("alwaysShowScrollbar")&&(s.hasClass("mCS-mouse-over")||n.hideScrollbar.call(c))}})}else{i.data("onTotalScrollBack_Offset")&&(g=-i.data("onTotalScrollBack_Offset")),i.data("onTotalScroll_Offset")&&(y=s.height()-u.outerHeight()+i.data("onTotalScroll_Offset")),0>l?(l=e=0,clearInterval(i.data("mCSB_buttonScrollUp")),g||(h=!0)):l>=d.height()-p.height()?(l=d.height()-p.height(),e=s.height()-u.outerHeight(),clearInterval(i.data("mCSB_buttonScrollDown")),y||(v=!0)):e=-e;var b=i.data("snapAmount");b&&(e=Math.round(e/b)*b-i.data("snapOffset")),n.mTweenAxis.call(this,p[0],"top",Math.round(l),draggerSpeed,r.scrollEasing),n.mTweenAxis.call(this,u[0],"top",Math.round(e),f,r.scrollEasing,{onStart:function(){r.callbacks&&!i.data("mCS_tweenRunning")&&a("onScrollStart"),i.data("autoHideScrollbar")&&!i.data("alwaysShowScrollbar")&&n.showScrollbar.call(c)},onUpdate:function(){r.callbacks&&a("whileScrolling")},onComplete:function(){r.callbacks&&(a("onScroll"),(h||g&&u.position().top>=g)&&a("onTotalScrollBack"),(v||y&&u.position().top<=y)&&a("onTotalScroll")),p.data("preventAction",!1),i.data("mCS_tweenRunning",!1),i.data("autoHideScrollbar")&&!i.data("alwaysShowScrollbar")&&(s.hasClass("mCS-mouse-over")||n.hideScrollbar.call(c))}})}i.data("mCS_Init")&&i.data({mCS_Init:!1})}},stop:function(){var e=t(this),r=e.children().children(".mCSB_container"),a=e.children().children().children().children(".mCSB_dragger");n.mTweenAxisStop.call(this,r[0]),n.mTweenAxisStop.call(this,a[0])},disable:function(e){var n=t(this),r=n.children(".mCustomScrollBox"),a=r.children(".mCSB_container"),i=r.children(".mCSB_scrollTools"),o=i.children().children(".mCSB_dragger");r.unbind("mousewheel focusin mouseenter mouseleave touchend"),a.unbind("touchstart touchmove"),e&&(n.data("horizontalScroll")?o.add(a).css("left",0):o.add(a).css("top",0)),i.css("display","none"),a.addClass("mCS_no_scrollbar"),n.data({bindEvent_mousewheel:!1,bindEvent_focusin:!1,bindEvent_content_touch:!1,bindEvent_autoHideScrollbar:!1}).addClass("mCS_disabled")},destroy:function(){var e=t(this);e.removeClass("mCustomScrollbar _mCS_"+e.data("mCustomScrollbarIndex")).addClass("mCS_destroyed").children().children(".mCSB_container").unwrap().children().unwrap().siblings(".mCSB_scrollTools").remove(),t(document).unbind("mousemove."+e.data("mCustomScrollbarIndex")+" mouseup."+e.data("mCustomScrollbarIndex")+" MSPointerMove."+e.data("mCustomScrollbarIndex")+" MSPointerUp."+e.data("mCustomScrollbarIndex")),t(window).unbind("resize."+e.data("mCustomScrollbarIndex"))}},n={showScrollbar:function(){this.stop().animate({opacity:1},"fast")},hideScrollbar:function(){this.stop().animate({opacity:0},"fast")},mTweenAxis:function(t,e,n,r,a,i){function o(){return window.performance&&window.performance.now?window.performance.now():window.performance&&window.performance.webkitNow?window.performance.webkitNow():Date.now?Date.now():(new Date).getTime()}function l(){y||p.call(),y=o()-g,s(),y>=t._time&&(t._time=y>t._time?y+v-(y-t._time):y+v-1,t._time<y+1&&(t._time=y+1)),t._time<r?t._id=_request(l):h.call()}function s(){r>0?(t.currVal=d(t._time,m,x,r,a),b[e]=Math.round(t.currVal)+"px"):b[e]=n+"px",f.call()}function u(){v=1e3/60,t._time=y+v,_request=window.requestAnimationFrame?window.requestAnimationFrame:function(t){return s(),setTimeout(t,.01)},t._id=_request(l)}function c(){null!=t._id&&(window.requestAnimationFrame?window.cancelAnimationFrame(t._id):clearTimeout(t._id),t._id=null)}function d(t,e,n,r,a){switch(a){case"linear":return n*t/r+e;break;case"easeOutQuad":return t/=r,-n*t*(t-2)+e;break;case"easeInOutQuad":return t/=r/2,1>t?n/2*t*t+e:(t--,-n/2*(t*(t-2)-1)+e);break;case"easeOutCubic":return t/=r,t--,n*(t*t*t+1)+e;break;case"easeOutQuart":return t/=r,t--,-n*(t*t*t*t-1)+e;break;case"easeOutQuint":return t/=r,t--,n*(t*t*t*t*t+1)+e;break;case"easeOutCirc":return t/=r,t--,n*Math.sqrt(1-t*t)+e;break;case"easeOutSine":return n*Math.sin(t/r*(Math.PI/2))+e;break;case"easeOutExpo":return n*(-Math.pow(2,-10*t/r)+1)+e;break;case"mcsEaseOut":var i=(t/=r)*t,o=i*t;return e+n*(.499999999999997*o*i+-2.5*i*i+5.5*o+-6.5*i+4*t);break;case"draggerRailEase":return t/=r/2,1>t?n/2*t*t*t+e:(t-=2,n/2*(t*t*t+2)+e)}}var i=i||{},p=i.onStart||function(){},f=i.onUpdate||function(){},h=i.onComplete||function(){},g=o(),v,y=0,m=t.offsetTop,b=t.style;"left"===e&&(m=t.offsetLeft);var x=n-m;c(),u()},mTweenAxisStop:function(t){null!=t._id&&(window.requestAnimationFrame?window.cancelAnimationFrame(t._id):clearTimeout(t._id),t._id=null)},rafPolyfill:function(){for(var t=["ms","moz","webkit","o"],e=t.length;--e>-1&&!window.requestAnimationFrame;)window.requestAnimationFrame=window[t[e]+"RequestAnimationFrame"],window.cancelAnimationFrame=window[t[e]+"CancelAnimationFrame"]||window[t[e]+"CancelRequestAnimationFrame"]}};n.rafPolyfill.call(),t.support.touch=!!("ontouchstart"in window),t.support.pointer=window.navigator.pointerEnabled,t.support.msPointer=window.navigator.msPointerEnabled;var r="https:"==document.location.protocol?"https:":"http:";t.event.special.mousewheel||document.write('<script src="'+r+'//cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.0.6/jquery.mousewheel.min.js"></script>'),t.fn.mCustomScrollbar=function(n){return e[n]?e[n].apply(this,Array.prototype.slice.call(arguments,1)):"object"!=typeof n&&n?void t.error("Method "+n+" does not exist"):e.init.apply(this,arguments)}}(jQuery),$(document).ready(function(){function t(t,e){d3plus.viz().container(e).data(t).type("stacked").id("type").text("type").y("value").x("Year").color("color").draw()}$("#main-nav").waypoint("sticky",{offset:50,wrapper:'<div class="sticky-wrapper" />',stuckClass:"navbar-fixed-top"}),$("#timeline-navbar").mCustomScrollbar({scrollInertia:0,horizontalScroll:!0,autoDraggerLength:!1,advanced:{autoExpandHorizontalScroll:!1,updateOnContentResize:!1},scrollButtons:{enable:!1},contentTouchScroll:!0,callbacks:{whileScrolling:function(){var t=1985+Math.floor(25*(mcs.leftPct/100));$(".mCSB_dragger_bar").html(t)}}}),$(".mCSB_dragger_bar").html("1985"),t(china,"#china")});