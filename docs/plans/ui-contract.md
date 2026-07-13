# SwiftRide Mobility UI System - UI & API Contract

This document outlines the UI-to-API and component-to-prop contracts derived from the SwiftRide Mobility UI System canvas. The screens are organized in canvas **x-coordinate order**.

---

## Ride Status Enum

The backend maintains the lifecycle of a ride through the following state transitions:
`requested` → `matched` → `driver_arriving` → `driver_arrived` → `ongoing` → `completed`

And the following terminal states:
`cancelled_by_rider` and `cancelled_by_driver`

### Mapping of Screens to Ride Status:
- **Screen 4 (Rider Home)**: Initial state, before a ride request is made.
- **Screen 8 (Vehicle Selection) / Screen 7 (Confirm Ride)**: Preparing to request.
- **Screen 9 (Searching for Driver)**: Status is `requested`.
- **Screen 10 (Driver Matched)**: Status transitions to `matched`.
- **Screen 11 (Rider Tracking) / Screen 13 (Captain Ride Confirmation)**: Transitions to `driver_arriving`, then `driver_arrived` when the captain reaches the pickup location.
- **Screen 15 (Captain Active Trip)**: Status transitions to `ongoing` once the Captain enters the correct OTP and starts the ride.
- **Screen 16 (Finish Ride Summary)**: Status transitions to `completed` when the Captain marks the ride as complete.
- **Cancellations (Screens 9, 10, 11, 13)**: Transitions to `cancelled_by_rider` or `cancelled_by_driver`.

---

## Chat Feature Specification

To support real-time communication between Riders and Captains, a real chat feature is supported:

### 1. Database Schema (`messages` collection)
- `ride_id` (string): ID of the associated ride.
- `sender_role` (enum: `"rider" | "captain"`): Role of the message sender.
- `sender_id` (string): ID of the sender.
- `text` (string): The message content.
- `timestamp` (datetime): Time the message was sent.

### 2. API Endpoints
- `POST /rides/{id}/messages` — Send a message in a ride chat thread.
- `GET /rides/{id}/messages` — Retrieve chat history for a specific ride.

### 3. Socket.io Events
- `new_message` — Event broadcast to all users joined in the ride's socket room (`ride_{id}`) when a message is successfully sent.

---

## Real-Time Location Streaming

To support tracking the Captain's location in real-time on Screen 11:
- While a ride is in `driver_arriving`, `driver_arrived`, or `ongoing` status, the Captain's client emits location updates (`latitude` and `longitude`) every 3-5 seconds via a socket event named `captain_location_update`.
- The backend receives this event and rebroadcasts it to the ride's room (all clients in `ride_{id}`) as a `driver_location_update` event.
- The Rider's client on Screen 11 consumes the `driver_location_update` event to update the Captain's marker position dynamically on the live map.

---

## Screen 1: User Signup
* **Canvas ID:** `1100de57b84d4cc1bac4920605501efe` (x=1024)
* **Purpose:** A rider creates a new account to join the service.

### 1. Dynamic Data Fields
* `first_name` (string) — Input value for the rider's first name.
* `last_name` (string) — Input value for the rider's last name.
* `email` (string) — Input value for the email address.
* `password` (string) — Input value for the password (min. 8 characters).

### 2. User Actions / Buttons
* **Back Button (`arrow_back` icon)** -> Navigates back to the previous screen (Landing Screen).
* **Toggle Password Visibility (`visibility` icon)** -> Toggles password input visibility between `password` and `text` types.
* **Create account (Submit button)** -> Validates form inputs, triggers `POST /auth/signup`, and on success navigates to the Rider Home screen.
* **Log in (Link)** -> Navigates to the User Login screen.
* **Register as Captain (Button)** -> Navigates to the Captain Signup screen.

### 3. Screen-to-Screen Navigation
* **User Signup** -> **Rider Home** (on success)
* **User Signup** -> **User Login** (on "Log in" click)
* **User Signup** -> **Captain Signup** (on "Register as Captain" click)
* **User Signup** -> **Landing Screen** (on back button click)

---

## Screen 2: Landing Screen
* **Canvas ID:** `41b79407fe724a099874dac986ecc460` (x=1478)
* **Purpose:** Welcome landing screen for new users, showing wait times and driver availability.

### 1. Dynamic Data Fields
* `nearby_drivers_count` (number) — Display text of available drivers in area (e.g., `12`).
* `estimated_wait_time` (string) — Wait time display (e.g., `"4.2 min wait"`).

