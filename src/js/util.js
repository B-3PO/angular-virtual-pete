angular
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
    getOverflowParent: getOverflowParent
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




  function getOverflowParent(element) {
    var parent = element.parent();

    while (parent !== undefined && hasComputedStyleValue('overflow-y', parent[0]) === false) {
      if (parent[0] === document) {
        parent = undefined;
      } else {
        parent = parent.parent();
      }
    }
    
    return parent;
  }

  function hasComputedStyleValue (key, target) {
    target = target || element[0];

    if(target === document) { return false; }
    var computedStyles = $window.getComputedStyle(target);

    return angular.isDefined(computedStyles[key]) && (computedStyles[key] == 'scroll' || computedStyles[key] == 'auto');
  }
}
