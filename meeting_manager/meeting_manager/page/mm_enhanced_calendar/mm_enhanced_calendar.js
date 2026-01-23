/**
 * Enhanced Calendar Page - Role-Based Timeline Calendar
 *
 * Features:
 * - Role-based access control (System Manager > Leader > Member)
 * - Multi-department toggles
 * - Focus mode with meeting type filtering
 * - Status and Service filters
 * - Permission-based drag/drop
 */

frappe.pages['mm-enhanced-calendar'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Enhanced Calendar'),
        single_column: true
    });

    wrapper.page = page;
    wrapper.enhancedCalendar = new EnhancedCalendarController(wrapper, page);
};

frappe.pages['mm-enhanced-calendar'].on_page_show = function(wrapper) {
    if (wrapper.enhancedCalendar && wrapper.enhancedCalendar.calendar) {
        wrapper.enhancedCalendar.calendar.updateSize();
    }
};

/**
 * Main Controller Class
 */
class EnhancedCalendarController {
    constructor(wrapper, page) {
        this.wrapper = wrapper;
        this.page = page;
        this.$container = $(page.main);

        // State
        this.userContext = null;
        this.calendar = null;
        // All available statuses - select all by default
        this.allStatuses = [
            'New Booking', 'New Appointment', 'Booking Started', 'Sale Approved',
            'Booking Approved Not Sale', 'Call Customer About Sale', 'No Answer 1-3',
            'No Answer 4-5', 'Customer Unsure', 'No Contact About Offer', 'Cancelled',
            'Optimising Not Possible', 'Not Possible', 'Rebook', 'Rebook Earlier',
            'Consent Sent Awaiting'
        ];
        this.filterState = {
            mode: 'multi',
            departments: [],
            focusDepartment: null,
            meetingTypes: [],
            statuses: [...this.allStatuses], // Select all statuses by default
            services: []
        };
        this.resources = [];

        this.init();
    }

    async init() {
        this.showLoading();

        try {
            // Load FullCalendar from CDN
            await this.loadFullCalendar();

            // Get user context
            this.userContext = await this.getUserContext();

            if (!this.userContext || this.userContext.role === 'guest') {
                this.showError(
                    __('Access Denied'),
                    __('You do not have permission to view this calendar. Please contact your administrator if you believe this is an error.'),
                    'error'
                );
                return;
            }

            if (!this.userContext.accessible_departments || this.userContext.accessible_departments.length === 0) {
                this.showError(
                    __('No Active Departments'),
                    __('You are not assigned to any active departments. To use the calendar, you need to be added as a member of at least one department. Please contact your administrator.'),
                    'empty'
                );
                return;
            }

            // Initialize filter state with all departments selected
            this.filterState.departments = this.userContext.accessible_departments.map(d => d.name);

            // Build UI
            this.buildUI();

            // Initialize calendar
            await this.initCalendar();

        } catch (error) {
            console.error('Enhanced Calendar init error:', error);
            this.showError(__('Error'), __('Failed to load the calendar. Please refresh the page.'));
        }
    }

    showLoading() {
        this.$container.html(`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; color: #6b7280;">
                <div style="width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: ec-spin 0.8s linear infinite;"></div>
                <p style="margin-top: 12px;">${__('Loading Enhanced Calendar...')}</p>
            </div>
            <style>
                @keyframes ec-spin { to { transform: rotate(360deg); } }
            </style>
        `);
    }

    showError(title, message, icon = 'error') {
        const icons = {
            error: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>`,
            info: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`,
            warning: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`,
            empty: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>`
        };

        this.$container.html(`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; text-align: center; padding: 40px; background: #f8fafc;">
                <div style="margin-bottom: 20px;">
                    ${icons[icon] || icons.error}
                </div>
                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 20px; font-weight: 600;">${title}</h3>
                <p style="color: #6b7280; margin: 0 0 24px; max-width: 400px; line-height: 1.5;">${message}</p>
                <button class="btn btn-primary" onclick="location.reload()" style="padding: 10px 24px; border-radius: 8px;">${__('Refresh')}</button>
            </div>
        `);
    }

    loadFullCalendar() {
        return new Promise((resolve, reject) => {
            if (window.FullCalendar && window.FullCalendar.Calendar) {
                resolve();
                return;
            }

            // Load CSS
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://cdn.jsdelivr.net/npm/fullcalendar-scheduler@6.1.10/index.global.min.css';
            document.head.appendChild(css);

            // Load JS
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar-scheduler@6.1.10/index.global.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load FullCalendar'));
            document.head.appendChild(script);
        });
    }

    async getUserContext() {
        const response = await frappe.call({
            method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_user_context'
        });
        return response.message;
    }