### 2. User Actions / Buttons
* **Continue (Button)** -> Triggers transition and navigates to the User Login/Signup flow.
* **Email Button (`mail Email`)** -> Initiates signup/login specifically with email.
* **Social Button (`account_circle Social`)** -> Initiates signup/login with social authentication providers.

### 3. Screen-to-Screen Navigation
* **Landing Screen** -> **User Login** / **User Signup**

---

## Screen 3: Captain Signup
* **Canvas ID:** `ccb3d31bb50e4d52bb28bcb3de679bef` (x=1932)
* **Purpose:** A driver registers to become a Captain.

### 1. Dynamic Data Fields
* `full_name` (string) — Input for the Captain's full name.
* `phone_number` (string) — Input for the phone number.
* `vehicle_type` (enum: `"bike" | "rickshaw" | "car"`) — Selected vehicle type option.
* `plate_number` (string) — Input for the license plate number.
* `capacity` (number) — Submitted value for the vehicle seat capacity (e.g., `1`, `2`, `4`, `6` - mapped in backend; UI selection handles bucketed labels "1 person", "2 people", "4 people", "6+ people").
* `vehicle_color` (string) — Vehicle color selection.
* `terms_accepted` (boolean) — Checkbox state agreeing to terms.

### 2. User Actions / Buttons
* **Back Button (`arrow_back` icon)** -> Returns to the User Signup screen.
* **Vehicle Type Selectors (Radio inputs)** -> Updates the `vehicle_type` state.
* **Capacity Options (UI Segmented buttons)** -> Selects vehicle passenger capacity, maps selection to integer.
* **Color Swatches (Black, White, Red, Grey)** -> Chooses the vehicle color value.
* **Submit Registration (Submit button)** -> Sends validated form data to `POST /auth/captain/signup` and navigates to Captain Login (Fixed).

### 3. Screen-to-Screen Navigation
* **Captain Signup** -> **User Signup** (on click Back)
* **Captain Signup** -> **Captain Login (Fixed)** (on successful registration)

---

## Screen 4: Rider Home
* **Canvas ID:** `b4fb58ed183d45519a3e088277a218c4` (x=2386)
* **Purpose:** Main screen for authenticated riders to input destination.

### 1. Dynamic Data Fields
* `pickup_address` (string) — Input pickup address (defaults to `"Current Location"`).
* `destination_address` (string) — Empty destination query input.
* `recent_locations` (list of objects) — List containing saved/recent locations, each with:
  * `title` (string) — e.g., `"Central Station"`.
  * `address` (string) — e.g., `"401 7th Ave, New York, NY"`.
  * `type` (enum: `"history" | "home" | "work" | "star"`).

### 2. User Actions / Buttons
* **Menu Button (`menu` icon)** -> Toggles side navigation drawer showing Rider's name, rating, and navigation links.
* **My Location Button (`my_location` icon)** -> Centers the map on the user's current GPS location.
* **Destination Input focus/enter** -> Focuses input field to search for a location.
* **Recent/Saved Location Item click** -> Selects the address as destination and navigates to the Vehicle Selection screen.
* **Bottom Navigation Tabs (`Ride` (active), `Activity`, `Wallet` (non-functional placeholder), `Account`)** -> Switches tabs.

### 3. Screen-to-Screen Navigation
* **Rider Home** -> **Vehicle Selection** (upon entering destination or clicking a saved location)
* **Rider Home** -> **User Login** (if authorization token is invalid or expires)

---

## Screen 5: User Login
* **Canvas ID:** `789637a8c3cb4c728ee9db37b995bb62` (x=2840)
* **Purpose:** Rider logs in to their account.

### 1. Dynamic Data Fields
* `email` (string) — Input value for the rider's email.
* `password` (string) — Input value for the password.

### 2. User Actions / Buttons
* **Visibility toggle (`visibility` icon)** -> Toggles visibility of password string.
* **Login (Button)** -> Triggers `POST /auth/login`, stores auth token, and navigates to Rider Home on success.
* **Sign in as Captain (Button)** -> Navigates to Captain Login (Fixed).
* **Create new Account (Link)** -> Navigates to User Signup.

### 3. Screen-to-Screen Navigation
* **User Login** -> **Rider Home** (on successful authentication)
* **User Login** -> **Captain Login (Fixed)** (on click Sign in as Captain)
* **User Login** -> **User Signup** (on click Create new Account)

