angular
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

    if (isOverflowParent) {
      angular.element(overflowParent).on('scroll wheel touchmove touchend', rAFHandleScroll);
    } else {
      jWindow.on('scroll wheel touchmove touchend', rAFHandleScroll);
    }
    jWindow.on('resize', debouncedUpdateSize);

    $scope.$on('$destroy', function() {
      jWindow.off('scroll wheel touchmove touchend', rAFHandleScroll);
      jWindow.off('resize', debouncedUpdateSize);
    });

    // update after code runs
    $timeout(function () {
      repeater.updateContainer();
    }, 0);
  }




  function resetScroll() {
    scrollTo(0);
  }

  function scrollTo(position) {
    if (isOverflowParent) {
      overflowParent[0].scrollTop = position;
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
    var viewBoundsTop = getScrollParentTop();
    var displayTop = $element[0].getBoundingClientRect().top;
    var height = $window.innerHeight - Math.max(viewBoundsTop, displayTop);
    var floaterTop = Math.max(0, -displayTop + viewBoundsTop);
    var itemSize = repeater.getItemSize();
    var overflowOffset = (Math.max(0, (floaterTop / itemSize)) % 1) * itemSize;
    scrollOffset = Math.max(0, getScrollParentScrollTop() - getTopDifference());

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
    return isOverflowParent ? overflowParent[0].offsetTop : 0;
  }

  function getScrollParentScrollTop() {
    return isOverflowParent ? overflowParent[0].scrollTop : $window.scrollY;
  }

  // walk the dom to calculate the offset from the container to the overflowParent
  function getTopDifference() {
    var target = isOverflowParent ? overflowParent[0] : document.body;

    var top = 0;
    var current = $element[0];

    while (current && current !== target) {
      top += current.offsetTop;
      current = current.offsetParent;
    }

    return top;
  }
}
