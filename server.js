const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const QRCode = require('qrcode');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.sqlite');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(DB_PATH);


// ============================================================
// DATABASE INITIALIZATION
// ============================================================

function initializeDatabase() {

    db.serialize(() => {

        db.run('PRAGMA foreign_keys = ON');

        // ====================================================
        // EVENTS
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                date TEXT,
                venue TEXT,
                capacity INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ====================================================
        // ATTENDEES
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS attendees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                college TEXT,
                department TEXT,
                event_id INTEGER NOT NULL,
                ticket_id TEXT UNIQUE NOT NULL,
                qr_code TEXT,
                status TEXT NOT NULL DEFAULT 'Registered',
                checked_in_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id)
                    REFERENCES events(id)
                    ON DELETE CASCADE
            )
        `);

        // ====================================================
        // TICKETS
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id TEXT UNIQUE NOT NULL,
                event_id INTEGER NOT NULL,
                attendee_id INTEGER NOT NULL,
                qr_code TEXT,
                issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id)
                    REFERENCES events(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (attendee_id)
                    REFERENCES attendees(id)
                    ON DELETE CASCADE
            )
        `);

        // ====================================================
        // VENDORS
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS vendors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                service_type TEXT NOT NULL,
                contact_number TEXT,
                email TEXT,
                availability TEXT,
                rating REAL NOT NULL DEFAULT 0,
                rating_count INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ====================================================
        // VENDOR ASSIGNMENTS
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS vendor_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL,
                vendor_id TEXT NOT NULL,
                service TEXT,
                status TEXT NOT NULL DEFAULT 'Assigned',
                assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(event_id, vendor_id),
                FOREIGN KEY (event_id)
                    REFERENCES events(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (vendor_id)
                    REFERENCES vendors(vendor_id)
                    ON DELETE CASCADE
            )
        `);

        // ====================================================
        // EVENT RATINGS
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS event_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id)
                    REFERENCES events(id)
                    ON DELETE CASCADE
            )
        `);

        // ====================================================
        // EVENT VENDOR RATINGS
        // ====================================================

        db.run(`
            CREATE TABLE IF NOT EXISTS event_vendor_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL,
                vendor_id TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(event_id, vendor_id),
                FOREIGN KEY (event_id)
                    REFERENCES events(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (vendor_id)
                    REFERENCES vendors(vendor_id)
                    ON DELETE CASCADE
            )
        `);


        // ====================================================
        // DATABASE MIGRATION
        // ====================================================
        // This fixes old databases where rating_count
        // does not exist in the vendors table.
        // ====================================================

        db.all(`PRAGMA table_info(vendors)`, (err, columns) => {

            if (err) {
                console.error("Error checking vendors table:", err);
                return;
            }

            const hasRatingCount = columns.some(
                column => column.name === 'rating_count'
            );

            if (!hasRatingCount) {

                console.log(
                    "rating_count column missing. Adding it now..."
                );

                db.run(
                    `ALTER TABLE vendors
                     ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0`,
                    (alterErr) => {

                        if (alterErr) {
                            console.error(
                                "Error adding rating_count:",
                                alterErr
                            );
                        } else {
                            console.log(
                                "rating_count column added successfully."
                            );
                        }

                        seedDatabase();
                    }
                );

            } else {

                console.log(
                    "rating_count column already exists."
                );

                seedDatabase();
            }

        });

    });

}


// ============================================================
// SEED EVENTS
// ============================================================

function seedDatabase() {

    const seedEvents = [

        [
            1,
            'AI Workshop 2026',
            'Learn Artificial Intelligence fundamentals',
            '2026-09-15',
            'Jeppiaar University Hall A',
            200
        ],

        [
            2,
            'Python Bootcamp',
            'Master Python programming',
            '2026-09-20',
            'Jeppiaar University Lab 2',
            150
        ],

        [
            3,
            'Data Science Conference',
            'Big Data and Analytics',
            '2026-09-25',
            'Convention Center',
            300
        ]

    ];

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO events
        (id, name, description, date, venue, capacity)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    seedEvents.forEach(event => {
        stmt.run(event);
    });

    stmt.finalize(() => {

        console.log("Database initialized successfully.");

        startServer();

    });

}


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function normalizeRating(value) {

    const rating = Number(value);

    return Number.isInteger(rating) &&
        rating >= 1 &&
        rating <= 5
        ? rating
        : null;
}