---

## Screen 6: Captain Login (Fixed)
* **Canvas ID:** `152a215501564265a1aa066cfc8103d0` (x=3748)
* **Purpose:** Captain logs in to their driver portal.

### 1. Dynamic Data Fields
* `email` (string) — Input value for Captain email.
* `password` (string) — Input value for Captain password.

### 2. User Actions / Buttons
* **Login (Button)** -> Triggers `POST /auth/captain/login` and navigates to Captain Home on success.
* **Sign in as User (Button)** -> Navigates to User Login.
* **Forgot Password? (Link)** -> Navigates to the **Captain Password Recovery Flow** (described below).
* **Signup (Link)** -> Navigates to Captain Signup.

### 3. Screen-to-Screen Navigation
* **Captain Login (Fixed)** -> **Captain Home** (on success)
* **Captain Login (Fixed)** -> **User Login** (on click Sign in as User)
* **Captain Login (Fixed)** -> **Captain Signup** (on click Signup)
* **Captain Login (Fixed)** -> **Captain Password Recovery Flow** (on click Forgot Password?)

---

## Screen 7: Confirm Ride
* **Canvas ID:** `7a8c2a74b29d44d7a9d782f186305a80` (x=4202)
* **Purpose:** Rider reviews pickup, destination, fare, and payment method before requesting.

### 1. Dynamic Data Fields
* `selected_vehicle_name` (string) — e.g., `"DriveNow Comfort"`.
* `selected_vehicle_meta` (string) — e.g., `"Seats 4 • 3 min away"`.
* `pickup_address` (string) — e.g., `"725 5th Ave, New York"`.
* `destination_address` (string) — e.g., `"JFK International Airport"`.
* `estimated_fare` (number) — Display fare amount, e.g., `42.50`.

### 2. User Actions / Buttons
* **Menu Button (`menu` icon)** -> Opens drawer.
* **Confirm Ride Button (Dynamic label: `"Confirm {selected_vehicle_name}"`)** -> Triggers ride request API `POST /rides/request` (status transitions to `requested`), showing spinner, and navigates to Searching for Driver.

### 3. Screen-to-Screen Navigation
* **Confirm Ride** -> **Searching for Driver** (on successful request)
* **Confirm Ride** -> **Vehicle Selection** (if user cancels or goes back)

---

## Screen 8: Vehicle Selection
* **Canvas ID:** `a814e2287e384b6d81bb2d17ff3bfb3c` (x=4656)
* **Purpose:** Rider reviews available vehicle categories, seat counts, pricing, and ETA.

### 1. Dynamic Data Fields
* `pickup_address` (string) — e.g., `"Grand Central Terminal"`.
* `destination_address` (string) — e.g., `"Empire State Building"`.
* `available_vehicles` (list of objects) — List of ride options, each containing:
  * `id` (string) — Unique category ID.
  * `name` (string) — e.g., `"Bike"`, `"Rickshaw"`, `"Car"`.
  * `capacity` (number) — e.g., `1`, `3`, `4`.
  * `eta_text` (string) — e.g., `"2 mins away"`, `"5 mins away"`.
  * `price` (number) — e.g., `4.50`, `8.20`, `12.00`.
  * `badge` (string/null) — e.g., `"Economy"`, `"FASTER"`.

### 2. User Actions / Buttons
* **Menu Button (`menu` icon)** -> Opens drawer.
* **Vehicle Card Select** -> Highlights card and updates selected vehicle state.
* **Confirm Ride (Button)** -> Confirms vehicle type and navigates to the Confirm Ride screen.
* **Bottom Navigation Tabs (`Ride`, `Activity`, `Wallet` (placeholder), `Account`)** -> Navigates to respective screens.

### 3. Screen-to-Screen Navigation
* **Vehicle Selection** -> **Confirm Ride** (on click Confirm Ride)
* **Vehicle Selection** -> **Rider Home** (on closing destination panel)

---

## Screen 9: Searching for Driver
* **Canvas ID:** `235c7346ca6e48be935134c6c87eff5e` (x=5110)
* **Purpose:** Rider waits while backend matches a captain.

### 1. Dynamic Data Fields
* `pickup_address` (string) — e.g., `"5th Avenue, Empire State Building"`.
* `destination_address` (string) — e.g., `"JFK International Airport"`.
* `fare_amount` (number) — e.g., `45.50`.

