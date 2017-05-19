define(['app', 'text!./km-yes-no.html','jquery'], function(app, template) { 'use strict';

	app.directive('kmYesNo', [function ()
	{
		return {
			restrict: 'EAC',
			template: template,
			replace: true,
			transclude: false,
			scope: {
				binding      : '=ngModel',
				ngDisabledFn : '&ngDisabled'
			}
		};
	}]);
});
