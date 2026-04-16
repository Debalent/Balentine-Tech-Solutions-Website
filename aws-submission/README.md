# Balentine Tech Solutions — AWS Deployment Submission

Full-stack portfolio website deployed on AWS using Infrastructure as Code, Docker containers, CI/CD pipelines, and cloud monitoring.

---

## Live URLs

| Service | URL |
|---------|-----|
| Frontend (CloudFront CDN) | https://d3mlam2b9qbwyy.cloudfront.net |
| Backend API (Elastic Beanstalk) | http://Balentinetech-backend-env.eba-pmim6y3b.us-east-2.elasticbeanstalk.com/api/health |
| Backend API (EC2 Direct) | http://3.135.185.213:3001/api/health |

---

## Architecture Overview

```
                     +-------------------------------------------+
                     |           GitHub Actions CI/CD             |
                     |  push -> test -> build -> deploy parallel  |
                     +-------------------+-----------------------+
                                         |
              +------------------------------+------------------------------+
              |                                                              |
              v                                                              v
   +------------------------+                               +----------------------------+
   |   S3 + CloudFront      |                               |   Elastic Beanstalk        |
   |   (React Frontend)     |                               |   (Node.js Backend)        |
   |                        |                               |   Docker Compose on        |
   |  balentinetech-        |                               |   Amazon Linux 2023        |
   |  solutions-frontend    |                               +-----------+----------------+
   +------------------------+                                           |
                                                                        v
                                                          +----------------------------+
                                                          |   RDS PostgreSQL 15        |
                                                          |   (Private Subnet)         |
                                                          |   balentinetech-db-01      |
                                                          +----------------------------+

   +----------------------------------------------------------------------------+
   |  EC2 (t2.micro) -- Docker container, port 3001, backup backend host        |
   |  VPC -- public/private subnets, security groups, internet gateway          |
   |  SNS -- CloudWatch alarm notifications -> balentinetechsolutions@gmail.com  |
   |  CloudWatch -- CPU, memory, and HTTP error alarms                          |
   +----------------------------------------------------------------------------+
```

---

## AWS Resources (Provisioned via Pulumi IaC)

| Resource | Name / ID | Region |
|----------|-----------|--------|
| **VPC** | Custom VPC with public + private subnets | us-east-2 |
| **EC2** | `i-04b9e2c8d1047577c` (t2.micro, Amazon Linux 2023) | us-east-2 |
| **RDS** | `balentinetech-db-01` (PostgreSQL 15.17, db.t3.micro) | us-east-2 |
| **S3 Frontend** | `balentinetech-solutions-frontend` | us-east-2 |
| **CloudFront** | `E3JAS2SUAACWP9` — `d3mlam2b9qbwyy.cloudfront.net` | Global |
| **Elastic Beanstalk App** | `balentinetech-backend` | us-east-2 |
| **Elastic Beanstalk Env** | `Balentinetech-backend-env` (AL2023, Docker) | us-east-2 |
| **SNS Topic** | `balentinetech-pulumi-alerts` | us-east-2 |
| **CloudWatch Alarms** | CPU high, HTTP 5xx, unhealthy host alarms | us-east-2 |
| **IAM Users** | `balentinetech-pulumi-admin`, `balentinetech-github-actions` | Global |

All 40 resources are defined in `pulumi/index.ts` and managed as code.

---

## Infrastructure as Code — Pulumi

**Stack:** `Debalent/balentine-tech-solutions/prod`
**Language:** TypeScript
**State backend:** Pulumi Cloud

```bash
cd pulumi
npm install
pulumi up --yes
```

Resources defined in `pulumi/index.ts`:
- VPC, subnets, internet gateway, route tables, security groups
- EC2 instance with Docker user-data script
- RDS PostgreSQL instance (private subnet)
- S3 bucket with static website hosting and versioning
- CloudFront distribution (OAC, HTTPS redirect, caching behaviors)
- SNS topic + email subscription for alerting
- CloudWatch metric alarms (EC2 CPU, EB health, HTTP errors)
- IAM users and policies for CI/CD

---

## CI/CD Pipeline — GitHub Actions

**Workflow file:** `.github/workflows/deploy-aws.yml`
**Trigger:** Push to `main` or manual `workflow_dispatch`

### Pipeline Jobs

```
push to main
    |
    +-- [1] Test Backend          <- npm install + node server startup test
    |
    +-- [2] Build & Push Docker   <- builds frontend + backend images
            |                        pushes to Docker Hub (debalent/*)
            |                        tags: :latest + :<git-sha>
            |
            +-- [3] Deploy Frontend to S3
            |       aws s3 sync dist/ -> balentinetech-solutions-frontend
            |       CloudFront invalidation (/*
            |
            +-- [4] Deploy Backend to Elastic Beanstalk
                    stamp SHA into docker-compose.yml
                    zip docker-compose.yml + .ebextensions/
                    upload to S3 -> create EB app version -> update environment
                    poll until Ready -> verify health (non-Red)
                    on failure -> rollback to previous version
```

