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
.factory(responseInterceptor)
.factory(requestInterceptor)
.run(appRun);


var baseUrlRepository = {
  {{#each baseUrlRepo}}
    "{{this.code}}": "{{this.url}}",
  {{/each}}
};


var templateConstants = {
  {{#each templateConstants}}
    "{{@key}}": "{{this}}",
  {{/each}}
};

// TODO get this part out of the index.html somehow
function appConfig($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider)
{
  $httpProvider.interceptors.push(responseInterceptor);
  $httpProvider.interceptors.push(requestInterceptor)
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
function appRun($rootScope, $state, $transitions, setting, $http, loginModal) {
  $rootScope.$state = $state;
  $rootScope.setting = setting;
  $rootScope.currentUser = undefined;


  $transitions.onStart({}, function(transition) {

    if(transition.to().data.requireLogin && !$rootScope.currentUser) {
      return new Promise((resolve, reject) => {
        authenticate(loginModal, $rootScope, $http)
        .then(() => {resolve();})
        .catch(() => {resolve(transition.router.stateService.target('public.welcome'));})
      });
    }

    return;
  });
}

/** @ngInject */
function responseInterceptor($q, $timeout, $injector, $rootScope) {
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

          authenticate(loginModal, $rootScope, $http, {skipCheckToken: true})
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

function requestInterceptor() {
  return {
    'request': function(config) {
      config.headers["X-Auth-Token"] = window.localStorage.getItem("X-Auth-Token");
      return config;
    }
  }
}


// Can be called whenever there is insecurity about the login-state of the user
// In case of being already logged in, the function does nothing
// Returns a promise which will resolve when the user is surely authenticated
// Might call a loginModal in between and take quite some time until fulfillment
// You can pass options to skip certain steps in the process
//  - If you set skipCheckToken to true you can avoid another token check because it might be clear that the token is not valid
//  - If you set skipRefreshRequest to true the function will not try to use the potentially present refresh token but instantly ask for login.
//  - If you set skipLoginUser to true the function will not ask the user for login credentials. The promise will fail in case the other options are exhausted
var currentRunningAuthPromise = null;
function authenticate(loginModal, $rootScope, $http, options) {
  if(!options)
    options = {}

  // Check for the validity of the x-auth-token that we still might have
  let checkXAuthToken = (token) => {
    return new Promise((resolve, reject) => {
      if(token == null)
        return resolve({success: false});
      $.get({
        url: "{{templateConstants.checkTokenUrl}}",
        headers: {"x-auth-token": token}
      }).done((data, status) => {
        if(data.success && data.data)
          return resolve({success: true, user: data.data});
        else
          return resolve({success: false, error: data})
      }).fail((error) => {
        return resolve({success: false, error: error});
      });
    });
  }

  // Use the requestToken to obtain a new access token
  let requestXAuthToken = (token) => {
    return new Promise((resolve, reject) => {
      if(token == null)
        return resolve({success: false});

      $.ajax({
        url: "{{templateConstants.getAccessTokenUrl}}",
        data: {refresh_token: token},
        method: "POST"
      }).done((data, status) => {
        if(data.success && data.access_token) {
          window.localStorage.setItem("X-Auth-Token", data.access_token);
          resolve({success: true});
        }
        else {
          resolve({success: false, error: data});
        }
      }).fail((error) => {
        resolve({success: false, error: error});
      });
    })
  }

  // Call a login-modal with the passed loginModal angular service
  let callLoginModal = () => {
    return new Promise((resolve, reject) => {
      loginModal().then(() => {
        resolve({success: true})
      }).catch(() => {
        resolve({success: false})
      })
    });
  }

  let performAuthProcess = async function() {
    let res = {success: false};
    // First we want to check if we might already have a valid token
    // If an x-auth-token is present, check with the loginservice if that's valid
    if(!options.skipCheckToken)
      res = await checkXAuthToken(window.localStorage.getItem("X-Auth-Token"));
    // If that was not valid, try with the refresh token to obtain a new access token
    if(!res.success && !options.skipRefreshRequest)
      res = await requestXAuthToken(window.localStorage.getItem("Refresh-Token"));
    // If that didn't work, ask the user to login
    if (!res.success && !options.skipLoginUser)
      res = await callLoginModal();

    // If that didn't work, fail.
    if(!res.success){
      throw "Could not perform log in";
    }
    // If it did work, fetch user data and store it
    else
      res = await checkXAuthToken(window.localStorage.getItem("X-Auth-Token"));

    if(res.success && res.user) {
      $rootScope.currentUser = res.user;
      return;
    } else {
      throw "Could not fetch user data though login should have worked"
    }
  }

  // If there is a promise running already, return that one, otherwise create the function
  if(!currentRunningAuthPromise) {
    currentRunningAuthPromise = new Promise((resolve, reject) => {
      performAuthProcess().then(() => {
        currentRunningAuthPromise = null;
        resolve();
      }).catch((error) => {
        currentRunningAuthPromise = null;
        reject(error);
      });
    });
  }
  return currentRunningAuthPromise;
}


omsApp
.controller('LoginModalController', LoginModalController)
.service('loginModal', LoginModalService);


function LoginModalService($uibModal) {

    return function() {

        var instance = $uibModal.open({
            templateUrl: 'modules/loginModal.html',
            controller: 'LoginModalController as vm'
        });

        instance.result;

        return instance.result;
        
    };
};

function LoginModalController($rootScope, $scope, $http, $state) {
    this.cancel = $scope.$dismiss;

    this.redirect = (state_param) => {
      $scope.$dismiss();
      $state.go(state_param);
    }

    this.submit = function (email, password) {
        $http({
            method: 'POST',
            url: "{{templateConstants.loginUrl}}",
            data: {
                username: email,
                password: password
            }
        }).then((response) => {
            if(response.data.success == 1 && response.data.access_token && response.data.refresh_token) {
                // Store in local storage
                window.localStorage.setItem("X-Auth-Token", response.data.access_token);
                window.localStorage.setItem("Refresh-Token", response.data.refresh_token);
                $scope.$close();
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
