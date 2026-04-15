import frappe

no_cache = 1


def get_context(context):
	"""
	Public booking SPA wrapper.

	All client-side routes under /meeting-booking/* are handled by the Vue
	SPA bundle in public/book/. This wrapper exposes a minimal boot dict
	(CSRF token + site name) so guest POST requests — e.g.
	create_customer_booking — can be authenticated without requiring a
	logged-in session.
	"""
	frappe.db.commit()
	context.no_cache = 1
	context.show_sidebar = False
	context.boot = get_boot()
	return context


def get_boot():
	return frappe._dict(
		{
			"site_name": frappe.local.site,
			"csrf_token": frappe.sessions.get_csrf_token(),
		}
	)
