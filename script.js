// ============================================================
// EVENTSPHERE - COMPLETE FRONTEND JAVASCRIPT
// ============================================================

console.log("EventSphere JavaScript loading...");

const API = "";

// ============================================================
// LOCAL STORAGE
// ============================================================

// Used for "Event Completed" status
const COMPLETED_EVENTS_KEY = "eventsphere_completed_events";

// Used as frontend backup for event ratings
const EVENT_RATINGS_KEY = "eventsphere_event_ratings";

// Used as frontend backup for event-specific vendor ratings
const EVENT_VENDOR_RATINGS_KEY = "eventsphere_event_vendor_ratings";


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("EventSphere page loaded.");

    setupNavigation();
    setupVendorTabs();
    setupVendorForm();
    setupRegistrationForm();
    setupCheckIn();
    setupAssignmentForm();
    setupReviewFlow();

    loadEvents();
    loadVendors();
    loadAssignments();
    loadDashboardStats();

    updateCompletionUI();
});


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    const links = document.querySelectorAll(".nav-links a");

    links.forEach(function (link) {

        link.addEventListener("click", function (e) {

            e.preventDefault();

            const tabName = this.dataset.tab;

            links.forEach(function (item) {
                item.classList.remove("active");
            });

            this.classList.add("active");

            document
                .querySelectorAll(".tab-content")
                .forEach(function (section) {
                    section.classList.remove("active");
                });

            const target = document.getElementById(tabName);

            if (target) {
                target.classList.add("active");
            }

            if (tabName === "dashboard") {
                loadEvents();
                loadVendors();
                loadDashboardStats();
            }

            if (tabName === "attendees") {
                loadEvents();
            }

            if (tabName === "vendors") {
                loadVendors();
            }
        });
    });
}


// ============================================================
// VENDOR TABS
// ============================================================

function setupVendorTabs() {

    const vendorTabs =
        document.querySelectorAll(".vendor-tab");

    vendorTabs.forEach(function (tab) {

        tab.addEventListener("click", function (e) {

            e.preventDefault();

            const tabName = this.dataset.vtab;

            vendorTabs.forEach(function (item) {
                item.classList.remove("active");
            });

            this.classList.add("active");

            document
                .querySelectorAll(".vendor-content")
                .forEach(function (content) {
                    content.classList.remove("active");
                });

            const target =
                document.getElementById(tabName);

            if (target) {
                target.classList.add("active");
            }

            if (tabName === "list") {
                loadVendors();
            }

            if (tabName === "assign") {
                loadAssignmentForm();
            }

            if (tabName === "assignments") {
                loadAssignments();
            }
        });
    });
}


// ============================================================
// VENDOR FORM
// ============================================================

function setupVendorForm() {

    const form =
        document.getElementById("vendorForm");

    if (!form) return;

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        const data = {

            name:
                document.getElementById("vendorName")
                    .value.trim(),

            service_type:
                document.getElementById("vendorService")
                    .value,

            contact_number:
                document.getElementById("vendorPhone")
                    .value.trim(),

            email:
                document.getElementById("vendorEmail")
                    .value.trim(),

            availability:
                document.getElementById("vendorAvailability")
                    .value.trim()
        };

        if (!data.name) {
            alert("Please enter the vendor name.");
            return;
        }

        if (!data.service_type) {
            alert("Please select a service type.");
            return;
        }

        try {

            const response =
                await fetch(
                    API + "/api/vendors",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(data)
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Failed to add vendor."
                );
            }

            const resultBox =
                document.getElementById(
                    "vendorResult"
                );

            if (resultBox) {

                resultBox.className =
                    "result-box";

                resultBox.innerHTML = `
                    <p>
                        ✅ ${
                            escapeHtml(
                                result.message ||
                                "Vendor added successfully!"
                            )
                        }
                    </p>

                    <p>
                        <strong>Vendor ID:</strong>
                        ${
                            escapeHtml(
                                result.vendor?.vendor_id ||
                                result.vendor?.id ||
                                "Generated successfully"
                            )
                        }
                    </p>
                `;
            }

            form.reset();

            await loadVendors();
            await loadDashboardStats();

            alert("Vendor added successfully! 🎉");

        } catch (error) {

            console.error(
                "Error adding vendor:",
                error
            );

            showError(
                "vendorResult",
                error.message
            );

            alert(
                "Error adding vendor: " +
                error.message
            );
        }
    });
}


// ============================================================
// LOAD VENDORS
// ============================================================

