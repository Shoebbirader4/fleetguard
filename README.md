# FleetGuard AI

Enterprise-grade, multi-tenant SaaS platform for commercial fleet maintenance with predictive analytics.

## Project Structure

```
.
├── web/                    # React + TypeScript web application
├── mobile/                 # React Native (Expo) mobile apps
├── edge-functions/         # Supabase Edge Functions (Deno/TypeScript)
├── ml-service/            # Python ML service for predictive maintenance
├── shared/                # Shared types, utilities, and constants
└── .kiro/                 # Kiro AI development specs and tasks
```

## Technology Stack

- **Database**: PostgreSQL via Supabase with Row-Level Security (RLS)
- **Authentication**: Supabase Auth with JWT-based role authorization
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **Web Frontend**: React + TypeScript with TailwindCSS
- **Mobile**: React Native (Expo) for iOS and Android
- **AI/ML**: Python with FastAPI, scikit-learn, TensorFlow
- **Notifications**: WhatsApp Business API, Twilio SMS, SendGrid Email, Firebase FCM
- **GPS**: Google Maps API integration

## Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- Supabase CLI
- Expo CLI (for mobile development)
- Docker (for ML service deployment)
- Git

## Getting Started

### 1. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Note your project URL and anon/service keys
3. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

### 2. Environment Configuration

Create `.env` files in each directory:

#### `web/.env`
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

#### `mobile/.env`
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

#### `edge-functions/.env`
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
WHATSAPP_API_KEY=your_whatsapp_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
SENDGRID_API_KEY=your_sendgrid_key
FIREBASE_SERVER_KEY=your_firebase_key
```

#### `ml-service/.env`
```
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### 3. Installation

#### Web Application
```bash
cd web
npm install
npm run dev
```

#### Mobile Apps
```bash
cd mobile
npm install
npx expo start
```

#### Edge Functions
```bash
cd edge-functions
supabase functions serve
```

#### ML Service
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Development Workflow

1. Database migrations are managed through Supabase CLI
2. Edge Functions are deployed using `supabase functions deploy`
3. Web frontend is built and deployed to CDN (Vercel/Netlify)
4. Mobile apps are built using EAS Build and submitted to app stores
5. ML service is containerized and deployed to AWS ECS/Google Cloud Run

## Key Features

- **Multi-Tenant Architecture**: Complete data isolation with PostgreSQL RLS
- **Predictive Maintenance**: ML-powered failure prediction and RUL estimation
- **Real-Time Updates**: Live dashboard updates using Supabase Realtime
- **Offline-First Mobile**: React Native apps with WatermelonDB local storage
- **Multi-Channel Notifications**: WhatsApp, SMS, Email, Push notifications
- **GPS Integration**: Real-time vehicle tracking with Google Maps
- **AI Assistant**: Computer vision and NLP for maintenance record creation
- **Comprehensive Analytics**: MTBF, MTTR, fleet health scores, cost analysis

## Security

- AES-256 encryption at rest (database, storage, mobile)
- TLS 1.3 encryption in transit (all API connections)
- Row-Level Security (RLS) for multi-tenant isolation
- JWT-based authentication with role-based access control
- Rate limiting (100 req/min per user)
- GDPR compliance (data portability and deletion)

**Detailed Documentation:**
- [Encryption Configuration Guide](docs/ENCRYPTION_CONFIGURATION.md)
- [Encryption Quick Reference](docs/ENCRYPTION_QUICK_REFERENCE.md)
- [Encryption Verification Script](scripts/README-ENCRYPTION-VERIFICATION.md)

## License

Proprietary - All rights reserved

## Support

For questions and support, contact the development team.
