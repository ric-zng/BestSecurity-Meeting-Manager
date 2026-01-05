/**
 * Team Meeting Page
 * Allows Department Leaders to schedule internal meetings with team members
 * Uses AND operation for availability (all participants must be available)
 */

frappe.pages['mm-team-meeting'].on_page_load = function(wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Schedule Team Meeting',
		single_column: true
	});

	// Initialize the page
	wrapper.team_meeting = new TeamMeeting(wrapper, page);
};

frappe.pages['mm-team-meeting'].on_page_show = function(wrapper) {
	if (wrapper.team_meeting) {
		wrapper.team_meeting.show();
	}
};

class TeamMeeting {
	constructor(wrapper, page) {
		this.wrapper = wrapper;
		this.page = page;
		this.selected_participants = [];
		this.make();
	}

	make() {
		// Create main container
		this.$container = $('<div class="team-meeting-container">').appendTo(
			this.page.main
		);

		// Add custom CSS
		this.add_styles();

		// Render the form
		this.render();
	}

	add_styles() {
		const style = `
			<style>
				.team-meeting-container {
					padding: 20px;
					max-width: 900px;
					margin: 0 auto;
				}
				.meeting-section {
					background: white;
					padding: 20px;
					margin-bottom: 20px;
					border-radius: 8px;
					box-shadow: 0 2px 4px rgba(0,0,0,0.1);
				}
				.meeting-section h3 {
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
				.participants-list {
					display: flex;
					flex-direction: column;
					gap: 8px;
					max-height: 300px;
					overflow-y: auto;
					border: 1px solid #e2e8f0;
					border-radius: 4px;
					padding: 10px;
				}
				.participant-item {
					display: flex;
					align-items: center;
					padding: 8px;
					border-radius: 4px;
					cursor: pointer;
					transition: background-color 0.2s;
				}
				.participant-item:hover {
					background-color: #f7fafc;
				}
				.participant-item input[type="checkbox"] {
					margin-right: 10px;
					cursor: pointer;
				}
				.participant-info {
					flex: 1;
				}
				.participant-name {
					font-weight: 500;
					color: #2d3748;
				}
				.participant-email {
					font-size: 12px;
					color: #718096;
				}
				.selected-count {
					background-color: #4299e1;
					color: white;
					padding: 4px 12px;
					border-radius: 12px;
					font-size: 12px;
					font-weight: 500;
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
				.info-badge {
					display: inline-block;
					background-color: #ebf8ff;
					color: #2c5282;
					padding: 4px 8px;
					border-radius: 4px;
					font-size: 12px;
					margin-left: 10px;
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
			// Get departments led by current user
			const departments = await this.get_led_departments();

			if (!departments || departments.length === 0) {
				this.$container.html(`
					<div class="meeting-section">
						<p style="text-align: center; color: #e53e3e;">
							You are not a Department Leader. This page is only for Department Leaders and System Managers.
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
			<div class="meeting-section">
				<h3>Meeting Details</h3>
				<div class="form-grid">
					<div class="form-group">
						<label class="required">Department</label>
						<select class="form-control" id="team-department-select">
							<option value="">Select Department</option>
							${departments.map(d => `<option value="${d.name}">${d.department_name}</option>`).join('')}
						</select>
					</div>
					<div class="form-group">
						<label class="required">Meeting Type</label>
						<select class="form-control" id="team-meeting-type-select" disabled>
							<option value="">Select Meeting Type</option>
						</select>
					</div>
				</div>
			</div>

			<div class="meeting-section" id="team-participants-section" style="display: none;">
				<h3>Select Participants <span class="selected-count" id="selected-count">0 selected</span></h3>
				<p style="color: #718096; font-size: 14px; margin-bottom: 10px;">
					Select team members to invite to the meeting. Available time slots will show only when ALL selected participants are available.
				</p>
				<div class="participants-list" id="participants-list">
					<div class="loading-message">Select a meeting type first</div>
				</div>
			</div>

			<div class="meeting-section" id="team-datetime-section" style="display: none;">
				<h3>Select Date & Time <span class="info-badge" id="participant-count-badge"></span></h3>
				<div class="form-group">
					<label class="required">Date</label>
					<input type="date" class="form-control" id="team-meeting-date" />
				</div>
				<div id="team-time-slots-container"></div>
			</div>

			<div class="meeting-section" id="team-details-section" style="display: none;">
				<h3>Meeting Details</h3>
				<div class="form-grid">
					<div class="form-group full-width">
						<label>Meeting Agenda</label>
						<textarea class="form-control" id="team-meeting-agenda" rows="3" placeholder="What will be discussed in this meeting?"></textarea>
					</div>
					<div class="form-group full-width">
						<label>Meeting Notes</label>
						<textarea class="form-control" id="team-meeting-notes" rows="2" placeholder="Any additional notes or preparation required"></textarea>
					</div>
					<div class="form-group">
						<label>Meeting Link (optional)</label>
						<input type="url" class="form-control" id="team-meeting-link" placeholder="https://meet.google.com/..." />
					</div>
					<div class="form-group">
						<label>Location Type</label>
						<select class="form-control" id="team-location-type">
							<option value="">Use default</option>
							<option value="Video Call">Video Call</option>
							<option value="Phone Call">Phone Call</option>
							<option value="Physical Location">Physical Location</option>
							<option value="Custom">Custom</option>
						</select>
					</div>
					<div class="form-group full-width">
						<div class="switch-container">
							<label class="switch">
								<input type="checkbox" id="team-send-email" checked />
								<span class="slider"></span>
							</label>
							<label for="team-send-email">Send email notification to all participants</label>
						</div>
					</div>
				</div>
			</div>

			<div class="meeting-section" style="text-align: center;" id="team-submit-section" style="display: none;">
				<button class="btn-primary-custom" id="team-submit-meeting" disabled>
					Create Team Meeting
				</button>
			</div>
		`);

		this.attach_handlers();
	}

	attach_handlers() {
		const self = this;

		// Department change handler
		$('#team-department-select').on('change', async function() {
			const department = $(this).val();
			if (department) {
				await self.load_meeting_types(department);
				self.hide_sections(['team-participants-section', 'team-datetime-section', 'team-details-section', 'team-submit-section']);
			} else {
				$('#team-meeting-type-select').prop('disabled', true).html('<option value="">Select Meeting Type</option>');
				self.hide_sections(['team-participants-section', 'team-datetime-section', 'team-details-section', 'team-submit-section']);
			}
		});

		// Meeting type change handler
		$('#team-meeting-type-select').on('change', async function() {
			const meetingType = $(this).val();
			const department = $('#team-department-select').val();
			if (meetingType && department) {
				await self.load_participants(department);
				$('#team-participants-section').show();
			} else {
				self.hide_sections(['team-participants-section', 'team-datetime-section', 'team-details-section', 'team-submit-section']);
			}
		});

		// Date change handler
		$('#team-meeting-date').on('change', async function() {
			const date = $(this).val();
			if (date && self.selected_participants.length > 0) {
				await self.load_team_time_slots(date);
			}
		});

		// Submit button handler
		$('#team-submit-meeting').on('click', function() {
			self.submit_team_meeting();
		});
	}

	async get_led_departments() {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_led_departments'
		});
		return response.message || [];
	}

	async load_meeting_types(department) {
		try {
			const response = await frappe.call({
				method: 'meeting_manager.meeting_manager.api.booking.get_internal_meeting_types',
				args: { department }
			});

			const meeting_types = response.message || [];

			if (meeting_types.length === 0) {
				$('#team-meeting-type-select').html('<option value="">No internal meeting types available</option>').prop('disabled', true);
				frappe.msgprint('No internal meeting types available for this department');
				return;
			}

			const options = meeting_types.map(mt =>
				`<option value="${mt.name}">${mt.meeting_name} (${mt.duration} min)</option>`
			).join('');

			$('#team-meeting-type-select').html(`<option value="">Select Meeting Type</option>${options}`).prop('disabled', false);

		} catch (error) {
			console.error('Error loading meeting types:', error);
			frappe.msgprint('Failed to load meeting types');
		}
	}

	async load_participants(department) {
		try {
			const response = await frappe.call({
				method: 'meeting_manager.meeting_manager.api.booking.get_department_members',
				args: { department }
			});

			const members = response.message || [];

			if (members.length === 0) {
				$('#participants-list').html('<div class="loading-message">No members found</div>');
				return;
			}

			const participantsHtml = members.map(member => `
				<div class="participant-item" data-user-id="${member.user_id}">
					<input type="checkbox" class="participant-checkbox" value="${member.user_id}" />
					<div class="participant-info">
						<div class="participant-name">${member.full_name}</div>
						<div class="participant-email">${member.email}</div>
					</div>
				</div>
			`).join('');

			$('#participants-list').html(participantsHtml);

			// Attach checkbox handlers
			$('.participant-checkbox').on('change', () => {
				this.update_selected_participants();
			});

			// Attach item click handlers (toggle checkbox)
			$('.participant-item').on('click', function(e) {
				if (e.target.type !== 'checkbox') {
					const checkbox = $(this).find('input[type="checkbox"]');
					checkbox.prop('checked', !checkbox.prop('checked')).trigger('change');
				}
			});

		} catch (error) {
			console.error('Error loading participants:', error);
			$('#participants-list').html('<div class="loading-message" style="color: #e53e3e;">Failed to load participants</div>');
		}
	}

	update_selected_participants() {
		this.selected_participants = [];
		$('.participant-checkbox:checked').each((i, el) => {
			this.selected_participants.push($(el).val());
		});

		$('#selected-count').text(`${this.selected_participants.length} selected`);

		if (this.selected_participants.length > 0) {
			$('#team-datetime-section').show();
			const today = new Date().toISOString().split('T')[0];
			$('#team-meeting-date').attr('min', today).val('');
			$('#team-time-slots-container').html('');
			$('#participant-count-badge').text(`Checking availability for ${this.selected_participants.length} participant(s)`);
			this.hide_sections(['team-details-section', 'team-submit-section']);
		} else {
			this.hide_sections(['team-datetime-section', 'team-details-section', 'team-submit-section']);
		}
	}

	async load_team_time_slots(date) {
		const department = $('#team-department-select').val();
		const meeting_type = $('#team-meeting-type-select').val();

		if (!department || !meeting_type || !date || this.selected_participants.length === 0) return;

		$('#team-time-slots-container').html('<div class="loading-message">Checking availability for all participants...</div>');

		try {
			const response = await frappe.call({
				method: 'meeting_manager.meeting_manager.api.booking.get_team_available_slots',
				args: {
					department,
					meeting_type,
					date,
					participants: this.selected_participants
				}
			});

			const data = response.message || {};
			const slots = data.available_slots || [];

			if (slots.length === 0) {
				$('#team-time-slots-container').html('<p style="text-align: center; color: #e53e3e;">No time slots where all participants are available on this date</p>');
				this.hide_sections(['team-details-section', 'team-submit-section']);
				return;
			}

			const slotsHtml = `
				<label class="required">Available Time Slots (ALL ${data.participants_count} participant(s) available)</label>
				<div class="time-slots-grid">
					${slots.map(slot => `
						<div class="time-slot" data-time="${slot.time}">
							${slot.display}
						</div>
					`).join('')}
				</div>
			`;

			$('#team-time-slots-container').html(slotsHtml);

			// Attach click handlers to time slots
			$('.time-slot').on('click', function() {
				$('.time-slot').removeClass('selected');
				$(this).addClass('selected');
				$('#team-details-section').show();
				$('#team-submit-section').show();
				$('#team-submit-meeting').prop('disabled', false);
			});

		} catch (error) {
			console.error('Error loading time slots:', error);
			$('#team-time-slots-container').html('<p style="text-align: center; color: #e53e3e;">Failed to load time slots</p>');
		}
	}

	hide_sections(sections) {
		sections.forEach(section => {
			$(`#${section}`).hide();
		});
		$('#team-submit-meeting').prop('disabled', true);
	}

	async submit_team_meeting() {
		// Validate form
		const department = $('#team-department-select').val();
		const meeting_type = $('#team-meeting-type-select').val();
		const date = $('#team-meeting-date').val();
		const time = $('.time-slot.selected').data('time');

		if (!department || !meeting_type || !date || !time || this.selected_participants.length === 0) {
			frappe.msgprint('Please fill in all required fields and select participants');
			return;
		}

		// Disable submit button
		$('#team-submit-meeting').prop('disabled', true).text('Creating...');

		try {
			const response = await frappe.call({
				method: 'meeting_manager.meeting_manager.api.booking.create_team_meeting',
				args: {
					meeting_data: {
						department,
						meeting_type,
						scheduled_date: date,
						scheduled_start_time: time,
						participants: this.selected_participants,
						meeting_agenda: $('#team-meeting-agenda').val().trim(),
						meeting_notes: $('#team-meeting-notes').val().trim(),
						meeting_link: $('#team-meeting-link').val().trim(),
						location_type: $('#team-location-type').val() || undefined,
						send_email_notification: $('#team-send-email').is(':checked')
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
				throw new Error(response.message?.message || 'Failed to create team meeting');
			}

		} catch (error) {
			console.error('Error creating team meeting:', error);
			frappe.msgprint({
				title: 'Error',
				indicator: 'red',
				message: error.message || 'Failed to create team meeting'
			});
			$('#team-submit-meeting').prop('disabled', false).text('Create Team Meeting');
		}
	}

	show() {
		// Refresh when page is shown
		this.render();
	}
}
