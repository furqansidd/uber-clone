# SwiftRide Backend Implementation Milestones

| Task | Description | Status | Screen(s) Served |
| --- | --- | --- | --- |
| **Milestone 1** | **Environment & Test Setup** | | |
| Task 1.1 | Initialize `package.json`, install dependencies (Express, Mongoose, Socket.io, JWT, bcrypt, dotenv, Jest, Supertest) | done | N/A |
| Task 1.2 | Set up Jest testing framework and initial test environment configurations | done | N/A |
| **Milestone 2** | **Mongoose Database Schemas** | | |
| Task 2.1 | Implement **User (Rider)** schema (first_name, last_name, email, password, rating, refresh token) | done | Screens 1, 4, 5, 10, 11 |
| Task 2.2 | Implement **Captain** schema (full_name, phone_number, vehicle_type, plate_number, capacity, vehicle_color, terms_accepted, is_online, location [2dsphere], rating, password_reset_token, reset_token_expiry) | done | Screens 3, 6, 10, 11, 12, 13, 15 |
| Task 2.3 | Implement **Ride** schema (rider, captain, pickup [address, coordinates], destination [address, coordinates], stops [array of {address, coordinates}], vehicle_type, fare [base_fare, distance_fare, time_fare, taxes_fees, total], otp_code, status, transition timestamps) | done | Screens 7, 8, 9, 10, 11, 13, 14, 15, 16 |
| Task 2.4 | Implement **Message** and **TokenBlacklist** schemas | done | Screens 10, 11, 15, 16 |
| **Milestone 3** | **Authentication & Password Reset APIs** | | |
| Task 3.1 | Implement Rider signup, login, and logout endpoints (`POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`) with blacklisting | done | Screens 1, 4, 5 |
| Task 3.2 | Implement Captain signup and login endpoints (`POST /auth/captain/signup`, `POST /auth/captain/login`) | done | Screens 3, 6 |
| Task 3.3 | Implement Captain forgot-password and reset-password flows (`POST /auth/captain/forgot-password`, `POST /auth/captain/reset-password`) using real token generation, expiry, validation, and a Nodemailer test transport (e.g. Ethereal/sandboxed SMTP) | done | Screen 6 flow |
| **Milestone 4** | **Dispatch System & Ride Requests** | | |
| Task 4.1 | Implement Captain status toggle endpoint (`POST /captains/status`) and online status tracking | done | Screen 12 |
| Task 4.2 | Implement Ride Request endpoint (`POST /rides/request`) creating ride and generating OTP | done | Screen 7 |
| Task 4.3.1 | Set up Socket.io connection handling. Ensure online captains join a personal socket room (`captain_{captainId}`) and active riders/captains subscribe to the shared room (`ride_{id}`) | done | Screens 9, 10, 11, 13, 14, 15, 16 |
| Task 4.3.2 | Implement spatial query for available captains within radius (e.g. 2km) using `$near` or `$geoWithin` | done | Screen 14 |
| Task 4.3.3 | Implement sequential dispatch algorithm: send ride offer to the nearest eligible captain's personal room (`captain_{captainId}`) first, with countdown timeout | done | Screen 14 |
| Task 4.3.4 | Implement dispatch escalation logic: if declined or timed out, offer to next nearest. If none accept, expand search radius by 2km up to max (e.g. 10km); if still no match, set status `unmatched` and notify rider | done | Screens 9, 14 |
| **Milestone 5** | **Ride Lifecycle, OTP, & Stops** | | |
| Task 5.1 | Implement Accept Ride (`POST /rides/{id}/accept`) transitioning the ride directly to `driver_arriving` status (with both rider and captain joining the shared `ride_{id}` room) and broadcasting `ride_matched` carrying that status | done | Screen 14 |
| Task 5.2 | Implement Decline Ride (`POST /rides/{id}/decline`) and returning ride to matching pool | done | Screen 14 |
| Task 5.3 | Implement Arrived endpoint (`POST /rides/{id}/arrived`) transitioning to `driver_arrived` and broadcasting `ride_arrived` socket event | done | Screen 11, 13 |
| Task 5.4 | Implement Ride Start (`POST /rides/{id}/start`) verifying OTP, transitioning to `ongoing`, and broadcasting `ride_started` event | done | Screen 13 |
| Task 5.5 | Implement Complete Ride (`POST /rides/{id}/complete`) transitioning to `completed` and broadcasting `ride_completed` socket event | done | Screen 15 |
| Task 5.6 | Implement Cancel Ride (`DELETE /rides/{id}`) setting `cancelled_by_rider` or `cancelled_by_driver` based on caller role, and broadcasting `ride_cancelled` | done | Screens 9, 10, 11, 13 |
| Task 5.7 | Implement Add Stop endpoint (`POST /rides/{id}/stops`) inserting stop, recalculating routing/fare, and broadcasting socket update `ride_updated` | done | Screen 11 |
| Task 6.1 | Implement fare calculations based on vehicle tier (bike/rickshaw/car), distance, duration, and taxes (5% flat) | done | Screen 8, 16 |
| Task 6.2 | Integrate external routing service (LocationIQ API or mockup wrapper) to get accurate distance and duration | done | Screen 8, 11, 16 |
| Task 7.1 | Implement chat endpoints `POST /rides/{id}/messages` and `GET /rides/{id}/messages` | done | Screens 10, 11, 15, 16 |
| Task 7.2 | Implement real-time socket messaging event (`new_message`) and room scoping | done | Screens 10, 11, 15, 16 |
| **Milestone 8** | **Real-Time Location Streaming** | | |
| Task 8.1 | Handle `captain_location_update` events from Captain client every 3-5 seconds and update status in database | done | Screen 11 |
| Task 8.2 | Broadcast location updates to Rider client (`driver_location_update`) for real-time map tracking | done | Screen 11 |
| **Milestone 9** | **Frontend Integration** | | |
| Task 9.1 | Landing Screen (Screen 2) | done | Screen 2 |
| Task 9.2 | Rider Signup (Screen 1) & Rider Login (Screen 5) | done | Screens 1, 5 |
| Task 9.3 | Captain Signup (Screen 3) & Captain Login (Screen 6) | done | Screens 3, 6 |
| Task 9.4 | Captain Forgot & Reset Password Recovery States | done | Sibling styles |
| Task 9.5 | Rider Home (Screen 4) | done | Screen 4 |
| Task 9.6 | Vehicle Selection (Screen 8) & Confirm Ride (Screen 7) | done | Screens 7, 8 |
| Task 9.7 | Searching for Driver (Screen 9) & Driver Matched (Screen 10) | done | Screens 9, 10 |
| Task 9.8 | Rider Tracking (Screen 11) | done | Screen 11 |
| Task 9.9 | Captain Home (Screen 12) | done | Screen 12 |
| Task 9.10 | Incoming Request (Screen 14) & Captain Ride Confirmation (Screen 13) | done | Screens 13, 14 |
| Task 9.11 | Captain Active Trip (Screen 15) & Finish Ride Summary (Screen 16) | done | Screens 15, 16 |


