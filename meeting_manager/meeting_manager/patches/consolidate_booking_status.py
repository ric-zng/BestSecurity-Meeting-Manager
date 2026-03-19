import frappe


def execute():
	"""Migrate data from MM Status Color to MM Booking Status,
	and ensure every status used on existing bookings has a matching record."""
	final_statuses = {"Cancelled", "Sale Approved", "Booking Approved Not Sale", "Not Possible", "Completed"}

	# Step 1: Copy records from MM Status Color → MM Booking Status
	if frappe.db.table_exists("tabMM Status Color"):
		existing = frappe.get_all(
			"MM Status Color",
			fields=["status", "color", "is_active"],
		)
		for row in existing:
			if frappe.db.exists("MM Booking Status", row.status):
				continue
			doc = frappe.new_doc("MM Booking Status")
			doc.status = row.status
			doc.color = row.color
			doc.is_active = row.is_active
			doc.is_final = 1 if row.status in final_statuses else 0
			doc.insert(ignore_permissions=True)

	# Step 2: If no records were migrated, seed defaults
	if frappe.db.count("MM Booking Status") == 0:
		from meeting_manager.meeting_manager.doctype.mm_booking_status.mm_booking_status import seed_default_statuses
		seed_default_statuses()

	# Step 3: Ensure "Completed" exists (it may not be in MM Status Color)
	if not frappe.db.exists("MM Booking Status", "Completed"):
		doc = frappe.new_doc("MM Booking Status")
		doc.status = "Completed"
		doc.color = "#16a34a"
		doc.is_active = 1
		doc.is_final = 1
		doc.insert(ignore_permissions=True)

	# Step 4: Scan existing bookings for statuses not yet in MM Booking Status
	# This prevents Link field validation errors on existing data
	if frappe.db.table_exists("tabMM Meeting Booking"):
		used_statuses = frappe.db.sql("""
			SELECT DISTINCT booking_status
			FROM `tabMM Meeting Booking`
			WHERE booking_status IS NOT NULL AND booking_status != ''
		""", as_dict=True)

		for row in used_statuses:
			status = row.booking_status
			if frappe.db.exists("MM Booking Status", status):
				continue

			# Create a record for this orphaned status with a neutral gray color
			frappe.logger().info(f"Creating MM Booking Status for orphaned status: {status}")
			doc = frappe.new_doc("MM Booking Status")
			doc.status = status
			doc.color = "#6b7280"  # neutral gray
			doc.is_active = 1
			doc.is_final = 1 if status in final_statuses else 0
			doc.insert(ignore_permissions=True)

	frappe.db.commit()
