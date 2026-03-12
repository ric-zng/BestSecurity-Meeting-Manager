import frappe
from frappe.utils import cint

no_cache = 1


def get_context(context):
	frappe.db.commit()
	context.boot = get_boot()
	return context


@frappe.whitelist(methods=["POST"], allow_guest=True)
def get_context_for_dev():
	if not frappe.conf.developer_mode:
		frappe.throw("This method is only for developer mode")
	return get_boot()


def get_boot():
	return frappe._dict({
		"default_route": "/meeting-manager",
		"site_name": frappe.local.site,
		"csrf_token": frappe.sessions.get_csrf_token(),
		"session_user": frappe.session.user,
		"setup_complete": cint(frappe.get_system_settings("setup_complete")),
	})
