app_name = "support_dashboard"
app_title = "Support Dashboard"
app_publisher = "Best Security"
app_description = "Customer support dashboard with cross-app data aggregation for ERPNext"
app_email = "ric@zng.dk"
app_license = "mit"

# Required Apps
required_apps = ["frappe", "erpnext"]

# Each item in the list will be shown as an app in the apps page
add_to_apps_screen = [
    {
        "name": "support_dashboard",
        "logo": "/assets/support_dashboard/images/support-dashboard-logo.svg",
        "title": "Support Dashboard",
        "route": "/support-dashboard",
        "has_permission": "support_dashboard.api.permissions.has_app_permission"
    }
]

# Include CSS in web pages
web_include_css = "/assets/support_dashboard/css/support-dashboard.css"

# Website Route Rules
website_route_rules = [
    {"from_route": "/support-dashboard", "to_route": "support-dashboard"},
]

# Fixtures
fixtures = []
