/**
 * Self Book Meeting Page - Card-Based UI
 * Allows department members to book meetings with customers using a multi-step wizard
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
		this.currentStep = 1;
		this.state = {
			department: null,
			departmentName: '',
			meetingType: null,
			meetingTypeName: '',
			meetingDuration: 0,
			selectedDate: null,
			selectedTime: null,
			selectedTimeDisplay: '',
			customer: null,
			serviceType: '',
			meetingAgenda: '',
			customerNotes: '',
			informCustomer: false
		};
		this.departments = [];
		this.meetingTypes = [];
		this.availableDates = [];
		this.availableSlots = [];
		this.currentMonth = new Date().getMonth() + 1;
		this.currentYear = new Date().getFullYear();
		this.searchTimeout = null;
		this.make();
	}

	make() {
		this.$container = $('<div class="self-book-meeting-container">').appendTo(this.page.main);
		this.addStyles();
		this.render();
	}

	addStyles() {
		if ($('#self-book-meeting-styles').length) return;

		const style = `
			<style id="self-book-meeting-styles">
				.self-book-meeting-container {
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
					background: var(--bg-light-gray);
					color: var(--text-muted);
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
					background: var(--green-500);
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

				/* Back Button */
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

				/* Department/Meeting Type Cards */
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

				.card-meta span {
					display: flex;
					align-items: center;
					gap: 0.25rem;
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
					background: var(--bg-light-gray);
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
					border-color: var(--green-500);
					color: var(--green-600);
					background: var(--green-50);
				}

				.day-cell.available:hover {
					background: var(--green-500);
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

				/* Customer Section */
				.customer-section {
					max-width: 600px;
					margin: 0 auto;
				}

				.customer-search-container {
					position: relative;
					margin-bottom: 1.5rem;
				}

				.customer-search-input {
					width: 100%;
					padding: 0.75rem 1rem;
					border: 2px solid var(--border-color);
					border-radius: 8px;
					font-size: 1rem;
					transition: border-color 0.2s;
				}

				.customer-search-input:focus {
					outline: none;
					border-color: var(--primary);
				}

				.search-dropdown {
					position: absolute;
					top: 100%;
					left: 0;
					right: 0;
					background: var(--card-bg);
					border: 2px solid var(--border-color);
					border-top: none;
					border-radius: 0 0 8px 8px;
					max-height: 300px;
					overflow-y: auto;
					z-index: 100;
					display: none;
				}

				.search-dropdown.show {
					display: block;
				}

				.search-result-item {
					padding: 0.75rem 1rem;
					cursor: pointer;
					transition: background 0.2s;
					border-bottom: 1px solid var(--border-color);
				}

				.search-result-item:hover {
					background: var(--control-bg);
				}

				.search-result-item:last-child {
					border-bottom: none;
				}

				.search-result-item .customer-name {
					font-weight: 600;
					color: var(--heading-color);
				}

				.search-result-item .customer-detail {
					font-size: 0.8rem;
					color: var(--text-muted);
				}

				.create-new-option {
					padding: 0.75rem 1rem;
					cursor: pointer;
					background: var(--control-bg);
					color: var(--primary);
					font-weight: 600;
					display: flex;
					align-items: center;
					gap: 0.5rem;
				}

				.create-new-option:hover {
					background: var(--bg-light-gray);
				}

				/* Selected Customer Display */
				.selected-customer {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 1rem;
					background: var(--control-bg);
					border: 2px solid var(--border-color);
					border-radius: 8px;
					margin-bottom: 1.5rem;
				}

				.selected-customer .customer-info {
					display: flex;
					flex-direction: column;
					gap: 0.25rem;
				}

				.selected-customer .customer-name {
					font-weight: 600;
					color: var(--heading-color);
				}

				.selected-customer .customer-detail {
					font-size: 0.85rem;
					color: var(--text-muted);
				}

				.change-customer-btn {
					padding: 0.5rem 1rem;
					background: transparent;
					border: 1px solid var(--border-color);
					border-radius: 6px;
					cursor: pointer;
					color: var(--text-muted);
					transition: all 0.2s;
				}

				.change-customer-btn:hover {
					border-color: var(--primary);
					color: var(--primary);
				}

				/* New Customer Form */
				.new-customer-form {
					padding: 1.5rem;
					background: var(--control-bg);
					border: 2px solid var(--border-color);
					border-radius: 8px;
					margin-bottom: 1.5rem;
				}

				.form-row {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 1rem;
				}

				.form-group {
					margin-bottom: 1rem;
				}

				.form-group.full-width {
					grid-column: 1 / -1;
				}

				.form-group label {
					display: block;
					margin-bottom: 0.5rem;
					font-weight: 500;
					color: var(--text-color);
				}

				.form-group label.required::after {
					content: " *";
					color: var(--red-500);
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

				/* Service Type & Toggle Section */
				.additional-options {
					margin-top: 1.5rem;
				}

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

				.btn-primary-custom:disabled:hover {
					background: var(--border-color, #e5e7eb);
					color: var(--text-muted, #6b7280);
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

				.empty-state svg {
					width: 64px;
					height: 64px;
					margin-bottom: 1rem;
					opacity: 0.5;
				}

				/* Success State */
				.success-state {
					text-align: center;
					padding: 3rem;
				}

				.success-icon {
					width: 80px;
					height: 80px;
					background: var(--green-100);
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					margin: 0 auto 1.5rem;
				}

				.success-icon svg {
					width: 40px;
					height: 40px;
					color: var(--green-600);
				}

				.success-state h2 {
					color: var(--heading-color);
					margin-bottom: 0.5rem;
				}

				.success-state p {
					color: var(--text-muted);
					margin-bottom: 1.5rem;
				}

				/* Responsive */
				@media (max-width: 768px) {
					.card-grid {
						grid-template-columns: 1fr;
					}

					.form-row {
						grid-template-columns: 1fr;
					}

					.progress-steps {
						overflow-x: auto;
					}

					.step-label {
						font-size: 0.65rem;
					}

					.step-number {
						width: 32px;
						height: 32px;
						font-size: 0.875rem;
					}

					.booking-header h2 {
						font-size: 1.5rem;
					}

					.button-row {
						flex-direction: column;
					}
				}
			</style>
		`;
		$(style).appendTo('head');
	}

	async render() {
		this.$container.html('<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>');

		try {
			this.departments = await this.loadUserDepartments();

			if (!this.departments || this.departments.length === 0) {
				this.$container.html(`
					<div class="empty-state">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="12" y1="8" x2="12" y2="12"></line>
							<line x1="12" y1="16" x2="12.01" y2="16"></line>
						</svg>
						<h3>No Departments Found</h3>
						<p>You are not a member of any department. Please contact your administrator.</p>
					</div>
				`);
				return;
			}

			this.renderCurrentStep();
		} catch (error) {
			console.error('Error loading form:', error);
			frappe.msgprint({
				title: 'Error',
				indicator: 'red',
				message: error.message || 'Failed to load form'
			});
		}
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
				this.renderStep3_Calendar();
				break;
			case 4:
				this.renderStep4_TimeSlots();
				break;
			case 5:
				this.renderStep5_CustomerDetails();
				break;
			case 6:
				this.renderStep6_Confirmation();
				break;
		}
	}

	getProgressStepsHTML() {
		const steps = [
			{ num: 1, label: 'Department' },
			{ num: 2, label: 'Meeting Type' },
			{ num: 3, label: 'Date' },
			{ num: 4, label: 'Time' },
			{ num: 5, label: 'Customer' },
			{ num: 6, label: 'Confirm' }
		];

		return `
			<div class="booking-progress">
				<div class="progress-steps">
					${steps.map(step => `
						<div class="progress-step ${step.num < this.currentStep ? 'completed' : ''} ${step.num === this.currentStep ? 'active' : ''}">
							<div class="step-number">${step.num < this.currentStep ? '&#10003;' : step.num}</div>
							<div class="step-label">${step.label}</div>
						</div>
					`).join('')}
				</div>
			</div>
		`;
	}

	renderStep1_Departments() {
		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="booking-header">
				<h2>Select a Department</h2>
				<p class="subtitle">Choose the department you're booking on behalf of</p>
			</div>

			<div class="card-grid">
				${this.departments.map(dept => `
					<div class="selection-card" data-department="${dept.name}">
						<div class="card-icon">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
								<circle cx="9" cy="7" r="4"></circle>
								<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
								<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
							</svg>
						</div>
						<h3>${dept.department_name}</h3>
						<div class="card-meta">
							<span>${dept.timezone || 'UTC'}</span>
						</div>
						<div class="card-arrow">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="9 18 15 12 9 6"></polyline>
							</svg>
						</div>
					</div>
				`).join('')}
			</div>
		`);

		this.$container.find('.selection-card').on('click', (e) => {
			const $card = $(e.currentTarget);
			const deptName = $card.data('department');
			const dept = this.departments.find(d => d.name === deptName);

			this.state.department = dept.name;
			this.state.departmentName = dept.department_name;
			this.currentStep = 2;
			this.loadMeetingTypes(dept.name).then(() => {
				this.renderCurrentStep();
			});
		});
	}

	async renderStep2_MeetingTypes() {
		if (!this.meetingTypes || this.meetingTypes.length === 0) {
			await this.loadMeetingTypes(this.state.department);
		}

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

			${this.meetingTypes.length === 0 ? `
				<div class="empty-state">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
						<line x1="16" y1="2" x2="16" y2="6"></line>
						<line x1="8" y1="2" x2="8" y2="6"></line>
						<line x1="3" y1="10" x2="21" y2="10"></line>
					</svg>
					<h3>No Meeting Types Available</h3>
					<p>There are no customer-facing meeting types for this department.</p>
				</div>
			` : `
				<div class="card-grid">
					${this.meetingTypes.map(mt => `
						<div class="selection-card" data-meeting-type="${mt.name}">
							<div class="card-icon">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
									<line x1="16" y1="2" x2="16" y2="6"></line>
									<line x1="8" y1="2" x2="8" y2="6"></line>
									<line x1="3" y1="10" x2="21" y2="10"></line>
								</svg>
							</div>
							<h3>${mt.meeting_name}</h3>
							${mt.description ? `<p class="description">${mt.description}</p>` : ''}
							<div class="card-meta">
								<span>${mt.duration} minutes</span>
								${mt.location_type ? `<span>${mt.location_type}</span>` : ''}
							</div>
							<div class="card-arrow">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="9 18 15 12 9 6"></polyline>
								</svg>
							</div>
						</div>
					`).join('')}
				</div>
			`}
		`);

		this.$container.find('#back-to-step1').on('click', () => {
			this.currentStep = 1;
			this.state.meetingType = null;
			this.renderCurrentStep();
		});

		this.$container.find('.selection-card').on('click', (e) => {
			const $card = $(e.currentTarget);
			const mtName = $card.data('meeting-type');
			const mt = this.meetingTypes.find(m => m.name === mtName);

			this.state.meetingType = mt.name;
			this.state.meetingTypeName = mt.meeting_name;
			this.state.meetingDuration = mt.duration;
			this.currentStep = 3;
			this.renderCurrentStep();
		});
	}

	renderStep3_Calendar() {
		const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'];

		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="back-link" id="back-to-step2">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
				Back to Meeting Types
			</div>

			<div class="booking-header">
				<h2>Select a Date</h2>
				<p class="subtitle">${this.state.meetingTypeName} &bull; ${this.state.departmentName}</p>
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

				<div id="calendar-loading" class="loading-state">
					<div class="spinner"></div>
					<p>Loading available dates...</p>
				</div>

				<div id="calendar-grid" class="calendar-grid" style="display: none;">
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

		this.$container.find('#back-to-step2').on('click', () => {
			this.currentStep = 2;
			this.state.selectedDate = null;
			this.renderCurrentStep();
		});

		this.$container.find('#prev-month').on('click', () => {
			this.currentMonth--;
			if (this.currentMonth < 1) {
				this.currentMonth = 12;
				this.currentYear--;
			}
			this.loadAndRenderCalendar();
		});

		this.$container.find('#next-month').on('click', () => {
			this.currentMonth++;
			if (this.currentMonth > 12) {
				this.currentMonth = 1;
				this.currentYear++;
			}
			this.loadAndRenderCalendar();
		});

		this.loadAndRenderCalendar();
	}

	async loadAndRenderCalendar() {
		const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'];

		this.$container.find('#month-year').text(`${monthNames[this.currentMonth - 1]} ${this.currentYear}`);
		this.$container.find('#calendar-loading').show();
		this.$container.find('#calendar-grid').hide();

		try {
			this.availableDates = await this.loadAvailableDates();
			this.renderCalendarDays();
		} catch (error) {
			console.error('Error loading dates:', error);
			this.$container.find('#calendar-loading').html('<p style="color: var(--red-500);">Failed to load available dates</p>');
		}
	}

	renderCalendarDays() {
		const $grid = this.$container.find('#calendar-grid');
		const $loading = this.$container.find('#calendar-loading');

		// Clear existing day cells (keep labels)
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

			let classes = 'day-cell';
			let clickable = false;

			if (cellDate < today) {
				classes += ' disabled';
			} else if (this.availableDates.includes(dateStr)) {
				classes += ' available';
				clickable = true;
			} else {
				classes += ' disabled';
			}

			const $cell = $(`<div class="${classes}" data-date="${dateStr}">${day}</div>`);

			if (clickable) {
				$cell.on('click', () => {
					this.state.selectedDate = dateStr;
					this.currentStep = 4;
					this.renderCurrentStep();
				});
			}

			$grid.append($cell);
		}

		$loading.hide();
		$grid.show();
	}

	async renderStep4_TimeSlots() {
		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="back-link" id="back-to-step3">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
				Back to Calendar
			</div>

			<div class="booking-header">
				<h2>Select a Time</h2>
				<p class="subtitle">${this.formatDate(this.state.selectedDate)} &bull; ${this.state.meetingTypeName}</p>
			</div>

			<div class="time-slots-container">
				<div id="slots-loading" class="loading-state">
					<div class="spinner"></div>
					<p>Loading available times...</p>
				</div>
				<div id="time-slots-grid" class="time-slots-grid" style="display: none;"></div>
			</div>
		`);

		this.$container.find('#back-to-step3').on('click', () => {
			this.currentStep = 3;
			this.state.selectedTime = null;
			this.renderCurrentStep();
		});

		try {
			this.availableSlots = await this.loadTimeSlots();
			this.renderTimeSlots();
		} catch (error) {
			console.error('Error loading slots:', error);
			this.$container.find('#slots-loading').html('<p style="color: var(--red-500);">Failed to load time slots</p>');
		}
	}

	renderTimeSlots() {
		const $grid = this.$container.find('#time-slots-grid');
		const $loading = this.$container.find('#slots-loading');

		if (this.availableSlots.length === 0) {
			$loading.html(`
				<div class="empty-state">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"></circle>
						<polyline points="12 6 12 12 16 14"></polyline>
					</svg>
					<h3>No Time Slots Available</h3>
					<p>There are no available time slots on this date. Please select a different date.</p>
				</div>
			`);
			return;
		}

		$grid.html(this.availableSlots.map(slot => `
			<div class="time-slot" data-time="${slot.time}">${slot.display}</div>
		`).join(''));

		$grid.find('.time-slot').on('click', (e) => {
			const $slot = $(e.currentTarget);
			$grid.find('.time-slot').removeClass('selected');
			$slot.addClass('selected');

			this.state.selectedTime = $slot.data('time');
			this.state.selectedTimeDisplay = $slot.text();

			// Auto-advance after selection
			setTimeout(() => {
				this.currentStep = 5;
				this.renderCurrentStep();
			}, 300);
		});

		$loading.hide();
		$grid.show();
	}

	renderStep5_CustomerDetails() {
		const serviceTypes = [
			'Business',
			'Business Extended',
			'Business Rebook',
			'New Setup Business',
			'Private / Business Customer',
			'Private New Sale',
			'Private Self Book'
		];

		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="back-link" id="back-to-step4">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
				Back to Time Selection
			</div>

			<div class="booking-header">
				<h2>Customer Information</h2>
				<p class="subtitle">${this.formatDate(this.state.selectedDate)} at ${this.state.selectedTimeDisplay}</p>
			</div>

			<div class="customer-section">
				<!-- Customer Search -->
				<div class="customer-search-container" id="customer-search-section">
					<input type="text" class="customer-search-input" id="customer-search"
						placeholder="Search customer by name, email, or phone..." autocomplete="off">
					<div class="search-dropdown" id="search-dropdown"></div>
				</div>

				<!-- Selected Customer Display -->
				<div id="selected-customer-display" style="display: none;"></div>

				<!-- New Customer Form -->
				<div id="new-customer-form" class="new-customer-form" style="display: none;">
					<h4 style="margin-bottom: 1rem; color: var(--heading-color);">New Customer</h4>
					<div class="form-row">
						<div class="form-group">
							<label class="required">Customer Name</label>
							<input type="text" class="form-control" id="new-customer-name" placeholder="John Doe">
						</div>
						<div class="form-group">
							<label class="required">Email</label>
							<input type="email" class="form-control" id="new-customer-email" placeholder="john@example.com">
						</div>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label class="required">Phone</label>
							<input type="tel" class="form-control" id="new-customer-phone" placeholder="+45 12345678">
						</div>
						<div class="form-group">
							<label>CVR Number</label>
							<input type="text" class="form-control" id="new-customer-cvr" placeholder="12345678">
						</div>
					</div>
					<div class="form-row">
						<div class="form-group full-width">
							<label>Company Name</label>
							<input type="text" class="form-control" id="new-customer-company" placeholder="Company A/S">
						</div>
					</div>
				</div>

				<!-- Additional Options -->
				<div class="additional-options">
					<div class="form-group">
						<label class="required">Service Type</label>
						<select class="form-control" id="service-type" required>
							<option value="">Select Service Type</option>
							${serviceTypes.map(st => `<option value="${st}">${st}</option>`).join('')}
						</select>
					</div>

					<div class="form-group">
						<label>Meeting Agenda / Notes</label>
						<textarea class="form-control" id="meeting-agenda" rows="3"
							placeholder="Brief description of meeting purpose (optional)"></textarea>
					</div>

					<div class="toggle-container">
						<label class="toggle-switch">
							<input type="checkbox" id="inform-customer">
							<span class="toggle-slider"></span>
						</label>
						<div class="toggle-label">
							<strong>Inform Customer</strong>
							<span>Send email notification to customer about this meeting</span>
						</div>
					</div>
				</div>

				<div class="button-row">
					<button class="btn-secondary" id="btn-back">Back</button>
					<button class="btn-primary-custom" id="btn-continue" disabled>Continue</button>
				</div>
			</div>
		`);

		this.attachCustomerSearchHandlers();

		this.$container.find('#back-to-step4, #btn-back').on('click', () => {
			this.currentStep = 4;
			this.state.customer = null;
			this.renderCurrentStep();
		});

		this.$container.find('#btn-continue').on('click', () => {
			if (this.validateCustomerStep()) {
				this.collectCustomerData();
				this.currentStep = 6;
				this.renderCurrentStep();
			}
		});

		// Pre-fill if customer already selected
		if (this.state.customer) {
			this.showSelectedCustomer(this.state.customer);
		}
	}

	attachCustomerSearchHandlers() {
		const $input = this.$container.find('#customer-search');
		const $dropdown = this.$container.find('#search-dropdown');
		const $continueBtn = this.$container.find('#btn-continue');

		// Load recent customers on init
		this.loadAndShowRecentCustomers();

		$input.on('input', () => {
			const query = $input.val().trim();

			if (this.searchTimeout) {
				clearTimeout(this.searchTimeout);
			}

			if (query.length < 2) {
				// Show recent customers when query is cleared
				this.loadAndShowRecentCustomers();
				return;
			}

			this.searchTimeout = setTimeout(async () => {
				try {
					const results = await this.searchCustomers(query);
					this.renderSearchResults(results, query);
				} catch (error) {
					console.error('Search error:', error);
				}
			}, 300);
		});

		$input.on('focus', () => {
			const query = $input.val().trim();
			if (query.length >= 2 && $dropdown.children().length > 0) {
				$dropdown.addClass('show');
			} else if (query.length < 2) {
				// Show recent customers on focus if no query
				this.loadAndShowRecentCustomers();
			}
		});

		// Close dropdown when clicking outside
		$(document).on('click', (e) => {
			if (!$(e.target).closest('.customer-search-container').length) {
				$dropdown.removeClass('show');
			}
		});
	}

	renderSearchResults(results, query) {
		const $dropdown = this.$container.find('#search-dropdown');

		let html = '';

		if (results.length > 0) {
			html += results.map(c => `
				<div class="search-result-item" data-customer-id="${c.id}">
					<div class="customer-name">${c.name}</div>
					<div class="customer-detail">${c.email}${c.phone ? ' &bull; ' + c.phone : ''}</div>
				</div>
			`).join('');
		}

		html += `
			<div class="create-new-option" id="create-new-customer">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19"></line>
					<line x1="5" y1="12" x2="19" y2="12"></line>
				</svg>
				Create new customer "${query}"
			</div>
		`;

		$dropdown.html(html).addClass('show');

		// Attach click handlers
		$dropdown.find('.search-result-item').on('click', (e) => {
			const customerId = $(e.currentTarget).data('customer-id');
			const customer = results.find(c => c.id === customerId);
			this.selectExistingCustomer(customer);
		});

		$dropdown.find('#create-new-customer').on('click', () => {
			this.showNewCustomerForm(query);
		});
	}

	async loadAndShowRecentCustomers() {
		const $dropdown = this.$container.find('#search-dropdown');

		try {
			const recentCustomers = await this.getRecentCustomers();
			this.recentCustomers = recentCustomers;

			if (recentCustomers.length === 0) {
				// No customers exist, show create new option only
				$dropdown.html(`
					<div class="search-dropdown-header" style="padding: 0.5rem 1rem; color: var(--text-muted); font-size: 0.85rem; border-bottom: 1px solid var(--border-color);">
						No customers found. Create a new one below.
					</div>
					<div class="create-new-option" id="create-new-customer-empty">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="12" y1="5" x2="12" y2="19"></line>
							<line x1="5" y1="12" x2="19" y2="12"></line>
						</svg>
						Create new customer
					</div>
				`).addClass('show');

				$dropdown.find('#create-new-customer-empty').on('click', () => {
					this.showNewCustomerForm('');
				});
				return;
			}

			// Show recent customers
			let html = `
				<div class="search-dropdown-header" style="padding: 0.5rem 1rem; color: var(--text-muted); font-size: 0.85rem; border-bottom: 1px solid var(--border-color);">
					Recent Customers
				</div>
			`;

			html += recentCustomers.map(c => `
				<div class="search-result-item" data-customer-id="${c.id}">
					<div class="customer-name">${c.name}</div>
					<div class="customer-detail">${c.email}${c.phone ? ' &bull; ' + c.phone : ''}</div>
				</div>
			`).join('');

			html += `
				<div class="create-new-option" id="create-new-customer-recent">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="5" x2="12" y2="19"></line>
						<line x1="5" y1="12" x2="19" y2="12"></line>
					</svg>
					Create new customer
				</div>
			`;

			$dropdown.html(html).addClass('show');

			// Attach click handlers
			$dropdown.find('.search-result-item').on('click', (e) => {
				const customerId = $(e.currentTarget).data('customer-id');
				const customer = recentCustomers.find(c => c.id === customerId);
				this.selectExistingCustomer(customer);
			});

			$dropdown.find('#create-new-customer-recent').on('click', () => {
				this.showNewCustomerForm('');
			});
		} catch (error) {
			console.error('Error loading recent customers:', error);
		}
	}

	selectExistingCustomer(customer) {
		this.state.customer = {
			id: customer.id,
			name: customer.name,
			email: customer.email,
			phone: customer.phone || '',
			cvr_number: customer.cvr_number || '',
			company_name: customer.company_name || '',
			isNew: false
		};

		this.showSelectedCustomer(this.state.customer);
		this.$container.find('#search-dropdown').removeClass('show');
		this.$container.find('#btn-continue').prop('disabled', false);
	}

	showSelectedCustomer(customer) {
		const $searchSection = this.$container.find('#customer-search-section');
		const $selectedDisplay = this.$container.find('#selected-customer-display');
		const $newForm = this.$container.find('#new-customer-form');

		$searchSection.hide();
		$newForm.hide();

		$selectedDisplay.html(`
			<div class="selected-customer" style="flex-direction: column; align-items: stretch;">
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
					<div class="customer-info">
						<div class="customer-name">${customer.name}</div>
						<div class="customer-detail">${customer.email}${customer.phone ? ' &bull; ' + customer.phone : ''}</div>
					</div>
					<button class="change-customer-btn" id="change-customer">Change</button>
				</div>
				<div class="form-row" style="margin-top: 0.5rem;">
					<div class="form-group" style="margin-bottom: 0;">
						<label>CVR Number</label>
						<input type="text" class="form-control" id="existing-customer-cvr"
							value="${customer.cvr_number || ''}" placeholder="12345678">
					</div>
					<div class="form-group" style="margin-bottom: 0;">
						<label>Company Name</label>
						<input type="text" class="form-control" id="existing-customer-company"
							value="${customer.company_name || ''}" placeholder="Company A/S">
					</div>
				</div>
			</div>
		`).show();

		$selectedDisplay.find('#change-customer').on('click', () => {
			this.state.customer = null;
			$selectedDisplay.hide();
			$searchSection.show();
			this.$container.find('#customer-search').val('').focus();
			this.$container.find('#btn-continue').prop('disabled', true);
		});

		// Update customer state when CVR/Company fields change
		$selectedDisplay.find('#existing-customer-cvr').on('input', (e) => {
			this.state.customer.cvr_number = $(e.target).val().trim();
		});

		$selectedDisplay.find('#existing-customer-company').on('input', (e) => {
			this.state.customer.company_name = $(e.target).val().trim();
		});

		this.$container.find('#btn-continue').prop('disabled', false);
	}

	showNewCustomerForm(initialName = '') {
		const $searchSection = this.$container.find('#customer-search-section');
		const $selectedDisplay = this.$container.find('#selected-customer-display');
		const $newForm = this.$container.find('#new-customer-form');

		$searchSection.hide();
		$selectedDisplay.hide();
		$newForm.show();

		// Pre-fill name if it looks like a name
		if (initialName && !initialName.includes('@')) {
			this.$container.find('#new-customer-name').val(initialName);
		} else if (initialName.includes('@')) {
			this.$container.find('#new-customer-email').val(initialName);
		}

		this.$container.find('#search-dropdown').removeClass('show');

		// Add change button to form
		if (!$newForm.find('#cancel-new-customer').length) {
			$newForm.prepend(`
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
					<h4 style="margin: 0; color: var(--heading-color);">New Customer</h4>
					<button class="change-customer-btn" id="cancel-new-customer">Search Existing</button>
				</div>
			`);
			$newForm.find('h4:last').remove();

			$newForm.find('#cancel-new-customer').on('click', () => {
				this.state.customer = null;
				$newForm.hide();
				$searchSection.show();
				this.$container.find('#customer-search').val('').focus();
				this.$container.find('#btn-continue').prop('disabled', true);
			});
		}

		// Enable continue button when required fields are filled
		const checkFormValid = () => {
			const name = this.$container.find('#new-customer-name').val().trim();
			const email = this.$container.find('#new-customer-email').val().trim();
			const phone = this.$container.find('#new-customer-phone').val().trim();
			this.$container.find('#btn-continue').prop('disabled', !name || !email || !phone);
		};

		this.$container.find('#new-customer-name, #new-customer-email, #new-customer-phone').off('input').on('input', checkFormValid);
		checkFormValid();
	}

	validateCustomerStep() {
		const $newForm = this.$container.find('#new-customer-form');

		if ($newForm.is(':visible')) {
			const name = this.$container.find('#new-customer-name').val().trim();
			const email = this.$container.find('#new-customer-email').val().trim();
			const phone = this.$container.find('#new-customer-phone').val().trim();
			const cvr = this.$container.find('#new-customer-cvr').val().trim();
			const company = this.$container.find('#new-customer-company').val().trim();

			if (!name) {
				frappe.msgprint('Please enter customer name');
				return false;
			}

			if (!email) {
				frappe.msgprint('Please enter customer email');
				return false;
			}

			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				frappe.msgprint('Please enter a valid email address');
				return false;
			}

			if (!phone) {
				frappe.msgprint('Please enter customer phone number');
				return false;
			}

			// Set customer as new
			this.state.customer = {
				id: null,
				name: name,
				email: email,
				phone: phone,
				cvr_number: cvr,
				company_name: company,
				isNew: true
			};
		}

		if (!this.state.customer) {
			frappe.msgprint('Please select or create a customer');
			return false;
		}

		// Validate service type is selected
		const serviceType = this.$container.find('#service-type').val();
		if (!serviceType) {
			frappe.msgprint('Please select a Service Type');
			return false;
		}

		return true;
	}

	collectCustomerData() {
		this.state.serviceType = this.$container.find('#service-type').val();
		this.state.meetingAgenda = this.$container.find('#meeting-agenda').val().trim();
		this.state.informCustomer = this.$container.find('#inform-customer').is(':checked');
	}

	renderStep6_Confirmation() {
		this.$container.html(`
			${this.getProgressStepsHTML()}

			<div class="back-link" id="back-to-step5">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
				Back to Customer Details
			</div>

			<div class="booking-header">
				<h2>Confirm Booking</h2>
				<p class="subtitle">Review the details before creating the meeting</p>
			</div>

			<div class="confirmation-section">
				<div class="confirmation-card">
					<h4>Meeting Details</h4>
					<div class="confirmation-item">
						<span class="label">Department</span>
						<span class="value">${this.state.departmentName}</span>
					</div>
					<div class="confirmation-item">
						<span class="label">Meeting Type</span>
						<span class="value">${this.state.meetingTypeName}</span>
					</div>
					<div class="confirmation-item">
						<span class="label">Date</span>
						<span class="value">${this.formatDate(this.state.selectedDate)}</span>
					</div>
					<div class="confirmation-item">
						<span class="label">Time</span>
						<span class="value">${this.state.selectedTimeDisplay}</span>
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
					<h4>Customer</h4>
					<div class="confirmation-item">
						<span class="label">Name</span>
						<span class="value">${this.state.customer.name}</span>
					</div>
					<div class="confirmation-item">
						<span class="label">Email</span>
						<span class="value">${this.state.customer.email}</span>
					</div>
					${this.state.customer.phone ? `
					<div class="confirmation-item">
						<span class="label">Phone</span>
						<span class="value">${this.state.customer.phone}</span>
					</div>
					` : ''}
					${this.state.customer.cvr_number ? `
					<div class="confirmation-item">
						<span class="label">CVR Number</span>
						<span class="value">${this.state.customer.cvr_number}</span>
					</div>
					` : ''}
					${this.state.customer.company_name ? `
					<div class="confirmation-item">
						<span class="label">Company Name</span>
						<span class="value">${this.state.customer.company_name}</span>
					</div>
					` : ''}
					<div class="confirmation-item">
						<span class="label">Notify Customer</span>
						<span class="value">${this.state.informCustomer ? 'Yes' : 'No'}</span>
					</div>
				</div>

				${this.state.meetingAgenda ? `
				<div class="confirmation-card">
					<h4>Meeting Agenda</h4>
					<p style="color: var(--text-color);">${this.state.meetingAgenda}</p>
				</div>
				` : ''}

				<div class="button-row">
					<button class="btn-secondary" id="btn-back">Back</button>
					<button class="btn-primary-custom" id="btn-submit">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
						Create Meeting
					</button>
				</div>
			</div>
		`);

		this.$container.find('#back-to-step5, #btn-back').on('click', () => {
			this.currentStep = 5;
			this.renderCurrentStep();
		});

		this.$container.find('#btn-submit').on('click', () => {
			this.submitBooking();
		});
	}

	async submitBooking() {
		const $submitBtn = this.$container.find('#btn-submit');
		$submitBtn.prop('disabled', true).html('<div class="spinner" style="width: 20px; height: 20px; margin: 0;"></div> Creating...');

		try {
			const bookingData = {
				department: this.state.department,
				meeting_type: this.state.meetingType,
				scheduled_date: this.state.selectedDate,
				scheduled_start_time: this.state.selectedTime,
				service_type: this.state.serviceType || undefined,
				meeting_agenda: this.state.meetingAgenda || undefined,
				send_email_notification: this.state.informCustomer
			};

			if (this.state.customer.isNew) {
				bookingData.customer_name = this.state.customer.name;
				bookingData.customer_email = this.state.customer.email;
				bookingData.customer_phone = this.state.customer.phone || undefined;
				bookingData.customer_cvr = this.state.customer.cvr_number || undefined;
				bookingData.customer_company = this.state.customer.company_name || undefined;
			} else {
				bookingData.customer_id = this.state.customer.id;
				// Include CVR and company name for existing customer updates
				bookingData.customer_cvr = this.state.customer.cvr_number || undefined;
				bookingData.customer_company = this.state.customer.company_name || undefined;
			}

			const response = await frappe.call({
				method: 'meeting_manager.meeting_manager.api.booking.create_self_booking',
				args: { booking_data: bookingData }
			});

			if (response.message && response.message.success) {
				this.renderSuccessState(response.message.booking_id);
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
			$submitBtn.prop('disabled', false).html(`
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
				Create Meeting
			`);
		}
	}

	renderSuccessState(bookingId) {
		this.$container.html(`
			<div class="success-state">
				<div class="success-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
				</div>
				<h2>Meeting Created Successfully!</h2>
				<p>Booking Reference: <strong>${bookingId}</strong></p>
				${this.state.informCustomer ? '<p>A confirmation email will be sent to the customer.</p>' : ''}
				<div class="button-row">
					<button class="btn-secondary" id="view-booking">View Booking</button>
					<button class="btn-primary-custom" id="book-another">Book Another Meeting</button>
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
			selectedDate: null,
			selectedTime: null,
			selectedTimeDisplay: '',
			customer: null,
			serviceType: '',
			meetingAgenda: '',
			customerNotes: '',
			informCustomer: false
		};
		this.meetingTypes = [];
		this.availableDates = [];
		this.availableSlots = [];
		this.currentMonth = new Date().getMonth() + 1;
		this.currentYear = new Date().getFullYear();
	}

	// API Methods
	async loadUserDepartments() {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_user_departments'
		});
		return response.message || [];
	}

	async loadMeetingTypes(department) {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_department_meeting_types_for_self_booking',
			args: { department }
		});
		this.meetingTypes = response.message || [];
		return this.meetingTypes;
	}

	async loadAvailableDates() {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_user_available_dates',
			args: {
				department: this.state.department,
				meeting_type: this.state.meetingType,
				month: this.currentMonth,
				year: this.currentYear
			}
		});
		return response.message?.available_dates || [];
	}

	async loadTimeSlots() {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_user_available_slots',
			args: {
				department: this.state.department,
				meeting_type: this.state.meetingType,
				date: this.state.selectedDate
			}
		});
		return response.message?.available_slots || [];
	}

	async searchCustomers(query) {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.search_customers',
			args: { query }
		});
		return response.message || [];
	}

	async getRecentCustomers() {
		const response = await frappe.call({
			method: 'meeting_manager.meeting_manager.api.booking.get_recent_customers',
			args: { limit: 10 }
		});
		return response.message || [];
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
		// Refresh when page is shown
		this.render();
	}
}
