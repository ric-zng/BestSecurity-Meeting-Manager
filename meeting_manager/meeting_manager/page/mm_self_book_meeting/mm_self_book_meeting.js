/**
 * Self Book Meeting Page
 * Allows users to create meetings with customers on their own available time slots
 */

frappe.pages['mm-self-book-meeting'].on_page_load = function(wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Book Meeting with Customer',
		single_column: true
	});

	// Initialize the page
	wrapper.self_book_meeting = new SelfBookMeeting(wrapper, page);
};

frappe.pages['mm-self-book-meeting'].on_page_show = function(wrapper) {
	if (wrapper.self_book_meeting) {
		wrapper.self_book_meeting.show();
	}
};

class SelfBookMeeting {
	constructor(wrapper, page) {
		this.wrapper = wrapper;
		this.page = page;
		this.make();
	}

	make() {
		// Create main container
		this.$container = $('<div class="self-book-meeting-container">').appendTo(
			this.page.main
		);

		// Add custom CSS
		this.add_styles();

		// Render the booking form
		this.render();
	}

	add_styles() {
		const style = `
			<style>
				.self-book-meeting-container {
					padding: 20px;
					max-width: 800px;
					margin: 0 auto;
				}
				.booking-section {
					background: white;
					padding: 20px;
					margin-bottom: 20px;
					border-radius: 8px;
					box-shadow: 0 2px 4px rgba(0,0,0,0.1);
				}
				.booking-section h3 {
					margin-top: 0;
					margin-bottom: 15px;
					color: #2d3748;
					font-size: 18px;
					font-weight: 600;
				}
				.form-grid {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 15px;
				}
				.form-group {
					margin-bottom: 15px;
				}
				.form-group.full-width {
					grid-column: 1 / -1;
				}
				.form-group label {
					display: block;
					margin-bottom: 5px;
					font-weight: 500;
					color: #4a5568;
				}
				.form-group label.required::after {
					content: " *";
					color: #e53e3e;
				}
				.form-control {
					width: 100%;
					padding: 8px 12px;
					border: 1px solid #e2e8f0;
					border-radius: 4px;
					font-size: 14px;
				}
				.btn-primary-custom {
					background-color: #4299e1;
					color: white;
					padding: 10px 20px;
					border: none;
					border-radius: 4px;
					font-size: 14px;
					font-weight: 500;
					cursor: pointer;
					transition: background-color 0.2s;
				}
				.btn-primary-custom:hover {
					background-color: #3182ce;
				}
				.btn-primary-custom:disabled {
					background-color: #cbd5e0;
					cursor: not-allowed;
				}
				.time-slots-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
					gap: 10px;
					margin-top: 10px;
				}
				.time-slot {
					padding: 10px;
					border: 1px solid #e2e8f0;
					border-radius: 4px;
					text-align: center;
					cursor: pointer;
					transition: all 0.2s;
				}
				.time-slot:hover {
					border-color: #4299e1;
					background-color: #ebf8ff;
				}
				.time-slot.selected {
					background-color: #4299e1;
					color: white;
					border-color: #4299e1;
				}
				.loading-message {
					text-align: center;
					padding: 20px;
					color: #718096;
				}
				.switch-container {
					display: flex;
					align-items: center;
					gap: 10px;
				}
				.switch {
					position: relative;
					display: inline-block;
					width: 50px;
					height: 24px;
				}
				.switch input {
					opacity: 0;
					width: 0;
					height: 0;
				}
				.slider {
					position: absolute;
					cursor: pointer;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background-color: #cbd5e0;
					transition: .4s;
					border-radius: 24px;
				}
				.slider:before {
					position: absolute;
					content: "";
					height: 18px;
					width: 18px;
					left: 3px;
					bottom: 3px;
					background-color: white;
					transition: .4s;
					border-radius: 50%;
				}
				input:checked + .slider {
					background-color: #4299e1;
				}
				input:checked + .slider:before {
					transform: translateX(26px);
				}
			</style>
		`;
		$(style).appendTo('head');
	}

	async render() {
		this.$container.html('<div class="loading-message">Loading...</div>');

		try {
			// Get user's departments
			const departments = await this.get_user_departments();

			if (!departments || departments.length === 0) {
				this.$container.html(`
					<div class="booking-section">
						<p style="text-align: center; color: #e53e3e;">
							You are not a member of any department. Please contact your administrator.
						</p>
					</div>
				`);
				return;
			}

			this.render_form(departments);
		} catch (error) {
			console.error('Error loading form:', error);
			frappe.msgprint({
				title: 'Error',
				indicator: 'red',
				message: error.message || 'Failed to load form'
			});
		}
	}

