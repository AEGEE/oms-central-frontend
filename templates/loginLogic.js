/**
 * Main module
 */

var omsApp = angular
.module('omsApp', [
  {{#each angularModules}}
  '{{this}}',
  {{/each}}
])
.config(appConfig)
.factory(responseObserver)
.run(appRun);


var baseUrlRepository = {
  {{#each baseUrlRepo}}
    "{{this.code}}": "{{this.url}}",
  {{/each}}
};

// TODO get this part out of the index.html somehow
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

  const coreApi = baseUrlRepository['oms-core'] + '/api';

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
          url: coreApi + '/tokens/user',
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


omsApp
.controller('LoginModalController', LoginModalController)
.service('loginModal', LoginModalService);


function LoginModalService($uibModal) {
    const coreApi = baseUrlRepository["oms-core"] + '/api';
    
    var loginModalConfig = {
        loading: false,
        promise: undefined
    };

    var assignCurrentUser = function(user) {
        loginModalConfig.loading = false;
        return user;
    };
    
    return function() {
        // Either return promise of already created modal
        if(loginModalConfig.loading) {
            return loginModalConfig.promise.then(function(user) {
                return user;
            });
        }
        // Or create a new modal
        else {

            loginModalConfig.loading = true;

            var instance = $uibModal.open({
                templateUrl: 'modules/loginModal.html',
                controller: 'LoginModalController as vm'
            });

            loginModalConfig.promise = instance.result;

            return instance.result.then(assignCurrentUser);
        }
    };
};

function LoginModalController($rootScope, $scope, $http) {
    const coreApi = baseUrlRepository["oms-core"] + '/api';


    this.cancel = $scope.$dismiss;

    this.submit = function (email, password) {
        $http({
            method: 'POST',
            url: coreApi + '/login',
            data: {
                username: email,
                password: password
            }
        }).then((response) => {
            if(response.data.success == 1) {
                // Store in local storage
                window.localStorage.setItem("X-Auth-Token", response.data.data);
                $http.defaults.headers.common['X-Auth-Token'] = response.data.data;
                $.ajaxSetup({headers: { 'X-Auth-Token': response.data.data }});
                $http({
                    method: 'POST',
                    url: coreApi + '/tokens/user',
                    data: {
                        token: localStorage.getItem("X-Auth-Token")
                    }
                })
                .then(function successCallback(response) {
                    $rootScope.currentUser = response.data.data;
                    $scope.$close(response.data.data);
                }).catch(function(err) {
                    $.gritter.add({
                        title: 'Login error!',
                        text: 'Could not fetch user data',
                        sticky: true,
                        time: 3600,
                        class_name: 'my-sticky-class'
                    });
                });
            }
            else { 
                $.gritter.add({
                    title: 'Login error!',
                    text: 'Username / password invalid',
                    sticky: true,
                    time: 3600,
                    class_name: 'my-sticky-class'
                });
            }
        }).catch((err) => {
            $.gritter.add({
                title: 'Login error!',
                text: 'Username / password invalid',
                sticky: true,
                time: 3600,
                class_name: 'my-sticky-class'
            }); 
        });
    };
}