async function loadVendors() {

    try {

        const response =
            await fetch(
                API + "/api/vendors"
            );

        if (!response.ok) {

            throw new Error(
                "Unable to load vendors."
            );
        }

        let vendors =
            await response.json();

        if (!Array.isArray(vendors)) {

            vendors =
                Array.isArray(vendors?.vendors)
                    ? vendors.vendors
                    : [];
        }

        const tbody =
            document.getElementById(
                "vendorsBody"
            );

        if (tbody) {

            if (vendors.length === 0) {

                tbody.innerHTML = `
                    <tr>
                        <td
                            colspan="5"
                            class="text-center"
                        >
                            No vendors added yet.
                        </td>
                    </tr>
                `;

            } else {

                tbody.innerHTML =
                    vendors.map(function (vendor) {

                        const rating =
                            Number(vendor.rating);

                        let ratingText =
                            "Not rated";

                        if (
                            Number.isFinite(rating) &&
                            rating > 0
                        ) {

                            ratingText =
                                "⭐".repeat(
                                    Math.round(rating)
                                ) +
                                ` (${rating}/5)`;
                        }

                        const vendorId =
                            vendor.vendor_id ||
                            vendor.id ||
                            "N/A";

                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHtml(vendorId)}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        vendor.name || "N/A"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        vendor.service_type ||
                                        "N/A"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        vendor.contact_number ||
                                        vendor.phone ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${ratingText}
                                </td>

                            </tr>
                        `;

                    }).join("");
            }
        }

        const totalVendors =
            document.getElementById(
                "totalVendors"
            );

        if (totalVendors) {
            totalVendors.textContent =
                vendors.length;
        }

        populateVendorSelect(vendors);

    } catch (error) {

        console.error(
            "Error loading vendors:",
            error
        );

        showError(
            "vendorsBody",
            error.message
        );
    }
}


// ============================================================
// VENDOR DROPDOWN
// ============================================================

function populateVendorSelect(vendors) {

    const select =
        document.getElementById(
            "assignVendorId"
        );

    if (!select) return;

    select.innerHTML = `
        <option value="">
            Select vendor...
        </option>
    `;

    vendors.forEach(function (vendor) {

        const option =
            document.createElement("option");

        option.value =
            vendor.vendor_id ||
            vendor.id ||
            "";

        option.textContent =
            `${vendor.name || "Unknown"} - ${
                vendor.service_type ||
                "General Service"
            }`;

        select.appendChild(option);
    });
}


// ============================================================
// LOAD EVENTS
// ============================================================

async function loadEvents() {

    try {

        const response =
            await fetch(
                API + "/api/events"
            );

        if (!response.ok) {

            throw new Error(
                "Unable to load events."
            );
        }

        let events =
            await response.json();

        if (!Array.isArray(events)) {

            events =
                Array.isArray(events?.events)
                    ? events.events
                    : [];
        }

        const container =
            document.getElementById(
                "eventsContainer"
            );

        if (container) {

            if (events.length === 0) {

                container.innerHTML = `
                    <p class="text-center">
                        No events available.
                    </p>
                `;

            } else {

                container.innerHTML =
                    events.map(function (event) {

                        const completed =
                            isEventCompleted(event.id);

                        return `
                            <div class="event-card">

                                <h3>
                                    ${escapeHtml(
                                        event.name
                                    )}
                                </h3>

                                <div class="event-meta">
                                    <i class="fas fa-calendar-alt"></i>
                                    ${escapeHtml(
                                        event.date ||
                                        "Date TBD"
                                    )}
                                </div>

                                <div class="event-meta">
                                    <i class="fas fa-map-marker-alt"></i>
                                    ${escapeHtml(
                                        event.venue ||
                                        "Venue TBD"
                                    )}
                                </div>

                                <div class="event-meta">
                                    <i class="fas fa-users"></i>
                                    Capacity:
                                    ${escapeHtml(
                                        event.capacity ||
                                        "Unlimited"
                                    )}
                                </div>

                                ${
                                    completed
                                        ? `
                                            <div
                                                style="
                                                    margin-top:10px;
                                                    font-weight:600;
                                                "
                                            >
                                                ✅ Event Completed
                                            </div>
                                        `
                                        : ""
                                }

                            </div>
                        `;

                    }).join("");
            }
        }

        const totalEvents =
            document.getElementById(
                "totalEvents"
            );

        if (totalEvents) {
            totalEvents.textContent =
                events.length;
        }

        populateEventSelect(
            "regEventId",
            events,
            "Choose an event..."
        );

        populateEventSelect(
            "attendeeEventFilter",
            events,
            "Select Event"
        );

        populateEventSelect(
            "assignEventId",
            events,
            "Select event..."
        );

        populateEventSelect(
            "reviewEventId",
            events,
            "Select event..."
        );

        populateEventSelect(
            "reportEventId",
            events,
            "Select event..."
        );

        updateCompletionUI();

    } catch (error) {

        console.error(
            "Error loading events:",
            error
        );
    }
}


// ============================================================
// EVENT DROPDOWNS
// ============================================================

function populateEventSelect(
    selectId,
    events,
    defaultText
) {

    const select =
        document.getElementById(selectId);

    if (!select) return;

    const oldValue =
        select.value;

    select.innerHTML = `
        <option value="">
            ${escapeHtml(defaultText)}
        </option>
    `;

    events.forEach(function (event) {

        const option =
            document.createElement("option");

        option.value =
            event.id;

        option.textContent =
            event.name;

        select.appendChild(option);
    });

    if (
        oldValue &&
        [...select.options].some(
            option =>
                option.value === oldValue
        )
    ) {

        select.value = oldValue;
    }
}


// ============================================================
// REGISTRATION
// ============================================================

function setupRegistrationForm() {

    const form =
        document.getElementById(
            "registrationForm"
        );

    if (!form) return;

    form.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();

            const data = {

                event_id:
                    parseInt(
                        document.getElementById(
                            "regEventId"
                        ).value
                    ),

                name:
                    document.getElementById(
                        "regName"
                    ).value.trim(),

                email:
                    document.getElementById(
                        "regEmail"
                    ).value.trim(),

                phone:
                    document.getElementById(
                        "regPhone"
                    ).value.trim(),

                college:
                    document.getElementById(
                        "regCollege"
                    ).value.trim(),

                department:
                    document.getElementById(
                        "regDepartment"
                    ).value.trim()
            };

            if (!data.event_id) {

                alert(
                    "Please select an event."
                );

                return;
            }

            try {

                const response =
                    await fetch(
                        API + "/api/register",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify(data)
                        }
                    );

                const result =
                    await response.json();

                if (!response.ok) {

                    throw new Error(
                        result.error ||
                        "Registration failed."
                    );
                }

                const ticket =
                    result.ticket;

                const resultBox =
                    document.getElementById(
                        "registrationResult"
                    );

                if (resultBox) {

                    resultBox.className =
                        "result-box";

                    resultBox.innerHTML = `
                        <div class="ticket">

                            <div>
                                🎫 Registration Successful!
                            </div>

                            <div class="ticket-id">
                                ${escapeHtml(
                                    ticket.ticketId
                                )}
                            </div>

                            <div class="ticket-name">
                                ${escapeHtml(
                                    ticket.name
                                )}
                            </div>

                            <div>
                                ${escapeHtml(
                                    ticket.eventName ||
                                    "Event"
                                )}
                            </div>

                            <img
                                src="${ticket.qrCode}"
                                alt="QR Code"
                                style="
                                    max-width:120px;
                                    margin:10px auto;
                                    display:block;
                                "
                            >

                            <div>
                                Scan to check in
                            </div>

                        </div>
                    `;
                }

                form.reset();

                await loadDashboardStats();

                alert(
                    "Registration successful! 🎉"
                );

            } catch (error) {

                console.error(
                    "Registration error:",
                    error
                );

                showError(
                    "registrationResult",
                    error.message
                );

                alert(
                    "Registration error: " +
                    error.message
                );
            }
        }
    );
}


// ============================================================
// ATTENDEES
// ============================================================

async function loadAttendees() {

    const eventFilter =
        document.getElementById(
            "attendeeEventFilter"
        );

    const tbody =
        document.getElementById(
            "attendeesBody"
        );

    if (!eventFilter || !tbody) {
        return;
    }

    const eventId =
        eventFilter.value;

    if (!eventId) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="text-center"
                >
                    Select an event to view attendees
                </td>
            </tr>
        `;

        return;
    }

    try {

        const response =
            await fetch(
                API +
                "/api/attendees/" +
                eventId
            );

        if (!response.ok) {

            throw new Error(
                "Unable to load attendees."
            );
        }

        const attendees =
            await response.json();

        if (
            !attendees ||
            attendees.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="text-center"
                    >
                        No attendees registered for this event.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            attendees.map(function (attendee) {

                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    attendee.ticket_id
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHtml(
                                attendee.name
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                attendee.email
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                attendee.phone
                            )}
                        </td>

                        <td>
                            <span class="status-badge">
                                ${escapeHtml(
                                    attendee.status
                                )}
                            </span>
                        </td>

                        <td>
                            ${
                                attendee.qr_code
                                    ? `
                                        <img
                                            src="${attendee.qr_code}"
                                            alt="QR"
                                            style="
                                                max-width:48px;
                                                border-radius:6px;
                                            "
                                        >
                                    `
                                    : "—"
                            }
                        </td>

                    </tr>
                `;

            }).join("");

    } catch (error) {

        console.error(
            "Error loading attendees:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="text-center"
                >
                    ❌ ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>
        `;
    }
}


// ============================================================
// CHECK-IN
// ============================================================

function setupCheckIn() {

    const input =
        document.getElementById(
            "checkinTicket"
        );

    if (!input) return;

    input.addEventListener(
        "keypress",
        function (e) {

            if (e.key === "Enter") {
                checkIn();
            }
        }
    );
}


async function checkIn() {

    const input =
        document.getElementById(
            "checkinTicket"
        );

    const resultBox =
        document.getElementById(
            "checkinResult"
        );

    if (!input) return;

    const ticketId =
        input.value.trim();

    if (!ticketId) {

        alert(
            "Please enter a Ticket ID."
        );

        return;
    }

    try {

        const response =
            await fetch(
                API + "/api/checkin",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            ticket_id:
                                ticketId
                        })
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            throw new Error(
                result.error ||
                "Check-in failed."
            );
        }

        if (resultBox) {

            resultBox.className =
                "result-box";

            resultBox.innerHTML = `
                <h4>
                    ✅ ${escapeHtml(
                        result.message
                    )}
                </h4>

                <p>
                    <strong>Name:</strong>
                    ${escapeHtml(
                        result.attendee.name
                    )}
                </p>

                <p>
                    <strong>Ticket:</strong>
                    ${escapeHtml(
                        result.attendee.ticket
                    )}
                </p>
            `;
        }

        input.value = "";

        await loadDashboardStats();

        alert(
            "Check-in successful! ✅"
        );

    } catch (error) {

        console.error(
            "Check-in error:",
            error
        );

        showError(
            "checkinResult",
            error.message
        );

        alert(
            "Check-in error: " +
            error.message
        );
    }
}


// ============================================================
// VENDOR ASSIGNMENT
// ============================================================

async function loadAssignmentForm() {

    await loadEvents();
    await loadVendors();
}


function setupAssignmentForm() {

    const form =
        document.getElementById(
            "assignForm"
        );

    if (!form) return;

    form.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();

            const eventId =
                parseInt(
                    document.getElementById(
                        "assignEventId"
                    ).value
                );

            const vendorId =
                document.getElementById(
                    "assignVendorId"
                ).value;

            const service =
                document.getElementById(
                    "assignService"
                ).value.trim();

            if (!eventId) {

                alert(
                    "Please select an event."
                );

                return;
            }

            if (!vendorId) {

                alert(
                    "Please select a vendor."
                );

                return;
            }

            try {

                const response =
                    await fetch(
                        API +
                        "/api/assign-vendor",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify({

                                    event_id:
                                        eventId,

                                    vendor_id:
                                        vendorId,

                                    service:
                                        service
                                })
                        }
                    );

                const result =
                    await response.json();

                if (!response.ok) {

                    throw new Error(
                        result.error ||
                        "Vendor assignment failed."
                    );
                }

                showSuccess(
                    "assignResult",
                    result.message ||
                    "Vendor assigned successfully!"
                );

                form.reset();

                await loadAssignments();

                alert(
                    "Vendor assigned successfully! 🎉"
                );

            } catch (error) {

                console.error(
                    "Assignment error:",
                    error
                );

                showError(
                    "assignResult",
                    error.message
                );

                alert(
                    "Assignment error: " +
                    error.message
                );
            }
        }
    );
}


