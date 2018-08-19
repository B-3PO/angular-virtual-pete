angular
  .module('virtualPeteApp')
  .controller('PaginationController', PaginationController);


function PaginationController($scope, $q, $virtualPete) {
  $scope.load = function (page, pageCount) {
    // this should call an endpoint with pagination info
    // EXAMPLE: https://config.bypassmobile.com/promotions/accounts?page=${page}&per_page=${pageCount}
    return $q.resolve(list[page]);
  };

  $virtualPete().waitFor('promotions-list').then(function (instance) {
    // can use this method when updating or creating new data
    vm.reloadList = instance.reload;
  });

  var list = [
    [
      {
        id: 1,
        name: 'one'
      },
      {
        id: 2,
        name: 'two'
      },
      {
        id: 3,
        name: 'three'
      },
      {
        id: 4,
        name: 'four'
      },
      {
        id: 5,
        name: 'five'
      },
      {
        id: 6,
        name: 'six'
      },
      {
        id: 7,
        name: 'seven'
      },
      {
        id: 8,
        name: 'eight'
      },
      {
        id: 9,
        name: 'nine'
      },
      {
        id: 10,
        name: 'ten'
      }
    ],

    [
      {
        id: 11,
        name: 'eleven'
      },
      {
        id: 12,
        name: 'twelve'
      },
      {
        id: 13,
        name: 'thirteen'
      },
      {
        id: 14,
        name: 'fourteen'
      },
      {
        id: 15,
        name: 'fifteen'
      },
      {
        id: 16,
        name: 'sixteen'
      },
      {
        id: 17,
        name: 'seventeen'
      },
      {
        id: 18,
        name: 'eightteen'
      },
      {
        id: 19,
        name: 'nineteen'
      },
      {
        id: 20,
        name: 'twenty'
      }
    ],
    [

    ]
  ];
}
