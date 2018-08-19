angular
  .module('virtual-pete')
  .directive('virtualPeteContainer', virtualPeteContainer);


var NUM_EXTRA = 4;
// used to calculate velocity
// A. calculate on every n intervals
// B. interval to calculate mean
var VELOCITY_INTERVAL = 6;


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
function VirtualRepeatContainerController($scope, $element, $attrs, $parse, $$rAF, $window, virtualPeteUtil, $timeout, $mdComponentRegistry) {
  /*jshint validthis:true*/
  var vm = this;

  var repeater;
  var totalHeight;
  var displayHeight;
  var lastHeight;
  var lastFloaterTop;
  var lastOverflowOffset;
  var scrollOffset = 0;

  var previousScrollTop = 0;
  var distanceDelta;
  var timeDelta;
  var scrollDirection;
  var previousTime;
  var deltaIndex = 0;
  var deltaTimeRecord = [];
  var deltaDistanceRecord = [];
  var deltaCount = 0;
  var velocity = 0;

  var rAFHandleScroll = $$rAF.throttle(handleScroll);
  var offsetSize = parseInt($attrs.offsetSize) || 0;
  var floater = $element[0].querySelector('.virtual-pete-floater');
  var offsetter = $element[0].querySelector('.virtual-pete-offsetter');
  var overflowParent = virtualPeteUtil.getOverflowParent($element);
  var isOverflowParent = overflowParent !== undefined;
  var jWindow = angular.element($window);
  var debouncedUpdateSize = virtualPeteUtil.debounce(updateSize, 10, null, false);
  var deregister;

  vm.register = register;
  vm.getDisplayHeight = getDisplayHeight;
  vm.setContainerHeight = setContainerHeight;
  vm.getScrollOffset = getScrollOffset;
  vm.getScrollDirection = getScrollDirection;
  vm.getVelocity = getVelocity;
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

      // deregister if component was already registered
      if (typeof deregister === 'function') {
        deregister();
        deregister = undefined;
      }
    });

    // update on next frame so items can render
    $$rAF(function () {
      repeater.updateContainer();
    });

    var componentId = repeater.getMdComponentId();
    deregister = $mdComponentRegistry.register({
      scrollToTop: resetScroll,
      reload: repeater.reload,
      componentId: componentId
    }, componentId);
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

  function getScrollDirection() {
    return scrollDirection;
  }

  function getVelocity() {
    return velocity;
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

  // this is used for pagination loader
  function calculateScrollMovement() {
    var currentScrollTop = getScrollParentScrollTop();
    var now = Date.now();
    scrollDirection = currentScrollTop > previousScrollTop ? 'down' : 'up';
    if (previousScrollTop) distanceDelta = currentScrollTop - previousScrollTop;
    else distanceDelta = undefined;
    if (previousTime) timeDelta = now - previousTime;
    else timeDelta = undefined;
    previousScrollTop = currentScrollTop;
    previousTime = now;

    if (distanceDelta) {
      if (deltaCount > VELOCITY_INTERVAL) {
        var meanDiviser = Math.min(VELOCITY_INTERVAL, deltaTimeRecord.length);
        var timeMean = (deltaTimeRecord.reduce(function (a, b) { return a + b; }, 0) / meanDiviser) || 0;
        var distanceMean = (deltaDistanceRecord.reduce(function (a, b) { return a + b; }, 0) / meanDiviser) || 0;
        velocity = Math.abs(distanceMean / timeMean);
        deltaCount = 0;
        deltaTimeRecord = [];
        deltaDistanceRecord = [];
      }

      deltaTimeRecord.push(timeDelta);
      deltaDistanceRecord.push(distanceDelta);
      deltaCount++;
    } else {
      deltaTimeRecord = [];
      deltaDistanceRecord = [];
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

    calculateScrollMovement();

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
