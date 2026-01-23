// Copyright (c) 2025, Best Security and contributors
// For license information, please see license.txt

frappe.ui.form.on("MM Meeting Booking", {
	refresh(frm) {
		// Add Send Email button if document is saved
		if (!frm.is_new()) {
			frm.add_custom_button(__('Send Email'), function() {
				show_email_dialog(frm);
			}, __('Actions'));
		}
	}
});

function show_email_dialog(frm) {
	// Fetch available templates based on service type
	frappe.call({
		method: 'meeting_manager.meeting_manager.utils.email_notifications.get_available_templates',
		args: {
			service_type: frm.doc.select_mkru || ''
		},
		callback: function(r) {
			if (r.message) {
				const templates = r.message;

				// Group templates by email type
				const grouped = {};
				templates.forEach(t => {
					if (!grouped[t.email_type]) {
						grouped[t.email_type] = [];
					}
					grouped[t.email_type].push(t);
				});

				// Build template options
				const options = templates.map(t => ({
					label: `${t.template_name} (${t.email_type})`,
					value: t.name
				}));

				// Get recipient email
				let recipient = frm.doc.customer_email_at_booking || '';
				if (!recipient && frm.doc.customer) {
					frappe.db.get_value('MM Customer', frm.doc.customer, 'primary_email', (r) => {
						if (r && r.primary_email) {
							recipient = r.primary_email;
						}
					});
				}

				// Create dialog
				const d = new frappe.ui.Dialog({
					title: __('Send Email to Customer'),
					fields: [
						{
							fieldname: 'recipient',
							fieldtype: 'Data',
							label: __('Recipient Email'),
							default: recipient,
							reqd: 1,
							read_only: 1
						},
						{
							fieldname: 'template',
							fieldtype: 'Select',
							label: __('Email Template'),
							options: options.map(o => o.value).join('\n'),
							reqd: 1,
							onchange: function() {
								const selected = d.get_value('template');
								if (selected) {
									// Load preview
									frappe.call({
										method: 'meeting_manager.meeting_manager.utils.email_notifications.preview_template',
										args: {
											template_name: selected,
											booking_id: frm.doc.name
										},
										callback: function(r) {
											if (r.message) {
												d.set_value('subject_preview', r.message.subject);
												d.set_value('body_preview', r.message.body);
											}
										}
									});
								}
							}
						},
						{
							fieldname: 'section_preview',
							fieldtype: 'Section Break',
							label: __('Preview')
						},
						{
							fieldname: 'subject_preview',
							fieldtype: 'Data',
							label: __('Subject'),
							read_only: 1
						},
						{
							fieldname: 'body_preview',
							fieldtype: 'Text Editor',
							label: __('Email Body'),
							read_only: 1
						}
					],
					primary_action_label: __('Send Email'),
					primary_action: function(values) {
						frappe.call({
							method: 'meeting_manager.meeting_manager.utils.email_notifications.send_template_email',
							args: {
								booking_id: frm.doc.name,
								template_name: values.template
							},
							freeze: true,
							freeze_message: __('Sending email...'),
							callback: function(r) {
								if (r.message && r.message.success) {
									frappe.show_alert({
										message: r.message.message,
										indicator: 'green'
									});
									d.hide();
									frm.reload_doc();
								} else {
									frappe.show_alert({
										message: r.message ? r.message.message : __('Failed to send email'),
										indicator: 'red'
									});
								}
							}
						});
					}
				});

				// Set template options with proper labels
				const templateField = d.get_field('template');
				templateField.df.options = options.map(o => o.value).join('\n');
				templateField.refresh();

				// Replace select options with labels
				setTimeout(() => {
					const $select = d.$wrapper.find('[data-fieldname="template"] select');
					$select.empty();
					$select.append($('<option>').val('').text(__('Select Template')));
					options.forEach(o => {
						$select.append($('<option>').val(o.value).text(o.label));
					});
				}, 100);

				d.show();
			} else {
				frappe.msgprint(__('No email templates found. Please create templates in MM Email Template.'));
			}
		}
	});
}
