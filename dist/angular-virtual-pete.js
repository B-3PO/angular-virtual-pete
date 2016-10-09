(function(){"use strict";/**
 * @ngdoc module
 * @name virtual-pete
 *
 * @description
 * virtual repeat componenet
 */
virtualPeteConfig.$inject = ["$injector", "$provide"];
angular
  .module('virtual-pete', [])
  .config(virtualPeteConfig);


/*@ngInject*/
function virtualPeteConfig($injector, $provide) {
  var $mdThemingProvider;

  // if not using angular material, then create $$rAF throttle
  if (!$injector.has('$mdUtil')) {
    $provide.decorator('$$rAF', ["$delegate", rAFDecorator]);
  }
}


// polly fill rAF throttle if not using angular material
function rAFDecorator($delegate) {
  $delegate.throttle = function(cb) {
    var queuedArgs, alreadyQueued, queueCb, context;
    return function debounced() {
      queuedArgs = arguments;
      context = this;
      queueCb = cb;
      if (!alreadyQueued) {
        alreadyQueued = true;
        $delegate(function() {
          queueCb.apply(context, Array.prototype.slice.call(queuedArgs));
          alreadyQueued = false;
        });
      }
    };
  };
  return $delegate;
}
}());
(function(){"use strict";
virtualPeteUtilService.$inject = ["$timeout", "$window"];angular
  .module('virtual-pete')
  .factory('virtualPeteUtil', virtualPeteUtilService);

/**
 * @ngdoc module
 * @name virtualPeteUtil
 */

/*@ngInject*/
function virtualPeteUtilService($timeout, $window) {
  var service = {
    debounce: debounce,
    getOverflowParent: getOverflowParent,
    getOffsetTopDifference: getOffsetTopDifference
  };
  return service;





  /**
   * @ngdoc method
   * @name virtualPeteUtil#debounce
   * @function
   *
   * @description
   * Limits a function to only be called once every (x) amount of ms no matter how many times it is called
   * The function will be called at the end of the time given.
   * This differs from Throttle because throttle will not make the last call
   *
   * @param {function} func - function to be called
   * @param {number} wait - milliseconds
   * @param {scope=} scope - apply this object
   * @param {boolean=} invokeApply - skips dirty cheking if false
   *
   * @return {function} - you call this function inplace of the original function
   */
  function debounce(func, wait, scope, invokeApply) {
		var timer;

		return function debounced () {
			var context = scope,
			args = Array.prototype.slice.call(arguments);

			$timeout.cancel(timer);
			timer = $timeout(function () {
				timer = undefined;
				func.apply(context, args);
			}, wait || 10, invokeApply );
		};
	}




  /**
   * @ngdoc method
   * @name virtualPeteUtil#getOffsetTopDifference
   * @function
   *
   * @description
   * Get the pixel difference in from the top of the virtual pete container and the element it is scrolling in
   *
   * @param {HTMLElement=} element - virtual-pete-container
   * @param {HTMLElement=document.body} target - overflowParent. most likely md-content
   *
   * @return {number} - pixels
   */
  function getOffsetTopDifference(element, target) {
    target = target || document.body;
    var top = 0;
    while (element && element !== target) {
      top += element.offsetTop;
      element = element.offsetParent;
    }
    return top;
  }



  /**
   * @ngdoc method
   * @name virtualPeteUtil#getOverflowParent
   * @function
   *
   * @description
   * Look for div with overflow y that teh virtual-pete-container will scroll in
   *
   * @param {HTMLElement=} element - virtual-pete-container
   *
   * @return {HTMLElement} - overflowParent
   */
  function getOverflowParent(element) {
    var parent = element.parent();
    while (parent !== undefined && hasComputedStyleValue('overflow-y', parent[0]) === false) {
      if (parent[0] === document) {
        parent = undefined;
      } else {
        parent = parent.parent();
      }
    }
    return parent !== undefined ? parent[0] : undefined;
  }

  function hasComputedStyleValue (key, target) {
    target = target || element[0];
    if(target === document) { return false; }
    var computedStyles = $window.getComputedStyle(target);

    return angular.isDefined(computedStyles[key]) && (computedStyles[key] == 'scroll' || computedStyles[key] == 'auto');
  }
}
}());
(function(){"use strict";
VirtualRepeatContainerController.$inject = ["$scope", "$element", "$attrs", "$parse", "$$rAF", "$window", "virtualPeteUtil", "$timeout"];angular
  .module('virtual-pete')
  .directive('virtualPeteContainer', virtualPeteContainer);


var NUM_EXTRA = 4;


function virtualPeteContainer() {
  var directive = {
    template: getTemplate,
    controller: VirtualRepeatContainerController,
    compile: compile
  };
  return directive;


  function compile(tElement, tAttrs) {
    tElement.addClass('virtual-pete-container');
  }


  function getTemplate(tElement) {
    return '<div class="virtual-pete-floater">'+
      '<div class="virtual-pete-offsetter">'+
        tElement[0].innerHTML+
      '</div>'+
    '</div>';
  }
}




/*@ngInject*/
function VirtualRepeatContainerController($scope, $element, $attrs, $parse, $$rAF, $window, virtualPeteUtil, $timeout) {
  /*jshint validthis:true*/
  var vm = this;

  var repeater;
  var totalHeight;
  var displayHeight;
  var lastHeight;
  var lastFloaterTop;
  var lastOverflowOffset;
  var scrollOffset = 0;


  var rAFHandleScroll = $$rAF.throttle(handleScroll);
  var offsetSize = parseInt($attrs.offsetSize) || 0;
  var floater = $element[0].querySelector('.virtual-pete-floater');
  var offsetter = $element[0].querySelector('.virtual-pete-offsetter');
  var overflowParent = virtualPeteUtil.getOverflowParent($element);
  var isOverflowParent = overflowParent !== undefined;
  var jWindow = angular.element($window);
  var debouncedUpdateSize = virtualPeteUtil.debounce(updateSize, 10, null, false);



  vm.register = register;
  vm.getDisplayHeight = getDisplayHeight;
  vm.setContainerHeight = setContainerHeight;
  vm.getScrollOffset = getScrollOffset;
  vm.resetScroll = resetScroll;
  vm.scrollTo = scrollTo;



  function register(repeaterCtrl) {
    repeater = repeaterCtrl;

    jWindow.on('resize', debouncedUpdateSize);
    if (isOverflowParent) {
      angular.element(overflowParent).on('scroll wheel touchmove touchend', rAFHandleScroll);
    } else {
      jWindow.on('scroll wheel touchmove touchend', rAFHandleScroll);
    }

    $scope.$on('$destroy', function() {
      jWindow.off('resize', debouncedUpdateSize);
      if (isOverflowParent) {
        angular.element(overflowParent).off('scroll wheel touchmove touchend', rAFHandleScroll);
      } else {
        jWindow.off('scroll wheel touchmove touchend', rAFHandleScroll);
      }
    });

    // update on next frame so items can render
    $$rAF(function () {
      repeater.updateContainer();
    });
  }




  function resetScroll() {
    scrollTo(0);
  }

  function scrollTo(position) {
    if (isOverflowParent) {
      overflowParent.scrollTop = position;
    } else {
      $window.scrollTo($window.scrollX, position);
    }
    handleScroll();
  }

  function updateSize() {
    var itemSize = repeater.getItemSize();
    var count = repeater.getItemCount();
    setContainerHeight(itemSize * count);
    handleScroll();
    repeater.updateContainer();
  }

  function getScrollOffset() {
    return scrollOffset;
  }

  function getDisplayHeight() {
    return displayHeight;
  }

  function setContainerHeight(height) {
    totalHeight = height;
    $element[0].style.height = height + 'px';
    setDisplayHeight();
  }

  function setDisplayHeight() {
    var viewBoundsTop = getScrollParentTop();
    var displayTop = $element[0].getBoundingClientRect().top;
    var height = $window.innerHeight - Math.max(viewBoundsTop, displayTop);

    if (displayHeight !== height) {
      displayHeight = height;
      floater.style.height = displayHeight+'px';
    }
  }

  function handleScroll() {
    var transform;
    var update = false;
    var viewBoundsTop = getScrollParentTop(); // overflowParent top positon on page reletive to its offset parent or 0 for body
    var displayTop = $element[0].getBoundingClientRect().top; // the global top position of the virtual-pete-container
    var height = $window.innerHeight - Math.max(viewBoundsTop, displayTop); // the height from the top of the overflowParent to the bottom of the page
    var floaterTop = Math.max(0, -displayTop + viewBoundsTop); // the top position of the floating div that holds the blocks
    var itemSize = repeater.getItemSize(); // single item height
    var overflowOffset = (Math.max(0, (floaterTop / itemSize)) % 1) * itemSize; // an offset from 0 - itemSize to offset the positions
    var topOffset = virtualPeteUtil.getOffsetTopDifference($element[0], overflowParent); // the y diff between the virtual-pete-container and what it is scrolling in
    scrollOffset = Math.max(0, getScrollParentScrollTop() - topOffset); // the scroll amount after the virtual-pete-container hits the top of the overflowParent

    if (displayHeight !== height) {
      displayHeight = height;
      floater.style.height = height+'px';
      update = true;
    }

    if (floaterTop !== lastFloaterTop) {
      lastFloaterTop = floaterTop;
      transform = 'translateY(' + floaterTop+'px)';
      floater.style.webkitTransform = transform;
      floater.style.transform = transform;
      update = true;
    }

    if (lastOverflowOffset !== overflowOffset) {
      lastOverflowOffset = overflowOffset;
      transform = 'translateY(' + -overflowOffset + 'px)';
      offsetter.style.webkitTransform = transform;
      offsetter.style.transform = transform;
      update = true;
    }

    if (update) { repeater.updateContainer(); }
  }


  function getScrollParentTop() {
    return isOverflowParent ? overflowParent.offsetTop : 0;
  }

  function getScrollParentScrollTop() {
    return isOverflowParent ? overflowParent.scrollTop : $window.scrollY;
  }
}
}());
(function(){"use strict";
virtualPeteRepeatDirective.$inject = ["$parse", "$rootScope", "$document"];angular
  .module('virtual-pete')
  .directive('virtualPeteRepeat', virtualPeteRepeatDirective);


var NUM_EXTRA = 4;



/*@ngInject*/
function virtualPeteRepeatDirective($parse, $rootScope, $document) {
  var directive = {
    restrict: 'A',
    require: '^^virtualPeteContainer',
    priority: 1000,
    terminal: true,
    transclude: 'element',
    compile: compile
  };
  return directive;


  function compile(tElement, tAttrs) {
    var expression = tAttrs.virtualPeteRepeat;
    var match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)\s*$/);
    var repeatName = match[1];
    var repeatListExpression = $parse(match[2]);

    return function postLink(scope, element, attrs, ctrl, transclude) {
      var containerCtrl = ctrl;
      var items;
      var itemHeight;
      var displayHeight;
      var isVirtualRepeatUpdating = false;
      var parentNode = element[0].parentNode;
      var itemsLength = 0;
      var itemsHeight = 0;
      var startIndex = 0;
      var endIndex = 0;
      var newStartIndex = 0;
      var newEndIndex = 0;
      var newVisibleEnd = 0;
      var blocks = {};
      var pooledBlocks = [];

      scope.$watchCollection(repeatListExpression, function (newItems, oldItems) {
        getItemHeight(newItems);
        containerCtrl.setContainerHeight(newItems.length * itemHeight);
        displayHeight = containerCtrl.getDisplayHeight();

        if (isVirtualRepeatUpdating) { return; }
        updateRepeat(newItems, oldItems);
      });


      containerCtrl.register({
        updateContainer: updateContainer,
        getItemSize: function () {
          return itemHeight;
        },
        getItemCount: function () {
          return items.length;
        }
      });



      function updateContainer() {
        updateIndexes();

        if (newStartIndex !== startIndex ||
            newEndIndex !== endIndex ||
            containerCtrl.getScrollOffset() > containerCtrl.getDisplayHeight()) {
          updateRepeat(items, items);
        }
      }

      function updateRepeat(newItems, oldItems) {
        isVirtualRepeatUpdating = true;

        var i;
        var length;
        var keys;
        var block_;
        var index;
        var maxIndex;
        var itemsLength_ = newItems && newItems.length || 0;
        var lengthChanged = false;
        var newStartBlocks_ = [];
        var newEndBlocks_ = [];

        // If the number of items shrank, keep the scroll position.
        if (items && itemsLength_ < itemsLength && containerCtrl.getScrollOffset() !== 0) {
          items = newItems;
          var previousScrollOffset = containerCtrl.getScrollOffset();
          containerCtrl.resetScroll();
          containerCtrl.scrollTo(previousScrollOffset);
        }

        if (itemsLength_ !== itemsLength) {
          lengthChanged = true;
          itemsLength = itemsLength_;
        }

        items = newItems;
        if (newItems !== oldItems || lengthChanged === true) {
          updateIndexes();
        }

        if (lengthChanged === true) {
          containerCtrl.setContainerHeight(itemsLength * itemHeight);
          displayHeight = containerCtrl.getDisplayHeight();
        }



        // Detach and pool any blocks that are no longer in the viewport.
        keys = Object.keys(blocks);
        i = 0;
        length = keys.length;
        while (i < length) {
          index = parseInt(keys[i], 10);
          if (index < newStartIndex || index >= newEndIndex) {
            poolBlock(index);
          }
          i += 1;
        }


        // Collect blocks at the top.
        i = newStartIndex;
        while (i < newEndIndex && (blocks[i] === null || blocks[i] === undefined)) {
          block_ = getBlock(i);
          updateBlock(block_, i);
          newStartBlocks_.push(block_);
          i += 1;
        }


        // Update blocks that are already rendered.
        while ((blocks[i] !== null && blocks[i] !== undefined)) {
          updateBlock(blocks[i], i);
          i += 1;
        }
        maxIndex = i - 1;



        // Collect blocks at the end.
        while (i < newEndIndex) {
          block_ = getBlock(i);
          updateBlock(block_, i);
          newEndBlocks_.push(block_);
          i += 1;
        }


        // Attach collected blocks to the document.
        if (newStartBlocks_.length) {
          parentNode.insertBefore(
              domFragmentFromBlocks(newStartBlocks_),
              element[0].nextSibling);
        }
        if (newEndBlocks_.length) {
          parentNode.insertBefore(
              domFragmentFromBlocks(newEndBlocks_),
              blocks[maxIndex] && blocks[maxIndex].element[0].nextSibling);
        }

        startIndex = newStartIndex;
        endIndex = newEndIndex;
        isVirtualRepeatUpdating = false;
      }



      function getItemHeight(items) {
        if (itemHeight) { return; }
        var block;
        transclude(function(clone, scope) {
          block = {
            element: clone,
            new: true,
            scope: scope
          };
        });
        if (!block.element[0].parentNode) {
          parentNode.appendChild(block.element[0]);
        }
        itemHeight = block.element[0].offsetHeight || 0;
        parentNode.removeChild(block.element[0]);
      }





      // --- Block Pool -----------------

      function updateIndexes() {
        var itemsLength = items ? items.length : 0;
        var containerLength = Math.ceil(displayHeight / itemHeight);

        newStartIndex = Math.max(0, Math.min(
            itemsLength - containerLength,
            Math.floor(containerCtrl.getScrollOffset() / itemHeight)));
        newVisibleEnd = newStartIndex + containerLength + NUM_EXTRA;
        newEndIndex = Math.min(itemsLength, newVisibleEnd);
      }


      function domFragmentFromBlocks(blocks) {
        var fragment = $document[0].createDocumentFragment();
        blocks.forEach(function(block) {
          fragment.appendChild(block.element[0]);
        });
        return fragment;
      }


      function getBlock(index) {
        if (pooledBlocks.length) {
          return pooledBlocks.pop();
        }

        var block;
        transclude(function(clone, scope) {
          block = {
            element: clone,
            new: true,
            scope: scope
          };

          updateScope(scope, index);
          parentNode.appendChild(clone[0]);
        });

        return block;
      }


      function updateBlock(block, index) {
        blocks[index] = block;

        if (index % 2 === 1) { block.element.addClass('br-odd'); }
        else { block.element.removeClass('br-odd'); }

        if (!block.new &&
            (block.scope.$index === index && block.scope[repeatName] === items[index])) {
          return;
        }
        block.new = false;

        // Update and digest the block's scope.
        updateScope(block.scope, index);

        // Perform digest before reattaching the block.
        // Any resulting synchronous dom mutations should be much faster as a result.
        // This might break some directives, but I'm going to try it for now.
        if (!scope.$root.$$phase) {
          block.scope.$digest();
        }
      }

      function updateScope ($scope, index) {
        $scope.$index = index;
        $scope[repeatName] = items && items[index];
      }

      function poolBlock (index) {
        pooledBlocks.push(blocks[index]);
        parentNode.removeChild(blocks[index].element[0]);
        delete blocks[index];
      }
    };
  }
}
}());