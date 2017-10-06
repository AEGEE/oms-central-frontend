function appConfig($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider)
{
  $httpProvider.interceptors.push(responseObserver);
  $locationProvider.html5Mode(true);

  $urlRouterProvider.otherwise('/');

  $stateProvider.state('app', {
    abstract: true,
    views: {
      'main@': {
        templateUrl: 'partials/loggedInTemplate.html'
      },
      'header@app': {
        templateUrl: 'partials/header.html',
        controller: "headerController as vm"
      },
      'sidebar@app': {
        templateUrl: 'partials/sidebar.html'
      }

    },
    data: {
      requireLogin: true
    }
  })
  .state('public', {
    abstract: true,
    data: {
      requireLogin: false
    }
  });
}

/** @ngInject */
function appRun($rootScope, $state, setting, $http, loginModal) {
  $rootScope.$state = $state;
  $rootScope.setting = setting;
  $rootScope.currentUser = undefined;

  $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
    var requireLogin = toState.data.requireLogin;

    // On a route which requires login, check if we know user data
    if (requireLogin && typeof $rootScope.currentUser === 'undefined') {
      event.preventDefault();

      // If we still have a token, try if it's valid to fetch the user data
      var token = window.localStorage.getItem("X-Auth-Token");
      if(token) {
        // We still have a token, attemp to fetch data
        $http({
          method: 'POST',
          url: '/api/tokens/user',
          data: {
            token: token
          },
          headers: {
            "X-Auth-Token": token
          }
        }).then((response) => {
          // Worked, we are still logged in from the last time

          $http.defaults.headers.common['X-Auth-Token'] = token;
          $.ajaxSetup({headers: { 'X-Auth-Token': token }});
          $rootScope.currentUser = response.data.data;
          $state.go(toState.name, toParams)
        }).catch((err) => {
          // Errors were intercepted by the response observer already, we can just check if the login was successful
          if($rootScope.currentUser)
            return $state.go(toState.name, toParams);
          else
            return $state.go('public.welcome');
        });
      } else {
        // Otherwise we will have to log in anyways
        loginModal()
        .then(function () {
          // Successful login
          return $state.go(toState.name, toParams);
        })
        .catch(function () {
          // Unsuccessful login
          return $state.go('public.welcome');
        });
      }
    }
  });
}


/** @ngInject */
function responseObserver($q, $window, $timeout, $injector) {
  var loginModal, $http, $state;

  // this trick must be done so that we don't receive
  // `Uncaught Error: [$injector:cdep] Circular dependency found`
  $timeout(function () {
    loginModal = $injector.get('loginModal');
    $http = $injector.get('$http');
    $state = $injector.get('$state');
  });

  return {
    'responseError': function(errorResponse) {
      $('#loadingOverlay').hide();
      switch (errorResponse.status) {
        case 401: // Trust the backend to only send this upon invalid access token
          var deferred = $q.defer();

          loginModal()
          .then(function () {
            // The old X-Auth-Token is still stored in the requests and they would fail again, thus replace
            errorResponse.config.headers['X-Auth-Token'] = window.localStorage.getItem("X-Auth-Token")
            deferred.resolve( $http(errorResponse.config) );
          })
          .catch(function () {
            $state.go('public.welcome');
            deferred.reject(errorResponse);
          });
        return deferred.promise;
        case 403:
          $.gritter.add({
            title: 'Permission error!',
            text: "Not enough permissions!",
            sticky: false,
            time: 8000,
            class_name: 'my-sticky-class'
          });
        break;
        case 500:
          $.gritter.add({
            title: 'Error!',
            text: "Please try again later",
            sticky: false,
            time: 8000,
            class_name: 'testClass'
          });
        break;
      }
      return $q.reject(errorResponse);
    }
  };
}
