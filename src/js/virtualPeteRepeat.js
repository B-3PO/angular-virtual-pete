angular
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

        // // If the number of items shrank, keep the scroll position.
        if (items && itemsLength < items.length && containerCtrl.getScrollOffset() !== 0) {
          items = newItems;
          // var previousScrollOffset = containerCtrl.getScrollOffset();
          // containerCtrl.resetScroll();
          // containerCtrl.scrollTo(previousScrollOffset);
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
        // newStartIndex = Math.max(0, newStartIndex - NUM_EXTRA);
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
