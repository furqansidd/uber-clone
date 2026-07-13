# DriveNow 🚗

A full-stack Uber-clone built with **Node.js + Express** (backend) and **React + Vite** (frontend), featuring real-time ride tracking via Socket.IO.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 5, MongoDB (Mongoose) |
| Frontend | React, Vite |
| Real-time | Socket.IO |
| Auth | JWT (access + refresh tokens) |
| Testing | Jest, Supertest, mongodb-memory-server |
| Maps | LocationIQ API |

## Project Structure

```
drivenow/
├── src/                  # Backend source
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── app.js
│   ├── server.js
│   └── socket.js
├── client/               # React + Vite frontend
│   ├── src/
│   └── public/
├── tests/                # Backend integration/unit tests
├── docs/                 # Project documentation & plans
├── .env.example          # Environment variable template
└── package.json
```

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)

### 1. Clone the repo

```bash
git clone https://github.com/furqansidd/uber-clone.git
cd uber-clone
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Fill in the values in .env
```

### 3. Install dependencies

```bash
# Backend
npm install

# Frontend
cd client && npm install
```

### 4. Run the app

```bash
# Backend (from root)
npm start

# Frontend (from client/)
cd client && npm run dev
```

### 5. Run tests

```bash
npm test
```

## Environment Variables

See [.env.example](.env.example) for all required variables:

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRY` | Access token expiry (e.g. `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry (e.g. `7d`) |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` | SMTP password |
| `LOCATIONIQ_API_KEY` | LocationIQ Maps API key |

## License

ISC
