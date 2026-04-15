import frappe

no_cache = 1


def get_context(context):
	"""
	Public booking SPA wrapper.

	All client-side routes under /meeting-booking/* are handled by the Vue
	SPA bundle in public/book/. This wrapper only exposes a CSRF token so
	POST requests (e.g. create_customer_booking) can be authenticated
	without requiring a logged-in session.
	"""
	context.no_cache = 1
	context.show_sidebar = False
	context.csrf_token = frappe.sessions.get_csrf_token()
	return context