// ============================================================
// LOAD ASSIGNMENTS
// ============================================================

async function loadAssignments() {

    const tbody =
        document.getElementById(
            "assignmentsBody"
        );

    if (!tbody) return;

    try {

        const response =
            await fetch(
                API +
                "/api/vendor-assignments"
            );

        if (!response.ok) {

            throw new Error(
                "Unable to load assignments."
            );
        }

        const assignments =
            await response.json();

        if (
            !assignments ||
            assignments.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="text-center"
                    >
                        No assignments yet.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            assignments.map(
                function (assignment) {

                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    assignment.event_name ||
                                    assignment.event_id
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    assignment.vendor_name ||
                                    assignment.vendor_id
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    assignment.service ||
                                    assignment.service_type ||
                                    "General Service"
                                )}
                            </td>

                            <td>
                                <span class="status-badge">
                                    ${escapeHtml(
                                        assignment.status ||
                                        "Assigned"
                                    )}
                                </span>
                            </td>

                            <td>
                                ${
                                    assignment.assigned_at
                                        ? new Date(
                                            assignment.assigned_at
                                          ).toLocaleDateString()
                                        : "—"
                                }
                            </td>

                        </tr>
                    `;
                }
            ).join("");

    } catch (error) {

        console.error(
            "Error loading assignments:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="text-center"
                >
                    ❌ ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>
        `;
    }
}


// ============================================================
// MILESTONE 2
// EVENT COMPLETION + RATINGS + REPORT
// ============================================================

function setupReviewFlow() {

    const eventSelect =
        document.getElementById(
            "reviewEventId"
        );

    if (!eventSelect) return;

    eventSelect.addEventListener(
        "change",
        async function () {

            const eventId =
                parseInt(this.value);

            updateCompletionUI();

            if (!eventId) {

                clearVendorRatingArea();

                return;
            }

            await loadEventVendorsForRating(
                eventId
            );
        }
    );
}


// ============================================================
// EVENT COMPLETION
// ============================================================

function getCompletedEvents() {

    try {

        const data =
            localStorage.getItem(
                COMPLETED_EVENTS_KEY
            );

        if (!data) return [];

        const parsed =
            JSON.parse(data);

        return Array.isArray(parsed)
            ? parsed.map(Number)
            : [];

    } catch (error) {

        console.error(
            "Completion storage error:",
            error
        );

        return [];
    }
}


function isEventCompleted(eventId) {

    return getCompletedEvents()
        .includes(Number(eventId));
}


function markEventCompleted() {

    const select =
        document.getElementById(
            "reviewEventId"
        );

    if (!select || !select.value) {

        alert(
            "Please select an event first."
        );

        return;
    }

    const eventId =
        Number(select.value);

    const completed =
        getCompletedEvents();

    if (!completed.includes(eventId)) {

        completed.push(eventId);

        localStorage.setItem(
            COMPLETED_EVENTS_KEY,
            JSON.stringify(completed)
        );
    }

    updateCompletionUI();

    alert(
        "Event marked as completed! ✅\n\nYou can now submit the event rating and vendor ratings."
    );

    loadEventVendorsForRating(eventId);
}


function updateCompletionUI() {

    const select =
        document.getElementById(
            "reviewEventId"
        );

    const status =
        document.getElementById(
            "eventCompletionStatus"
        );

    const completeButton =
        document.getElementById(
            "completeEventBtn"
        );

    const ratingButton =
        document.getElementById(
            "submitRatingsBtn"
        );

    const reportButton =
        document.getElementById(
            "viewReportBtn"
        );

    if (!select) return;

    const eventId =
        Number(select.value);

    if (!eventId) {

        if (status) {

            status.className =
                "result-box";

            status.innerHTML = `
                <strong>Step 1: Event Completion</strong>
                <br>
                Select an event.
            `;
        }

        if (completeButton) {
            completeButton.disabled = true;
        }

        if (ratingButton) {
            ratingButton.disabled = true;
        }

        if (reportButton) {
            reportButton.disabled = true;
        }

        return;
    }

    const completed =
        isEventCompleted(eventId);

    if (status) {

        status.className =
            "result-box";

        status.innerHTML =
            completed
                ? `
                    <strong>
                        ✅ STEP 1 COMPLETED: EVENT COMPLETED
                    </strong>
                    <br>
                    You can now proceed to Step 2: Event Rating.
                `
                : `
                    <strong>
                        ⏳ STEP 1: EVENT NOT COMPLETED
                    </strong>
                    <br>
                    Click "Mark Event Completed" before submitting ratings.
                `;
    }

    if (completeButton) {

        completeButton.disabled =
            completed;
    }

    if (ratingButton) {

        ratingButton.disabled =
            !completed;
    }

    if (reportButton) {

        reportButton.disabled =
            !completed;
    }
}


// ============================================================
// LOAD ASSIGNED VENDORS FOR RATING
// ============================================================

async function loadEventVendorsForRating(eventId) {

    const container =
        document.getElementById(
            "vendorRatingArea"
        );

    if (!container) return;

    if (!isEventCompleted(eventId)) {

        container.innerHTML = `
            <div class="result-box">
                🔒 Complete Step 1 first.
                <br>
                Vendor ratings will appear after the event is completed.
            </div>
        `;

        return;
    }

    container.innerHTML = `
        <p>
            Loading vendors assigned to this event...
        </p>
    `;

    try {

        const response =
            await fetch(
                API +
                "/api/event-vendors/" +
                eventId
            );

        if (!response.ok) {

            throw new Error(
                "Unable to load event vendors."
            );
        }

        const vendors =
            await response.json();

        if (
            !vendors ||
            vendors.length === 0
        ) {

            container.innerHTML = `
                <div class="result-box">
                    ⚠️ No vendors are assigned to this event.
                    <br><br>
                    Assign vendors first using
                    <strong>
                        Vendors → Assign to Event
                    </strong>.
                </div>
            `;

            return;
        }

        container.innerHTML = `

            <h4>
                ⭐ Step 3: Vendor Ratings
            </h4>

            <p>
                Rate each vendor assigned to this event.
            </p>

            <div id="vendorRatingList"></div>
        `;

        const list =
            document.getElementById(
                "vendorRatingList"
            );

        const savedRatings =
            getSavedVendorRatings(eventId);

        vendors.forEach(function (vendor) {

            const row =
                document.createElement("div");

            row.className =
                "form-group";

            const vendorId =
                vendor.vendor_id ||
                vendor.id ||
                "";

            const currentRating =
                Number(
                    vendor.event_rating ||
                    vendor.rating ||
                    savedRatings[String(vendorId)] ||
                    0
                );

            row.innerHTML = `

                <label>

                    <i class="fas fa-store"></i>

                    <strong>
                        ${escapeHtml(
                            vendor.name
                        )}
                    </strong>

                    ${
                        vendor.service
                            ? ` - ${escapeHtml(
                                vendor.service
                              )}`
                            : ""
                    }

                </label>

                <select
                    class="event-vendor-rating"
                    data-vendor-id="${escapeHtml(
                        vendorId
                    )}"
                    data-vendor-name="${escapeHtml(
                        vendor.name
                    )}"
                >

                    <option value="">
                        Select rating...
                    </option>

                    <option
                        value="1"
                        ${
                            currentRating === 1
                                ? "selected"
                                : ""
                        }
                    >
                        ⭐
                    </option>

                    <option
                        value="2"
                        ${
                            currentRating === 2
                                ? "selected"
                                : ""
                        }
                    >
                        ⭐⭐
                    </option>

                    <option
                        value="3"
                        ${
                            currentRating === 3
                                ? "selected"
                                : ""
                        }
                    >
                        ⭐⭐⭐
                    </option>

                    <option
                        value="4"
                        ${
                            currentRating === 4
                                ? "selected"
                                : ""
                        }
                    >
                        ⭐⭐⭐⭐
                    </option>

                    <option
                        value="5"
                        ${
                            currentRating === 5
                                ? "selected"
                                : ""
                        }
                    >
                        ⭐⭐⭐⭐⭐
                    </option>

                </select>
            `;

            list.appendChild(row);
        });

    } catch (error) {

        console.error(
            "Event vendor loading error:",
            error
        );

        container.innerHTML = `
            <div class="result-box error">
                ❌ ${escapeHtml(
                    error.message
                )}
            </div>
        `;
    }
}


function clearVendorRatingArea() {

    const container =
        document.getElementById(
            "vendorRatingArea"
        );

    if (container) {

        container.innerHTML = `
            <p>
                Select an event to see its assigned vendors.
            </p>
        `;
    }
}


// ============================================================
// LOCAL RATING STORAGE
// ============================================================

function getSavedEventRatings() {

    try {

        const data =
            localStorage.getItem(
                EVENT_RATINGS_KEY
            );

        return data
            ? JSON.parse(data)
            : {};

    } catch (error) {

        console.error(
            "Event rating storage error:",
            error
        );

        return {};
    }
}


function saveEventRating(eventId, rating) {

    const ratings =
        getSavedEventRatings();

    ratings[String(eventId)] =
        Number(rating);

    localStorage.setItem(
        EVENT_RATINGS_KEY,
        JSON.stringify(ratings)
    );
}


function getSavedEventRating(eventId) {

    const ratings =
        getSavedEventRatings();

    const rating =
        Number(
            ratings[String(eventId)]
        );

    return Number.isFinite(rating)
        ? rating
        : 0;
}


function getSavedAllVendorRatings() {

    try {

        const data =
            localStorage.getItem(
                EVENT_VENDOR_RATINGS_KEY
            );

        return data
            ? JSON.parse(data)
            : {};

    } catch (error) {

        console.error(
            "Vendor rating storage error:",
            error
        );

        return {};
    }
}


function saveVendorRatings(
    eventId,
    vendorRatings
) {

    const allRatings =
        getSavedAllVendorRatings();

    if (!allRatings[String(eventId)]) {

        allRatings[String(eventId)] = {};
    }

    vendorRatings.forEach(function (item) {

        allRatings[String(eventId)][
            String(item.vendor_id)
        ] = Number(item.rating);

    });

    localStorage.setItem(
        EVENT_VENDOR_RATINGS_KEY,
        JSON.stringify(allRatings)
    );
}


function getSavedVendorRatings(eventId) {

    const allRatings =
        getSavedAllVendorRatings();

    return allRatings[String(eventId)] || {};
}


// ============================================================
// SUBMIT EVENT + VENDOR RATINGS
// ============================================================

async function submitRatings() {

    const eventSelect =
        document.getElementById(
            "reviewEventId"
        );

    const eventRatingSelect =
        document.getElementById(
            "eventRating"
        );

    if (
        !eventSelect ||
        !eventSelect.value
    ) {

        alert(
            "Please select an event."
        );

        return;
    }

    const eventId =
        Number(eventSelect.value);

    if (!isEventCompleted(eventId)) {

        alert(
            "Please complete Step 1 first."
        );

        return;
    }

    // --------------------------------------------------------
    // STEP 2 - EVENT RATING
    // --------------------------------------------------------

    const eventRating =
        Number(
            eventRatingSelect?.value
        );

    if (
        !Number.isInteger(eventRating) ||
        eventRating < 1 ||
        eventRating > 5
    ) {

        alert(
            "Please complete Step 2: select an event rating from 1 to 5."
        );

        return;
    }

    // --------------------------------------------------------
    // STEP 3 - VENDOR RATINGS
    // --------------------------------------------------------

    const vendorRatingElements =
        document.querySelectorAll(
            ".event-vendor-rating"
        );

    const vendorRatings = [];

    for (
        const element of vendorRatingElements
    ) {

        const rating =
            Number(element.value);

        const vendorId =
            element.dataset.vendorId;

        const vendorName =
            element.dataset.vendorName;

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {

            alert(
                `Please complete Step 3: rate vendor "${vendorName}".`
            );

            return;
        }

        vendorRatings.push({

            vendor_id:
                vendorId,

            rating:
                rating
        });
    }

    // --------------------------------------------------------
    // SAVE LOCAL BACKUP
    // --------------------------------------------------------

    saveEventRating(
        eventId,
        eventRating
    );

    saveVendorRatings(
        eventId,
        vendorRatings
    );

    try {

        const response =
            await fetch(
                API + "/api/rate-event",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            event_id:
                                eventId,

                            event_rating:
                                eventRating,

                            vendor_ratings:
                                vendorRatings
                        })
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            throw new Error(
                result.error ||
                "Unable to save ratings."
            );
        }

        showSuccess(
            "ratingResult",
            `
                <strong>
                    ✅ Ratings saved successfully!
                </strong>
                <br>
                Step 2: Event rating saved.
                <br>
                Step 3: Vendor ratings saved.
            `
        );

        alert(
            "Ratings saved successfully! ⭐\n\nCalculating averages and event success score..."
        );

        await viewFinalReport(eventId);

    } catch (error) {

        console.error(
            "Rating error:",
            error
        );

        showError(
            "ratingResult",
            error.message
        );

        alert(
            "Error saving ratings: " +
            error.message
        );
    }
}