    buildUI() {
        this.$container.empty();

        // Add CSS
        this.addStyles();

        // Build HTML structure with modern Bootstrap-style layout
        this.$container.html(`
            <div class="ec-page">
                <!-- Filter Panel -->
                <div class="ec-filter-panel">
                    <!-- Row 1: Departments -->
                    <div class="ec-row">
                        <div class="ec-col ec-col-12">
                            <div class="ec-filter-group">
                                <div class="ec-filter-header">
                                    <span class="ec-filter-title">${__('Departments')}</span>
                                    <div class="ec-header-actions">
                                        <button class="ec-select-all-btn" id="ec-select-all">${__('Select All')}</button>
                                        <button class="ec-btn ec-btn-reload" id="ec-reload-btn">
                                            <svg class="ec-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M21 2v6h-6"></path>
                                                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                                                <path d="M3 22v-6h6"></path>
                                                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                                            </svg>
                                            ${__('Reload')}
                                        </button>
                                    </div>
                                </div>
                                <div class="ec-dept-cards" id="ec-dept-toggles">
                                    ${this.userContext.accessible_departments.map(dept => `
                                        <label class="ec-dept-card ${dept.is_leader ? 'ec-dept-leader' : ''}" data-dept="${dept.name}">
                                            <input type="checkbox" data-dept="${dept.name}" checked>
                                            <div class="ec-dept-content">
                                                <span class="ec-dept-name">${dept.department_name}</span>
                                            </div>
                                            <div class="ec-dept-check">
                                                <svg class="ec-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            </div>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Row 2: Filters -->
                    <div class="ec-row ec-row-filters">
                        <div class="ec-col ec-col-4">
                            <div class="ec-filter-item">
                                <label class="ec-label">${__('Focus Mode')}</label>
                                <div class="ec-select-wrapper">
                                    <select id="ec-focus-select" class="ec-select">
                                        <option value="">${__('All Departments')}</option>
                                        ${this.userContext.accessible_departments.map(dept => `
                                            <option value="${dept.name}">${dept.department_name}</option>
                                        `).join('')}
                                    </select>
                                    <svg class="ec-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                <span class="ec-hint">${__('Focus on a single department to filter by meeting types')}</span>
                            </div>
                        </div>
                        <div class="ec-col ec-col-4">
                            <div class="ec-filter-item">
                                <label class="ec-label">${__('Status')}</label>
                                <div class="ec-status-toggles" id="ec-status-toggles">
                                    <button class="ec-status-btn active" data-status="New Booking" style="--status-color: #1e40af;">
                                        <span class="ec-status-dot" style="background-color: #1e40af;"></span>
                                        ${__('New Booking')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="New Appointment" style="--status-color: #ec4899;">
                                        <span class="ec-status-dot" style="background-color: #ec4899;"></span>
                                        ${__('New Appointment')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Booking Started" style="--status-color: #60a5fa;">
                                        <span class="ec-status-dot" style="background-color: #60a5fa;"></span>
                                        ${__('Booking Started')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Sale Approved" style="--status-color: #22c55e;">
                                        <span class="ec-status-dot" style="background-color: #22c55e;"></span>
                                        ${__('Sale Approved')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Booking Approved Not Sale" style="--status-color: #ef4444;">
                                        <span class="ec-status-dot" style="background-color: #ef4444;"></span>
                                        ${__('Approved (No Sale)')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Call Customer About Sale" style="--status-color: #f97316;">
                                        <span class="ec-status-dot" style="background-color: #f97316;"></span>
                                        ${__('Call Customer')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="No Answer 1-3" style="--status-color: #9ca3af;">
                                        <span class="ec-status-dot" style="background-color: #9ca3af;"></span>
                                        ${__('No Answer 1-3')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="No Answer 4-5" style="--status-color: #964B00;">
                                        <span class="ec-status-dot" style="background-color: #964B00;"></span>
                                        ${__('No Answer 4-5')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Customer Unsure" style="--status-color: #7dd3fc;">
                                        <span class="ec-status-dot" style="background-color: #7dd3fc;"></span>
                                        ${__('Customer Unsure')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="No Contact About Offer" style="--status-color: #b91c1c;">
                                        <span class="ec-status-dot" style="background-color: #b91c1c;"></span>
                                        ${__('No Contact Offer')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Cancelled" style="--status-color: #d1d5db;">
                                        <span class="ec-status-dot" style="background-color: #d1d5db;"></span>
                                        ${__('Cancelled')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Optimising Not Possible" style="--status-color: #fbbf24;">
                                        <span class="ec-status-dot" style="background-color: #fbbf24;"></span>
                                        ${__('Optimising N/P')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Not Possible" style="--status-color: #dc2626;">
                                        <span class="ec-status-dot" style="background-color: #dc2626;"></span>
                                        ${__('Not Possible')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Rebook" style="--status-color: #a855f7;">
                                        <span class="ec-status-dot" style="background-color: #a855f7;"></span>
                                        ${__('Rebook')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Rebook Earlier" style="--status-color: #9333ea;">
                                        <span class="ec-status-dot" style="background-color: #9333ea;"></span>
                                        ${__('Rebook Earlier')}
                                    </button>
                                    <button class="ec-status-btn active" data-status="Consent Sent Awaiting" style="--status-color: #3b82f6;">
                                        <span class="ec-status-dot" style="background-color: #3b82f6;"></span>
                                        ${__('Consent Awaiting')}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="ec-col ec-col-4">
                            <div class="ec-filter-item">
                                <label class="ec-label">${__('Service Type')}</label>
                                <div class="ec-select-wrapper">
                                    <select id="ec-service-select" class="ec-select">
                                        <option value="">${__('All Services')}</option>
                                        <option value="Business">${__('Business')}</option>
                                        <option value="Business Extended">${__('Business Extended')}</option>
                                        <option value="Business Rebook">${__('Business Rebook')}</option>
                                        <option value="New Setup Business">${__('New Setup Business')}</option>
                                        <option value="Private / Business Customer">${__('Private / Business')}</option>
                                        <option value="Private New Sale">${__('Private New Sale')}</option>
                                        <option value="Private Self Book">${__('Private Self Book')}</option>
                                    </select>
                                    <svg class="ec-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Row 3: Meeting Types (shown in focus mode) -->
                    <div class="ec-row ec-row-meeting-types" id="ec-mt-row" style="display: none;">
                        <div class="ec-col ec-col-12">
                            <div class="ec-filter-item">
                                <label class="ec-label">${__('Meeting Types')}</label>
                                <div class="ec-mt-chips" id="ec-mt-chips"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Calendar Container -->
                <div class="ec-calendar-container" id="ec-calendar"></div>
            </div>
        `);

        // Attach event handlers
        this.attachHandlers();
    }

    addStyles() {
        if (document.getElementById('ec-styles')) return;

        const style = document.createElement('style');
        style.id = 'ec-styles';
        style.textContent = `
            /* Base */
            .ec-page {
                background: #f8fafc;
                min-height: calc(100vh - 100px);
            }

            /* Grid System */
            .ec-row {
                display: flex;
                flex-wrap: wrap;
                margin: 0 -12px;
            }
            .ec-col {
                padding: 0 12px;
                box-sizing: border-box;
            }
            .ec-col-3 { width: 25%; }
            .ec-col-4 { width: 33.333%; }
            .ec-col-6 { width: 50%; }
            .ec-col-9 { width: 75%; }
            .ec-col-12 { width: 100%; }

            @media (max-width: 992px) {
                .ec-col-3, .ec-col-4, .ec-col-6, .ec-col-9 { width: 100%; margin-bottom: 16px; }
            }

            /* Filter Panel */
            .ec-filter-panel {
                background: #ffffff;
                border-bottom: 1px solid #e2e8f0;
                padding: 20px 24px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }

            /* Filter Group */
            .ec-filter-group {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
            }
            .ec-filter-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .ec-filter-title {
                font-size: 13px;
                font-weight: 600;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .ec-header-actions {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .ec-select-all-btn {
                background: none;
                border: none;
                color: #3b82f6;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .ec-select-all-btn:hover {
                background: #eff6ff;
            }

            /* Department Cards */
            .ec-dept-cards {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            .ec-dept-card {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                background: #ffffff;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 160px;
            }
            .ec-dept-card:hover {
                border-color: #94a3b8;
            }
            .ec-dept-card input {
                display: none;
            }
            .ec-dept-card input:checked + .ec-dept-content + .ec-dept-check {
                opacity: 1;
                transform: scale(1);
            }
            .ec-dept-card:has(input:checked) {
                border-color: #3b82f6;
                background: #eff6ff;
            }
            .ec-dept-card:has(input:disabled),
            .ec-dept-card.ec-disabled {
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }
            .ec-dept-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .ec-dept-name {
                font-size: 13px;
                font-weight: 500;
                color: #141414;
            }
            .ec-dept-check {
                width: 22px;
                height: 22px;
                background: #3b82f6;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transform: scale(0.8);
                transition: all 0.2s ease;
            }
            .ec-check-icon {
                width: 14px;
                height: 14px;
                stroke: #ffffff;
            }

            /* Buttons */
            .ec-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .ec-btn-icon {
                width: 14px;
                height: 14px;
            }
            .ec-btn-reload {
                background: #ffffff;
                color: #475569;
                border: 1px solid #e2e8f0;
            }
            .ec-btn-reload:hover {
                background: #f1f5f9;
                border-color: #3b82f6;
                color: #3b82f6;
            }

            /* Filter Row */
            .ec-row-filters {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
            }

            /* Filter Items */
            .ec-filter-item {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .ec-label {
                font-size: 12px;
                font-weight: 600;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .ec-hint {
                font-size: 11px;
                color: #94a3b8;
                margin-top: 4px;
            }

            /* Custom Select */
            .ec-select-wrapper {
                position: relative;
            }
            .ec-select {
                width: 100%;
                padding: 10px 40px 10px 14px;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                font-size: 13px;
                color: #141414;
                appearance: none;
                cursor: pointer;
                transition: all 0.2s;
            }
            .ec-select:hover {
                border-color: #cbd5e1;
            }
            .ec-select:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            .ec-select-arrow {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                width: 18px;
                height: 18px;
                stroke: #64748b;
                pointer-events: none;
            }

            /* Status Toggles */
            .ec-status-toggles {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            .ec-status-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 7px 12px;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                color: #64748b;
                cursor: pointer;
                transition: all 0.2s;
            }
            .ec-status-btn:hover {
                border-color: #cbd5e1;
            }
            .ec-status-btn.active {
                background: #f8fafc;
                border-color: #3b82f6;
                color: #141414;
            }
            .ec-status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            .ec-status-btn {
                white-space: nowrap;
            }

            /* Meeting Types Row */
            .ec-row-meeting-types {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
            }
            .ec-mt-chips {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .ec-mt-chip {
                padding: 8px 16px;
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 20px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                color: #475569;
                transition: all 0.2s;
            }
            .ec-mt-chip:hover {
                background: #e2e8f0;
            }
            .ec-mt-chip.active {
                background: #3b82f6;
                border-color: #3b82f6;
                color: #ffffff;
            }

            /* Calendar Container */
            .ec-calendar-container {
                padding: 24px;
                background: #ffffff;
                margin: 20px;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            /* Calendar Event Styles */
            .fc-event.ec-team-meeting {
                border-left: 4px solid #8b5cf6 !important;
            }
            .fc-event.ec-non-draggable {
                opacity: 0.8;
                cursor: default !important;
            }
            .fc-event.ec-own-booking {
                box-shadow: inset 0 0 0 2px rgba(16, 185, 129, 0.4);
            }
            /* Participant events have dashed border to indicate read-only */
            .fc-event.participant-event {
                border-style: dashed !important;
                opacity: 0.9;
            }

            /* Resource Label */
            .ec-resource-self {
                color: #10b981;
                font-weight: 600;
            }

            /* FullCalendar Button Styling */
            .ec-calendar-container .fc-button {
                background-color: #ffffff;
                border: 1px solid #e5e7eb;
                color: #1f2937;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                text-align: center;
            }

            .ec-calendar-container .fc-button:hover {
                background-color: #f3f4f6;
                border-color: #e5e7eb;
                box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
            }

            .ec-calendar-container .fc-button:focus {
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                outline: none;
            }

            .ec-calendar-container .fc-button-active {
                background-color: #3b82f6 !important;
                color: white !important;
                border-color: #3b82f6 !important;
            }

            .ec-calendar-container .fc-button-active:hover {
                background-color: #2563eb !important;
                border-color: #2563eb !important;
            }

            /* Button group styling */
            .ec-calendar-container .fc-button-group {
                gap: 4px;
                display: inline-flex;
            }

            .ec-calendar-container .fc-button-group .fc-button {
                border-radius: 6px;
                margin: 0;
            }

            /* Navigation buttons (prev/next) */
            .ec-calendar-container .fc-prev-button,
            .ec-calendar-container .fc-next-button {
                padding: 6px 10px;
                min-width: 36px;
            }

            /* Current and Jump to Date buttons */
            .ec-calendar-container .fc-current-button,
            .ec-calendar-container .fc-jumpToDate-button {
                padding: 6px 16px;
            }

            /* Toggle Orientation button */
            .ec-calendar-container .fc-toggleOrientation-button {
                padding: 6px 12px;
                background-color: #6366f1 !important;
                border-color: #4f46e5 !important;
                color: white !important;
                font-weight: 500;
            }

            .ec-calendar-container .fc-toggleOrientation-button:hover {
                background-color: #4f46e5 !important;
                border-color: #4338ca !important;
            }

            /* Toolbar styling */
            .ec-calendar-container .fc-toolbar {
                margin-bottom: 20px;
                padding: 12px 0;
            }

            .ec-calendar-container .fc-toolbar-title {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
            }

            .ec-calendar-container .fc-toolbar-chunk {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .ec-calendar-container .fc-button {
                    font-size: 11px;
                    padding: 4px 8px;
                }

                .ec-calendar-container .fc-toolbar-title {
                    font-size: 16px;
                }
            }

            /* Business Hours / Availability Styling - Base rules */
            .ec-nonworking-block,
            .ec-unavailable-block,
            .ec-dayoff-block {
                pointer-events: none !important;
                cursor: default !important;
                opacity: 0.5 !important;
            }

            /* Non-working hours styling (works for both timeline and timegrid) */
            .ec-nonworking-block {
                background-color: #cbd5e1 !important;
            }

            /* Day off styling */
            .ec-dayoff-block {
                background-color: #e2e8f0 !important;
            }

            /* Unavailable styling */
            .ec-unavailable-block {
                background-color: #fecaca !important;
            }

            /* Blocked Slot Styling - BLACK (works for both views) */
            .ec-blocked-slot {
                background-color: #1a1a1a !important;
                border-color: #000000 !important;
                opacity: 0.9 !important;
                cursor: pointer !important;
                pointer-events: auto !important;
                z-index: 5 !important;
            }

            .ec-blocked-slot .fc-event-main {
                color: #ffffff !important;
                font-weight: 500;
            }

            .ec-blocked-slot:hover {
                opacity: 1 !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
            }

            /* Override default FullCalendar background event styling */
            .fc-bg-event {
                opacity: 1 !important;
                pointer-events: none;
            }

            /* Resource TimeGrid specific styling */
            .fc-timegrid-event-harness {
                z-index: 1;
            }

            /* Background events in timegrid view */
            .fc-timegrid-bg-harness .fc-bg-event {
                opacity: 1 !important;
                z-index: 0 !important;
            }

            /* Resource column headers in timegrid */
            .fc-col-header-cell {
                background-color: #f8fafc;
                font-weight: 600;
                padding: 8px 4px !important;
            }

            /* Time slots on left axis */
            .fc-timegrid-slot-label {
                font-size: 12px;
                color: #64748b;
            }

            /* Force visibility on all background events in the calendar container */
            .ec-calendar-container .fc-bg-event {
                opacity: 1 !important;
            }

            /* TimeGrid event styling */
            .ec-calendar-container .fc-timegrid-event {
                border-radius: 4px;
                margin: 1px;
            }

            .ec-calendar-container .fc-event-main {
                display: flex;
                align-items: flex-start;
                padding: 4px 6px;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 11px;
            }

            /* Resource columns - equal width distribution */
            .fc-timegrid-cols > table {
                width: 100%;
            }

            /* Ensure columns have minimum width */
            .fc-timegrid-col {
                min-width: 120px;
            }

            /* Ensure the event main frame fills properly */
            .ec-calendar-container .fc-event-main-frame {
                height: 100%;
                display: flex;
                align-items: center;
                overflow: hidden;
                width: 100%;
            }

            /* Event title text handling */
            .ec-calendar-container .fc-event-title {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
            }

            .ec-calendar-container .fc-timeline-event .fc-event-title-container {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* Resource rows should have consistent height */
            .ec-calendar-container .fc-datagrid-cell-frame {
                height: 50px !important;
            }

            .ec-calendar-container .fc-datagrid-cell-cushion {
                display: flex;
                align-items: center;
                height: 100%;
            }

            /* Tooltip Styles */
            .ec-tooltip {
                position: fixed;
                z-index: 99999;
                background: #1f2937;
                color: #ffffff;
                border-radius: 8px;
                padding: 12px 16px;
                font-size: 13px;
                line-height: 1.5;
                max-width: 320px;
                min-width: 240px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2), 0 4px 10px rgba(0, 0, 0, 0.1);
                pointer-events: auto;
                opacity: 0;
                transform: translateY(5px);
                transition: opacity 0.15s ease, transform 0.15s ease;
            }

            .ec-tooltip.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .ec-tooltip-close {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 20px;
                height: 20px;
                border: none;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                color: rgba(255, 255, 255, 0.6);
                transition: background 0.15s ease, color 0.15s ease;
            }

            .ec-tooltip-close:hover {
                background: rgba(255, 255, 255, 0.2);
                color: #ffffff;
            }

            .ec-tooltip-close svg {
                width: 12px;
                height: 12px;
            }

            .ec-tooltip-header {
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 8px;
                padding-bottom: 8px;
                padding-right: 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                color: #ffffff;
            }

            .ec-tooltip-row {
                display: flex;
                align-items: flex-start;
                margin-bottom: 6px;
            }

            .ec-tooltip-row:last-child {
                margin-bottom: 0;
            }

            .ec-tooltip-icon {
                width: 16px;
                height: 16px;
                margin-right: 8px;
                flex-shrink: 0;
                opacity: 0.7;
            }

            .ec-tooltip-label {
                color: #9ca3af;
                margin-right: 6px;
                flex-shrink: 0;
            }

            .ec-tooltip-value {
                color: #ffffff;
                word-break: break-word;
            }

            .ec-tooltip-status {
                display: inline-flex;
                align-items: center;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
            }

            .ec-tooltip-status.confirmed {
                background: rgba(16, 185, 129, 0.2);
                color: #34d399;
            }

            .ec-tooltip-status.pending {
                background: rgba(245, 158, 11, 0.2);
                color: #fbbf24;
            }

            .ec-tooltip-status.cancelled {
                background: rgba(239, 68, 68, 0.2);
                color: #f87171;
            }

            .ec-tooltip-status.completed {
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
            }

            .ec-tooltip-badge {
                display: inline-flex;
                align-items: center;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                margin-left: 6px;
            }

            .ec-tooltip-badge.team {
                background: rgba(139, 92, 246, 0.2);
                color: #a78bfa;
            }

            .ec-tooltip-badge.customer {
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
            }

            /* Confirmation Dialog Styles */
            .ec-confirmation-dialog .modal-content {
                border-radius: 12px;
                overflow: hidden;
            }

            .ec-confirmation-dialog .modal-header {
                background: #f8fafc;
                border-bottom: 1px solid #e5e7eb;
                padding: 16px 20px;
            }

            .ec-confirmation-dialog .modal-title {
                font-weight: 600;
                font-size: 18px;
                color: #1f2937;
            }

            .ec-confirmation-dialog .modal-body {
                padding: 0;
            }

            .ec-confirmation-dialog .modal-footer {
                background: #f8fafc;
                border-top: 1px solid #e5e7eb;
                padding: 12px 20px;
            }

            .ec-confirmation-content {
                padding: 0;
            }

            .ec-confirm-header {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                padding: 20px;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-left: 4px solid #3b82f6;
            }

            .ec-confirm-icon {
                flex-shrink: 0;
                width: 48px;
                height: 48px;
                border-radius: 12px;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            }

            .ec-confirm-icon svg {
                width: 24px;
                height: 24px;
            }

            .ec-confirm-header-text {
                flex: 1;
            }

            .ec-confirm-header-text p {
                margin: 0;
                color: #4b5563;
                font-size: 14px;
                line-height: 1.5;
            }

            .ec-confirm-section {
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
            }

            .ec-confirm-section:last-child {
                border-bottom: none;
            }

            .ec-confirm-section-header {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 14px;
                color: #374151;
                margin-bottom: 16px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .ec-confirm-section-header svg {
                color: #6b7280;
            }

            .ec-confirm-section-body {
                background: #f9fafb;
                border-radius: 8px;
                padding: 12px 16px;
            }

            .ec-confirm-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #e5e7eb;
            }

            .ec-confirm-row:last-child {
                border-bottom: none;
            }

            .ec-confirm-label {
                color: #6b7280;
                font-size: 13px;
            }

            .ec-confirm-value {
                color: #1f2937;
                font-size: 14px;
                text-align: right;
            }

            .ec-confirm-badge {
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
            }

            .ec-confirm-badge.team {
                background: rgba(139, 92, 246, 0.15);
                color: #7c3aed;
            }

            .ec-confirm-badge.customer {
                background: rgba(59, 130, 246, 0.15);
                color: #2563eb;
            }

            .ec-confirm-status {
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
            }

            .ec-confirm-status.confirmed {
                background: rgba(16, 185, 129, 0.15);
                color: #059669;
            }

            .ec-confirm-status.pending {
                background: rgba(245, 158, 11, 0.15);
                color: #d97706;
            }

            .ec-confirm-status.cancelled {
                background: rgba(239, 68, 68, 0.15);
                color: #dc2626;
            }

            .ec-confirm-status.completed {
                background: rgba(59, 130, 246, 0.15);
                color: #2563eb;
            }

            /* Changes Grid */
            .ec-confirm-changes-grid {
                display: flex;
                align-items: stretch;
                gap: 12px;
            }

            .ec-confirm-change-box {
                flex: 1;
                background: #f9fafb;
                border-radius: 8px;
                padding: 16px;
                border: 1px solid #e5e7eb;
            }

            .ec-confirm-change-label {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #6b7280;
                margin-bottom: 12px;
            }

            .ec-confirm-change-content {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .ec-confirm-change-content.from {
                opacity: 0.7;
            }

            .ec-confirm-change-content.to {
                background: white;
                margin: -12px;
                margin-top: 0;
                padding: 12px;
                border-radius: 0 0 7px 7px;
                border-top: 2px dashed #e5e7eb;
            }

            .ec-confirm-change-date {
                font-weight: 600;
                font-size: 14px;
                color: #1f2937;
            }

            .ec-confirm-change-time {
                font-size: 16px;
                font-weight: 500;
                color: #374151;
            }

            .ec-confirm-change-duration {
                font-size: 13px;
                color: #6b7280;
            }

            .ec-confirm-change-host {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 15px;
                font-weight: 500;
                color: #374151;
            }

            .ec-confirm-change-host svg {
                color: #6b7280;
            }

            .ec-confirm-change-arrow {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                color: #9ca3af;
            }

            /* Highlight changed values */
            .ec-confirm-change-content.to .changed {
                color: #059669;
                font-weight: 600;
            }

            .ec-confirm-change-content.to .ec-confirm-change-host.changed {
                color: #7c3aed;
            }

            .ec-confirm-change-content.to .ec-confirm-change-host.changed svg {
                color: #7c3aed;
            }

            /* Responsive adjustments for dialog */
            @media (max-width: 576px) {
                .ec-confirm-changes-grid {
                    flex-direction: column;
                }

                .ec-confirm-change-arrow {
                    transform: rotate(90deg);
                    padding: 8px 0;
                }

                .ec-confirm-header {
                    flex-direction: column;
                    align-items: flex-start;
                }
            }

            /* Slot Selection Styles */
            .fc-highlight {
                background: rgba(59, 130, 246, 0.15) !important;
                border: 2px dashed #3b82f6 !important;
                border-radius: 4px;
            }

            /* Slot Info Card in Booking Dialog */
            .ec-slot-info-card {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border: 1px solid #bae6fd;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 20px;
            }

            .ec-slot-info-header {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 600;
                color: #0369a1;
                margin-bottom: 12px;
            }

            .ec-slot-info-header svg {
                stroke: #0369a1;
            }

            .ec-slot-info-body {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .ec-slot-info-row {
                display: flex;
                align-items: center;
            }

            .ec-slot-info-label {
                width: 80px;
                font-size: 12px;
                font-weight: 500;
                color: #64748b;
                text-transform: uppercase;
            }

            .ec-slot-info-value {
                flex: 1;
                font-size: 14px;
                color: #141414;
            }

            /* Cursor for selectable areas (works for both timeline and timegrid) */
            .fc-timeline-lane:not(.ec-nonworking-block):not(.ec-unavailable-block):not(.ec-dayoff-block),
            .fc-timegrid-col:not(.ec-nonworking-block):not(.ec-unavailable-block):not(.ec-dayoff-block) {
                cursor: pointer;
            }

            /* ===== DARK MODE SUPPORT ===== */
            [data-theme="dark"] .ec-page {
                background: #0a0a0a;
            }

            /* Dark mode - Filter Panel */
            [data-theme="dark"] .ec-filter-panel {
                background: #111111;
                border-bottom-color: #222222;
            }

            [data-theme="dark"] .ec-filter-group {
                background: #0a0a0a;
                border-color: #222222;
            }

            [data-theme="dark"] .ec-filter-title {
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-select-all-btn {
                color: #60a5fa;
            }

            [data-theme="dark"] .ec-select-all-btn:hover {
                background: rgba(59, 130, 246, 0.15);
            }

            /* Dark mode - Department Cards */
            [data-theme="dark"] .ec-dept-card {
                background: #0a0a0a;
                border-color: #222222;
            }

            [data-theme="dark"] .ec-dept-card:hover {
                border-color: #475569;
            }

            [data-theme="dark"] .ec-dept-card:has(input:checked) {
                border-color: #3b82f6;
                background: rgba(59, 130, 246, 0.15);
            }

            [data-theme="dark"] .ec-dept-name {
                color: #e2e8f0;
            }

            /* Dark mode - Buttons */
            [data-theme="dark"] .ec-btn-reload {
                background: #0a0a0a;
                color: #94a3b8;
                border-color: #222222;
            }

            [data-theme="dark"] .ec-btn-reload:hover {
                background: #222222;
                border-color: #3b82f6;
                color: #60a5fa;
            }

            /* Dark mode - Filter Items */
            [data-theme="dark"] .ec-label {
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-hint {
                color: #64748b;
            }

            [data-theme="dark"] .ec-row-filters {
                border-top-color: #222222;
            }

            /* Dark mode - Custom Select */
            [data-theme="dark"] .ec-select {
                background: #0a0a0a;
                border-color: #222222;
                color: #e2e8f0;
            }

            [data-theme="dark"] .ec-select:hover {
                border-color: #475569;
            }

            [data-theme="dark"] .ec-select:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
            }

            [data-theme="dark"] .ec-select-arrow {
                stroke: #94a3b8;
            }

            /* Dark mode - Status Toggles */
            [data-theme="dark"] .ec-status-btn {
                background: #0a0a0a;
                border-color: #222222;
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-status-btn:hover {
                border-color: #475569;
            }

            [data-theme="dark"] .ec-status-btn.active {
                background: rgba(59, 130, 246, 0.15);
                border-color: #3b82f6;
                color: #e2e8f0;
            }

            /* Dark mode - Meeting Type Chips */
            [data-theme="dark"] .ec-row-meeting-types {
                border-top-color: #222222;
            }

            [data-theme="dark"] .ec-mt-chip {
                background: #0a0a0a;
                border-color: #222222;
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-mt-chip:hover {
                background: #222222;
            }

            [data-theme="dark"] .ec-mt-chip.active {
                background: #3b82f6;
                border-color: #3b82f6;
                color: #ffffff;
            }

            /* Dark mode - Calendar Container */
            [data-theme="dark"] .ec-calendar-container {
                background: #111111;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            }

            /* Dark mode - FullCalendar */
            [data-theme="dark"] .ec-calendar-container .fc-button {
                background-color: #0a0a0a;
                border-color: #222222;
                color: #e2e8f0;
            }

            [data-theme="dark"] .ec-calendar-container .fc-button:hover {
                background-color: #222222;
                border-color: #475569;
            }

            [data-theme="dark"] .ec-calendar-container .fc-button-active {
                background-color: #3b82f6 !important;
                color: white !important;
                border-color: #3b82f6 !important;
            }

            /* Dark mode - Toggle Orientation button */
            [data-theme="dark"] .ec-calendar-container .fc-toggleOrientation-button {
                background-color: #4f46e5 !important;
                border-color: #6366f1 !important;
            }

            [data-theme="dark"] .ec-calendar-container .fc-toggleOrientation-button:hover {
                background-color: #6366f1 !important;
                border-color: #818cf8 !important;
            }

            [data-theme="dark"] .ec-calendar-container .fc-toolbar-title {
                color: #e2e8f0;
            }

            /* Dark mode - FullCalendar Grid */
            [data-theme="dark"] .ec-calendar-container .fc-theme-standard td,
            [data-theme="dark"] .ec-calendar-container .fc-theme-standard th {
                border-color: #222222;
            }

            [data-theme="dark"] .ec-calendar-container .fc-theme-standard .fc-scrollgrid {
                border-color: #222222;
            }

            [data-theme="dark"] .ec-calendar-container .fc-col-header-cell {
                background: #0a0a0a;
            }

            [data-theme="dark"] .ec-calendar-container .fc-col-header-cell-cushion {
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-calendar-container .fc-datagrid-cell {
                background: #111111;
            }

            [data-theme="dark"] .ec-calendar-container .fc-datagrid-cell-cushion {
                color: #e2e8f0;
            }

            [data-theme="dark"] .ec-calendar-container .fc-timegrid-slot,
            [data-theme="dark"] .ec-calendar-container .fc-timeline-slot {
                background: #111111;
            }

            [data-theme="dark"] .ec-calendar-container .fc-timegrid-slot-label,
            [data-theme="dark"] .ec-calendar-container .fc-timeline-slot-cushion {
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-calendar-container .fc-col-header-cell {
                background: #0a0a0a;
                color: #e2e8f0;
            }

            [data-theme="dark"] .ec-calendar-container .fc-resource-timeline-divider {
                background: #222222;
            }

            /* Dark mode - Non-working/unavailable blocks */
            [data-theme="dark"] .ec-nonworking-block {
                background-color: #374151 !important;
            }

            [data-theme="dark"] .ec-dayoff-block {
                background-color: #1f2937 !important;
            }

            [data-theme="dark"] .ec-unavailable-block {
                background-color: #7f1d1d !important;
            }

            /* Dark mode - Blocked slots (stay black in dark mode) */
            [data-theme="dark"] .ec-blocked-slot {
                background-color: #0a0a0a !important;
                border-color: #000000 !important;
            }

            /* Dark mode - Tooltip */
            [data-theme="dark"] .ec-tooltip {
                background: #141414;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.3);
            }

            [data-theme="dark"] .ec-tooltip-header {
                border-bottom-color: rgba(255, 255, 255, 0.1);
            }

            /* Dark mode - Confirmation Dialog */
            [data-theme="dark"] .ec-confirmation-dialog .modal-content {
                background: #111111;
            }

            [data-theme="dark"] .ec-confirmation-dialog .modal-header {
                background: #0a0a0a;
                border-bottom-color: #222222;
            }

            [data-theme="dark"] .ec-confirmation-dialog .modal-title {
                color: #e2e8f0;
            }

            [data-theme="dark"] .ec-confirmation-dialog .modal-footer {
                background: #0a0a0a;
                border-top-color: #222222;
            }

            [data-theme="dark"] .ec-confirm-header {
                background: linear-gradient(135deg, #0a0a0a 0%, #111111 100%);
            }

            [data-theme="dark"] .ec-confirm-icon {
                background: #222222;
            }

            [data-theme="dark"] .ec-confirm-header-text p {
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-confirm-section {
                border-bottom-color: #222222;
            }

            [data-theme="dark"] .ec-confirm-section-header {
                color: #e2e8f0;
            }

            [data-theme="dark"] .ec-confirm-section-header svg {
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-confirm-section-body {
                background: #0a0a0a;
            }

            [data-theme="dark"] .ec-confirm-row {
                border-bottom-color: #222222;
            }

            [data-theme="dark"] .ec-confirm-label {
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-confirm-value {
                color: #e2e8f0;
            }

            [data-theme="dark"] .ec-confirm-change-box {
                background: #0a0a0a;
                border-color: #222222;
            }

            [data-theme="dark"] .ec-confirm-change-label {
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-confirm-change-content.to {
                background: #111111;
                border-top-color: #222222;
            }

            [data-theme="dark"] .ec-confirm-change-date {
                color: #e2e8f0;
            }

            [data-theme="dark"] .ec-confirm-change-time {
                color: #cbd5e1;
            }

            [data-theme="dark"] .ec-confirm-change-duration {
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-confirm-change-host {
                color: #cbd5e1;
            }

            [data-theme="dark"] .ec-confirm-change-host svg {
                color: #94a3b8;
            }

            /* Dark mode - Slot Info Card */
            [data-theme="dark"] .ec-slot-info-card {
                background: linear-gradient(135deg, #0a0a0a 0%, #111111 100%);
                border-color: #222222;
            }

            [data-theme="dark"] .ec-slot-info-header {
                color: #60a5fa;
            }

            [data-theme="dark"] .ec-slot-info-header svg {
                stroke: #60a5fa;
            }

            [data-theme="dark"] .ec-slot-info-label {
                color: #94a3b8;
            }

            [data-theme="dark"] .ec-slot-info-value {
                color: #e2e8f0;
            }

            /* Dark mode - Slot Selection Highlight */
            [data-theme="dark"] .fc-highlight {
                background: rgba(59, 130, 246, 0.25) !important;
                border-color: #3b82f6 !important;
            }
        `;
        document.head.appendChild(style);
    }

    attachHandlers() {
        // Reload button
        this.$container.find('#ec-reload-btn').on('click', () => this.reload());

        // Select All button - only selects all, does not deselect all
        this.$container.find('#ec-select-all').on('click', () => {
            const $checkboxes = this.$container.find('#ec-dept-toggles input:not(:disabled)');
            const allChecked = $checkboxes.filter(':checked').length === $checkboxes.length;

            // Only allow selecting all - if already all selected, do nothing
            if (allChecked) {
                return;
            }

            // Select all departments
            $checkboxes.prop('checked', true);
            this.filterState.departments = this.userContext.accessible_departments.map(d => d.name);

            this.reload();
        });

        // Department card clicks
        this.$container.find('.ec-dept-card').on('click', (e) => {
            const $card = $(e.currentTarget);
            const $checkbox = $card.find('input');

            if ($checkbox.prop('disabled')) return;

            const isCurrentlyChecked = $checkbox.prop('checked');

            // Count currently checked departments
            const currentlyCheckedCount = this.$container.find('#ec-dept-toggles input:checked').length;

            // Prevent deselecting if this is the last selected department
            if (isCurrentlyChecked && currentlyCheckedCount <= 1) {
                frappe.show_alert({
                    message: __('At least one department must be selected'),
                    indicator: 'orange'
                });
                return;
            }

            // Toggle checkbox
            $checkbox.prop('checked', !isCurrentlyChecked);

            // Update filter state from actual checkboxes
            this.filterState.departments = this.$container.find('#ec-dept-toggles input:checked')
                .map((_, el) => $(el).data('dept')).get();

            this.reload();
        });

        // Focus select
        this.$container.find('#ec-focus-select').on('change', async (e) => {
            const value = e.target.value;

            if (value) {
                this.filterState.mode = 'focus';
                this.filterState.focusDepartment = value;

                // Disable department toggles
                this.$container.find('#ec-dept-toggles input').prop('disabled', true);
                this.$container.find('.ec-dept-card').addClass('ec-disabled');

                // Load and show meeting types
                await this.loadMeetingTypes(value);
                this.$container.find('#ec-mt-row').show();
            } else {
                this.filterState.mode = 'multi';
                this.filterState.focusDepartment = null;
                this.filterState.meetingTypes = [];

                // Enable department toggles
                this.$container.find('#ec-dept-toggles input').prop('disabled', false);
                this.$container.find('.ec-dept-card').removeClass('ec-disabled');

                // Hide meeting types
                this.$container.find('#ec-mt-row').hide();
            }

            this.reload();
        });

        // Status toggle buttons
        this.$container.find('.ec-status-btn').on('click', (e) => {
            const $btn = $(e.currentTarget);
            $btn.toggleClass('active');

            // Update filter state
            this.filterState.statuses = this.$container.find('.ec-status-btn.active')
                .map((_, el) => $(el).data('status')).get();

            if (this.calendar) {
                this.calendar.refetchEvents();
            }
        });

        // Service filter
        this.$container.find('#ec-service-select').on('change', (e) => {
            const value = e.target.value;
            this.filterState.services = value ? [value] : [];

            if (this.calendar) {
                this.calendar.refetchEvents();
            }
        });
    }

    async loadMeetingTypes(departmentId) {
        try {
            const response = await frappe.call({
                method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_department_meeting_types',
                args: { department: departmentId }
            });

            const meetingTypes = response.message || [];
            this.filterState.meetingTypes = meetingTypes.map(mt => mt.name);

            // Render chips
            const $chips = this.$container.find('#ec-mt-chips');
            $chips.empty();

            meetingTypes.forEach(mt => {
                const $chip = $(`<button class="ec-mt-chip active" data-mt="${mt.name}">${mt.meeting_name}</button>`);
                $chip.on('click', () => {
                    const isCurrentlyActive = $chip.hasClass('active');

                    // Prevent deselecting if this is the last selected meeting type
                    if (isCurrentlyActive && this.filterState.meetingTypes.length <= 1) {
                        frappe.show_alert({
                            message: __('At least one meeting type must be selected'),
                            indicator: 'orange'
                        });
                        return;
                    }

                    $chip.toggleClass('active');
                    this.filterState.meetingTypes = this.$container.find('.ec-mt-chip.active')
                        .map((_, el) => $(el).data('mt')).get();
                    this.calendar.refetchEvents();
                });
                $chips.append($chip);
            });
        } catch (error) {
            console.error('Failed to load meeting types:', error);
        }
    }

    async initCalendar() {
        // Load initial resources
        await this.loadResources();

        const calendarEl = document.getElementById('ec-calendar');

        // Track current orientation (vertical = timegrid, horizontal = timeline)
        this.isVerticalView = true;

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            schedulerLicenseKey: 'GPL-My-Project-Is-Open-Source',
            // Default: Vertical orientation (users as columns on top, time on left)
            initialView: 'resourceTimeGridDay',
            customButtons: {
                current: {
                    text: __('Current'),
                    click: () => {
                        this.calendar.today();
                    }
                },
                jumpToDate: {
                    text: __('Jump to Date'),
                    click: () => {
                        this.showDatePicker();
                    }
                },
                toggleOrientation: {
                    text: __('⇄ Horizontal'),
                    click: () => {
                        this.toggleCalendarOrientation();
                    }
                }
            },
            headerToolbar: {
                left: 'prev,next current,jumpToDate toggleOrientation',
                center: 'title',
                right: 'resourceTimeGridDay,resourceTimeGridWeek'
            },

            // Time settings - 30-minute intervals (vertical axis on left)
            slotMinTime: '06:00:00',
            slotMaxTime: '22:00:00',
            slotDuration: '00:30:00',
            snapDuration: '00:30:00',
            slotLabelInterval: '01:00:00',
            slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },

            // Resources configuration (works for both vertical and horizontal views)
            resources: this.resources,
            resourceAreaWidth: '180px',  // For horizontal/timeline view
            resourceAreaHeaderContent: __('Team Members'),  // For horizontal/timeline view
            resourceLabelContent: (arg) => this.renderResourceLabel(arg.resource),

            // Events - includes background events for non-working hours
            events: (fetchInfo, successCallback, failureCallback) => {
                this.fetchEventsWithBusinessHours(fetchInfo, successCallback, failureCallback);
            },

            // Interactions
            editable: true,
            eventResizableFromStart: false,
            eventDurationEditable: true,
            eventResourceEditable: true,

            // Callbacks
            eventAllow: (dropInfo, draggedEvent) => this.canModifyEvent(dropInfo, draggedEvent),
            eventDragStart: () => this.disableTooltips(),
            eventDragStop: () => this.enableTooltips(),
            eventResizeStart: () => this.disableTooltips(),
            eventResizeStop: () => this.enableTooltips(),
            eventDrop: (info) => this.handleEventDrop(info),
            eventResize: (info) => this.handleEventResize(info),
            eventClick: (info) => this.handleEventClick(info),
            eventDidMount: (info) => this.styleEvent(info),

            // Other
            nowIndicator: true,
            height: 'auto',
            locale: frappe.boot.lang || 'en',
            firstDay: 1,

            // Enable slot selection for creating new bookings
            selectable: true,
            selectMirror: true,
            selectAllow: (selectInfo) => this.canSelectSlot(selectInfo),
            select: (selectInfo) => this.handleSlotSelect(selectInfo)
        });

        this.calendar.render();
    }

    async loadResources() {
        try {
            const response = await frappe.call({
                method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_calendar_resources',
                args: {
                    departments: this.filterState.mode === 'multi' ? JSON.stringify(this.filterState.departments) : null,
                    focus_department: this.filterState.focusDepartment
                }
            });
            this.resources = response.message || [];
        } catch (error) {
            console.error('Failed to load resources:', error);
            this.resources = [];
        }
    }

    async fetchEventsWithBusinessHours(fetchInfo, successCallback, failureCallback) {
        /**
         * Fetch booking events, business hours background events, AND blocked slots.
         * Returns them all to FullCalendar as a unified event array.
         */
        try {
            const startDate = fetchInfo.startStr.split('T')[0];
            const endDate = fetchInfo.endStr.split('T')[0];

            // Fetch regular events, business hours, AND blocked slots in parallel
            const [eventsResponse, businessHoursResponse, blockedSlotsResponse] = await Promise.all([
                frappe.call({
                    method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_calendar_events',
                    args: {
                        start: startDate,
                        end: endDate,
                        departments: this.filterState.mode === 'multi' ? JSON.stringify(this.filterState.departments) : null,
                        focus_department: this.filterState.focusDepartment,
                        meeting_types: this.filterState.meetingTypes.length ? JSON.stringify(this.filterState.meetingTypes) : null,
                        statuses: this.filterState.statuses.length ? JSON.stringify(this.filterState.statuses) : null,
                        services: this.filterState.services.length ? JSON.stringify(this.filterState.services) : null
                    }
                }),
                frappe.call({
                    method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_all_resources_business_hours',
                    args: {
                        resource_ids: JSON.stringify(this.resources.map(r => r.id)),
                        start_date: startDate,
                        end_date: endDate
                    }
                }),
                frappe.call({
                    method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_user_blocked_slots',
                    args: {
                        resource_ids: JSON.stringify(this.resources.map(r => r.id)),
                        start_date: startDate,
                        end_date: endDate
                    }
                })
            ]);

            // Start with booking events
            const allEvents = eventsResponse.message || [];

            // Generate business hours background events
            const businessHoursData = businessHoursResponse.message || {};
            const backgroundEvents = this.generateBusinessHoursEvents(
                businessHoursData,
                new Date(fetchInfo.start),
                new Date(fetchInfo.end)
            );

            // Generate blocked slot events
            const blockedSlotsData = blockedSlotsResponse.message || {};
            const blockedSlotEvents = this.generateBlockedSlotEvents(blockedSlotsData);

            // Combine all events
            allEvents.push(...backgroundEvents);
            allEvents.push(...blockedSlotEvents);

            successCallback(allEvents);
        } catch (error) {
            console.error('Failed to fetch events:', error);
            failureCallback(error);
        }
    }

    generateBusinessHoursEvents(businessHoursData, startDate, endDate) {
        /**
         * Generate background events for non-working hours.
         * Returns an array of FullCalendar background events.
         */
        const backgroundEvents = [];
        const slotMinTime = '06:00';
        const slotMaxTime = '22:00';

        // Process each resource
        this.resources.forEach(resource => {
            const resourceData = businessHoursData[resource.id] || {};
            const businessHours = resourceData.businessHours || [];
            const dateOverrides = resourceData.dateOverrides || [];

            // If no business hours defined, use default 9-5 weekday schedule
            let effectiveBusinessHours = businessHours;
            if (businessHours.length === 0) {
                effectiveBusinessHours = [{
                    daysOfWeek: [1, 2, 3, 4, 5],
                    startTime: '09:00',
                    endTime: '17:00'
                }];
            }

            // Check for 24/7 schedule
            const is24_7 = effectiveBusinessHours.some(bh =>
                bh.daysOfWeek &&
                bh.daysOfWeek.length === 7 &&
                bh.startTime === '00:00' &&
                (bh.endTime === '23:59' || bh.endTime === '24:00')
            );

            if (is24_7) {
                return;
            }

            // Create date override lookup
            const overridesByDate = {};
            dateOverrides.forEach(override => {
                overridesByDate[override.date] = override;
            });

            // Iterate through each day
            const currentDate = new Date(startDate);
            while (currentDate < endDate) {
                // Use local date formatting to avoid timezone issues
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                const fcDayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.

                const override = overridesByDate[dateStr];

                if (override) {
                    if (!override.available) {
                        // Day off - entire day blocked
                        backgroundEvents.push({
                            id: `unavailable-${resource.id}-${dateStr}`,
                            resourceId: resource.id,
                            start: `${dateStr}T${slotMinTime}:00`,
                            end: `${dateStr}T${slotMaxTime}:00`,
                            title: 'Not Available',
                            backgroundColor: '#fecaca',
                            borderColor: '#f87171',
                            classNames: ['ec-unavailable-block'],
                            editable: false,
                            extendedProps: {
                                isBusinessHoursBackground: true,
                                reason: override.reason || 'Unavailable'
                            }
                        });
                    } else if (override.availableSlots && override.availableSlots.length > 0) {
                        // Custom hours for this day
                        const workingHours = override.availableSlots.map(s => ({
                            startTime: s.start,
                            endTime: s.end
                        }));
                        backgroundEvents.push(...this.createNonWorkingBlocks(resource.id, dateStr, workingHours, slotMinTime, slotMaxTime));
                    }
                } else {
                    // Regular business hours for this day of week
                    const dayBusinessHours = effectiveBusinessHours.filter(bh =>
                        bh.daysOfWeek && bh.daysOfWeek.includes(fcDayOfWeek) &&
                        !bh.groupId
                    );

                    if (dayBusinessHours.length > 0) {
                        const blocks = this.createNonWorkingBlocks(resource.id, dateStr, dayBusinessHours, slotMinTime, slotMaxTime);
                        backgroundEvents.push(...blocks);
                    } else {
                        // No working hours - day off
                        backgroundEvents.push({
                            id: `dayoff-${resource.id}-${dateStr}`,
                            resourceId: resource.id,
                            start: `${dateStr}T${slotMinTime}:00`,
                            end: `${dateStr}T${slotMaxTime}:00`,
                            title: 'Day Off',
                            backgroundColor: '#e2e8f0',
                            borderColor: '#94a3b8',
                            classNames: ['ec-dayoff-block'],
                            editable: false,
                            extendedProps: {
                                isBusinessHoursBackground: true,
                                reason: 'Day off'
                            }
                        });
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }
        });

        return backgroundEvents;
    }

    generateBlockedSlotEvents(blockedSlotsData) {
        /**
         * Generate calendar events for blocked slots (displayed in BLACK).
         * These are user-defined time blocks where they are unavailable.
         * Blocked slots are editable (draggable/resizable) if user has permission.
         */
        const blockedEvents = [];

        // Debug: Log context when generating blocked slot events
        console.log('[generateBlockedSlotEvents] Data:', {
            blockedSlotsData,
            userContext: this.userContext,
            currentUser: this.userContext?.user,
            roleLevel: this.userContext?.role
        });

        Object.entries(blockedSlotsData).forEach(([resourceId, slots]) => {
            slots.forEach(slot => {
                const canManage = this.canManageBlockedSlot(resourceId);
                console.log(`[generateBlockedSlotEvents] Slot ${slot.name}: resourceId=${resourceId}, canManage=${canManage}`);
                blockedEvents.push({
                    id: `blocked-${slot.name}`,
                    resourceId: resourceId,
                    start: `${slot.blocked_date}T${slot.start_time}`,
                    end: `${slot.blocked_date}T${slot.end_time}`,
                    title: slot.reason || __('Blocked'),
                    backgroundColor: '#1a1a1a',
                    borderColor: '#000000',
                    textColor: '#ffffff',
                    classNames: ['ec-blocked-slot'],
                    editable: canManage,
                    durationEditable: canManage,
                    resourceEditable: false,  // Cannot move to different user
                    extendedProps: {
                        isBlockedSlot: true,
                        blockedSlotName: slot.name,
                        blockedSlotUser: resourceId,
                        originalDate: slot.blocked_date,
                        originalStartTime: slot.start_time,
                        originalEndTime: slot.end_time,
                        reason: slot.reason,
                        canManage: canManage
                    }
                });
            });
        });

        return blockedEvents;
    }

    canManageBlockedSlot(resourceId) {
        /**
         * Check if current user can manage (edit/delete) a blocked slot for this resource.
         *
         * Permissions:
         * - System Manager: can manage ANY blocked slot (checked first for efficiency)
         * - ANY user can ALWAYS manage their OWN blocked slots
         * - Dept Leader: can manage own + team members in led departments
         * - Dept Member: can only manage their own blocked slots
         */
        // Safety check - if userContext not loaded yet, deny by default
        if (!this.userContext) {
            console.warn('[canManageBlockedSlot] userContext not yet loaded');
            return false;
        }

        const currentUser = this.userContext.user;
        const roleLevel = this.userContext.role;

        // Debug logging - remove after debugging
        console.log('[canManageBlockedSlot] Check:', {
            resourceId,
            currentUser,
            roleLevel,
            isSystemManager: roleLevel === 'system_manager',
            isOwnSlot: resourceId === currentUser
        });

        // System Manager can manage ANY blocked slot (highest privilege)
        if (roleLevel === 'system_manager') {
            console.log('[canManageBlockedSlot] ALLOWED: System Manager');
            return true;
        }

        // Users can ALWAYS manage their own blocked slots
        if (resourceId === currentUser) {
            console.log('[canManageBlockedSlot] ALLOWED: Own slot');
            return true;
        }

        // Department Leader can manage team members' blocked slots
        if (roleLevel === 'department_leader') {
            const userDepts = this.userContext.accessible_departments || [];
            const ledDeptNames = userDepts.filter(d => d.is_leader).map(d => d.name);
            const resource = this.resources.find(r => r.id === resourceId);

            if (resource && ledDeptNames.includes(resource.department)) {
                console.log('[canManageBlockedSlot] ALLOWED: Dept Leader for this member');
                return true;
            }
        }

        // Default: no permission
        console.log('[canManageBlockedSlot] DENIED: No matching permission');
        return false;
    }

    normalizeTime(timeStr) {
        /**
         * Normalize time string to HH:MM format for consistent comparison.
         */
        if (!timeStr) return '00:00';
        const parts = String(timeStr).split(':');
        const hours = (parts[0] || '00').padStart(2, '0');
        const minutes = (parts[1] || '00').padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    createNonWorkingBlocks(resourceId, dateStr, workingHours, slotMinTime, slotMaxTime) {
        /**
         * Create background event objects for non-working hours.
         * Returns an array of event objects.
         */
        const events = [];

        // Normalize min/max times
        const minTime = this.normalizeTime(slotMinTime);
        const maxTime = this.normalizeTime(slotMaxTime);

        // Normalize and sort working hours
        const sortedHours = [...workingHours]
            .map(slot => ({
                startTime: this.normalizeTime(slot.startTime),
                endTime: this.normalizeTime(slot.endTime)
            }))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        // Merge overlapping slots
        const mergedSlots = [];
        sortedHours.forEach(slot => {
            if (mergedSlots.length === 0) {
                mergedSlots.push({ ...slot });
            } else {
                const lastSlot = mergedSlots[mergedSlots.length - 1];
                if (slot.startTime <= lastSlot.endTime) {
                    lastSlot.endTime = slot.endTime > lastSlot.endTime ? slot.endTime : lastSlot.endTime;
                } else {
                    mergedSlots.push({ ...slot });
                }
            }
        });

        // Create gap blocks for non-working hours
        let lastEnd = minTime;

        mergedSlots.forEach((slot, index) => {
            // Block before this working slot (if there's a gap)
            if (slot.startTime > lastEnd) {
                events.push({
                    id: `nonwork-${resourceId}-${dateStr}-pre${index}`,
                    resourceId: resourceId,
                    start: `${dateStr}T${lastEnd}:00`,
                    end: `${dateStr}T${slot.startTime}:00`,
                    title: 'Unavailable',
                    backgroundColor: '#cbd5e1',
                    borderColor: '#94a3b8',
                    classNames: ['ec-nonworking-block'],
                    editable: false,
                    extendedProps: {
                        isBusinessHoursBackground: true
                    }
                });
            }
            lastEnd = slot.endTime;
        });

        // Block after last working slot (up to max time)
        if (lastEnd < maxTime) {
            events.push({
                id: `nonwork-${resourceId}-${dateStr}-post`,
                resourceId: resourceId,
                start: `${dateStr}T${lastEnd}:00`,
                end: `${dateStr}T${maxTime}:00`,
                title: 'Unavailable',
                backgroundColor: '#cbd5e1',
                borderColor: '#94a3b8',
                classNames: ['ec-nonworking-block'],
                editable: false,
                extendedProps: {
                    isBusinessHoursBackground: true
                }
            });
        }

        return events;
    }

    renderResourceLabel(resource) {
        const el = document.createElement('div');
        const isSelf = resource.extendedProps && resource.extendedProps.is_self;
        el.className = isSelf ? 'ec-resource-self' : '';
        el.textContent = resource.title + (isSelf ? ' (You)' : '');
        return { domNodes: [el] };
    }

    styleEvent(info) {
        const props = info.event.extendedProps;
        const el = info.el;

        // Handle business hours background events
        if (props.isBusinessHoursBackground) {
            // Apply inline styles to make it look like a background block
            el.style.opacity = '0.6';
            el.style.pointerEvents = 'none';
            el.style.cursor = 'default';
            el.style.borderRadius = '2px';

            // Style the text to be subtle
            const mainContent = el.querySelector('.fc-event-main');
            if (mainContent) {
                mainContent.style.fontSize = '10px';
                mainContent.style.color = '#64748b';
                mainContent.style.textAlign = 'center';
                mainContent.style.overflow = 'hidden';
            }
            return;
        }

        // Add status class
        if (props.status) {
            el.classList.add('ec-status-' + props.status.toLowerCase().replace(/\s+/g, '-'));
        }

        // Team meeting indicator
        if (props.is_internal) {
            el.classList.add('ec-team-meeting');
        }

        // Participant indicator (for team meetings where user is a participant, not host)
        if (props.is_participant) {
            el.classList.add('participant-event');
        }

        // Own booking indicator
        if (props.assigned_to === this.userContext.user) {
            el.classList.add('ec-own-booking');
        }

        // Non-draggable indicator
        if (!props.can_reschedule) {
            el.classList.add('ec-non-draggable');
            el.style.cursor = 'default';
        }

        // Add tooltip on hover for booking events
        this.addEventTooltip(el, info.event);
    }

    disableTooltips() {
        // Disable tooltips during drag/resize operations
        this.tooltipsDisabled = true;
        this.hideAllTooltips();
    }

    enableTooltips() {
        // Re-enable tooltips after drag/resize operations
        this.tooltipsDisabled = false;
    }

    hideAllTooltips() {
        // Remove all tooltips from the DOM
        document.querySelectorAll('.ec-tooltip').forEach(tooltip => {
            tooltip.remove();
        });
    }

    addEventTooltip(el, event) {
        const props = event.extendedProps;
        let tooltipEl = null;
        let hideTimeout = null;
        let showTimeout = null;
        const TOOLTIP_DELAY = 400; // Delay in ms before showing tooltip

        const createAndShowTooltip = (e) => {
            // Don't show if tooltips are disabled
            if (this.tooltipsDisabled) return;

            // Remove existing tooltip
            if (tooltipEl) {
                tooltipEl.remove();
            }

            // Create tooltip element
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'ec-tooltip';

            // Format time
            const startTime = event.start ? this.formatTime(event.start) : '';
            const endTime = event.end ? this.formatTime(event.end) : '';
            const duration = event.start && event.end ? this.calculateDuration(event.start, event.end) : '';

            // Build tooltip content
            let content = `
                <button class="ec-tooltip-close" title="${__('Close')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div class="ec-tooltip-header">
                    ${event.title || 'Meeting'}
                    ${props.is_internal ? '<span class="ec-tooltip-badge team">Team</span>' : '<span class="ec-tooltip-badge customer">Customer</span>'}
                </div>
            `;

            // Time row
            if (startTime && endTime) {
                content += `
                    <div class="ec-tooltip-row">
                        <svg class="ec-tooltip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span class="ec-tooltip-value">${startTime} - ${endTime}${duration ? ` (${duration})` : ''}</span>
                    </div>
                `;
            }

            // Status row
            if (props.status) {
                const statusClass = props.status.toLowerCase().replace(/\s+/g, '-');
                content += `
                    <div class="ec-tooltip-row">
                        <svg class="ec-tooltip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span class="ec-tooltip-status ${statusClass}">${props.status}</span>
                    </div>
                `;
            }

            // Customer/Contact row
            if (props.customer_name) {
                content += `
                    <div class="ec-tooltip-row">
                        <svg class="ec-tooltip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span class="ec-tooltip-label">Customer:</span>
                        <span class="ec-tooltip-value">${props.customer_name}</span>
                    </div>
                `;
            }

            // Meeting Type row
            if (props.meeting_type_name) {
                content += `
                    <div class="ec-tooltip-row">
                        <svg class="ec-tooltip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span class="ec-tooltip-label">Type:</span>
                        <span class="ec-tooltip-value">${props.meeting_type_name}</span>
                    </div>
                `;
            }

            // Department row
            if (props.department_name) {
                content += `
                    <div class="ec-tooltip-row">
                        <svg class="ec-tooltip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span class="ec-tooltip-label">Department:</span>
                        <span class="ec-tooltip-value">${props.department_name}</span>
                    </div>
                `;
            }

            // Host row - show the actual meeting host
            const hostName = props.host_name || props.assigned_to_name;
            if (hostName) {
                content += `
                    <div class="ec-tooltip-row">
                        <svg class="ec-tooltip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <polyline points="17 11 19 13 23 9"></polyline>
                        </svg>
                        <span class="ec-tooltip-label">Host:</span>
                        <span class="ec-tooltip-value">${hostName}</span>
                    </div>
                `;
            }

            // Show participant indicator for team meetings where user is a participant
            if (props.is_participant) {
                content += `
                    <div class="ec-tooltip-row">
                        <svg class="ec-tooltip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span class="ec-tooltip-label">Your Role:</span>
                        <span class="ec-tooltip-value" style="color: #8b5cf6;">Participant</span>
                    </div>
                `;
            }

            // Notes row (if present and not empty)
            if (props.notes && props.notes.trim()) {
                const truncatedNotes = props.notes.length > 100 ? props.notes.substring(0, 100) + '...' : props.notes;
                content += `
                    <div class="ec-tooltip-row">
                        <svg class="ec-tooltip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <span class="ec-tooltip-label">Notes:</span>
                        <span class="ec-tooltip-value">${truncatedNotes}</span>
                    </div>
                `;
            }

            tooltipEl.innerHTML = content;
            document.body.appendChild(tooltipEl);

            // Add close button click handler
            const closeBtn = tooltipEl.querySelector('.ec-tooltip-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', (evt) => {
                    evt.stopPropagation();
                    if (tooltipEl) {
                        tooltipEl.remove();
                        tooltipEl = null;
                    }
                });
            }

            // Position tooltip
            this.positionTooltip(tooltipEl, e);

            // Show with animation
            requestAnimationFrame(() => {
                if (tooltipEl) {
                    tooltipEl.classList.add('visible');
                }
            });
        };

        let lastMouseEvent = null;

        const showTooltip = (e) => {
            // Store the mouse event for positioning
            lastMouseEvent = e;

            // Clear any pending hide
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }

            // Clear any pending show
            if (showTimeout) {
                clearTimeout(showTimeout);
            }

            // Delay showing the tooltip
            showTimeout = setTimeout(() => {
                if (lastMouseEvent) {
                    createAndShowTooltip(lastMouseEvent);
                }
            }, TOOLTIP_DELAY);
        };

        const hideTooltip = () => {
            // Clear any pending show
            if (showTimeout) {
                clearTimeout(showTimeout);
                showTimeout = null;
            }

            hideTimeout = setTimeout(() => {
                if (tooltipEl) {
                    tooltipEl.classList.remove('visible');
                    setTimeout(() => {
                        if (tooltipEl) {
                            tooltipEl.remove();
                            tooltipEl = null;
                        }
                    }, 150);
                }
            }, 100);
        };

        const moveTooltip = (e) => {
            // Update stored mouse event
            lastMouseEvent = e;

            if (tooltipEl) {
                this.positionTooltip(tooltipEl, e);
            }
        };

        el.addEventListener('mouseenter', showTooltip);
        el.addEventListener('mouseleave', hideTooltip);
        el.addEventListener('mousemove', moveTooltip);
    }

    positionTooltip(tooltip, e) {
        const padding = 12;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipRect = tooltip.getBoundingClientRect();

        let left = e.clientX + padding;
        let top = e.clientY + padding;

        // Adjust if tooltip goes off right edge
        if (left + tooltipRect.width > viewportWidth - padding) {
            left = e.clientX - tooltipRect.width - padding;
        }

        // Adjust if tooltip goes off bottom edge
        if (top + tooltipRect.height > viewportHeight - padding) {
            top = e.clientY - tooltipRect.height - padding;
        }

        // Ensure tooltip stays within viewport
        left = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding));
        top = Math.max(padding, Math.min(top, viewportHeight - tooltipRect.height - padding));

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    formatDateTimeForServer(date) {
        // Format datetime in local time for Frappe (YYYY-MM-DD HH:MM:SS)
        // Using local time instead of toISOString() which converts to UTC
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    calculateDuration(start, end) {
        const diffMs = end - start;
        const diffMins = Math.round(diffMs / 60000);

        if (diffMins < 60) {
            return `${diffMins} min`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
    }

    canModifyEvent(dropInfo, draggedEvent) {
        const props = draggedEvent.extendedProps;

        // Handle blocked slots - check canManage permission
        if (props.isBlockedSlot) {
            // For blocked slots, re-check permission dynamically
            const resourceId = props.blockedSlotUser || draggedEvent.getResources()[0]?.id;
            return this.canManageBlockedSlot(resourceId);
        }

        // Handle regular bookings
        // Check reassignment
        if (dropInfo.resource) {
            const currentResources = draggedEvent.getResources();
            if (currentResources.length > 0 && dropInfo.resource.id !== currentResources[0].id) {
                return props.can_reassign === true;
            }
        }

        // Check reschedule
        return props.can_reschedule === true;
    }

    async handleEventDrop(info) {
        // Hide any open tooltips before showing dialog
        this.hideAllTooltips();

        const props = info.event.extendedProps;

        // Handle blocked slot drag (move to different time/date)
        if (props.isBlockedSlot) {
            await this.handleBlockedSlotDrop(info);
            return;
        }

        // Validate: Cannot move to past date/time
        const now = new Date();
        if (info.event.start < now) {
            info.revert();
            frappe.msgprint({
                title: __('Invalid Time'),
                indicator: 'red',
                message: __('Cannot reschedule or reassign a meeting to a past date/time.')
            });
            return;
        }

        const newResource = info.newResource;
        const oldResource = info.oldResource;

        const isReassignment = newResource && oldResource && newResource.id !== oldResource.id;

        const updates = {
            startDatetime: this.formatDateTimeForServer(info.event.start),
            endDatetime: this.formatDateTimeForServer(info.event.end)
        };

        if (isReassignment) {
            updates.newHost = newResource.id;
        }

        // Check if time also changed (for combined reassign + reschedule)
        const timeChanged = info.oldEvent.start.getTime() !== info.event.start.getTime() ||
                           info.oldEvent.end.getTime() !== info.event.end.getTime();

        // Determine action type
        let actionType, dialogTitle, primaryLabel, successMessage;
        if (isReassignment && timeChanged) {
            actionType = 'reassign_reschedule';
            dialogTitle = __('Reassign & Reschedule Booking');
            primaryLabel = __('Confirm Changes');
            successMessage = __('Booking reassigned and rescheduled');
        } else if (isReassignment) {
            actionType = 'reassign';
            dialogTitle = __('Reassign Booking');
            primaryLabel = __('Reassign');
            successMessage = __('Booking reassigned');
        } else {
            actionType = 'reschedule';
            dialogTitle = __('Reschedule Booking');
            primaryLabel = __('Reschedule');
            successMessage = __('Booking rescheduled');
        }

        const dialogContent = this.buildConfirmationDialogContent({
            actionType: actionType,
            event: info.event,
            oldStart: info.oldEvent.start,
            oldEnd: info.oldEvent.end,
            newStart: info.event.start,
            newEnd: info.event.end,
            oldResource: oldResource,
            newResource: newResource
        });

        // Determine if this is a team meeting (internal)
        const isTeamMeeting = props.is_internal;

        const dialog = new frappe.ui.Dialog({
            title: dialogTitle,
            size: 'large',
            fields: [
                {
                    fieldtype: 'HTML',
                    fieldname: 'confirmation_content',
                    options: dialogContent
                },
                {
                    fieldtype: 'Section Break',
                    label: __('Email Notifications')
                },
                {
                    fieldtype: 'HTML',
                    fieldname: 'notification_switches',
                    options: `
                        <div class="ec-notification-switches" style="display: flex; gap: 24px; flex-wrap: wrap; padding: 8px 0;">
                            ${!isTeamMeeting ? `
                            <label class="ec-switch-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" class="ec-switch-input" data-fieldname="notify_customer" checked style="width: 18px; height: 18px; cursor: pointer;">
                                <span>${__('Notify Customer')}</span>
                            </label>
                            ` : ''}
                            <label class="ec-switch-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" class="ec-switch-input" data-fieldname="notify_host" checked style="width: 18px; height: 18px; cursor: pointer;">
                                <span>${__('Notify Host')}</span>
                            </label>
                            ${isTeamMeeting ? `
                            <label class="ec-switch-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" class="ec-switch-input" data-fieldname="notify_participants" checked style="width: 18px; height: 18px; cursor: pointer;">
                                <span>${__('Notify Participants')}</span>
                            </label>
                            ` : ''}
                        </div>
                    `
                }
            ],
            primary_action_label: primaryLabel,
            primary_action: async () => {
                // Get notification values from HTML checkboxes
                const $wrapper = dialog.$wrapper;
                const notifyCustomer = $wrapper.find('[data-fieldname="notify_customer"]').is(':checked') ? 1 : 0;
                const notifyHost = $wrapper.find('[data-fieldname="notify_host"]').is(':checked') ? 1 : 0;
                const notifyParticipants = $wrapper.find('[data-fieldname="notify_participants"]').is(':checked') ? 1 : 0;

                dialog.hide();
                try {
                    const response = await frappe.call({
                        method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.update_calendar_booking',
                        args: {
                            booking_id: props.booking_id,
                            start_datetime: updates.startDatetime,
                            end_datetime: updates.endDatetime,
                            new_host: updates.newHost || null,
                            notify_customer: notifyCustomer,
                            notify_host: notifyHost,
                            notify_participants: notifyParticipants
                        }
                    });

                    if (response.message && response.message.success) {
                        frappe.show_alert({ message: successMessage, indicator: 'green' });
                        this.calendar.refetchEvents();
                    } else {
                        info.revert();
                        frappe.msgprint(response.message?.message || __('Failed to update booking'));
                    }
                } catch (error) {
                    info.revert();
                    frappe.msgprint(__('Error updating booking'));
                }
            },
            secondary_action_label: __('Cancel'),
            secondary_action: () => {
                dialog.hide();
                info.revert();
            }
        });

        dialog.$wrapper.find('.modal-dialog').addClass('ec-confirmation-dialog');
        dialog.show();
    }

    async handleEventResize(info) {
        // Hide any open tooltips before showing dialog
        this.hideAllTooltips();

        const props = info.event.extendedProps;

        // Handle blocked slot resize (extend/shrink)
        if (props.isBlockedSlot) {
            await this.handleBlockedSlotResize(info);
            return;
        }

        if (!props.can_reschedule) {
            info.revert();
            frappe.msgprint(__('You do not have permission to modify this booking.'));
            return;
        }

        // Validate: Cannot extend if the meeting start is in the past
        const now = new Date();
        if (info.event.start < now) {
            info.revert();
            frappe.msgprint({
                title: __('Invalid Time'),
                indicator: 'red',
                message: __('Cannot extend a meeting that has already started or is in the past.')
            });
            return;
        }

        // Build detailed confirmation dialog for extend
        const dialogContent = this.buildConfirmationDialogContent({
            actionType: 'extend',
            event: info.event,
            oldStart: info.oldEvent.start,
            oldEnd: info.oldEvent.end,
            newStart: info.event.start,
            newEnd: info.event.end
        });

        // Determine if this is a team meeting (internal)
        const isTeamMeetingExtend = props.is_internal;

        const dialog = new frappe.ui.Dialog({
            title: __('Extend Booking'),
            size: 'large',
            fields: [
                {
                    fieldtype: 'HTML',
                    fieldname: 'confirmation_content',
                    options: dialogContent
                },
                {
                    fieldtype: 'Section Break',
                    label: __('Email Notifications')
                },
                {
                    fieldtype: 'HTML',
                    fieldname: 'notification_switches',
                    options: `
                        <div class="ec-notification-switches" style="display: flex; gap: 24px; flex-wrap: wrap; padding: 8px 0;">
                            <label class="ec-switch-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" class="ec-switch-input" data-fieldname="notify_host" checked style="width: 18px; height: 18px; cursor: pointer;">
                                <span>${__('Notify Host')}</span>
                            </label>
                            ${isTeamMeetingExtend ? `
                            <label class="ec-switch-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" class="ec-switch-input" data-fieldname="notify_participants" checked style="width: 18px; height: 18px; cursor: pointer;">
                                <span>${__('Notify Participants')}</span>
                            </label>
                            ` : ''}
                        </div>
                    `
                }
            ],
            primary_action_label: __('Extend'),
            primary_action: async () => {
                // Get notification values from HTML checkboxes
                const $wrapper = dialog.$wrapper;
                const notifyHost = $wrapper.find('[data-fieldname="notify_host"]').is(':checked') ? 1 : 0;
                const notifyParticipants = $wrapper.find('[data-fieldname="notify_participants"]').is(':checked') ? 1 : 0;

                dialog.hide();
                try {
                    const response = await frappe.call({
                        method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.update_calendar_booking',
                        args: {
                            booking_id: props.booking_id,
                            end_datetime: this.formatDateTimeForServer(info.event.end),
                            notify_host: notifyHost,
                            notify_participants: notifyParticipants
                        }
                    });

                    if (response.message && response.message.success) {
                        frappe.show_alert({ message: __('Booking extended'), indicator: 'green' });
                    } else {
                        info.revert();
                        frappe.msgprint(response.message?.message || __('Failed to extend booking'));
                    }
                } catch (error) {
                    info.revert();
                    frappe.msgprint(__('Error extending booking'));
                }
            },
            secondary_action_label: __('Cancel'),
            secondary_action: () => {
                dialog.hide();
                info.revert();
            }
        });

        dialog.$wrapper.find('.modal-dialog').addClass('ec-confirmation-dialog');
        dialog.show();
    }

    handleEventClick(info) {
        // Hide any open tooltips before navigating
        this.hideAllTooltips();

        const props = info.event.extendedProps;

        // Handle blocked slot click
        if (props.isBlockedSlot) {
            // Re-check permission at action time
            const resourceId = props.blockedSlotUser || info.event.getResources()[0]?.id;
            const canManage = this.canManageBlockedSlot(resourceId);

            if (canManage) {
                this.showBlockedSlotDeleteDialog(info.event);
            } else {
                frappe.show_alert({
                    message: __('You do not have permission to modify this blocked slot'),
                    indicator: 'orange'
                });
            }
            return;
        }

        // Handle business hours background events (non-clickable)
        if (props.isBusinessHoursBackground) {
            return;
        }

        // Navigate to the custom meeting view page for regular bookings
        if (props.booking_id) {
            frappe.set_route('mm-meeting-view', props.booking_id);
        }
    }

    /**
     * Show confirmation dialog for deleting a blocked slot.
     */
    showBlockedSlotDeleteDialog(event) {
        const props = event.extendedProps;
        const startTime = event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTime = event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const dateStr = event.start.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const reasonHtml = props.reason ? `<p><strong>${__('Reason')}:</strong> ${props.reason}</p>` : '';

        frappe.confirm(
            `<div style="text-align: left;">
                <p>${__('Remove this blocked slot?')}</p>
                <hr style="margin: 10px 0;">
                <p><strong>${__('Date')}:</strong> ${dateStr}</p>
                <p><strong>${__('Time')}:</strong> ${startTime} - ${endTime}</p>
                ${reasonHtml}
            </div>`,
            async () => {
                // Yes callback - delete the blocked slot
                try {
                    const response = await frappe.call({
                        method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.delete_blocked_slot',
                        args: { blocked_slot_name: props.blockedSlotName }
                    });

                    if (response.message && response.message.success) {
                        frappe.show_alert({
                            message: __('Blocked slot removed'),
                            indicator: 'green'
                        });
                        this.calendar.refetchEvents();
                    } else {
                        frappe.msgprint({
                            title: __('Error'),
                            message: response.message?.message || __('Failed to remove blocked slot'),
                            indicator: 'red'
                        });
                    }
                } catch (error) {
                    frappe.msgprint({
                        title: __('Error'),
                        message: error.message || __('Failed to remove blocked slot'),
                        indicator: 'red'
                    });
                }
            },
            () => {
                // No callback - just close (do nothing)
            }
        );
    }

    /**
     * Handle blocked slot drag (move to different time/date).
     */
    async handleBlockedSlotDrop(info) {
        const props = info.event.extendedProps;

        // Re-check permission at action time (don't rely solely on cached canManage)
        const resourceId = props.blockedSlotUser || info.event.getResources()[0]?.id;
        const canManage = this.canManageBlockedSlot(resourceId);

        if (!canManage) {
            info.revert();
            frappe.msgprint(__('You do not have permission to modify this blocked slot.'));
            return;
        }

        // Get new date and times
        const newDate = info.event.start.toISOString().split('T')[0];
        const newStartTime = info.event.start.toTimeString().substring(0, 5);
        const newEndTime = info.event.end.toTimeString().substring(0, 5);

        // Format for display
        const oldDateDisplay = new Date(props.originalDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const newDateDisplay = info.event.start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

        const changes = [];
        if (props.originalDate !== newDate) {
            changes.push(`<p><strong>${__('Date')}:</strong> ${oldDateDisplay} → ${newDateDisplay}</p>`);
        }
        if (props.originalStartTime !== newStartTime || props.originalEndTime !== newEndTime) {
            changes.push(`<p><strong>${__('Time')}:</strong> ${props.originalStartTime} - ${props.originalEndTime} → ${newStartTime} - ${newEndTime}</p>`);
        }

        frappe.confirm(
            `<div style="text-align: left;">
                <p>${__('Move this blocked slot?')}</p>
                <hr style="margin: 10px 0;">
                ${changes.join('')}
                ${props.reason ? `<p><strong>${__('Reason')}:</strong> ${props.reason}</p>` : ''}
            </div>`,
            async () => {
                try {
                    const response = await frappe.call({
                        method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.update_blocked_slot',
                        args: {
                            blocked_slot_name: props.blockedSlotName,
                            blocked_date: newDate,
                            start_time: newStartTime,
                            end_time: newEndTime
                        }
                    });

                    if (response.message && response.message.success) {
                        frappe.show_alert({
                            message: __('Blocked slot moved'),
                            indicator: 'green'
                        });
                        this.calendar.refetchEvents();
                    } else {
                        info.revert();
                        frappe.msgprint({
                            title: __('Error'),
                            message: response.message?.message || __('Failed to move blocked slot'),
                            indicator: 'red'
                        });
                    }
                } catch (error) {
                    info.revert();
                    frappe.msgprint({
                        title: __('Error'),
                        message: error.message || __('Failed to move blocked slot'),
                        indicator: 'red'
                    });
                }
            },
            () => {
                info.revert();
            },
            __('Move')
        );
    }

    /**
     * Handle blocked slot resize (extend/shrink).
     */
    async handleBlockedSlotResize(info) {
        const props = info.event.extendedProps;

        // Re-check permission at action time (don't rely solely on cached canManage)
        const resourceId = props.blockedSlotUser || info.event.getResources()[0]?.id;
        const canManage = this.canManageBlockedSlot(resourceId);

        if (!canManage) {
            info.revert();
            frappe.msgprint(__('You do not have permission to modify this blocked slot.'));
            return;
        }

        // Get new times
        const newStartTime = info.event.start.toTimeString().substring(0, 5);
        const newEndTime = info.event.end.toTimeString().substring(0, 5);

        frappe.confirm(
            `<div style="text-align: left;">
                <p>${__('Resize this blocked slot?')}</p>
                <hr style="margin: 10px 0;">
                <p><strong>${__('Time')}:</strong> ${props.originalStartTime} - ${props.originalEndTime} → ${newStartTime} - ${newEndTime}</p>
                ${props.reason ? `<p><strong>${__('Reason')}:</strong> ${props.reason}</p>` : ''}
            </div>`,
            async () => {
                try {
                    const response = await frappe.call({
                        method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.update_blocked_slot',
                        args: {
                            blocked_slot_name: props.blockedSlotName,
                            start_time: newStartTime,
                            end_time: newEndTime
                        }
                    });

                    if (response.message && response.message.success) {
                        frappe.show_alert({
                            message: __('Blocked slot resized'),
                            indicator: 'green'
                        });
                        this.calendar.refetchEvents();
                    } else {
                        info.revert();
                        frappe.msgprint({
                            title: __('Error'),
                            message: response.message?.message || __('Failed to resize blocked slot'),
                            indicator: 'red'
                        });
                    }
                } catch (error) {
                    info.revert();
                    frappe.msgprint({
                        title: __('Error'),
                        message: error.message || __('Failed to resize blocked slot'),
                        indicator: 'red'
                    });
                }
            },
            () => {
                info.revert();
            },
            __('Resize')
        );
    }

    showDatePicker() {
        const currentDate = this.calendar.getDate();
        const formattedDate = frappe.datetime.obj_to_str(currentDate);

        const dialog = new frappe.ui.Dialog({
            title: __('Jump to Date'),
            fields: [
                {
                    fieldname: 'selected_date',
                    fieldtype: 'Date',
                    label: __('Select Date'),
                    default: formattedDate,
                    reqd: 1
                }
            ],
            primary_action_label: __('Go'),
            primary_action: (values) => {
                if (values.selected_date) {
                    this.calendar.gotoDate(values.selected_date);
                    dialog.hide();
                }
            }
        });

        dialog.show();
    }

    toggleCalendarOrientation() {
        /**
         * Toggle between vertical (timeGrid) and horizontal (timeline) views.
         * - Vertical: Users as columns on top, time on left axis
         * - Horizontal: Users on left, time flows horizontally
         */
        const currentView = this.calendar.view.type;
        let newView;

        if (this.isVerticalView) {
            // Switch to horizontal (timeline)
            if (currentView.includes('Day')) {
                newView = 'resourceTimelineDay';
            } else if (currentView.includes('Week')) {
                newView = 'resourceTimelineWeek';
            } else {
                newView = 'resourceTimelineDay';
            }
            this.isVerticalView = false;

            // Update toolbar to show timeline options
            this.calendar.setOption('headerToolbar', {
                left: 'prev,next current,jumpToDate toggleOrientation',
                center: 'title',
                right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
            });

            // Update button text
            this.updateToggleButtonText(__('⇅ Vertical'));
        } else {
            // Switch to vertical (timeGrid)
            if (currentView.includes('Day')) {
                newView = 'resourceTimeGridDay';
            } else if (currentView.includes('Week')) {
                newView = 'resourceTimeGridWeek';
            } else {
                newView = 'resourceTimeGridDay';
            }
            this.isVerticalView = true;

            // Update toolbar to show timegrid options
            this.calendar.setOption('headerToolbar', {
                left: 'prev,next current,jumpToDate toggleOrientation',
                center: 'title',
                right: 'resourceTimeGridDay,resourceTimeGridWeek'
            });

            // Update button text
            this.updateToggleButtonText(__('⇄ Horizontal'));
        }

        // Change the view
        this.calendar.changeView(newView);
    }

    updateToggleButtonText(text) {
        /**
         * Update the toggle orientation button text.
         */
        const button = this.$container.find('.fc-toggleOrientation-button');
        if (button.length) {
            button.text(text);
        }
    }

    buildConfirmationDialogContent(options) {
        const { actionType, event, oldStart, oldEnd, newStart, newEnd, oldResource, newResource } = options;
        const props = event.extendedProps;

        // Format dates and times
        const formatDate = (date) => {
            return date.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        };
        const formatTime = (date) => {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        };

        const oldDuration = this.calculateDuration(oldStart, oldEnd);
        const newDuration = this.calculateDuration(newStart, newEnd);

        // Determine action icon and color
        let actionIcon, actionColor, actionDescription;
        switch (actionType) {
            case 'reassign':
                actionIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>`;
                actionColor = '#8b5cf6';
                actionDescription = __('This booking will be reassigned to a different team member.');
                break;
            case 'reschedule':
                actionIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                    <path d="M8 14l2 2 4-4"></path>
                </svg>`;
                actionColor = '#3b82f6';
                actionDescription = __('This booking will be moved to a new date/time.');
                break;
            case 'reassign_reschedule':
                actionIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <rect x="14" y="2" width="8" height="8" rx="1" ry="1"></rect>
                    <line x1="18" y1="4" x2="18" y2="8"></line>
                    <line x1="16" y1="6" x2="20" y2="6"></line>
                </svg>`;
                actionColor = '#f59e0b';
                actionDescription = __('This booking will be reassigned to a different team member AND moved to a new time.');
                break;
            case 'extend':
                actionIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                    <path d="M17 17l3 3"></path>
                </svg>`;
                actionColor = '#10b981';
                actionDescription = __('This booking duration will be extended.');
                break;
        }

        // Build meeting info section
        let meetingInfoHtml = `
            <div class="ec-confirm-section">
                <div class="ec-confirm-section-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${__('Meeting Details')}
                </div>
                <div class="ec-confirm-section-body">
                    <div class="ec-confirm-row">
                        <span class="ec-confirm-label">${__('Title')}</span>
                        <span class="ec-confirm-value"><strong>${event.title || __('Meeting')}</strong></span>
                    </div>
                    <div class="ec-confirm-row">
                        <span class="ec-confirm-label">${__('Type')}</span>
                        <span class="ec-confirm-value">
                            <span class="ec-confirm-badge ${props.is_internal ? 'team' : 'customer'}">
                                ${props.is_internal ? __('Team Meeting') : __('Customer Meeting')}
                            </span>
                        </span>
                    </div>`;

        if (props.meeting_type_name) {
            meetingInfoHtml += `
                    <div class="ec-confirm-row">
                        <span class="ec-confirm-label">${__('Meeting Type')}</span>
                        <span class="ec-confirm-value">${props.meeting_type_name}</span>
                    </div>`;
        }

        if (props.customer_name) {
            meetingInfoHtml += `
                    <div class="ec-confirm-row">
                        <span class="ec-confirm-label">${__('Customer')}</span>
                        <span class="ec-confirm-value">${props.customer_name}</span>
                    </div>`;
        }

        if (props.department_name) {
            meetingInfoHtml += `
                    <div class="ec-confirm-row">
                        <span class="ec-confirm-label">${__('Department')}</span>
                        <span class="ec-confirm-value">${props.department_name}</span>
                    </div>`;
        }

        if (props.status) {
            const statusClass = props.status.toLowerCase().replace(/\s+/g, '-');
            meetingInfoHtml += `
                    <div class="ec-confirm-row">
                        <span class="ec-confirm-label">${__('Status')}</span>
                        <span class="ec-confirm-value">
                            <span class="ec-confirm-status ${statusClass}">${props.status}</span>
                        </span>
                    </div>`;
        }

        meetingInfoHtml += `
                </div>
            </div>`;

        // Build changes section
        let changesHtml = `
            <div class="ec-confirm-section changes">
                <div class="ec-confirm-section-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 4v6h6"></path>
                        <path d="M23 20v-6h-6"></path>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                    </svg>
                    ${__('Changes')}
                </div>
                <div class="ec-confirm-changes-grid">`;

        // Time changes
        const dateChanged = formatDate(oldStart) !== formatDate(newStart);
        const timeChanged = formatTime(oldStart) !== formatTime(newStart) || formatTime(oldEnd) !== formatTime(newEnd);
        const showTimeChanges = actionType === 'reschedule' || actionType === 'extend' || actionType === 'reassign_reschedule';
        const showHostChanges = (actionType === 'reassign' || actionType === 'reassign_reschedule') && oldResource && newResource;

        // Show time changes section
        if (showTimeChanges) {
            changesHtml += `
                    <div class="ec-confirm-change-box">
                        <div class="ec-confirm-change-label">${__('Current Time')}</div>
                        <div class="ec-confirm-change-content from">
                            <div class="ec-confirm-change-date">${formatDate(oldStart)}</div>
                            <div class="ec-confirm-change-time">${formatTime(oldStart)} - ${formatTime(oldEnd)}</div>
                            <div class="ec-confirm-change-duration">${oldDuration}</div>
                        </div>
                    </div>
                    <div class="ec-confirm-change-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </div>
                    <div class="ec-confirm-change-box">
                        <div class="ec-confirm-change-label">${__('New Time')}</div>
                        <div class="ec-confirm-change-content to">
                            <div class="ec-confirm-change-date ${dateChanged ? 'changed' : ''}">${formatDate(newStart)}</div>
                            <div class="ec-confirm-change-time ${timeChanged ? 'changed' : ''}">${formatTime(newStart)} - ${formatTime(newEnd)}</div>
                            <div class="ec-confirm-change-duration ${oldDuration !== newDuration ? 'changed' : ''}">${newDuration}</div>
                        </div>
                    </div>`;
        }

        // Close and reopen grid if showing both changes (for better layout)
        if (showTimeChanges && showHostChanges) {
            changesHtml += `
                </div>
                <div class="ec-confirm-changes-grid" style="margin-top: 16px;">`;
        }

        // Show host changes section
        if (showHostChanges) {
            changesHtml += `
                    <div class="ec-confirm-change-box">
                        <div class="ec-confirm-change-label">${__('Current Host')}</div>
                        <div class="ec-confirm-change-content from">
                            <div class="ec-confirm-change-host">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                ${oldResource.title}
                            </div>
                        </div>
                    </div>
                    <div class="ec-confirm-change-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </div>
                    <div class="ec-confirm-change-box">
                        <div class="ec-confirm-change-label">${__('New Host')}</div>
                        <div class="ec-confirm-change-content to">
                            <div class="ec-confirm-change-host changed">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                ${newResource.title}
                            </div>
                        </div>
                    </div>`;
        }

        changesHtml += `
                </div>
            </div>`;

        // Build complete dialog content
        const dialogHtml = `
            <div class="ec-confirmation-content">
                <div class="ec-confirm-header" style="border-left-color: ${actionColor}">
                    <div class="ec-confirm-icon" style="color: ${actionColor}">
                        ${actionIcon}
                    </div>
                    <div class="ec-confirm-header-text">
                        <p>${actionDescription}</p>
                    </div>
                </div>
                ${meetingInfoHtml}
                ${changesHtml}
            </div>
        `;

        return dialogHtml;
    }

    async reload() {
        await this.loadResources();

        if (this.calendar) {
            // Update resources
            this.calendar.getResources().forEach(r => r.remove());
            this.resources.forEach(r => this.calendar.addResource(r));

            // Refetch events (includes business hours background events)
            this.calendar.refetchEvents();
        }
    }

    /**
     * Check if the user can select a time slot on a resource.
     * Rules:
     * - Cannot select past times
     * - System Manager: can select any slot for any team member
     * - Department Leader: can select slots for team members in departments they lead
     * - Department Member: can only select slots for themselves
     *
     * Note: The actual department for the booking is selected in the dialog,
     * so here we just check if the user has permission to assign to this resource.
     */
    canSelectSlot(selectInfo) {
        const now = new Date();
        const resource = selectInfo.resource;

        // Cannot select past times
        if (selectInfo.start < now) {
            return false;
        }

        // Must have a resource (team member) selected
        if (!resource) {
            return false;
        }

        const resourceProps = resource.extendedProps || {};
        const roleLevel = this.userContext.role;

        // System Manager can select any slot
        if (roleLevel === 'system_manager') {
            return true;
        }

        // Department Leader can select slots for their department members
        if (roleLevel === 'department_leader') {
            // Check if the resource belongs to any department they lead
            // (resource may belong to multiple departments, we check if any match)
            const resourceDepts = resourceProps.departments || [resourceProps.department];
            const userDepts = this.userContext.accessible_departments || [];
            const ledDeptNames = userDepts.filter(d => d.is_leader).map(d => d.name);

            // If the resource is themselves, allow
            if (resource.id === this.userContext.user) {
                return true;
            }

            // Check if resource belongs to a department the user leads
            return resourceDepts.some(dept => ledDeptNames.includes(dept));
        }

        // Department Member can only select their own slots
        if (roleLevel === 'department_member') {
            return resource.id === this.userContext.user;
        }

        return false;
    }

    /**
     * Handle slot selection - opens an action dialog with options to create booking or block slot.
     */
    handleSlotSelect(selectInfo) {
        const resource = selectInfo.resource;
        const resourceProps = resource.extendedProps || {};

        // Clear the selection
        this.calendar.unselect();

        // Get the selected time details
        const startDate = selectInfo.start;
        const endDate = selectInfo.end;
        const resourceId = resource.id;
        const resourceTitle = resource.title;
        const resourceDept = resourceProps.department;

        // Calculate duration in minutes
        const durationMs = endDate - startDate;
        const durationMinutes = Math.round(durationMs / 60000);

        const slotInfo = {
            start: startDate,
            end: endDate,
            resourceId: resourceId,
            resourceTitle: resourceTitle,
            department: resourceDept,
            duration: durationMinutes
        };

        // Check if user can block slots for this resource
        const canBlock = this.canManageBlockedSlot(resourceId);

        // Show action selection dialog
        this.showSlotActionDialog(slotInfo, canBlock);
    }

    /**
     * Show action dialog with options: Create Booking or Block Slot
     */
    showSlotActionDialog(slotInfo, canBlock) {
        const { start, end, resourceTitle } = slotInfo;

        const dateStr = start.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        const fields = [
            {
                fieldtype: 'HTML',
                options: `
                    <div class="ec-slot-info-card" style="margin-bottom: 20px;">
                        <div class="ec-slot-info-header">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            ${__('Selected Time Slot')}
                        </div>
                        <div class="ec-slot-info-body">
                            <div class="ec-slot-info-row">
                                <span class="ec-slot-info-label">${__('Date')}</span>
                                <span class="ec-slot-info-value">${dateStr}</span>
                            </div>
                            <div class="ec-slot-info-row">
                                <span class="ec-slot-info-label">${__('Time')}</span>
                                <span class="ec-slot-info-value">${startTime} - ${endTime}</span>
                            </div>
                            <div class="ec-slot-info-row">
                                <span class="ec-slot-info-label">${__('Team Member')}</span>
                                <span class="ec-slot-info-value">${resourceTitle}</span>
                            </div>
                        </div>
                    </div>
                `
            }
        ];

        const dialog = new frappe.ui.Dialog({
            title: __('Select Action'),
            fields: fields,
            primary_action_label: __('Create Booking'),
            primary_action: () => {
                dialog.hide();
                this.showSlotBookingDialog(slotInfo);
            }
        });

        // Add Block Slot button if user has permission
        if (canBlock) {
            dialog.set_secondary_action_label(__('Block Slot'));
            dialog.set_secondary_action(() => {
                dialog.hide();
                this.showBlockSlotDialog(slotInfo);
            });
        }

        dialog.show();
    }

    /**
     * Show a dialog for blocking a time slot.
     */
    showBlockSlotDialog(slotInfo) {
        const { start, end, resourceId, resourceTitle } = slotInfo;

        const dateStr = start.toISOString().split('T')[0];
        const startTime = start.toTimeString().substring(0, 5);
        const endTime = end.toTimeString().substring(0, 5);
        const displayDate = start.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const dialog = new frappe.ui.Dialog({
            title: __('Block Time Slot'),
            fields: [
                {
                    fieldtype: 'HTML',
                    options: `
                        <div class="ec-slot-info-card" style="margin-bottom: 15px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-color: #000;">
                            <div class="ec-slot-info-header" style="color: #fff;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="9" x2="15" y2="15"></line>
                                    <line x1="15" y1="9" x2="9" y2="15"></line>
                                </svg>
                                ${__('Blocking Time Slot')}
                            </div>
                            <div class="ec-slot-info-body">
                                <div class="ec-slot-info-row">
                                    <span class="ec-slot-info-label" style="color: #9ca3af;">${__('For')}</span>
                                    <span class="ec-slot-info-value" style="color: #fff;">${resourceTitle}</span>
                                </div>
                                <div class="ec-slot-info-row">
                                    <span class="ec-slot-info-label" style="color: #9ca3af;">${__('Date')}</span>
                                    <span class="ec-slot-info-value" style="color: #fff;">${displayDate}</span>
                                </div>
                                <div class="ec-slot-info-row">
                                    <span class="ec-slot-info-label" style="color: #9ca3af;">${__('Time')}</span>
                                    <span class="ec-slot-info-value" style="color: #fff;">${startTime} - ${endTime}</span>
                                </div>
                            </div>
                        </div>
                    `
                },
                {
                    fieldname: 'reason',
                    fieldtype: 'Small Text',
                    label: __('Reason'),
                    reqd: 1,
                    description: __('e.g., "Focus time", "Personal appointment", "Training"')
                }
            ],
            primary_action_label: __('Block Slot'),
            primary_action: async (values) => {
                // Validate reason is provided
                if (!values.reason || !values.reason.trim()) {
                    frappe.msgprint({
                        title: __('Missing Reason'),
                        message: __('Please provide a reason for blocking this time slot.'),
                        indicator: 'orange'
                    });
                    return;
                }

                dialog.disable_primary_action();

                try {
                    const response = await frappe.call({
                        method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.create_blocked_slot',
                        args: {
                            user: resourceId,
                            blocked_date: dateStr,
                            start_time: startTime,
                            end_time: endTime,
                            reason: values.reason.trim()
                        }
                    });

                    if (response.message && response.message.success) {
                        dialog.hide();
                        frappe.show_alert({
                            message: __('Time slot blocked successfully'),
                            indicator: 'green'
                        });
                        this.calendar.refetchEvents();
                    } else {
                        frappe.msgprint({
                            title: __('Error'),
                            message: response.message?.message || __('Failed to block slot'),
                            indicator: 'red'
                        });
                        dialog.enable_primary_action();
                    }
                } catch (error) {
                    frappe.msgprint({
                        title: __('Error'),
                        message: error.message || __('Failed to block slot'),
                        indicator: 'red'
                    });
                    dialog.enable_primary_action();
                }
            }
        });

        dialog.show();
    }

    /**
     * Show a dialog for creating a customer booking in the selected time slot.
     * Follows the mm_self_book_meeting approach:
     * 1. First select department (from user's accessible departments)
     * 2. Then meeting types load based on selected department
     */
    async showSlotBookingDialog(slotInfo) {
        const { start, end, resourceId, resourceTitle, department: resourceDepartment, duration } = slotInfo;

        // Format the date and time for display
        const dateStr = start.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        // Get user's accessible departments for the dropdown
        const userDepartments = this.userContext.accessible_departments || [];
        const departmentOptions = userDepartments.map(d => d.name);

        // Service type options
        const serviceTypeOptions = [
            'Business',
            'Business Extended',
            'Business Rebook',
            'New Setup Business',
            'Private / Business Customer',
            'Private New Sale',
            'Private Self Book'
        ];

        // Store meeting types data for display names
        let meetingTypesData = [];

        const dialog = new frappe.ui.Dialog({
            title: __('Create Customer Booking'),
            size: 'large',
            fields: [
                // Slot Info Section (read-only) - Full width row
                {
                    fieldtype: 'HTML',
                    fieldname: 'slot_info',
                    options: `
                        <div class="ec-slot-info-card" style="margin-bottom: 15px;">
                            <div class="ec-slot-info-header">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                ${__('Selected Time Slot')}
                            </div>
                            <div class="ec-slot-info-body" style="display: flex; gap: 40px; flex-wrap: wrap;">
                                <div class="ec-slot-info-row">
                                    <span class="ec-slot-info-label">${__('Date')}</span>
                                    <span class="ec-slot-info-value">${dateStr}</span>
                                </div>
                                <div class="ec-slot-info-row">
                                    <span class="ec-slot-info-label">${__('Time')}</span>
                                    <span class="ec-slot-info-value">${startTime} - ${endTime} (${duration} min)</span>
                                </div>
                                <div class="ec-slot-info-row">
                                    <span class="ec-slot-info-label">${__('Host')}</span>
                                    <span class="ec-slot-info-value"><strong>${resourceTitle}</strong></span>
                                </div>
                            </div>
                        </div>
                    `
                },
                {
                    fieldtype: 'Section Break'
                },
                // Department Selection - Same row as Meeting Type
                {
                    fieldtype: 'Select',
                    fieldname: 'department',
                    label: __('Department'),
                    options: [''].concat(departmentOptions),
                    reqd: 1,
                    onchange: async function() {
                        const selectedDept = this.get_value();
                        const mtField = dialog.fields_dict.meeting_type;

                        if (!selectedDept) {
                            // Clear meeting types
                            mtField.df.options = [''];
                            mtField.refresh();
                            mtField.set_value('');
                            meetingTypesData = [];
                            return;
                        }

                        // Fetch meeting types for selected department (customer-facing only)
                        try {
                            const response = await frappe.call({
                                method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_department_meeting_types',
                                args: { department: selectedDept, customer_only: 1 }
                            });
                            meetingTypesData = response.message || [];

                            // Update meeting type options
                            const mtOptions = meetingTypesData.map(mt => mt.name);
                            mtField.df.options = [''].concat(mtOptions);
                            mtField.refresh();
                            mtField.set_value('');

                            // Update display labels
                            setTimeout(() => {
                                const selectEl = mtField.$input;
                                if (selectEl && selectEl.length) {
                                    const options = selectEl.find('option');
                                    meetingTypesData.forEach((mt, index) => {
                                        const optEl = options.eq(index + 1);
                                        if (optEl.length) {
                                            optEl.text(`${mt.meeting_name} (${mt.duration} min)`);
                                        }
                                    });
                                }
                            }, 100);

                            if (meetingTypesData.length === 0) {
                                frappe.show_alert({
                                    message: __('No customer-facing meeting types available for this department'),
                                    indicator: 'orange'
                                });
                            }
                        } catch (error) {
                            console.error('Failed to load meeting types:', error);
                            mtField.df.options = [''];
                            mtField.refresh();
                            meetingTypesData = [];
                        }
                    }
                },
                {
                    fieldtype: 'Column Break'
                },
                // Meeting Type (populated based on department selection) - Same row as Department
                {
                    fieldtype: 'Select',
                    fieldname: 'meeting_type',
                    label: __('Meeting Type'),
                    options: [''],
                    reqd: 1
                },
                {
                    fieldtype: 'Section Break'
                },
                // Service Type - New row
                {
                    fieldtype: 'Select',
                    fieldname: 'service_type',
                    label: __('Service Type'),
                    options: [''].concat(serviceTypeOptions),
                    reqd: 1
                },
                {
                    fieldtype: 'Section Break',
                    label: __('Customer Information')
                },
                // Customer Search / Entry
                {
                    fieldtype: 'Link',
                    fieldname: 'existing_customer',
                    label: __('Search Existing Customer'),
                    options: 'MM Customer',
                    description: __('Search by name, email, CVR, or company name. Leave empty to create new customer.')
                },
                {
                    fieldtype: 'Section Break',
                    label: __('Or Enter New Customer Details'),
                    depends_on: 'eval:!doc.existing_customer',
                    collapsible: 0
                },
                {
                    fieldtype: 'Data',
                    fieldname: 'customer_name',
                    label: __('Customer Name'),
                    depends_on: 'eval:!doc.existing_customer',
                    mandatory_depends_on: 'eval:!doc.existing_customer'
                },
                {
                    fieldtype: 'Column Break'
                },
                {
                    fieldtype: 'Data',
                    fieldname: 'customer_email',
                    label: __('Customer Email'),
                    options: 'Email',
                    depends_on: 'eval:!doc.existing_customer',
                    mandatory_depends_on: 'eval:!doc.existing_customer'
                },
                {
                    fieldtype: 'Section Break'
                },
                {
                    fieldtype: 'Data',
                    fieldname: 'customer_phone',
                    label: __('Customer Phone'),
                    depends_on: 'eval:!doc.existing_customer'
                },
                {
                    fieldtype: 'Column Break'
                },
                {
                    fieldtype: 'Data',
                    fieldname: 'customer_cvr',
                    label: __('CVR Number'),
                    description: __('Danish business registration number')
                },
                {
                    fieldtype: 'Column Break'
                },
                {
                    fieldtype: 'Data',
                    fieldname: 'customer_company',
                    label: __('Company Name')
                },
                {
                    fieldtype: 'Section Break',
                    label: __('Meeting Details')
                },
                {
                    fieldtype: 'Small Text',
                    fieldname: 'meeting_agenda',
                    label: __('Meeting Agenda / Notes')
                },
                {
                    fieldtype: 'Section Break',
                    label: __('Email Notifications')
                },
                {
                    fieldtype: 'HTML',
                    fieldname: 'notification_switches',
                    options: `
                        <div class="ec-notification-switches" style="display: flex; gap: 24px; flex-wrap: wrap; padding: 8px 0;">
                            <label class="ec-switch-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" class="ec-switch-input" data-fieldname="send_notification" checked style="width: 18px; height: 18px; cursor: pointer;">
                                <span>${__('Notify Customer')}</span>
                            </label>
                            <label class="ec-switch-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" class="ec-switch-input" data-fieldname="notify_host" checked style="width: 18px; height: 18px; cursor: pointer;">
                                <span>${__('Notify Host')}</span>
                            </label>
                        </div>
                    `
                }
            ],
            primary_action_label: __('Create Booking'),
            primary_action: async (values) => {
                // Validate
                if (!values.department) {
                    frappe.msgprint(__('Please select a department.'));
                    return;
                }

                if (!values.meeting_type) {
                    frappe.msgprint(__('Please select a meeting type.'));
                    return;
                }

                if (!values.service_type) {
                    frappe.msgprint(__('Please select a service type.'));
                    return;
                }

                if (!values.existing_customer && (!values.customer_name || !values.customer_email)) {
                    frappe.msgprint(__('Please provide customer name and email, or select an existing customer.'));
                    return;
                }

                // Get notification values from HTML checkboxes
                const $wrapper = dialog.$wrapper;
                const sendNotification = $wrapper.find('[data-fieldname="send_notification"]').is(':checked') ? 1 : 0;
                const notifyHost = $wrapper.find('[data-fieldname="notify_host"]').is(':checked') ? 1 : 0;

                dialog.hide();

                try {
                    const response = await frappe.call({
                        method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.create_slot_booking',
                        args: {
                            booking_data: JSON.stringify({
                                department: values.department,
                                meeting_type: values.meeting_type,
                                assigned_to: resourceId,
                                start_datetime: this.formatDateTimeForServer(start),
                                end_datetime: this.formatDateTimeForServer(end),
                                customer_id: values.existing_customer || null,
                                customer_name: values.customer_name || null,
                                customer_email: values.customer_email || null,
                                customer_phone: values.customer_phone || null,
                                customer_cvr: values.customer_cvr || null,
                                customer_company: values.customer_company || null,
                                service_type: values.service_type,
                                meeting_agenda: values.meeting_agenda || null,
                                send_notification: sendNotification,
                                notify_host: notifyHost
                            })
                        }
                    });

                    if (response.message && response.message.success) {
                        frappe.show_alert({
                            message: __('Booking created successfully'),
                            indicator: 'green'
                        });
                        // Refresh calendar events
                        this.calendar.refetchEvents();
                    } else {
                        frappe.msgprint({
                            title: __('Error'),
                            indicator: 'red',
                            message: response.message?.message || __('Failed to create booking')
                        });
                    }
                } catch (error) {
                    console.error('Booking creation error:', error);
                    frappe.msgprint({
                        title: __('Error'),
                        indicator: 'red',
                        message: __('An error occurred while creating the booking.')
                    });
                }
            }
        });

        // Set department display names
        setTimeout(() => {
            const deptField = dialog.fields_dict.department;
            if (deptField && deptField.$input) {
                const options = deptField.$input.find('option');
                userDepartments.forEach((dept, index) => {
                    const optEl = options.eq(index + 1);
                    if (optEl.length) {
                        optEl.text(dept.department_name);
                    }
                });
            }

            // Pre-select resource's department if it matches one of user's departments
            if (resourceDepartment && departmentOptions.includes(resourceDepartment)) {
                deptField.set_value(resourceDepartment);
                // Trigger the onchange to load meeting types
                deptField.df.onchange.call(deptField);
            }
        }, 100);

        dialog.show();
    }
}