	render_form(departments) {
		this.$container.html(`
			<div class="booking-section">
				<h3>Meeting Details</h3>
				<div class="form-grid">
					<div class="form-group">
						<label class="required">Department</label>
						<select class="form-control" id="department-select">
							<option value="">Select Department</option>
							${departments.map(d => `<option value="${d.name}">${d.department_name}</option>`).join('')}
						</select>
					</div>
					<div class="form-group">
						<label class="required">Meeting Type</label>
						<select class="form-control" id="meeting-type-select" disabled>
							<option value="">Select Meeting Type</option>
						</select>
					</div>
				</div>
			</div>

			<div class="booking-section" id="datetime-section" style="display: none;">
				<h3>Select Date & Time</h3>
				<div class="form-group">
					<label class="required">Date</label>
					<input type="date" class="form-control" id="meeting-date" />
				</div>
				<div id="time-slots-container"></div>
			</div>

			<div class="booking-section" id="customer-section" style="display: none;">
				<h3>Customer Information</h3>
				<div class="form-grid">
					<div class="form-group">
						<label class="required">Customer Name</label>
						<input type="text" class="form-control" id="customer-name" placeholder="John Doe" />
					</div>
					<div class="form-group">
						<label class="required">Customer Email</label>
						<input type="email" class="form-control" id="customer-email" placeholder="john@example.com" />
					</div>
					<div class="form-group">
						<label>Customer Phone</label>
						<input type="tel" class="form-control" id="customer-phone" placeholder="+1234567890" />
					</div>
					<div class="form-group">
						<label>Customer Timezone</label>
						<select class="form-control" id="customer-timezone">
							<option value="">Same as department</option>
							<option value="America/New_York">Eastern Time</option>
							<option value="America/Chicago">Central Time</option>
							<option value="America/Denver">Mountain Time</option>
							<option value="America/Los_Angeles">Pacific Time</option>
							<option value="UTC">UTC</option>
						</select>
					</div>
					<div class="form-group full-width">
						<label>Meeting Agenda</label>
						<textarea class="form-control" id="meeting-agenda" rows="3" placeholder="Brief description of meeting purpose"></textarea>
					</div>
					<div class="form-group full-width">
						<label>Customer Notes</label>
						<textarea class="form-control" id="customer-notes" rows="2" placeholder="Any additional notes"></textarea>
					</div>
					<div class="form-group full-width">
						<div class="switch-container">
							<label class="switch">
								<input type="checkbox" id="send-email" checked />
								<span class="slider"></span>
							</label>
							<label for="send-email">Send email notification to customer</label>
						</div>
					</div>
				</div>
			</div>

			<div class="booking-section" style="text-align: center;" id="submit-section" style="display: none;">
				<button class="btn-primary-custom" id="submit-booking" disabled>
					Create Meeting
				</button>
			</div>
		`);

		this.attach_handlers();
	}

	attach_handlers() {
		const self = this;

		// Department change handler
		$('#department-select').on('change', async function() {
			const department = $(this).val();
			if (department) {
				await self.load_meeting_types(department);
			} else {
				$('#meeting-type-select').prop('disabled', true).html('<option value="">Select Meeting Type</option>');
				self.hide_sections(['datetime-section', 'customer-section', 'submit-section']);
			}
		});

		// Meeting type change handler
		$('#meeting-type-select').on('change', function() {
			const meetingType = $(this).val();
			if (meetingType) {
				$('#datetime-section').show();
				// Set minimum date to today
				const today = new Date().toISOString().split('T')[0];
				$('#meeting-date').attr('min', today).val('');
			} else {
				self.hide_sections(['datetime-section', 'customer-section', 'submit-section']);
			}
		});

		// Date change handler
		$('#meeting-date').on('change', async function() {
			const date = $(this).val();
			if (date) {
				await self.load_time_slots(date);
			}
		});

		// Submit button handler
		$('#submit-booking').on('click', function() {
			self.submit_booking();
		});
	}