// ============================================================
// CALCULATE VENDOR AVERAGE
// ============================================================

function calculateVendorAverage(
    vendorRatings
) {

    if (
        !Array.isArray(vendorRatings) ||
        vendorRatings.length === 0
    ) {
        return 0;
    }

    const validRatings =
        vendorRatings
            .map(function (vendor) {

                return Number(
                    vendor.rating ??
                    vendor.event_rating
                );

            })
            .filter(function (rating) {

                return Number.isFinite(rating) &&
                    rating >= 1 &&
                    rating <= 5;

            });

    if (validRatings.length === 0) {
        return 0;
    }

    const total =
        validRatings.reduce(
            function (sum, rating) {
                return sum + rating;
            },
            0
        );

    return total / validRatings.length;
}


// ============================================================
// FINAL EVENT REPORT
// ============================================================

async function viewFinalReport(eventId) {

    if (!eventId) {

        const select =
            document.getElementById(
                "reportEventId"
            );

        eventId =
            Number(
                select?.value
            );
    }

    eventId =
        Number(eventId);

    if (!eventId) {

        alert(
            "Please select an event."
        );

        return;
    }

    if (!isEventCompleted(eventId)) {

        alert(
            "This event has not been marked as completed yet."
        );

        return;
    }

    try {

        // ----------------------------------------------------
        // GET REPORT FROM SERVER
        // ----------------------------------------------------

        const response =
            await fetch(
                API +
                "/api/report/" +
                eventId
            );

        const report =
            await response.json();

        if (!response.ok) {

            throw new Error(
                report.error ||
                "Unable to load report."
            );
        }

        // ----------------------------------------------------
        // GET EVENT-SPECIFIC VENDORS
        // ----------------------------------------------------

        let eventVendors = [];

        try {

            const vendorResponse =
                await fetch(
                    API +
                    "/api/event-vendors/" +
                    eventId
                );

            if (vendorResponse.ok) {

                const vendorData =
                    await vendorResponse.json();

                if (Array.isArray(vendorData)) {

                    eventVendors =
                        vendorData;
                }
            }

        } catch (vendorError) {

            console.warn(
                "Unable to reload event vendors:",
                vendorError
            );
        }

        // ----------------------------------------------------
        // GET LOCAL BACKUP RATINGS
        // ----------------------------------------------------

        const savedVendorRatings =
            getSavedVendorRatings(eventId);

        const savedEventRating =
            getSavedEventRating(eventId);

        // ----------------------------------------------------
        // MERGE SERVER VENDOR DATA + LOCAL RATINGS
        // ----------------------------------------------------

        let reportVendors =
            Array.isArray(report.vendors)
                ? report.vendors
                : [];

        // If report endpoint gives no vendors,
        // use the event-vendors endpoint.
        if (
            reportVendors.length === 0 &&
            eventVendors.length > 0
        ) {

            reportVendors =
                eventVendors;
        }

        reportVendors =
            reportVendors.map(function (vendor) {

                const vendorId =
                    String(
                        vendor.vendor_id ||
                        vendor.id ||
                        ""
                    );

                const serverRating =
                    Number(
                        vendor.rating ??
                        vendor.event_rating
                    );

                const localRating =
                    Number(
                        savedVendorRatings[vendorId]
                    );

                let finalRating = 0;

                if (
                    Number.isFinite(serverRating) &&
                    serverRating >= 1 &&
                    serverRating <= 5
                ) {

                    finalRating =
                        serverRating;

                } else if (
                    Number.isFinite(localRating) &&
                    localRating >= 1 &&
                    localRating <= 5
                ) {

                    finalRating =
                        localRating;
                }

                return {

                    ...vendor,

                    vendor_id:
                        vendorId,

                    rating:
                        finalRating
                };
            });

        // ----------------------------------------------------
        // CALCULATE VENDOR AVERAGE
        // ----------------------------------------------------

        const calculatedVendorAverage =
            calculateVendorAverage(
                reportVendors
            );

        const serverVendorAverage =
            Number(
                report.avg_vendor_rating
            );

        let avgVendor = 0;

        // Prefer actual vendor ratings.
        if (
            calculatedVendorAverage > 0
        ) {

            avgVendor =
                calculatedVendorAverage;

        } else if (
            Number.isFinite(serverVendorAverage) &&
            serverVendorAverage > 0
        ) {

            avgVendor =
                serverVendorAverage;
        }

        // ----------------------------------------------------
        // EVENT RATING
        // ----------------------------------------------------

        const serverEventAverage =
            Number(
                report.avg_event_rating
            );

        let avgEvent = 0;

        if (
            Number.isFinite(serverEventAverage) &&
            serverEventAverage > 0
        ) {

            avgEvent =
                serverEventAverage;

        } else if (
            savedEventRating > 0
        ) {

            avgEvent =
                savedEventRating;
        }

        // ----------------------------------------------------
        // EVENT SUCCESS SCORE
        // ----------------------------------------------------

        let successScore =
            Number(
                report.success_score
            );

        // If backend does not calculate correctly,
        // calculate it from event + vendor averages.
        if (
            !Number.isFinite(successScore) ||
            successScore <= 0
        ) {

            if (
                avgEvent > 0 &&
                avgVendor > 0
            ) {

                successScore =
                    (
                        avgEvent +
                        avgVendor
                    ) / 2;

            } else if (avgEvent > 0) {

                successScore =
                    avgEvent;

            } else {

                successScore = 0;
            }
        }

        // ----------------------------------------------------
        // REPORT BOX
        // ----------------------------------------------------

        const reportBox =
            document.getElementById(
                "reportResult"
            );

        if (!reportBox) {

            alert(
                "Final report area was not found."
            );

            return;
        }

        // ----------------------------------------------------
        // VENDOR HTML
        // ----------------------------------------------------

        let vendorHtml = "";

        if (
            reportVendors.length > 0
        ) {

            vendorHtml =
                reportVendors.map(
                    function (vendor) {

                        const rating =
                            Number(
                                vendor.rating
                            );

                        return `
                            <li>

                                <strong>
                                    ${escapeHtml(
                                        vendor.name ||
                                        vendor.vendor_name ||
                                        vendor.vendor_id ||
                                        "Vendor"
                                    )}
                                </strong>

                                :

                                ${
                                    Number.isFinite(
                                        rating
                                    ) &&
                                    rating > 0

                                        ? `
                                            ⭐ ${rating} / 5
                                          `

                                        : `
                                            <span>
                                                Not Rated
                                            </span>
                                          `
                                }

                            </li>
                        `;
                    }
                ).join("");

        } else {

            vendorHtml =
                `
                    <li>
                        No vendors assigned
                    </li>
                `;
        }

        // ----------------------------------------------------
        // FINAL REPORT DISPLAY
        // ----------------------------------------------------

        reportBox.innerHTML = `

            <div
                style="
                    background:var(--bg);
                    padding:20px;
                    border-radius:8px;
                    margin-top:20px;
                "
            >

                <h3>
                    📊 Final Event Report
                </h3>

                <p>
                    <strong>
                        Event:
                    </strong>

                    ${escapeHtml(
                        report.event_name ||
                        "Event"
                    )}
                </p>

                <hr>

                <h4>
                    ✅ Step 1: Event Completed
                </h4>

                <p>
                    Event has been successfully marked as completed.
                </p>

                <h4>
                    ⭐ Step 2: Event Rating
                </h4>

                <p>
                    <strong>
                        Average Event Rating:
                    </strong>

                    ${avgEvent.toFixed(2)}
                    / 5
                </p>

                <h4>
                    ⭐ Step 3: Vendor Ratings
                </h4>

                <ul>
                    ${vendorHtml}
                </ul>

                <h4>
                    📈 Step 4: System Calculated Averages
                </h4>

                <p>
                    <strong>
                        Total Registered:
                    </strong>

                    ${report.total_registered ?? 0}
                </p>

                <p>
                    <strong>
                        Checked In:
                    </strong>

                    ${report.checked_in ?? 0}
                </p>

                <p>
                    <strong>
                        Average Event Rating:
                    </strong>

                    ${avgEvent.toFixed(2)}
                    / 5
                </p>

                <p>
                    <strong>
                        Average Vendor Rating:
                    </strong>

                    ${avgVendor.toFixed(2)}
                    / 5
                </p>

                <hr>

                <h3>
                    ⭐ Step 5: Event Success Score
                </h3>

                <div
                    style="
                        font-size:1.5rem;
                        font-weight:700;
                        margin:10px 0;
                    "
                >
                    ${successScore.toFixed(2)}
                    / 5.00
                </div>

                <p>
                    ${
                        successScore >= 4
                            ? "Excellent event performance! 🎉"
                            : successScore >= 3
                                ? "Good event performance."
                                : "Event performance can be improved."
                    }
                </p>

                <hr>

                <h4>
                    📋 Step 6: Final Event Report Generated
                </h4>

                <p>
                    ✅ Event completed
                    <br>
                    ✅ Event rating submitted
                    <br>
                    ✅ Vendor ratings submitted
                    <br>
                    ✅ Average ratings calculated
                    <br>
                    ✅ Event success score calculated
                    <br>
                    ✅ Final event report generated
                </p>

            </div>
        `;

        reportBox.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    } catch (error) {

        console.error(
            "Final report error:",
            error
        );

        alert(
            "Error loading final report: " +
            error.message
        );
    }
}