### 2. User Actions / Buttons
* **Menu Button (`menu` icon)** -> Opens drawer.
* **Cancel Request (Button)** -> Triggers `DELETE /rides/{id}` (status transitions to `cancelled_by_rider`) and navigates back to Rider Home.

### 3. Screen-to-Screen Navigation
* **Searching for Driver** -> **Driver Matched** (automatically upon driver matching via WebSocket, status transitions to `matched`)
* **Searching for Driver** -> **Rider Home** (upon cancellation)

---

## Screen 10: Driver Matched
* **Canvas ID:** `4d9688a9179f434abf94ae0f9de5d222` (x=5564)
* **Purpose:** Shows rider their matched Captain details, OTP, and ETA to pickup.

### 1. Dynamic Data Fields
* `eta_to_pickup` (string) — e.g., `"2 mins away"`.
* `driver_name` (string) — e.g., `"Captain John Doe"`.
* `driver_rating` (number) — e.g., `4.9`.
* `vehicle_model_color` (string) — e.g., `"Toyota Camry • Black"`.
* `vehicle_plate` (string) — e.g., `"ABC-1234"`.
* `otp_code` (string) — 4-digit code needed by driver to start trip, e.g., `"8241"`.
* `pickup_address` (string) — e.g., `"Grand Central Terminal, NY"`.
* `destination_address` (string) — e.g., `"Empire State Building, NY"`.
* `fare_amount` (number) — e.g., `24.50`.

### 2. User Actions / Buttons
* **Message Button (`chat Message`)** -> Opens in-app chat thread scoped to this ride.
* **Call Button (`call Call`)** -> **Client-only action**: Opens a native tel link (`tel:{phone_number}`) using the Captain's phone number from the ride data. No backend call/telephony integration required.
* **Cancel Ride (Button)** -> Sends `DELETE /rides/{id}` request (status transitions to `cancelled_by_rider`) and returns to Rider Home.

### 3. Screen-to-Screen Navigation
* **Driver Matched** -> **Rider Tracking** (automatically via WebSocket when driver starts trip, status transitions to `driver_arriving` then `driver_arrived`)
* **Driver Matched** -> **Rider Home** (on cancellation)

---

## Screen 11: Rider Tracking
* **Canvas ID:** `4a05f238a33b4a1dbce57069e4631db2` (x=6018)
* **Purpose:** Rider tracks trip progress in real-time.

### 1. Dynamic Data Fields
* `eta_status_text` (string) — e.g., `"Driver is arriving in 3 min"`.
* `driver_name` (string) — e.g., `"John Doe"`.
* `driver_rating` (number) — e.g., `4.9`.
* `vehicle_model_color` (string) — e.g., `"Black Tesla Model 3"`.
* `vehicle_plate` (string) — e.g., `"NY-8829"`.
* `estimated_fare` (number) — e.g., `42.50`.
* `eta_time` (string) — e.g., `"14:45"`.

### 2. User Actions / Buttons
* **Back Button (`arrow_back` icon)** -> Minimizes details sheet.
* **Share Button (`share` icon)** — **Client-only action**: Uses the browser's native Web Share API (or a fallback plain-text copy-link clipboard method) to share the live trip status message. No backend endpoint required.
* **Call Button (`call Call`)** — **Client-only action**: Opens native tel link (`tel:{phone_number}`) using the Captain's phone number. No backend call/telephony integration required.
* **Message Button (`chat_bubble Message`)** -> Opens in-app chat thread scoped to this ride.
* **Add Stop Button (`add_circle Add Stop`)** -> Opens location search (reusing Rider Home address-search). The selected stop is inserted via `POST /rides/{id}/stops` into the ride's ordered `stops` array before the final destination, which triggers a fare/distance recalculation. The server then broadcasts the updated route/fare to both rider and captain via Socket.io (e.g., `ride_updated` event).
* **Cancel Ride (Button)** -> Sends `DELETE /rides/{id}` request (status transitions to `cancelled_by_rider`) and returns to Rider Home.

### 3. Screen-to-Screen Navigation
* **Rider Tracking** -> **Rider Home** (if cancelled or trip completes, redirecting rider to final screen)

---

## Screen 12: Captain Home
* **Canvas ID:** `aac1a7a05b704a4daf60978a7d5bd546` (x=6472)
* **Purpose:** Driver's dashboard to go online/offline and check today's stats.