### GitHub Secrets Required

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | IAM user `balentinetech-github-actions` |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `S3_BUCKET_NAME` | Frontend bucket (`balentinetech-solutions-frontend`) |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID (`E3JAS2SUAACWP9`) |
| `EC2_HOST` | EC2 public IP (`3.135.185.213`) |
| `SNS_ALERT_TOPIC_ARN` | SNS topic ARN for pipeline alerts |
| `DOCKERHUB_TOKEN` | Docker Hub PAT for image pushes |

---

## Backend — Node.js / Express

**Source:** `backend/server.js`
**Docker image:** `debalent/balentinetech-backend`
**Port:** 3001
**Deployment:** Docker Compose on Elastic Beanstalk (AL2023)

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/health/db` | Database connectivity check |
| GET | `/api/projects` | Fetch portfolio projects (static) |
| GET | `/api/projects/db` | Fetch projects from RDS |
| GET | `/api/about` | About section data |
| POST | `/api/contact` | Contact form (sends email via Nodemailer) |

### Environment Variables (set on EB)

| Variable | Value |
|----------|-------|
| `DB_HOST` | `balentinetech-db-01.cvsoe02o49b9.us-east-2.rds.amazonaws.com` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `balentinetech` |
| `DB_USER` | `balentineadmin` |
| `DB_PASSWORD` | *(secret)* |
| `DB_SSL` | `true` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |

---

## Frontend — React + Vite

**Source:** `frontend/`
**Docker image:** `debalent/balentinetech-frontend`
**Hosting:** S3 static site + CloudFront CDN
**Build command:** `npm run build` -> `dist/`

CloudFront is configured with:
- HTTPS redirect
- Custom error page (403/404 -> `/index.html` for SPA routing)
- Origin Access Control (S3 bucket not publicly accessible directly)
- Cache invalidation on every deploy (`/*`)

---

## Database — RDS PostgreSQL

**Instance:** `balentinetech-db-01`
**Engine:** PostgreSQL 15.17
**Instance class:** db.t3.micro
**Endpoint:** `balentinetech-db-01.cvsoe02o49b9.us-east-2.rds.amazonaws.com:5432`
**Database:** `balentinetech`

The backend auto-creates a `projects` table on first startup. RDS is in a private subnet accessible only from within the VPC (EC2/EB instances).

---

## Monitoring & Alerting — CloudWatch + SNS

CloudWatch alarms provisioned by Pulumi notify via SNS email (confirmed subscription):

| Alarm | Threshold | Action |
|-------|-----------|--------|
| EC2 CPU High | > 80% for 2 periods | SNS email |
| EB Environment Health | Degraded/Severe | SNS email |
| ELB HTTP 5xx Errors | > 10 in 5 min | SNS email |
| Unhealthy Host Count | >= 1 | SNS email |

---

## Docker

Both services are containerized and published to Docker Hub:

| Image | Tags |
|-------|------|
| `debalent/balentinetech-frontend` | `:latest`, `:<git-sha>` |
| `debalent/balentinetech-backend` | `:latest`, `:<git-sha>` |

Elastic Beanstalk pulls the SHA-tagged image on every deploy (no stale cache).

---

## Files in This Directory

| File | Description |
|------|-------------|
| `s3-cloudfront-policy.json` | IAM policy — restricts S3 to CloudFront only (OAC) |
| `s3-lifecycle-policy.json` | S3 lifecycle rule — moves old versions to Glacier after 30 days |
| `s3-script.js` | Node.js SDK script — upload / retrieve / delete S3 objects |
| `README.md` | This file |

---

## Local Development

```bash
# Backend
cd backend
npm install
node server.js          # runs on :3001

# Frontend
cd frontend
npm install
npm run dev             # runs on :5173
```

---

## Deployment Summary

| Component | Status | Method |
|-----------|--------|--------|
| Frontend (S3 + CloudFront) | Live | GitHub Actions -> aws s3 sync |
| Backend (Elastic Beanstalk) | Live | GitHub Actions -> EB Docker Compose |
| Database (RDS PostgreSQL) | Live | Pulumi IaC |
| Infrastructure (VPC, EC2, etc.) | Live | Pulumi IaC (40 resources) |
| CI/CD Pipeline | Green | GitHub Actions (all 4 jobs pass) |
| Monitoring (CloudWatch + SNS) | Active | Pulumi IaC + confirmed email |
