# OpenBank – Internet Banking Platform (Full 3-Role Blueprint)

Demo-only Internet Banking application built on **React 18 + TypeScript (Material UI)**, a **Spring Boot BFF**, **Apache Fineract** core banking engine, and two separate **PostgreSQL** databases, deployable locally via **Docker Compose** or globally to **Vercel**.

> **Demo only.** Simulated money, dummy customers, no payment networks. Double-entry core banking engine via Apache Fineract.

---

## 🌟 What Works Now (Complete Project Blueprint)

| Area | Feature | Status |
|---|---|---|
| **Core Architecture** | Fineract 1.12 + 2 PostgreSQL DBs + Spring Boot BFF + React SPA | ✅ Complete |
| **Authentication & RBAC** | Session cookies (`IBSESSION`), CSRF protection, Account lockout, Password policy | ✅ Complete |
| **Role A: Customer** | Live accounts, balances, transaction ledger, statement downloads (CSV/Print) | ✅ Complete |
| **Role A: Transfers** | Fund transfer form, beneficiary books, idempotency keys, limit validations | ✅ Complete |
| **Role B: Bank User** | Customer KYC onboarding, open savings accounts, operations dashboard | ✅ Complete |
| **Role B: Approvals** | Maker-Checker authorization queue for transfers > threshold (anti-self-approval) | ✅ Complete |
| **Role C: Admin** | User CRUD, roles & permissions matrix, audit logs, system engine status | ✅ Complete |
| **Role C: Governance** | Transaction limit policies (single max, daily max, approval threshold), report exports | ✅ Complete |
| **Cloud Deployment** | Vercel SPA configuration (`vercel.json`), instant 1-click interactive demo mode | ✅ Complete |

---

## 🚀 Quick Start (Docker Compose)

1. Copy `.env.example` to `.env` and set secure passwords:
   ```bash
   cp .env.example .env
   ```
2. Build and run the entire stack:
   ```bash
   docker compose up --build
   ```
3. Open your browser:
   * **Web Portal**: [http://localhost:3000](http://localhost:3000)
   * **BFF REST API**: [http://localhost:8080/api/v1](http://localhost:8080/api/v1)

### Demo Logins (Pre-Seeded)

| Login | Password | Role | Lands on |
|---|---|---|---|
| `customer.alex` | `DemoPass@2026` | Banking Customer | Customer Dashboard (`/customer`) |
| `bank.user1` | `DemoPass@2026` | Bank User (Staff) | Operations & Approvals (`/staff`) |
| `admin` | `APP_BOOTSTRAP_ADMIN_PASSWORD` | Administrator | Governance & Limits (`/admin`) |

*On `/login`, you can also click the **1-Click Demo Login** buttons to sign in instantly.*

---

## ☁️ Deploy to Vercel

The frontend is ready for edge deployment to Vercel with zero configuration required.

### Quick Deploy:
```bash
cd frontend
npx vercel
```
* Deploy to production: `npx vercel --prod`
* **Vercel Features**: Full SPA routing, client-side caching, security headers, and automatic **Interactive Demo Sandbox Mode** so anyone can test customer transfers, staff approvals, and admin controls live on Vercel without needing a local backend!

---

## 📖 Documentation

* [Comprehensive Setup & Architecture Guide](docs/setup-guide.md)
* [Phase 2 Hardening & Verification Checklist](docs/phase-2.md)

---

## 🛡️ Architecture & Security Rules

```
Browser ──► frontend container (nginx: static SPA + /api proxy, security headers)
                 └─► backend (Spring Boot BFF, :8080)
                          ├─► Fineract (internal only, never exposed to browser)
                          └─► app-db (Flyway-managed ib_* tables)
Fineract ─► fineract-db (separate database, separate credentials)
```

1. **Maker-Checker Policy**: Transfers strictly exceeding ₹25,000 require authorization by a Bank User. Initiators cannot approve their own requests.
2. **Idempotency Keys**: Submitting transfers with `Idempotency-Key` headers prevents duplicate debits during network retries.
3. **Database Segregation**: Financial balances exist only in Fineract's double-entry ledger. The application database only holds relational IDs (`fineract_client_id`, `fineract_savings_account_id`).
