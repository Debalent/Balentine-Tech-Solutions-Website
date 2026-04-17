# Balentine Tech Solutions — Portfolio Website

A full-stack portfolio website for **Demond Balentine Sr.**, full-stack developer and technical founder — deployed on AWS with Docker, CI/CD, and Infrastructure as Code.

---

## Live URLs

| Service | URL |
|---------|-----|
| **Frontend** (CloudFront CDN) | https://d3mlam2b9qbwyy.cloudfront.net |
| **Backend API** (Elastic Beanstalk) | http://Balentinetech-backend-env.eba-pmim6y3b.us-east-2.elasticbeanstalk.com/api/health |
| **Live Website** | [https://d3mlam2b9qbwyy.cloudfront.net](https://d3mlam2b9qbwyy.cloudfront.net) |

---

## Tech Stack

### Frontend
- **React 18 + Vite** — component-based UI, fast HMR
- **CSS3** — custom properties (design tokens), dark/light themes, responsive layouts
- **Hosted on:** AWS S3 + CloudFront (CDN, HTTPS, cache invalidation on deploy)

### Backend
- **Node.js + Express** — REST API, contact form, project data
- **PostgreSQL (RDS)** — projects table, DB health check endpoint
- **Nodemailer** — contact form email delivery
- **Hosted on:** AWS Elastic Beanstalk (Docker Compose, Amazon Linux 2023)

### Infrastructure (IaC — Pulumi TypeScript)
- **VPC** — custom networking with public/private subnets
- **EC2** — t2.micro instance with Docker (backup backend host)
- **RDS** — PostgreSQL 15.17 in private subnet
- **CloudFront** — OAC, SPA routing, HTTPS redirect
- **SNS + CloudWatch** — alarm notifications via email

### CI/CD
- **GitHub Actions** — test → build → parallel deploy (frontend S3 + backend EB)
- **Docker Hub** — image registry (`debalent/balentinetech-frontend`, `debalent/balentinetech-backend`)
- **Automatic rollback** — on EB health failure, reverts to last known-good version

---

## Project Structure

```
/
+-- index.html                  # Static landing page (original)
+-- styles.css                  # Original site styles
+-- script.js                   # Original site scripts
+-- frontend/                   # React + Vite app (primary frontend)
|   +-- src/
|   +-- public/
|   +-- vite.config.js
|   +-- package.json
+-- backend/                    # Node.js / Express API
|   +-- server.js               # Main server (API routes, DB, email)
|   +-- Dockerfile              # Container definition
|   +-- docker-compose.yml      # EB deployment descriptor (AL2023)
|   +-- .ebextensions/
|   |   +-- health.config       # Sets EB health check to /api/health
|   +-- package.json
+-- pulumi/                     # Pulumi IaC (TypeScript)
|   +-- index.ts                # All 40 AWS resources defined here
|   +-- Pulumi.yaml
|   +-- Pulumi.prod.yaml
+-- aws-submission/             # Assignment submission artifacts
|   +-- README.md               # Full AWS deployment documentation
|   +-- s3-cloudfront-policy.json
|   +-- s3-lifecycle-policy.json
|   +-- s3-script.js
+-- .github/
|   +-- workflows/
|       +-- deploy-aws.yml      # Main CI/CD pipeline (push to main)
|       +-- deploy.yml          # GitHub Pages deploy
+-- Dockerfile                  # Root-level Docker definition
+-- README.md                   # This file
```

---

## CI/CD Pipeline

Every push to `main` triggers a 4-job pipeline:

| Job | What it does |
|-----|-------------|
| **Test Backend** | `npm install` + server startup smoke test |
| **Build & Push Docker** | Builds frontend + backend images, pushes to Docker Hub with `:latest` and `:<sha>` tags |
| **Deploy Frontend to S3** | Builds React app, syncs `dist/` to S3, invalidates CloudFront |
| **Deploy Backend to EB** | Stamps SHA into `docker-compose.yml`, zips + uploads to S3, creates EB version, deploys, polls until Ready, verifies health |

Rollback job runs automatically if the EB deploy job fails.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/health/db` | RDS connectivity check |
| GET | `/api/projects` | Portfolio projects (static data) |
| GET | `/api/projects/db` | Portfolio projects (from RDS) |
| GET | `/api/about` | About section data |
| POST | `/api/contact` | Contact form submission |

---

## Local Development

```bash
# Backend
cd backend
npm install
node server.js          # http://localhost:3001

# Frontend (React)
cd frontend
npm install
npm run dev             # http://localhost:5173

# Original static site
start index.html
```

---

## Infrastructure (Pulumi)

All AWS resources are defined in `pulumi/index.ts` and provisioned with:

```bash
cd pulumi
npm install
export AWS_PROFILE=balentinetech
export PULUMI_ACCESS_TOKEN=<token>
pulumi up --yes
```

Resources include: VPC, subnets, IGW, route tables, security groups, EC2, RDS, S3, CloudFront (OAC), Elastic Beanstalk app + environment, SNS topic + subscription, CloudWatch alarms, IAM users + policies.

---

## Monitoring

CloudWatch alarms notify `balentinetechsolutions@gmail.com` via SNS on:
- EC2 CPU > 80%
- EB environment health degraded/severe
- HTTP 5xx error spike (> 10 in 5 min)
- Unhealthy ELB target count >= 1

---

## Contact

- **Email:** balentinetechsolutions@gmail.com
- **Phone:** (479) 250-2573
- **GitHub:** [github.com/Debalent](https://github.com/Debalent)
