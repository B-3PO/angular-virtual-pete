/**
 * @ngdoc module
 * @name virtual-pete
 *
 * @description
 * virtual repeat componenet
 */
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
