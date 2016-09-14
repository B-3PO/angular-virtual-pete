angular
  .module('virtualPeteApp')
  .controller('HomeController', HomeController);


function HomeController($scope, $timeout) {
  $timeout(function () {
    // addToList();
    // console.log('list added to');
    // $scope.list.splice(5, 19);
    // $scope.list.splice(0, 5)
  }, 2000);


  $scope.list = [
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
    },
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
  ];


  function addToList() {
    $scope.list.push({
      id: 21,
      name: 'twenty one'
    });

    $scope.list.push({
      id: 22,
      name: 'twenty two'
    });

    $scope.list.push({
      id: 23,
      name: 'twenty three'
    });

    $scope.list.push({
      id: 24,
      name: 'twenty four'
    });

    $scope.list.push({
      id: 25,
      name: 'twenty five'
    });

    $scope.list.push({
      id: 26,
      name: 'twenty six'
    });

    $scope.list.push({
      id: 27,
      name: 'twenty seven'
    });
  }
}
