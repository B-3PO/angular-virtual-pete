angular.module('virtualPeteApp', [
  'ngRoute',
  'ngAnimate',
  'ngMaterial',
  'virtual-pete'
])
  .config(configApp);


configApp.$inject = ['$routeProvider'];
function configApp($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'pages/home/home.html',
      controller: 'HomeController',
      controllerAs: 'vm'
    })
    .when('/pagination', {
      templateUrl: 'pages/pagination/pagination.html',
      controller: 'PaginationController',
      controllerAs: 'vm'
    })
    .otherwise('/');
}
