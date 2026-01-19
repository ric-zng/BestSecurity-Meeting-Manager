frappe.pages['mm-meeting-view'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Meeting Details'),
        single_column: true
    });

    // Store page reference
    wrapper.meeting_view_page = new MeetingViewPage(wrapper, page);
};

frappe.pages['mm-meeting-view'].on_page_show = function(wrapper) {
    // Get booking ID from route
    const bookingId = frappe.get_route()[1];
    if (wrapper.meeting_view_page && bookingId) {
        wrapper.meeting_view_page.loadBooking(bookingId);
    }
};

class MeetingViewPage {
    constructor(wrapper, page) {
        this.wrapper = wrapper;
        this.page = page;
        this.$container = $(wrapper).find('.layout-main-section');
        this.bookingId = null;
        this.data = null;

        this.setupStyles();
        this.setupPageActions();
    }

    setupPageActions() {
        // Back button
        this.page.set_secondary_action(__('Back to Calendar'), () => {
            frappe.set_route('mm-enhanced-calendar');
        }, 'arrow-left');
    }

    setupStyles() {
        if (document.getElementById('mm-meeting-view-styles')) return;

        const style = document.createElement('style');
        style.id = 'mm-meeting-view-styles';
        style.textContent = `
            .mv-container {
                max-width: 900px;
                margin: 0 auto;
                padding: 24px;
            }

            .mv-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 100px 24px;
                color: #6b7280;
            }

            .mv-loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #e5e7eb;
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: mv-spin 0.8s linear infinite;
            }

            @keyframes mv-spin {
                to { transform: rotate(360deg); }
            }

            .mv-error {
                text-align: center;
                padding: 60px 24px;
                color: #dc2626;
            }

            .mv-error p {
                margin: 8px 0;
            }

            .mv-header {
                background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
                border-radius: 12px;
                padding: 24px 32px;
                margin-bottom: 24px;
                color: #ffffff;
            }

            .mv-header-badges {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 16px;
            }

            .mv-badge {
                display: inline-flex;
                align-items: center;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .mv-badge.team {
                background: rgba(139, 92, 246, 0.3);
                color: #c4b5fd;
            }

            .mv-badge.customer {
                background: rgba(59, 130, 246, 0.3);
                color: #93c5fd;
            }

            .mv-badge.confirmed {
                background: rgba(16, 185, 129, 0.3);
                color: #6ee7b7;
            }

            .mv-badge.pending {
                background: rgba(245, 158, 11, 0.3);
                color: #fcd34d;
            }

            .mv-badge.cancelled {
                background: rgba(239, 68, 68, 0.3);
                color: #fca5a5;
            }

            .mv-badge.completed {
                background: rgba(59, 130, 246, 0.3);
                color: #93c5fd;
            }

            .mv-badge.no-show {
                background: rgba(107, 114, 128, 0.3);
                color: #d1d5db;
            }

            .mv-your-role {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 6px 12px;
                background: rgba(139, 92, 246, 0.3);
                color: #c4b5fd;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .mv-your-role.host {
                background: rgba(16, 185, 129, 0.3);
                color: #6ee7b7;
            }

            .mv-title {
                font-size: 28px;
                font-weight: 700;
                margin: 0;
                line-height: 1.3;
            }

            .mv-content {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
            }

            @media (max-width: 768px) {
                .mv-content {
                    grid-template-columns: 1fr;
                }
            }

            .mv-card {
                background: #ffffff;
                border-radius: 12px;
                border: 1px solid #e5e7eb;
                overflow: hidden;
            }

            .mv-card.full-width {
                grid-column: 1 / -1;
            }

            .mv-card-header {
                background: #f8fafc;
                padding: 16px 20px;
                border-bottom: 1px solid #e5e7eb;
            }

            .mv-card-title {
                font-size: 13px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #6b7280;
                margin: 0;
            }

            .mv-card-body {
                padding: 20px;
            }

            .mv-row {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                margin-bottom: 16px;
            }

            .mv-row:last-child {
                margin-bottom: 0;
            }

            .mv-icon {
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                background: #f3f4f6;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .mv-icon svg {
                width: 20px;
                height: 20px;
                color: #6b7280;
            }

            .mv-info {
                flex: 1;
            }

            .mv-label {
                font-size: 12px;
                color: #6b7280;
                margin-bottom: 4px;
            }

            .mv-value {
                font-size: 15px;
                font-weight: 500;
                color: #1f2937;
            }

            .mv-time-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 16px;
            }

            .mv-time-item {
                background: #f9fafb;
                border-radius: 8px;
                padding: 16px;
                border: 1px solid #e5e7eb;
                text-align: center;
            }

            .mv-time-label {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                color: #6b7280;
                margin-bottom: 8px;
            }

            .mv-time-value {
                font-size: 20px;
                font-weight: 700;
                color: #1f2937;
            }

            .mv-participants-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .mv-participant {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: #f9fafb;
                border-radius: 10px;
                border: 1px solid #e5e7eb;
            }

            .mv-participant-avatar {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
                font-size: 14px;
                flex-shrink: 0;
            }

            .mv-participant-avatar.host {
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            }

            .mv-participant-avatar.external {
                background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
            }

            .mv-participant-info {
                flex: 1;
                min-width: 0;
            }

            .mv-participant-name {
                font-size: 14px;
                font-weight: 500;
                color: #1f2937;
            }

            .mv-participant-role {
                font-size: 12px;
                color: #6b7280;
            }

            .mv-participant-you {
                display: inline-flex;
                align-items: center;
                padding: 2px 8px;
                background: rgba(139, 92, 246, 0.1);
                color: #7c3aed;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                margin-left: 8px;
            }

            .mv-participant-you.host {
                background: rgba(16, 185, 129, 0.1);
                color: #059669;
            }

            .mv-participant-status {
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .mv-participant-status.accepted {
                background: rgba(16, 185, 129, 0.15);
                color: #059669;
            }

            .mv-participant-status.pending {
                background: rgba(245, 158, 11, 0.15);
                color: #d97706;
            }

            .mv-participant-status.declined {
                background: rgba(239, 68, 68, 0.15);
                color: #dc2626;
            }

            .mv-participant-status.tentative {
                background: rgba(107, 114, 128, 0.15);
                color: #6b7280;
            }

            .mv-notes {
                background: #f9fafb;
                border-radius: 8px;
                padding: 16px;
                border: 1px solid #e5e7eb;
                font-size: 14px;
                color: #374151;
                line-height: 1.7;
                white-space: pre-wrap;
            }

            .mv-actions {
                display: flex;
                gap: 12px;
                margin-top: 24px;
                padding-top: 24px;
                border-top: 1px solid #e5e7eb;
            }

            .mv-action-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                border: 1px solid #e5e7eb;
                background: #ffffff;
                color: #374151;
            }

            .mv-action-btn:hover {
                background: #f3f4f6;
            }

            .mv-action-btn svg {
                width: 18px;
                height: 18px;
            }

            .mv-action-btn.primary {
                background: #3b82f6;
                border-color: #3b82f6;
                color: #ffffff;
            }

            .mv-action-btn.primary:hover {
                background: #2563eb;
            }

            .mv-action-btn.danger {
                color: #dc2626;
                border-color: #fecaca;
            }

            .mv-action-btn.danger:hover {
                background: #fef2f2;
            }

            .mv-action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .mv-desk-link {
                font-size: 13px;
                color: #6b7280;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-left: auto;
            }

            .mv-desk-link:hover {
                color: #3b82f6;
            }

            .mv-empty {
                text-align: center;
                padding: 24px;
                color: #6b7280;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
    }

    async loadBooking(bookingId) {
        this.bookingId = bookingId;

        // Show loading state
        this.$container.html(`
            <div class="mv-container">
                <div class="mv-loading">
                    <div class="mv-loading-spinner"></div>
                </div>
            </div>
        `);

        try {
            const response = await frappe.call({
                method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_booking_details',
                args: { booking_id: bookingId }
            });

            if (!response.message || !response.message.success) {
                this.showError(response.message?.message || __('Failed to load meeting details'));
                return;
            }

            this.data = response.message;
            this.render();

        } catch (error) {
            console.error('Error loading meeting details:', error);
            this.showError(error.message || __('Error loading meeting details'));
        }
    }

    showError(message) {
        this.$container.html(`
            <div class="mv-container">
                <div class="mv-error">
                    <p style="font-size: 18px; font-weight: 500;">${__('Error')}</p>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="frappe.set_route('mm-enhanced-calendar')">
                        ${__('Back to Calendar')}
                    </button>
                </div>
            </div>
        `);
    }

    render() {
        const { booking, meeting_type, department, customer, hosts, internal_participants, external_participants, user_context, permissions } = this.data;

        // Update page title
        this.page.set_title(booking.meeting_title || __('Meeting Details'));

        // Format date and time
        const startDt = booking.start_datetime ? new Date(booking.start_datetime) : null;
        const endDt = booking.end_datetime ? new Date(booking.end_datetime) : null;

        const formatDate = (date) => {
            if (!date) return '-';
            return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        };

        const formatTime = (date) => {
            if (!date) return '-';
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        };

        const formatDuration = (minutes) => {
            if (!minutes) return '-';
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
            if (hours > 0) return `${hours}h`;
            return `${mins}m`;
        };

        const statusClass = booking.booking_status ? booking.booking_status.toLowerCase().replace(/[\s-]+/g, '-') : '';
        const typeClass = booking.is_internal ? 'team' : 'customer';

        let html = `<div class="mv-container">`;

        // Header
        html += `
            <div class="mv-header">
                <div class="mv-header-badges">
                    <span class="mv-badge ${typeClass}">${booking.is_internal ? __('Team Meeting') : __('Customer Booking')}</span>
                    <span class="mv-badge ${statusClass}">${booking.booking_status || '-'}</span>
                    ${user_context.is_host ? `<span class="mv-your-role host">${__('You are a host')}</span>` : ''}
                    ${user_context.is_participant ? `<span class="mv-your-role">${__('You are a participant')}</span>` : ''}
                </div>
                <h1 class="mv-title">${booking.meeting_title || (customer ? customer.customer_name : __('Meeting'))}</h1>
            </div>
        `;

        // Content grid
        html += `<div class="mv-content">`;

        // Date & Time Card
        html += `
            <div class="mv-card">
                <div class="mv-card-header">
                    <h3 class="mv-card-title">${__('Date & Time')}</h3>
                </div>
                <div class="mv-card-body">
                    <div class="mv-row">
                        <div class="mv-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <div class="mv-info">
                            <div class="mv-label">${__('Date')}</div>
                            <div class="mv-value">${formatDate(startDt)}</div>
                        </div>
                    </div>
                    <div class="mv-time-grid">
                        <div class="mv-time-item">
                            <div class="mv-time-label">${__('Start')}</div>
                            <div class="mv-time-value">${formatTime(startDt)}</div>
                        </div>
                        <div class="mv-time-item">
                            <div class="mv-time-label">${__('End')}</div>
                            <div class="mv-time-value">${formatTime(endDt)}</div>
                        </div>
                        <div class="mv-time-item">
                            <div class="mv-time-label">${__('Duration')}</div>
                            <div class="mv-time-value">${formatDuration(booking.duration_minutes)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Meeting Info Card
        html += `
            <div class="mv-card">
                <div class="mv-card-header">
                    <h3 class="mv-card-title">${__('Meeting Info')}</h3>
                </div>
                <div class="mv-card-body">
                    <div class="mv-row">
                        <div class="mv-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <div class="mv-info">
                            <div class="mv-label">${__('Department')}</div>
                            <div class="mv-value">${department.department_name || '-'}</div>
                        </div>
                    </div>
                    <div class="mv-row">
                        <div class="mv-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                                <polyline points="2 17 12 22 22 17"></polyline>
                                <polyline points="2 12 12 17 22 12"></polyline>
                            </svg>
                        </div>
                        <div class="mv-info">
                            <div class="mv-label">${__('Meeting Type')}</div>
                            <div class="mv-value">${meeting_type.meeting_name || '-'}</div>
                        </div>
                    </div>
                    ${booking.service_type ? `
                    <div class="mv-row">
                        <div class="mv-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            </svg>
                        </div>
                        <div class="mv-info">
                            <div class="mv-label">${__('Service Type')}</div>
                            <div class="mv-value">${booking.service_type}</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Customer Card (for customer bookings)
        if (!booking.is_internal && customer) {
            html += `
                <div class="mv-card">
                    <div class="mv-card-header">
                        <h3 class="mv-card-title">${__('Customer')}</h3>
                    </div>
                    <div class="mv-card-body">
                        <div class="mv-row">
                            <div class="mv-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            <div class="mv-info">
                                <div class="mv-label">${__('Name')}</div>
                                <div class="mv-value">${customer.customer_name}</div>
                            </div>
                        </div>
                        <div class="mv-row">
                            <div class="mv-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                            </div>
                            <div class="mv-info">
                                <div class="mv-label">${__('Email')}</div>
                                <div class="mv-value">${customer.primary_email || booking.customer_email_at_booking || '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Hosts Card
        if (hosts && hosts.length > 0) {
            html += `
                <div class="mv-card">
                    <div class="mv-card-header">
                        <h3 class="mv-card-title">${__('Hosts')}</h3>
                    </div>
                    <div class="mv-card-body">
                        <div class="mv-participants-list">
            `;

            for (const host of hosts) {
                const initials = this.getInitials(host.full_name);
                const isYou = host.user === user_context.user;
                html += `
                    <div class="mv-participant">
                        <div class="mv-participant-avatar host">${initials}</div>
                        <div class="mv-participant-info">
                            <div class="mv-participant-name">
                                ${host.full_name}
                                ${isYou ? `<span class="mv-participant-you host">${__('You')}</span>` : ''}
                            </div>
                            <div class="mv-participant-role">${host.is_primary_host ? __('Primary Host') : __('Host')}</div>
                        </div>
                    </div>
                `;
            }

            html += `
                        </div>
                    </div>
                </div>
            `;
        }

        // Internal Participants Card
        if (internal_participants && internal_participants.length > 0) {
            html += `
                <div class="mv-card">
                    <div class="mv-card-header">
                        <h3 class="mv-card-title">${__('Participants')}</h3>
                    </div>
                    <div class="mv-card-body">
                        <div class="mv-participants-list">
            `;

            for (const participant of internal_participants) {
                const initials = this.getInitials(participant.full_name);
                const isYou = participant.user === user_context.user;
                const statusClass = participant.response_status ? participant.response_status.toLowerCase() : 'pending';
                html += `
                    <div class="mv-participant">
                        <div class="mv-participant-avatar">${initials}</div>
                        <div class="mv-participant-info">
                            <div class="mv-participant-name">
                                ${participant.full_name}
                                ${isYou ? `<span class="mv-participant-you">${__('You')}</span>` : ''}
                            </div>
                            <div class="mv-participant-role">${__('Participant')}</div>
                        </div>
                        <span class="mv-participant-status ${statusClass}">${participant.response_status || __('Pending')}</span>
                    </div>
                `;
            }

            html += `
                        </div>
                    </div>
                </div>
            `;
        }

        // External Participants Card
        if (external_participants && external_participants.length > 0) {
            html += `
                <div class="mv-card full-width">
                    <div class="mv-card-header">
                        <h3 class="mv-card-title">${__('External Participants')}</h3>
                    </div>
                    <div class="mv-card-body">
                        <div class="mv-participants-list">
            `;

            for (const participant of external_participants) {
                const initials = participant.name ? this.getInitials(participant.name) : '?';
                const statusClass = participant.response_status ? participant.response_status.toLowerCase() : 'pending';
                html += `
                    <div class="mv-participant">
                        <div class="mv-participant-avatar external">${initials}</div>
                        <div class="mv-participant-info">
                            <div class="mv-participant-name">${participant.name || participant.email}</div>
                            <div class="mv-participant-role">${participant.email}</div>
                        </div>
                        <span class="mv-participant-status ${statusClass}">${participant.response_status || __('Pending')}</span>
                    </div>
                `;
            }

            html += `
                        </div>
                    </div>
                </div>
            `;
        }

        // Notes Card
        if (booking.meeting_description) {
            html += `
                <div class="mv-card full-width">
                    <div class="mv-card-header">
                        <h3 class="mv-card-title">${__('Notes')}</h3>
                    </div>
                    <div class="mv-card-body">
                        <div class="mv-notes">${booking.meeting_description}</div>
                    </div>
                </div>
            `;
        }

        html += `</div>`; // End content grid

        // Actions
        html += `
            <div class="mv-actions">
                ${permissions.can_edit ? `
                    <button class="mv-action-btn primary" data-action="edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        ${__('Edit Meeting')}
                    </button>
                ` : ''}
                ${permissions.can_cancel ? `
                    <button class="mv-action-btn danger" data-action="cancel">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        ${__('Cancel Meeting')}
                    </button>
                ` : ''}
                <a href="/app/mm-meeting-booking/${booking.name}" class="mv-desk-link" target="_blank">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    ${__('Open in Desk')}
                </a>
            </div>
        `;

        html += `</div>`; // End container

        this.$container.html(html);
        this.attachActionHandlers();
    }

    getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    attachActionHandlers() {
        this.$container.find('[data-action="edit"]').on('click', () => {
            frappe.set_route('Form', 'MM Meeting Booking', this.bookingId);
        });

        this.$container.find('[data-action="cancel"]').on('click', () => {
            this.confirmCancelMeeting();
        });
    }

    confirmCancelMeeting() {
        frappe.confirm(
            __('Are you sure you want to cancel this meeting? This action cannot be undone.'),
            async () => {
                try {
                    await frappe.call({
                        method: 'frappe.client.set_value',
                        args: {
                            doctype: 'MM Meeting Booking',
                            name: this.bookingId,
                            fieldname: 'booking_status',
                            value: 'Cancelled'
                        }
                    });

                    frappe.show_alert({
                        message: __('Meeting cancelled successfully'),
                        indicator: 'green'
                    });

                    // Reload to show updated status
                    this.loadBooking(this.bookingId);
                } catch (error) {
                    frappe.show_alert({
                        message: __('Failed to cancel meeting: ') + error.message,
                        indicator: 'red'
                    });
                }
            }
        );
    }
}
