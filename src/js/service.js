angular
  .module('virtual-pete')
  .factory('$virtualPete', peteService);


function peteService($mdComponentRegistry, $mdUtil, $log) {
  var errorMsg = "virtual-pete '{0}' is not available! Did you use md-component-id='{0}'?";
  var service = {
    find: findInstance,
    waitFor: waitForInstance
  };

  return function (handle) {
    if (handle === undefined) { return service; }
    return findInstance(handle);
  };

  function findInstance(handle) {
    var instance = $mdComponentRegistry.get(handle);

    if (!instance) {
      // Report missing instance
      $log.error( $mdUtil.supplant(errorMsg, [handle || ""]) );
      return undefined;
    }

    return instance;
  }

  function waitForInstance(handle) {
    return $mdComponentRegistry.when(handle).catch($log.error);
  }
}