	async get_user_departments() {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_user_departments'
		});
		return response.message || [];
	}

	async load_meeting_types(department) {
		try {
			const response = await frappe.call({
				method: 'meeting_manager.meeting_manager.api.booking.get_department_meeting_types_for_self_booking',
				args: { department }
			});

			const meeting_types = response.message || [];

			if (meeting_types.length === 0) {
				$('#meeting-type-select').html('<option value="">No meeting types available</option>').prop('disabled', true);
				frappe.msgprint('No customer-facing meeting types available for this department');
				return;
			}

			const options = meeting_types.map(mt =>
				`<option value="${mt.name}">${mt.meeting_name} (${mt.duration} min)</option>`
			).join('');

			$('#meeting-type-select').html(`<option value="">Select Meeting Type</option>${options}`).prop('disabled', false);

		} catch (error) {
			console.error('Error loading meeting types:', error);
			frappe.msgprint('Failed to load meeting types');
		}
	}

	async load_time_slots(date) {
		const department = $('#department-select').val();
		const meeting_type = $('#meeting-type-select').val();

		if (!department || !meeting_type || !date) return;

		$('#time-slots-container').html('<div class="loading-message">Loading available time slots...</div>');

		try {
			const response = await frappe.call({
				method: 'meeting_manager.meeting_manager.api.booking.get_user_available_slots',
				args: {
					department,
					meeting_type,
					date
				}
			});

			const data = response.message || {};
			const slots = data.available_slots || [];

			if (slots.length === 0) {
				$('#time-slots-container').html('<p style="text-align: center; color: #e53e3e;">No available time slots on this date</p>');
				this.hide_sections(['customer-section', 'submit-section']);
				return;
			}

			const slotsHtml = `
				<label class="required">Available Time Slots</label>
				<div class="time-slots-grid">
					${slots.map(slot => `
						<div class="time-slot" data-time="${slot.time}">
							${slot.display}
						</div>
					`).join('')}
				</div>
			`;

			$('#time-slots-container').html(slotsHtml);

			// Attach click handlers to time slots
			$('.time-slot').on('click', function() {
				$('.time-slot').removeClass('selected');
				$(this).addClass('selected');
				$('#customer-section').show();
				$('#submit-section').show();
				$('#submit-booking').prop('disabled', false);
			});

		} catch (error) {
			console.error('Error loading time slots:', error);
			$('#time-slots-container').html('<p style="text-align: center; color: #e53e3e;">Failed to load time slots</p>');
		}
	}

	hide_sections(sections) {
		sections.forEach(section => {
			$(`#${section}`).hide();
		});
		$('#submit-booking').prop('disabled', true);
	}

	async submit_booking() {
		// Validate form
		const department = $('#department-select').val();
		const meeting_type = $('#meeting-type-select').val();
		const date = $('#meeting-date').val();
		const time = $('.time-slot.selected').data('time');
		const customer_name = $('#customer-name').val().trim();
		const customer_email = $('#customer-email').val().trim();

		if (!department || !meeting_type || !date || !time || !customer_name || !customer_email) {
			frappe.msgprint('Please fill in all required fields');
			return;
		}

		// Validate email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(customer_email)) {
			frappe.msgprint('Please enter a valid email address');
			return;
		}

		// Disable submit button
		$('#submit-booking').prop('disabled', true).text('Creating...');

		try {
			const response = await frappe.call({
				method: 'meeting_manager.meeting_manager.api.booking.create_self_booking',
				args: {
					booking_data: {
						department,
						meeting_type,
						scheduled_date: date,
						scheduled_start_time: time,
						customer_name,
						customer_email,
						customer_phone: $('#customer-phone').val().trim(),
						customer_timezone: $('#customer-timezone').val() || undefined,
						meeting_agenda: $('#meeting-agenda').val().trim(),
						customer_notes: $('#customer-notes').val().trim(),
						send_email_notification: $('#send-email').is(':checked')
					}
				}
			});

			if (response.message && response.message.success) {
				frappe.msgprint({
					title: 'Success',
					indicator: 'green',
					message: response.message.message
				});

				// Reset form
				this.render();
			} else {
				throw new Error(response.message?.message || 'Failed to create booking');
			}

		} catch (error) {
			console.error('Error creating booking:', error);
			frappe.msgprint({
				title: 'Error',
				indicator: 'red',
				message: error.message || 'Failed to create booking'
			});
			$('#submit-booking').prop('disabled', false).text('Create Meeting');
		}
	}

	show() {
		// Refresh when page is shown
		this.render();
	}
}
