# Backend Deployment: AWS Elastic Beanstalk + Docker + RDS

## Prerequisites
- AWS account with permissions for Elastic Beanstalk, RDS, IAM, CloudWatch
- AWS CLI and EB CLI installed
- Docker installed locally

## Deployment Steps

1. **Build and Test Docker Image Locally**
   ```sh
   cd backend
   docker build -t my-backend-api .
   docker run -p 3000:3000 --env-file .env.example my-backend-api
   ```

2. **Push Image to Docker Hub (if using Dockerrun.aws.json)**
   ```sh
   docker tag my-backend-api <your-dockerhub-username>/your-backend-image:latest
   docker push <your-dockerhub-username>/your-backend-image:latest
   ```

3. **Set Up RDS PostgreSQL**
   - Create a PostgreSQL instance in AWS RDS
   - Note the endpoint, DB name, user, and password
   - Restrict inbound rules to Elastic Beanstalk security group

4. **Configure Environment Variables**
   - In AWS Elastic Beanstalk Console, set environment variables for DB connection (see .env.example)

5. **Deploy to Elastic Beanstalk**
   ```sh
   eb init  # Choose Docker platform
   eb create my-backend-env --single
   eb deploy
   ```

6. **Monitoring & Security**
   - Enable CloudWatch logs in Beanstalk
   - Set up CloudWatch alarms for CPU, 5XX errors, DB failures
   - Use IAM roles with least privilege

## Notes
- Update Dockerrun.aws.json with your Docker image name
- Ensure CORS is enabled for frontend integration
- For multi-container setups, use Docker Compose and update Dockerrun.aws.json accordingly
