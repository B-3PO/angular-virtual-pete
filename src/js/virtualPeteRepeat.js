angular
  .module('virtual-pete')
  .directive('virtualPeteRepeat', virtualPeteRepeatDirective);


var NUM_EXTRA = 4;



/*@ngInject*/
function virtualPeteRepeatDirective($parse, $rootScope, $document, $q, $mdUtil) {
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
    var paginationParser;

    var hasLoader = tAttrs.virtualPeteLoader !== undefined;
    var loaderParser = hasLoader ? $parse(tAttrs.virtualPeteLoader) : undefined;
    var hasPagination = tAttrs.virtualPetePagination !== undefined;
    var pageCount = hasPagination ? parseInt(tAttrs.virtualPetePagination || 100) : undefined;
    var hasSearch = tAttrs.virtualPeteSearchTerm !== undefined && tAttrs.virtualPeteSearchLoader !== undefined;
    var searchTermParser = hasSearch ? $parse(tAttrs.virtualPeteSearchTerm) : undefined;
    var searchLoaderParser = hasSearch ? $parse(tAttrs.virtualPeteSearchLoader) : undefined;

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
      var paginationData = {};
      var endPointTimes = [];
      var averageEndpointTime = 0;
      var paginationLoading = false;
      var lastPageLoaded = 1;
      var currentPage = 1;
      var addedItems = [];
      var listSetter;

      function load(page) {
        // used to keep track of endpoint load times. This can help with auto loading the next pages data
        var start = Date.now();
        var loaderReturn = hasPagination ? loaderParser(scope, { '$page': page, '$pageCount': pageCount }) : loaderParser(scope);

        return $q.resolve(loaderReturn).then(function (data) {
          endPointTimes.push(Date.now() - start);
          averageEndpointTime = endPointTimes.reduce(function(a, b) { return a + b; }, 0) / endPointTimes.length;
          return handleLoadedData(data, page);
        });
      }

      function handleLoadedData(data, page) {
        if (hasPagination) {
          paginationData[page] = data || [];
          combinedData = Object.keys(paginationData).reduce(function (a, p) { return a.concat(paginationData[p]); }, []);
        } else {
          combinedData = data;
        }

        buildLoadedData();
      }

      function buildLoadedData() {
        var ids = combinedData.map(function (i) { return i.id; });
        listSetter(scope, combinedData.concat(addedItems.filter(function (i) { return ids.indexOf(i.id) === -1; })));
      }

      scope.$on('$destroy', function () {
        // prevent memroy leaks with data build up
        if (hasPagination) {
          Object.keys(paginationData).forEach(function (k) {
            paginationData[k] = undefined;
          });
          paginationData = undefined;
        }
      });

      if (hasLoader) {
        listSetter = $parse(match[2].split(' | ')[0]).assign;
        setTimeout(function () {
          load(1);
        }, 0);
      }

      scope.$watchCollection(repeatListExpression, function (newItems, oldItems) {
        getItemHeight(newItems);
        containerCtrl.setContainerHeight(newItems.length * itemHeight);
        displayHeight = containerCtrl.getDisplayHeight();

        if (isVirtualRepeatUpdating) { return; }
        updateRepeat(newItems, oldItems);
      });

      if (hasSearch) {
        var searchDebounce = containerCtrl.debounce(function (value) {
          $q.resolve(searchLoaderParser(scope, { '$term': value })).then(function (results) {
            var ids = addedItems.map(function (i) { return i.id; });
            addedItems = (results || []).filter(function (i) { return ids.indexOf(i.id) === -1; }).concat(addedItems);
            buildLoadedData();
          }).catch(function (e) { console.error(e); });
        }, 200, scope);
        scope.$watch(searchTermParser, function (value) {
          $q.resolve(searchDebounce(value));
        });
      }

      containerCtrl.register({
        updateContainer: updateContainer,
        getItemSize: function () {
          return itemHeight;
        },
        getItemCount: function () {
          return items.length;
        },
        reload: function () {
          load(currentPage);
        },
        getMdComponentId: function () {
          if (tAttrs.mdComponentId === undefined) tAttrs.$set('mdComponentId', '_expansion_panel_id_' + $mdUtil.nextUid());
          return tAttrs.mdComponentId;
        }
      });



      function updateContainer() {
        updateIndexes();
        if (hasPagination) updatePagination();

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
          if (hasPagination) updatePagination();
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

      function updatePagination() {
        var pageEndIndex = newEndIndex - NUM_EXTRA;
        currentPage = Math.ceil(pageEndIndex / pageCount);
        var nextPage = containerCtrl.getScrollDirection() === 'down' ? currentPage + 1 : currentPage - 1;
        if (nextPage < 1) nextPage = 1;
        var pageEnd = currentPage * pageCount;
        var atPagesEnd = newEndIndex >= pageEnd;
        var distanceToEnd = (pageEnd - pageEndIndex) * itemHeight;
        var velocity = containerCtrl.getVelocity();
        var estamatedTimeToNextPage = (velocity === 0 ? 0 : distanceToEnd / containerCtrl.getVelocity()) || 0;
        var noTimeLeft = estamatedTimeToNextPage === 0 ? false : estamatedTimeToNextPage <= averageEndpointTime;
        if (!paginationLoading && currentPage && hasPagination && nextPage !== lastPageLoaded && (noTimeLeft || atPagesEnd)) {
          if (paginationData[nextPage] && !paginationData[nextPage].length) return;
          paginationLoading = true;
          load(nextPage).then(function (data) {
            lastPageLoaded = nextPage;
            paginationLoading = false;
          });
        }
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
