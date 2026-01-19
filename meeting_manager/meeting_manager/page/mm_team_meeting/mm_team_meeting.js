/**
 * Team Meeting Page - Card-Based Multi-Step UI
 * Allows Department Leaders to schedule internal meetings with team members
 * Host (current user) is pre-selected and cannot be removed
 * Uses AND operation for availability (all participants must be available)
 */

frappe.pages['mm-team-meeting'].on_page_load = function(wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Schedule Team Meeting',
		single_column: true
	});

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
		this.currentStep = 1;
		this.state = {
			department: null,
			departmentName: '',
			meetingType: null,
			meetingTypeName: '',
			meetingDuration: 0,
			participants: [],      // Array of {user_id, full_name, email, is_host}
			selectedDate: null,
			selectedTime: null,
			selectedTimeDisplay: '',
			meetingTitle: '',
			serviceType: '',
			meetingAgenda: '',
			locationType: '',
			meetingLocation: '',
			meetingLink: '',
			meetingNotes: '',
			sendNotification: true
		};
		this.departments = [];
		this.meetingTypes = [];
		this.allMembers = [];
		this.availableDates = [];
		this.availableSlots = [];
		this.currentMonth = new Date().getMonth() + 1;
		this.currentYear = new Date().getFullYear();
		this.currentUser = null;
		this.make();
	}

	make() {
		this.$container = $('<div class="team-meeting-container">').appendTo(this.page.main);
		this.addStyles();
		this.render();
	}

	addStyles() {
		if ($('#team-meeting-styles').length) return;

		const style = `
			<style id="team-meeting-styles">
				.team-meeting-container {
					max-width: 1000px;
					margin: 0 auto;
					padding: 20px;
				}

				/* Progress Steps */
				.booking-progress {
					margin-bottom: 2rem;
					padding-bottom: 1.5rem;
					border-bottom: 1px solid var(--border-color);
				}

				.progress-steps {
					display: flex;
					justify-content: space-between;
					align-items: center;
				}

				.progress-step {
					display: flex;
					flex-direction: column;
					align-items: center;
					flex: 1;
				}

				.step-number {
					width: 40px;
					height: 40px;
					border-radius: 50%;
					background: var(--bg-light-gray, #e5e7eb);
					color: var(--text-muted, #6b7280);
					display: flex;
					align-items: center;
					justify-content: center;
					font-weight: 600;
					margin-bottom: 0.5rem;
					transition: all 0.3s;
				}

				.progress-step.active .step-number {
					background: var(--primary);
					color: white;
				}

				.progress-step.completed .step-number {
					background: var(--green-500, #10b981);
					color: white;
				}

				.step-label {
					font-size: 0.75rem;
					color: var(--text-muted);
					text-align: center;
				}

				.progress-step.active .step-label,
				.progress-step.completed .step-label {
					color: var(--text-color);
					font-weight: 600;
				}

				/* Header */
				.booking-header {
					text-align: center;
					margin-bottom: 2rem;
				}

				.booking-header h2 {
					font-size: 1.75rem;
					font-weight: 700;
					color: var(--heading-color);
					margin-bottom: 0.5rem;
				}

				.booking-header .subtitle {
					color: var(--text-muted);
					font-size: 1rem;
				}

				/* Back Link */
				.back-link {
					display: inline-flex;
					align-items: center;
					gap: 0.5rem;
					color: var(--text-muted);
					text-decoration: none;
					font-size: 0.9rem;
					margin-bottom: 1rem;
					cursor: pointer;
					transition: color 0.2s;
				}

				.back-link:hover {
					color: var(--primary);
				}

				/* Card Grid */
				.card-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
					gap: 1.5rem;
				}

				/* Selection Cards */
				.selection-card {
					display: block;
					padding: 1.5rem;
					border: 2px solid var(--border-color);
					border-radius: 12px;
					background: var(--card-bg);
					text-decoration: none;
					color: inherit;
					transition: all 0.3s;
					position: relative;
					cursor: pointer;
				}

				.selection-card:hover {
					border-color: var(--primary);
					box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
					transform: translateY(-2px);
				}

				.selection-card.selected {
					border-color: var(--primary);
					background: var(--control-bg);
				}

				.card-icon {
					color: var(--primary);
					margin-bottom: 1rem;
				}

				.card-icon svg {
					width: 40px;
					height: 40px;
				}

				.selection-card h3 {
					font-size: 1.25rem;
					font-weight: 600;
					color: var(--heading-color);
					margin-bottom: 0.5rem;
				}

				.selection-card .description {
					color: var(--text-muted);
					font-size: 0.875rem;
					line-height: 1.5;
					margin-bottom: 1rem;
				}

				.card-meta {
					display: flex;
					align-items: center;
					gap: 1rem;
					padding-top: 1rem;
					border-top: 1px solid var(--border-color);
					font-size: 0.8rem;
					color: var(--text-muted);
				}

				.card-arrow {
					position: absolute;
					right: 1rem;
					top: 50%;
					transform: translateY(-50%);
					color: var(--text-light);
					transition: all 0.3s;
				}

				.selection-card:hover .card-arrow {
					color: var(--primary);
					transform: translateY(-50%) translateX(4px);
				}

				/* Participants Section */
				.participants-section {
					max-width: 700px;
					margin: 0 auto;
				}

				.participants-list {
					display: flex;
					flex-direction: column;
					gap: 0.5rem;
					max-height: 400px;
					overflow-y: auto;
					border: 2px solid var(--border-color);
					border-radius: 12px;
					padding: 1rem;
					background: var(--card-bg);
				}

				.participant-item {
					display: flex;
					align-items: center;
					padding: 0.75rem 1rem;
					border-radius: 8px;
					cursor: pointer;
					transition: background-color 0.2s;
					border: 1px solid transparent;
				}

				.participant-item:hover {
					background-color: var(--control-bg);
				}

				.participant-item.selected {
					background-color: var(--control-bg);
					border-color: var(--primary);
				}

				.participant-item.is-host {
					background-color: var(--blue-50, #eff6ff);
					border-color: var(--primary);
					cursor: default;
				}

				.participant-item input[type="checkbox"] {
					margin-right: 12px;
					cursor: pointer;
					width: 18px;
					height: 18px;
				}

				.participant-item.is-host input[type="checkbox"] {
					cursor: not-allowed;
				}

				.participant-info {
					flex: 1;
				}

				.participant-name {
					font-weight: 600;
					color: var(--heading-color);
					display: flex;
					align-items: center;
					gap: 0.5rem;
				}

				.host-badge {
					background: var(--primary);
					color: white;
					font-size: 0.65rem;
					padding: 2px 8px;
					border-radius: 10px;
					font-weight: 500;
				}

				.participant-email {
					font-size: 0.85rem;
					color: var(--text-muted);
				}

				.selected-count {
					display: inline-block;
					background: var(--primary);
					color: white;
					padding: 4px 12px;
					border-radius: 12px;
					font-size: 0.85rem;
					font-weight: 500;
					margin-left: 0.5rem;
				}

				/* Calendar Container */
				.calendar-container {
					background: var(--card-bg);
					border: 2px solid var(--border-color);
					border-radius: 12px;
					padding: 1.5rem;
					max-width: 500px;
					margin: 0 auto;
				}

				.calendar-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 1.5rem;
				}

				.calendar-header h3 {
					font-size: 1.25rem;
					font-weight: 600;
					margin: 0;
				}

				.month-nav-btn {
					background: var(--bg-light-gray, #f3f4f6);
					border: 1px solid var(--border-color);
					border-radius: 8px;
					padding: 0.5rem;
					cursor: pointer;
					transition: all 0.2s;
					color: var(--text-muted);
				}

				.month-nav-btn:hover {
					background: var(--border-color);
					color: var(--text-color);
				}

				.calendar-grid {
					display: grid;
					grid-template-columns: repeat(7, 1fr);
					gap: 0.5rem;
				}

				.day-label {
					text-align: center;
					font-weight: 600;
					color: var(--text-muted);
					font-size: 0.75rem;
					padding: 0.5rem;
				}

				.day-cell {
					aspect-ratio: 1;
					border: 2px solid var(--border-color);
					border-radius: 8px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-weight: 500;
					cursor: pointer;
					transition: all 0.2s;
					background: var(--card-bg);
					font-size: 0.875rem;
				}

				.day-cell.empty {
					border: none;
					cursor: default;
				}

				.day-cell.disabled {
					color: var(--text-light);
					cursor: not-allowed;
					background: var(--bg-light-gray);
				}

				.day-cell.available {
					border-color: var(--green-500, #10b981);
					color: var(--green-600, #059669);
					background: var(--green-50, #f0fdf4);
				}

				.day-cell.available:hover {
					background: var(--green-500, #10b981);
					color: white;
					transform: translateY(-2px);
					box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
				}

				.day-cell.selected {
					background: var(--primary);
					color: white;
					border-color: var(--primary);
				}

				/* Time Slots */
				.time-slots-container {
					max-width: 600px;
					margin: 0 auto;
				}

				.time-slots-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
					gap: 0.75rem;
				}

				.time-slot {
					padding: 0.75rem;
					border: 2px solid var(--border-color);
					border-radius: 8px;
					text-align: center;
					cursor: pointer;
					transition: all 0.2s;
					background: var(--card-bg);
					font-weight: 500;
				}

				.time-slot:hover {
					border-color: var(--primary);
					background: var(--control-bg);
				}

				.time-slot.selected {
					background: var(--primary);
					color: white;
					border-color: var(--primary);
				}

				/* Meeting Details Form */
				.details-section {
					max-width: 600px;
					margin: 0 auto;
				}

				.form-group {
					margin-bottom: 1.25rem;
				}

				.form-row {
					display: flex;
					gap: 1rem;
					margin-bottom: 1.25rem;
				}

				.form-row .form-group {
					margin-bottom: 0;
				}

				.form-group.half {
					flex: 1;
				}

				.form-group label {
					display: block;
					margin-bottom: 0.5rem;
					font-weight: 500;
					color: var(--text-color);
				}

				.form-group label.required::after {
					content: " *";
					color: var(--red-500, #ef4444);
				}

				.form-control {
					width: 100%;
					padding: 0.625rem 0.75rem;
					border: 1px solid var(--border-color);
					border-radius: 6px;
					font-size: 0.9rem;
					transition: border-color 0.2s;
				}

				.form-control:focus {
					outline: none;
					border-color: var(--primary);
				}

				/* Toggle Switch */
				.toggle-container {
					display: flex;
					align-items: flex-start;
					gap: 1rem;
					padding: 1rem;
					background: var(--control-bg);
					border-radius: 8px;
					margin-top: 1rem;
				}

				.toggle-switch {
					position: relative;
					width: 50px;
					height: 26px;
					flex-shrink: 0;
				}

				.toggle-switch input {
					opacity: 0;
					width: 0;
					height: 0;
				}

				.toggle-slider {
					position: absolute;
					cursor: pointer;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background-color: var(--border-color);
					transition: 0.3s;
					border-radius: 26px;
				}

				.toggle-slider:before {
					position: absolute;
					content: "";
					height: 20px;
					width: 20px;
					left: 3px;
					bottom: 3px;
					background-color: white;
					transition: 0.3s;
					border-radius: 50%;
				}

				.toggle-switch input:checked + .toggle-slider {
					background-color: var(--primary);
				}

				.toggle-switch input:checked + .toggle-slider:before {
					transform: translateX(24px);
				}

				.toggle-label {
					display: flex;
					flex-direction: column;
					gap: 0.25rem;
				}

				.toggle-label strong {
					color: var(--heading-color);
				}

				.toggle-label span {
					font-size: 0.85rem;
					color: var(--text-muted);
				}

				/* Confirmation Section */
				.confirmation-section {
					max-width: 600px;
					margin: 0 auto;
				}

				.confirmation-card {
					background: var(--card-bg);
					border: 2px solid var(--border-color);
					border-radius: 12px;
					padding: 1.5rem;
					margin-bottom: 1.5rem;
				}

				.confirmation-card h4 {
					font-size: 1rem;
					font-weight: 600;
					color: var(--text-muted);
					margin-bottom: 1rem;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}

				.confirmation-item {
					display: flex;
					justify-content: space-between;
					padding: 0.75rem 0;
					border-bottom: 1px solid var(--border-color);
				}

				.confirmation-item:last-child {
					border-bottom: none;
				}

				.confirmation-item .label {
					color: var(--text-muted);
				}

				.confirmation-item .value {
					font-weight: 600;
					color: var(--heading-color);
				}

				.participants-summary {
					display: flex;
					flex-wrap: wrap;
					gap: 0.5rem;
				}

				.participant-chip {
					background: var(--control-bg);
					padding: 4px 12px;
					border-radius: 16px;
					font-size: 0.85rem;
					color: var(--text-color);
				}

				.participant-chip.host {
					background: var(--primary);
					color: white;
				}

				/* Buttons */
				.btn-primary-custom {
					background: var(--primary);
					color: white;
					padding: 0.875rem 2rem;
					border: none;
					border-radius: 8px;
					font-size: 1rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s;
					display: inline-flex;
					align-items: center;
					gap: 0.5rem;
				}

				.btn-primary-custom:hover {
					background: var(--primary-dark, #2563eb);
					color: white;
					transform: translateY(-1px);
				}

				.btn-primary-custom:disabled {
					background: var(--border-color, #e5e7eb);
					color: var(--text-muted, #6b7280);
					cursor: not-allowed;
					transform: none;
				}

				.btn-secondary {
					background: transparent;
					color: var(--text-color);
					padding: 0.875rem 2rem;
					border: 2px solid var(--border-color);
					border-radius: 8px;
					font-size: 1rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s;
				}

				.btn-secondary:hover {
					border-color: var(--primary);
					color: var(--primary);
				}

				.button-row {
					display: flex;
					justify-content: center;
					gap: 1rem;
					margin-top: 2rem;
					position: relative;
					z-index: 200;
				}

				/* Loading & Empty States */
				.loading-state {
					text-align: center;
					padding: 3rem 1rem;
				}

				.spinner {
					width: 40px;
					height: 40px;
					border: 3px solid var(--border-color);
					border-top-color: var(--primary);
					border-radius: 50%;
					animation: spin 1s linear infinite;
					margin: 0 auto 1rem;
				}

				@keyframes spin {
					to { transform: rotate(360deg); }
				}

				.empty-state {
					text-align: center;
					padding: 3rem;
					color: var(--text-muted);
				}

				/* Success State */
				.success-state {
					text-align: center;
					padding: 3rem;
				}

				.success-icon {
					width: 80px;
					height: 80px;
					background: var(--green-100, #dcfce7);
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					margin: 0 auto 1.5rem;
				}

				.success-icon svg {
					width: 40px;
					height: 40px;
					color: var(--green-600, #16a34a);
				}

				.success-state h2 {
					color: var(--heading-color);
					margin-bottom: 0.5rem;
				}

				.success-state p {
					color: var(--text-muted);
					margin-bottom: 1.5rem;
				}

				/* Info Badge */
				.info-badge {
					display: inline-block;
					background: var(--blue-50, #eff6ff);
					color: var(--blue-600, #2563eb);
					padding: 0.5rem 1rem;
					border-radius: 8px;
					font-size: 0.875rem;
					margin-bottom: 1rem;
				}

				/* Responsive */
				@media (max-width: 768px) {
					.card-grid {
						grid-template-columns: 1fr;
					}

					.progress-steps {
						overflow-x: auto;
						padding-bottom: 1rem;
					}

					.step-label {
						font-size: 0.65rem;
					}

					.step-number {
						width: 32px;
						height: 32px;
						font-size: 0.875rem;
					}
				}
			</style>
		`;
		$(style).appendTo('head');
	}

	async render() {
		this.showLoading();

		try {
			// Get current user info
			this.currentUser = {
				user_id: frappe.session.user,
				full_name: frappe.boot.user.full_name || frappe.session.user,
				email: frappe.boot.user.email || frappe.session.user
			};

			// Get departments led by current user
			this.departments = await this.getLedDepartments();

			if (!this.departments || this.departments.length === 0) {
				this.$container.html(`
					<div class="empty-state">
						<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
							<circle cx="9" cy="7" r="4"></circle>
							<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
							<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
						</svg>
						<h3>Access Restricted</h3>
						<p>You are not a Department Leader. This page is only available for Department Leaders and System Managers.</p>
					</div>
				`);
				return;
			}

			this.renderCurrentStep();
		} catch (error) {
			console.error('Error loading form:', error);
			this.showError('Failed to load page. Please try again.');
		}
	}

	showLoading() {
		this.$container.html(`
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Loading...</p>
			</div>
		`);
	}

	showError(message) {
		this.$container.html(`
			<div class="empty-state">
				<p style="color: var(--red-500);">${message}</p>
				<button class="btn-primary-custom" onclick="location.reload()">Retry</button>
			</div>
		`);
	}

	getProgressStepsHTML() {
		const steps = [
			{ num: 1, label: 'Department' },
			{ num: 2, label: 'Meeting Type' },
			{ num: 3, label: 'Participants' },
			{ num: 4, label: 'Date' },
			{ num: 5, label: 'Time' },
			{ num: 6, label: 'Details' },
			{ num: 7, label: 'Confirm' }
		];

		return `
			<div class="booking-progress">
				<div class="progress-steps">
					${steps.map(step => `
						<div class="progress-step ${this.currentStep > step.num ? 'completed' : ''} ${this.currentStep === step.num ? 'active' : ''}">
							<div class="step-number">${this.currentStep > step.num ? '✓' : step.num}</div>
							<div class="step-label">${step.label}</div>
						</div>
					`).join('')}
				</div>
			</div>
		`;
	}

	renderCurrentStep() {
		switch (this.currentStep) {
			case 1:
				this.renderStep1_Departments();
				break;
			case 2:
				this.renderStep2_MeetingTypes();
				break;
			case 3:
				this.renderStep3_Participants();
				break;
			case 4:
				this.renderStep4_Calendar();
				break;
			case 5:
				this.renderStep5_TimeSlots();
				break;
			case 6:
				this.renderStep6_Details();
				break;
			case 7:
				this.renderStep7_Confirmation();
				break;
		}
	}

	// Step 1: Select Department
	renderStep1_Departments() {
		const departmentsHtml = this.departments.map(dept => `
			<div class="selection-card" data-department="${dept.name}">
				<div class="card-icon">
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
						<circle cx="9" cy="7" r="4"></circle>
						<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
						<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
					</svg>
				</div>
				<h3>${dept.department_name}</h3>
				<p class="description">${dept.description || 'Team department'}</p>
				<div class="card-meta">
					<span>${dept.member_count || 0} members</span>
				</div>
				<div class="card-arrow">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</div>
			</div>
		`).join('');

		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="booking-header">
				<h2>Select Department</h2>
				<p class="subtitle">Choose the department for your team meeting</p>
			</div>

			<div class="card-grid">
				${departmentsHtml}
			</div>
		`);

		this.$container.find('.selection-card').on('click', (e) => {
			const deptId = $(e.currentTarget).data('department');
			const dept = this.departments.find(d => d.name === deptId);
			this.state.department = deptId;
			this.state.departmentName = dept.department_name;
			this.currentStep = 2;
			this.loadMeetingTypes();
		});
	}

	// Step 2: Select Meeting Type
	async loadMeetingTypes() {
		this.showLoading();
		try {
			this.meetingTypes = await this.getInternalMeetingTypes(this.state.department);
			this.renderStep2_MeetingTypes();
		} catch (error) {
			console.error('Error loading meeting types:', error);
			this.showError('Failed to load meeting types.');
		}
	}

	renderStep2_MeetingTypes() {
		if (this.meetingTypes.length === 0) {
			this.$container.html(`
				${this.getProgressStepsHTML()}

				<div class="back-link" id="back-to-step1">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6"></polyline>
					</svg>
					Back to Departments
				</div>

				<div class="empty-state">
					<p>No internal meeting types available for this department.</p>
					<p>Please create an internal meeting type first.</p>
				</div>
			`);

			this.$container.find('#back-to-step1').on('click', () => {
				this.currentStep = 1;
				this.renderCurrentStep();
			});
			return;
		}

		const typesHtml = this.meetingTypes.map(mt => `
			<div class="selection-card" data-meeting-type="${mt.name}">
				<div class="card-icon">
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
						<line x1="16" y1="2" x2="16" y2="6"></line>
						<line x1="8" y1="2" x2="8" y2="6"></line>
						<line x1="3" y1="10" x2="21" y2="10"></line>
					</svg>
				</div>
				<h3>${mt.meeting_name}</h3>
				<p class="description">${mt.description || 'Internal team meeting'}</p>
				<div class="card-meta">
					<span>${mt.duration} minutes</span>
					<span>${mt.location_type || 'Video Call'}</span>
				</div>
				<div class="card-arrow">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</div>
			</div>
		`).join('');

		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="back-link" id="back-to-step1">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
				Back to Departments
			</div>

			<div class="booking-header">
				<h2>Select Meeting Type</h2>
				<p class="subtitle">${this.state.departmentName}</p>
			</div>

			<div class="card-grid">
				${typesHtml}
			</div>
		`);

		this.$container.find('#back-to-step1').on('click', () => {
			this.currentStep = 1;
			this.renderCurrentStep();
		});

		this.$container.find('.selection-card').on('click', (e) => {
			const mtId = $(e.currentTarget).data('meeting-type');
			const mt = this.meetingTypes.find(m => m.name === mtId);
			this.state.meetingType = mtId;
			this.state.meetingTypeName = mt.meeting_name;
			this.state.meetingDuration = mt.duration;
			this.currentStep = 3;
			this.loadParticipants();
		});
	}

	// Step 3: Select Participants (with current user pre-selected as host)
	async loadParticipants() {
		this.showLoading();
		try {
			this.allMembers = await this.getDepartmentMembers(this.state.department);
			// Pre-select current user as host
			this.state.participants = [{
				user_id: this.currentUser.user_id,
				full_name: this.currentUser.full_name,
				email: this.currentUser.email,
				is_host: true
			}];
			this.renderStep3_Participants();
		} catch (error) {
			console.error('Error loading participants:', error);
			this.showError('Failed to load team members.');
		}
	}

	renderStep3_Participants() {
		const participantsHtml = this.allMembers.map(member => {
			const isHost = member.user_id === this.currentUser.user_id;
			const isSelected = this.state.participants.some(p => p.user_id === member.user_id);

			return `
				<div class="participant-item ${isSelected ? 'selected' : ''} ${isHost ? 'is-host' : ''}"
					 data-user-id="${member.user_id}"
					 data-full-name="${member.full_name}"
					 data-email="${member.email}">
					<input type="checkbox"
						   class="participant-checkbox"
						   value="${member.user_id}"
						   ${isSelected ? 'checked' : ''}
						   ${isHost ? 'checked disabled' : ''} />
					<div class="participant-info">
						<div class="participant-name">
							${member.full_name}
							${isHost ? '<span class="host-badge">HOST (You)</span>' : ''}
						</div>
						<div class="participant-email">${member.email}</div>
					</div>
				</div>
			`;
		}).join('');

		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="back-link" id="back-to-step2">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
				Back to Meeting Types
			</div>

			<div class="booking-header">
				<h2>Select Participants</h2>
				<p class="subtitle">${this.state.meetingTypeName} • ${this.state.meetingDuration} minutes</p>
			</div>

			<div class="participants-section">
				<div class="info-badge">
					<strong>You are the host.</strong> Select additional team members to invite.
				</div>

				<p style="margin-bottom: 1rem; color: var(--text-muted);">
					Available dates and times will show only when <strong>ALL</strong> selected participants are available.
				</p>

				<div style="margin-bottom: 1rem;">
					<strong>Participants</strong>
					<span class="selected-count" id="selected-count">${this.state.participants.length} selected</span>
				</div>

				<div class="participants-list">
					${participantsHtml}
				</div>

				<div class="button-row">
					<button class="btn-secondary" id="btn-back">Back</button>
					<button class="btn-primary-custom" id="btn-continue">Continue</button>
				</div>
			</div>
		`);

		this.attachParticipantHandlers();

		this.$container.find('#back-to-step2, #btn-back').on('click', () => {
			this.currentStep = 2;
			this.renderCurrentStep();
		});

		this.$container.find('#btn-continue').on('click', () => {
			if (this.state.participants.length < 1) {
				frappe.msgprint('Please select at least one participant');
				return;
			}
			this.currentStep = 4;
			this.loadAvailableDates();
		});
	}

	attachParticipantHandlers() {
		const self = this;

		// Checkbox change handler
		this.$container.find('.participant-checkbox:not(:disabled)').on('change', function() {
			const $item = $(this).closest('.participant-item');
			const userId = $item.data('user-id');
			const fullName = $item.data('full-name');
			const email = $item.data('email');

			if ($(this).is(':checked')) {
				if (!self.state.participants.some(p => p.user_id === userId)) {
					self.state.participants.push({
						user_id: userId,
						full_name: fullName,
						email: email,
						is_host: false
					});
				}
				$item.addClass('selected');
			} else {
				self.state.participants = self.state.participants.filter(p => p.user_id !== userId);
				$item.removeClass('selected');
			}

			self.$container.find('#selected-count').text(`${self.state.participants.length} selected`);
		});

		// Row click handler (not for host)
		this.$container.find('.participant-item:not(.is-host)').on('click', function(e) {
			if (e.target.type !== 'checkbox') {
				const $checkbox = $(this).find('input[type="checkbox"]');
				$checkbox.prop('checked', !$checkbox.prop('checked')).trigger('change');
			}
		});
	}

	// Step 4: Select Date (Calendar)
	async loadAvailableDates() {
		this.showLoading();
		try {
			const participantIds = this.state.participants.map(p => p.user_id);
			const response = await this.getTeamAvailableDates(
				this.state.department,
				this.state.meetingType,
				this.currentMonth,
				this.currentYear,
				participantIds
			);
			this.availableDates = response.available_dates || [];
			this.renderStep4_Calendar();
		} catch (error) {
			console.error('Error loading available dates:', error);
			this.showError('Failed to load available dates.');
		}
	}

	renderStep4_Calendar() {
		const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'];

		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="back-link" id="back-to-step3">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
				Back to Participants
			</div>

			<div class="booking-header">
				<h2>Select a Date</h2>
				<p class="subtitle">${this.state.participants.length} participants • Showing dates where ALL are available</p>
			</div>

			<div class="calendar-container">
				<div class="calendar-header">
					<button class="month-nav-btn" id="prev-month">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="15 18 9 12 15 6"></polyline>
						</svg>
					</button>
					<h3 id="month-year">${monthNames[this.currentMonth - 1]} ${this.currentYear}</h3>
					<button class="month-nav-btn" id="next-month">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9 18 15 12 9 6"></polyline>
						</svg>
					</button>
				</div>
				<div class="calendar-grid" id="calendar-grid">
					<div class="day-label">Sun</div>
					<div class="day-label">Mon</div>
					<div class="day-label">Tue</div>
					<div class="day-label">Wed</div>
					<div class="day-label">Thu</div>
					<div class="day-label">Fri</div>
					<div class="day-label">Sat</div>
				</div>
			</div>
		`);

		this.renderCalendarDays();
		this.attachCalendarHandlers();

		this.$container.find('#back-to-step3').on('click', () => {
			this.currentStep = 3;
			this.renderCurrentStep();
		});
	}

	renderCalendarDays() {
		const $grid = this.$container.find('#calendar-grid');
		// Remove existing day cells
		$grid.find('.day-cell').remove();

		const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
		const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Add empty cells
		for (let i = 0; i < firstDay; i++) {
			$grid.append('<div class="day-cell empty"></div>');
		}

		// Add day cells
		for (let day = 1; day <= daysInMonth; day++) {
			const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			const cellDate = new Date(this.currentYear, this.currentMonth - 1, day);
			cellDate.setHours(0, 0, 0, 0);

			let cellClass = 'day-cell';
			if (cellDate < today) {
				cellClass += ' disabled';
			} else if (this.availableDates.includes(dateStr)) {
				cellClass += ' available';
			} else {
				cellClass += ' disabled';
			}

			const $cell = $(`<div class="${cellClass}" data-date="${dateStr}">${day}</div>`);

			if (this.availableDates.includes(dateStr) && cellDate >= today) {
				$cell.on('click', () => {
					this.state.selectedDate = dateStr;
					this.currentStep = 5;
					this.loadTimeSlots();
				});
			}

			$grid.append($cell);
		}
	}

	attachCalendarHandlers() {
		this.$container.find('#prev-month').on('click', async () => {
			this.currentMonth--;
			if (this.currentMonth < 1) {
				this.currentMonth = 12;
				this.currentYear--;
			}
			await this.loadAvailableDates();
		});

		this.$container.find('#next-month').on('click', async () => {
			this.currentMonth++;
			if (this.currentMonth > 12) {
				this.currentMonth = 1;
				this.currentYear++;
			}
			await this.loadAvailableDates();
		});
	}

	// Step 5: Select Time
	async loadTimeSlots() {
		this.showLoading();
		try {
			const participantIds = this.state.participants.map(p => p.user_id);
			const response = await this.getTeamAvailableSlots(
				this.state.department,
				this.state.meetingType,
				this.state.selectedDate,
				participantIds
			);
			this.availableSlots = response.available_slots || [];
			this.renderStep5_TimeSlots();
		} catch (error) {
			console.error('Error loading time slots:', error);
			this.showError('Failed to load available times.');
		}
	}

	renderStep5_TimeSlots() {
		if (this.availableSlots.length === 0) {
			this.$container.html(`
				${this.getProgressStepsHTML()}

				<div class="back-link" id="back-to-step4">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6"></polyline>
					</svg>
					Back to Calendar
				</div>

				<div class="empty-state">
					<p>No available time slots for all participants on this date.</p>
					<button class="btn-primary-custom" id="select-different-date">Select Different Date</button>
				</div>
			`);

			this.$container.find('#back-to-step4, #select-different-date').on('click', () => {
				this.currentStep = 4;
				this.renderCurrentStep();
			});
			return;
		}

		const slotsHtml = this.availableSlots.map(slot => `
			<div class="time-slot" data-time="${slot.time}" data-display="${slot.display}">
				${slot.display}
			</div>
		`).join('');

		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="back-link" id="back-to-step4">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
				Back to Calendar
			</div>

			<div class="booking-header">
				<h2>Select a Time</h2>
				<p class="subtitle">${this.formatDate(this.state.selectedDate)} • ${this.state.participants.length} participants available</p>
			</div>

			<div class="time-slots-container">
				<div class="time-slots-grid">
					${slotsHtml}
				</div>
			</div>
		`);

		this.$container.find('#back-to-step4').on('click', () => {
			this.currentStep = 4;
			this.renderCurrentStep();
		});

		this.$container.find('.time-slot').on('click', (e) => {
			const $slot = $(e.currentTarget);
			this.state.selectedTime = $slot.data('time');
			this.state.selectedTimeDisplay = $slot.data('display');
			this.currentStep = 6;
			this.renderCurrentStep();
		});
	}

	// Step 6: Meeting Details
	renderStep6_Details() {
		// Service type options from MM Meeting Booking doctype
		const serviceTypes = [
			'Business',
			'Business Extended',
			'Business Rebook',
			'New Setup Business',
			'Private / Business Customer',
			'Private New Sale',
			'Private Self Book'
		];

		// Default meeting title if not set
		const defaultTitle = this.state.meetingTitle || `${this.state.meetingTypeName} - Team Meeting`;

		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="back-link" id="back-to-step5">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
				Back to Time Selection
			</div>

			<div class="booking-header">
				<h2>Meeting Details</h2>
				<p class="subtitle">${this.formatDate(this.state.selectedDate)} at ${this.state.selectedTimeDisplay}</p>
			</div>

			<div class="details-section">
				<!-- Meeting Title (Required) -->
				<div class="form-group">
					<label class="required">Meeting Title</label>
					<input type="text" class="form-control" id="meeting-title"
						placeholder="Enter meeting title" value="${defaultTitle}" required />
				</div>

				<!-- Service Type -->
				<div class="form-group">
					<label>Service Type</label>
					<select class="form-control" id="service-type">
						<option value="">Select Service Type</option>
						${serviceTypes.map(st => `<option value="${st}" ${this.state.serviceType === st ? 'selected' : ''}>${st}</option>`).join('')}
					</select>
				</div>

				<!-- Meeting Description/Agenda -->
				<div class="form-group">
					<label>Meeting Agenda / Description</label>
					<textarea class="form-control" id="meeting-agenda" rows="3"
						placeholder="What will be discussed in this meeting?">${this.state.meetingAgenda || ''}</textarea>
				</div>

				<!-- Location Section -->
				<div class="form-row">
					<div class="form-group half">
						<label>Location Type</label>
						<select class="form-control" id="location-type">
							<option value="">Use default from meeting type</option>
							<option value="Video Call" ${this.state.locationType === 'Video Call' ? 'selected' : ''}>Video Call</option>
							<option value="Phone Call" ${this.state.locationType === 'Phone Call' ? 'selected' : ''}>Phone Call</option>
							<option value="Physical Location" ${this.state.locationType === 'Physical Location' ? 'selected' : ''}>Physical Location</option>
							<option value="Custom" ${this.state.locationType === 'Custom' ? 'selected' : ''}>Custom</option>
						</select>
					</div>
					<div class="form-group half" id="meeting-location-group" style="${this.state.locationType === 'Physical Location' ? '' : 'display: none;'}">
						<label>Meeting Location</label>
						<input type="text" class="form-control" id="meeting-location"
							placeholder="Address or room name" value="${this.state.meetingLocation || ''}" />
					</div>
				</div>

				<!-- Video Meeting Link -->
				<div class="form-group" id="meeting-link-group" style="${['Video Call', ''].includes(this.state.locationType) ? '' : 'display: none;'}">
					<label>Video Meeting URL</label>
					<input type="url" class="form-control" id="meeting-link"
						placeholder="https://meet.google.com/..." value="${this.state.meetingLink || ''}" />
				</div>

				<!-- Meeting Notes -->
				<div class="form-group">
					<label>Additional Notes</label>
					<textarea class="form-control" id="meeting-notes" rows="2"
						placeholder="Any additional notes or preparation required">${this.state.meetingNotes || ''}</textarea>
				</div>

				<!-- Notification Toggle -->
				<div class="toggle-container">
					<label class="toggle-switch">
						<input type="checkbox" id="send-notification" ${this.state.sendNotification ? 'checked' : ''}>
						<span class="toggle-slider"></span>
					</label>
					<div class="toggle-label">
						<strong>Send Email Notification</strong>
						<span>Notify all participants about this meeting via email</span>
					</div>
				</div>

				<div class="button-row">
					<button class="btn-secondary" id="btn-back">Back</button>
					<button class="btn-primary-custom" id="btn-continue">Continue to Confirmation</button>
				</div>
			</div>
		`);

		// Show/hide location fields based on location type
		this.$container.find('#location-type').on('change', (e) => {
			const locType = $(e.target).val();
			if (locType === 'Physical Location') {
				this.$container.find('#meeting-location-group').show();
				this.$container.find('#meeting-link-group').hide();
			} else if (locType === 'Video Call' || locType === '') {
				this.$container.find('#meeting-location-group').hide();
				this.$container.find('#meeting-link-group').show();
			} else {
				this.$container.find('#meeting-location-group').hide();
				this.$container.find('#meeting-link-group').hide();
			}
		});

		this.$container.find('#back-to-step5, #btn-back').on('click', () => {
			this.collectDetailsData();
			this.currentStep = 5;
			this.renderCurrentStep();
		});

		this.$container.find('#btn-continue').on('click', () => {
			// Validate required fields
			const meetingTitle = this.$container.find('#meeting-title').val().trim();
			if (!meetingTitle) {
				frappe.msgprint('Please enter a Meeting Title');
				return;
			}

			this.collectDetailsData();
			this.currentStep = 7;
			this.renderCurrentStep();
		});
	}

	collectDetailsData() {
		this.state.meetingTitle = this.$container.find('#meeting-title').val().trim();
		this.state.serviceType = this.$container.find('#service-type').val();
		this.state.meetingAgenda = this.$container.find('#meeting-agenda').val().trim();
		this.state.locationType = this.$container.find('#location-type').val();
		this.state.meetingLocation = this.$container.find('#meeting-location').val().trim();
		this.state.meetingLink = this.$container.find('#meeting-link').val().trim();
		this.state.meetingNotes = this.$container.find('#meeting-notes').val().trim();
		this.state.sendNotification = this.$container.find('#send-notification').is(':checked');
	}

	// Step 7: Confirmation
	renderStep7_Confirmation() {
		const participantsHtml = this.state.participants.map(p => `
			<span class="participant-chip ${p.is_host ? 'host' : ''}">${p.full_name}${p.is_host ? ' (Host)' : ''}</span>
		`).join('');

		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="back-link" id="back-to-step6">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
				Back to Meeting Details
			</div>

			<div class="booking-header">
				<h2>Confirm Meeting</h2>
				<p class="subtitle">Please review the meeting details before creating</p>
			</div>

			<div class="confirmation-section">
				<div class="confirmation-card">
					<h4>Meeting Information</h4>
					<div class="confirmation-item">
						<span class="label">Title</span>
						<span class="value">${this.state.meetingTitle}</span>
					</div>
					<div class="confirmation-item">
						<span class="label">Department</span>
						<span class="value">${this.state.departmentName}</span>
					</div>
					<div class="confirmation-item">
						<span class="label">Meeting Type</span>
						<span class="value">${this.state.meetingTypeName}</span>
					</div>
					<div class="confirmation-item">
						<span class="label">Duration</span>
						<span class="value">${this.state.meetingDuration} minutes</span>
					</div>
					${this.state.serviceType ? `
					<div class="confirmation-item">
						<span class="label">Service Type</span>
						<span class="value">${this.state.serviceType}</span>
					</div>
					` : ''}
				</div>

				<div class="confirmation-card">
					<h4>Schedule</h4>
					<div class="confirmation-item">
						<span class="label">Date</span>
						<span class="value">${this.formatDate(this.state.selectedDate)}</span>
					</div>
					<div class="confirmation-item">
						<span class="label">Time</span>
						<span class="value">${this.state.selectedTimeDisplay}</span>
					</div>
				</div>

				<div class="confirmation-card">
					<h4>Participants (${this.state.participants.length})</h4>
					<div class="participants-summary">
						${participantsHtml}
					</div>
				</div>

				${this.state.meetingAgenda ? `
				<div class="confirmation-card">
					<h4>Agenda / Description</h4>
					<p style="color: var(--text-color);">${this.state.meetingAgenda}</p>
				</div>
				` : ''}

				${(this.state.locationType || this.state.meetingLocation || this.state.meetingLink) ? `
				<div class="confirmation-card">
					<h4>Location</h4>
					${this.state.locationType ? `
					<div class="confirmation-item">
						<span class="label">Location Type</span>
						<span class="value">${this.state.locationType}</span>
					</div>
					` : ''}
					${this.state.meetingLocation ? `
					<div class="confirmation-item">
						<span class="label">Address</span>
						<span class="value">${this.state.meetingLocation}</span>
					</div>
					` : ''}
					${this.state.meetingLink ? `
					<div class="confirmation-item">
						<span class="label">Meeting URL</span>
						<span class="value"><a href="${this.state.meetingLink}" target="_blank">${this.state.meetingLink}</a></span>
					</div>
					` : ''}
				</div>
				` : ''}

				${this.state.meetingNotes ? `
				<div class="confirmation-card">
					<h4>Additional Notes</h4>
					<p style="color: var(--text-color);">${this.state.meetingNotes}</p>
				</div>
				` : ''}

				<div class="confirmation-card">
					<h4>Notifications</h4>
					<div class="confirmation-item">
						<span class="label">Email Notification</span>
						<span class="value">${this.state.sendNotification ? 'Will be sent to all participants' : 'Not enabled'}</span>
					</div>
				</div>

				<div class="button-row">
					<button class="btn-secondary" id="btn-back">Back</button>
					<button class="btn-primary-custom" id="btn-submit">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
						Create Team Meeting
					</button>
				</div>
			</div>
		`);

		this.$container.find('#back-to-step6, #btn-back').on('click', () => {
			this.currentStep = 6;
			this.renderCurrentStep();
		});

		this.$container.find('#btn-submit').on('click', () => {
			this.submitMeeting();
		});
	}

	async submitMeeting() {
		const $btn = this.$container.find('#btn-submit');
		$btn.prop('disabled', true).html('Creating...');

		try {
			const participantIds = this.state.participants.map(p => p.user_id);

			const response = await frappe.call({
				method: 'meeting_manager.meeting_manager.api.booking.create_team_meeting',
				args: {
					meeting_data: {
						department: this.state.department,
						meeting_type: this.state.meetingType,
						scheduled_date: this.state.selectedDate,
						scheduled_start_time: this.state.selectedTime,
						participants: participantIds,
						meeting_title: this.state.meetingTitle,
						service_type: this.state.serviceType || undefined,
						meeting_agenda: this.state.meetingAgenda,
						meeting_notes: this.state.meetingNotes,
						meeting_location: this.state.meetingLocation || undefined,
						meeting_link: this.state.meetingLink || undefined,
						location_type: this.state.locationType || undefined,
						send_email_notification: this.state.sendNotification
					}
				}
			});

			if (response.message && response.message.success) {
				this.renderSuccess(response.message.booking_id);
			} else {
				throw new Error(response.message?.message || 'Failed to create meeting');
			}
		} catch (error) {
			console.error('Error creating meeting:', error);
			frappe.msgprint({
				title: 'Error',
				indicator: 'red',
				message: error.message || 'Failed to create team meeting'
			});
			$btn.prop('disabled', false).html(`
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
				Create Team Meeting
			`);
		}
	}

	renderSuccess(bookingId) {
		this.$container.html(`
			<div class="success-state">
				<div class="success-icon">
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
				</div>
				<h2>Team Meeting Created!</h2>
				<p>Your team meeting has been scheduled successfully.${this.state.sendNotification ? ' Notifications have been sent to all participants.' : ''}</p>
				<p style="color: var(--text-muted); font-size: 0.9rem;">Meeting ID: ${bookingId}</p>
				<div class="button-row">
					<button class="btn-secondary" id="view-booking">View Meeting</button>
					<button class="btn-primary-custom" id="book-another">Schedule Another Meeting</button>
				</div>
			</div>
		`);

		this.$container.find('#view-booking').on('click', () => {
			frappe.set_route('Form', 'MM Meeting Booking', bookingId);
		});

		this.$container.find('#book-another').on('click', () => {
			this.resetState();
			this.render();
		});
	}

	resetState() {
		this.currentStep = 1;
		this.state = {
			department: null,
			departmentName: '',
			meetingType: null,
			meetingTypeName: '',
			meetingDuration: 0,
			participants: [],
			selectedDate: null,
			selectedTime: null,
			selectedTimeDisplay: '',
			meetingTitle: '',
			serviceType: '',
			meetingAgenda: '',
			locationType: '',
			meetingLocation: '',
			meetingLink: '',
			meetingNotes: '',
			sendNotification: true
		};
		this.availableDates = [];
		this.availableSlots = [];
		this.currentMonth = new Date().getMonth() + 1;
		this.currentYear = new Date().getFullYear();
	}

	// API Methods
	async getLedDepartments() {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_led_departments'
		});
		return response.message || [];
	}

	async getInternalMeetingTypes(department) {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_internal_meeting_types',
			args: { department }
		});
		return response.message || [];
	}

	async getDepartmentMembers(department) {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_department_members',
			args: { department }
		});
		return response.message || [];
	}

	async getTeamAvailableDates(department, meetingType, month, year, participants) {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_team_available_dates',
			args: {
				department,
				meeting_type: meetingType,
				month,
				year,
				participants: JSON.stringify(participants)
			}
		});
		return response.message || {};
	}

	async getTeamAvailableSlots(department, meetingType, date, participants) {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_team_available_slots',
			args: {
				department,
				meeting_type: meetingType,
				date,
				participants: JSON.stringify(participants)
			}
		});
		return response.message || {};
	}

	// Utility Methods
	formatDate(dateStr) {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	show() {
		this.render();
	}
}
