/**
 * MM Meeting View Page
 * Modern meeting details view with Frappe theme integration
 */

frappe.pages['mm-meeting-view'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Meeting Details'),
        single_column: true
    });

    wrapper.meeting_view_page = new MeetingViewPage(wrapper, page);
};

frappe.pages['mm-meeting-view'].on_page_show = function(wrapper) {
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

        this.setupPageActions();
    }

    setupPageActions() {
        this.page.set_secondary_action(
            __('Back to Calendar'),
            () => frappe.set_route('mm-enhanced-calendar'),
            'arrow-left'
        );
    }

    async loadBooking(bookingId) {
        this.bookingId = bookingId;
        this.renderLoading();

        try {
            const response = await frappe.call({
                method: 'meeting_manager.meeting_manager.page.mm_enhanced_calendar.api.get_booking_details',
                args: { booking_id: bookingId }
            });

            if (!response.message || !response.message.success) {
                this.renderError(response.message?.message || __('Failed to load meeting details'));
                return;
            }

            this.data = response.message;
            this.render();
        } catch (error) {
            console.error('Error loading meeting details:', error);
            this.renderError(error.message || __('Error loading meeting details'));
        }
    }

    renderLoading() {
        this.$container.html(`
            <div class="mv-container">
                <div class="mv-loading" role="status" aria-label="${__('Loading meeting details')}">
                    <div class="mv-loading-spinner" aria-hidden="true"></div>
                    <span class="mv-loading-text">${__('Loading meeting details...')}</span>
                </div>
            </div>
        `);
    }

    renderError(message) {
        this.$container.html(`
            <div class="mv-container">
                <div class="mv-error" role="alert">
                    <svg class="mv-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h2 class="mv-error-title">${__('Unable to Load Meeting')}</h2>
                    <p class="mv-error-message">${frappe.utils.xss_sanitise(message)}</p>
                    <button class="btn btn-primary" onclick="frappe.set_route('mm-enhanced-calendar')">
                        ${__('Back to Calendar')}
                    </button>
                </div>
            </div>
        `);
    }

    render() {
        const { booking, meeting_type, department, customer, hosts, internal_participants, external_participants, user_context, permissions } = this.data;

        this.page.set_title(booking.meeting_title || __('Meeting Details'));

        const html = `
            <div class="mv-container">
                ${this.renderHeader(booking, user_context, permissions)}
                <div class="mv-content">
                    ${this.renderDateTimeCard(booking)}
                    ${this.renderMeetingInfoCard(booking, meeting_type, department)}
                    ${!booking.is_internal && customer ? this.renderCustomerCard(customer, booking) : ''}
                    ${hosts && hosts.length > 0 ? this.renderHostsCard(hosts, user_context) : ''}
                    ${internal_participants && internal_participants.length > 0 ? this.renderParticipantsCard(internal_participants, user_context) : ''}
                    ${external_participants && external_participants.length > 0 ? this.renderExternalParticipantsCard(external_participants) : ''}
                    ${booking.meeting_description ? this.renderNotesCard(booking.meeting_description) : ''}
                </div>
                ${this.renderActions(booking, permissions)}
            </div>
        `;

        this.$container.html(html);
        this.attachEventHandlers();
    }

    renderHeader(booking, user_context, permissions) {
        const statusClass = this.getStatusClass(booking.booking_status);
        const typeClass = booking.is_internal ? 'team' : 'customer';
        const typeLabel = booking.is_internal ? __('Team Meeting') : __('Customer Booking');

        return `
            <header class="mv-header">
                <div class="mv-header-top">
                    <div class="mv-header-badges" role="list" aria-label="${__('Meeting badges')}">
                        <span class="mv-badge ${typeClass}" role="listitem">${typeLabel}</span>
                        <span class="mv-badge ${statusClass}" role="listitem">${booking.booking_status || '-'}</span>
                        ${user_context.is_host ? `<span class="mv-your-role host" role="listitem">${this.getIcon('user-check')} ${__('You are a host')}</span>` : ''}
                        ${user_context.is_participant ? `<span class="mv-your-role" role="listitem">${this.getIcon('user')} ${__('You are a participant')}</span>` : ''}
                    </div>
                    <div class="mv-header-actions">
                        ${permissions.can_edit ? `
                            <button class="mv-action-btn primary" data-action="edit" aria-label="${__('Edit this meeting')}">
                                ${this.getIcon('edit-2')}
                                ${__('Edit')}
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="mv-header-content">
                    <h1 class="mv-title">${frappe.utils.xss_sanitise(booking.meeting_title || (this.data.customer ? this.data.customer.customer_name : __('Meeting')))}</h1>
                    ${booking.meeting_description ? `<p class="mv-subtitle">${this.truncate(frappe.utils.xss_sanitise(booking.meeting_description), 100)}</p>` : ''}
                </div>
            </header>
        `;
    }

    renderDateTimeCard(booking) {
        const startDt = booking.start_datetime ? new Date(booking.start_datetime) : null;
        const endDt = booking.end_datetime ? new Date(booking.end_datetime) : null;

        return `
            <article class="mv-card" aria-labelledby="datetime-title">
                <div class="mv-card-header">
                    <h2 class="mv-card-title" id="datetime-title">
                        ${this.getIcon('calendar')}
                        ${__('Date & Time')}
                    </h2>
                </div>
                <div class="mv-card-body">
                    <div class="mv-row">
                        <div class="mv-icon" aria-hidden="true">
                            ${this.getIcon('calendar')}
                        </div>
                        <div class="mv-info">
                            <div class="mv-label">${__('Date')}</div>
                            <div class="mv-value">${this.formatDate(startDt)}</div>
                        </div>
                    </div>
                    <div class="mv-time-grid" role="list" aria-label="${__('Time details')}">
                        <div class="mv-time-item" role="listitem">
                            <div class="mv-time-label">${__('Start')}</div>
                            <time class="mv-time-value" datetime="${booking.start_datetime}">${this.formatTime(startDt)}</time>
                        </div>
                        <div class="mv-time-item" role="listitem">
                            <div class="mv-time-label">${__('End')}</div>
                            <time class="mv-time-value" datetime="${booking.end_datetime}">${this.formatTime(endDt)}</time>
                        </div>
                        <div class="mv-time-item" role="listitem">
                            <div class="mv-time-label">${__('Duration')}</div>
                            <div class="mv-time-value">${this.formatDuration(booking.duration_minutes)}</div>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    renderMeetingInfoCard(booking, meeting_type, department) {
        return `
            <article class="mv-card" aria-labelledby="meetinginfo-title">
                <div class="mv-card-header">
                    <h2 class="mv-card-title" id="meetinginfo-title">
                        ${this.getIcon('info')}
                        ${__('Meeting Info')}
                    </h2>
                </div>
                <div class="mv-card-body">
                    <div class="mv-row">
                        <div class="mv-icon" aria-hidden="true">
                            ${this.getIcon('briefcase')}
                        </div>
                        <div class="mv-info">
                            <div class="mv-label">${__('Department')}</div>
                            <div class="mv-value">${frappe.utils.xss_sanitise(department.department_name || '-')}</div>
                        </div>
                    </div>
                    <div class="mv-row">
                        <div class="mv-icon" aria-hidden="true">
                            ${this.getIcon('layers')}
                        </div>
                        <div class="mv-info">
                            <div class="mv-label">${__('Meeting Type')}</div>
                            <div class="mv-value">${frappe.utils.xss_sanitise(meeting_type.meeting_name || '-')}</div>
                        </div>
                    </div>
                    ${meeting_type.location_type ? `
                        <div class="mv-row">
                            <div class="mv-icon" aria-hidden="true">
                                ${this.getIcon('map-pin')}
                            </div>
                            <div class="mv-info">
                                <div class="mv-label">${__('Location')}</div>
                                <div class="mv-value">
                                    <span class="mv-location-badge">
                                        ${this.getLocationIcon(meeting_type.location_type)}
                                        ${frappe.utils.xss_sanitise(meeting_type.location_type)}
                                        ${meeting_type.video_platform ? ` - ${frappe.utils.xss_sanitise(meeting_type.video_platform)}` : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    ${booking.service_type ? `
                        <div class="mv-row">
                            <div class="mv-icon" aria-hidden="true">
                                ${this.getIcon('tag')}
                            </div>
                            <div class="mv-info">
                                <div class="mv-label">${__('Service Type')}</div>
                                <div class="mv-value">${frappe.utils.xss_sanitise(booking.service_type)}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </article>
        `;
    }

    renderCustomerCard(customer, booking) {
        return `
            <article class="mv-card" aria-labelledby="customer-title">
                <div class="mv-card-header">
                    <h2 class="mv-card-title" id="customer-title">
                        ${this.getIcon('user')}
                        ${__('Customer')}
                    </h2>
                </div>
                <div class="mv-card-body">
                    <div class="mv-row">
                        <div class="mv-icon" aria-hidden="true">
                            ${this.getIcon('user')}
                        </div>
                        <div class="mv-info">
                            <div class="mv-label">${__('Name')}</div>
                            <div class="mv-value">
                                <a href="/app/mm-customer/${customer.name}" title="${__('View customer profile')}">
                                    ${frappe.utils.xss_sanitise(customer.customer_name)}
                                </a>
                            </div>
                        </div>
                    </div>
                    <div class="mv-row">
                        <div class="mv-icon" aria-hidden="true">
                            ${this.getIcon('mail')}
                        </div>
                        <div class="mv-info">
                            <div class="mv-label">${__('Email')}</div>
                            <div class="mv-value">
                                <a href="mailto:${customer.primary_email || booking.customer_email_at_booking || ''}">
                                    ${frappe.utils.xss_sanitise(customer.primary_email || booking.customer_email_at_booking || '-')}
                                </a>
                            </div>
                        </div>
                    </div>
                    ${customer.company_name ? `
                        <div class="mv-row">
                            <div class="mv-icon" aria-hidden="true">
                                ${this.getIcon('building')}
                            </div>
                            <div class="mv-info">
                                <div class="mv-label">${__('Company')}</div>
                                <div class="mv-value">${frappe.utils.xss_sanitise(customer.company_name)}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </article>
        `;
    }

    renderHostsCard(hosts, user_context) {
        const hostItems = hosts.map(host => {
            const initials = this.getInitials(host.full_name);
            const isYou = host.user === user_context.user;

            return `
                <div class="mv-participant" role="listitem">
                    <div class="mv-participant-avatar host" aria-hidden="true">${initials}</div>
                    <div class="mv-participant-info">
                        <div class="mv-participant-name">
                            ${frappe.utils.xss_sanitise(host.full_name)}
                            ${isYou ? `<span class="mv-participant-you host">${__('You')}</span>` : ''}
                        </div>
                        <div class="mv-participant-role">${host.is_primary_host ? __('Primary Host') : __('Host')}</div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <article class="mv-card" aria-labelledby="hosts-title">
                <div class="mv-card-header">
                    <h2 class="mv-card-title" id="hosts-title">
                        ${this.getIcon('users')}
                        ${__('Hosts')} (${hosts.length})
                    </h2>
                </div>
                <div class="mv-card-body">
                    <div class="mv-participants-list" role="list" aria-label="${__('Meeting hosts')}">
                        ${hostItems}
                    </div>
                </div>
            </article>
        `;
    }

    renderParticipantsCard(participants, user_context) {
        const participantItems = participants.map(participant => {
            const initials = this.getInitials(participant.full_name);
            const isYou = participant.user === user_context.user;
            const statusClass = participant.response_status ? participant.response_status.toLowerCase() : 'pending';

            return `
                <div class="mv-participant" role="listitem">
                    <div class="mv-participant-avatar" aria-hidden="true">${initials}</div>
                    <div class="mv-participant-info">
                        <div class="mv-participant-name">
                            ${frappe.utils.xss_sanitise(participant.full_name)}
                            ${isYou ? `<span class="mv-participant-you">${__('You')}</span>` : ''}
                        </div>
                        <div class="mv-participant-role">${__('Participant')}</div>
                    </div>
                    <span class="mv-participant-status ${statusClass}">${participant.response_status || __('Pending')}</span>
                </div>
            `;
        }).join('');

        return `
            <article class="mv-card" aria-labelledby="participants-title">
                <div class="mv-card-header">
                    <h2 class="mv-card-title" id="participants-title">
                        ${this.getIcon('users')}
                        ${__('Participants')} (${participants.length})
                    </h2>
                </div>
                <div class="mv-card-body">
                    <div class="mv-participants-list" role="list" aria-label="${__('Meeting participants')}">
                        ${participantItems}
                    </div>
                </div>
            </article>
        `;
    }

    renderExternalParticipantsCard(participants) {
        const participantItems = participants.map(participant => {
            const initials = participant.name ? this.getInitials(participant.name) : '?';
            const statusClass = participant.response_status ? participant.response_status.toLowerCase() : 'pending';

            return `
                <div class="mv-participant" role="listitem">
                    <div class="mv-participant-avatar external" aria-hidden="true">${initials}</div>
                    <div class="mv-participant-info">
                        <div class="mv-participant-name">${frappe.utils.xss_sanitise(participant.name || participant.email)}</div>
                        <div class="mv-participant-role">${frappe.utils.xss_sanitise(participant.email)}</div>
                    </div>
                    <span class="mv-participant-status ${statusClass}">${participant.response_status || __('Pending')}</span>
                </div>
            `;
        }).join('');

        return `
            <article class="mv-card full-width" aria-labelledby="external-title">
                <div class="mv-card-header">
                    <h2 class="mv-card-title" id="external-title">
                        ${this.getIcon('globe')}
                        ${__('External Participants')} (${participants.length})
                    </h2>
                </div>
                <div class="mv-card-body">
                    <div class="mv-participants-list" role="list" aria-label="${__('External participants')}">
                        ${participantItems}
                    </div>
                </div>
            </article>
        `;
    }

    renderNotesCard(description) {
        return `
            <article class="mv-card full-width" aria-labelledby="notes-title">
                <div class="mv-card-header">
                    <h2 class="mv-card-title" id="notes-title">
                        ${this.getIcon('file-text')}
                        ${__('Notes')}
                    </h2>
                </div>
                <div class="mv-card-body">
                    <div class="mv-notes">${frappe.utils.xss_sanitise(description)}</div>
                </div>
            </article>
        `;
    }

    renderActions(booking, permissions) {
        return `
            <footer class="mv-actions" role="toolbar" aria-label="${__('Meeting actions')}">
                ${permissions.can_cancel && booking.booking_status !== 'Cancelled' ? `
                    <button class="mv-action-btn danger" data-action="cancel" aria-label="${__('Cancel this meeting')}">
                        ${this.getIcon('x-circle')}
                        ${__('Cancel Meeting')}
                    </button>
                ` : ''}
                <a href="/app/mm-meeting-booking/${booking.name}" class="mv-desk-link" target="_blank" rel="noopener" aria-label="${__('Open meeting in Frappe Desk')}">
                    ${this.getIcon('external-link')}
                    ${__('Open in Desk')}
                </a>
            </footer>
        `;
    }

    attachEventHandlers() {
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

    // Utility Methods

    formatDate(date) {
        if (!date) return '-';
        return date.toLocaleDateString(frappe.boot.lang || 'en', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(date) {
        if (!date) return '-';
        return date.toLocaleTimeString(frappe.boot.lang || 'en', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    formatDuration(minutes) {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
        if (hours > 0) return `${hours}h`;
        return `${mins}m`;
    }

    getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    truncate(text, length) {
        if (!text || text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    getStatusClass(status) {
        if (!status) return '';
        const normalized = status.toLowerCase().replace(/[\s]+/g, '-');
        return `status-${normalized}`;
    }

    getIcon(name) {
        const icons = {
            'calendar': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
            'info': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
            'user': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
            'user-check': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>',
            'users': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
            'mail': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
            'briefcase': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
            'building': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>',
            'layers': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
            'map-pin': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
            'tag': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
            'file-text': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
            'globe': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
            'edit-2': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
            'x-circle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            'external-link': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
            'video': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
            'phone': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
            'home': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
            'arrow-left': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>'
        };
        return icons[name] || '';
    }

    getLocationIcon(locationType) {
        if (!locationType) return this.getIcon('map-pin');
        const type = locationType.toLowerCase();
        if (type.includes('video')) return this.getIcon('video');
        if (type.includes('phone')) return this.getIcon('phone');
        if (type.includes('physical')) return this.getIcon('home');
        return this.getIcon('map-pin');
    }
}
