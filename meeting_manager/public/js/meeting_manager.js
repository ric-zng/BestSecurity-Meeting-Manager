// Override app launcher routes on the /apps page
// Frappe's get_route() only allows workspace routes via /app/, so we fix it client-side
$(document).ready(function () {
	if (window.location.pathname === '/apps') {
		$('[app-name="meeting_manager"]').attr('app-route', '/app/mm-enhanced-calendar');
		$('[app-name="erpnext"]').attr('app-route', '/app/customer');
	}
});
