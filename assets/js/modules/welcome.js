(function ()
{
    'use strict';

    angular
        .module('public.welcome', [])
        .config(config)
        .controller('CentralWelcomeController', CentralWelcomeController);

    /** @ngInject */
    function config($stateProvider)
    {
        // State
         $stateProvider
            .state('public.welcome', {
                url: '/',
                data: {'pageTitle': 'Welcome to OMS'},
                views   : {
                    'main@': {
                        templateUrl: 'modules/welcome.html',
                        controller: 'CentralWelcomeController as vm'
                    }
                }
            });
    }

    function CentralWelcomeController() {
    }

})();