function sendDbError(res, err) {

    console.error(err);

    res.status(500).json({
        error: 'Database error. Please try again.'
    });

}


// ============================================================
// EVENTS
// ============================================================

app.get('/api/events', (req, res) => {

    db.all(
        'SELECT * FROM events ORDER BY date ASC, id ASC',
        (err, rows) => {

            if (err) {
                return sendDbError(res, err);
            }

            res.json(rows);

        }
    );

});


app.get('/api/events/:id', (req, res) => {

    db.get(
        'SELECT * FROM events WHERE id = ?',
        [req.params.id],
        (err, row) => {

            if (err) {
                return sendDbError(res, err);
            }

            if (!row) {
                return res.status(404).json({
                    error: 'Event not found'
                });
            }

            res.json(row);

        }
    );

});


// ============================================================
// VENDORS
// ============================================================

app.get('/api/vendors', (req, res) => {

    db.all(
        'SELECT * FROM vendors ORDER BY name COLLATE NOCASE',
        (err, rows) => {

            if (err) {
                return sendDbError(res, err);
            }

            res.json(rows);

        }
    );

});


app.post('/api/vendors', (req, res) => {

    const name =
        String(req.body.name || '').trim();

    const service_type =
        String(req.body.service_type || '').trim();

    const contact_number =
        String(req.body.contact_number || '').trim();

    const email =
        String(req.body.email || '').trim();

    const availability =
        String(req.body.availability || '').trim();


    if (!name || !service_type) {

        return res.status(400).json({
            error: 'Name and Service Type are required'
        });

    }


    if (email && !/^\S+@\S+\.\S+$/.test(email)) {

        return res.status(400).json({
            error: 'Invalid vendor email format'
        });

    }


    const vendorId =
        `VEND${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10)}`;


    db.run(

        `
        INSERT INTO vendors
        (
            vendor_id,
            name,
            service_type,
            contact_number,
            email,
            availability
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,

        [
            vendorId,
            name,
            service_type,
            contact_number,
            email,
            availability
        ],

        function (err) {

            if (err) {
                return sendDbError(res, err);
            }

            res.status(201).json({

                success: true,

                message:
                    'Vendor added successfully!',

                vendor: {
                    id: vendorId,
                    name,
                    service_type
                }

            });

        }

    );

});


// ============================================================
// RATE VENDOR
// ============================================================

app.put('/api/vendors/:vendorId/rate', (req, res) => {

    const rating =
        normalizeRating(req.body.rating);

    const vendorId =
        req.params.vendorId;


    if (rating === null) {

        return res.status(400).json({
            error:
                'Rating must be an integer between 1 and 5'
        });

    }


    db.get(

        `
        SELECT rating, rating_count
        FROM vendors
        WHERE vendor_id = ?
        `,

        [vendorId],

        (err, vendor) => {

            if (err) {
                return sendDbError(res, err);
            }


            if (!vendor) {

                return res.status(404).json({
                    error: 'Vendor not found'
                });

            }


            const oldCount =
                Number(vendor.rating_count) || 0;

            const oldRating =
                Number(vendor.rating) || 0;

            const newCount =
                oldCount + 1;

            const newRating =
                ((oldRating * oldCount) + rating)
                / newCount;


            db.run(

                `
                UPDATE vendors
                SET rating = ?,
                    rating_count = ?
                WHERE vendor_id = ?
                `,

                [
                    newRating,
                    newCount,
                    vendorId
                ],

                function (updateErr) {

                    if (updateErr) {
                        return sendDbError(
                            res,
                            updateErr
                        );
                    }


                    res.json({

                        success: true,

                        message:
                            'Vendor rated successfully!',

                        rating:
                            Number(newRating.toFixed(2))

                    });

                }

            );

        }

    );

});


// ============================================================
// REGISTRATION
// ============================================================

app.post('/api/register', async (req, res) => {

    const name =
        String(req.body.name || '').trim();

    const email =
        String(req.body.email || '')
            .trim()
            .toLowerCase();

    const phone =
        String(req.body.phone || '').trim();

    const college =
        String(req.body.college || '').trim();

    const department =
        String(req.body.department || '').trim();

    const event_id =
        Number(req.body.event_id);


    if (
        !name ||
        !email ||
        !phone ||
        !Number.isInteger(event_id) ||
        event_id < 1
    ) {

        return res.status(400).json({
            error:
                'Name, Email, Phone, and a valid Event are required'
        });

    }


    if (!/^\S+@\S+\.\S+$/.test(email)) {

        return res.status(400).json({
            error: 'Invalid email format'
        });

    }


    if (!/^[0-9]{10}$/.test(phone)) {

        return res.status(400).json({
            error:
                'Phone number must be 10 digits'
        });

    }


    db.get(
        'SELECT * FROM events WHERE id = ?',
        [event_id],
        async (err, event) => {

            if (err) {
                return sendDbError(res, err);
            }


            if (!event) {

                return res.status(404).json({
                    error: 'Event not found'
                });

            }


            db.get(

                `
                SELECT COUNT(*) AS count
                FROM attendees
                WHERE event_id = ?
                `,

                [event_id],

                (countErr, countRow) => {

                    if (countErr) {
                        return sendDbError(
                            res,
                            countErr
                        );
                    }


                    if (
                        event.capacity > 0 &&
                        countRow.count >= event.capacity
                    ) {

                        return res.status(409).json({
                            error:
                                'This event is already full'
                        });

                    }


                    db.get(

                        `
                        SELECT id
                        FROM attendees
                        WHERE email = ?
                        AND event_id = ?
                        `,

                        [email, event_id],

                        (dupErr, existing) => {

                            if (dupErr) {
                                return sendDbError(
                                    res,
                                    dupErr
                                );
                            }


                            if (existing) {

                                return res.status(409).json({
                                    error:
                                        'This email is already registered for this event'
                                });

                            }


                            const ticketId =
                                `TKT${Date.now()}${Math.floor(Math.random() * 1000)}`;

                            const registrationId =
                                `REG${crypto
                                    .randomBytes(4)
                                    .toString('hex')
                                    .toUpperCase()}`;


                            const qrData =
                                JSON.stringify({
                                    ticket: ticketId,
                                    name,
                                    event: event.name,
                                    reg: registrationId
                                });


                            QRCode.toDataURL(
                                qrData,
                                (qrErr, qrCodeUrl) => {

                                    if (qrErr) {

                                        return res.status(500).json({
                                            error:
                                                'Failed to generate QR code'
                                        });

                                    }


                                    db.run(

                                        `
                                        INSERT INTO attendees
                                        (
                                            registration_id,
                                            name,
                                            email,
                                            phone,
                                            college,
                                            department,
                                            event_id,
                                            ticket_id,
                                            qr_code
                                        )
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                        `,

                                        [
                                            registrationId,
                                            name,
                                            email,
                                            phone,
                                            college,
                                            department,
                                            event_id,
                                            ticketId,
                                            qrCodeUrl
                                        ],

                                        function (insertErr) {

                                            if (insertErr) {
                                                return sendDbError(
                                                    res,
                                                    insertErr
                                                );
                                            }


                                            const attendeeId =
                                                this.lastID;


                                            db.run(

                                                `
                                                INSERT INTO tickets
                                                (
                                                    ticket_id,
                                                    event_id,
                                                    attendee_id,
                                                    qr_code
                                                )
                                                VALUES (?, ?, ?, ?)
                                                `,

                                                [
                                                    ticketId,
                                                    event_id,
                                                    attendeeId,
                                                    qrCodeUrl
                                                ],

                                                ticketErr => {

                                                    if (ticketErr) {
                                                        return sendDbError(
                                                            res,
                                                            ticketErr
                                                        );
                                                    }


                                                    res.status(201).json({

                                                        success: true,

                                                        message:
                                                            'Registration successful!',

                                                        ticket: {

                                                            ticketId,

                                                            registrationId,

                                                            name,

                                                            eventName:
                                                                event.name,

                                                            qrCode:
                                                                qrCodeUrl

                                                        }

                                                    });

                                                }

                                            );

                                        }

                                    );

                                }

                            );

                        }

                    );

                }

            );

        }

    );

});


// ============================================================
// ATTENDEES
// ============================================================

app.get('/api/attendees/:eventId', (req, res) => {

    db.all(

        `
        SELECT *
        FROM attendees
        WHERE event_id = ?
        ORDER BY id DESC
        `,

        [req.params.eventId],

        (err, rows) => {

            if (err) {
                return sendDbError(res, err);
            }

            res.json(rows);

        }

    );

});


// ============================================================
// CHECK-IN
// ============================================================

app.post('/api/checkin', (req, res) => {

    const ticket_id =
        String(req.body.ticket_id || '').trim();


    if (!ticket_id) {

        return res.status(400).json({
            error: 'Ticket ID is required'
        });

    }


    db.get(

        `
        SELECT
            a.*,
            e.name AS event_name
        FROM attendees a
        JOIN events e
            ON a.event_id = e.id
        WHERE a.ticket_id = ?
        `,

        [ticket_id],

        (err, attendee) => {

            if (err) {
                return sendDbError(res, err);
            }


            if (!attendee) {

                return res.status(404).json({
                    error: 'Invalid ticket ID'
                });

            }


            if (attendee.status === 'Checked In') {

                return res.status(409).json({
                    error: 'Already checked in'
                });

            }


            db.run(

                `
                UPDATE attendees
                SET
                    status = 'Checked In',
                    checked_in_at = CURRENT_TIMESTAMP
                WHERE ticket_id = ?
                `,

                [ticket_id],

                function (updateErr) {

                    if (updateErr) {
                        return sendDbError(
                            res,
                            updateErr
                        );
                    }


                    res.json({

                        success: true,

                        message:
                            'Check-in successful!',

                        attendee: {

                            name:
                                attendee.name,

                            ticket:
                                attendee.ticket_id,

                            event:
                                attendee.event_name

                        }

                    });

                }

            );

        }

    );

});


// ============================================================
// ASSIGN VENDOR TO EVENT
// ============================================================

app.post('/api/assign-vendor', (req, res) => {

    const event_id =
        Number(req.body.event_id);

    const vendor_id =
        String(req.body.vendor_id || '').trim();

    const service =
        String(req.body.service || '').trim()
        || 'General Service';


    if (
        !Number.isInteger(event_id) ||
        event_id < 1 ||
        !vendor_id
    ) {

        return res.status(400).json({
            error:
                'Event and Vendor are required'
        });

    }


    db.get(

        'SELECT id FROM events WHERE id = ?',

        [event_id],

        (eventErr, event) => {

            if (eventErr) {
                return sendDbError(
                    res,
                    eventErr
                );
            }


            if (!event) {

                return res.status(404).json({
                    error: 'Event not found'
                });

            }


            db.get(

                `
                SELECT vendor_id
                FROM vendors
                WHERE vendor_id = ?
                `,

                [vendor_id],

                (vendorErr, vendor) => {

                    if (vendorErr) {
                        return sendDbError(
                            res,
                            vendorErr
                        );
                    }


                    if (!vendor) {

                        return res.status(404).json({
                            error: 'Vendor not found'
                        });

                    }


                    db.run(

                        `
                        INSERT INTO vendor_assignments
                        (
                            event_id,
                            vendor_id,
                            service
                        )
                        VALUES (?, ?, ?)
                        `,

                        [
                            event_id,
                            vendor_id,
                            service
                        ],

                        function (err) {

                            if (err) {

                                if (
                                    String(err.message)
                                        .includes('UNIQUE')
                                ) {

                                    return res.status(409).json({
                                        error:
                                            'This vendor is already assigned to this event'
                                    });

                                }

                                return sendDbError(
                                    res,
                                    err
                                );

                            }


                            res.status(201).json({

                                success: true,

                                message:
                                    'Vendor assigned to event successfully!'

                            });

                        }

                    );

                }

            );

        }

    );

});


// ============================================================
// EVENT VENDORS
// ============================================================

app.get('/api/event-vendors/:eventId', (req, res) => {

    db.all(

        `
        SELECT
            v.vendor_id,
            v.name,
            v.service_type,
            va.service,
            va.status,
            va.assigned_at,
            evr.rating AS event_rating

        FROM vendor_assignments va

        JOIN vendors v
            ON va.vendor_id = v.vendor_id

        LEFT JOIN event_vendor_ratings evr
            ON evr.event_id = va.event_id
            AND evr.vendor_id = va.vendor_id

        WHERE va.event_id = ?

        ORDER BY v.name COLLATE NOCASE
        `,

        [req.params.eventId],

        (err, rows) => {

            if (err) {
                return sendDbError(
                    res,
                    err
                );
            }

            res.json(rows);

        }

    );

});


// ============================================================
// VENDOR ASSIGNMENTS
// ============================================================

app.get('/api/vendor-assignments', (req, res) => {

    db.all(

        `
        SELECT
            va.*,
            e.name AS event_name,
            v.name AS vendor_name,
            v.service_type

        FROM vendor_assignments va

        JOIN events e
            ON va.event_id = e.id

        JOIN vendors v
            ON va.vendor_id = v.vendor_id

        ORDER BY va.assigned_at DESC
        `,

        (err, rows) => {

            if (err) {
                return sendDbError(
                    res,
                    err
                );
            }

            res.json(rows);

        }

    );

});


// ============================================================
// EVENT STATS
// ============================================================

app.get('/api/stats/:eventId', (req, res) => {

    const eventId =
        Number(req.params.eventId);


    db.get(

        `
        SELECT name, capacity
        FROM events
        WHERE id = ?
        `,

        [eventId],

        (err, event) => {

            if (err) {
                return sendDbError(
                    res,
                    err
                );
            }


            if (!event) {

                return res.status(404).json({
                    error: 'Event not found'
                });

            }


            db.get(

                `
                SELECT
                    COUNT(*) AS total_registered,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN status = 'Checked In'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS checked_in

                FROM attendees

                WHERE event_id = ?
                `,

                [eventId],

                (statsErr, stats) => {

                    if (statsErr) {
                        return sendDbError(
                            res,
                            statsErr
                        );
                    }


                    const total =
                        Number(stats.total_registered) || 0;

                    const checked =
                        Number(stats.checked_in) || 0;


                    res.json({

                        event:
                            event.name,

                        capacity:
                            event.capacity,

                        total_registered:
                            total,

                        checked_in:
                            checked,

                        pending:
                            total - checked,

                        attendance_rate:
                            total
                                ? Math.round(
                                    (checked / total) * 100
                                )
                                : 0,

                        available_spots:
                            event.capacity > 0
                                ? Math.max(
                                    event.capacity - total,
                                    0
                                )
                                : null

                    });

                }

            );

        }

    );

});


// ============================================================
// DASHBOARD STATS
// ============================================================

app.get('/api/dashboard-stats', (req, res) => {

    db.get(
        'SELECT COUNT(*) AS total_events FROM events',
        (e1, events) => {

            if (e1) {
                return sendDbError(res, e1);
            }


            db.get(
                'SELECT COUNT(*) AS total_registrations FROM attendees',
                (e2, registrations) => {

                    if (e2) {
                        return sendDbError(
                            res,
                            e2
                        );
                    }


                    db.get(

                        `
                        SELECT
                            COALESCE(
                                SUM(
                                    CASE
                                        WHEN status = 'Checked In'
                                        THEN 1
                                        ELSE 0
                                    END
                                ),
                                0
                            ) AS total_checked_in

                        FROM attendees
                        `,

                        (e3, checked) => {

                            if (e3) {
                                return sendDbError(
                                    res,
                                    e3
                                );
                            }


                            db.get(

                                `
                                SELECT COUNT(*) AS total_vendors
                                FROM vendors
                                `,

                                (e4, vendors) => {

                                    if (e4) {
                                        return sendDbError(
                                            res,
                                            e4
                                        );
                                    }


                                    res.json({

                                        total_events:
                                            events.total_events || 0,

                                        total_registrations:
                                            registrations.total_registrations || 0,

                                        total_checked_in:
                                            checked.total_checked_in || 0,

                                        total_vendors:
                                            vendors.total_vendors || 0

                                    });

                                }

                            );

                        }

                    );

                }

            );

        }

    );

});


// ============================================================
// RATE EVENT + VENDORS
// ============================================================

app.post('/api/rate-event', (req, res) => {

    const event_id =
        Number(req.body.event_id);

    const event_rating =
        normalizeRating(
            req.body.event_rating
        );

    const vendor_ratings =
        Array.isArray(req.body.vendor_ratings)
            ? req.body.vendor_ratings
            : [];


    if (
        !Number.isInteger(event_id) ||
        event_id < 1 ||
        event_rating === null
    ) {

        return res.status(400).json({
            error:
                'Event ID and a valid event rating (1-5) are required'
        });

    }


    const cleanVendorRatings = [];


    for (const item of vendor_ratings) {

        const vendor_id =
            String(item.vendor_id || '').trim();

        const rating =
            normalizeRating(item.rating);


        if (!vendor_id || rating === null) {

            return res.status(400).json({
                error:
                    'Every vendor rating must contain a valid Vendor ID and rating (1-5)'
            });

        }


        cleanVendorRatings.push({
            vendor_id,
            rating
        });

    }


    db.get(

        'SELECT id FROM events WHERE id = ?',

        [event_id],

        (eventErr, event) => {

            if (eventErr) {
                return sendDbError(
                    res,
                    eventErr
                );
            }


            if (!event) {

                return res.status(404).json({
                    error: 'Event not found'
                });

            }


            db.run(
                'BEGIN TRANSACTION',
                beginErr => {

                    if (beginErr) {
                        return sendDbError(
                            res,
                            beginErr
                        );
                    }


                    db.run(

                        `
                        INSERT INTO event_ratings
                        (event_id, rating)
                        VALUES (?, ?)
                        `,

                        [
                            event_id,
                            event_rating
                        ],

                        function (ratingErr) {

                            if (ratingErr) {

                                return db.run(
                                    'ROLLBACK',
                                    () =>
                                        sendDbError(
                                            res,
                                            ratingErr
                                        )
                                );

                            }


                            const upsertNext =
                                index => {

                                    if (
                                        index >=
                                        cleanVendorRatings.length
                                    ) {

                                        return db.run(
                                            'COMMIT',
                                            commitErr => {

                                                if (commitErr) {

                                                    return db.run(
                                                        'ROLLBACK',
                                                        () =>
                                                            sendDbError(
                                                                res,
                                                                commitErr
                                                            )
                                                    );

                                                }


                                                res.json({

                                                    success: true,

                                                    message:
                                                        'Ratings saved successfully!'

                                                });

                                            }
                                        );

                                    }


                                    const item =
                                        cleanVendorRatings[index];


                                    db.get(

                                        `
                                        SELECT vendor_id
                                        FROM vendors
                                        WHERE vendor_id = ?
                                        `,

                                        [item.vendor_id],

                                        (vendorErr, vendor) => {

                                            if (vendorErr) {

                                                return db.run(
                                                    'ROLLBACK',
                                                    () =>
                                                        sendDbError(
                                                            res,
                                                            vendorErr
                                                        )
                                                );

                                            }


                                            if (!vendor) {

                                                return db.run(
                                                    'ROLLBACK',
                                                    () =>
                                                        res.status(404).json({
                                                            error:
                                                                `Vendor ${item.vendor_id} not found`
                                                        })
                                                );

                                            }


                                            db.run(

                                                `
                                                INSERT INTO event_vendor_ratings
                                                (
                                                    event_id,
                                                    vendor_id,
                                                    rating
                                                )

                                                VALUES (?, ?, ?)

                                                ON CONFLICT(
                                                    event_id,
                                                    vendor_id
                                                )

                                                DO UPDATE SET
                                                    rating = excluded.rating,
                                                    created_at = CURRENT_TIMESTAMP
                                                `,

                                                [
                                                    event_id,
                                                    item.vendor_id,
                                                    item.rating
                                                ],

                                                err => {

                                                    if (err) {

                                                        return db.run(
                                                            'ROLLBACK',
                                                            () =>
                                                                sendDbError(
                                                                    res,
                                                                    err
                                                                )
                                                        );

                                                    }


                                                    upsertNext(
                                                        index + 1
                                                    );

                                                }

                                            );

                                        }

                                    );

                                };


                            upsertNext(0);

                        }

                    );

                }

            );

        }

    );

});


// ============================================================
// FINAL EVENT REPORT
// ============================================================

app.get('/api/report/:eventId', (req, res) => {

    const eventId =
        Number(req.params.eventId);


    db.get(

        `
        SELECT
            id,
            name,
            capacity

        FROM events

        WHERE id = ?
        `,

        [eventId],

        (eventErr, event) => {

            if (eventErr) {
                return sendDbError(
                    res,
                    eventErr
                );
            }


            if (!event) {

                return res.status(404).json({
                    error: 'Event not found'
                });

            }


            db.get(

                `
                SELECT
                    COUNT(*) AS total_registered,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN status = 'Checked In'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS checked_in

                FROM attendees

                WHERE event_id = ?
                `,

                [eventId],

                (statsErr, stats) => {

                    if (statsErr) {
                        return sendDbError(
                            res,
                            statsErr
                        );
                    }


                    db.all(

                        `
                        SELECT
                            v.vendor_id,
                            v.name,
                            va.service,
                            evr.rating

                        FROM vendor_assignments va

                        JOIN vendors v
                            ON va.vendor_id = v.vendor_id

                        LEFT JOIN event_vendor_ratings evr
                            ON evr.event_id = va.event_id
                            AND evr.vendor_id = va.vendor_id

                        WHERE va.event_id = ?

                        ORDER BY v.name COLLATE NOCASE
                        `,

                        [eventId],

                        (vendorErr, vendors) => {

                            if (vendorErr) {
                                return sendDbError(
                                    res,
                                    vendorErr
                                );
                            }


                            db.get(

                                `
                                SELECT
                                    AVG(rating)
                                    AS avg_event_rating

                                FROM event_ratings

                                WHERE event_id = ?
                                `,

                                [eventId],

                                (ratingErr, eventRatingRow) => {

                                    if (ratingErr) {
                                        return sendDbError(
                                            res,
                                            ratingErr
                                        );
                                    }


                                    const ratedVendors =
                                        vendors.filter(
                                            v =>
                                                Number.isFinite(
                                                    Number(v.rating)
                                                )
                                        );


                                    const avgVendorRating =
                                        ratedVendors.length

                                            ? ratedVendors.reduce(
                                                (sum, v) =>
                                                    sum +
                                                    Number(v.rating),
                                                0
                                            ) / ratedVendors.length

                                            : 0;


                                    const avgEventRating =
                                        Number(
                                            eventRatingRow.avg_event_rating
                                        ) || 0;


                                    const components = [
                                        avgEventRating
                                    ];


                                    if (
                                        ratedVendors.length
                                    ) {

                                        components.push(
                                            avgVendorRating
                                        );

                                    }


                                    const successScore =
                                        components.reduce(
                                            (a, b) =>
                                                a + b,
                                            0
                                        ) / components.length;


                                    res.json({

                                        event_id:
                                            eventId,

                                        event_name:
                                            event.name,

                                        total_registered:
                                            Number(
                                                stats.total_registered
                                            ) || 0,

                                        checked_in:
                                            Number(
                                                stats.checked_in
                                            ) || 0,

                                        vendors,

                                        avg_event_rating:
                                            avgEventRating.toFixed(2),

                                        avg_vendor_rating:
                                            avgVendorRating.toFixed(2),

                                        success_score:
                                            successScore.toFixed(2)

                                    });

                                }

                            );

                        }

                    );

                }

            );

        }

    );

});


// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {

    res.json({
        status: 'ok',
        service: 'EventSphere API'
    });

});


// ============================================================
// START SERVER
// ============================================================

function startServer() {

    app.listen(PORT, () => {

        console.log(
            `🚀 EventSphere server running on http://localhost:${PORT}`
        );

        console.log(
            `📊 SQLite database: ${DB_PATH}`
        );

    });

}


// ============================================================
// START DATABASE INITIALIZATION
// ============================================================

initializeDatabase();