// ============================================================
// DASHBOARD STATS
// ============================================================

async function loadDashboardStats() {

    try {

        const response =
            await fetch(
                API +
                "/api/dashboard-stats"
            );

        if (!response.ok) return;

        const stats =
            await response.json();

        const totalEvents =
            document.getElementById(
                "totalEvents"
            );

        const totalRegistrations =
            document.getElementById(
                "totalRegistrations"
            );

        const totalCheckedIn =
            document.getElementById(
                "totalCheckedIn"
            );

        const totalVendors =
            document.getElementById(
                "totalVendors"
            );

        if (totalEvents) {

            totalEvents.textContent =
                stats.total_events || 0;
        }

        if (totalRegistrations) {

            totalRegistrations.textContent =
                stats.total_registrations || 0;
        }

        if (totalCheckedIn) {

            totalCheckedIn.textContent =
                stats.total_checked_in || 0;
        }

        if (totalVendors) {

            totalVendors.textContent =
                stats.total_vendors || 0;
        }

    } catch (error) {

        console.error(
            "Dashboard stats error:",
            error
        );
    }
}


// ============================================================
// GENERAL VENDOR RATING
// ============================================================
//
// This is still available for the Vendor List.
//
// IMPORTANT:
// This rating is the vendor's GENERAL rating.
//
// The Final Event Report uses EVENT-SPECIFIC
// vendor ratings submitted in the review section.
// ============================================================