### 1. Dynamic Data Fields
* `is_online` (boolean) — Status indicator for the toggle button.
* `status_label` (string) — e.g., `"Offline"` or `"Online"`.
* `completed_rides_count` (number) — e.g., `0`.
* `online_hours` (number) — e.g., `0.0`.
* `earnings_amount` (number) — e.g., `0.00`.

### 2. User Actions / Buttons
* **Logout Button (`logout` icon)** -> Triggers logout API call `POST /auth/logout` and redirects to Captain Login (Fixed).
* **Online/Offline Switch (`onlineToggle`)** -> Updates state and triggers `POST /captains/status` to start/stop shift.
* **Bottom Navigation Tabs (`Ride` (active), `Activity`, `Wallet` (placeholder), `Account`)** -> Switches tabs.

### 3. Screen-to-Screen Navigation
* **Captain Home** -> **Incoming Request** (automatically via WebSocket when a request matches)
* **Captain Home** -> **Captain Login (Fixed)** (on click Logout)

---

## Screen 13: Captain Ride Confirmation
* **Canvas ID:** `c29d3fb6c6664c439cac4357327f58b6` (x=6926)
* **Purpose:** Captain enters the rider's OTP to confirm pickup and start trip.

### 1. Dynamic Data Fields
* `rider_name` (string) — e.g., `"Sarah Jenkins"`.
* `rider_rating` (number) — e.g., `4.9`.
* `pickup_address` (string) — e.g., `"825 Market St, San Francisco"`.
* `destination_address` (string) — e.g., `"Mission Bay, Terry A Francois Blvd"`.
* `entered_otp` (string) — 4-digit code entered digit-by-digit.

### 2. User Actions / Buttons
* **Menu Button (`menu` icon)** -> Opens drawer.
* **OTP Input Slots (4 fields)** -> Focus shifts as user enters values.
* **Confirm Ride (Button)** -> Triggers `POST /rides/{id}/start` with OTP payload (status transitions to `ongoing`) and transitions to Captain Active Trip on success.
* **Cancel Ride (Link)** -> Sends `DELETE /rides/{id}` request (status transitions to `cancelled_by_driver`) and returns to Captain Home.

### 3. Screen-to-Screen Navigation
* **Captain Ride Confirmation** -> **Captain Active Trip** (on successful OTP match)
* **Captain Ride Confirmation** -> **Captain Home** (on click Cancel Ride)

---

## Screen 14: Incoming Request
* **Canvas ID:** `497ddddd202a46558892e2357540a0b2` (x=7380)
* **Purpose:** Captain is offered a matching ride request.

### 1. Dynamic Data Fields
* `rider_name` (string) — e.g., `"Sarah Jenkins"`.
* `rider_rating` (number) — e.g., `4.9`.
* `rider_stats` (string) — e.g., `"Rider since 2022 • 124 Rides"`.
* `pickup_distance` (string) — e.g., `"3.9 km"`.
* `fare_amount` (number) — e.g., `18.50`.
* `pickup_address` (string) — e.g., `"221B Baker Street, NW1 6XE"`.
* `destination_address` (string) — e.g., `"Heathrow Airport Terminal 5"`.
* `timeout_seconds` (number) — Countdown seconds remaining (e.g. 15s).

### 2. User Actions / Buttons
* **Accept Ride (Button)** -> Sends `POST /rides/{id}/accept` (status transitions to `matched`), stops timer, and navigates to Captain Ride Confirmation.
* **Decline (Button)** -> Sends `POST /rides/{id}/decline` and returns to Captain Home.

### 3. Screen-to-Screen Navigation
* **Incoming Request** -> **Captain Ride Confirmation** (on Accept)
* **Incoming Request** -> **Captain Home** (on Decline or countdown timeout)

---

## Screen 15: Captain Active Trip
* **Canvas ID:** `447b49d98c29450d80d1e044097ffcc8` (x=7834)
* **Purpose:** Navigation dashboard for Captain during ongoing trip.

### 1. Dynamic Data Fields
* `next_maneuver_icon` (string) — Material icon name, e.g., `"turn_right"`.
* `maneuver_distance` (string) — e.g., `"450m"`.
* `maneuver_instruction` (string) — e.g., `"Turn right onto Park Avenue"`.
* `eta_status_text` (string) — e.g., `"Arriving in 6 mins"`.
* `rider_name` (string) — e.g., `"Sarah Miller"`.
* `rider_rating` (number) — e.g., `4.9`.
* `pickup_address` (string) — e.g., `"1245 Market St, Tower 2"`.
* `trip_distance` (string) — e.g., `"2.4 km"`.
* `trip_earnings` (number) — e.g., `18.50`.

