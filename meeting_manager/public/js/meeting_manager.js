// Override app launcher routes on the /apps page
$(document).ready(function () {
	if (window.location.pathname === '/apps') {
		$('[app-name="meeting_manager"]').attr('app-route', '/meeting-manager');
		$('[app-name="erpnext"]').attr('app-route', '/app/customer');
	}
});