async function rateVendor() {

    const vendorIdElement =
        document.getElementById(
            "rateVendorId"
        );

    const ratingElement =
        document.getElementById(
            "rateValue"
        );

    if (
        !vendorIdElement ||
        !ratingElement
    ) {
        return;
    }

    const vendorId =
        vendorIdElement.value.trim();

    const rating =
        Number(
            ratingElement.value
        );

    if (!vendorId) {

        alert(
            "Please enter a Vendor ID."
        );

        return;
    }

    if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {

        alert(
            "Rating must be between 1 and 5."
        );

        return;
    }

    try {

        const response =
            await fetch(
                API +
                "/api/vendors/" +
                encodeURIComponent(
                    vendorId
                ) +
                "/rate",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            rating:
                                rating
                        })
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            throw new Error(
                result.error ||
                "Rating failed."
            );
        }

        showSuccess(
            "rateResult",
            result.message ||
            "Vendor rated successfully!"
        );

        vendorIdElement.value = "";

        await loadVendors();

        alert(
            "Vendor rated successfully! ⭐"
        );

    } catch (error) {

        console.error(
            "Vendor rating error:",
            error
        );

        showError(
            "rateResult",
            error.message
        );

        alert(
            "Vendor rating error: " +
            error.message
        );
    }
}


// ============================================================
// UI HELPERS
// ============================================================

function showSuccess(
    elementId,
    message
) {

    const element =
        document.getElementById(
            elementId
        );

    if (!element) return;

    element.className =
        "result-box";

    element.innerHTML =
        `<p>✅ ${message}</p>`;
}


function showError(
    elementId,
    message
) {

    const element =
        document.getElementById(
            elementId
        );

    if (!element) return;

    element.className =
        "result-box error";

    element.innerHTML =
        `<p>❌ ${escapeHtml(message)}</p>`;
}


function hideToast() {

    const toast =
        document.getElementById(
            "toast"
        );

    if (toast) {

        toast.classList.add("hidden");
    }
}


function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.loadAttendees =
    loadAttendees;

window.checkIn =
    checkIn;

window.rateVendor =
    rateVendor;

window.submitRatings =
    submitRatings;

window.viewFinalReport =
    viewFinalReport;

window.markEventCompleted =
    markEventCompleted;

window.loadVendors =
    loadVendors;

window.loadAssignments =
    loadAssignments;

window.hideToast =
    hideToast;


// ============================================================
// FINISHED
// ============================================================

console.log(
    "EventSphere JavaScript loaded successfully."
);