### 2. User Actions / Buttons
* **Mute Voice Button (`volume_up` icon)** -> Mutes voice navigation.
* **Call Button (`call` icon)** — **Client-only action**: Opens a native tel link (`tel:{phone_number}`) using the Rider's phone number already in the ride object. No backend call/telephony integration required.
* **Chat Button (`chat_bubble` icon)** -> Opens in-app chat thread scoped to this ride.
* **Complete Ride (Button)** -> Sends `POST /rides/{id}/complete` request (status transitions to `completed`), triggers success screen, and navigates to Finish Ride Summary.

### 3. Screen-to-Screen Navigation
* **Captain Active Trip** -> **Finish Ride Summary** (on trip completion)

---

## Screen 16: Finish Ride Summary
* **Canvas ID:** `16a85d481b2d4e3383e372df9393193f` (x=8288)
* **Purpose:** Captain-facing summary screen displaying trip metrics and fare details upon arrival.

### 1. Dynamic Data Fields
* `total_fare` (number) — e.g., `42.50`.
* `trip_duration` (string) — e.g., `"24 mins"`.
* `trip_distance` (string) — e.g., `"13.2 km"`.
* `pickup_time` (string) — e.g., `"14:20"`.
* `pickup_address` (string) — e.g., `"122 East 42nd Street, New York"`.
* `dropoff_time` (string) — e.g., `"14:44"`.
* `dropoff_address` (string) — e.g., `"Brooklyn Heights, Joralemon St"`.
* `fare_breakdown` (object):
  * `base_fare` (number) — e.g., `5.50`.
  * `distance_fare` (number) — e.g., `24.60`.
  * `time_fare` (number) — e.g., `7.20`.
  * `taxes_fees` (number) — e.g., `5.20`.
* `rider_name` (string) — e.g., `"Alex Rivera"`.
* `rider_rating` (number) — e.g., `4.9`.
* `rider_membership_start` (string) — e.g., `"Member since 2021"`.

### 2. User Actions / Buttons
* **Back Button (`arrow_back` icon)** -> Returns to active trip/map context.
* **Fare Breakdown Header Toggle** -> Expands/collapses the detailed fee Breakdown section.
* **Chat Button (`chat_bubble` icon)** -> Opens in-app chat thread scoped to this ride.
* **Finish Ride (Button)** -> Processes final transaction state, showing complete screen.
* **Report an Issue (Button)** — **Stub-only action for MVP**: Non-functional/disabled button. Clicking it displays a simple "Coming soon" message. No backend endpoint is built in the current scope.
* **Back to Home (Button, Success Overlay)** -> Navigates back to Captain Home.

### 3. Screen-to-Screen Navigation
* **Finish Ride Summary** -> **Captain Home** (on completion)

---

## Captain Password Recovery Flow (Mini-Flow)

This flow is added as a requirement for Captain password reset and security management. *(Note: These screens do not exist yet in the current Stitch Canvas and will need equivalent UI components constructed separately).*

### State A: Forgot Password Request
* **Purpose:** Captain requests a password reset link by providing their email.
* **Dynamic Data Fields:**
  - `email` (string) — Input for the Captain's registered email address.
* **User Actions / Buttons:**
  - **Submit Button** -> Triggers `POST /auth/captain/forgot-password`, which generates a time-limited reset token, associates it with the Captain's account, and emails a recovery link using Nodemailer.
  - **Cancel / Back Link** -> Returns to Captain Login (Fixed).
* **Screen-to-Screen Navigation:**
  - Forgot Password Request -> Captain Login (Fixed) (on click back or successful email submission)

### State B: Reset Password
* **Purpose:** Captain enters a new password using the token sent to their email.
* **Dynamic Data Fields:**
  - `new_password` (string) — Input for the new password.
  - `confirm_new_password` (string) — Input to confirm the new password.
  - `token` (string) — Extracted dynamically from the URL query params.
* **User Actions / Buttons:**
  - **Reset Password (Button)** -> Sends token and new password to `POST /auth/captain/reset-password`, updates the password on success, and shows a confirmation message.
* **Screen-to-Screen Navigation:**
  - Reset Password -> Captain Login (Fixed) (on successful password update)
